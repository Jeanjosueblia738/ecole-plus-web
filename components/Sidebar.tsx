'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  DollarSign, Settings, LogOut, School, GraduationCap,
  FileText, Pencil, UserCheck, ShieldCheck, MessageSquare,
} from 'lucide-react';
import { authStorage } from '@/lib/auth';

const navItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/eleves',       icon: Users,           label: 'Élèves' },
  { href: '/classes',      icon: GraduationCap,   label: 'Classes' },
  { href: '/notes',        icon: BookOpen,        label: 'Notes' },
  { href: '/presences',    icon: ClipboardList,   label: 'Présences' },
  { href: '/finance',      icon: DollarSign,      label: 'Finance' },
  { href: '/bulletins',    icon: FileText,        label: 'Bulletins' },
  { href: '/cahier',       icon: Pencil,          label: 'Cahier de texte' },
  { href: '/messagerie',   icon: MessageSquare,   label: 'Messagerie' },
  { href: '/enseignants',  icon: Users,           label: 'Enseignants' },
  { href: '/utilisateurs', icon: UserCheck,       label: 'Utilisateurs' },
  { href: '/parametres',   icon: Settings,        label: 'Paramètres' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const tenant = authStorage.getTenant();
  const user = authStorage.getUser();

  // Super Admin = email se terminant par @ecoleplus.ci ET pas de tenantCode
  const isSuperAdmin = user?.email?.endsWith('@ecoleplus.ci') &&
    user?.role === 'SUPER_ADMIN';

  const handleLogout = () => {
    authStorage.clear();
    router.push('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-[#1B3A6B] text-white flex flex-col">
      {/* Logo */}
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

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">

        {/* Super Admin — lien dédié */}
        {isSuperAdmin && (
          <>
            <Link href="/super-admin"
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

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}
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

        {/* Lien Super Admin accessible à tous pour les admins */}
        {!isSuperAdmin && (user?.role === 'ADMIN' || user?.role === 'DIRECTOR') && (
          <>
            <div className="border-t border-white/10 my-2" />
            <Link href="/super-admin"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                pathname.startsWith('/super-admin')
                  ? 'bg-white/20 text-white'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              }`}>
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              Administration
            </Link>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-blue-200 hover:bg-white/10 hover:text-white transition-all">
          <LogOut className="w-5 h-5" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}