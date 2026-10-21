/**
 * OrderFlow API Client & Session Manager
 * Enterprise-grade client layer connecting UI to verified Express & Prisma backend APIs.
 */

const API_BASE = '/api/v1';
const TOKEN_KEY = 'orderflow_access_token';
const USER_KEY = 'orderflow_user';
const GUEST_CART_KEY = 'orderflow_guest_cart';

export const ApiClient = {
  // ============================================================================
  // Session & Authentication Storage
  // ============================================================================
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  setSession(token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  // ============================================================================
  // Core HTTP Request Handler with Automatic Auth Injection
  // ============================================================================
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
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
          // Token expired or invalid
          this.clearSession();
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }

        const message =
          data?.error?.message ||
          data?.message ||
          `Request failed with status ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        error.details = data?.error?.details || null;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Network error: Unable to reach OrderFlow backend API.');
      }
      throw err;
    }
  },

  // ============================================================================
  // Authentication Endpoints
  // ============================================================================
  async register({ email, password, firstName, lastName }) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    if (res.data?.accessToken && res.data?.user) {
      this.setSession(res.data.accessToken, res.data.user);
      await this.syncGuestCartToServer();
      window.dispatchEvent(new CustomEvent('auth:login', { detail: res.data.user }));
    }

    return res.data;
  },

  async login({ email, password }) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.data?.accessToken && res.data?.user) {
      this.setSession(res.data.accessToken, res.data.user);
      await this.syncGuestCartToServer();
      window.dispatchEvent(new CustomEvent('auth:login', { detail: res.data.user }));
    }

    return res.data;
  },

  async getMe() {
    if (!this.isAuthenticated()) return null;
    try {
      const res = await this.request('/auth/me');
      if (res.data) {
        localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      }
      return res.data;
    } catch {
      return null;
    }
  },

  logout() {
    this.clearSession();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  },

  // ============================================================================
  // Product Catalog Endpoints
  // ============================================================================
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.categoryId) query.append('categoryId', params.categoryId);
    if (params.search) query.append('search', params.search);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    if (params.minPrice) query.append('minPrice', params.minPrice);
    if (params.maxPrice) query.append('maxPrice', params.maxPrice);

    const qs = query.toString();
    const endpoint = `/products${qs ? `?${qs}` : ''}`;
    return this.request(endpoint);
  },

  async getProductById(id) {
    return this.request(`/products/${id}`);
  },

  async getCategories() {
    return this.request('/categories');
  },

  // ============================================================================
  // Shopping Cart (Server-backed + Guest LocalStorage Fallback)
  // ============================================================================
  getGuestCart() {
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setGuestCart(items) {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cart:updated'));
  },

  async getCart() {
    if (this.isAuthenticated()) {
      try {
        const res = await this.request('/cart');
        return res.data;
      } catch (err) {
        console.warn('Failed to fetch server cart:', err);
      }
    }

    // Guest Cart Calculation (Server-Authoritative Format Mirror)
    const guestItems = this.getGuestCart();
    const totalAmount = guestItems.reduce(
      (sum, item) => sum + (item.product?.price || 0) * item.quantity,
      0
    );

    return {
      id: 'guest',
      items: guestItems.map((item) => ({
        id: item.productId,
        productId: item.productId,
        quantity: item.quantity,
        product: item.product,
        subtotal: ((item.product?.price || 0) * item.quantity).toFixed(2),
      })),
      totalAmount: totalAmount.toFixed(2),
      itemCount: guestItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  },

  async addToCart(product, quantity = 1) {
    if (this.isAuthenticated()) {
      const res = await this.request('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      window.dispatchEvent(new CustomEvent('cart:updated'));
      return res.data;
    }

    // Handle Guest Cart
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
          price: typeof product.price === 'number' ? product.price : parseFloat(product.price),
          image: product.image,
          category: product.category,
        },
      });
    }

    this.setGuestCart(guestItems);
    return this.getCart();
  },

  async updateCartItem(productId, quantity) {
    if (this.isAuthenticated()) {
      if (quantity <= 0) {
        return this.removeFromCart(productId);
      }
      const res = await this.request(`/cart/items/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      });
      window.dispatchEvent(new CustomEvent('cart:updated'));
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

  async removeFromCart(productId) {
    if (this.isAuthenticated()) {
      const res = await this.request(`/cart/items/${productId}`, {
        method: 'DELETE',
      });
      window.dispatchEvent(new CustomEvent('cart:updated'));
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
    localStorage.removeItem(GUEST_CART_KEY);
    window.dispatchEvent(new CustomEvent('cart:updated'));
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
    localStorage.removeItem(GUEST_CART_KEY);
    window.dispatchEvent(new CustomEvent('cart:updated'));
  },

  // ============================================================================
  // Orders & Idempotent Checkout
  // ============================================================================
  async checkout({ shippingAddress }) {
    // Generate UUID-like unique Idempotency Key
    const idempotencyKey =
      'idemp_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();

    const res = await this.request('/orders/checkout', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ shippingAddress }),
    });

    window.dispatchEvent(new CustomEvent('cart:updated'));
    return res.data;
  },

  async getOrders(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString();
    return this.request(`/orders${qs ? `?${qs}` : ''}`);
  },

  async getOrderById(id) {
    return this.request(`/orders/${id}`);
  },

  async cancelOrder(id, reason = 'Customer requested cancellation') {
    return this.request(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // ============================================================================
  // Payment Gateway (Stripe Sandbox Integration)
  // ============================================================================
  async createPaymentIntent(orderId) {
    return this.request('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  },
};
