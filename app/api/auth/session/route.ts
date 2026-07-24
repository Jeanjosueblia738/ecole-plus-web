import { NextRequest, NextResponse } from 'next/server';
import { getServerApiUrl } from '@/lib/server-api-url';

const cookieBase = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
};

async function validateToken(
  kind: 'ecole' | 'sa',
  token: string,
): Promise<{ ok: true; profile: Record<string, unknown> } | { ok: false; status: number; message: string }> {
  let apiUrl: string;
  try {
    apiUrl = getServerApiUrl();
  } catch (e: any) {
    return {
      ok: false,
      status: 500,
      message: e?.message || 'NEXT_PUBLIC_API_URL manquant',
    };
  }

  const path = kind === 'sa' ? '/auth/super-admin/me' : '/users/me';
  try {
    const upstream = await fetch(`${apiUrl}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!upstream.ok) {
      return {
        ok: false,
        status: upstream.status === 401 || upstream.status === 403 ? 401 : 502,
        message: 'Token invalide ou expiré',
      };
    }
    const profile = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: true, profile };
  } catch {
    return { ok: false, status: 502, message: 'Impossible de valider le token auprès de l’API' };
  }
}

/** POSTe { kind: 'ecole'|'sa', token, user?, tenant? } — cookie JWT httpOnly après validation API */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.token || !body?.kind) {
    return NextResponse.json({ message: 'token et kind requis' }, { status: 400 });
  }
  if (body.kind !== 'ecole' && body.kind !== 'sa') {
    return NextResponse.json({ message: 'kind invalide' }, { status: 400 });
  }

  const validation = await validateToken(body.kind, body.token);
  if (!validation.ok) {
    return NextResponse.json(
      { message: validation.message },
      { status: validation.status },
    );
  }

  const res = NextResponse.json({ ok: true });
  if (body.kind === 'sa') {
    res.cookies.set('sa_token', body.token, cookieBase);
    const user = body.user || validation.profile;
    if (user) {
      res.cookies.set('sa_user', JSON.stringify(user), {
        ...cookieBase,
        httpOnly: false,
      });
    }
  } else {
    res.cookies.set('ecole_token', body.token, cookieBase);
    const user = body.user || validation.profile;
    if (user) {
      res.cookies.set('ecole_user', JSON.stringify(user), {
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
