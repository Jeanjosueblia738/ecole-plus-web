'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, AlertCircle, Clock, BookOpen, DollarSign, TrendingUp,
  GraduationCap, UserCheck, FileText, BarChart2, Shield, Briefcase
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import KpiCard from '@/components/KpiCard';
import { studentsApi, attendanceApi, financeApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';

interface Stats {
  totalStudents: number;
  totalAbsences: number;
  pendingJustifications: number;
  revenueXof: number;
  recoveryRate: string;
  totalGrades: number;
  totalTeachers: number;
  totalClasses: number;
  unpaidCount: number;
  totalDu: number;
  totalPaye: number;
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
  return 'direction';
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

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Partial<Stats>>({});
  const [loading, setLoading] = useState(true);
  const user = authStorage.getUser();
  const tenant = authStorage.getTenant();
  const role = user?.role ?? 'ADMIN';
  const group = getRoleGroup(role);
  const fmt = (n: number) => new Intl.NumberFormat('fr-CI').format(n ?? 0) + ' FCFA';

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [studRes, attRes] = await Promise.allSettled([
        studentsApi.getStats(),
        attendanceApi.getStats(),
      ]);
      const s: Partial<Stats> = {};
      if (studRes.status === 'fulfilled') {
        s.totalStudents = studRes.value.data.total ?? 0;
        s.totalTeachers = studRes.value.data.totalTeachers ?? 0;
        s.totalClasses = studRes.value.data.totalClasses ?? 0;
      }
      if (attRes.status === 'fulfilled') {
        s.totalAbsences = attRes.value.data.totalAbsences ?? 0;
        s.pendingJustifications = attRes.value.data.unJustified ?? 0;
      }
      setStats(s);
    } catch (e) { console.error(e); }
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

          {/* ── DIRECTION ── */}
          {group === 'direction' && (
            <>
              <SectionTitle icon={<Shield className="w-5 h-5" />} title="Vue d'ensemble de l'établissement" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Kpi title="Élèves inscrits" value={stats.totalStudents?.toString() ?? '—'} icon={Users} colorKey="blue" loading={loading} />
                <Kpi title="Absences" value={stats.totalAbsences?.toString() ?? '—'} icon={AlertCircle} colorKey="red" loading={loading} />
                <Kpi title="Justifications en attente" value={stats.pendingJustifications?.toString() ?? '—'} icon={Clock} colorKey="yellow" loading={loading} />
                <Kpi title="Enseignants" value={stats.totalTeachers?.toString() ?? '—'} icon={GraduationCap} colorKey="purple" loading={loading} />
                <Kpi title="Classes" value={stats.totalClasses?.toString() ?? '—'} icon={BookOpen} colorKey="teal" loading={loading} />
                <Kpi title="Élèves non à jour" value={stats.unpaidCount?.toString() ?? '—'} icon={DollarSign} colorKey="red" loading={loading} />
              </div>
            </>
          )}

          {/* ── CENSEUR ── */}
          {group === 'pedagogie' && (
            <>
              <SectionTitle icon={<GraduationCap className="w-5 h-5" />} title="Suivi pédagogique" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Kpi title="Élèves" value={stats.totalStudents?.toString() ?? '—'} icon={Users} colorKey="blue" loading={loading} />
                <Kpi title="Enseignants actifs" value={stats.totalTeachers?.toString() ?? '—'} icon={GraduationCap} colorKey="purple" loading={loading} />
                <Kpi title="Classes" value={stats.totalClasses?.toString() ?? '—'} icon={BookOpen} colorKey="teal" loading={loading} />
                <Kpi title="Notes saisies" value={stats.totalGrades?.toString() ?? '—'} icon={FileText} colorKey="green" loading={loading} />
                <Kpi title="Absences" value={stats.totalAbsences?.toString() ?? '—'} icon={AlertCircle} colorKey="red" loading={loading} />
                <Kpi title="Justifications" value={stats.pendingJustifications?.toString() ?? '—'} icon={Clock} colorKey="yellow" loading={loading} />
              </div>
            </>
          )}

          {/* ── VIE SCOLAIRE ── */}
          {group === 'vie_scolaire' && (
            <>
              <SectionTitle icon={<UserCheck className="w-5 h-5" />} title="Vie scolaire & Discipline" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Kpi title="Absences aujourd'hui" value={stats.totalAbsences?.toString() ?? '—'} icon={AlertCircle} colorKey="red" loading={loading} />
                <Kpi title="Justifications en attente" value={stats.pendingJustifications?.toString() ?? '—'} icon={Clock} colorKey="yellow" loading={loading} />
                <Kpi title="Élèves" value={stats.totalStudents?.toString() ?? '—'} icon={Users} colorKey="blue" loading={loading} />
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" /> Actions prioritaires
                </h3>
                <div className="flex gap-3">
                  <button onClick={() => router.push('/presences')}
                    className="flex-1 py-3 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800">
                    Faire l'appel
                  </button>
                  <button onClick={() => router.push('/presences')}
                    className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
                    Valider justifications
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── FINANCE ── */}
          {group === 'finance' && (
            <>
              <SectionTitle icon={<DollarSign className="w-5 h-5" />} title="Tableau de bord financier" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Kpi title="Total dû" value={fmt(stats.totalDu ?? 0)} icon={DollarSign} colorKey="blue" loading={loading} />
                <Kpi title="Total encaissé" value={fmt(stats.totalPaye ?? 0)} icon={TrendingUp} colorKey="green" loading={loading} />
                <Kpi title="Reste à recouvrer" value={fmt((stats.totalDu ?? 0) - (stats.totalPaye ?? 0))} icon={AlertCircle} colorKey="red" loading={loading} />
                <Kpi title="Taux recouvrement" value={stats.recoveryRate ?? '0%'} icon={BarChart2} colorKey="purple" loading={loading} />
                <Kpi title="Élèves non à jour" value={stats.unpaidCount?.toString() ?? '—'} icon={Users} colorKey="yellow" loading={loading} />
                <Kpi title="Élèves inscrits" value={stats.totalStudents?.toString() ?? '—'} icon={Users} colorKey="teal" loading={loading} />
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3">Actions rapides</h3>
                <div className="flex gap-3">
                  <button onClick={() => router.push('/finance')}
                    className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
                    Enregistrer un paiement
                  </button>
                  <button onClick={() => router.push('/finance')}
                    className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
                    Voir les impayés
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── SECRÉTARIAT ── */}
          {group === 'secretariat' && (
            <>
              <SectionTitle icon={<Briefcase className="w-5 h-5" />} title="Secrétariat & Administration" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Kpi title="Élèves inscrits" value={stats.totalStudents?.toString() ?? '—'} icon={Users} colorKey="blue" loading={loading} />
                <Kpi title="Classes" value={stats.totalClasses?.toString() ?? '—'} icon={BookOpen} colorKey="teal" loading={loading} />
                <Kpi title="Enseignants" value={stats.totalTeachers?.toString() ?? '—'} icon={GraduationCap} colorKey="purple" loading={loading} />
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3">Actions rapides</h3>
                <div className="flex gap-3">
                  <button onClick={() => router.push('/eleves/nouveau')}
                    className="flex-1 py-3 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800">
                    Inscrire un élève
                  </button>
                  <button onClick={() => router.push('/eleves')}
                    className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
                    Liste des élèves
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── ENSEIGNANT ── */}
          {group === 'teacher' && (
            <>
              <SectionTitle icon={<GraduationCap className="w-5 h-5" />} title="Mon espace enseignant" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Kpi title="Mes classes" value="—" icon={BookOpen} colorKey="purple" loading={loading} />
                <Kpi title="Notes saisies" value={stats.totalGrades?.toString() ?? '—'} icon={FileText} colorKey="teal" loading={loading} />
                <Kpi title="Absences signalées" value={stats.totalAbsences?.toString() ?? '—'} icon={AlertCircle} colorKey="red" loading={loading} />
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3">Actions rapides</h3>
                <div className="flex gap-3 flex-wrap">
                  <button onClick={() => router.push('/presences')}
                    className="flex-1 py-3 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800">
                    Faire l'appel
                  </button>
                  <button onClick={() => router.push('/notes')}
                    className="flex-1 py-3 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700">
                    Saisir des notes
                  </button>
                  <button onClick={() => router.push('/cahier')}
                    className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
                    Cahier de texte
                  </button>
                </div>
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}