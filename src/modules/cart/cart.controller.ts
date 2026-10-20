import { NextFunction, Request, Response } from 'express';
import { CartService } from './cart.service';

export class CartController {
  public static async getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const cart = await CartService.getCart(userId);
      res.status(200).json({
        success: true,
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const cart = await CartService.addItemToCart(userId, req.body);
      res.status(200).json({
        success: true,
        message: 'Item added to cart successfully',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const productId = req.params.productId as string;
      const { quantity } = req.body;
      const cart = await CartService.updateItemQuantity(userId, productId, quantity);
      res.status(200).json({
        success: true,
        message: 'Cart updated successfully',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const productId = req.params.productId as string;
      const cart = await CartService.removeItemFromCart(userId, productId);
      res.status(200).json({
        success: true,
        message: 'Item removed from cart',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async clearCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const cart = await CartService.clearCart(userId);
      res.status(200).json({
        success: true,
        message: 'Cart cleared successfully',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  }
}
