'use client';

import { useAuth } from '../context/authcontext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = pathname === '/login' || pathname === '/signup' || pathname === '/forgotpassword';

    // NOT logged in — allow auth routes, redirect everything else to /login
    if (!user) {
      if (!isAuthRoute) {
        router.push('/login');
      }
      return;
    }

    // Logged in — redirect away from auth routes
    if (isAuthRoute) {
      router.push(role === 'employee' ? '/employee' : '/');
      return;
    }

    // Role-based route enforcement
    if (role === 'employee' && pathname === '/') {
      router.push('/employee');
      return;
    }

    if (role === 'admin' && pathname === '/employee') {
      router.push('/');
      return;
    }
  }, [user, loading, router, pathname, role]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #fff8f0 0%, #ffe8d6 50%, #ffeaa7 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'pulse 1.5s ease-in-out infinite' }}>🍲</div>
          <p style={{ color: '#718096', fontWeight: '500', fontSize: '1rem' }}>Loading...</p>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}
