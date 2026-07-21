'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle, ArrowRight, Banknote, Building2, CheckCircle,
  CreditCard, FileSpreadsheet, FileText, Landmark, Loader2,
  PiggyBank, Receipt, UserCheck, Users, Wallet,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { financeApi, studentsApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

type Mod = {
  href: string;
  title: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
  primary?: boolean;
};

function ModuleCard({ m }: { m: Mod }) {
  const Icon = m.icon;
  return (
    <Link
      href={m.href}
      className={`group flex flex-col justify-between rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
        m.primary
          ? 'border-emerald-200 ring-1 ring-emerald-100 hover:border-emerald-300'
          : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${m.accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{m.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{m.desc}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center text-xs font-medium text-[#1B3A6B] opacity-70 group-hover:opacity-100">
        Ouvrir <ArrowRight className="w-3.5 h-3.5 ml-1" />
      </div>
    </Link>
  );
}

export default function FinancePage() {
  const router = useRouter();
  const year = currentSchoolYear();
  const role = authStorage.getUser()?.role;
  const canConfigure = hasRole(role, can.configureFees);
  const canViewFull = hasRole(role, can.viewFinanceFull);
  const canOps = hasRole(role, can.manageFinanceOps);
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
  const reste = Math.max(
    0,
    (stats?.totalAttenduXof ?? stats?.totalDu ?? 0) -
      (stats?.totalRecouvertXof ?? stats?.totalPaye ?? 0),
  );

  const opsModules: Mod[] = [
    {
      href: '/finance/paiement',
      title: 'Encaisser',
      desc: 'Espèces, Mobile Money ou chèque',
      icon: Banknote,
      accent: 'bg-emerald-50 text-emerald-700',
      primary: true,
    },
    {
      href: '/finance/caisse',
      title: 'Session de caisse',
      desc: 'Ouverture, clôture, versement banque',
      icon: Receipt,
      accent: 'bg-amber-50 text-amber-700',
    },
    {
      href: '/finance/historique',
      title: 'Historique',
      desc: loading
        ? 'Chargement…'
        : `${payments.length} opération${payments.length !== 1 ? 's' : ''}`,
      icon: FileText,
      accent: 'bg-sky-50 text-sky-700',
    },
  ];

  const pilotageModules: Mod[] = [
    ...(canConfigure
      ? [
          {
            href: '/finance/frais',
            title: 'Frais scolaires',
            desc:
              !loading && fees.length
                ? `${fees.length} type(s) configuré(s)`
                : 'Tarifs et affectation aux classes',
            icon: CreditCard,
            accent: 'bg-blue-50 text-[#1B3A6B]',
          } as Mod,
        ]
      : []),
    ...(canOps
      ? ([
          {
            href: '/finance/depenses',
            title: 'Dépenses',
            desc: 'Charges et sorties de trésorerie',
            icon: FileSpreadsheet,
            accent: 'bg-red-50 text-red-700',
          },
          {
            href: '/finance/fournisseurs',
            title: 'Fournisseurs',
            desc: 'Annuaire et suivi partenaires',
            icon: Building2,
            accent: 'bg-violet-50 text-violet-700',
          },
          {
            href: '/finance/paie',
            title: 'Paie',
            desc: 'Bulletins et retenues',
            icon: UserCheck,
            accent: 'bg-cyan-50 text-cyan-700',
          },
          {
            href: '/finance/budget',
            title: 'Budget',
            desc: 'Prévisionnel vs réalisé',
            icon: PiggyBank,
            accent: 'bg-indigo-50 text-indigo-700',
          },
          {
            href: '/finance/banque',
            title: 'Banque',
            desc: 'Comptes et rapprochements',
            icon: Landmark,
            accent: 'bg-teal-50 text-teal-700',
          },
        ] as Mod[])
      : []),
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title={isCashierOnly ? 'Espace caisse' : 'Espace finance'}
          subtitle={`Année scolaire ${year}`}
        />
        <main className="flex-1 p-6 space-y-8 max-w-5xl">
          {loadError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm flex items-center justify-between gap-3">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={load}
                className="text-xs font-semibold hover:underline"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Hero situation */}
          <section className="rounded-2xl bg-[#1B3A6B] text-white overflow-hidden shadow-sm">
            <div className="p-6 md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-blue-200 mb-2">
                    <Wallet className="w-3.5 h-3.5" />
                    {isCashierOnly ? 'Activité du jour' : 'Synthèse de recouvrement'}
                  </div>
                  <p className="text-sm text-blue-100/80">
                    {isCashierOnly ? 'Encaissements du jour' : 'Total encaissé'}
                  </p>
                  <p className="text-3xl md:text-4xl font-bold mt-1 tracking-tight">
                    {loading ? (
                      <Loader2 className="w-8 h-8 animate-spin opacity-60" />
                    ) : (
                      fmt(heroAmount)
                    )}
                  </p>
                </div>
                {!isCashierOnly && (
                  <div className="rounded-xl bg-white/10 px-4 py-3 min-w-[120px]">
                    <p className="text-[11px] uppercase tracking-wide text-blue-200">
                      Taux
                    </p>
                    <p className="text-2xl font-bold">{loading ? '…' : `${taux}%`}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                {isCashierOnly ? (
                  <>
                    <div className="rounded-lg bg-white/10 px-3 py-2.5">
                      <p className="text-[11px] text-blue-200">Opérations</p>
                      <p className="text-lg font-semibold">
                        {loading ? '…' : String(stats?.operationsAujourdhui ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/10 px-3 py-2.5">
                      <p className="text-[11px] text-blue-200">Partiels</p>
                      <p className="text-lg font-semibold">
                        {loading ? '…' : pending.length}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg bg-white/10 px-3 py-2.5">
                      <p className="text-[11px] text-blue-200">Élèves</p>
                      <p className="text-lg font-semibold">
                        {loading ? '…' : studentsCount}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/10 px-3 py-2.5">
                      <p className="text-[11px] text-blue-200">Reste à recouvrer</p>
                      <p className="text-lg font-semibold">
                        {loading ? '…' : fmt(reste)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/10 px-3 py-2.5">
                      <p className="text-[11px] text-blue-200">Paiements</p>
                      <p className="text-lg font-semibold">
                        {loading ? '…' : payments.length}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/10 px-3 py-2.5">
                      <p className="text-[11px] text-blue-200">Partiels</p>
                      <p className="text-lg font-semibold flex items-center gap-1.5">
                        {loading ? '…' : pending.length}
                        {!loading && pending.length > 0 && (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
                        )}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {canViewFull && (
                <div className="mt-5 h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, taux))}%` }}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Opérations */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Opérations de caisse
              </h2>
              {!loading && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> à jour
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {opsModules.map((m) => (
                <ModuleCard key={m.href} m={m} />
              ))}
            </div>
          </section>

          {/* Pilotage */}
          {pilotageModules.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
                Pilotage & contrôle
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pilotageModules.map((m) => (
                  <ModuleCard key={m.href} m={m} />
                ))}
              </div>
            </section>
          )}

          {isCashierOnly && (
            <p className="text-xs text-gray-500 border-t border-gray-100 pt-4">
              Profil caissier — le pilotage (frais, dépenses, banque) est réservé
              au comptable et à la direction.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
