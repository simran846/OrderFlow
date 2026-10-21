import { prisma } from '../config/database';
import { BadRequestError, NotFoundError } from '../errors/AppError';
import { AddToCartInput } from '../validators/cart.schema';

export interface CartItemDto {
  id: string;
  productId: string;
  name: string;
  slug: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  availableStock: number;
  isAvailable: boolean;
}

export interface CartResponseDto {
  cartId: string;
  userId: string;
  items: CartItemDto[];
  totalItems: number;
  subtotal: number;
  currency: string;
  hasUnavailableItems: boolean;
}

export class CartService {
  /**
   * Helper to fetch or create a user's persistent cart
   */
  private static async getOrCreateCart(userId: string) {
    let cart = await prisma.cart.findUnique({
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

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
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
    }

    return cart;
  }

  /**
   * Recalculates all line item subtotals and cart total using authoritative database prices.
   * NEVER trust client-provided prices or calculations!
   */
  public static formatCartResponse(cart: {
    id: string;
    userId: string;
    items: {
      id: string;
      productId: string;
      quantity: number;
      product: {
        name: string;
        slug: string;
        price: { toNumber(): number } | number;
        isActive: boolean;
        inventory: { availableStock: number } | null;
      };
    }[];
  }): CartResponseDto {
    let subtotal = 0;
    let totalItems = 0;
    let hasUnavailableItems = false;

    const formattedItems: CartItemDto[] = cart.items.map((item) => {
      const unitPrice =
        typeof item.product.price === 'number' ? item.product.price : item.product.price.toNumber();

      const itemSubtotal = Math.round(unitPrice * item.quantity * 100) / 100;
      const availableStock = item.product.inventory?.availableStock ?? 0;
      const isAvailable = item.product.isActive && availableStock >= item.quantity;

      if (!isAvailable) {
        hasUnavailableItems = true;
      }

      subtotal += itemSubtotal;
      totalItems += item.quantity;

      return {
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        slug: item.product.slug,
        unitPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        availableStock,
        isAvailable,
      };
    });

    return {
      cartId: cart.id,
      userId: cart.userId,
      items: formattedItems,
      totalItems,
      subtotal: Math.round(subtotal * 100) / 100,
      currency: 'USD',
      hasUnavailableItems,
    };
  }

  public static async getCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    return this.formatCartResponse(cart);
  }

  public static async addItemToCart(
    userId: string,
    input: AddToCartInput
  ): Promise<CartResponseDto> {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      include: { inventory: true },
    });

    if (!product || !product.isActive) {
      throw new NotFoundError('Product not found or is currently inactive');
    }

    const availableStock = product.inventory?.availableStock ?? 0;
    if (availableStock <= 0) {
      throw new BadRequestError('This product is currently out of stock');
    }

    const cart = await this.getOrCreateCart(userId);

    // Check if the item is already in the cart
    const existingItem = cart.items.find((item) => item.productId === input.productId);
    const newQuantity = existingItem ? existingItem.quantity + input.quantity : input.quantity;

    if (newQuantity > availableStock) {
      throw new BadRequestError(
        `Cannot add ${input.quantity} units. Only ${availableStock} units available in stock (${existingItem ? existingItem.quantity : 0} already in cart)`
      );
    }

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: input.productId,
          quantity: input.quantity,
        },
      });
    }

    return this.getCart(userId);
  }

  public static async updateItemQuantity(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    const existingItem = cart.items.find((item) => item.productId === productId);

    if (!existingItem) {
      throw new NotFoundError('Item not found in cart');
    }

    if (quantity <= 0) {
      // Quantity 0 removes the item
      await prisma.cartItem.delete({
        where: { id: existingItem.id },
      });
      return this.getCart(userId);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true },
    });

    if (!product || !product.isActive) {
      throw new BadRequestError('Product is no longer available');
    }

    const availableStock = product.inventory?.availableStock ?? 0;
    if (quantity > availableStock) {
      throw new BadRequestError(
        `Cannot set quantity to ${quantity}. Only ${availableStock} units available in stock`
      );
    }

    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  public static async removeItemFromCart(
    userId: string,
    productId: string
  ): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);
    const existingItem = cart.items.find((item) => item.productId === productId);

    if (existingItem) {
      await prisma.cartItem.delete({
        where: { id: existingItem.id },
      });
    }

    return this.getCart(userId);
  }

  public static async clearCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getCart(userId);
  }
}
