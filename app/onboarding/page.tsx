'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Ancien doublon SA — redirige vers /super-admin */
export default function OnboardingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/super-admin');
  }, [router]);
  return null;
}
