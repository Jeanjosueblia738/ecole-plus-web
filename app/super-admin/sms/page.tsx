'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  GraduationCap,
  Loader2,
  LogOut,
  MessageSquare,
  RefreshCw,
  Search,
} from 'lucide-react';
import api from '@/lib/api';
import { saAuth } from '@/lib/sa-auth';

const fmt = (n: number) => new Intl.NumberFormat('fr-CI').format(n || 0);

type SchoolSms = {
  tenantId: string;
  code: string;
  name: string;
  city: string | null;
  plan: string;
  isActive: boolean;
  remaining: number;
  usedTotal: number;
  purchasedTotal: number;
  used: { week: number; month: number; year: number };
  purchased: { week: number; month: number; year: number };
};

type Overview = {
  summary: {
    schools: number;
    remaining: number;
    usedTotal: number;
    purchasedTotal: number;
    used: { week: number; month: number; year: number };
    purchased: { week: number; month: number; year: number };
  };
  schools: SchoolSms[];
};

type Period = 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  week: 'Semaine',
  month: 'Mois',
  year: 'Année',
};

export default function SuperAdminSmsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<Overview | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [search, setSearch] = useState('');
  const [saUser, setSaUser] = useState<{ firstName?: string; lastName?: string }>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!saAuth.isLoggedIn()) {
      router.push('/super-admin/login');
      return;
    }
    setSaUser(saAuth.getUser() || {});
    load();
  }, [mounted, router]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get('/super-admin/sms', {
        headers: saAuth.authHeader(),
      });
      setData(res);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(' · ')
          : typeof msg === 'string'
            ? msg
            : 'Impossible de charger la consommation SMS.',
      );
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!data?.schools) return [];
    if (!q) return data.schools;
    return data.schools.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.city || '').toLowerCase().includes(q),
    );
  }, [data, search]);

  const handleLogout = () => {
    saAuth.logout();
    router.push('/super-admin/login');
  };

  const summary = data?.summary;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#1B3A6B] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/super-admin')}
            className="p-2 hover:bg-white/10 rounded-lg"
            title="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-wide">ECOLE+</span>
          <span className="ml-2 px-3 py-1 bg-yellow-400/20 text-yellow-200 text-xs rounded-full border border-yellow-400/30 font-medium">
            SMS — vue globale
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-blue-200 text-sm">
            {saUser.firstName} {saUser.lastName}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#1B3A6B]" />
              Consommation SMS par école
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Restant, utilisés et achetés — semaine, mois, année
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-white bg-white"
          >
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
          </div>
        ) : summary ? (
          <>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    period === p
                      ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: 'SMS restants (toutes écoles)',
                  value: fmt(summary.remaining),
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                },
                {
                  title: `Utilisés (${PERIOD_LABELS[period].toLowerCase()})`,
                  value: fmt(summary.used[period]),
                  color: 'text-orange-600',
                  bg: 'bg-orange-50',
                },
                {
                  title: `Acheté (${PERIOD_LABELS[period].toLowerCase()})`,
                  value: fmt(summary.purchased[period]),
                  color: 'text-blue-600',
                  bg: 'bg-blue-50',
                },
                {
                  title: 'Total acheté (cumul)',
                  value: fmt(summary.purchasedTotal),
                  color: 'text-purple-600',
                  bg: 'bg-purple-50',
                },
              ].map((k) => (
                <div
                  key={k.title}
                  className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                >
                  <p className="text-sm text-gray-500 mb-2">{k.title}</p>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  <div className={`mt-2 h-1 w-10 rounded ${k.bg}`} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
                <span className="text-gray-500">Utilisés cumul</span>
                <p className="font-semibold text-gray-800">{fmt(summary.usedTotal)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
                <span className="text-gray-500">Écoles</span>
                <p className="font-semibold text-gray-800">{summary.schools}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
                <span className="text-gray-500">Période affichée</span>
                <p className="font-semibold text-gray-800">{PERIOD_LABELS[period]}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <h3 className="font-semibold text-gray-800">
                  Par établissement ({filtered.length})
                </h3>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nom, code, ville..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  Aucune école trouvée
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-500 border-b border-gray-100">
                        <th className="px-4 py-3 font-medium">École</th>
                        <th className="px-4 py-3 font-medium text-right">Restant</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Utilisés ({PERIOD_LABELS[period].toLowerCase()})
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Achetés ({PERIOD_LABELS[period].toLowerCase()})
                        </th>
                        <th className="px-4 py-3 font-medium text-right">Utilisés (total)</th>
                        <th className="px-4 py-3 font-medium text-right">Acheté (total)</th>
                        <th className="px-4 py-3 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s) => (
                        <tr
                          key={s.tenantId}
                          className="border-b border-gray-50 hover:bg-gray-50/80"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-400">
                              {s.code}
                              {s.city ? ` · ${s.city}` : ''} · {s.plan}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                            {fmt(s.remaining)}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-700 font-medium">
                            {fmt(s.used[period])}
                          </td>
                          <td className="px-4 py-3 text-right text-blue-700 font-medium">
                            {fmt(s.purchased[period])}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {fmt(s.usedTotal)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {fmt(s.purchasedTotal)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                s.isActive
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-red-50 text-red-600'
                              }`}
                            >
                              {s.isActive ? 'Actif' : 'Suspendu'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
