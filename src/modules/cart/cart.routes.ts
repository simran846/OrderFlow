import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { CartController } from './cart.controller';
import { addToCartSchema, productIdParamSchema, updateCartItemSchema } from './cart.schema';

const router = Router();

// All cart endpoints require user authentication
router.use(authenticate);

// View active cart
router.get('/', CartController.getCart);

// Add product to cart
router.post('/items', validateRequest({ body: addToCartSchema }), CartController.addItem);

// Update quantity of an item in cart
router.put(
  '/items/:productId',
  validateRequest({ params: productIdParamSchema, body: updateCartItemSchema }),
  CartController.updateItem
);

// Remove specific item from cart
router.delete(
  '/items/:productId',
  validateRequest({ params: productIdParamSchema }),
  CartController.removeItem
);

// Clear entire cart
router.delete('/', CartController.clearCart);

export const cartRoutes = router;
