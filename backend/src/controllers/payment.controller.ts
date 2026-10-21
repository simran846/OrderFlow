import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from '../errors/AppError';
import { PaymentService } from '../services/payment.service';

export class PaymentController {
  public static async createIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const result = await PaymentService.createPaymentIntent(userId, userRole, req.body);
      res.status(200).json({
        success: true,
        message: 'Payment intent created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async handleWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      if (!signature) {
        throw new BadRequestError('Stripe signature header (stripe-signature) missing');
      }

      // Use rawBody buffer preserved during body parsing
      const rawBody = req.rawBody || JSON.stringify(req.body);
      const result = await PaymentService.processWebhook(rawBody, signature);

      res.status(200).json({
        received: true,
        processed: result.processed,
      });
    } catch (error) {
      next(error);
    }
  }
}
