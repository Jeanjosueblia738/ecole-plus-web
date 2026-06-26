'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, AlertCircle, Clock, BookOpen, DollarSign, TrendingUp } from 'lucide-react';
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
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalAbsences: 0,
    pendingJustifications: 0,
    revenueXof: 0,
    recoveryRate: '0%',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [studentsRes, attendanceRes, financeRes] = await Promise.allSettled([
        studentsApi.getStats(),
        attendanceApi.getStats(),
        financeApi.getStats(),
      ]);

      setStats({
        totalStudents:
          studentsRes.status === 'fulfilled' ? studentsRes.value.data.total ?? 0 : 0,
        totalAbsences:
          attendanceRes.status === 'fulfilled'
            ? attendanceRes.value.data.totalAbsences ?? 0
            : 0,
        pendingJustifications:
          attendanceRes.status === 'fulfilled'
            ? attendanceRes.value.data.unJustified ?? 0
            : 0,
        revenueXof:
          financeRes.status === 'fulfilled'
            ? financeRes.value.data.totalRecouvertXof ?? 0
            : 0,
        recoveryRate:
          financeRes.status === 'fulfilled'
            ? financeRes.value.data.tauxRecouvrement ?? '0%'
            : '0%',
      });
    } catch (err) {
      console.error('Erreur chargement stats', err);
    } finally {
      setLoading(false);
    }
  };

  const formatXof = (n: number) =>
    new Intl.NumberFormat('fr-CI').format(n) + ' FCFA';

  const tenant = authStorage.getTenant();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Tableau de bord"
          subtitle={`Vue d'ensemble — ${tenant?.name ?? ''}`}
        />
        <main className="flex-1 p-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <KpiCard
              title="Élèves inscrits"
              value={stats.totalStudents}
              icon={Users}
              color="text-blue-600"
              bgColor="bg-blue-50"
              trend="Total cette année"
              loading={loading}
            />
            <KpiCard
              title="Absences"
              value={stats.totalAbsences}
              icon={AlertCircle}
              color="text-red-500"
              bgColor="bg-red-50"
              trend="Toutes classes confondues"
              loading={loading}
            />
            <KpiCard
              title="En attente de justification"
              value={stats.pendingJustifications}
              icon={Clock}
              color="text-orange-500"
              bgColor="bg-orange-50"
              trend="À traiter"
              loading={loading}
            />
            <KpiCard
              title="Revenus recouvrés"
              value={loading ? '...' : formatXof(stats.revenueXof)}
              icon={DollarSign}
              color="text-green-600"
              bgColor="bg-green-50"
              trend="Paiements reçus"
              loading={loading}
            />
            <KpiCard
              title="Taux de recouvrement"
              value={stats.recoveryRate}
              icon={TrendingUp}
              color="text-purple-600"
              bgColor="bg-purple-50"
              trend="Frais scolaires"
              loading={loading}
            />
            <KpiCard
              title="Notes saisies"
              value="—"
              icon={BookOpen}
              color="text-teal-600"
              bgColor="bg-teal-50"
              trend="Ce trimestre"
              loading={loading}
            />
          </div>

          {/* Actions rapides */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Actions rapides</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Inscrire un élève', href: '/eleves', color: 'bg-blue-600' },
                { label: 'Faire l\'appel', href: '/presences', color: 'bg-orange-500' },
                { label: 'Saisir des notes', href: '/notes', color: 'bg-purple-600' },
                { label: 'Enregistrer un paiement', href: '/finance', color: 'bg-green-600' },
              ].map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  className={`${action.color} text-white text-sm font-medium py-3 px-4 rounded-xl text-center hover:opacity-90 transition-opacity`}
                >
                  {action.label}
                </a>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}