import { getSelectedYear } from './selected-year';

/** Année scolaire CIV calendaire : sept → août (ex: juil 2026 → 2025-2026). */
export function calendarSchoolYear(date: Date = new Date()): string {
  const y = date.getFullYear();
  const month = date.getMonth() + 1; // 1–12
  if (month >= 9) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

/**
 * Année scolaire active côté UI :
 * cookie sélectionné si présent, sinon calendrier CIV.
 */
export function currentSchoolYear(date: Date = new Date()): string {
  if (typeof window !== 'undefined') {
    return getSelectedYear();
  }
  return calendarSchoolYear(date);
}
