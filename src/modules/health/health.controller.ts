import { Request, Response } from 'express';

export class HealthController {
  public static getHealth(_req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      data: {
        status: 'UP',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        service: 'OrderFlow Backend API',
        environment: process.env.NODE_ENV || 'development',
        memoryUsage: process.memoryUsage(),
      },
    });
  }

  public static getReadiness(_req: Request, res: Response): void {
    // In Phase 2+, we will verify active DB and Redis ping here
    res.status(200).json({
      success: true,
      data: {
        status: 'READY',
        timestamp: new Date().toISOString(),
      },
    });
  }
}
