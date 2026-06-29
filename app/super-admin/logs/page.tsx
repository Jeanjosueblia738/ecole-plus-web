'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, LogOut, ArrowLeft, Activity, Filter, RefreshCw, User } from 'lucide-react';
import api from '@/lib/api';

const ACTION_COLORS: Record<string, string> = {
  LOGIN:            'bg-blue-50 text-blue-700 border-blue-200',
  SUSPEND:          'bg-red-50 text-red-700 border-red-200',
  ACTIVATE:         'bg-green-50 text-green-700 border-green-200',
  CHANGE_PLAN:      'bg-purple-50 text-purple-700 border-purple-200',
  CREATE_ADMIN:     'bg-yellow-50 text-yellow-700 border-yellow-200',
  UPDATE_PASSWORD:  'bg-orange-50 text-orange-700 border-orange-200',
  ACTIVATE_ADMIN:   'bg-green-50 text-green-700 border-green-200',
  DEACTIVATE_ADMIN: 'bg-red-50 text-red-700 border-red-200',
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN:            '🔐 Connexion',
  SUSPEND:          '🚫 Suspension école',
  ACTIVATE:         '✅ Activation école',
  CHANGE_PLAN:      '💎 Changement plan',
  CREATE_ADMIN:     '👤 Création admin',
  UPDATE_PASSWORD:  '🔑 Modif. mot de passe',
  ACTIVATE_ADMIN:   '✅ Activation admin',
  DEACTIVATE_ADMIN: '🚫 Désactivation admin',
};

const ACTIONS = ['LOGIN', 'SUSPEND', 'ACTIVATE', 'CHANGE_PLAN', 'CREATE_ADMIN', 'UPDATE_PASSWORD', 'ACTIVATE_ADMIN', 'DEACTIVATE_ADMIN'];

export default function LogsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saUser, setSaUser] = useState<any>({});
  const [filterAction, setFilterAction] = useState('');
  const [filterDays, setFilterDays] = useState('90');

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('sa_token') ?? ''}`,
  });

  const handleLogout = () => {
    localStorage.removeItem('sa_token');
    localStorage.removeItem('sa_user');
    router.push('/super-admin/login');
  };

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) { return; }
    const saToken = localStorage.getItem('sa_token');
    if (!saToken) { router.push('/super-admin/login'); return; }
    setSaUser(JSON.parse(localStorage.getItem('sa_user') || '{}'));
    loadLogs();
  }, [mounted]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAction) { params.append('action', filterAction); }
      if (filterDays) { params.append('days', filterDays); }
      const { data } = await api.get(`/auth/super-admin/logs?${params}`, { headers: getHeaders() });
      setLogs(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  if (!mounted) { return null; }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#1B3A6B] text-white px-6 h-16 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">ECOLE+</span>
          <span className="ml-3 px-3 py-1 bg-yellow-400/20 text-yellow-200 text-xs rounded-full border border-yellow-400/30">
            Super Administration
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/super-admin')}
            className="flex items-center gap-2 px-3 py-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <span className="text-blue-200 text-sm">{saUser.firstName} {saUser.lastName}</span>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl text-sm">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#1B3A6B]" /> Journal d'activité
          </h1>
          <p className="text-sm text-gray-500">{logs.length} entrée(s)</p>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-3 flex-wrap items-center">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
            <option value="">Toutes les actions</option>
            {ACTIONS.map(a => <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>)}
          </select>
          <select value={filterDays} onChange={e => setFilterDays(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
          </select>
          <button onClick={loadLogs}
            className="flex items-center gap-2 px-4 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm hover:bg-blue-800">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Filtrer
          </button>
        </div>

        {/* Liste logs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun log trouvé</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map(log => (
                <div key={log.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#1B3A6B]/10 flex-shrink-0 flex items-center justify-center">
                    {log.superAdmin?.photoUrl
                      ? <img src={log.superAdmin.photoUrl} alt="" className="w-full h-full object-cover" />
                      : <User className="w-5 h-5 text-[#1B3A6B]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm">
                        {log.superAdmin?.firstName} {log.superAdmin?.lastName}
                      </p>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${ACTION_COLORS[log.action] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </div>
                    {log.details && <p className="text-sm text-gray-500 mt-0.5">{log.details}</p>}
                    {log.targetName && (
                      <p className="text-xs text-gray-400 mt-0.5">Cible : {log.targetName}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}