// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth , onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase';

const auth = getAuth(app);

export async function middleware(request: NextRequest) {
  const user = await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });

  const protectedRoutes = ['/'];
  const authRoutes = ['/login', '/signup', '/forgot-password'];

  const path = request.nextUrl.pathname;

  if (!user && protectedRoutes.some(route => path.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && authRoutes.some(route => path.startsWith(route))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|signup|forgot-password).*)'],
};
