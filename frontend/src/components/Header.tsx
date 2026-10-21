'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CategorySummary } from '@/types';
import { ApiClient } from '../lib/api';

interface HeaderProps {
  onSearch?: (query: string, categoryId: string) => void;
  selectedCategory?: string;
  onSelectCategory?: (categoryId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSearch,
  selectedCategory = '',
  onSelectCategory,
}) => {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  useEffect(() => {
    ApiClient.getCategories()
      .then((res) => {
        if (res.data) setCategories(res.data);
      })
      .catch(() => {
        // Fallback default categories if offline
        setCategories([
          { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
          { id: 'cat-audio', name: 'Audio', slug: 'audio' },
          { id: 'cat-wearables', name: 'Wearables', slug: 'wearables' },
          { id: 'cat-footwear', name: 'Footwear', slug: 'footwear' },
          { id: 'cat-accessories', name: 'Accessories', slug: 'accessories' },
        ]);
      });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery, searchCategory);
    } else {
      router.push(`/?search=${encodeURIComponent(searchQuery)}&categoryId=${encodeURIComponent(searchCategory)}`);
    }
  };

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="announcement-bar">
        <div className="announcement-text">
          <span className="announcement-badge">Special Offer</span>
          <span>Free Express Shipping on Orders Over $50 • 30-Day Zero-Hassle Returns</span>
        </div>
        <div className="announcement-links">
          <Link href="/orders" className="announcement-link">
            Track Orders
          </Link>
          <Link href="/" className="announcement-link">
            Help & Support
          </Link>
        </div>
      </div>

      {/* Main Consumer Header */}
      <header className="main-header">
        <div className="header-top">
          {/* Brand Logo */}
          <Link href="/" className="brand-container">
            <div className="brand-logo-badge">⚡</div>
            <div className="brand-text">
              <span className="brand-name">OrderFlow</span>
              <span className="brand-tagline">Express Marketplace</span>
            </div>
          </Link>

          {/* Search Bar */}
          <form className="search-wrapper" onSubmit={handleSearchSubmit}>
            <select
              className="search-category-select"
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="search-input"
              placeholder="Search for laptops, headphones, smartwatches, gaming..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-btn" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </form>

          {/* Customer Header Actions */}
          <div className="header-actions">
            {/* Account Button / Dropdown */}
            <div className="account-menu-wrapper" style={{ position: 'relative' }}>
              <button
                type="button"
                className="nav-action-btn"
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <span className="action-icon">👤</span>
                <div className="action-text-group">
                  <span className="action-label-small">
                    {isAuthenticated ? `Hello, ${user?.firstName}` : 'Welcome, Sign In'}
                  </span>
                  <span className="action-label-bold">Account & Lists ▾</span>
                </div>
              </button>

              {showAccountMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '220px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    padding: '8px 0',
                  }}
                  onMouseLeave={() => setShowAccountMenu(false)}
                >
                  {isAuthenticated ? (
                    <>
                      <div style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 700 }}>{user?.firstName} {user?.lastName}</div>
                        <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{user?.email}</div>
                      </div>
                      <Link
                        href="/account"
                        className="dropdown-item"
                        style={{ display: 'block', padding: '8px 16px', color: '#1e293b', textDecoration: 'none', fontSize: '0.9rem' }}
                        onClick={() => setShowAccountMenu(false)}
                      >
                        Profile & Account
                      </Link>
                      <Link
                        href="/orders"
                        className="dropdown-item"
                        style={{ display: 'block', padding: '8px 16px', color: '#1e293b', textDecoration: 'none', fontSize: '0.9rem' }}
                        onClick={() => setShowAccountMenu(false)}
                      >
                        Your Orders
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setShowAccountMenu(false);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 16px',
                          background: 'none',
                          border: 'none',
                          borderTop: '1px solid #e2e8f0',
                          color: '#ef4444',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                        }}
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        style={{
                          display: 'block',
                          margin: '8px 16px',
                          padding: '8px',
                          textAlign: 'center',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                        }}
                        onClick={() => setShowAccountMenu(false)}
                      >
                        Sign In
                      </Link>
                      <div style={{ padding: '4px 16px', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                        New customer?{' '}
                        <Link href="/signup" style={{ color: '#2563eb', fontWeight: 600 }} onClick={() => setShowAccountMenu(false)}>
                          Start here
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Orders Link */}
            <Link href="/orders" className="nav-action-btn">
              <span className="action-icon">📦</span>
              <div className="action-text-group">
                <span className="action-label-small">Returns</span>
                <span className="action-label-bold">& Orders</span>
              </div>
            </Link>

            {/* Cart Button */}
            <Link href="/cart" className="cart-nav-btn">
              <div className="cart-icon-wrapper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <span className="cart-badge-counter">{itemCount}</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Cart</span>
            </Link>
          </div>
        </div>

        {/* Category Ribbon */}
        <nav className="sub-nav-ribbon">
          <div className="sub-nav-container">
            <button
              type="button"
              className={`category-nav-link ${selectedCategory === '' ? 'active' : ''}`}
              onClick={() => (onSelectCategory ? onSelectCategory('') : router.push('/'))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
            >
              All Departments
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`category-nav-link ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => (onSelectCategory ? onSelectCategory(cat.id) : router.push(`/?categoryId=${cat.id}`))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </nav>
      </header>
    </>
  );
};
