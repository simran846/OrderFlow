'use client';

import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <footer className="consumer-footer">
      <div className="footer-inner">
        <div>
          <div className="brand-container" style={{ marginBottom: '14px' }}>
            <div className="brand-logo-badge">⚡</div>
            <span className="brand-name" style={{ fontSize: '1.2rem' }}>OrderFlow</span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.6, maxWidth: '320px' }}>
            Production-grade modular monolith e-commerce engine with atomic inventory locks, distributed idempotency protection, and verified payment webhooks.
          </p>
        </div>

        <div>
          <h4 className="footer-col-title">Shop by Department</h4>
          <ul className="footer-link-list">
            <li><Link href="/" className="footer-link">Computers & Laptops</Link></li>
            <li><Link href="/" className="footer-link">Headphones & Audio</Link></li>
            <li><Link href="/" className="footer-link">Smartwatches & Tech</Link></li>
            <li><Link href="/" className="footer-link">Footwear & Apparel</Link></li>
            <li><Link href="/" className="footer-link">Keyboards & Accessories</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="footer-col-title">Customer Care</h4>
          <ul className="footer-link-list">
            <li><Link href="/orders" className="footer-link">Track Your Orders</Link></li>
            <li><Link href="/cart" className="footer-link">Shopping Cart</Link></li>
            <li><Link href="/" className="footer-link">Shipping Policies</Link></li>
            <li><Link href="/" className="footer-link">Returns & Refunds</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="footer-col-title">Engineering Specs</h4>
          <ul className="footer-link-list">
            <li><a href="http://localhost:5000/api/v1/docs" target="_blank" rel="noreferrer" className="footer-link">Interactive Swagger Docs ↗</a></li>
            <li><a href="http://localhost:5000/api/v1/health" target="_blank" rel="noreferrer" className="footer-link">System Health Check ↗</a></li>
            <li><a href="https://github.com/simran846/OrderFlow" target="_blank" rel="noreferrer" className="footer-link">GitHub Repository ↗</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 OrderFlow Inc. All rights reserved. Built with Next.js, TypeScript, Express, MySQL 8, Redis, and BullMQ.</span>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/" className="footer-link">Privacy Policy</Link>
          <Link href="/" className="footer-link">Terms of Service</Link>
          <Link href="/" className="footer-link">Security</Link>
        </div>
      </div>
    </footer>
  );
};
