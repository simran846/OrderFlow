import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { ProductController } from './product.controller';
import {
  createProductSchema,
  idParamSchema,
  queryProductSchema,
  updateProductSchema,
} from './product.schema';

const router = Router();

// Public: List products with pagination, filtering, search, and sorting
router.get('/', validateRequest({ query: queryProductSchema }), ProductController.list);

// Public: Get single product by ID
router.get('/:id', validateRequest({ params: idParamSchema }), ProductController.getById);

// Admin-only: Create new product + initial inventory
router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest({ body: createProductSchema }),
  ProductController.create
);

// Admin-only: Update product
router.put(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest({ params: idParamSchema, body: updateProductSchema }),
  ProductController.update
);

// Admin-only: Soft delete / deactivate product
router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  validateRequest({ params: idParamSchema }),
  ProductController.delete
);

export const productRoutes = router;
