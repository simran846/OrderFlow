import { env } from '../config/env';

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'OrderFlow Backend API',
    version: '1.0.0',
    description:
      'Production-grade e-commerce backend built with TypeScript, Express, MySQL 8, Prisma, Redis, and BullMQ. Features concurrency-safe inventory reservation, idempotent checkout and payments, RBAC security, and structured logging.',
    contact: {
      name: 'OrderFlow Engineering',
      email: 'dev@orderflow.local',
    },
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}${env.API_PREFIX}`,
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT access token in the format: Bearer <token>',
      },
      IdempotencyHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'Idempotency-Key',
        description: 'UUID or unique string (8-128 chars) to guarantee safe request retries without duplication',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Validation failed / Resource not found' },
              statusCode: { type: 'integer', example: 400 },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
          requestId: { type: 'string', example: 'd3b07384-d113-4a6c-9c91-2fe6542183e8' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email', example: 'customer@orderflow.dev' },
          password: { type: 'string', minLength: 8, example: 'SecurePassword123!' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'customer@orderflow.dev' },
          password: { type: 'string', example: 'SecurePassword123!' },
        },
      },
      CreateProductRequest: {
        type: 'object',
        required: ['name', 'description', 'price', 'categoryId'],
        properties: {
          name: { type: 'string', example: 'Wireless Noise-Canceling Headphones' },
          slug: { type: 'string', example: 'wireless-noise-canceling-headphones' },
          description: { type: 'string', example: 'High-fidelity audio with active noise cancellation' },
          price: { type: 'number', example: 199.99 },
          categoryId: { type: 'string', format: 'uuid', example: '33333333-4444-5555-6666-777777777777' },
          stock: { type: 'integer', example: 50 },
        },
      },
      AddToCartRequest: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'string', format: 'uuid', example: '44444444-5555-6666-7777-888888888888' },
          quantity: { type: 'integer', minimum: 1, example: 2 },
        },
      },
      CheckoutRequest: {
        type: 'object',
        required: ['shippingAddress'],
        properties: {
          shippingAddress: { type: 'string', example: '742 Evergreen Terrace, Springfield, OR 97477' },
          idempotencyKey: { type: 'string', example: 'chk-8f92b71a-641e' },
        },
      },
      CreatePaymentIntentRequest: {
        type: 'object',
        required: ['orderId'],
        properties: {
          orderId: { type: 'string', format: 'uuid', example: '55555555-6666-7777-8888-999999999999' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness Probe',
        description: 'Returns process uptime, system memory, and operational status.',
        responses: {
          200: { description: 'Service is operational' },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness Probe',
        description: 'Verifies database and redis connection readiness.',
        responses: {
          200: { description: 'Service is ready to accept traffic' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register new customer',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
        },
        responses: {
          201: { description: 'Customer registered and cart created' },
          400: { description: 'Validation failed' },
          409: { description: 'Email already exists' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate user & receive JWT token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: { description: 'Authenticated successfully with accessToken' },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user profile',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Profile retrieved' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List all categories (Cached)',
        responses: {
          200: { description: 'List of categories' },
        },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create category (Admin only)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'Electronics' },
                  description: { type: 'string', example: 'Smart tech and computing devices' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Category created' },
          403: { description: 'Admin access required' },
        },
      },
    },
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products (Paginated, filtered, cached)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'categoryId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['price', 'name', 'createdAt'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          200: { description: 'Paginated list of products' },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create product + inventory (Admin only)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProductRequest' } } },
        },
        responses: {
          201: { description: 'Product created and inventory allocated' },
          403: { description: 'Admin access required' },
        },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get product by ID (Cached)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Product retrieved' },
          404: { description: 'Product not found' },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Soft-delete / deactivate product (Admin only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Product deactivated and caches purged' },
          403: { description: 'Admin access required' },
        },
      },
    },
    '/cart': {
      get: {
        tags: ['Shopping Cart'],
        summary: 'Get current user cart with live inventory check',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Cart retrieved with server-side totals' },
          401: { description: 'Unauthorized' },
        },
      },
      delete: {
        tags: ['Shopping Cart'],
        summary: 'Clear entire shopping cart',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Cart cleared' },
        },
      },
    },
    '/cart/items': {
      post: {
        tags: ['Shopping Cart'],
        summary: 'Add item to shopping cart',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AddToCartRequest' } } },
        },
        responses: {
          200: { description: 'Item added and subtotal updated' },
          400: { description: 'Quantity exceeds available stock' },
        },
      },
    },
    '/orders/checkout': {
      post: {
        tags: ['Orders & Checkout'],
        summary: 'Atomic checkout with inventory reservation & idempotency',
        security: [{ BearerAuth: [] }, { IdempotencyHeader: [] }],
        parameters: [
          {
            name: 'Idempotency-Key',
            in: 'header',
            required: false,
            schema: { type: 'string', minLength: 8, maxLength: 128 },
            description: 'Optional unique key for idempotent retry guarantees',
          },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CheckoutRequest' } } },
        },
        responses: {
          201: { description: 'Order created, stock reserved, cart cleared' },
          400: { description: 'Insufficient stock or empty cart' },
          409: { description: 'Concurrent checkout in progress with this key' },
          422: { description: 'Idempotency key reuse with different parameters' },
        },
      },
    },
    '/orders': {
      get: {
        tags: ['Orders & Checkout'],
        summary: 'List order history',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'Paginated order history' },
        },
      },
    },
    '/payments/create-intent': {
      post: {
        tags: ['Payments'],
        summary: 'Create Stripe PaymentIntent with server-calculated price',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePaymentIntentRequest' } } },
        },
        responses: {
          200: { description: 'PaymentIntent created with clientSecret' },
          400: { description: 'Order is not in PENDING status' },
        },
      },
    },
    '/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Stripe webhook listener (Idempotent settlement)',
        parameters: [
          {
            name: 'stripe-signature',
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Cryptographic HMAC-SHA256 signature generated by Stripe',
          },
        ],
        responses: {
          200: { description: 'Webhook processed or duplicate skipped' },
          400: { description: 'Invalid signature' },
        },
      },
    },
  },
};
