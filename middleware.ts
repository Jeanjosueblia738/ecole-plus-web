import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canAccessPath } from '@/lib/rbac';

const PUBLIC_PATHS = ['/', '/login', '/inscription', '/onboarding', '/super-admin/login'];

const STAFF_PREFIXES = [
  '/dashboard',
  '/eleves',
  '/classes',
  '/notes',
  '/presences',
  '/discipline',
  '/campus',
  '/comptabilite',
  '/finance',
  '/bulletins',
  '/rapports',
  '/risques',
  '/cahier',
  '/devoirs',
  '/conseil',
  '/examens',
  '/inscriptions',
  '/messagerie',
  '/emploi-du-temps',
  '/enseignants',
  '/matieres',
  '/utilisateurs',
  '/abonnement',
  '/parametres',
  '/parent',
];

function readCookieUser(request: NextRequest): { role?: string } | null {
  const raw = request.cookies.get('ecole_user')?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/super-admin')) {
    if (pathname === '/super-admin/login') {
      return NextResponse.next();
    }
    const saToken = request.cookies.get('sa_token')?.value;
    if (!saToken) {
      const login = new URL('/super-admin/login', request.url);
      login.searchParams.set('next', pathname);
      return NextResponse.redirect(login);
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

    const user = readCookieUser(request);
    const role = user?.role;
    if (role && !canAccessPath(role, pathname)) {
      const dest =
        String(role).toUpperCase() === 'PARENT' ? '/parent' : '/dashboard';
      // Évite une boucle si déjà sur la destination
      if (pathname !== dest && !pathname.startsWith(`${dest}/`)) {
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
