'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GraduationCap, Loader2, Building2 } from 'lucide-react';
import api from '@/lib/api';
import { saAuth } from '@/lib/sa-auth';

const PLANS = [
  { value: 'TRIAL', label: 'Essai (30j)' },
  { value: 'STARTER', label: 'Starter' },
  { value: 'PRO', label: 'Pro' },
  { value: 'GROUP', label: 'Groupe' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
];

export default function CreateTenantPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    code: '',
    name: '',
    city: '',
    email: '',
    phone: '',
    address: '',
    plan: 'TRIAL',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!saAuth.isLoggedIn()) router.push('/super-admin/login');
  }, [mounted, router]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post(
        '/tenants',
        {
          ...form,
          code: form.code.toUpperCase().trim(),
          phone: form.phone || undefined,
          address: form.address || undefined,
        },
        { headers: saAuth.authHeader() },
      );
      router.push('/super-admin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Création impossible');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#1B3A6B] text-white px-6 h-16 flex items-center gap-4 shadow-md">
        <button
          onClick={() => router.push('/super-admin')}
          className="p-2 rounded-lg hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <GraduationCap className="w-5 h-5" />
        <span className="font-bold">Nouvel établissement</span>
      </nav>

      <main className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#1B3A6B]" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-800">Créer un établissement</h1>
              <p className="text-sm text-gray-500">Compte admin école inclus</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="text-gray-600">Code MENA *</span>
                <input required value={form.code} onChange={(e) => set('code', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="ECOLE-ABJ" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Plan</span>
                <select value={form.plan} onChange={(e) => set('plan', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                  {PLANS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-gray-600">Nom de l&apos;établissement *</span>
                <input required value={form.name} onChange={(e) => set('name', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Ville *</span>
                <input required value={form.city} onChange={(e) => set('city', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Téléphone</span>
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-gray-600">Email établissement *</span>
                <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-gray-600">Adresse</span>
                <input value={form.address} onChange={(e) => set('address', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </label>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Administrateur école</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-sm">
                  <span className="text-gray-600">Prénom *</span>
                  <input required value={form.adminFirstName} onChange={(e) => set('adminFirstName', e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">Nom *</span>
                  <input required value={form.adminLastName} onChange={(e) => set('adminLastName', e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">Email admin *</span>
                  <input required type="email" value={form.adminEmail} onChange={(e) => set('adminEmail', e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">Mot de passe *</span>
                  <input required type="password" minLength={8} value={form.adminPassword}
                    onChange={(e) => set('adminPassword', e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-900 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Créer l&apos;établissement
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
