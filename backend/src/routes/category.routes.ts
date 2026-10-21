import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { CategoryController } from '../controllers/category.controller';
import { createCategorySchema } from '../validators/category.schema';

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
