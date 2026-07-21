'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle, Loader2, Settings2, History,
  CreditCard, Users, AlertCircle,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import KpiCard from '@/components/KpiCard';
import { financeApi, studentsApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

export default function FinancePage() {
  const router = useRouter();
  const year = currentSchoolYear();
  const [stats, setStats] = useState<any>(null);
  const [fees, setFees] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-CI').format(n || 0) + ' FCFA';

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, feesRes, paymentsRes, studentsRes] = await Promise.all([
        financeApi.getStats(year),
        financeApi.getFees(year),
        financeApi.listPayments(year).catch(() => ({ data: [] })),
        studentsApi.getAll().catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setFees(Array.isArray(feesRes.data) ? feesRes.data : []);
      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
      const students = Array.isArray(studentsRes.data) ? studentsRes.data : [];
      setStudentsCount(students.length);
    } catch (e) {
      console.error(e);
      alert('Impossible de charger les données finance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!hasRole(authStorage.getUser()?.role, can.viewFinance)) {
      router.push('/dashboard');
      return;
    }
    load();
  }, [router]);

  const pending = payments.filter((p) => p.status === 'en_attente' || !p.isPaid);
  const tauxRaw = String(stats?.tauxRecouvrement ?? '0').replace('%', '');
  const taux = Number(tauxRaw) || 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Gestion Financière" subtitle={`Année ${year}`} />
        <main className="flex-1 p-6 space-y-6 max-w-5xl">
          {/* Carte récapitulatif style mobile */}
          <div className="rounded-2xl bg-gradient-to-br from-[#1B3A6B] to-blue-700 text-white p-6 shadow-sm">
            <p className="text-sm text-white/70">Total encaissé</p>
            <p className="text-3xl font-bold mt-1">
              {loading ? '…' : fmt(stats?.totalRecouvertXof ?? 0)}
            </p>
            <div className="grid grid-cols-2 gap-4 mt-5">
              <div>
                <p className="text-xs text-white/60">Taux de recouvrement</p>
                <p className="text-lg font-bold">{loading ? '…' : `${taux}%`}</p>
              </div>
              <div>
                <p className="text-xs text-white/60">En attente validation</p>
                <p className="text-lg font-bold">
                  {loading ? '…' : `${pending.length} paiement${pending.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, taux))}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              title="Élèves"
              value={loading ? '…' : String(studentsCount)}
              icon={Users}
              color="text-blue-600"
              bgColor="bg-blue-50"
              loading={loading}
            />
            <KpiCard
              title="Paiements"
              value={loading ? '…' : String(payments.length)}
              icon={CheckCircle}
              color="text-green-600"
              bgColor="bg-green-50"
              loading={loading}
            />
            <KpiCard
              title="En attente"
              value={loading ? '…' : String(pending.length)}
              icon={AlertCircle}
              color={pending.length ? 'text-amber-600' : 'text-gray-500'}
              bgColor={pending.length ? 'bg-amber-50' : 'bg-gray-50'}
              loading={loading}
            />
          </div>

          <div>
            <h2 className="text-base font-bold text-gray-800 mb-3">Actions</h2>
            <div className="space-y-3">
              <Link
                href="/finance/paiement"
                className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Enregistrer un paiement</p>
                  <p className="text-xs text-gray-500">Espèces, Mobile Money ou Chèque</p>
                </div>
              </Link>

              <Link
                href="/finance/historique"
                className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-sky-200 hover:bg-sky-50/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Historique des paiements</p>
                  <p className="text-xs text-gray-500">
                    {loading
                      ? '…'
                      : `${payments.length} paiement${payments.length !== 1 ? 's' : ''} enregistré${payments.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </Link>

              <Link
                href="/finance/frais"
                className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-[#1B3A6B]/30 hover:bg-blue-50/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#1B3A6B] flex items-center justify-center shrink-0">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Configurer les frais</p>
                  <p className="text-xs text-gray-500">
                    Scolarité, transport, examens…
                    {!loading && fees.length > 0 ? ` · ${fees.length} type(s)` : ''}
                  </p>
                </div>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Total attendu</p>
              <p className="text-lg font-bold text-gray-800 mt-1">
                {loading ? '…' : fmt(stats?.totalAttenduXof ?? 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Reste à recouvrir</p>
              <p className="text-lg font-bold text-red-600 mt-1">
                {loading ? '…' : fmt(stats?.resteARecouvrirXof ?? 0)}
              </p>
            </div>
          </div>

          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-[#1B3A6B]" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
