import Cookies from 'js-cookie';

const COOKIE = 'ecole_selected_year';

function calendarFallback(date: Date = new Date()): string {
  const y = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= 9) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

export function hasSelectedYearCookie(): boolean {
  if (typeof window === 'undefined') return false;
  const selected = Cookies.get(COOKIE);
  return !!(selected && /^\d{4}-\d{4}$/.test(selected));
}

export function getSelectedYear(): string {
  if (typeof window === 'undefined') return calendarFallback();
  const selected = Cookies.get(COOKIE);
  if (selected && /^\d{4}-\d{4}$/.test(selected)) return selected;
  return calendarFallback();
}

export function setSelectedYear(label: string) {
  if (!/^\d{4}-\d{4}$/.test(label)) return;
  Cookies.set(COOKIE, label, { expires: 365, path: '/' });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ecole-year-changed', { detail: label }));
  }
}

export function clearSelectedYear() {
  Cookies.remove(COOKIE, { path: '/' });
}
