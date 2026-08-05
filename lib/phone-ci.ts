/**
 * Normalise un numéro ivoirien vers +225XXXXXXXXXX (10 chiffres nationaux).
 * Accepte : 07…, 22507…, +22507…, 00 225 07…
 */
export function normalizeCiPhone(raw: string): string | null {
  let d = (raw || '').replace(/[\s.\-()]/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = `+${d.slice(2)}`;
  if (d.startsWith('225') && !d.startsWith('+')) d = `+${d}`;
  // Local 10 chiffres (01/05/07…)
  if (/^0\d{9}$/.test(d)) d = `+225${d}`;
  // 10 chiffres déjà sans indicatif
  if (/^\d{10}$/.test(d) && d.startsWith('0')) d = `+225${d}`;
  if (!/^\+225\d{10}$/.test(d)) return null;
  return d;
}

export function isValidCiPhone(raw: string): boolean {
  return normalizeCiPhone(raw) !== null;
}
