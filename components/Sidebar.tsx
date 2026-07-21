'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  DollarSign, Settings, LogOut, School, GraduationCap,
  FileText, Pencil, UserCheck, ShieldCheck, MessageSquare, CalendarDays,
  CreditCard, FileSpreadsheet, AlertTriangle, Menu, X, NotebookPen,
  Gavel, ClipboardCheck, UserPlus, Wallet, Landmark, Receipt,
  Building2, PiggyBank, Banknote,
} from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { canAccessPath } from '@/lib/rbac';

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

type NavSection = {
  id: string;
  label?: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    id: 'main',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    ],
  },
  {
    id: 'caisse',
    label: 'Caisse',
    items: [
      { href: '/finance', icon: Wallet, label: 'Espace finance' },
      { href: '/finance/paiement', icon: Banknote, label: 'Encaisser' },
      { href: '/finance/caisse', icon: Receipt, label: 'Session de caisse' },
      { href: '/finance/historique', icon: FileText, label: 'Historique' },
    ],
  },
  {
    id: 'pilotage',
    label: 'Pilotage financier',
    items: [
      { href: '/finance/frais', icon: CreditCard, label: 'Frais scolaires' },
      { href: '/finance/depenses', icon: FileSpreadsheet, label: 'Dépenses' },
      { href: '/finance/fournisseurs', icon: Building2, label: 'Fournisseurs' },
      { href: '/finance/paie', icon: UserCheck, label: 'Paie' },
      { href: '/finance/budget', icon: PiggyBank, label: 'Budget' },
      { href: '/finance/banque', icon: Landmark, label: 'Banque' },
    ],
  },
  {
    id: 'scolarite',
    label: 'Scolarité',
    items: [
      { href: '/eleves', icon: Users, label: 'Élèves' },
      { href: '/classes', icon: GraduationCap, label: 'Classes' },
      { href: '/inscriptions', icon: UserPlus, label: 'Pré-inscriptions' },
      { href: '/notes', icon: BookOpen, label: 'Notes' },
      { href: '/presences', icon: ClipboardList, label: 'Présences' },
      { href: '/bulletins', icon: FileText, label: 'Bulletins' },
      { href: '/devoirs', icon: NotebookPen, label: 'Devoirs' },
      { href: '/conseil', icon: Gavel, label: 'Conseil de classe' },
      { href: '/examens', icon: ClipboardCheck, label: 'Examens' },
      { href: '/cahier', icon: Pencil, label: 'Cahier de texte' },
      { href: '/emploi-du-temps', icon: CalendarDays, label: 'Emploi du temps' },
      { href: '/risques', icon: AlertTriangle, label: 'Risque décrochage' },
      { href: '/rapports', icon: FileSpreadsheet, label: 'Rapports' },
    ],
  },
  {
    id: 'comms',
    label: 'Communication',
    items: [
      { href: '/messagerie', icon: MessageSquare, label: 'Messagerie' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    items: [
      { href: '/enseignants', icon: Users, label: 'Enseignants' },
      { href: '/utilisateurs', icon: UserCheck, label: 'Utilisateurs' },
      { href: '/abonnement', icon: CreditCard, label: 'Abonnement' },
      { href: '/parametres', icon: Settings, label: 'Paramètres' },
    ],
  },
];

function NavContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const tenant = authStorage.getTenant();
  const user = authStorage.getUser();
  const role = user?.role;
  const isSuperAdmin = role === 'SUPER_ADMIN';

  const roleBadge =
    role === 'CASHIER'
      ? 'Caissier'
      : role === 'ACCOUNTANT'
        ? 'Comptable'
        : role === 'ADMIN' || role === 'FOUNDER'
          ? 'Admin'
          : role === 'DIRECTOR'
            ? 'Direction'
            : null;

  const sections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessPath(role, item.href)),
    }))
    .filter((section) => section.items.length > 0);

  const flatVisible = sections.flatMap((s) => s.items);

  const handleLogout = async () => {
    await authStorage.clear();
    router.push('/login');
  };

  const isItemActive = (href: string) => {
    const moreSpecific = flatVisible.some(
      (other) =>
        other.href !== href &&
        other.href.startsWith(`${href}/`) &&
        (pathname === other.href || pathname.startsWith(`${other.href}/`)),
    );
    return (
      !moreSpecific &&
      (pathname === href || pathname.startsWith(`${href}/`))
    );
  };

  return (
    <>
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <School className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-base tracking-wide">ECOLE+</p>
            <p className="text-[11px] text-blue-200 truncate max-w-[150px]">
              {tenant?.name || 'Établissement'}
            </p>
          </div>
        </div>
        {roleBadge && (
          <div className="mt-3 inline-flex items-center px-2.5 py-1 rounded-lg bg-white/10 text-[11px] font-medium text-blue-100 tracking-wide uppercase">
            {roleBadge}
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {isSuperAdmin && (
          <div>
            <Link
              href="/super-admin"
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                pathname.startsWith('/super-admin')
                  ? 'bg-yellow-400/20 text-yellow-200'
                  : 'text-yellow-300 hover:bg-yellow-400/10'
              }`}
            >
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              Super Admin
            </Link>
          </div>
        )}

        {sections.map((section) => (
          <div key={section.id}>
            {section.label && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-blue-300/70">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                      active
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0 opacity-90" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium text-blue-200 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Ouvrir le menu"
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 p-2.5 rounded-xl bg-[#1B3A6B] text-white shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      <aside className="hidden lg:flex w-64 min-h-screen bg-[#1B3A6B] text-white flex-col flex-shrink-0">
        <NavContent />
      </aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-[#1B3A6B] text-white flex flex-col shadow-xl">
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            <NavContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
