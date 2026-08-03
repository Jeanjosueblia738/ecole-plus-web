'use client';

import { useEffect, useState } from 'react';
import { Bell, User } from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { academicYearsApi } from '@/lib/api';
import {
  getSelectedYear,
  setSelectedYear,
  hasSelectedYearCookie,
} from '@/lib/selected-year';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  FOUNDER: 'Fondateur',
  DIRECTOR: 'Directeur',
  CENSOR: 'Censeur',
  SURVEILLANT: 'Surveillant',
  EDUCATOR: 'Éducateur',
  SECRETARY: 'Secrétaire',
  ACCOUNTANT: 'Comptable',
  CASHIER: 'Caissier',
  TEACHER: 'Enseignant',
  RH: 'Ressources humaines',
};

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const user = authStorage.getUser();
  const roleLabel = user?.role
    ? ROLE_LABELS[user.role] || user.role
    : '';
  const [years, setYears] = useState<{ id: string; label: string; status: string; isCurrent: boolean }[]>([]);
  const [selected, setSelected] = useState(getSelectedYear());

  useEffect(() => {
    const role = String(user?.role || '').toUpperCase();
    if (!role || role === 'PARENT' || role === 'STUDENT') return;

    let cancelled = false;

    (async () => {
      try {
        const [currentRes, allRes] = await Promise.all([
          academicYearsApi.getCurrent(),
          academicYearsApi.getAll(),
        ]);
        if (cancelled) return;

        const list = Array.isArray(allRes.data) ? allRes.data : [];
        setYears(list);

        const serverCurrent =
          (currentRes.data?.label as string | undefined) ||
          list.find((y: any) => y.isCurrent)?.label;

        const cookieSet = hasSelectedYearCookie();
        const sel = getSelectedYear();
        const selInList = list.some((y: any) => y.label === sel);

        if ((!cookieSet || !selInList) && serverCurrent) {
          setSelectedYear(serverCurrent);
          setSelected(serverCurrent);
        } else {
          setSelected(sel);
        }
      } catch {
        /* keep calendar fallback */
      }
    })();

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setSelected(detail);
    };
    window.addEventListener('ecole-year-changed', onChange);
    return () => {
      cancelled = true;
      window.removeEventListener('ecole-year-changed', onChange);
    };
  }, [user?.role]);

  const onYearChange = (label: string) => {
    setSelectedYear(label);
    setSelected(label);
    window.location.reload();
  };

  const showYearSelect =
    years.length > 0 &&
    user?.role &&
    !['PARENT', 'STUDENT'].includes(String(user.role).toUpperCase());

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between lg:pl-6 pl-14">
      <div>
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {showYearSelect && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="hidden sm:inline text-xs uppercase tracking-wide text-gray-400">
              Année
            </span>
            <select
              value={selected}
              onChange={(e) => onYearChange(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white text-gray-800 max-w-[9.5rem] sm:max-w-none"
              aria-label="Année scolaire"
            >
              {years.map((y) => (
                <option key={y.id} value={y.label}>
                  {y.label}
                  {y.isCurrent ? ' (courante)' : ''}
                  {y.status === 'ARCHIVED' ? ' — archive' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-800">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
