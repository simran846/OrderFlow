import { Order, OrderItem, OrderStatus, Role } from '@prisma/client';
import { prisma } from '../config/database';
import { CacheService } from '../config/redis';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors/AppError';
import { executeWithRetry } from '../utils/retry';
import { CheckoutInput } from '../validators/order.schema';
import { OrderStateMachine } from '../types/order.types';

export interface CheckoutResultDto {
  order: Order & { items: OrderItem[] };
}

export interface PaginatedOrdersDto {
  items: (Order & { items: OrderItem[] })[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export class OrderService {
  private static generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${randomSuffix}`;
  }

  /**
   * ATOMIC CHECKOUT WITH PESSIMISTIC / CONDITIONAL INVENTORY LOCKING
   *
   * Solves race conditions and prevents inventory overselling:
   * 1. Inspects the user's cart.
   * 2. Executes an atomic conditional update on each item's inventory.
   * 3. If any item has insufficient stock, the entire transaction ROLLS BACK immediately.
   * 4. Creates the Order in PENDING status, captures price snapshots in OrderItems, and clears the cart.
   * 5. Network calls (e.g. Stripe) are kept OUTSIDE the transaction.
   */
  public static async checkout(userId: string, input: CheckoutInput): Promise<CheckoutResultDto> {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { inventory: true },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestError('Cannot checkout with an empty shopping cart');
    }

    // Execute within a transaction wrapped with deadlock retry
    const order = await executeWithRetry(async () => {
      return await prisma.$transaction(async (tx) => {
        let totalAmount = 0;
        const itemsToCreate: {
          productId: string;
          productName: string;
          unitPrice: number;
          quantity: number;
          subtotal: number;
        }[] = [];

        // 1. Atomically reserve stock for each item using conditional SQL updates
        for (const item of cart.items) {
          if (!item.product.isActive) {
            throw new BadRequestError(`Product "${item.product.name}" is no longer available`);
          }

          // Atomic conditional update: only decrements availableStock if availableStock >= quantity
          const rowsAffected = await tx.$executeRaw`
            UPDATE inventories 
            SET availableStock = availableStock - ${item.quantity}, 
                reservedStock = reservedStock + ${item.quantity}, 
                version = version + 1 
            WHERE productId = ${item.productId} AND availableStock >= ${item.quantity}
          `;

          if (rowsAffected === 0) {
            throw new BadRequestError(
              `Insufficient stock for product "${item.product.name}". The requested quantity (${item.quantity}) is no longer available.`
            );
          }

          const unitPrice =
            typeof item.product.price === 'number'
              ? item.product.price
              : item.product.price.toNumber();

          const subtotal = Math.round(unitPrice * item.quantity * 100) / 100;
          totalAmount += subtotal;

          itemsToCreate.push({
            productId: item.productId,
            productName: item.product.name,
            unitPrice,
            quantity: item.quantity,
            subtotal,
          });
        }

        totalAmount = Math.round(totalAmount * 100) / 100;

        // 2. Create the Order with initial status PENDING
        const createdOrder = await tx.order.create({
          data: {
            orderNumber: this.generateOrderNumber(),
            userId,
            status: OrderStatus.PENDING,
            totalAmount,
            shippingAddress: input.shippingAddress,
            idempotencyKey: input.idempotencyKey,
            items: {
              create: itemsToCreate.map((i) => ({
                productId: i.productId,
                productName: i.productName,
                unitPrice: i.unitPrice,
                quantity: i.quantity,
                subtotal: i.subtotal,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        // 3. Clear the user's shopping cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        return createdOrder;
      });
    });

    // Invalidate product catalog cache so updated inventory counts are reflected
    await CacheService.delByPattern('products:list:*');
    for (const item of order.items) {
      await CacheService.del(`product:id:${item.productId}`);
    }

    return { order };
  }

  public static async getOrderById(userId: string, orderId: string, userRole: Role) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Role-based access: Customers can only view their own orders; Admins can view any order
    if (userRole !== Role.ADMIN && order.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view this order');
    }

    return order;
  }

  public static async listOrders(
    userId: string,
    userRole: Role,
    page = 1,
    limit = 10
  ): Promise<PaginatedOrdersDto> {
    const where = userRole === Role.ADMIN ? {} : { userId };
    const skip = (page - 1) * limit;

    const [totalItems, items] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
        },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  public static async cancelOrder(
    userId: string,
    orderId: string,
    userRole: Role,
    _reason?: string
  ): Promise<Order> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (userRole !== Role.ADMIN && order.userId !== userId) {
      throw new ForbiddenError('You do not have permission to cancel this order');
    }

    // Validate state transition through explicit state machine
    OrderStateMachine.assertCanTransition(order.status, OrderStatus.CANCELLED);

    // Atomically transition order and release reserved inventory
    const cancelledOrder = await prisma.$transaction(async (tx) => {
      // If the order was PENDING, release reserved stock back into availableStock
      if (order.status === OrderStatus.PENDING) {
        for (const item of order.items) {
          await tx.$executeRaw`
            UPDATE inventories 
            SET availableStock = availableStock + ${item.quantity}, 
                reservedStock = reservedStock - ${item.quantity}, 
                version = version + 1 
            WHERE productId = ${item.productId}
          `;
        }
      }

      return await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
        include: { items: true },
      });
    });

    // Invalidate product caches
    await CacheService.delByPattern('products:list:*');
    for (const item of order.items) {
      await CacheService.del(`product:id:${item.productId}`);
    }

    return cancelledOrder;
  }
}
