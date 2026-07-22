/** Matières courantes collège / lycée CI — multi-assignation enseignants. */
export const SCHOOL_SUBJECTS = [
  'Mathématiques',
  'Français',
  'Anglais',
  'SVT',
  'Physique-Chimie',
  'Histoire-Géographie',
  'Philosophie',
  'EDHC',
  'EPS',
  'Arts',
  'Allemand',
  'Espagnol',
  'Économie',
  'Comptabilité',
  'Informatique',
] as const;

export type SchoolSubject = (typeof SCHOOL_SUBJECTS)[number] | string;

/** Normalise une liste de matières (trim, dédoublonne, ignore vides). */
export function normalizeSubjects(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    const v = String(s || '').trim();
    if (!v) continue;
    const key = v.toLocaleLowerCase('fr');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}
