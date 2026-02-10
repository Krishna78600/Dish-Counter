// app/forgot-password/page.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '../../lib/firebase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = await forgotPassword(email);
      if (result.success) {
        setMessage('✅ Password reset email sent! Check your inbox and follow the instructions.');
        setSubmitted(true);
        setEmail('');
      } else {
        setError(result.error || 'Failed to send password reset email');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #fff8f0 0%, #ffe8d6 50%, #ffeaa7 100%)', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', padding: '1rem' }}>
      {/* Animated background elements */}
      <div style={{ position: 'fixed', top: '-40%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(255, 107, 107, 0.08)', animation: 'float 20s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-30%', left: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255, 165, 0, 0.1)', animation: 'float 25s ease-in-out infinite reverse', pointerEvents: 'none' }} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(30px); }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .auth-card {
          animation: slideInUp 0.6s ease-out;
        }

        .pulse-animation {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        input:focus {
          outline: none !important;
        }
      `}</style>

      {/* Main Card */}
      <div className="auth-card" style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '20px', boxShadow: '0 20px 100px rgba(0, 0, 0, 0.1)', padding: '3rem', maxWidth: '420px', width: '100%', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.5)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔑</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1a202c', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>Reset Password</h1>
          <p style={{ fontSize: '0.9rem', color: '#718096', margin: '0', fontWeight: '500' }}>No worries, we'll help you out</p>
        </div>

        {/* Success Message */}
        {submitted && message && (
          <div style={{ background: 'linear-gradient(135deg, #52b788 0%, #2d6a4f 100%)', color: 'white', padding: '1.25rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: '500', animation: 'slideInUp 0.3s ease-out', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <div style={{ marginBottom: '0.75rem' }}>✅ Email Sent Successfully!</div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', lineHeight: '1.4', opacity: 0.9 }}>Check your email inbox (and spam folder) for a password reset link. The link will expire in 24 hours.</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #ff8c8c 100%)', color: 'white', padding: '0.875rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: '500', animation: 'slideInUp 0.3s ease-out' }}>
            ❌ {error}
          </div>
        )}

        {/* Form */}
        {!submitted ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Info Box */}
            <div style={{ background: 'rgba(255, 159, 67, 0.08)', border: '1px solid rgba(255, 159, 67, 0.2)', borderRadius: '12px', padding: '1rem', fontSize: '0.85rem', color: '#4a5568', lineHeight: '1.5' }}>
              📧 Enter your email address and we'll send you a link to reset your password.
            </div>

            {/* Email Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#2d3748', marginBottom: '0.5rem', letterSpacing: '0.3px' }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  backgroundColor: '#f7fafc',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#ff9f43';
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 159, 67, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#f7fafc';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.875rem 1.5rem',
                background: loading ? '#cbd5e0' : 'linear-gradient(135deg, #ff9f43 0%, #ee5a2f 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                letterSpacing: '0.5px',
                marginTop: '0.5rem',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(255, 159, 67, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {loading ? '⏳ Sending Email...' : '📧 Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
            <div className="pulse-animation" style={{ fontSize: '3rem' }}>✉️</div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1a202c', margin: '0 0 0.5rem 0' }}>Check Your Email</h2>
              <p style={{ fontSize: '0.9rem', color: '#718096', margin: '0', lineHeight: '1.5' }}>We've sent password reset instructions to <strong style={{ color: '#2d3748' }}>{email}</strong></p>
            </div>

            <button
              onClick={() => {
                setSubmitted(false);
                setMessage('');
                setEmail('');
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                color: '#ff9f43',
                border: '2px solid #ff9f43',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ff9f43';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#ff9f43';
              }}
            >
              🔄 Try Another Email
            </button>
          </div>
        )}

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.75rem 0', opacity: 0.5 }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
          <span style={{ fontSize: '0.85rem', color: '#718096', fontWeight: '500' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
        </div>

        {/* Back to Login Link */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', fontSize: '0.9rem', color: '#4a5568' }}>
          <span>Remember your password?</span>
          <Link href="/login" style={{ color: '#ff9f43', fontWeight: '700', textDecoration: 'none', borderBottom: '2px solid transparent', transition: 'all 0.2s ease' }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#ff9f43')} onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}