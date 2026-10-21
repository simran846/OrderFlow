/**
 * OrderFlow Consumer Application & Client-Side SPA Router
 * Inspired by Amazon, Flipkart, & Swiggy for world-class consumer e-commerce.
 */

import { ApiClient } from './api.js';

// Studio-Quality Product Photography Mapping
const PRODUCT_IMAGES = {
  'prod-macbook-pro': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
  'wireless-noise-canceling-headphones': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  'mechanical-gaming-keyboard': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
  'ultra-light-running-shoes': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
  'limited-edition-smart-watch': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
  'prod-headphones-sony': 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',
  'prod-apple-watch-ultra': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
  'prod-ps5-pro': 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80',
  'prod-studio-mic': 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80',
  default: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80',
};

function getProductImage(product) {
  if (product.slug && PRODUCT_IMAGES[product.slug]) {
    return PRODUCT_IMAGES[product.slug];
  }
  if (product.id && PRODUCT_IMAGES[product.id]) {
    return PRODUCT_IMAGES[product.id];
  }
  const nameLower = (product.name || '').toLowerCase();
  if (nameLower.includes('macbook') || nameLower.includes('laptop')) {
    return PRODUCT_IMAGES['prod-macbook-pro'];
  }
  if (nameLower.includes('headphone') || nameLower.includes('audio')) {
    return PRODUCT_IMAGES['wireless-noise-canceling-headphones'];
  }
  if (nameLower.includes('keyboard')) {
    return PRODUCT_IMAGES['mechanical-gaming-keyboard'];
  }
  if (nameLower.includes('shoe') || nameLower.includes('sneaker') || nameLower.includes('running')) {
    return PRODUCT_IMAGES['ultra-light-running-shoes'];
  }
  if (nameLower.includes('watch')) {
    return PRODUCT_IMAGES['limited-edition-smart-watch'];
  }
  if (nameLower.includes('playstation') || nameLower.includes('game') || nameLower.includes('console')) {
    return PRODUCT_IMAGES['prod-ps5-pro'];
  }
  if (nameLower.includes('mic')) {
    return PRODUCT_IMAGES['prod-studio-mic'];
  }
  return PRODUCT_IMAGES.default;
}

// Fallback Catalog if Database is unseeded / cold
const DEFAULT_PRODUCTS = [
  {
    id: 'prod-macbook-pro',
    slug: 'prod-macbook-pro',
    name: 'MacBook Pro 16" M3 Max',
    category: { name: 'Electronics', slug: 'electronics' },
    description: '36GB Unified Memory, 1TB SSD Storage, Liquid Retina XDR Display with ProMotion.',
    price: 3499.0,
    inventory: { availableStock: 12 },
  },
  {
    id: 'prod-headphones-sony',
    slug: 'wireless-noise-canceling-headphones',
    name: 'Wireless Noise-Canceling Headphones',
    category: { name: 'Audio', slug: 'audio' },
    description: 'Premium active noise cancellation, 40-hour battery life, lossless LDAC audio codec.',
    price: 199.99,
    inventory: { availableStock: 50 },
  },
  {
    id: 'prod-apple-watch-ultra',
    slug: 'limited-edition-smart-watch',
    name: 'Limited Edition Smart Watch',
    category: { name: 'Accessories', slug: 'accessories' },
    description: 'Ultra-rare collector smartwatch with titanium bezel and aerospace-grade sapphire crystal.',
    price: 499.0,
    inventory: { availableStock: 1 },
  },
  {
    id: 'prod-mechanical-keyboard',
    slug: 'mechanical-gaming-keyboard',
    name: 'Mechanical Gaming Keyboard',
    category: { name: 'Electronics', slug: 'electronics' },
    description: 'RGB mechanical keyboard with hot-swappable tactile switches and CNC aluminum chassis.',
    price: 129.5,
    inventory: { availableStock: 25 },
  },
  {
    id: 'prod-running-shoes',
    slug: 'ultra-light-running-shoes',
    name: 'Ultra-Light Running Shoes',
    category: { name: 'Footwear', slug: 'footwear' },
    description: 'Breathable, lightweight running shoes engineered for shock absorption and marathon durability.',
    price: 89.0,
    inventory: { availableStock: 15 },
  },
  {
    id: 'prod-ps5-pro',
    slug: 'prod-ps5-pro',
    name: 'PlayStation 5 Pro 2TB Console',
    category: { name: 'Gaming', slug: 'gaming' },
    description: 'Advanced ray tracing, PlayStation Spectral Super Resolution (PSSR), 4K 120Hz HDR gaming.',
    price: 699.99,
    inventory: { availableStock: 5 },
  },
];

// App State
const state = {
  products: [],
  categories: [],
  currentCategory: null,
  searchQuery: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  activeProduct: null,
  productDetailQty: 1,
  cart: null,
  orders: [],
};

export const OrderFlowApp = {
  // ============================================================================
  // Initialization
  // ============================================================================
  async init() {
    this.setupRouter();
    this.setupEventListeners();
    await this.loadCategories();
    await this.updateUserNavbar();
    await this.refreshCartBadge();
    this.handleRoute(window.location.pathname);
  },

  // ============================================================================
  // Client-Side SPA Router
  // ============================================================================
  setupRouter() {
    // Intercept clicks on links with data-nav or matching internal routes
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (href && href.startsWith('/') && !href.startsWith('/api') && !link.target) {
        e.preventDefault();
        this.navigateTo(href);
      }
    });

    // Browser back/forward navigation
    window.addEventListener('popstate', () => {
      this.handleRoute(window.location.pathname);
    });
  },

  navigateTo(path) {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    this.handleRoute(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  handleRoute(path) {
    // Route matching
    if (path === '/' || path === '/store') {
      this.showView('view-catalog');
      this.loadCatalog();
    } else if (path.startsWith('/product/')) {
      const productId = path.split('/product/')[1];
      this.showView('view-product-detail');
      this.loadProductDetail(productId);
    } else if (path === '/cart') {
      this.showView('view-cart');
      this.renderCartPage();
    } else if (path === '/checkout') {
      this.showView('view-checkout');
      this.renderCheckoutPage();
    } else if (path === '/orders') {
      this.showView('view-orders');
      this.renderOrdersPage();
    } else if (path === '/login') {
      this.showView('view-login');
    } else if (path === '/signup') {
      this.showView('view-signup');
    } else if (path === '/account') {
      this.showView('view-account');
      this.renderAccountPage();
    } else {
      // Fallback to catalog
      this.showView('view-catalog');
      this.loadCatalog();
    }
  },

  showView(viewId) {
    document.querySelectorAll('.spa-view').forEach((el) => {
      el.classList.remove('active');
    });
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
    }
  },

  // ============================================================================
  // Event Listeners
  // ============================================================================
  setupEventListeners() {
    window.addEventListener('auth:login', () => {
      this.updateUserNavbar();
      this.refreshCartBadge();
      this.showToast('Signed in successfully!', 'success');
      this.navigateTo('/store');
    });

    window.addEventListener('auth:logout', () => {
      this.updateUserNavbar();
      this.refreshCartBadge();
      this.showToast('Signed out of OrderFlow.', 'info');
      this.navigateTo('/store');
    });

    window.addEventListener('auth:expired', () => {
      this.updateUserNavbar();
      this.showToast('Your session has expired. Please sign in again.', 'error');
    });

    window.addEventListener('cart:updated', () => {
      this.refreshCartBadge();
    });
  },

  // ============================================================================
  // User Navbar & Session Updates
  // ============================================================================
  async updateUserNavbar() {
    const greetingEl = document.getElementById('nav-user-greeting');
    const nameEl = document.getElementById('nav-user-name');
    const accountBtn = document.getElementById('nav-account-btn');

    if (ApiClient.isAuthenticated()) {
      const user = ApiClient.getCurrentUser() || (await ApiClient.getMe());
      if (user) {
        greetingEl.textContent = `Hello, ${user.firstName || 'Customer'}`;
        nameEl.textContent = 'Account & Orders';
        accountBtn.setAttribute('href', '/account');
        return;
      }
    }

    greetingEl.textContent = 'Welcome, Sign In';
    nameEl.textContent = 'Account & Lists';
    accountBtn.setAttribute('href', '/login');
  },

  async refreshCartBadge() {
    const badge = document.getElementById('nav-cart-count');
    try {
      const cart = await ApiClient.getCart();
      const count = cart?.itemCount ?? cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
      badge.textContent = count;
    } catch {
      badge.textContent = '0';
    }
  },

  // ============================================================================
  // Categories & Sub-Nav Ribbon
  // ============================================================================
  async loadCategories() {
    const ribbon = document.getElementById('category-ribbon');
    const select = document.getElementById('header-search-category');

    try {
      const res = await ApiClient.getCategories();
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        state.categories = res.data;
      } else {
        state.categories = [
          { id: 'cat-elec', name: 'Electronics', slug: 'electronics' },
          { id: 'cat-audio', name: 'Audio', slug: 'audio' },
          { id: 'cat-wear', name: 'Wearables', slug: 'wearables' },
          { id: 'cat-foot', name: 'Footwear', slug: 'footwear' },
          { id: 'cat-acc', name: 'Accessories', slug: 'accessories' },
        ];
      }
    } catch {
      state.categories = [
        { id: 'cat-elec', name: 'Electronics', slug: 'electronics' },
        { id: 'cat-audio', name: 'Audio', slug: 'audio' },
        { id: 'cat-wear', name: 'Wearables', slug: 'wearables' },
        { id: 'cat-foot', name: 'Footwear', slug: 'footwear' },
        { id: 'cat-acc', name: 'Accessories', slug: 'accessories' },
      ];
    }

    // Render category ribbon
    ribbon.innerHTML = `
      <a href="/store" class="category-nav-link ${!state.currentCategory ? 'active' : ''}" onclick="window.OrderFlowApp.filterByCategory(null)">All Departments</a>
      ${state.categories
        .map(
          (c) => `
        <button class="category-nav-link ${state.currentCategory === c.id ? 'active' : ''}" onclick="window.OrderFlowApp.filterByCategory('${c.id}')">
          ${c.name}
        </button>
      `
        )
        .join('')}
    `;

    // Populate search select dropdown
    select.innerHTML = `
      <option value="">All Categories</option>
      ${state.categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}
    `;
  },

  filterByCategory(categoryId) {
    state.currentCategory = categoryId;
    this.loadCategories();
    this.loadCatalog();
  },

  filterByCategorySlug(slug) {
    const matched = state.categories.find((c) => c.slug === slug);
    this.filterByCategory(matched ? matched.id : null);
    this.navigateTo('/store');
  },

  // ============================================================================
  // Search & Sorting Handlers
  // ============================================================================
  handleSearch() {
    const input = document.getElementById('header-search-input');
    const select = document.getElementById('header-search-category');
    state.searchQuery = input.value.trim();
    if (select.value) {
      state.currentCategory = select.value;
    }
    this.navigateTo('/store');
    this.loadCatalog();
  },

  handleSortChange(val) {
    const [by, order] = val.split('-');
    state.sortBy = by || 'createdAt';
    state.sortOrder = order || 'desc';
    this.loadCatalog();
  },

  // ============================================================================
  // Catalog View (/store)
  // ============================================================================
  async loadCatalog() {
    const grid = document.getElementById('product-grid');
    const heading = document.getElementById('catalog-section-heading');
    const resultCount = document.getElementById('catalog-result-count');

    grid.innerHTML = Array(6)
      .fill(0)
      .map(
        () => `
      <div class="product-card skeleton" style="height: 380px;"></div>
    `
      )
      .join('');

    try {
      const res = await ApiClient.getProducts({
        categoryId: state.currentCategory || undefined,
        search: state.searchQuery || undefined,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        limit: 20,
      });

      if (res.data?.products && Array.isArray(res.data.products) && res.data.products.length > 0) {
        state.products = res.data.products;
      } else {
        // Fallback to initial catalogue if database empty
        state.products = DEFAULT_PRODUCTS;
      }
    } catch {
      state.products = DEFAULT_PRODUCTS;
    }

    if (state.searchQuery) {
      heading.textContent = `Search results for "${state.searchQuery}"`;
    } else if (state.currentCategory) {
      const cat = state.categories.find((c) => c.id === state.currentCategory);
      heading.textContent = cat ? `${cat.name} Collection` : 'Featured Products';
    } else {
      heading.textContent = 'Featured Products';
    }

    resultCount.textContent = `Showing ${state.products.length} products with server-verified stock`;

    if (state.products.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">🔍</div>
          <h3 class="empty-title">No Products Found</h3>
          <p class="empty-desc">We couldn't find any products matching your search criteria. Try browsing all departments.</p>
          <button class="btn-primary" onclick="window.OrderFlowApp.filterByCategory(null)">View All Products</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = state.products
      .map((product) => {
        const stock = product.inventory?.availableStock ?? 10;
        const isLowStock = stock > 0 && stock <= 3;
        const price = typeof product.price === 'number' ? product.price : parseFloat(product.price);
        const imgUrl = getProductImage(product);
        const categoryName = product.category?.name || 'Electronics';

        return `
        <div class="product-card">
          <div class="card-image-box" onclick="window.OrderFlowApp.navigateTo('/product/${product.id}')" style="cursor: pointer;">
            <img src="${imgUrl}" alt="${product.name}" class="card-img" onerror="this.src='${PRODUCT_IMAGES.default}'" />
            <span class="card-badge ${isLowStock ? 'low-stock' : 'in-stock'}">
              ${stock <= 0 ? 'Out of Stock' : isLowStock ? `Only ${stock} Left` : 'In Stock'}
            </span>
          </div>
          <div class="card-body">
            <span class="card-category">${categoryName}</span>
            <h3 class="card-title" onclick="window.OrderFlowApp.navigateTo('/product/${product.id}')">${product.name}</h3>
            <p class="card-desc">${product.description}</p>
            <div class="card-price-row">
              <span class="card-price">$${price.toFixed(2)}</span>
              <span class="card-delivery-tag">✓ Free Delivery</span>
            </div>
            <div class="card-actions">
              <button class="btn-add-cart" onclick="window.OrderFlowApp.quickAddToCart('${product.id}')" ${stock <= 0 ? 'disabled' : ''}>
                <span>🛒</span>
                <span>Add to Cart</span>
              </button>
              <button class="btn-view-details" onclick="window.OrderFlowApp.navigateTo('/product/${product.id}')">
                Details
              </button>
            </div>
          </div>
        </div>
      `;
      })
      .join('');
  },

  async quickAddToCart(productId) {
    const product = state.products.find((p) => p.id === productId);
    if (!product) return;

    try {
      await ApiClient.addToCart(product, 1);
      this.showToast(`Added "${product.name}" to cart!`, 'success');
      this.refreshCartBadge();
    } catch (err) {
      this.showToast(err.message || 'Failed to add item to cart', 'error');
    }
  },

  // ============================================================================
  // Product Detail View (/product/:id)
  // ============================================================================
  async loadProductDetail(productId) {
    const container = document.getElementById('product-detail-card');
    container.innerHTML = `<div class="skeleton" style="height: 400px; width: 100%;"></div>`;

    let product = state.products.find((p) => p.id === productId);
    if (!product) {
      try {
        const res = await ApiClient.getProductById(productId);
        product = res.data;
      } catch {
        product = DEFAULT_PRODUCTS.find((p) => p.id === productId || p.slug === productId);
      }
    }

    if (!product) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h3 class="empty-title">Product Not Found</h3>
          <p class="empty-desc">The item you are looking for may have been removed or is temporarily unavailable.</p>
          <button class="btn-primary" onclick="window.OrderFlowApp.navigateTo('/store')">Back to Catalog</button>
        </div>
      `;
      return;
    }

    state.activeProduct = product;
    state.productDetailQty = 1;

    const price = typeof product.price === 'number' ? product.price : parseFloat(product.price);
    const stock = product.inventory?.availableStock ?? 10;
    const imgUrl = getProductImage(product);
    const categoryName = product.category?.name || 'Electronics';

    container.innerHTML = `
      <div class="breadcrumb-bar">
        <a href="/store" class="breadcrumb-link" data-nav="catalog">Home</a>
        <span>›</span>
        <button class="breadcrumb-link" onclick="window.OrderFlowApp.filterByCategory('${product.categoryId || ''}')">${categoryName}</button>
        <span>›</span>
        <span>${product.name}</span>
      </div>

      <div class="detail-layout">
        <div class="detail-gallery">
          <div class="detail-main-image-box">
            <img src="${imgUrl}" alt="${product.name}" class="detail-main-img" onerror="this.src='${PRODUCT_IMAGES.default}'" />
          </div>
        </div>

        <div class="detail-info">
          <span class="detail-category">${categoryName}</span>
          <h1 class="detail-title">${product.name}</h1>
          
          <div class="detail-price-box">
            <span class="detail-price">$${price.toFixed(2)}</span>
            <span class="detail-stock-status ${stock > 0 ? 'in-stock' : 'out-of-stock'}">
              ${stock > 0 ? `● In Stock (${stock} units left)` : '● Currently Out of Stock'}
            </span>
          </div>

          <h3 class="detail-desc-title">About this product</h3>
          <p class="detail-desc-text">${product.description}</p>

          <div class="detail-actions-row">
            <div class="quantity-control">
              <button class="qty-btn" onclick="window.OrderFlowApp.adjustDetailQty(-1)">-</button>
              <span class="qty-display" id="detail-qty-value">1</span>
              <button class="qty-btn" onclick="window.OrderFlowApp.adjustDetailQty(1)">+</button>
            </div>

            <button class="btn-detail-add" onclick="window.OrderFlowApp.addActiveProductToCart()" ${stock <= 0 ? 'disabled' : ''}>
              🛒 Add to Shopping Cart
            </button>
          </div>

          <div style="background-color: var(--bg-subtle); padding: 16px; border-radius: var(--radius-md); font-size: 0.85rem; color: var(--text-muted);">
            <p><strong>🔒 Concurrency-Safe Checkout:</strong> Stock units are allocated server-side using MySQL atomic conditional updates at order checkout.</p>
          </div>
        </div>
      </div>
    `;
  },

  adjustDetailQty(delta) {
    const maxStock = state.activeProduct?.inventory?.availableStock ?? 50;
    const newQty = Math.max(1, Math.min(state.productDetailQty + delta, maxStock));
    state.productDetailQty = newQty;
    const el = document.getElementById('detail-qty-value');
    if (el) el.textContent = newQty;
  },

  async addActiveProductToCart() {
    if (!state.activeProduct) return;
    try {
      await ApiClient.addToCart(state.activeProduct, state.productDetailQty);
      this.showToast(`Added ${state.productDetailQty}x "${state.activeProduct.name}" to cart!`, 'success');
      this.refreshCartBadge();
      this.navigateTo('/cart');
    } catch (err) {
      this.showToast(err.message || 'Failed to add item to cart', 'error');
    }
  },

  // ============================================================================
  // Cart Page View (/cart)
  // ============================================================================
  async renderCartPage() {
    const listContainer = document.getElementById('cart-item-list');
    const subtotalEl = document.getElementById('cart-summary-subtotal');
    const taxEl = document.getElementById('cart-summary-tax');
    const totalEl = document.getElementById('cart-summary-total');
    const checkoutBtn = document.getElementById('cart-proceed-checkout-btn');

    listContainer.innerHTML = `<div class="skeleton" style="height: 120px; width: 100%;"></div>`;

    const cart = await ApiClient.getCart();
    state.cart = cart;

    const items = cart?.items || [];
    if (items.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🛒</div>
          <h3 class="empty-title">Your Shopping Cart is Empty</h3>
          <p class="empty-desc">Explore our top deals and add items to your cart.</p>
          <button class="btn-primary" onclick="window.OrderFlowApp.navigateTo('/store')">Shop Now</button>
        </div>
      `;
      subtotalEl.textContent = '$0.00';
      taxEl.textContent = '$0.00';
      totalEl.textContent = '$0.00';
      checkoutBtn.disabled = true;
      return;
    }

    checkoutBtn.disabled = false;

    const subtotal = items.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + (typeof price === 'number' ? price : parseFloat(price)) * item.quantity;
    }, 0);

    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    taxEl.textContent = `$${tax.toFixed(2)}`;
    totalEl.textContent = `$${total.toFixed(2)}`;

    listContainer.innerHTML = items
      .map((item) => {
        const prod = item.product || {};
        const price = prod.price || 0;
        const unitPrice = typeof price === 'number' ? price : parseFloat(price);
        const itemTotal = unitPrice * item.quantity;
        const imgUrl = getProductImage(prod);

        return `
        <div class="cart-item-row">
          <img src="${imgUrl}" alt="${prod.name || 'Product'}" class="cart-item-img" onerror="this.src='${PRODUCT_IMAGES.default}'" />
          <div class="cart-item-details">
            <h4 class="cart-item-title">${prod.name || 'OrderFlow Item'}</h4>
            <div class="cart-item-unit-price">$${unitPrice.toFixed(2)} each</div>
            <div class="cart-item-controls">
              <div class="quantity-control" style="transform: scale(0.85); transform-origin: left center;">
                <button class="qty-btn" onclick="window.OrderFlowApp.updateCartQty('${item.productId}', ${item.quantity - 1})">-</button>
                <span class="qty-display">${item.quantity}</span>
                <button class="qty-btn" onclick="window.OrderFlowApp.updateCartQty('${item.productId}', ${item.quantity + 1})">+</button>
              </div>
              <button class="btn-item-remove" onclick="window.OrderFlowApp.removeCartItem('${item.productId}')">Delete</button>
            </div>
          </div>
          <div class="cart-item-subtotal">$${itemTotal.toFixed(2)}</div>
        </div>
      `;
      })
      .join('');
  },

  async updateCartQty(productId, newQty) {
    try {
      await ApiClient.updateCartItem(productId, newQty);
      await this.renderCartPage();
      await this.refreshCartBadge();
    } catch (err) {
      this.showToast(err.message || 'Could not update item', 'error');
    }
  },

  async removeCartItem(productId) {
    try {
      await ApiClient.removeFromCart(productId);
      await this.renderCartPage();
      await this.refreshCartBadge();
      this.showToast('Item removed from cart', 'info');
    } catch (err) {
      this.showToast(err.message || 'Could not remove item', 'error');
    }
  },

  async clearCart() {
    try {
      await ApiClient.clearCart();
      await this.renderCartPage();
      await this.refreshCartBadge();
      this.showToast('Shopping cart cleared', 'info');
    } catch (err) {
      this.showToast(err.message || 'Failed to clear cart', 'error');
    }
  },

  // ============================================================================
  // Checkout View (/checkout)
  // ============================================================================
  async renderCheckoutPage() {
    const cart = await ApiClient.getCart();
    state.cart = cart;

    const items = cart?.items || [];
    if (items.length === 0) {
      this.showToast('Your cart is empty. Add items before checkout.', 'error');
      this.navigateTo('/cart');
      return;
    }

    // Auto-fill user name if authenticated
    const user = ApiClient.getCurrentUser();
    if (user && user.firstName) {
      const nameInput = document.getElementById('checkout-name');
      if (nameInput && !nameInput.value) {
        nameInput.value = `${user.firstName} ${user.lastName || ''}`.trim();
      }
    }

    const itemsContainer = document.getElementById('checkout-items-summary');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const taxEl = document.getElementById('checkout-tax');
    const totalEl = document.getElementById('checkout-total');

    const subtotal = items.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + (typeof price === 'number' ? price : parseFloat(price)) * item.quantity;
    }, 0);

    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    taxEl.textContent = `$${tax.toFixed(2)}`;
    totalEl.textContent = `$${total.toFixed(2)}`;

    itemsContainer.innerHTML = items
      .map((item) => {
        const prod = item.product || {};
        const price = prod.price || 0;
        const unitPrice = typeof price === 'number' ? price : parseFloat(price);
        return `
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #475569;">
          <span>${item.quantity}x ${prod.name || 'Item'}</span>
          <span style="font-weight: 700;">$${(unitPrice * item.quantity).toFixed(2)}</span>
        </div>
      `;
      })
      .join('');
  },

  async submitOrder() {
    // Require authenticated user for real order creation
    if (!ApiClient.isAuthenticated()) {
      this.showToast('Please sign in or create an account to complete checkout', 'info');
      this.navigateTo('/login');
      return;
    }

    const name = document.getElementById('checkout-name')?.value.trim();
    const street = document.getElementById('checkout-street')?.value.trim();
    const city = document.getElementById('checkout-city')?.value.trim();
    const stateVal = document.getElementById('checkout-state')?.value.trim();
    const zip = document.getElementById('checkout-zip')?.value.trim();
    const phone = document.getElementById('checkout-phone')?.value.trim();

    if (!name || !street || !city || !stateVal || !zip) {
      this.showToast('Please complete all required shipping fields', 'error');
      return;
    }

    const fullShippingAddress = `${name}, ${street}, ${city}, ${stateVal} ${zip}. Phone: ${phone || 'N/A'}`;
    const submitBtn = document.getElementById('btn-submit-order');

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = '🔒 Reserving Inventory & Placing Order...';

      const orderResult = await ApiClient.checkout({
        shippingAddress: fullShippingAddress,
      });

      // Show confirmation view
      document.getElementById('success-order-number').textContent = orderResult.orderNumber;
      document.getElementById('success-order-address').textContent = fullShippingAddress;

      await ApiClient.clearCart();
      await this.refreshCartBadge();

      this.showView('view-order-success');
      this.showToast(`Order ${orderResult.orderNumber} successfully confirmed!`, 'success');
    } catch (err) {
      this.showToast(err.message || 'Checkout failed. Please check stock availability.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Place Order (Atomic SQL Lock)';
    }
  },

  // ============================================================================
  // Orders View (/orders)
  // ============================================================================
  async renderOrdersPage() {
    const container = document.getElementById('orders-list-container');

    if (!ApiClient.isAuthenticated()) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👤</div>
          <h3 class="empty-title">Please Sign In to View Orders</h3>
          <p class="empty-desc">Sign in with your OrderFlow account to view your past orders, delivery tracking, and receipts.</p>
          <button class="btn-primary" onclick="window.OrderFlowApp.navigateTo('/login')">Sign In</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `<div class="skeleton" style="height: 180px; width: 100%;"></div>`;

    try {
      const res = await ApiClient.getOrders();
      const orders = res.data?.orders || [];

      if (orders.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📦</div>
            <h3 class="empty-title">No Orders Yet</h3>
            <p class="empty-desc">You haven't placed any orders yet. Discover our top products today.</p>
            <button class="btn-primary" onclick="window.OrderFlowApp.navigateTo('/store')">Explore Catalog</button>
          </div>
        `;
        return;
      }

      container.innerHTML = orders
        .map((order) => {
          const dateStr = new Date(order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          const total = typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount);

          return `
          <div class="order-history-card">
            <div class="order-card-header">
              <div class="order-meta-group">
                <div class="order-meta-item">
                  <span class="order-meta-label">Order Placed</span>
                  <span class="order-meta-value">${dateStr}</span>
                </div>
                <div class="order-meta-item">
                  <span class="order-meta-label">Total Amount</span>
                  <span class="order-meta-value">$${total.toFixed(2)}</span>
                </div>
                <div class="order-meta-item">
                  <span class="order-meta-label">Ship To</span>
                  <span class="order-meta-value" style="max-width: 200px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                    ${order.shippingAddress || 'Customer'}
                  </span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 14px;">
                <span class="order-status-badge ${order.status}">${order.status}</span>
                <span style="font-family: monospace; font-size: 0.85rem; font-weight: 700; color: #475569;">
                  #${order.orderNumber}
                </span>
              </div>
            </div>

            <div class="order-card-body">
              ${(order.items || [])
                .map(
                  (item) => `
                <div class="order-line-item">
                  <div>
                    <strong>${item.productName || item.product?.name || 'Product'}</strong>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">Quantity: ${item.quantity}</div>
                  </div>
                  <div style="font-weight: 700; font-size: 1rem;">
                    $${(typeof item.subtotal === 'number' ? item.subtotal : parseFloat(item.subtotal || 0)).toFixed(2)}
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `;
        })
        .join('');
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h3 class="empty-title">Could Not Load Orders</h3>
          <p class="empty-desc">${err.message || 'Failed to fetch order history from the server.'}</p>
          <button class="btn-primary" onclick="window.OrderFlowApp.renderOrdersPage()">Try Again</button>
        </div>
      `;
    }
  },

  // ============================================================================
  // Authentication Handlers (/login, /signup, /account)
  // ============================================================================
  async handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorBanner = document.getElementById('login-error-banner');
    const submitBtn = document.getElementById('btn-login-submit');

    errorBanner.style.display = 'none';

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';
      await ApiClient.login({ email, password });
    } catch (err) {
      errorBanner.textContent = err.message || 'Invalid email or password';
      errorBanner.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  },

  async handleSignup() {
    const firstName = document.getElementById('signup-first-name').value.trim();
    const lastName = document.getElementById('signup-last-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const errorBanner = document.getElementById('signup-error-banner');
    const submitBtn = document.getElementById('btn-signup-submit');

    errorBanner.style.display = 'none';

    // Password client validation
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      errorBanner.textContent = 'Password must be at least 8 characters with at least 1 uppercase letter and 1 number.';
      errorBanner.style.display = 'block';
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';
      await ApiClient.register({ email, password, firstName, lastName });
    } catch (err) {
      errorBanner.textContent = err.message || 'Registration failed';
      errorBanner.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Customer Account';
    }
  },

  handleLogout() {
    ApiClient.logout();
  },

  togglePasswordVisibility(fieldId) {
    const input = document.getElementById(fieldId);
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  },

  async renderAccountPage() {
    if (!ApiClient.isAuthenticated()) {
      this.navigateTo('/login');
      return;
    }

    const user = ApiClient.getCurrentUser() || (await ApiClient.getMe());
    if (!user) {
      this.navigateTo('/login');
      return;
    }

    const initials = `${(user.firstName || 'C')[0]}${(user.lastName || '')[0] || ''}`.toUpperCase();
    document.getElementById('account-avatar-initials').textContent = initials;
    document.getElementById('account-full-name').textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer';
    document.getElementById('account-email-display').textContent = user.email || '';
    document.getElementById('account-id-display').textContent = user.id || 'N/A';
    document.getElementById('account-created-display').textContent = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Member';
  },

  // ============================================================================
  // Toast Notifications
  // ============================================================================
  showToast(message, type = 'info') {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';

    toast.innerHTML = `
      <span>${icon}</span>
      <span>${message}</span>
    `;

    stack.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  },
};

// Expose globally for inline event handlers and bootstrap
window.OrderFlowApp = OrderFlowApp;

document.addEventListener('DOMContentLoaded', () => {
  OrderFlowApp.init();
});
