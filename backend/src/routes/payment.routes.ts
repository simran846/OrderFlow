import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { PaymentController } from '../controllers/payment.controller';
import { createPaymentIntentSchema } from '../validators/payment.schema';

const router = Router();

// Create Stripe PaymentIntent for an existing order (Customer or Admin)
router.post(
  '/create-intent',
  authenticate,
  validateRequest({ body: createPaymentIntentSchema }),
  PaymentController.createIntent
);

// Stripe Webhook Endpoint (Direct provider callback, verified via cryptographic signature)
router.post('/webhook', PaymentController.handleWebhook);

export const paymentRoutes = router;
