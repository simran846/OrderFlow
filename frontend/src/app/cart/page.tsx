'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { getProductImage } from '../../components/ProductCard';

export default function CartPage() {
  const router = useRouter();
  const { cart, updateQuantity, removeItem, clearCart, isLoading } = useCart();
  const { showToast } = useToast();

  const subtotal = Number(cart.totalAmount || 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleClear = async () => {
    await clearCart();
    showToast('Cart cleared', 'info');
  };

  return (
    <div style={{ padding: '24px 0' }}>
      <div className="breadcrumb-bar" style={{ marginBottom: '24px' }}>
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span>›</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>Shopping Cart</span>
      </div>

      <div className="cart-page-layout">
        <div className="cart-items-panel">
          <div className="cart-header-row">
            <h2 className="cart-heading">Shopping Cart ({cart.itemCount} items)</h2>
            {cart.items.length > 0 && (
              <button className="btn-clear-cart" onClick={handleClear} disabled={isLoading}>
                Clear Cart
              </button>
            )}
          </div>

          {cart.items.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🛒</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Your cart is currently empty
              </h3>
              <p style={{ marginBottom: '24px' }}>Discover trending tech deals and add them to your cart.</p>
              <Link href="/" className="btn-primary" style={{ display: 'inline-block' }}>
                Start Shopping
              </Link>
            </div>
          ) : (
            <div id="cart-item-list">
              {cart.items.map((item) => {
                const product = item.product || {
                  id: item.productId,
                  name: 'Product Item',
                  slug: 'product',
                  description: '',
                  price: 0,
                  categoryId: '',
                };
                const imageUrl = getProductImage(product);
                const itemPrice = Number(product.price || 0);
                const itemSubtotal = itemPrice * item.quantity;

                return (
                  <div key={item.id || item.productId} className="cart-item-row">
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="cart-item-img"
                    />

                    <div className="cart-item-info">
                      <Link href={`/product/${item.productId}`} style={{ textDecoration: 'none' }}>
                        <h4 className="cart-item-title">{product.name}</h4>
                      </Link>
                      <div className="cart-item-price-each">
                        ${itemPrice.toFixed(2)} each
                      </div>
                      <div style={{ color: '#16a34a', fontSize: '0.8rem', marginTop: '4px', fontWeight: 600 }}>
                        In Stock • Verified Inventory
                      </div>
                    </div>

                    <div className="cart-item-actions">
                      <div className="cart-qty-control">
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          disabled={isLoading}
                        >
                          -
                        </button>
                        <span className="qty-value">{item.quantity}</span>
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={isLoading}
                        >
                          +
                        </button>
                      </div>

                      <div className="cart-item-subtotal">
                        ${itemSubtotal.toFixed(2)}
                      </div>

                      <button
                        className="btn-remove-item"
                        onClick={() => removeItem(item.productId)}
                        disabled={isLoading}
                        title="Remove item"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Summary Panel */}
        <div className="cart-summary-panel">
          <h3 className="summary-heading">Order Summary</h3>
          <div className="summary-line">
            <span>Items Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="summary-line">
            <span>Estimated Tax (8%):</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="summary-line">
            <span>Express Delivery:</span>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>FREE</span>
          </div>
          <div className="summary-line total">
            <span>Order Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <button
            className="btn-checkout-proceed"
            disabled={cart.items.length === 0 || isLoading}
            onClick={() => router.push('/checkout')}
            style={{ opacity: cart.items.length === 0 ? 0.6 : 1 }}
          >
            <span>Proceed to Checkout</span>
            <span>→</span>
          </button>

          <button
            className="btn-view-details"
            style={{ width: '100%', marginTop: '10px' }}
            onClick={() => router.push('/')}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
