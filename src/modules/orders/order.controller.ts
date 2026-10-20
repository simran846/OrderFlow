import { NextFunction, Request, Response } from 'express';
import { OrderService } from './order.service';

export class OrderController {
  public static async checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await OrderService.checkout(userId, req.body);
      res.status(201).json({
        success: true,
        message: 'Order created successfully and inventory reserved',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const orderId = req.params.id as string;
      const order = await OrderService.getOrderById(userId, orderId, userRole);
      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const { page, limit } = req.query as { page?: number; limit?: number };
      const result = await OrderService.listOrders(userId, userRole, page, limit);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const orderId = req.params.id as string;
      const { reason } = req.body;
      const order = await OrderService.cancelOrder(userId, orderId, userRole, reason);
      res.status(200).json({
        success: true,
        message: 'Order cancelled and reserved inventory released',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  }
}
