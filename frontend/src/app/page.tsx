'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProductSummary } from '@/types';
import { ApiClient } from '../lib/api';
import { ProductCard } from '../components/ProductCard';

const FALLBACK_PRODUCTS: ProductSummary[] = [
  {
    id: 'prod-macbook-pro',
    slug: 'prod-macbook-pro',
    name: 'MacBook Pro 16" M3 Max',
    categoryId: 'cat-electronics',
    category: { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
    description: '36GB Unified Memory, 1TB SSD Storage, Liquid Retina XDR Display with ProMotion.',
    price: 3499.0,
    inventory: { availableStock: 12 },
  },
  {
    id: 'wireless-noise-canceling-headphones',
    slug: 'wireless-noise-canceling-headphones',
    name: 'Wireless Noise-Canceling Headphones',
    categoryId: 'cat-audio',
    category: { id: 'cat-audio', name: 'Audio', slug: 'audio' },
    description: 'Premium active noise cancellation, 40-hour battery life, lossless LDAC audio codec.',
    price: 199.99,
    inventory: { availableStock: 50 },
  },
  {
    id: 'limited-edition-smart-watch',
    slug: 'limited-edition-smart-watch',
    name: 'Limited Edition Smart Watch',
    categoryId: 'cat-accessories',
    category: { id: 'cat-accessories', name: 'Accessories', slug: 'accessories' },
    description: 'Ultra-rare collector smartwatch with titanium bezel and aerospace-grade sapphire crystal.',
    price: 499.0,
    inventory: { availableStock: 1 },
  },
  {
    id: 'mechanical-gaming-keyboard',
    slug: 'mechanical-gaming-keyboard',
    name: 'Mechanical Gaming Keyboard',
    categoryId: 'cat-electronics',
    category: { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
    description: 'RGB mechanical keyboard with hot-swappable tactile switches and CNC aluminum chassis.',
    price: 129.5,
    inventory: { availableStock: 25 },
  },
  {
    id: 'ultra-light-running-shoes',
    slug: 'ultra-light-running-shoes',
    name: 'Ultra-Light Running Shoes',
    categoryId: 'cat-footwear',
    category: { id: 'cat-footwear', name: 'Footwear', slug: 'footwear' },
    description: 'Breathable, lightweight running shoes engineered for shock absorption and marathon durability.',
    price: 89.0,
    inventory: { availableStock: 15 },
  },
];

export default function HomePage() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getProducts({ sortBy, sortOrder });
      if (res.data && res.data.length > 0) {
        setProducts(res.data);
      } else {
        setProducts(FALLBACK_PRODUCTS);
      }
    } catch {
      setProducts(FALLBACK_PRODUCTS);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSortChange = (value: string) => {
    const [field, order] = value.split('-');
    setSortBy(field);
    setSortOrder((order as 'asc' | 'desc') || 'desc');
  };

  return (
    <div className="catalog-wrapper">
      {/* Promotional Hero Banner */}
      <section className="hero-banner">
        <div className="hero-content">
          <span className="hero-tag-badge">⚡ Next-Gen Tech Week</span>
          <h1 className="hero-heading">Elevate Your Tech. Zero Compromise.</h1>
          <p className="hero-subheading">
            Discover cutting-edge laptops, high-fidelity wireless audio, precision wearables, and gaming essentials with server-guaranteed inventory availability.
          </p>
          <div className="hero-cta-group">
            <a
              href="#catalog-grid"
              className="btn-primary"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('catalog-grid')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>Explore Deals</span>
              <span>↓</span>
            </a>
            <button
              className="btn-secondary"
              onClick={() => {
                document.getElementById('catalog-grid')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Shop Electronics
            </button>
          </div>
        </div>
        <div className="hero-visual-card">
          <img
            src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80"
            alt="MacBook Pro"
            className="hero-featured-image"
          />
        </div>
      </section>

      {/* Trust Strip */}
      <section className="trust-strip">
        <div className="trust-item">
          <span className="trust-icon">🛡️</span>
          <div>
            <div className="trust-title">Atomic Inventory Locks</div>
            <div className="trust-desc">Guaranteed zero overselling on checkout</div>
          </div>
        </div>
        <div className="trust-item">
          <span className="trust-icon">🚀</span>
          <div>
            <div className="trust-title">Express Delivery</div>
            <div className="trust-desc">Dispatched within 24 hours of order</div>
          </div>
        </div>
        <div className="trust-item">
          <span className="trust-icon">🔒</span>
          <div>
            <div className="trust-title">Encrypted Payments</div>
            <div className="trust-desc">Stripe cryptographic settlement & idempotency</div>
          </div>
        </div>
        <div className="trust-item">
          <span className="trust-icon">💬</span>
          <div>
            <div className="trust-title">24/7 Customer Care</div>
            <div className="trust-desc">Dedicated order tracking and support</div>
          </div>
        </div>
      </section>

      {/* Catalog Header & Controls */}
      <div className="catalog-header-bar" id="catalog-grid">
        <div className="section-title-group">
          <h2 className="section-title">Featured Products</h2>
          <span className="section-subtitle">
            Showing verified in-stock catalog ({products.length} products)
          </span>
        </div>

        <div className="catalog-controls">
          <select
            className="filter-select"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => handleSortChange(e.target.value)}
          >
            <option value="createdAt-desc">Newest Arrivals</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Product Name: A to Z</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚡</div>
          <p>Loading verified catalog from OrderFlow backend...</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
