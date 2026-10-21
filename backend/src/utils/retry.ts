import { logger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

export const executeWithRetry = async <T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 50;
  const maxDelayMs = options.maxDelayMs ?? 1000;

  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      return await operation(attempt);
    } catch (error: any) {
      // Check if error is a MySQL deadlock (1213) or Prisma concurrency serialization conflict (P2034)
      const isDeadlock =
        error?.code === 'P2034' ||
        error?.message?.includes('Deadlock') ||
        error?.message?.includes('1213') ||
        error?.message?.includes('Lock wait timeout');

      if (!isDeadlock || attempt >= maxRetries) {
        throw error;
      }

      // Exponential backoff with randomized jitter to desynchronize competing requests
      const delay = Math.min(
        initialDelayMs * Math.pow(2, attempt - 1) + Math.random() * 50,
        maxDelayMs
      );

      logger.warn(
        { attempt, maxRetries, delayMs: Math.round(delay) },
        '⚠️ Database deadlock / conflict detected. Retrying transaction...'
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Transaction retry limit exceeded');
};
