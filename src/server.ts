import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const startServer = () => {
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 OrderFlow API server running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
    logger.info(`📍 Health Check: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
  });

  // Graceful Shutdown handling
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });

    // Force shutdown if cleanup takes longer than 10s
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason: Error | unknown) => {
    logger.fatal({ err: reason }, 'Unhandled Promise Rejection detected');
    process.exit(1);
  });

  process.on('uncaughtException', (error: Error) => {
    logger.fatal({ err: error }, 'Uncaught Exception detected');
    process.exit(1);
  });
};

startServer();
