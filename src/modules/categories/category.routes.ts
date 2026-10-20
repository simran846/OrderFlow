import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { CategoryController } from './category.controller';
import { createCategorySchema } from './category.schema';

const router = Router();

// Public: List all categories
router.get('/', CategoryController.list);

// Admin-only: Create new category
router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest({ body: createCategorySchema }),
  CategoryController.create
);

export const categoryRoutes = router;
