'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') || '/';

  const { register } = useAuth();
  const { showToast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await register({ firstName, lastName, email, password });
      showToast('Account created successfully!', 'success');
      router.push(redirect);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}>
      <div className="auth-wrapper">
        <div className="auth-header">
          <div className="auth-logo-badge">⚡</div>
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Join OrderFlow for instant checkout and personalized orders.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-input"
              placeholder="customer@orderflow.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Password *</label>
            <input
              type="password"
              className="form-input"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Must contain 8+ characters, including uppercase and a number.
            </span>
          </div>

          {errorMsg && (
            <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
              {errorMsg}
            </div>
          )}

          <button type="submit" className="btn-auth-submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Customer Account'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account? </span>
          <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="auth-link">
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px 0' }}>Loading registration...</div>}>
      <SignupForm />
    </Suspense>
  );
}
