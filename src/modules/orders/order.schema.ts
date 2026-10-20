import { z } from 'zod';

export const checkoutSchema = z.object({
  shippingAddress: z
    .string()
    .min(5, 'Shipping address must be at least 5 characters')
    .max(500, 'Shipping address cannot exceed 500 characters')
    .trim(),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(255).optional(),
});

export const orderIdParamSchema = z.object({
  id: z.string().uuid('Invalid order ID format'),
});

export const queryOrderSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(parseInt(val, 10), 1) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(Math.max(parseInt(val, 10), 1), 50) : 10)),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type QueryOrderInput = z.infer<typeof queryOrderSchema>;
