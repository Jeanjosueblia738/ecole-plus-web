'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, AlertCircle, Clock, BookOpen, DollarSign, TrendingUp,
  GraduationCap, UserCheck, FileText, BarChart2, Shield, Briefcase,
  CheckCircle, MessageSquare, CalendarDays, Pencil, Plus, List,
  Receipt, UserCog
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import KpiCard from '@/components/KpiCard';
import { studentsApi, attendanceApi, financeApi, cahierApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

interface Stats {
  totalStudents: number;
  totalAbsences: number;
  pendingJustifications: number;
  totalTeachers: number;
  totalClasses: number;
  unpaidCount: number;
  totalDu: number;
  totalPaye: number;
  totalGrades: number;
}

const DIRECTION_ROLES = ['ADMIN', 'FOUNDER', 'DIRECTOR'];
const PEDAGOGY_ROLES = ['CENSOR'];
const VIE_SCOLAIRE_ROLES = ['SURVEILLANT', 'EDUCATOR'];
const FINANCE_ROLES = ['ACCOUNTANT', 'CASHIER'];
const ADMIN_ROLES = ['SECRETARY'];

function getRoleGroup(role: string) {
  if (DIRECTION_ROLES.includes(role)) return 'direction';
  if (PEDAGOGY_ROLES.includes(role)) return 'pedagogie';
  if (VIE_SCOLAIRE_ROLES.includes(role)) return 'vie_scolaire';
  if (FINANCE_ROLES.includes(role)) return 'finance';
  if (ADMIN_ROLES.includes(role)) return 'secretariat';
  if (role === 'TEACHER') return 'teacher';
  return 'unknown';
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur', FOUNDER: 'Fondateur', DIRECTOR: 'Directeur',
  CENSOR: 'Censeur', SURVEILLANT: 'Surveillant Général', EDUCATOR: 'Éducateur',
  SECRETARY: 'Secrétaire', ACCOUNTANT: 'Comptable', CASHIER: 'Caissier', TEACHER: 'Enseignant',
};

const colorMap: Record<string, { color: string; bgColor: string }> = {
  blue:   { color: 'text-blue-600',   bgColor: 'bg-blue-50' },
  red:    { color: 'text-red-500',    bgColor: 'bg-red-50' },
  yellow: { color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
  green:  { color: 'text-green-600',  bgColor: 'bg-green-50' },
  purple: { color: 'text-purple-600', bgColor: 'bg-purple-50' },
  teal:   { color: 'text-teal-600',   bgColor: 'bg-teal-50' },
  orange: { color: 'text-orange-500', bgColor: 'bg-orange-50' },
};

function Kpi({ title, value, icon, colorKey, loading }: {
  title: string; value: string; icon: any; colorKey: string; loading: boolean;
}) {
  const { color, bgColor } = colorMap[colorKey] ?? colorMap.blue;
  return <KpiCard title={title} value={value} icon={icon} color={color} bgColor={bgColor} loading={loading} />;
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[#1B3A6B]">{icon}</span>
      <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function QuickActions({ actions }: { actions: { label: string; href: string; variant: 'primary' | 'secondary'; icon?: any }[] }) {
  const router = useRouter();
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <Shield className="w-4 h-4 text-[#1B3A6B]" /> Actions rapides
      </h3>
      <div className="flex gap-3 flex-wrap">
        {actions.map(a => {
          const Icon = a.icon;
          return (
            <button key={a.label} onClick={() => router.push(a.href)}
              className={`flex items-center gap-2 flex-1 min-w-36 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                a.variant === 'primary'
                  ? 'bg-[#1B3A6B] text-white hover:bg-blue-800'
                  : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}>
              {Icon && <Icon className="w-4 h-4" />}
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Partial<Stats>>({});
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [financeExtra, setFinanceExtra] = useState<{ today?: number; ops?: number }>({});
  const user = authStorage.getUser();
  const tenant = authStorage.getTenant();
  const role = user?.role ?? '';
  const group = getRoleGroup(role);
  const canViewFull = hasRole(role, can.viewFinanceFull);
  const isCashierOnly = hasRole(role, ['CASHIER']) && !canViewFull;
  const fmt = (n: number) => new Intl.NumberFormat('fr-CI').format(n ?? 0) + ' FCFA';
  const taux = (stats.totalDu ?? 0) > 0
    ? Math.round(((stats.totalPaye ?? 0) / (stats.totalDu ?? 1)) * 100)
    : 0;

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setStatsError('');
    try {
      const canViewFinance = hasRole(role, can.viewFinance);
      const fetches: Promise<any>[] = [
        studentsApi.getStats(),
        attendanceApi.getStats(),
      ];
      if (canViewFinance) {
        fetches.push(financeApi.getStats(currentSchoolYear()));
      }
      if (group === 'teacher') {
        fetches.push(cahierApi.getStats().catch(() => null));
      }
      const results = await Promise.allSettled(fetches);
      const studRes = results[0];
      const attRes = results[1];
      const finRes = canViewFinance ? results[2] : null;
      const cahierRes = group === 'teacher' ? results[canViewFinance ? 3 : 2] : null;

      const s: Partial<Stats> = {};
      let failed = 0;
      if (studRes?.status === 'fulfilled') {
        s.totalStudents = studRes.value.data.total ?? 0;
        s.totalTeachers = studRes.value.data.totalTeachers ?? 0;
        s.totalClasses = studRes.value.data.totalClasses ?? 0;
        s.unpaidCount = studRes.value.data.unpaidCount ?? 0;
      } else {
        failed += 1;
      }
      if (attRes?.status === 'fulfilled') {
        s.totalAbsences = attRes.value.data.totalAbsences ?? 0;
        s.pendingJustifications = attRes.value.data.unJustified ?? 0;
      } else {
        failed += 1;
      }
      if (finRes?.status === 'fulfilled' && finRes.value) {
        const f = finRes.value.data;
        s.totalDu = f.totalDu ?? f.totalAttenduXof ?? 0;
        s.totalPaye = f.totalPaye ?? f.totalRecouvertXof ?? 0;
        setFinanceExtra({
          today: f.encaissementsAujourdhuiXof ?? f.totalPaye ?? 0,
          ops: f.operationsAujourdhui ?? 0,
        });
      } else if (canViewFinance) {
        failed += 1;
      }
      if (cahierRes?.status === 'fulfilled' && cahierRes.value?.data) {
        const c = cahierRes.value.data;
        s.totalGrades = c.totalEntries ?? c.total ?? undefined;
      }
      setStats(s);
      if (failed > 0) {
        setStatsError(
          failed >= 2
            ? 'Certaines statistiques n\'ont pas pu être chargées.'
            : 'Une partie des indicateurs est indisponible.',
        );
      }
    } catch (e) {
      console.error(e);
      setStatsError('Impossible de charger le tableau de bord.');
    }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title={`Bonjour, ${user?.firstName ?? ''} 👋`}
          subtitle={`${roleLabels[role] ?? role} — ${tenant?.name ?? ''}`}
        />
        <main className="flex-1 p-6 space-y-6">

          {statsError && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-center justify-between gap-3">
              <span>{statsError}</span>
              <button type="button" onClick={loadStats} className="text-amber-900 font-medium text-xs hover:underline">
                Réessayer
              </button>
            </div>
          )}

          {/* ── 1. DIRECTION (Admin / Founder / Director) ── */}
          {group === 'direction' && (
            <>
              <SectionTitle icon={<Shield className="w-5 h-5" />} title="Vue d'ensemble de l'établissement" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Kpi title="Élèves inscrits"          value={stats.totalStudents?.toString() ?? '—'}       icon={Users}        colorKey="blue"   loading={loading} />
                <Kpi title="Enseignants"               value={stats.totalTeachers?.toString() ?? '—'}       icon={GraduationCap} colorKey="purple" loading={loading} />
                <Kpi title="Classes"                   value={stats.totalClasses?.toString() ?? '—'}        icon={BookOpen}     colorKey="teal"   loading={loading} />
                <Kpi title="Absences"                  value={stats.totalAbsences?.toString() ?? '—'}       icon={AlertCircle}  colorKey="red"    loading={loading} />
                <Kpi title="Justifications en attente" value={stats.pendingJustifications?.toString() ?? '—'} icon={Clock}      colorKey="yellow" loading={loading} />
                <Kpi title="Élèves non à jour"         value={stats.unpaidCount?.toString() ?? '—'}         icon={DollarSign}   colorKey="orange" loading={loading} />
              </div>

              {/* Situation financière résumée */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Kpi title="Total dû"   value={fmt(stats.totalDu ?? 0)}                           icon={DollarSign}  colorKey="blue"  loading={loading} />
                <Kpi title="Encaissé"   value={fmt(stats.totalPaye ?? 0)}                         icon={TrendingUp}  colorKey="green" loading={loading} />
                <Kpi title="Taux recouvrement" value={`${taux}%`}                                 icon={BarChart2}   colorKey="purple" loading={loading} />
              </div>

              <QuickActions actions={[
                { label: 'Liste des élèves',        href: '/eleves',              variant: 'secondary', icon: List },
                { label: 'Présences & absences',    href: '/presences',           variant: 'secondary', icon: UserCheck },
                ...(hasRole(role, can.manageUsers)
                  ? [{ label: 'Gestion utilisateurs', href: '/utilisateurs', variant: 'secondary' as const, icon: UserCog }]
                  : []),
                { label: 'Messagerie',               href: '/messagerie',          variant: 'secondary', icon: MessageSquare },
                { label: 'Emploi du temps',          href: '/emploi-du-temps',    variant: 'secondary', icon: CalendarDays },
              ]} />
            </>
          )}

          {/* ── 2. CENSEUR ── */}
          {group === 'pedagogie' && (
            <>
              <SectionTitle icon={<GraduationCap className="w-5 h-5" />} title="Suivi pédagogique" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Kpi title="Élèves"                    value={stats.totalStudents?.toString() ?? '—'}         icon={Users}         colorKey="blue"   loading={loading} />
                <Kpi title="Enseignants actifs"         value={stats.totalTeachers?.toString() ?? '—'}         icon={GraduationCap} colorKey="purple" loading={loading} />
                <Kpi title="Classes"                    value={stats.totalClasses?.toString() ?? '—'}          icon={BookOpen}      colorKey="teal"   loading={loading} />
                <Kpi title="Absences"                   value={stats.totalAbsences?.toString() ?? '—'}         icon={AlertCircle}   colorKey="red"    loading={loading} />
                <Kpi title="Justifications en attente"  value={stats.pendingJustifications?.toString() ?? '—'} icon={Clock}         colorKey="yellow" loading={loading} />
              </div>

              <QuickActions actions={[
                { label: 'Cahier de texte',    href: '/cahier',            variant: 'primary',    icon: Pencil },
                { label: 'Bulletins',          href: '/bulletins',         variant: 'secondary',  icon: FileText },
                { label: 'Emploi du temps',    href: '/emploi-du-temps',   variant: 'secondary',  icon: CalendarDays },
                { label: 'Absences',           href: '/presences',         variant: 'secondary',  icon: AlertCircle },
                { label: 'Messagerie',         href: '/messagerie',        variant: 'secondary',  icon: MessageSquare },
              ]} />
            </>
          )}

          {/* ── 3. VIE SCOLAIRE (Surveillant / Éducateur) ── */}
          {group === 'vie_scolaire' && (
            <>
              <SectionTitle icon={<UserCheck className="w-5 h-5" />} title="Vie scolaire & Discipline" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Kpi title="Élèves"                    value={stats.totalStudents?.toString() ?? '—'}         icon={Users}        colorKey="blue"   loading={loading} />
                <Kpi title="Absences"                  value={stats.totalAbsences?.toString() ?? '—'}         icon={AlertCircle}  colorKey="red"    loading={loading} />
                <Kpi title="Justifications en attente" value={stats.pendingJustifications?.toString() ?? '—'} icon={Clock}        colorKey="yellow" loading={loading} />
              </div>

              {(stats.pendingJustifications ?? 0) > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-800 font-medium">
                    {stats.pendingJustifications} justification(s) en attente de validation
                  </p>
                  <button onClick={() => router.push('/presences')}
                    className="ml-auto px-4 py-1.5 bg-yellow-600 text-white rounded-lg text-xs font-medium hover:bg-yellow-700">
                    Voir
                  </button>
                </div>
              )}

              <QuickActions actions={[
                { label: 'Liste des classes',    href: '/classes',     variant: 'primary',   icon: BookOpen },
                { label: 'Liste des élèves',     href: '/eleves',      variant: 'secondary', icon: List },
                { label: 'Présences / absences', href: '/presences',   variant: 'secondary', icon: UserCheck },
                { label: 'Messagerie',           href: '/messagerie',  variant: 'secondary', icon: MessageSquare },
              ]} />
            </>
          )}

          {/* ── 4. FINANCE (Comptable / Caissier) ── */}
          {group === 'finance' && (
            <>
              <SectionTitle
                icon={<DollarSign className="w-5 h-5" />}
                title={isCashierOnly ? 'Caisse du jour' : 'Tableau de bord financier'}
              />

              {canViewFull ? (
                <>
                  <div className={`rounded-xl p-5 border ${taux >= 80 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className={`text-4xl font-bold ${taux >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>{taux}%</p>
                        <p className="text-sm text-gray-500">Taux de recouvrement</p>
                      </div>
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${taux >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`}
                          style={{ width: `${taux}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Kpi title="Total dû"          value={fmt(stats.totalDu ?? 0)}                                   icon={DollarSign}  colorKey="blue"   loading={loading} />
                    <Kpi title="Encaissé"          value={fmt(stats.totalPaye ?? 0)}                                 icon={TrendingUp}  colorKey="green"  loading={loading} />
                    <Kpi title="Reste à recouvrer" value={fmt((stats.totalDu ?? 0) - (stats.totalPaye ?? 0))}       icon={AlertCircle} colorKey="red"    loading={loading} />
                    <Kpi title="Élèves non à jour" value={stats.unpaidCount?.toString() ?? '—'}                     icon={Users}       colorKey="yellow" loading={loading} />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Kpi title="Encaissé aujourd'hui" value={fmt(financeExtra.today ?? stats.totalPaye ?? 0)} icon={TrendingUp} colorKey="green" loading={loading} />
                  <Kpi title="Opérations du jour" value={String(financeExtra.ops ?? 0)} icon={List} colorKey="blue" loading={loading} />
                  <Kpi title="Élèves non à jour" value={stats.unpaidCount?.toString() ?? '—'} icon={Users} colorKey="yellow" loading={loading} />
                </div>
              )}

              <QuickActions actions={[
                { label: 'Enregistrer un paiement', href: '/finance/paiement', variant: 'primary', icon: Receipt },
                { label: 'Historique', href: '/finance/historique', variant: 'secondary', icon: List },
                { label: 'Caisse', href: '/finance/caisse', variant: 'secondary', icon: DollarSign },
                ...(canViewFull
                  ? [{ label: 'Pilotage', href: '/finance', variant: 'secondary' as const, icon: BarChart2 }]
                  : [{ label: 'Espace caisse', href: '/finance', variant: 'secondary' as const, icon: DollarSign }]),
              ]} />
            </>
          )}

          {/* ── 5. SECRÉTARIAT ── */}
          {group === 'secretariat' && (
            <>
              <SectionTitle icon={<Briefcase className="w-5 h-5" />} title="Secrétariat & Administration" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Kpi title="Élèves inscrits" value={stats.totalStudents?.toString() ?? '—'} icon={Users}         colorKey="blue"   loading={loading} />
                <Kpi title="Classes"          value={stats.totalClasses?.toString() ?? '—'}  icon={BookOpen}      colorKey="teal"   loading={loading} />
                <Kpi title="Enseignants"      value={stats.totalTeachers?.toString() ?? '—'} icon={GraduationCap} colorKey="purple" loading={loading} />
              </div>

              <QuickActions actions={[
                { label: 'Inscrire un élève',  href: '/eleves/nouveau',   variant: 'primary',   icon: Plus },
                { label: 'Liste des élèves',   href: '/eleves',            variant: 'secondary', icon: List },
                { label: 'Rapports',           href: '/rapports',          variant: 'secondary', icon: FileText },
                { label: 'Emploi du temps',    href: '/emploi-du-temps',   variant: 'secondary', icon: CalendarDays },
                { label: 'Messagerie',         href: '/messagerie',        variant: 'secondary', icon: MessageSquare },
              ]} />
            </>
          )}

          {/* ── 6. ENSEIGNANT ── */}
          {group === 'teacher' && (
            <>
              <SectionTitle icon={<GraduationCap className="w-5 h-5" />} title="Mon espace enseignant" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Kpi title="Absences signalées" value={stats.totalAbsences?.toString() ?? '—'} icon={AlertCircle} colorKey="red"    loading={loading} />
                <Kpi title="Séances cahier"     value={stats.totalGrades?.toString() ?? '—'}   icon={FileText}    colorKey="purple" loading={loading} />
                <Kpi title="Classes actives"    value={stats.totalClasses?.toString() ?? '—'}  icon={BookOpen}    colorKey="teal"   loading={loading} />
              </div>

              <QuickActions actions={[
                { label: 'Faire l\'appel',   href: '/presences',       variant: 'primary',   icon: UserCheck },
                { label: 'Saisir des notes', href: '/notes',           variant: 'primary',   icon: FileText },
                { label: 'Cahier de texte',  href: '/cahier',          variant: 'secondary', icon: Pencil },
                { label: 'Emploi du temps',  href: '/emploi-du-temps', variant: 'secondary', icon: CalendarDays },
                { label: 'Messagerie',       href: '/messagerie',      variant: 'secondary', icon: MessageSquare },
              ]} />
            </>
          )}

          {group === 'unknown' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              Rôle non reconnu ({role}). Contactez un administrateur.
            </div>
          )}

        </main>
      </div>
    </div>
  );
}