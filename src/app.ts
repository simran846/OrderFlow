import cors from 'cors';
import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { NotFoundError } from './errors/AppError';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import { healthRoutes } from './modules/health/health.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { categoryRoutes } from './modules/categories/category.routes';
import { productRoutes } from './modules/products/product.routes';
import { cartRoutes } from './modules/cart/cart.routes';
import { orderRoutes } from './modules/orders/order.routes';
import { paymentRoutes } from './modules/payments/payment.routes';
import { swaggerRoutes } from './docs/swagger.routes';

export const createApp = (): Application => {
  const app: Application = express();

  // 1. Security HTTP Headers (Permits Swagger UI assets to render)
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  // 2. Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
      credentials: true,
    })
  );

  // 3. Body Parsing (JSON & URL-Encoded with rawBody Buffer retention for Webhook signature verification)
  app.use(
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Request Logging & Correlation ID
  app.use(requestLogger);

  // 5. Serve Storefront Static Assets
  const publicDir = path.join(process.cwd(), 'public');
  app.use(express.static(publicDir, { index: false }));

  // 6. API Routes
  app.use(`${env.API_PREFIX}/health`, healthRoutes);
  app.use(`${env.API_PREFIX}/auth`, authRoutes);
  app.use(`${env.API_PREFIX}/categories`, categoryRoutes);
  app.use(`${env.API_PREFIX}/products`, productRoutes);
  app.use(`${env.API_PREFIX}/cart`, cartRoutes);
  app.use(`${env.API_PREFIX}/orders`, orderRoutes);
  app.use(`${env.API_PREFIX}/payments`, paymentRoutes);
  app.use(`${env.API_PREFIX}/docs`, swaggerRoutes);

  // Dedicated storefront consumer routes (SPA routing support for direct navigation & reloads)
  const storefrontRoutes = [
    '/store',
    '/product/:id',
    '/cart',
    '/checkout',
    '/orders',
    '/orders/:id',
    '/login',
    '/signup',
    '/account',
  ];

  storefrontRoutes.forEach((route) => {
    app.get(route, (_req: Request, res: Response) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  });

  // Root route: Serves storefront website for browser navigations, JSON metadata for API clients
  app.get('/', (req: Request, res: Response) => {
    if (req.headers.accept?.includes('text/html')) {
      res.sendFile(path.join(publicDir, 'index.html'));
      return;
    }

    res.status(200).json({
      name: 'OrderFlow API',
      version: '1.0.0',
      status: 'active',
      documentation: `${env.API_PREFIX}/docs`,
      health: `${env.API_PREFIX}/health`,
    });
  });

  // 6. 404 Route Handler for undefined paths
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
  });

  // 7. Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};
