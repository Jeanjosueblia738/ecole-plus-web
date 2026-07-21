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
  const role = authStorage.getUser()?.role;
  const canConfigure = hasRole(role, can.configureFees);
  const canViewFull = hasRole(role, can.viewFinanceFull);
  const isCashierOnly = hasRole(role, ['CASHIER']) && !canViewFull;

  const [stats, setStats] = useState<any>(null);
  const [fees, setFees] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-CI').format(n || 0) + ' FCFA';

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const results = await Promise.allSettled([
        financeApi.getStats(year),
        financeApi.getFees(year),
        financeApi.listPayments(year),
        studentsApi.getAll(),
      ]);
      const [statsRes, feesRes, paymentsRes, studentsRes] = results;
      const fails: string[] = [];
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      else fails.push('stats');
      if (feesRes.status === 'fulfilled') {
        setFees(Array.isArray(feesRes.value.data) ? feesRes.value.data : []);
      } else {
        setFees([]);
        fails.push('frais');
      }
      if (paymentsRes.status === 'fulfilled') {
        setPayments(
          Array.isArray(paymentsRes.value.data) ? paymentsRes.value.data : [],
        );
      } else {
        setPayments([]);
        fails.push('paiements');
      }
      if (studentsRes.status === 'fulfilled') {
        const students = Array.isArray(studentsRes.value.data)
          ? studentsRes.value.data
          : [];
        setStudentsCount(students.length);
      } else {
        setStudentsCount(0);
        fails.push('élèves');
      }
      if (fails.length) {
        setLoadError(`Chargement partiel — échec : ${fails.join(', ')}`);
      }
    } catch (e) {
      console.error(e);
      setLoadError('Impossible de charger les données finance.');
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

  const pending = payments.filter(
    (p) => p.status === 'partiel' || p.status === 'en_attente' || !p.isPaid,
  );
  const tauxRaw = String(stats?.tauxRecouvrement ?? '0').replace('%', '');
  const taux = Number(tauxRaw) || 0;
  const heroAmount = isCashierOnly
    ? (stats?.encaissementsAujourdhuiXof ?? stats?.totalPaye ?? 0)
    : (stats?.totalRecouvertXof ?? 0);
  const heroLabel = isCashierOnly ? 'Encaissements du jour' : 'Total encaissé';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title={isCashierOnly ? 'Caisse' : 'Gestion Financière'}
          subtitle={`Année ${year}${isCashierOnly ? ' · Profil caissier' : ''}`}
        />
        <main className="flex-1 p-6 space-y-6 max-w-5xl">
          {loadError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
              {loadError}
            </div>
          )}
          <div className="rounded-2xl bg-gradient-to-br from-[#1B3A6B] to-blue-700 text-white p-6 shadow-sm">
            <p className="text-sm text-white/70">{heroLabel}</p>
            <p className="text-3xl font-bold mt-1">
              {loading ? '…' : fmt(heroAmount)}
            </p>
            <div className="grid grid-cols-2 gap-4 mt-5">
              {canViewFull ? (
                <div>
                  <p className="text-xs text-white/60">Taux de recouvrement</p>
                  <p className="text-lg font-bold">{loading ? '…' : `${taux}%`}</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-white/60">Opérations du jour</p>
                  <p className="text-lg font-bold">
                    {loading ? '…' : String(stats?.operationsAujourdhui ?? 0)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-white/60">Paiements partiels</p>
                <p className="text-lg font-bold">
                  {loading ? '…' : `${pending.length} paiement${pending.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            {canViewFull && (
              <div className="mt-4 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, taux))}%` }}
                />
              </div>
            )}
          </div>

          {canViewFull ? (
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KpiCard
                title="Paiements (liste)"
                value={loading ? '…' : String(payments.length)}
                icon={CheckCircle}
                color="text-green-600"
                bgColor="bg-green-50"
                loading={loading}
              />
              <KpiCard
                title="Impayés / en attente"
                value={loading ? '…' : String(pending.length)}
                icon={AlertCircle}
                color={pending.length ? 'text-amber-600' : 'text-gray-500'}
                bgColor={pending.length ? 'bg-amber-50' : 'bg-gray-50'}
                loading={loading}
              />
            </div>
          )}

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

              {canConfigure && (
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
              )}

              <Link
                href="/finance/caisse"
                className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-amber-200 hover:bg-amber-50/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Caisse</p>
                  <p className="text-xs text-gray-500">Ouverture, clôture, versements banque</p>
                </div>
              </Link>

              {canViewFull && (
                <>
                  <Link href="/finance/depenses" className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-red-200 hover:bg-red-50/30 transition-colors">
                    <div className="w-11 h-11 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Dépenses</p>
                      <p className="text-xs text-gray-500">Enregistrement et suivi</p>
                    </div>
                  </Link>
                  <Link href="/finance/fournisseurs" className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-violet-200 hover:bg-violet-50/30 transition-colors">
                    <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Fournisseurs</p>
                      <p className="text-xs text-gray-500">Annuaire partenaires</p>
                    </div>
                  </Link>
                  <Link href="/finance/paie" className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-sky-200 hover:bg-sky-50/40 transition-colors">
                    <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Paie</p>
                      <p className="text-xs text-gray-500">Bulletins et retenues</p>
                    </div>
                  </Link>
                  <Link href="/finance/budget" className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                      <Settings2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Budget</p>
                      <p className="text-xs text-gray-500">Prévisionnel vs dépenses réelles</p>
                    </div>
                  </Link>
                  <Link href="/finance/banque" className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-teal-200 hover:bg-teal-50/30 transition-colors">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Banque</p>
                      <p className="text-xs text-gray-500">Comptes et rapprochements</p>
                    </div>
                  </Link>
                </>
              )}
            </div>
          </div>

          {canViewFull ? (
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
          ) : (
            <div className="bg-white rounded-xl border border-amber-100 p-4 text-sm text-amber-900">
              Vue caisse opérationnelle : encaissements, reçus et dossiers élèves.
              La configuration des frais et le pilotage financier sont réservés au comptable.
            </div>
          )}

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
