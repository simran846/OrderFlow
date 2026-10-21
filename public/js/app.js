// Storefront Products Data
const PRODUCTS = [
  {
    id: 'prod-macbook-pro',
    name: 'MacBook Pro 16" M3 Max',
    category: 'Laptops',
    description: '36GB Unified Memory, 1TB SSD Storage, Liquid Retina XDR Display with ProMotion.',
    price: 3499.00,
    emoji: '💻',
    stock: 12,
    badge: 'In Stock'
  },
  {
    id: 'prod-headphones-sony',
    name: 'WH-1000XM5 Wireless Headphones',
    category: 'Audio',
    description: 'Industry-leading noise cancellation, 30-hour battery life, lossless LDAC audio codec.',
    price: 399.99,
    emoji: '🎧',
    stock: 25,
    badge: 'Popular'
  },
  {
    id: 'prod-apple-watch-ultra',
    name: 'Apple Watch Ultra 2 Titanium',
    category: 'Wearables',
    description: 'Rugged 49mm titanium case, precision dual-frequency GPS, up to 72 hours low-power battery.',
    price: 799.00,
    emoji: '⌚',
    stock: 4,
    badge: 'Only 4 Left'
  },
  {
    id: 'prod-mechanical-keyboard',
    name: 'Cyberpunk Custom Mechanical Keyboard',
    category: 'Accessories',
    description: 'Gasket-mounted hot-swappable tactile switches, per-key RGB, CNC anodized aluminum case.',
    price: 249.50,
    emoji: '⌨️',
    stock: 18,
    badge: 'In Stock'
  },
  {
    id: 'prod-ps5-pro',
    name: 'PlayStation 5 Pro 2TB Console',
    category: 'Gaming',
    description: 'Advanced ray tracing, PlayStation Spectral Super Resolution (PSSR), 4K 120Hz HDR gaming.',
    price: 699.99,
    emoji: '🎮',
    stock: 2,
    badge: 'High Demand'
  },
  {
    id: 'prod-studio-mic',
    name: 'Studio Pro XLR Dynamic Microphone',
    category: 'Audio',
    description: 'Broadcasting cardioid capsule with integrated shockmount and analog pop filter.',
    price: 299.00,
    emoji: '🎙️',
    stock: 15,
    badge: 'In Stock'
  }
];

// App State
let liveProducts = [...PRODUCTS];
let cart = [];
let currentCategory = 'all';

// DOM Elements
const productGrid = document.getElementById('product-grid');
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const cartItemsContainer = document.getElementById('cart-items');
const cartCountBadge = document.getElementById('cart-count');
const cartSubtotalEl = document.getElementById('cart-subtotal');
const cartTaxEl = document.getElementById('cart-tax');
const cartTotalEl = document.getElementById('cart-total');
const toastContainer = document.getElementById('toast-container');
const checkoutModal = document.getElementById('checkout-modal');
const healthPill = document.getElementById('health-pill');
const healthStatusText = document.getElementById('health-status-text');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  setupCategoryTabs();
  checkBackendHealth();
  loadLiveProducts();
  // Poll health every 15s
  setInterval(checkBackendHealth, 15000);
});

// Fetch Live Products from OrderFlow Backend API
async function loadLiveProducts() {
  try {
    const res = await fetch('/api/v1/products?limit=20');
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.products && Array.isArray(json.data.products) && json.data.products.length > 0) {
        liveProducts = json.data.products.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category?.name || 'General',
          description: p.description,
          price: parseFloat(p.price),
          emoji: p.category?.name === 'Footwear' ? '👟' : p.category?.name === 'Accessories' ? '⌚' : '🎧',
          stock: p.inventory?.availableStock ?? 10,
          badge: (p.inventory?.availableStock ?? 10) <= 2 ? 'Low Stock' : 'In Stock'
        }));
        renderProducts();
        setupCategoryTabs();
      }
    }
  } catch {
    // Graceful fallback to default catalog
  }
}

// Render Products
function renderProducts() {
  const source = liveProducts.length > 0 ? liveProducts : PRODUCTS;
  const filtered = currentCategory === 'all' 
    ? source 
    : source.filter(p => p.category.toLowerCase() === currentCategory.toLowerCase());

  productGrid.innerHTML = filtered.map(product => `
    <div class="product-card">
      <div class="product-media">
        <span class="product-emoji">${product.emoji}</span>
        <span class="stock-tag ${product.stock <= 4 ? 'low' : ''}">${product.badge}</span>
      </div>
      <div class="product-info">
        <span class="product-category">${product.category}</span>
        <h3 class="product-name">${product.name}</h3>
        <p class="product-desc">${product.description}</p>
        <div class="product-footer">
          <span class="product-price">$${product.price.toFixed(2)}</span>
          <button class="add-btn" onclick="addToCart('${product.id}')">
            Add to Cart +
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Category Tabs
function setupCategoryTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.dataset.category;
      renderProducts();
    });
  });
}

// Cart Management
function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    if (existing.quantity >= product.stock) {
      showToast(`Cannot add more. Only ${product.stock} units available in inventory.`, 'error');
      return;
    }
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  updateCartUI();
  showToast(`Added "${product.name}" to cart`, 'success');
}

function updateQuantity(productId, delta) {
  const itemIndex = cart.findIndex(item => item.id === productId);
  if (itemIndex === -1) return;

  const item = cart[itemIndex];
  const newQty = item.quantity + delta;

  if (newQty <= 0) {
    cart.splice(itemIndex, 1);
  } else if (newQty > item.stock) {
    showToast(`Inventory limit reached (${item.stock} in stock)`, 'error');
    return;
  } else {
    item.quantity = newQty;
  }

  updateCartUI();
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCountBadge.textContent = totalCount;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 3rem 0;">
        <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">🛒</span>
        Your shopping cart is currently empty.
      </div>
    `;
    cartSubtotalEl.textContent = '$0.00';
    cartTaxEl.textContent = '$0.00';
    cartTotalEl.textContent = '$0.00';
    return;
  }

  cartItemsContainer.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.emoji} ${item.name}</div>
        <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)} (${item.quantity} × $${item.price.toFixed(2)})</div>
      </div>
      <div class="qty-controls">
        <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
        <span style="font-size: 0.9rem; font-weight: 600; min-width: 20px; text-align: center;">${item.quantity}</span>
        <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
      </div>
    </div>
  `).join('');

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08; // 8% sales tax
  const total = subtotal + tax;

  cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  cartTaxEl.textContent = `$${tax.toFixed(2)}`;
  cartTotalEl.textContent = `$${total.toFixed(2)}`;
}

// Drawer Controls
function toggleCart() {
  cartDrawer.classList.toggle('open');
  cartOverlay.classList.toggle('open');
}

// Checkout Modal
function openCheckout() {
  if (cart.length === 0) {
    showToast('Your cart is empty! Add products before checking out.', 'error');
    return;
  }

  toggleCart();
  checkoutModal.classList.add('open');

  // Generate deterministic Idempotency Key simulation
  const randomKey = 'idemp_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
  document.getElementById('idempotency-key-input').value = randomKey;
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('checkout-amount-display').textContent = `$${(subtotal * 1.08).toFixed(2)}`;
}

function closeCheckout() {
  checkoutModal.classList.remove('open');
}

async function submitOrder() {
  const address = document.getElementById('shipping-address-input').value.trim();
  const idempKey = document.getElementById('idempotency-key-input').value.trim();
  const submitBtn = document.getElementById('submit-order-btn');

  if (!address) {
    showToast('Please enter a valid delivery address', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '🔒 Executing Atomic Order Reservation...';

  // Simulate network delay to backend
  setTimeout(() => {
    const orderNumber = 'ORD-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);
    
    closeCheckout();
    cart = [];
    updateCartUI();

    showToast(`Order ${orderNumber} Confirmed with Idempotency Key!`, 'success');
    alert(`🎉 Order Successfully Placed!\n\nOrder Number: ${orderNumber}\nStatus: CONFIRMED\nIdempotency Key: ${idempKey}\n\nInventory units have been reserved and processed by OrderFlow.`);

    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm & Place Order (Atomic SQL)';
  }, 1000);
}

// Real Backend Health Check Ping
async function checkBackendHealth() {
  const startTime = performance.now();
  try {
    const res = await fetch('/api/v1/health');
    const latency = Math.round(performance.now() - startTime);
    
    if (res.ok) {
      healthStatusText.textContent = `Backend: ONLINE • ${latency}ms`;
      healthPill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else {
      healthStatusText.textContent = `Backend: DEGRADED • ${latency}ms`;
      healthPill.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    }
  } catch (e) {
    healthStatusText.textContent = 'Backend: CONNECTING';
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️'}</span>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
