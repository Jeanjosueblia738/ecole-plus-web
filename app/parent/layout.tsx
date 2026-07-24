'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, BookOpen, ClipboardList, Wallet, LogOut, School,
} from 'lucide-react';
import { authStorage } from '@/lib/auth';

const NAV = [
  { href: '/parent', icon: Home, label: 'Accueil', exact: true },
  { href: '/parent/notes', icon: BookOpen, label: 'Notes' },
  { href: '/parent/presences', icon: ClipboardList, label: 'Présences' },
  { href: '/parent/finance', icon: Wallet, label: 'Paiements' },
];

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = authStorage.getUser();
  const tenant = authStorage.getTenant();

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.replace('/login');
      return;
    }
    if (String(authStorage.getUser()?.role || '').toUpperCase() !== 'PARENT') {
      router.replace('/dashboard');
    }
  }, [router]);

  const logout = async () => {
    await authStorage.clear();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#1B3A6B] text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <School className="w-7 h-7 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold tracking-wide">ECOLE+</p>
              <p className="text-xs text-blue-200 truncate">
                Espace parent · {tenant?.name || 'École'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline text-blue-100 truncate max-w-[140px]">
              {user?.firstName} {user?.lastName}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
            >
              <LogOut className="w-4 h-4" /> Quitter
            </button>
          </div>
        </div>
        <nav className="max-w-5xl mx-auto px-2 flex gap-1 overflow-x-auto pb-2">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                  active
                    ? 'bg-white text-[#1B3A6B] font-medium'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
