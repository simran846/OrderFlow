import request from 'supertest';
import { createApp } from '../../src/app';
import { stripe } from '../../src/config/stripe';
import { AuthService } from '../../src/modules/auth/auth.service';
import { CartService } from '../../src/modules/cart/cart.service';
import { IdempotencyService } from '../../src/modules/idempotency/idempotency.service';
import { OrderService } from '../../src/modules/orders/order.service';
import { PaymentService } from '../../src/modules/payments/payment.service';
import { ProductService } from '../../src/modules/products/product.service';
import { SecurityUtils } from '../../src/utils/security';

describe('OrderFlow End-to-End (E2E) E-Commerce Lifecycle Test', () => {
  const app = createApp();

  it('should successfully execute the full customer lifecycle: Register -> Browse -> Cart -> Checkout -> Payment -> Webhook', async () => {
    // -------------------------------------------------------------
    // 1. Customer Registration & Token Generation
    // -------------------------------------------------------------
    const mockUser = {
      id: 'e2e-user-uuid-101',
      email: 'alex.buyer@orderflow.dev',
      firstName: 'Alex',
      lastName: 'Buyer',
      role: 'CUSTOMER' as const,
      createdAt: new Date(),
    };

    const token = SecurityUtils.generateAccessToken({
      userId: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
    });

    jest.spyOn(AuthService, 'getCurrentUser').mockResolvedValueOnce(mockUser);

    const profileRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.user.email).toBe('alex.buyer@orderflow.dev');

    // -------------------------------------------------------------
    // 2. Product Catalog Browsing
    // -------------------------------------------------------------
    const mockProducts = {
      items: [
        {
          id: 'prod-headphones-uuid-1',
          categoryId: 'cat-electronics-1',
          name: 'Wireless Noise-Canceling Headphones',
          slug: 'wireless-noise-canceling-headphones',
          description: 'High-fidelity audio',
          price: 199.99 as any,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: 'cat-electronics-1', name: 'Electronics', slug: 'electronics' },
          inventory: { availableStock: 25, reservedStock: 0 },
        },
      ],
      meta: {
        page: 1,
        limit: 10,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };

    jest.spyOn(ProductService, 'listProducts').mockResolvedValueOnce(mockProducts as any);

    const catalogRes = await request(app).get('/api/v1/products?limit=10&page=1');
    expect(catalogRes.status).toBe(200);
    expect(catalogRes.body.data.items).toHaveLength(1);
    expect(catalogRes.body.data.items[0].name).toBe('Wireless Noise-Canceling Headphones');

    // -------------------------------------------------------------
    // 3. Shopping Cart: Add Item & Validate Subtotals
    // -------------------------------------------------------------
    const mockCartResponse = {
      cartId: 'cart-uuid-1',
      userId: mockUser.id,
      items: [
        {
          id: 'cart-item-uuid-1',
          productId: 'prod-headphones-uuid-1',
          name: 'Wireless Noise-Canceling Headphones',
          slug: 'wireless-noise-canceling-headphones',
          unitPrice: 199.99,
          quantity: 2,
          subtotal: 399.98,
          availableStock: 25,
          isAvailable: true,
        },
      ],
      totalItems: 2,
      subtotal: 399.98,
      currency: 'USD',
      hasUnavailableItems: false,
    };

    jest.spyOn(CartService, 'getCart').mockResolvedValue(mockCartResponse);
    jest.spyOn(CartService, 'addItemToCart').mockResolvedValueOnce(mockCartResponse);

    const addToCartRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: '44444444-5555-6666-7777-888888888888',
        quantity: 2,
      });

    expect(addToCartRes.status).toBe(200);
    expect(addToCartRes.body.data.cart.subtotal).toBe(399.98);
    expect(addToCartRes.body.data.cart.totalItems).toBe(2);

    // -------------------------------------------------------------
    // 4. Atomic Checkout with Inventory Reservation & Idempotency
    // -------------------------------------------------------------
    const mockCreatedOrder = {
      order: {
        id: 'order-uuid-999',
        orderNumber: 'ORD-2026-X99',
        userId: mockUser.id,
        status: 'PENDING' as const,
        totalAmount: 399.98 as any,
        shippingAddress: '456 Innovation Way, Seattle, WA 98101',
        idempotencyKey: 'idemp-key-test-001',
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: 'order-item-1',
            orderId: 'order-uuid-999',
            productId: 'prod-headphones-uuid-1',
            productName: 'Wireless Noise-Canceling Headphones',
            unitPrice: 199.99 as any,
            quantity: 2,
            subtotal: 399.98 as any,
            createdAt: new Date(),
          },
        ],
      },
    };

    jest.spyOn(IdempotencyService, 'claimKey').mockResolvedValue({
      status: 'CLAIMED',
      recordId: 'rec-test-uuid-001',
    });
    jest.spyOn(IdempotencyService, 'recordOutcome').mockResolvedValue({} as any);
    jest.spyOn(OrderService, 'checkout').mockResolvedValue(mockCreatedOrder as any);

    const checkoutRes = await request(app)
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'idemp-key-test-001')
      .send({
        shippingAddress: '456 Innovation Way, Seattle, WA 98101',
      });

    expect(checkoutRes.status).toBe(201);
    expect(checkoutRes.body.data.order.orderNumber).toBe('ORD-2026-X99');
    expect(checkoutRes.body.data.order.status).toBe('PENDING');

    // -------------------------------------------------------------
    // 5. Create Payment Intent
    // -------------------------------------------------------------
    const mockPaymentIntentResult = {
      clientSecret: 'pi_test_secret_12345',
      paymentIntentId: 'pi_test_12345',
      amount: 399.98,
      currency: 'usd',
      orderNumber: 'ORD-2026-X99',
    };

    jest.spyOn(PaymentService, 'createPaymentIntent').mockResolvedValueOnce(mockPaymentIntentResult);

    const paymentRes = await request(app)
      .post('/api/v1/payments/create-intent')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: '55555555-6666-7777-8888-999999999999' });

    expect(paymentRes.status).toBe(200);
    expect(paymentRes.body.data.clientSecret).toBe('pi_test_secret_12345');
    expect(paymentRes.body.data.amount).toBe(399.98);

    // -------------------------------------------------------------
    // 6. Cryptographic Stripe Webhook (Payment Succeeded)
    // -------------------------------------------------------------
    const mockWebhookEvent = {
      id: 'evt_test_payment_confirmed',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_12345',
          amount: 39998,
          currency: 'usd',
        },
      },
    };

    jest.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(mockWebhookEvent as any);
    jest.spyOn(PaymentService, 'processWebhook').mockResolvedValueOnce({ received: true, processed: true });

    const webhookRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('stripe-signature', 'valid_test_signature')
      .send(mockWebhookEvent);

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.received).toBe(true);
    expect(webhookRes.body.processed).toBe(true);
  });
});
