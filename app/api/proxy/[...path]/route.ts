import { NextRequest, NextResponse } from 'next/server';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://ecole-plus-api-production.up.railway.app/api/v1';

type Ctx = { params: Promise<{ path: string[] }> };

async function forward(req: NextRequest, path: string[], method: string) {
  const joined = path.join('/');
  const url = new URL(`${API_URL}/${joined}`);
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const isSa =
    joined.startsWith('tenants') ||
    joined.startsWith('auth/super-admin') ||
    req.headers.get('x-auth-scope') === 'sa';

  const token = isSa
    ? req.cookies.get('sa_token')?.value
    : req.cookies.get('ecole_token')?.value;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const init: RequestInit = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    const body = await req.text();
    if (body) init.body = body;
  }

  const upstream = await fetch(url.toString(), init);
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
    },
  });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path, 'GET');
}
export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path, 'POST');
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path, 'PUT');
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path, 'PATCH');
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path, 'DELETE');
}
