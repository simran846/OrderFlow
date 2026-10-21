import { OrderStatus, PaymentProvider, PaymentStatus, Role } from '@prisma/client';
import Stripe from 'stripe';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { stripe } from '../config/stripe';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors/AppError';
import { NotificationProducer } from '../queue/producers/notification.producer';
import { logger } from '../utils/logger';
import { OrderStateMachine } from '../types/order.types';
import { CreatePaymentIntentInput } from '../validators/payment.schema';

export interface PaymentIntentResultDto {
  clientSecret: string | null;
  paymentIntentId: string;
  amount: number;
  currency: string;
  orderNumber: string;
}

export class PaymentService {
  /**
   * Creates a Stripe PaymentIntent for a PENDING order.
   * Calculates the exact amount server-side from the Order record.
   * NEVER trust client-submitted amounts!
   */
  public static async createPaymentIntent(
    userId: string,
    userRole: Role,
    input: CreatePaymentIntentInput
  ): Promise<PaymentIntentResultDto> {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (userRole !== Role.ADMIN && order.userId !== userId) {
      throw new ForbiddenError('You do not have permission to pay for this order');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestError(
        `Cannot create payment intent for order in [${order.status}] status`
      );
    }

    // Stripe expects amount in smallest currency units (cents for USD)
    const totalAmount =
      typeof order.totalAmount === 'number' ? order.totalAmount : order.totalAmount.toNumber();

    const amountInCents = Math.round(totalAmount * 100);

    // Call Stripe SDK outside database transactions to avoid holding connection locks
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId,
        },
      });
    } catch (error: any) {
      logger.error({ err: error.message }, 'Failed to create Stripe PaymentIntent');
      throw new BadRequestError(`Payment gateway error: ${error.message}`);
    }

    // Persist payment record in MySQL
    await prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        provider: PaymentProvider.STRIPE,
        providerPaymentIntentId: paymentIntent.id,
        amount: order.totalAmount,
        currency: 'usd',
        status: PaymentStatus.PENDING,
      },
      update: {
        providerPaymentIntentId: paymentIntent.id,
        amount: order.totalAmount,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
      currency: 'usd',
      orderNumber: order.orderNumber,
    };
  }

  /**
   * IDEMPOTENT WEBHOOK HANDLER
   *
   * 1. Cryptographically validates stripe-signature using the raw request body.
   * 2. Detects duplicate webhooks: If payment is already SUCCEEDED, returns immediate 200 without duplicate action.
   * 3. Transitions Order to CONFIRMED.
   * 4. Permanently deducts reserved stock (reservedStock -= quantity).
   * 5. If payment fails, releases reserved stock back into availableStock.
   */
  public static async processWebhook(
    rawBody: Buffer | string,
    signature: string
  ): Promise<{ received: boolean; processed: boolean }> {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      logger.warn({ err: err.message }, '⚠️ Webhook signature verification failed');
      throw new BadRequestError(`Webhook signature verification failed: ${err.message}`);
    }

    logger.info({ eventType: event.type, eventId: event.id }, 'Processing Stripe webhook event');

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const paymentIntentId = intent.id;

        const payment = await prisma.payment.findUnique({
          where: { providerPaymentIntentId: paymentIntentId },
          include: {
            order: {
              include: { items: true, user: true },
            },
          },
        });

        if (!payment || !payment.order) {
          logger.warn(
            { paymentIntentId },
            'Received payment_intent.succeeded for untracked payment record'
          );
          return { received: true, processed: false };
        }

        // IDEMPOTENCY GUARD: If already processed, exit safely
        if (payment.status === PaymentStatus.SUCCEEDED) {
          logger.info(
            { paymentIntentId },
            'Payment already recorded as SUCCEEDED. Skipping duplicate webhook event.'
          );
          return { received: true, processed: false };
        }

        // Execute state transition and inventory finalization in transaction
        await prisma.$transaction(async (tx) => {
          // 1. Update Payment status
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCEEDED,
              rawWebhookPayload: JSON.stringify(event),
            },
          });

          // 2. Validate Order state transition
          OrderStateMachine.assertCanTransition(payment.order.status, OrderStatus.CONFIRMED);

          // 3. Update Order status to CONFIRMED
          await tx.order.update({
            where: { id: payment.order.id },
            data: { status: OrderStatus.CONFIRMED },
          });

          // 4. Permanently deduct reserved stock (stock was already subtracted from availableStock at checkout)
          for (const item of payment.order.items) {
            await tx.$executeRaw`
              UPDATE inventories 
              SET reservedStock = reservedStock - ${item.quantity}, 
                  version = version + 1 
              WHERE productId = ${item.productId}
            `;
          }
        });

        // Asynchronously enqueue background notification job
        await NotificationProducer.sendOrderConfirmation({
          orderId: payment.order.id,
          orderNumber: payment.order.orderNumber,
          userEmail: payment.order.user.email,
          totalAmount: Number(payment.order.totalAmount),
        });

        logger.info(
          { orderId: payment.order.id, paymentIntentId },
          '✅ Order successfully confirmed and stock permanently settled'
        );
        return { received: true, processed: true };
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const paymentIntentId = intent.id;

        const payment = await prisma.payment.findUnique({
          where: { providerPaymentIntentId: paymentIntentId },
          include: {
            order: {
              include: { items: true },
            },
          },
        });

        if (!payment || !payment.order) {
          return { received: true, processed: false };
        }

        if (
          payment.status === PaymentStatus.FAILED ||
          payment.order.status === OrderStatus.CANCELLED
        ) {
          return { received: true, processed: false };
        }

        // Release reserved inventory back to available stock
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              rawWebhookPayload: JSON.stringify(event),
            },
          });

          if (payment.order.status === OrderStatus.PENDING) {
            await tx.order.update({
              where: { id: payment.order.id },
              data: { status: OrderStatus.CANCELLED },
            });

            for (const item of payment.order.items) {
              await tx.$executeRaw`
                UPDATE inventories 
                SET availableStock = availableStock + ${item.quantity}, 
                    reservedStock = reservedStock - ${item.quantity}, 
                    version = version + 1 
                WHERE productId = ${item.productId}
              `;
            }
          }
        });

        logger.info(
          { orderId: payment.order.id },
          'Order cancelled and reserved stock released after payment failure'
        );
        return { received: true, processed: true };
      }

      default:
        logger.info({ type: event.type }, 'Unhandled Stripe event received');
        return { received: true, processed: false };
    }
  }
}
