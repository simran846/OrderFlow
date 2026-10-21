import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').trim(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().min(5, 'Description must be at least 5 characters').trim(),
  price: z.number().positive('Price must be greater than 0'),
  categoryId: z.string().uuid('Invalid category ID format'),
  stock: z.number().int().min(0, 'Initial stock cannot be negative').default(0),
});

export const updateProductSchema = z.object({
  name: z.string().min(2).trim().optional(),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().min(5).trim().optional(),
  price: z.number().positive().optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

export const queryProductSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Math.max(parseInt(val, 10), 1) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(Math.max(parseInt(val, 10), 1), 50) : 10)),
  categoryId: z.string().uuid().optional(),
  minPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  maxPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined)),
  search: z.string().optional(),
  sortBy: z.enum(['price', 'name', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID parameter format'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type QueryProductInput = z.infer<typeof queryProductSchema>;
