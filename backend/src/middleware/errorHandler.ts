import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = req.id || req.headers['x-request-id'] || 'unknown';

  // 1. Handled Operational Errors
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err, requestId }, 'Non-operational AppError occurred');
    }
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        statusCode: err.statusCode,
        details: err.details,
      },
      requestId,
    });
    return;
  }

  // 2. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        statusCode: 400,
        details: formattedErrors,
      },
      requestId,
    });
    return;
  }

  // 3. Unhandled Programmer/System Errors
  logger.error({ err, requestId }, 'Unhandled system error caught by global handler');

  res.status(500).json({
    success: false,
    error: {
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      statusCode: 500,
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    },
    requestId,
  });
};
