'use client';

import { Bell, User } from 'lucide-react';
import { authStorage } from '@/lib/auth';

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

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between lg:pl-6 pl-14">
      <div>
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#1B3A6B] rounded-full flex items-center justify-center">
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
