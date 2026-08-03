'use client';

import { useEffect, useRef } from 'react';
import { authStorage } from '@/lib/auth';
import { tenantsApi } from '@/lib/api';

/**
 * Rafraîchit le branding tenant une fois par chargement d'app
 * (cookie session peut être obsolète après édition owner).
 */
export default function TenantBrandingBoot() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    if (typeof window === 'undefined') return;
    if (!authStorage.isLoggedIn()) return;

    const key = 'ecole_brand_refresh';
    const last = sessionStorage.getItem(key);
    const now = Date.now();
    // Au plus une fois par onglet / 5 min
    if (last && now - Number(last) < 5 * 60 * 1000) return;
    ran.current = true;
    sessionStorage.setItem(key, String(now));

    tenantsApi
      .getMe()
      .then(({ data }) => {
        if (data?.id) authStorage.setTenant(data);
      })
      .catch(() => {
        /* garder cookie ; 401 géré par l’interceptor api */
      });
  }, []);

  return null;
}
