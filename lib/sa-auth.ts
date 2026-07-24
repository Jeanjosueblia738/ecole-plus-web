import Cookies from 'js-cookie';

const USER_KEY = 'sa_user';

const cookieOpts: Cookies.CookieAttributes = {
  expires: 7,
  sameSite: 'strict',
  secure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : true,
  path: '/',
};

export type SaUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  photoUrl?: string;
};

async function setHttpOnlySession(token: string, user: SaUser) {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'sa', token, user }),
  });
  if (!res.ok) {
    throw new Error(`Impossible de créer la session SA (${res.status})`);
  }
}

export const saAuth = {
  save: async (token: string, user: SaUser) => {
    await setHttpOnlySession(token, user);
    Cookies.set(USER_KEY, JSON.stringify(user), cookieOpts);
  },
  getToken: () => '',
  getUser: (): SaUser | null => {
    const u = Cookies.get(USER_KEY);
    if (!u) return null;
    try {
      return JSON.parse(u);
    } catch {
      return null;
    }
  },
  isLoggedIn: () => !!Cookies.get(USER_KEY),
  clear: async () => {
    await fetch('/api/auth/session?kind=sa', { method: 'DELETE' });
    Cookies.remove(USER_KEY, { path: '/' });
  },
  /** Le proxy injecte le JWT httpOnly — header inutile côté client */
  authHeader: () => ({ 'X-Auth-Scope': 'sa' }),
};
