import Cookies from 'js-cookie';
import { AuthUser, AuthTenant } from './api';

const TOKEN_KEY = 'ecole_token';
const USER_KEY = 'ecole_user';
const TENANT_KEY = 'ecole_tenant';

export const authStorage = {
  save: (token: string, user: AuthUser, tenant: AuthTenant) => {
    Cookies.set(TOKEN_KEY, token, { expires: 7 });
    Cookies.set(USER_KEY, JSON.stringify(user), { expires: 7 });
    Cookies.set(TENANT_KEY, JSON.stringify(tenant), { expires: 7 });
  },
  getToken: () => Cookies.get(TOKEN_KEY),
  getUser: (): AuthUser | null => {
    const u = Cookies.get(USER_KEY);
    return u ? JSON.parse(u) : null;
  },
  getTenant: (): AuthTenant | null => {
    const t = Cookies.get(TENANT_KEY);
    return t ? JSON.parse(t) : null;
  },
  isLoggedIn: () => !!Cookies.get(TOKEN_KEY),
  clear: () => {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(USER_KEY);
    Cookies.remove(TENANT_KEY);
  },
};