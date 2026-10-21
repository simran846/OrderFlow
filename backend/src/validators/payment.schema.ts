import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID format'),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
