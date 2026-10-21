'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') || '/';

  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('customer@orderflow.dev');
  const [password, setPassword] = useState('Customer123!');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      await login(email, password);
      showToast('Welcome back to OrderFlow!', 'success');
      router.push(redirect);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password');
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}>
      <div className="auth-wrapper">
        <div className="auth-header">
          <div className="auth-logo-badge">⚡</div>
          <h2 className="auth-title">Sign in to OrderFlow</h2>
          <p className="auth-subtitle">Access your shopping cart, saved orders, and account settings.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label className="form-label">Password *</label>
              <button
                type="button"
                style={{ fontSize: '0.75rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {errorMsg && (
            <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
              {errorMsg}
            </div>
          )}

          <button type="submit" className="btn-auth-submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <span>New to OrderFlow? </span>
          <Link href={`/signup?redirect=${encodeURIComponent(redirect)}`} className="auth-link">
            Create your account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 0' }}>Loading sign in...</div>}>
      <LoginForm />
    </Suspense>
  );
}
