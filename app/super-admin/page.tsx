'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Users, TrendingUp, CheckCircle, XCircle,
  RefreshCw, Plus, Search, Eye, ShieldOff, Shield,
  BarChart2, DollarSign, Clock
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import api from '@/lib/api';
import { authStorage } from '@/lib/auth';

const PLAN_COLORS: Record<string, string> = {
  TRIAL:      'bg-yellow-50 text-yellow-700 border-yellow-200',
  STARTER:    'bg-blue-50 text-blue-700 border-blue-200',
  PRO:        'bg-purple-50 text-purple-700 border-purple-200',
  GROUP:      'bg-indigo-50 text-indigo-700 border-indigo-200',
  ENTERPRISE: 'bg-green-50 text-green-700 border-green-200',
};

const PLAN_LABELS: Record<string, string> = {
  TRIAL: 'Essai', STARTER: 'Starter', PRO: 'Pro',
  GROUP: 'Groupe', ENTERPRISE: 'Enterprise',
};

export default function SuperAdminPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    loadData();
  }, [page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, statsRes] = await Promise.allSettled([
        api.get(`/tenants?page=${page}&limit=15`),
        api.get('/tenants/stats'),
      ]);
      if (tenantsRes.status === 'fulfilled') {
        setTenants(tenantsRes.value.data.data);
        setMeta(tenantsRes.value.data.meta);
      }
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleStatus = async (id: string, isActive: boolean) => {
    setActionLoading(id);
    try {
      await api.patch(`/tenants/${id}/${isActive ? 'suspend' : 'activate'}`);
      setTenants(t => t.map(x => x.id === id ? { ...x, isActive: !isActive } : x));
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('fr-CI').format(n ?? 0) + ' FCFA';
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q) || t.city?.toLowerCase().includes(q);
    const matchPlan = filterPlan === 'ALL' || t.plan === filterPlan;
    const matchStatus = filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && t.isActive) ||
      (filterStatus === 'SUSPENDED' && !t.isActive);
    return matchSearch && matchPlan && matchStatus;
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Super Administration" subtitle="Gestion des établissements ECOLE+" />
        <main className="flex-1 p-6 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Établissements', value: stats?.totalEtablissements ?? '—', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
              { title: 'Actifs', value: stats?.etablissementsActifs ?? '—', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
              { title: 'Suspendus', value: stats?.etablissementsSuspendus ?? '—', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
              { title: 'MRR', value: fmt(stats?.revenusRecurrentsXof ?? 0), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((k) => (
              <div key={k.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-500">{k.title}</p>
                  <div className={`w-9 h-9 ${k.bg} rounded-lg flex items-center justify-center`}>
                    <k.icon className={`w-5 h-5 ${k.color}`} />
                  </div>
                </div>
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Répartition par plan */}
          {stats?.repartitionParPlan && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-500" /> Répartition par plan
              </h3>
              <div className="flex gap-3 flex-wrap">
                {stats.repartitionParPlan.map((p: any) => (
                  <div key={p.plan} className={`px-4 py-2 rounded-xl border text-sm font-medium ${PLAN_COLORS[p.plan] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {PLAN_LABELS[p.plan] ?? p.plan} — {p._count.id} école(s)
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtres + Actions */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
              <div className="flex gap-3 flex-wrap flex-1">
                {/* Recherche */}
                <div className="relative flex-1 min-w-48">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Nom, code, ville..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                </div>
                {/* Filtre plan */}
                <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                  <option value="ALL">Tous les plans</option>
                  {Object.entries(PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {/* Filtre statut */}
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                  <option value="ALL">Tous statuts</option>
                  <option value="ACTIVE">Actifs</option>
                  <option value="SUSPENDED">Suspendus</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={loadData}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
                  <RefreshCw className="w-4 h-4" /> Actualiser
                </button>
                <button onClick={() => router.push('/super-admin/nouveau')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm hover:bg-blue-800">
                  <Plus className="w-4 h-4" /> Nouvel établissement
                </button>
              </div>
            </div>
          </div>

          {/* Table des tenants */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">
                Établissements ({filtered.length})
              </h3>
              {meta && (
                <p className="text-sm text-gray-400">
                  Page {meta.page} / {meta.pages} — {meta.total} total
                </p>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun établissement trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Établissement', 'Code MENA', 'Ville', 'Plan', 'Statut', 'Fin essai', 'Utilisateurs', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{t.name}</p>
                            <p className="text-xs text-gray-400">{t.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-bold text-[#1B3A6B]">{t.code}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{t.city ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${PLAN_COLORS[t.plan] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {PLAN_LABELS[t.plan] ?? t.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-xs font-medium w-fit px-2 py-1 rounded-lg ${t.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                            {t.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {t.isActive ? 'Actif' : 'Suspendu'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {t.trialEndsAt ? (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {fmtDate(t.trialEndsAt)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-gray-400" />
                            {t._count?.users ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/super-admin/${t.id}`)}
                              className="p-1.5 text-gray-400 hover:text-[#1B3A6B] hover:bg-blue-50 rounded-lg transition-colors"
                              title="Voir détails">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleStatus(t.id, t.isActive)}
                              disabled={actionLoading === t.id}
                              className={`p-1.5 rounded-lg transition-colors ${t.isActive
                                ? 'text-red-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-green-500 hover:text-green-700 hover:bg-green-50'}`}
                              title={t.isActive ? 'Suspendre' : 'Activer'}>
                              {actionLoading === t.id
                                ? <RefreshCw className="w-4 h-4 animate-spin" />
                                : t.isActive
                                  ? <ShieldOff className="w-4 h-4" />
                                  : <Shield className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {meta && meta.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50">
                  ← Précédent
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(meta.pages, 5) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === p ? 'bg-[#1B3A6B] text-white' : 'border border-gray-200 hover:bg-gray-50'}`}>
                      {p}
                    </button>
                  ))}
                </div>
                <button onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={page === meta.pages}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50">
                  Suivant →
                </button>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}