import { NextFunction, Request, Response } from 'express';
import { CategoryService } from '../services/category.service';

export class CategoryController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await CategoryService.createCategory(req.body);
      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await CategoryService.listCategories();
      res.status(200).json({
        success: true,
        data: { categories },
      });
    } catch (error) {
      next(error);
    }
  }
}
