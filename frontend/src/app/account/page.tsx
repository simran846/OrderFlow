'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
        <p>Loading account details...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login?redirect=/account');
    return null;
  }

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'U';

  return (
    <div style={{ padding: '24px 0' }}>
      <div className="breadcrumb-bar" style={{ marginBottom: '24px' }}>
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span>›</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>My Account</span>
      </div>

      <div className="checkout-layout">
        <div className="checkout-card">
          <h2 className="section-title" style={{ marginBottom: '16px' }}>Customer Profile</h2>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              paddingBottom: '20px',
              borderBottom: '1px solid #e2e8f0',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: '#fff',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                fontWeight: 700,
              }}
            >
              {initials}
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {user?.firstName} {user?.lastName}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{user?.email}</p>
              <span className="order-status-badge CONFIRMED" style={{ marginTop: '6px', display: 'inline-block' }}>
                Verified Customer
              </span>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <span className="order-meta-label">Customer ID</span>
              <span className="order-meta-value" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {user?.id}
              </span>
            </div>
            <div className="form-group">
              <span className="order-meta-label">Account Role</span>
              <span className="order-meta-value">{user?.role}</span>
            </div>
          </div>

          <div style={{ marginTop: '28px', display: 'flex', gap: '14px' }}>
            <Link href="/orders" className="btn-primary" style={{ textDecoration: 'none' }}>
              View Order History
            </Link>
            <button
              className="btn-secondary"
              style={{ color: '#ef4444', borderColor: '#fecaca', backgroundColor: '#fef2f2', cursor: 'pointer' }}
              onClick={() => {
                logout();
                router.push('/');
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="checkout-card">
          <h3 className="summary-heading">Shopping Preferences</h3>
          <ul className="footer-link-list">
            <li style={{ marginBottom: '12px' }}>
              <Link href="/cart" className="footer-link">🛒 Active Shopping Cart</Link>
            </li>
            <li style={{ marginBottom: '12px' }}>
              <Link href="/orders" className="footer-link">📦 Order History & Invoices</Link>
            </li>
            <li style={{ marginBottom: '12px' }}>
              <Link href="/" className="footer-link">🛍️ Browse Product Catalog</Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
