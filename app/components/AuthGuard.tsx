'use client';

import { useAuth } from '../context/authcontext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = pathname === '/login' || pathname === '/signup' || pathname === '/forgotpassword';

    // NOT logged in
    if (!user && !isAuthRoute) {
      router.push('/login');
      return;
    }

    // Logged in
    if (user && isAuthRoute) {
      router.push('/');
      return;
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Only render children if authenticated (or if on an auth route and unauthenticated)
  return <>{children}</>;
}
