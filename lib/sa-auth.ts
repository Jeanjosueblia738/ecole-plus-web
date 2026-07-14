import Cookies from 'js-cookie';

const TOKEN_KEY = 'sa_token';
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

export const saAuth = {
  save: (token: string, user: SaUser) => {
    Cookies.set(TOKEN_KEY, token, cookieOpts);
    Cookies.set(USER_KEY, JSON.stringify(user), cookieOpts);
  },
  getToken: () => Cookies.get(TOKEN_KEY) ?? '',
  getUser: (): SaUser | null => {
    const u = Cookies.get(USER_KEY);
    return u ? JSON.parse(u) : null;
  },
  isLoggedIn: () => !!Cookies.get(TOKEN_KEY),
  clear: () => {
    Cookies.remove(TOKEN_KEY, { path: '/' });
    Cookies.remove(USER_KEY, { path: '/' });
  },
  authHeader: () => ({
    Authorization: `Bearer ${Cookies.get(TOKEN_KEY) ?? ''}`,
  }),
};
