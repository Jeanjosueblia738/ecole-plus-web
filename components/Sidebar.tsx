'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  DollarSign, Settings, LogOut, School, GraduationCap,
  FileText, Pencil, UserCheck, ShieldCheck, MessageSquare, CalendarDays, CreditCard, FileSpreadsheet,
  AlertTriangle, Menu, X, NotebookPen, Gavel, ClipboardCheck, UserPlus,
} from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { canAccessPath } from '@/lib/rbac';

const navItems = [
  { href: '/dashboard',       icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/eleves',          icon: Users,           label: 'Élèves' },
  { href: '/classes',         icon: GraduationCap,   label: 'Classes' },
  { href: '/notes',           icon: BookOpen,        label: 'Notes' },
  { href: '/presences',       icon: ClipboardList,   label: 'Présences' },
  { href: '/finance',         icon: DollarSign,      label: 'Finance' },
  { href: '/finance/frais',   icon: CreditCard,      label: 'Configurer frais' },
  { href: '/finance/paiement', icon: CreditCard,     label: 'Encaisser' },
  { href: '/finance/historique', icon: FileText,     label: 'Historique paiements' },
  { href: '/finance/caisse',  icon: DollarSign,      label: 'Caisse' },
  { href: '/finance/depenses', icon: FileSpreadsheet, label: 'Dépenses' },
  { href: '/finance/fournisseurs', icon: Users,      label: 'Fournisseurs' },
  { href: '/finance/paie',    icon: UserCheck,       label: 'Paie' },
  { href: '/finance/budget',  icon: FileSpreadsheet, label: 'Budget' },
  { href: '/finance/banque',  icon: CreditCard,      label: 'Banque' },
  { href: '/bulletins',       icon: FileText,        label: 'Bulletins' },
  { href: '/rapports',        icon: FileSpreadsheet, label: 'Rapports' },
  { href: '/risques',         icon: AlertTriangle,   label: 'Risque décrochage' },
  { href: '/cahier',          icon: Pencil,          label: 'Cahier de texte' },
  { href: '/devoirs',         icon: NotebookPen,     label: 'Devoirs' },
  { href: '/conseil',         icon: Gavel,           label: 'Conseil de classe' },
  { href: '/examens',         icon: ClipboardCheck,  label: 'Examens' },
  { href: '/inscriptions',    icon: UserPlus,        label: 'Pré-inscriptions' },
  { href: '/messagerie',      icon: MessageSquare,   label: 'Messagerie' },
  { href: '/emploi-du-temps', icon: CalendarDays,    label: 'Emploi du temps' },
  { href: '/enseignants',     icon: Users,           label: 'Enseignants' },
  { href: '/utilisateurs',    icon: UserCheck,       label: 'Utilisateurs' },
  { href: '/abonnement',      icon: CreditCard,      label: 'Abonnement' },
  { href: '/parametres',      icon: Settings,        label: 'Paramètres' },
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
  const visibleItems = navItems.filter((item) => canAccessPath(role, item.href));

  const handleLogout = async () => {
    await authStorage.clear();
    router.push('/login');
  };

  return (
    <>
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-lg tracking-wider">ECOLE+</p>
            <p className="text-xs text-blue-200 truncate max-w-[140px]">
              {tenant?.name || 'Établissement'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {isSuperAdmin && (
          <>
            <Link href="/super-admin" onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all mb-2 ${
                pathname.startsWith('/super-admin')
                  ? 'bg-yellow-400/20 text-yellow-200'
                  : 'text-yellow-300 hover:bg-yellow-400/10 hover:text-yellow-100'
              }`}>
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              Super Admin
            </Link>
            <div className="border-t border-white/10 my-2" />
          </>
        )}

        {visibleItems.map((item) => {
          const Icon = item.icon;
          // Préférer le lien le plus spécifique (ex. /finance/frais vs /finance)
          const moreSpecific = visibleItems.some(
            (other) =>
              other.href !== item.href &&
              other.href.startsWith(`${item.href}/`) &&
              (pathname === other.href || pathname.startsWith(`${other.href}/`)),
          );
          const isActive =
            !moreSpecific &&
            (pathname === item.href || pathname.startsWith(`${item.href}/`));
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              }`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-blue-200 hover:bg-white/10 hover:text-white transition-all">
          <LogOut className="w-5 h-5" />
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
