import { NextRequest, NextResponse } from 'next/server';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://ecole-plus-api-production.up.railway.app/api/v1';

const cookieBase = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
};

/** POSTe { kind: 'ecole'|'sa', token, user?, tenant? } — cookie JWT httpOnly */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.token || !body?.kind) {
    return NextResponse.json({ message: 'token et kind requis' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  if (body.kind === 'sa') {
    res.cookies.set('sa_token', body.token, cookieBase);
    if (body.user) {
      res.cookies.set('sa_user', JSON.stringify(body.user), {
        ...cookieBase,
        httpOnly: false,
      });
    }
  } else {
    res.cookies.set('ecole_token', body.token, cookieBase);
    if (body.user) {
      res.cookies.set('ecole_user', JSON.stringify(body.user), {
        ...cookieBase,
        httpOnly: false,
      });
    }
    if (body.tenant) {
      res.cookies.set('ecole_tenant', JSON.stringify(body.tenant), {
        ...cookieBase,
        httpOnly: false,
      });
    }
  }
  return res;
}

export async function DELETE(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get('kind') || 'ecole';
  const res = NextResponse.json({ ok: true });
  if (kind === 'sa') {
    res.cookies.set('sa_token', '', { ...cookieBase, maxAge: 0 });
    res.cookies.set('sa_user', '', { ...cookieBase, httpOnly: false, maxAge: 0 });
  } else {
    res.cookies.set('ecole_token', '', { ...cookieBase, maxAge: 0 });
    res.cookies.set('ecole_user', '', { ...cookieBase, httpOnly: false, maxAge: 0 });
    res.cookies.set('ecole_tenant', '', { ...cookieBase, httpOnly: false, maxAge: 0 });
  }
  return res;
}
