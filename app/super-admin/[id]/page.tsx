'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Building2, Users, CheckCircle, XCircle,
  RefreshCw, Shield, ShieldOff, Mail, Phone, MapPin, Calendar
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import api from '@/lib/api';
import { authStorage } from '@/lib/auth';

const PLAN_COLORS: Record<string, string> = {
  TRIAL: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  STARTER: 'bg-blue-50 text-blue-700 border-blue-200',
  PRO: 'bg-purple-50 text-purple-700 border-purple-200',
  GROUP: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ENTERPRISE: 'bg-green-50 text-green-700 border-green-200',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur', DIRECTOR: 'Directeur', CENSOR: 'Censeur',
  TEACHER: 'Enseignant', SECRETARY: 'Secrétaire', ACCOUNTANT: 'Comptable',
  CASHIER: 'Caissier', SURVEILLANT: 'Surveillant', PARENT: 'Parent', STUDENT: 'Élève',
};

export default function TenantDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    loadTenant();
  }, [id]);

  const loadTenant = async () => {
    try {
      const { data } = await api.get(`/tenants/${id}`);
      setTenant(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleStatus = async () => {
    setActionLoading(true);
    try {
      const action = tenant.isActive ? 'suspend' : 'activate';
      await api.patch(`/tenants/${id}/${action}`);
      setTenant((t: any) => ({ ...t, isActive: !t.isActive }));
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  }) : '—';

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Établissement introuvable
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title={tenant.name} subtitle={`Code MENA : ${tenant.code}`} />
        <main className="flex-1 p-6 space-y-6">

          <button onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour à la liste
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Carte infos école */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-[#1B3A6B] rounded-xl flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-800">{tenant.name}</h2>
                    <span className="font-mono text-sm text-[#1B3A6B] font-bold">{tenant.code}</span>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  {tenant.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{tenant.email}</span>
                    </div>
                  )}
                  {tenant.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{tenant.phone}</span>
                    </div>
                  )}
                  {tenant.city && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{tenant.city}</span>
                    </div>
                  )}
                  {tenant.address && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400 opacity-0" />
                      <span className="text-gray-400">{tenant.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Créé le {fmtDate(tenant.createdAt)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Plan</span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${PLAN_COLORS[tenant.plan] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {tenant.plan}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Statut</span>
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold ${tenant.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {tenant.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {tenant.isActive ? 'Actif' : 'Suspendu'}
                    </span>
                  </div>
                  {tenant.trialEndsAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Fin d'essai</span>
                      <span className="text-sm font-medium text-yellow-600">{fmtDate(tenant.trialEndsAt)}</span>
                    </div>
                  )}
                </div>

                <button onClick={toggleStatus} disabled={actionLoading}
                  className={`w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                    tenant.isActive
                      ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                      : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                  }`}>
                  {actionLoading
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : tenant.isActive ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  {tenant.isActive ? 'Suspendre l\'établissement' : 'Réactiver l\'établissement'}
                </button>
              </div>

              {/* Abonnement */}
              {tenant.subscription && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">Abonnement</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Plan</span>
                      <span className="font-medium">{tenant.subscription.plan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Prix/mois</span>
                      <span className="font-medium text-green-600">
                        {new Intl.NumberFormat('fr-CI').format(tenant.subscription.priceXof)} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Début</span>
                      <span className="font-medium">{fmtDate(tenant.subscription.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fin</span>
                      <span className="font-medium">{fmtDate(tenant.subscription.endDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Statut</span>
                      <span className={`font-medium ${tenant.subscription.isActive ? 'text-green-600' : 'text-red-500'}`}>
                        {tenant.subscription.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Utilisateurs */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#1B3A6B]" />
                  <h3 className="font-semibold text-gray-800">
                    Comptes utilisateurs ({tenant.users?.length ?? 0})
                  </h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {tenant.users?.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">Aucun utilisateur</p>
                  ) : tenant.users?.map((u: any) => (
                    <div key={u.id} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#1B3A6B]/10 rounded-full flex items-center justify-center">
                          <span className="text-[#1B3A6B] font-bold text-sm">
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg font-medium">
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {u.lastLoginAt && (
                          <span className="text-xs text-gray-400">
                            Connecté {fmtDate(u.lastLoginAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}