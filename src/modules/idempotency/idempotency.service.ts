import crypto from 'crypto';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

export type IdempotencyClaimResult =
  | { status: 'CLAIMED'; recordId: string }
  | { status: 'IN_PROGRESS' }
  | { status: 'MISMATCH' }
  | { status: 'COMPLETED'; responseStatus: number; responseBody: string };

export class IdempotencyService {
  private static readonly TTL_HOURS = 24;

  /**
   * Deterministically normalizes and computes the SHA-256 fingerprint
   * of the incoming HTTP request. Keys are recursively sorted to guarantee
   * identical hashes regardless of JSON property ordering.
   */
  public static computeRequestHash(endpoint: string, method: string, body: unknown): string {
    const normalize = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(normalize);
      }
      return Object.keys(obj)
        .sort()
        .reduce((result: Record<string, any>, key) => {
          result[key] = normalize(obj[key]);
          return result;
        }, {});
    };

    const payloadToHash = {
      method: method.toUpperCase(),
      endpoint: endpoint.toLowerCase(),
      body: normalize(body || {}),
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payloadToHash))
      .digest('hex');
  }

  /**
   * Atomically claims an idempotency key or returns cached/conflict status.
   */
  public static async claimKey(
    key: string,
    userId: string,
    endpoint: string,
    requestHash: string
  ): Promise<IdempotencyClaimResult> {
    const existing = await prisma.idempotencyRecord.findUnique({
      where: {
        userId_key: { userId, key },
      },
    });

    if (existing) {
      // 1. If currently in progress by another concurrent request
      if (existing.responseStatus === null) {
        return { status: 'IN_PROGRESS' };
      }

      // 2. If payload hash differs from original request -> Tampering / Key Reuse error
      if (existing.requestHash !== requestHash) {
        return { status: 'MISMATCH' };
      }

      // 3. Exact match: Return stored cached result for replay
      return {
        status: 'COMPLETED',
        responseStatus: existing.responseStatus,
        responseBody: existing.responseBody || '{}',
      };
    }

    // Key is free: Atomically claim it
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TTL_HOURS);

    try {
      const record = await prisma.idempotencyRecord.create({
        data: {
          key,
          userId,
          endpoint,
          requestHash,
          responseStatus: null, // Pending execution
          expiresAt,
        },
      });

      return { status: 'CLAIMED', recordId: record.id };
    } catch (error: any) {
      // Handle unique constraint race condition if two requests created record at exact same ms
      if (error?.code === 'P2002') {
        return { status: 'IN_PROGRESS' };
      }
      throw error;
    }
  }

  public static async recordOutcome(
    recordId: string,
    responseStatus: number,
    responseBody: unknown
  ): Promise<void> {
    try {
      const serialized = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
      await prisma.idempotencyRecord.update({
        where: { id: recordId },
        data: {
          responseStatus,
          responseBody: serialized,
        },
      });
    } catch (error) {
      logger.error({ recordId, err: error }, 'Failed to record idempotency outcome');
    }
  }

  public static async releaseKey(recordId: string): Promise<void> {
    try {
      await prisma.idempotencyRecord.delete({
        where: { id: recordId },
      });
    } catch {
      // Safe ignore if record was already cleaned
    }
  }

  public static async cleanupExpiredRecords(): Promise<number> {
    const result = await prisma.idempotencyRecord.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
}
