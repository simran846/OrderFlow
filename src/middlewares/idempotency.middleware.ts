import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from '../errors/AppError';
import { IdempotencyService } from '../modules/idempotency/idempotency.service';

export const idempotency = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Extract Idempotency Key from standard headers
      const rawKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

      if (!rawKey) {
        // If client didn't supply an idempotency key, proceed normally
        next();
        return;
      }

      const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;

      if (key.length < 8 || key.length > 128) {
        throw new BadRequestError('Idempotency key must be between 8 and 128 characters in length');
      }

      const userId = req.user?.id;
      if (!userId) {
        // Requires authentication
        next();
        return;
      }

      const requestHash = IdempotencyService.computeRequestHash(
        req.originalUrl,
        req.method,
        req.body
      );
      const claim = await IdempotencyService.claimKey(key, userId, req.originalUrl, requestHash);

      // 2. Another concurrent request is currently in flight with this key
      if (claim.status === 'IN_PROGRESS') {
        res.status(409).json({
          success: false,
          error: {
            message:
              'A request with this Idempotency-Key is currently in progress. Please retry in a few moments.',
            statusCode: 409,
          },
        });
        return;
      }

      // 3. Key was reused with altered payload / parameters
      if (claim.status === 'MISMATCH') {
        res.status(422).json({
          success: false,
          error: {
            message:
              'Idempotency key was previously used with a different request payload or endpoint.',
            statusCode: 422,
          },
        });
        return;
      }

      // 4. Request was previously completed: Replay original response!
      if (claim.status === 'COMPLETED') {
        res.setHeader('Idempotent-Replay', 'true');
        res.status(claim.responseStatus);
        res.setHeader('Content-Type', 'application/json');
        res.send(claim.responseBody);
        return;
      }

      // 5. Key successfully claimed: Intercept the outgoing response to cache the result
      const recordId = claim.recordId;
      const originalSend = res.send.bind(res);

      res.send = (body: any): Response => {
        // Record outcome asynchronously without blocking response transmission
        if (res.statusCode >= 200 && res.statusCode < 500) {
          IdempotencyService.recordOutcome(recordId, res.statusCode, body).catch(() => {});
        } else {
          // If server error occurred, release key so user can safely retry
          IdempotencyService.releaseKey(recordId).catch(() => {});
        }

        return originalSend(body);
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};
