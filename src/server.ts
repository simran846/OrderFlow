import { createApp } from './app';
import { disconnectDatabase } from './config/database';
import { env } from './config/env';
import { startQueueWorkers, stopQueueWorkers } from './queue';
import { logger } from './utils/logger';

const startServer = () => {
  const app = createApp();

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`🚀 OrderFlow API server running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
    logger.info(`📍 Health Check: http://0.0.0.0:${env.PORT}${env.API_PREFIX}/health`);

    // Start background queue workers (BullMQ)
    startQueueWorkers();
  });

  // Graceful Shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    // Stop accepting new HTTP requests
    server.close(async () => {
      logger.info('HTTP server closed.');

      // Safely close background queue workers and database connections
      await stopQueueWorkers();
      await disconnectDatabase();
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
