import { NextFunction, Request, Response } from 'express';
import { ProductService } from '../services/product.service';

export class ProductController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.createProduct(req.body);
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.updateProduct(req.params.id as string, req.body);
      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ProductService.deleteProduct(req.params.id as string);
      res.status(200).json({
        success: true,
        message: 'Product deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.getProductById(req.params.id as string);
      res.status(200).json({
        success: true,
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ProductService.listProducts(req.query as any);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
