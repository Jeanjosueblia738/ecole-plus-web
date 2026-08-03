import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/inscription',
  '/onboarding',
  '/abonnement',
  '/super-admin/login',
];

/** Toute page app authentifiée (token JWT httpOnly requis). */
const AUTH_PREFIXES = [
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
  '/parametres',
  '/parent',
  '/personnel',
  '/annees',
  '/sms',
  '/mes-heures',
  '/autorisations-absence',
];

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

  const needsAuth = AUTH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (needsAuth) {
    const token = request.cookies.get('ecole_token')?.value;
    if (!token) {
      const login = new URL('/login', request.url);
      login.searchParams.set('next', pathname);
      return NextResponse.redirect(login);
    }
    // Ne pas faire confiance au cookie ecole_user (forgeable) pour le RBAC edge :
    // le filtrage par rôle reste côté pages + API JWT.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
