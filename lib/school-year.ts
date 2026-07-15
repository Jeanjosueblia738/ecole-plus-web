/** Année scolaire CIV : sept → août (ex: juil 2026 → 2025-2026). */
export function currentSchoolYear(date: Date = new Date()): string {
  const y = date.getFullYear();
  const month = date.getMonth() + 1; // 1–12
  if (month >= 9) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}
