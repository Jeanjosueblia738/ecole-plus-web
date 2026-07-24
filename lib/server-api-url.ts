/** Résout l’URL API côté serveur. Pas de fallback Railway silencieux. */
export function getServerApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000/api/v1';
  }
  throw new Error('NEXT_PUBLIC_API_URL manquant — requis en production');
}
