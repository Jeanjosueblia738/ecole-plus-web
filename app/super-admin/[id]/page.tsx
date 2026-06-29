'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Building2, Users, CheckCircle, XCircle,
  RefreshCw, ShieldOff, Shield, DollarSign, Clock,
  GraduationCap, LogOut, Mail, Phone, MapPin
} from 'lucide-react';
import api from '@/lib/api';

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

const PLANS = ['TRIAL', 'STARTER', 'PRO', 'GROUP', 'ENTERPRISE'];

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [saUser, setSaUser] = useState<any>({});

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sa_token') : '';
    return { Authorization: `Bearer ${token}` };
  };

  const handleLogout = () => {
    localStorage.removeItem('sa_token');
    localStorage.removeItem('sa_user');
    router.push('/super-admin/login');
  };

  useEffect(() => {
    const saToken = typeof window !== 'undefined' ? localStorage.getItem('sa_token') : null;
    if (!saToken) { router.push('/super-admin/login'); return; }
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('sa_user') || '{}') : {};
    setSaUser(user);
    if (id) { loadTenant(); }
  }, [id]);

  const loadTenant = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/tenants/${id}`, { headers: getHeaders() });
      setTenant(data);
      setSelectedPlan(data.plan);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleStatus = async () => {
    setActionLoading(true);
    try {
      const action = tenant.isActive ? 'suspend' : 'activate';
      await api.patch(`/tenants/${id}/${action}`, {}, { headers: getHeaders() });
      setTenant((t: any) => ({ ...t, isActive: !t.isActive }));
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const upgradePlan = async () => {
    if (!selectedPlan || selectedPlan === tenant.plan) { return; }
    setUpgrading(true);
    try {
      await api.patch(`/subscription/${id}/upgrade`, { plan: selectedPlan }, { headers: getHeaders() });
      setTenant((t: any) => ({ ...t, plan: selectedPlan }));
    } catch (e) { console.error(e); }
    finally { setUpgrading(false); }
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  }) : '—';
  const fmt = (n: number) => new Intl.NumberFormat('fr-CI').format(n ?? 0) + ' FCFA';

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar Super Admin */}
      <nav className="bg-[#1B3A6B] text-white px-6 h-16 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-wide">ECOLE+</span>
          <span className="ml-3 px-3 py-1 bg-yellow-400/20 text-yellow-200 text-xs rounded-full border border-yellow-400/30 font-medium">
            Super Administration
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/super-admin')}
            className="flex items-center gap-2 px-3 py-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour à la liste
          </button>
          <span className="text-blue-200 text-sm">{saUser.firstName} {saUser.lastName}</span>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl text-sm transition-colors">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 space-y-6">

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full" />
          </div>
        ) : !tenant ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Établissement introuvable</p>
            <button onClick={() => router.push('/super-admin')}
              className="mt-4 px-4 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm">
              Retour à la liste
            </button>
          </div>
        ) : (
          <>
            {/* En-tête */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#1B3A6B]/10 rounded-xl flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-[#1B3A6B]" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-800">{tenant.name}</h1>
                    <p className="text-sm text-gray-500 font-mono">Code MENA : {tenant.code}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${PLAN_COLORS[tenant.plan]}`}>
                        {PLAN_LABELS[tenant.plan] ?? tenant.plan}
                      </span>
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg ${
                        tenant.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {tenant.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {tenant.isActive ? 'Actif' : 'Suspendu'}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={toggleStatus} disabled={actionLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    tenant.isActive
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
                      : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                  }`}>
                  {actionLoading
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : tenant.isActive ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  {tenant.isActive ? 'Suspendre' : 'Réactiver'}
                </button>
              </div>
            </div>

            {/* Infos + Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#1B3A6B]" /> Coordonnées
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">{tenant.email}</span>
                  </div>
                  {tenant.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700">{tenant.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">{tenant.city ?? '—'}, {tenant.country ?? 'CI'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-500">Inscrit le {fmtDate(tenant.createdAt)}</span>
                  </div>
                  {tenant.trialEndsAt && (
                    <div className="mt-2 bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                      <p className="text-xs text-yellow-700 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Fin essai : {fmtDate(tenant.trialEndsAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#1B3A6B]" /> Statistiques
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <Users className="w-5 h-5 text-blue-600 mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{tenant._count?.users ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Utilisateurs</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <GraduationCap className="w-5 h-5 text-purple-600 mb-2" />
                    <p className="text-2xl font-bold text-purple-600">{tenant._count?.students ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Élèves</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Abonnement actuel */}
            {tenant.subscription && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#1B3A6B]" /> Abonnement actuel
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Montant</p>
                    <p className="font-bold text-green-600">{fmt(tenant.subscription.priceXof)}/mois</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Début</p>
                    <p className="font-medium text-sm">{fmtDate(tenant.subscription.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Expiration</p>
                    <p className="font-medium text-sm">{fmtDate(tenant.subscription.endDate)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Changer de plan */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-800 mb-4">Changer de plan</h2>
              <div className="flex gap-3 items-center">
                <select value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                  {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p] ?? p}</option>)}
                </select>
                <button onClick={upgradePlan} disabled={upgrading || selectedPlan === tenant.plan}
                  className="px-6 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-40 flex items-center gap-2">
                  {upgrading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Appliquer
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}