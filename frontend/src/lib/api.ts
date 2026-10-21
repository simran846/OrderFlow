/**
 * OrderFlow Frontend API Client
 * Enterprise-grade client layer communicating with standalone Express backend.
 */

import {
  ApiResponse,
  CartSummary,
  CategorySummary,
  OrderSummary,
  ProductSummary,
  ShippingAddress,
  UserSummary,
} from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const TOKEN_KEY = 'orderflow_access_token';
const USER_KEY = 'orderflow_user';
const GUEST_CART_KEY = 'orderflow_guest_cart';

export interface GuestCartItem {
  productId: string;
  quantity: number;
  product: ProductSummary;
}

export const ApiClient = {
  // Session Storage
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setSession(token: string, user: UserSummary) {
    if (typeof window === 'undefined') return;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  getCurrentUser(): UserSummary | null {
    if (typeof window === 'undefined') return null;
    try {
      const userStr = localStorage.getItem(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  // HTTP Request Helper
  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && token) {
          this.clearSession();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:expired'));
          }
        }

        const message =
          data?.error?.message ||
          data?.message ||
          `Request failed with status ${response.status}`;
        const error = new Error(message) as Error & { status: number; details?: any };
        error.status = response.status;
        error.details = data?.error?.details || null;
        throw error;
      }

      return data;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Network error: Unable to reach OrderFlow backend API.');
      }
      throw err;
    }
  },

  // Auth Methods
  async register(payload: { email: string; password: string; firstName: string; lastName: string }) {
    const res = await this.request<ApiResponse<{ accessToken: string; user: UserSummary }>>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    if (res.data?.accessToken && res.data?.user) {
      this.setSession(res.data.accessToken, res.data.user);
      await this.syncGuestCartToServer();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:login', { detail: res.data.user }));
      }
    }

    return res.data;
  },

  async login(payload: { email: string; password: string }) {
    const res = await this.request<ApiResponse<{ accessToken: string; user: UserSummary }>>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    if (res.data?.accessToken && res.data?.user) {
      this.setSession(res.data.accessToken, res.data.user);
      await this.syncGuestCartToServer();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:login', { detail: res.data.user }));
      }
    }

    return res.data;
  },

  async getMe(): Promise<UserSummary | null> {
    if (!this.isAuthenticated()) return null;
    try {
      const res = await this.request<ApiResponse<UserSummary>>('/auth/me');
      if (res.data && typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      }
      return res.data;
    } catch {
      return null;
    }
  },

  logout() {
    this.clearSession();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  },

  // Catalog
  async getProducts(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.categoryId) query.append('categoryId', String(params.categoryId));
    if (params.search) query.append('search', String(params.search));
    if (params.sortBy) query.append('sortBy', String(params.sortBy));
    if (params.sortOrder) query.append('sortOrder', String(params.sortOrder));
    if (params.minPrice) query.append('minPrice', String(params.minPrice));
    if (params.maxPrice) query.append('maxPrice', String(params.maxPrice));

    const qs = query.toString();
    const endpoint = `/products${qs ? `?${qs}` : ''}`;
    return this.request<ApiResponse<ProductSummary[]>>(endpoint);
  },

  async getProductById(id: string) {
    return this.request<ApiResponse<ProductSummary>>(`/products/${id}`);
  },

  async getCategories() {
    return this.request<ApiResponse<CategorySummary[]>>('/categories');
  },

  // Cart
  getGuestCart(): GuestCartItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setGuestCart(items: GuestCartItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cart:updated'));
  },

  async getCart(): Promise<CartSummary> {
    if (this.isAuthenticated()) {
      try {
        const res = await this.request<ApiResponse<CartSummary>>('/cart');
        return res.data;
      } catch (err) {
        console.warn('Failed to fetch server cart, falling back to guest cache:', err);
      }
    }

    const guestItems = this.getGuestCart();
    const totalAmount = guestItems.reduce(
      (sum, item) => sum + Number(item.product?.price || 0) * item.quantity,
      0
    );

    return {
      id: 'guest',
      items: guestItems.map((item) => ({
        id: item.productId,
        productId: item.productId,
        quantity: item.quantity,
        product: item.product,
        subtotal: (Number(item.product?.price || 0) * item.quantity).toFixed(2),
      })),
      totalAmount: totalAmount.toFixed(2),
      itemCount: guestItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  },

  async addToCart(product: ProductSummary, quantity = 1) {
    if (this.isAuthenticated()) {
      const res = await this.request<ApiResponse<CartSummary>>('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cart:updated'));
      return res.data;
    }

    const guestItems = this.getGuestCart();
    const existingIndex = guestItems.findIndex((item) => item.productId === product.id);

    if (existingIndex > -1) {
      guestItems[existingIndex].quantity += quantity;
    } else {
      guestItems.push({
        productId: product.id,
        quantity,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: typeof product.price === 'number' ? product.price : parseFloat(String(product.price)),
          categoryId: product.categoryId,
          category: product.category,
        },
      });
    }

    this.setGuestCart(guestItems);
    return this.getCart();
  },

  async updateCartItem(productId: string, quantity: number) {
    if (this.isAuthenticated()) {
      if (quantity <= 0) {
        return this.removeFromCart(productId);
      }
      const res = await this.request<ApiResponse<CartSummary>>(`/cart/items/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      });
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cart:updated'));
      return res.data;
    }

    let guestItems = this.getGuestCart();
    if (quantity <= 0) {
      guestItems = guestItems.filter((item) => item.productId !== productId);
    } else {
      const target = guestItems.find((item) => item.productId === productId);
      if (target) target.quantity = quantity;
    }

    this.setGuestCart(guestItems);
    return this.getCart();
  },

  async removeFromCart(productId: string) {
    if (this.isAuthenticated()) {
      const res = await this.request<ApiResponse<CartSummary>>(`/cart/items/${productId}`, {
        method: 'DELETE',
      });
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cart:updated'));
      return res.data;
    }

    const guestItems = this.getGuestCart().filter((item) => item.productId !== productId);
    this.setGuestCart(guestItems);
    return this.getCart();
  },

  async clearCart() {
    if (this.isAuthenticated()) {
      await this.request('/cart', { method: 'DELETE' });
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GUEST_CART_KEY);
      window.dispatchEvent(new CustomEvent('cart:updated'));
    }
  },

  async syncGuestCartToServer() {
    const guestItems = this.getGuestCart();
    if (guestItems.length === 0 || !this.isAuthenticated()) return;

    for (const item of guestItems) {
      try {
        await this.request('/cart/items', {
          method: 'POST',
          body: JSON.stringify({ productId: item.productId, quantity: item.quantity }),
        });
      } catch (e) {
        console.warn(`Failed to sync guest cart item ${item.productId}:`, e);
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GUEST_CART_KEY);
      window.dispatchEvent(new CustomEvent('cart:updated'));
    }
  },

  // Checkout & Orders
  async checkout(payload: { shippingAddress: ShippingAddress }) {
    const idempotencyKey =
      'idemp_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();

    const res = await this.request<ApiResponse<OrderSummary>>('/orders/checkout', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('cart:updated'));
    return res.data;
  },

  async getOrders(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return this.request<ApiResponse<OrderSummary[]>>(`/orders${qs ? `?${qs}` : ''}`);
  },

  async getOrderById(id: string) {
    return this.request<ApiResponse<OrderSummary>>(`/orders/${id}`);
  },

  async cancelOrder(id: string, reason = 'Customer requested cancellation') {
    return this.request<ApiResponse<OrderSummary>>(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async createPaymentIntent(orderId: string) {
    return this.request<ApiResponse<any>>('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  },
};
