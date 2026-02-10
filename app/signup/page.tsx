// app/signup/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '../../lib/firebase';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(email, password);
      if (result.success) {
        router.push('/');
      } else {
        setError(result.error || 'Failed to sign up');
      }
    } catch (err: any) {
      setError(err.message);
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

        .auth-card {
          animation: slideInUp 0.6s ease-out;
        }

        input:focus {
          outline: none !important;
        }
      `}</style>

      {/* Main Card */}
      <div className="auth-card" style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '20px', boxShadow: '0 20px 100px rgba(0, 0, 0, 0.1)', padding: '3rem', maxWidth: '420px', width: '100%', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.5)' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍲</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1a202c', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>Samosa Man</h1>
          <p style={{ fontSize: '0.9rem', color: '#718096', margin: '0', fontWeight: '500' }}>Create your account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #ff8c8c 100%)', color: 'white', padding: '0.875rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: '500', animation: 'slideInUp 0.3s ease-out' }}>
            ❌ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

          {/* Password Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#2d3748', marginBottom: '0.5rem', letterSpacing: '0.3px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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

          {/* Confirm Password Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#2d3748', marginBottom: '0.5rem', letterSpacing: '0.3px' }}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
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
            {loading ? '⏳ Creating Account...' : '✅ Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.75rem 0', opacity: 0.5 }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
          <span style={{ fontSize: '0.85rem', color: '#718096', fontWeight: '500' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }} />
        </div>

        {/* Sign In Link */}
        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#4a5568', margin: '0' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#ff9f43', fontWeight: '700', textDecoration: 'none', borderBottom: '2px solid transparent', transition: 'all 0.2s ease', paddingBottom: '2px' }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#ff9f43')} onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}