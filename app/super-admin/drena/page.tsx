'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, MapPin, Users, RefreshCw, GraduationCap, LogOut, Activity, UserCog, Layers,
} from 'lucide-react';
import api from '@/lib/api';
import { saAuth } from '@/lib/sa-auth';

export default function DrenaDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [saUser, setSaUser] = useState<any>({});

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!saAuth.isLoggedIn()) { router.push('/super-admin/login'); return; }
    setSaUser(saAuth.getUser() || {});
    loadStats();
  }, [mounted, router]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tenants/stats', { headers: saAuth.authHeader() });
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await saAuth.clear();
    router.push('/super-admin/login');
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#1B3A6B] text-white px-6 h-16 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6" />
          <span className="font-bold text-lg">ECOLE+</span>
          <span className="ml-2 px-3 py-1 bg-blue-400/20 text-blue-100 text-xs rounded-full border border-blue-400/30">
            Dashboard DRENA
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/super-admin')}
            className="text-sm text-blue-200 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10">
            Établissements
          </button>
          <button onClick={() => router.push('/super-admin/groups')}
            className="text-sm text-blue-200 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10">
            Groupes
          </button>
          <span className="text-blue-200 text-sm hidden sm:inline">{saUser.firstName} {saUser.lastName}</span>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl text-sm">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Vue DRENA — Statistiques territoriales</h1>
            {stats?.generatedAt && (
              <p className="text-xs text-gray-400 mt-1">
                Généré le {new Date(stats.generatedAt).toLocaleString('fr-FR')}
              </p>
            )}
          </div>
          <button onClick={loadStats}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-white bg-white">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-[#1B3A6B] border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Établissements', value: stats?.totalEtablissements ?? '—', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
                { title: 'Effectif total', value: stats?.effectifsTotal ?? '—', icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
                { title: 'Actifs', value: stats?.etablissementsActifs ?? '—', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { title: 'Impayés (frais)', value: stats?.impayesTotal ?? '—', icon: Layers, color: 'text-red-500', bg: 'bg-red-50' },
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

            {stats?.parVille?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-gray-800">Répartition par ville</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Ville', 'Écoles', 'Actives', 'Élèves'].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stats.parVille.map((v: any) => (
                        <tr key={v.city} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{v.city}</td>
                          <td className="px-4 py-3 text-sm">{v.schools}</td>
                          <td className="px-4 py-3 text-sm">{v.active}</td>
                          <td className="px-4 py-3 text-sm">{v.students}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {stats?.ecoles?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">Détail par établissement</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['École', 'Ville', 'Code', 'Élèves', 'Absences 30j', 'Impayés', 'Statut'].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {stats.ecoles.map((e: any) => (
                        <tr key={e.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{e.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{e.city ?? '—'}</td>
                          <td className="px-4 py-3 text-sm font-mono text-[#1B3A6B]">{e.code}</td>
                          <td className="px-4 py-3 text-sm">{e.students ?? 0}</td>
                          <td className="px-4 py-3 text-sm">
                            {e.absenceRate30d != null ? `${e.absenceRate30d} %` : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">{e.unpaidFees ?? 0}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${e.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                              {e.isActive ? 'Actif' : 'Suspendu'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
