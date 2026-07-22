'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, AlertCircle, Clock, BookOpen, DollarSign, TrendingUp,
  GraduationCap, UserCheck, FileText, BarChart2, Shield,
  CheckCircle, MessageSquare, CalendarDays, Pencil, Plus, List,
  Receipt, UserCog
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import KpiCard from '@/components/KpiCard';
import { studentsApi, attendanceApi, financeApi, teachersApi } from '@/lib/api';
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

function RoleHero({
  eyebrow,
  title,
  subtitle,
  tone = 'navy',
  metrics,
  loading,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  tone?: 'navy' | 'indigo' | 'slate' | 'teal' | 'violet' | 'emerald';
  metrics: { label: string; value: string | number | undefined }[];
  loading: boolean;
}) {
  const tones: Record<string, string> = {
    navy: 'bg-[#1B3A6B]',
    indigo: 'bg-indigo-800',
    slate: 'bg-slate-800',
    teal: 'bg-teal-800',
    violet: 'bg-violet-900',
    emerald: 'bg-emerald-800',
  };
  return (
    <div className={`rounded-2xl text-white p-6 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{eyebrow}</p>
      <h2 className="text-xl font-semibold mt-1">{title}</h2>
      <p className="text-sm opacity-80 mt-1">{subtitle}</p>
      <div className={`mt-5 grid gap-3 ${metrics.length >= 4 ? 'grid-cols-2 md:grid-cols-4' : metrics.length === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'}`}>
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg bg-white/10 px-3 py-2.5">
            <p className="text-[11px] opacity-80">{m.label}</p>
            <p className="text-xl font-bold">{loading ? '…' : String(m.value ?? '—')}</p>
          </div>
        ))}
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
      const isTeacher = group === 'teacher';
      const fetches: Promise<any>[] = [];

      if (isTeacher) {
        fetches.push(teachersApi.getMyStats(currentSchoolYear()));
        fetches.push(attendanceApi.getStats().catch(() => ({ data: {} })));
      } else {
        fetches.push(studentsApi.getStats());
        fetches.push(attendanceApi.getStats());
      }
      if (canViewFinance) {
        fetches.push(financeApi.getStats(currentSchoolYear()));
      }

      const results = await Promise.allSettled(fetches);
      const primaryRes = results[0];
      const attRes = results[1];
      const finRes = canViewFinance ? results[2] : null;

      const s: Partial<Stats> = {};
      let failed = 0;
      if (primaryRes?.status === 'fulfilled') {
        const d = primaryRes.value.data ?? {};
        if (isTeacher) {
          s.totalClasses = d.totalClasses ?? 0;
          s.totalStudents = d.totalStudents ?? 0;
          s.totalGrades = d.totalGrades ?? 0;
          s.totalAbsences = d.totalAbsences ?? 0;
        } else {
          s.totalStudents = d.total ?? 0;
          s.totalTeachers = d.totalTeachers ?? 0;
          s.totalClasses = d.totalClasses ?? 0;
          s.unpaidCount = d.unpaidCount ?? 0;
        }
      } else {
        failed += 1;
      }
      if (attRes?.status === 'fulfilled') {
        s.totalAbsences = attRes.value.data?.totalAbsences ?? s.totalAbsences ?? 0;
        s.pendingJustifications = attRes.value.data?.unJustified ?? 0;
      } else if (!isTeacher) {
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
          title={`${user?.firstName ? `Bonjour, ${user.firstName}` : 'Tableau de bord'}`}
          subtitle={`${roleLabels[role] ?? role}${tenant?.name ? ` · ${tenant.name}` : ''}`}
        />
        <main className="flex-1 p-6 space-y-6 max-w-6xl">

          {statsError && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-center justify-between gap-3">
              <span>{statsError}</span>
              <button type="button" onClick={loadStats} className="text-amber-900 font-medium text-xs hover:underline">
                Réessayer
              </button>
            </div>
          )}

          {group === 'direction' && (
            <>
              <RoleHero
                tone="navy"
                eyebrow="Direction"
                title="Vue d'ensemble"
                subtitle="Effectifs, scolarité et situation financière"
                loading={loading}
                metrics={[
                  { label: 'Élèves', value: stats.totalStudents },
                  { label: 'Enseignants', value: stats.totalTeachers },
                  { label: 'Classes', value: stats.totalClasses },
                  { label: 'Impayés', value: stats.unpaidCount },
                ]}
              />

              <SectionTitle icon={<DollarSign className="w-5 h-5" />} title="Situation financière" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Kpi title="Total dû" value={fmt(stats.totalDu ?? 0)} icon={DollarSign} colorKey="blue" loading={loading} />
                <Kpi title="Encaissé" value={fmt(stats.totalPaye ?? 0)} icon={TrendingUp} colorKey="green" loading={loading} />
                <Kpi title="Taux de recouvrement" value={`${taux}%`} icon={BarChart2} colorKey="teal" loading={loading} />
              </div>

              <SectionTitle icon={<AlertCircle className="w-5 h-5" />} title="Vie scolaire" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Kpi title="Absences" value={stats.totalAbsences?.toString() ?? '—'} icon={AlertCircle} colorKey="red" loading={loading} />
                <Kpi title="Justifications en attente" value={stats.pendingJustifications?.toString() ?? '—'} icon={Clock} colorKey="yellow" loading={loading} />
              </div>

              <QuickActions actions={[
                { label: 'Espace finance', href: '/finance', variant: 'primary', icon: DollarSign },
                { label: 'Élèves', href: '/eleves', variant: 'secondary', icon: List },
                { label: 'Présences', href: '/presences', variant: 'secondary', icon: UserCheck },
                ...(hasRole(role, can.manageUsers)
                  ? [{ label: 'Utilisateurs', href: '/utilisateurs', variant: 'secondary' as const, icon: UserCog }]
                  : []),
                { label: 'Messagerie', href: '/messagerie', variant: 'secondary', icon: MessageSquare },
              ]} />
            </>
          )}

          {/* ── 2. CENSEUR ── */}
          {group === 'pedagogie' && (
            <>
              <RoleHero
                tone="indigo"
                eyebrow="Censeur"
                title="Suivi pédagogique"
                subtitle="Classes, cahier de texte, bulletins et discipline"
                loading={loading}
                metrics={[
                  { label: 'Élèves', value: stats.totalStudents },
                  { label: 'Enseignants', value: stats.totalTeachers },
                  { label: 'Classes', value: stats.totalClasses },
                  { label: 'Absences', value: stats.totalAbsences },
                ]}
              />
              <SectionTitle icon={<Clock className="w-5 h-5" />} title="À traiter" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Kpi title="Justifications en attente" value={stats.pendingJustifications?.toString() ?? '—'} icon={Clock} colorKey="yellow" loading={loading} />
                <Kpi title="Absences signalées" value={stats.totalAbsences?.toString() ?? '—'} icon={AlertCircle} colorKey="red" loading={loading} />
              </div>
              <QuickActions actions={[
                { label: 'Cahier de texte', href: '/cahier', variant: 'primary', icon: Pencil },
                { label: 'Bulletins', href: '/bulletins', variant: 'secondary', icon: FileText },
                { label: 'Conseil de classe', href: '/conseil', variant: 'secondary', icon: GraduationCap },
                { label: 'Emploi du temps', href: '/emploi-du-temps', variant: 'secondary', icon: CalendarDays },
                { label: 'Présences', href: '/presences', variant: 'secondary', icon: AlertCircle },
                { label: 'Messagerie', href: '/messagerie', variant: 'secondary', icon: MessageSquare },
              ]} />
            </>
          )}

          {/* ── 3. VIE SCOLAIRE (Surveillant / Éducateur) ── */}
          {group === 'vie_scolaire' && (
            <>
              <RoleHero
                tone="slate"
                eyebrow={role === 'EDUCATOR' ? 'Éducateur' : 'Surveillant'}
                title="Vie scolaire"
                subtitle="Présences, discipline et suivi des élèves"
                loading={loading}
                metrics={[
                  { label: 'Élèves', value: stats.totalStudents },
                  { label: 'Absences', value: stats.totalAbsences },
                  { label: 'À justifier', value: stats.pendingJustifications },
                ]}
              />
              {(stats.pendingJustifications ?? 0) > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-900 font-medium">
                    {stats.pendingJustifications} justification(s) en attente de validation
                  </p>
                  <button type="button" onClick={() => router.push('/presences')}
                    className="ml-auto px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700">
                    Traiter
                  </button>
                </div>
              )}
              <QuickActions actions={[
                { label: 'Faire l\'appel / Présences', href: '/presences', variant: 'primary', icon: UserCheck },
                { label: 'Liste des élèves', href: '/eleves', variant: 'secondary', icon: List },
                { label: 'Classes', href: '/classes', variant: 'secondary', icon: BookOpen },
                { label: 'Messagerie', href: '/messagerie', variant: 'secondary', icon: MessageSquare },
              ]} />
            </>
          )}

          {group === 'finance' && (
            <>
              <RoleHero
                tone={isCashierOnly ? 'emerald' : 'navy'}
                eyebrow={isCashierOnly ? 'Poste de caisse' : 'Comptabilité'}
                title={isCashierOnly ? 'Caisse du jour' : 'Pilotage financier'}
                subtitle={
                  isCashierOnly
                    ? 'Encaissements, session de caisse et suivi des opérations'
                    : 'Recouvrement, trésorerie et contrôle des opérations'
                }
                loading={loading}
                metrics={
                  isCashierOnly
                    ? [
                        { label: "Encaissé aujourd'hui", value: fmt(financeExtra.today ?? stats.totalPaye ?? 0) },
                        { label: 'Opérations', value: financeExtra.ops ?? 0 },
                        { label: 'Élèves non à jour', value: stats.unpaidCount },
                      ]
                    : [
                        { label: 'Taux', value: `${taux}%` },
                        { label: 'Encaissé', value: fmt(stats.totalPaye ?? 0) },
                        { label: 'Reste', value: fmt(Math.max(0, (stats.totalDu ?? 0) - (stats.totalPaye ?? 0))) },
                      ]
                }
              />

              {canViewFull && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Kpi title="Total dû" value={fmt(stats.totalDu ?? 0)} icon={DollarSign} colorKey="blue" loading={loading} />
                  <Kpi title="Encaissé" value={fmt(stats.totalPaye ?? 0)} icon={TrendingUp} colorKey="green" loading={loading} />
                  <Kpi title="Reste à recouvrer" value={fmt(Math.max(0, (stats.totalDu ?? 0) - (stats.totalPaye ?? 0)))} icon={AlertCircle} colorKey="red" loading={loading} />
                  <Kpi title="Élèves non à jour" value={stats.unpaidCount?.toString() ?? '—'} icon={Users} colorKey="yellow" loading={loading} />
                </div>
              )}

              <QuickActions actions={
                isCashierOnly
                  ? [
                      { label: 'Encaisser un paiement', href: '/finance/paiement', variant: 'primary', icon: Receipt },
                      { label: 'Ouvrir / clôturer caisse', href: '/finance/caisse', variant: 'secondary', icon: DollarSign },
                      { label: 'Historique', href: '/finance/historique', variant: 'secondary', icon: List },
                      { label: 'Espace caisse', href: '/finance', variant: 'secondary', icon: BarChart2 },
                    ]
                  : [
                      { label: 'Espace finance', href: '/finance', variant: 'primary', icon: BarChart2 },
                      { label: 'Encaisser', href: '/finance/paiement', variant: 'secondary', icon: Receipt },
                      { label: 'Configurer frais', href: '/finance/frais', variant: 'secondary', icon: DollarSign },
                      { label: 'Caisse', href: '/finance/caisse', variant: 'secondary', icon: List },
                    ]
              } />
            </>
          )}

          {/* ── 5. SECRÉTARIAT ── */}
          {group === 'secretariat' && (
            <>
              <RoleHero
                tone="teal"
                eyebrow="Secrétariat"
                title="Administration scolaire"
                subtitle="Inscriptions, dossiers élèves et documents"
                loading={loading}
                metrics={[
                  { label: 'Élèves', value: stats.totalStudents },
                  { label: 'Classes', value: stats.totalClasses },
                  { label: 'Enseignants', value: stats.totalTeachers },
                ]}
              />
              <QuickActions actions={[
                { label: 'Inscrire un élève', href: '/eleves/nouveau', variant: 'primary', icon: Plus },
                { label: 'Pré-inscriptions', href: '/inscriptions', variant: 'secondary', icon: Users },
                { label: 'Liste des élèves', href: '/eleves', variant: 'secondary', icon: List },
                { label: 'Rapports', href: '/rapports', variant: 'secondary', icon: FileText },
                { label: 'Emploi du temps', href: '/emploi-du-temps', variant: 'secondary', icon: CalendarDays },
                { label: 'Messagerie', href: '/messagerie', variant: 'secondary', icon: MessageSquare },
              ]} />
            </>
          )}

          {/* ── 6. ENSEIGNANT ── */}
          {group === 'teacher' && (
            <>
              <RoleHero
                tone="violet"
                eyebrow="Enseignant"
                title="Mon espace pédagogique"
                subtitle="Appel, notes, cahier de texte et évaluations"
                loading={loading}
                metrics={[
                  { label: 'Classes', value: stats.totalClasses },
                  { label: 'Séances cahier', value: stats.totalGrades },
                  { label: 'Absences signalées', value: stats.totalAbsences },
                ]}
              />
              <QuickActions actions={[
                { label: 'Faire l\'appel', href: '/presences', variant: 'primary', icon: UserCheck },
                { label: 'Saisir des notes', href: '/notes', variant: 'primary', icon: FileText },
                { label: 'Cahier de texte', href: '/cahier', variant: 'secondary', icon: Pencil },
                { label: 'Évaluations', href: '/examens', variant: 'secondary', icon: BookOpen },
                { label: 'Emploi du temps', href: '/emploi-du-temps', variant: 'secondary', icon: CalendarDays },
                { label: 'Messagerie', href: '/messagerie', variant: 'secondary', icon: MessageSquare },
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