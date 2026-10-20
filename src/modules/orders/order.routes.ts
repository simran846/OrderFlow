import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { OrderController } from './order.controller';
import {
  cancelOrderSchema,
  checkoutSchema,
  orderIdParamSchema,
  queryOrderSchema,
} from './order.schema';

const router = Router();

// All order endpoints require authenticated user
router.use(authenticate);

// Checkout active shopping cart
router.post('/checkout', validateRequest({ body: checkoutSchema }), OrderController.checkout);

// List order history (Customer views own; Admin views all)
router.get('/', validateRequest({ query: queryOrderSchema }), OrderController.list);

// View order details by ID
router.get('/:id', validateRequest({ params: orderIdParamSchema }), OrderController.getById);

// Cancel eligible order
router.post(
  '/:id/cancel',
  validateRequest({ params: orderIdParamSchema, body: cancelOrderSchema }),
  OrderController.cancel
);

export const orderRoutes = router;
