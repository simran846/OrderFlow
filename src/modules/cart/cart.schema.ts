import { z } from 'zod';

export const addToCartSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
  quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1').default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int('Quantity must be an integer').min(0, 'Quantity cannot be negative'),
});

export const productIdParamSchema = z.object({
  productId: z.string().uuid('Invalid product ID format'),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
