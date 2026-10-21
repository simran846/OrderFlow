import { OrderStatus } from '@prisma/client';
import { BadRequestError } from '../errors/AppError';

/**
 * Explicit Order State Machine:
 * Defines valid lifecycle transitions for an Order.
 *
 * PENDING    ──► CONFIRMED (Payment Succeeded)
 * PENDING    ──► CANCELLED (Customer Cancelled / Payment Failed / Timeout)
 * CONFIRMED  ──► PROCESSING (Warehouse Fulfillment)
 * CONFIRMED  ──► CANCELLED (Pre-fulfillment Cancellation)
 * CONFIRMED  ──► REFUNDED (Full Refund)
 * PROCESSING ──► SHIPPED (Carrier Handover)
 * PROCESSING ──► CANCELLED (Exception Cancellation)
 * PROCESSING ──► REFUNDED
 * SHIPPED    ──► DELIVERED (Final Receipt)
 * SHIPPED    ──► REFUNDED (Return & Refund)
 * DELIVERED  ──► REFUNDED (Post-delivery Return)
 * CANCELLED  ──► (Terminal State)
 * REFUNDED   ──► (Terminal State)
 */
export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

export class OrderStateMachine {
  public static canTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): boolean {
    const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus];
    return allowed ? allowed.includes(targetStatus) : false;
  }

  public static assertCanTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): void {
    if (!this.canTransition(currentStatus, targetStatus)) {
      throw new BadRequestError(
        `Invalid order status transition from [${currentStatus}] to [${targetStatus}]. Allowed transitions: [${
          ALLOWED_ORDER_TRANSITIONS[currentStatus].join(', ') || 'None (Terminal state)'
        }]`
      );
    }
  }
}
