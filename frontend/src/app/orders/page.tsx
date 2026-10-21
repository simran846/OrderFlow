'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../lib/api';
import { OrderSummary } from '@/types';

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/orders');
      return;
    }

    ApiClient.getOrders()
      .then((res) => {
        if (res.data) setOrders(res.data);
      })
      .catch(() => {
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, authLoading, router]);

  return (
    <div style={{ padding: '24px 0' }}>
      <div className="breadcrumb-bar" style={{ marginBottom: '24px' }}>
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span>›</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>My Orders</span>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2 className="section-title">Your Order History</h2>
        <p className="section-subtitle">View past transactions, tracking status, and line item details.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <p>Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '48px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>No orders found</h3>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>
            You haven&apos;t placed any orders yet. Explore our verified tech deals to get started!
          </p>
          <Link href="/" className="btn-primary" style={{ display: 'inline-block' }}>
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="orders-container">
          {orders.map((order) => {
            const formattedTotal = Number(order.totalAmount || 0).toFixed(2);
            const dateStr = new Date(order.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div key={order.id} className="order-history-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>ORDER NUMBER</span>
                    <div style={{ fontWeight: 800, fontFamily: 'monospace' }}>{order.orderNumber}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>DATE PLACED</span>
                    <div style={{ fontWeight: 600 }}>{dateStr}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>TOTAL AMOUNT</span>
                    <div style={{ fontWeight: 800, color: '#2563eb' }}>${formattedTotal}</div>
                  </div>
                  <div>
                    <span className={`order-status-badge ${order.status}`}>{order.status}</span>
                  </div>
                </div>

                {order.items && order.items.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    {order.items.map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #f1f5f9' }}>
                        <span>{item.quantity} × {item.productName}</span>
                        <span style={{ fontWeight: 600 }}>${Number(item.subtotal || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '16px', textAlign: 'right' }}>
                  <Link href={`/orders/${order.id}`} className="btn-view-details" style={{ textDecoration: 'none', display: 'inline-block' }}>
                    View Invoice Details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
