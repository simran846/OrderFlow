'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProductSummary } from '@/types';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

// Studio-Quality Product Photography Mapping
const PRODUCT_IMAGES: Record<string, string> = {
  'prod-macbook-pro': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
  'wireless-noise-canceling-headphones': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  'mechanical-gaming-keyboard': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
  'ultra-light-running-shoes': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
  'limited-edition-smart-watch': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
  default: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=800&q=80',
};

export function getProductImage(product: ProductSummary): string {
  if (product.image) return product.image;
  if (product.slug && PRODUCT_IMAGES[product.slug]) return PRODUCT_IMAGES[product.slug];
  if (product.id && PRODUCT_IMAGES[product.id]) return PRODUCT_IMAGES[product.id];

  const name = (product.name || '').toLowerCase();
  if (name.includes('macbook') || name.includes('laptop')) return PRODUCT_IMAGES['prod-macbook-pro'];
  if (name.includes('headphone') || name.includes('audio')) return PRODUCT_IMAGES['wireless-noise-canceling-headphones'];
  if (name.includes('keyboard')) return PRODUCT_IMAGES['mechanical-gaming-keyboard'];
  if (name.includes('shoe') || name.includes('running')) return PRODUCT_IMAGES['ultra-light-running-shoes'];
  if (name.includes('watch')) return PRODUCT_IMAGES['limited-edition-smart-watch'];

  return PRODUCT_IMAGES.default;
}

export const ProductCard: React.FC<{ product: ProductSummary }> = ({ product }) => {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);

  const availableStock = product.inventory?.availableStock ?? 10;
  const isOutOfStock = availableStock <= 0;
  const isLowStock = availableStock > 0 && availableStock <= 5;
  const formattedPrice = Number(product.price).toFixed(2);
  const imageUrl = getProductImage(product);

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOutOfStock || adding) return;

    setAdding(true);
    try {
      await addToCart(product, 1);
      showToast(`Added ${product.name} to cart!`, 'success');
    } catch {
      showToast('Could not add item to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="product-card">
      <Link href={`/product/${product.id}`} className="product-card-link">
        <div className="product-image-container">
          <img
            src={imageUrl}
            alt={product.name}
            className="product-image"
            loading="lazy"
          />
          {product.category?.name && (
            <span className="product-category-pill">{product.category.name}</span>
          )}
        </div>

        <div className="product-details">
          <div className="product-rating">
            <span className="stars">★★★★★</span>
            <span className="rating-count">(4.9 • Verified)</span>
          </div>

          <h3 className="product-title">{product.name}</h3>
          <p className="product-desc">{product.description}</p>

          <div className="product-price-row">
            <div className="price-tag">
              <span className="currency">$</span>
              <span className="amount">{formattedPrice}</span>
            </div>
            {isOutOfStock ? (
              <span className="stock-pill out-of-stock">Out of Stock</span>
            ) : isLowStock ? (
              <span className="stock-pill low-stock">Only {availableStock} left!</span>
            ) : (
              <span className="stock-pill in-stock">In Stock</span>
            )}
          </div>
        </div>
      </Link>

      <div style={{ padding: '0 16px 16px' }}>
        <button
          className="btn-add-cart"
          onClick={handleAdd}
          disabled={isOutOfStock || adding}
          style={{ width: '100%', opacity: isOutOfStock ? 0.6 : 1 }}
        >
          {adding ? 'Adding...' : isOutOfStock ? 'Sold Out' : '⚡ Add to Cart'}
        </button>
      </div>
    </div>
  );
};
