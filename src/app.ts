import cors from 'cors';
import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { NotFoundError } from './errors/AppError';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import { healthRoutes } from './modules/health/health.routes';

export const createApp = (): Application => {
  const app: Application = express();

  // 1. Security HTTP Headers
  app.use(helmet());

  // 2. Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
      credentials: true,
    })
  );

  // 3. Body Parsing (JSON & URL-Encoded)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Request Logging & Correlation ID
  app.use(requestLogger);

  // 5. API Routes
  app.use(`${env.API_PREFIX}/health`, healthRoutes);

  // Root welcome route
  app.get('/', (_req: Request, res: Response) => {
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
