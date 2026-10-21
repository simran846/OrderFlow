'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ApiClient } from '../../lib/api';
import { ShippingAddress } from '@/types';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, refreshCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: user ? `${user.firstName} ${user.lastName}` : 'John Doe',
    street: '742 Evergreen Terrace, Apt 4B',
    city: 'Springfield',
    state: 'Oregon',
    postalCode: '97477',
    phone: '+1 (555) 019-2834',
    country: 'United States',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const subtotal = Number(cart.totalAmount || 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.items.length === 0) {
      showToast('Your cart is empty', 'error');
      router.push('/');
      return;
    }

    if (!isAuthenticated) {
      showToast('Please sign in to place your order', 'info');
      router.push('/login?redirect=/checkout');
      return;
    }

    setSubmitting(true);
    setErrorBanner(null);

    try {
      const order = await ApiClient.checkout({ shippingAddress });
      await refreshCart();
      showToast('Order confirmed successfully!', 'success');
      router.push(`/orders/${order.id || order.orderNumber}`);
    } catch (err: any) {
      setErrorBanner(err.message || 'Checkout failed. Please try again.');
      showToast(err.message || 'Checkout failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px 0' }}>
      <div className="breadcrumb-bar" style={{ marginBottom: '24px' }}>
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span>›</span>
        <Link href="/cart" className="breadcrumb-link">Cart</Link>
        <span>›</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>Secure Checkout</span>
      </div>

      <div className="checkout-layout">
        <div className="checkout-forms">
          {/* Step 1: Address */}
          <div className="checkout-card">
            <h3 className="checkout-step-title">
              <span className="step-number">1</span>
              <span>Shipping & Delivery Address</span>
            </h3>

            <form id="checkout-address-form" onSubmit={handleSubmitOrder}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Street Address *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={shippingAddress.street}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">State / Province *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={shippingAddress.state}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ZIP / Postal Code *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={shippingAddress.postalCode}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone Number *</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                    required
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Step 2: Payment */}
          <div className="checkout-card">
            <h3 className="checkout-step-title">
              <span className="step-number">2</span>
              <span>Payment Settlement</span>
            </h3>

            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 700, cursor: 'pointer' }}>
                <input type="radio" name="payment" defaultChecked style={{ accentColor: '#2563eb', transform: 'scale(1.2)' }} />
                <span>Stripe Sandbox / Instant Encrypted Checkout</span>
              </label>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '8px', marginLeft: '28px' }}>
                Secured by OrderFlow&apos;s backend idempotency key engine. Prevents duplicate charges during concurrent clicks or network retries.
              </p>
            </div>
          </div>
        </div>

        {/* Checkout Summary Sidebar */}
        <div className="checkout-summary-sidebar">
          <div className="checkout-card">
            <h3 className="summary-heading">Review Order</h3>

            <div className="checkout-items-preview">
              {cart.items.map((item) => (
                <div key={item.id || item.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px' }}>
                  <span>{item.quantity} × {item.product?.name || 'Product'}</span>
                  <span style={{ fontWeight: 600 }}>
                    ${(Number(item.product?.price || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-line">
              <span>Subtotal:</span>
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
              <span>Total to Pay:</span>
              <span>${total.toFixed(2)}</span>
            </div>

            {errorBanner && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', marginTop: '16px' }}>
                {errorBanner}
              </div>
            )}

            <button
              className="btn-place-order"
              onClick={handleSubmitOrder}
              disabled={submitting || cart.items.length === 0}
              style={{ marginTop: '20px' }}
            >
              <span>{submitting ? 'Processing Order...' : 'Place Order (Atomic SQL Lock)'}</span>
            </button>

            <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '12px' }}>
              By placing your order, you agree to OrderFlow&apos;s Terms of Service and Privacy Notice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
