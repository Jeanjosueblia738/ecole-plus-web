import Cookies from 'js-cookie';
import { AuthUser, AuthTenant } from './api';

const USER_KEY = 'ecole_user';
const TENANT_KEY = 'ecole_tenant';

const cookieOpts: Cookies.CookieAttributes = {
  expires: 7,
  sameSite: 'strict',
  secure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : true,
  path: '/',
};

async function setHttpOnlySession(
  token: string,
  user: AuthUser,
  tenant: AuthTenant,
) {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'ecole', token, user, tenant }),
  });
  if (!res.ok) {
    throw new Error(`Impossible de créer la session (${res.status})`);
  }
}

export const authStorage = {
  save: async (token: string, user: AuthUser, tenant: AuthTenant) => {
    await setHttpOnlySession(token, user, tenant);
    Cookies.set(USER_KEY, JSON.stringify(user), cookieOpts);
    Cookies.set(TENANT_KEY, JSON.stringify(tenant), cookieOpts);
  },
  getToken: () => null as string | null,
  getUser: (): AuthUser | null => {
    const u = Cookies.get(USER_KEY);
    return u ? JSON.parse(u) : null;
  },
  getTenant: (): AuthTenant | null => {
    const t = Cookies.get(TENANT_KEY);
    return t ? JSON.parse(t) : null;
  },
  isLoggedIn: () => !!Cookies.get(USER_KEY),
  clear: async () => {
    await fetch('/api/auth/session?kind=ecole', { method: 'DELETE' });
    Cookies.remove(USER_KEY, { path: '/' });
    Cookies.remove(TENANT_KEY, { path: '/' });
  },
};
