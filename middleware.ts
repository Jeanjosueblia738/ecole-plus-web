import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/super-admin/login'];

const STAFF_PREFIXES = [
  '/dashboard',
  '/eleves',
  '/classes',
  '/notes',
  '/presences',
  '/finance',
  '/bulletins',
  '/rapports',
  '/risques',
  '/cahier',
  '/messagerie',
  '/emploi-du-temps',
  '/enseignants',
  '/utilisateurs',
  '/abonnement',
  '/parametres',
  '/onboarding',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/super-admin')) {
    if (pathname === '/super-admin/login') {
      return NextResponse.next();
    }
    const saToken = request.cookies.get('sa_token')?.value;
    if (!saToken) {
      return NextResponse.redirect(new URL('/super-admin/login', request.url));
    }
    return NextResponse.next();
  }

  const isStaffRoute = STAFF_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isStaffRoute) {
    const token = request.cookies.get('ecole_token')?.value;
    if (!token) {
      const login = new URL('/login', request.url);
      login.searchParams.set('next', pathname);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
