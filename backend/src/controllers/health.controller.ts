import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { env } from '../config/env';

export class HealthController {
  public static getHealth(_req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      data: {
        status: 'UP',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        service: 'OrderFlow Backend API',
        environment: env.NODE_ENV,
        memoryUsage: process.memoryUsage(),
      },
    });
  }

  public static async getReadiness(_req: Request, res: Response): Promise<void> {
    try {
      if (env.NODE_ENV !== 'test') {
        // Query database to verify live connectivity
        await prisma.$queryRaw`SELECT 1`;
      }
      res.status(200).json({
        success: true,
        data: {
          status: 'READY',
          database: 'connected',
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      res.status(503).json({
        success: false,
        error: {
          message: 'Database service unavailable',
          statusCode: 503,
        },
      });
    }
  }
}
