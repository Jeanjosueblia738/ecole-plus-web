'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import KpiCard from '@/components/KpiCard';
import { financeApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';

export default function FinancePage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    financeApi.getStats()
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat('fr-CI').format(n) + ' FCFA';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Gestion Financière" subtitle="Suivi des frais scolaires et paiements" />
        <main className="flex-1 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              title="Total attendu"
              value={loading ? '...' : fmt(stats?.totalAttenduXof ?? 0)}
              icon={DollarSign}
              color="text-blue-600"
              bgColor="bg-blue-50"
              loading={loading}
            />
            <KpiCard
              title="Total recouvré"
              value={loading ? '...' : fmt(stats?.totalRecouvertXof ?? 0)}
              icon={CheckCircle}
              color="text-green-600"
              bgColor="bg-green-50"
              loading={loading}
            />
            <KpiCard
              title="Reste à recouvrir"
              value={loading ? '...' : fmt(stats?.resteARecouvrirXof ?? 0)}
              icon={AlertCircle}
              color="text-red-500"
              bgColor="bg-red-50"
              loading={loading}
            />
            <KpiCard
              title="Taux de recouvrement"
              value={stats?.tauxRecouvrement ?? '0%'}
              icon={TrendingUp}
              color="text-purple-600"
              bgColor="bg-purple-50"
              loading={loading}
            />
          </div>

          {/* Modes de paiement */}
          {stats?.byPaymentMode && Object.keys(stats.byPaymentMode).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Répartition par mode de paiement</h2>
              <div className="space-y-3">
                {Object.entries(stats.byPaymentMode).map(([mode, amount]) => (
                  <div key={mode} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm font-medium text-gray-700 capitalize">{mode.replace('_', ' ')}</span>
                    <span className="text-sm text-gray-600">{fmt(amount as number)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}