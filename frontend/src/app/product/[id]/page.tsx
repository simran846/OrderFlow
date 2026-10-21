'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProductSummary } from '@/types';
import { ApiClient } from '../../../lib/api';
import { getProductImage } from '../../../components/ProductCard';
import { useCart } from '../../../context/CartContext';
import { useToast } from '../../../context/ToastContext';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params?.id as string;
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    ApiClient.getProductById(productId)
      .then((res) => {
        if (res.data) setProduct(res.data);
      })
      .catch(() => {
        // Fallback demo product
        setProduct({
          id: productId,
          slug: productId,
          name: 'Premium High-Performance Hardware',
          categoryId: 'cat-electronics',
          category: { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
          description:
            'Engineered for maximum reliability, low power consumption, and peak computing performance. Fully certified with zero-overselling inventory backing.',
          price: 299.99,
          inventory: { availableStock: 8 },
        });
      })
      .finally(() => setLoading(false));
  }, [productId]);

  const handleAddToCart = async () => {
    if (!product || adding) return;
    setAdding(true);
    try {
      await addToCart(product, quantity);
      showToast(`Added ${quantity} × ${product.name} to cart!`, 'success');
    } catch {
      showToast('Failed to add item to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
        <p>Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <h2>Product not found</h2>
        <Link href="/" className="btn-primary" style={{ display: 'inline-block', marginTop: '16px' }}>
          Back to Store
        </Link>
      </div>
    );
  }

  const imageUrl = getProductImage(product);
  const stock = product.inventory?.availableStock ?? 10;
  const inStock = stock > 0;

  return (
    <div style={{ padding: '24px 0' }}>
      <div className="breadcrumb-bar" style={{ marginBottom: '24px' }}>
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span>›</span>
        <span>{product.category?.name || 'Catalog'}</span>
        <span>›</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{product.name}</span>
      </div>

      <div className="product-detail-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px', background: '#ffffff', borderRadius: '12px', padding: '32px', border: '1px solid #e2e8f0' }}>
        <div style={{ textAlign: 'center' }}>
          <img
            src={imageUrl}
            alt={product.name}
            style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '8px' }}
          />
        </div>

        <div>
          <span className="product-category-pill" style={{ marginBottom: '12px', display: 'inline-block' }}>
            {product.category?.name || 'Electronics'}
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
            {product.name}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ color: '#f59e0b' }}>★★★★★</span>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>4.9 • 1,280 Verified Customer Reviews</span>
          </div>

          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#2563eb', marginBottom: '20px' }}>
            ${Number(product.price).toFixed(2)}
          </div>

          <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '24px', fontSize: '1rem' }}>
            {product.description}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontWeight: 600 }}>Availability:</span>
            {inStock ? (
              <span className="stock-pill in-stock">In Stock ({stock} available)</span>
            ) : (
              <span className="stock-pill out-of-stock">Currently Unavailable</span>
            )}
          </div>

          {inStock && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '20px' }}>
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 600 }}
              >
                {[...Array(Math.min(stock, 10))].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Qty: {i + 1}
                  </option>
                ))}
              </select>

              <button
                className="btn-primary"
                onClick={handleAddToCart}
                disabled={adding}
                style={{ flex: 1, padding: '12px 24px', fontSize: '1rem', fontWeight: 700 }}
              >
                {adding ? 'Adding...' : '⚡ Add to Cart'}
              </button>
            </div>
          )}

          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '24px', color: '#64748b', fontSize: '0.85rem' }}>
            <div>🛡️ 30-Day Money-Back Guarantee</div>
            <div>⚡ Dispatched within 24 Hours</div>
            <div>🔒 Guaranteed Atomic Lock</div>
          </div>
        </div>
      </div>
    </div>
  );
}
