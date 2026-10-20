import request from 'supertest';
import { createApp } from '../../src/app';
import { CartService } from '../../src/modules/cart/cart.service';
import { addToCartSchema, updateCartItemSchema } from '../../src/modules/cart/cart.schema';

describe('Shopping Cart & Server-Side Pricing Unit Tests', () => {
  const app = createApp();

  describe('Server-Side Price & Availability Calculations', () => {
    it('should accurately calculate line item subtotals and overall cart subtotal', () => {
      const mockRawCart = {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 3,
            product: {
              name: 'Gaming Headset',
              slug: 'gaming-headset',
              price: 49.99,
              isActive: true,
              inventory: { availableStock: 10 },
            },
          },
          {
            id: 'item-2',
            productId: 'prod-2',
            quantity: 2,
            product: {
              name: 'USB-C Cable',
              slug: 'usb-c-cable',
              price: 12.5,
              isActive: true,
              inventory: { availableStock: 5 },
            },
          },
        ],
      };

      const result = CartService.formatCartResponse(mockRawCart);

      expect(result.cartId).toBe('cart-1');
      expect(result.totalItems).toBe(5); // 3 + 2
      // 3 * 49.99 = 149.97; 2 * 12.50 = 25.00; Total = 174.97
      expect(result.items[0].subtotal).toBe(149.97);
      expect(result.items[1].subtotal).toBe(25.0);
      expect(result.subtotal).toBe(174.97);
      expect(result.hasUnavailableItems).toBe(false);
      expect(result.items[0].isAvailable).toBe(true);
    });

    it('should flag items as unavailable if requested quantity exceeds inventory availableStock', () => {
      const mockCartWithLowStock = {
        id: 'cart-2',
        userId: 'user-2',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 5, // Customer wants 5 units
            product: {
              name: 'Rare Collector Item',
              slug: 'rare-collector-item',
              price: 200.0,
              isActive: true,
              inventory: { availableStock: 2 }, // Only 2 units left!
            },
          },
        ],
      };

      const result = CartService.formatCartResponse(mockCartWithLowStock);

      expect(result.hasUnavailableItems).toBe(true);
      expect(result.items[0].isAvailable).toBe(false);
      expect(result.items[0].availableStock).toBe(2);
    });

    it('should flag items as unavailable if product is deactivated (isActive = false)', () => {
      const mockCartWithInactiveProduct = {
        id: 'cart-3',
        userId: 'user-3',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 1,
            product: {
              name: 'Discontinued Item',
              slug: 'discontinued-item',
              price: 50.0,
              isActive: false, // Discontinued!
              inventory: { availableStock: 20 },
            },
          },
        ],
      };

      const result = CartService.formatCartResponse(mockCartWithInactiveProduct);

      expect(result.hasUnavailableItems).toBe(true);
      expect(result.items[0].isAvailable).toBe(false);
    });
  });

  describe('Cart Input Validation Schemas', () => {
    it('should validate valid addToCart input', () => {
      const valid = addToCartSchema.safeParse({
        productId: '11111111-2222-3333-4444-555555555555',
        quantity: 2,
      });

      expect(valid.success).toBe(true);
    });

    it('should reject addToCart with non-integer or zero quantity', () => {
      const zeroQty = addToCartSchema.safeParse({
        productId: '11111111-2222-3333-4444-555555555555',
        quantity: 0,
      });
      expect(zeroQty.success).toBe(false);

      const floatQty = addToCartSchema.safeParse({
        productId: '11111111-2222-3333-4444-555555555555',
        quantity: 1.5,
      });
      expect(floatQty.success).toBe(false);
    });

    it('should validate updateCartItemSchema with 0 quantity (intended for removal)', () => {
      const zeroQty = updateCartItemSchema.safeParse({ quantity: 0 });
      expect(zeroQty.success).toBe(true);

      const negativeQty = updateCartItemSchema.safeParse({ quantity: -1 });
      expect(negativeQty.success).toBe(false);
    });
  });

  describe('Cart Authentication Protection', () => {
    it('should return 401 Unauthorized when accessing cart without Bearer token', async () => {
      const res = await request(app).get('/api/v1/cart');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Authentication token missing');
    });

    it('should return 401 Unauthorized when adding item without Bearer token', async () => {
      const res = await request(app).post('/api/v1/cart/items').send({
        productId: '11111111-2222-3333-4444-555555555555',
        quantity: 1,
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
