'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, User, CheckCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import Cookies from 'js-cookie';

const CITIES = ['Abidjan', 'Bouaké', 'Daloa', 'San-Pédro', 'Korhogo', 'Man', 'Gagnoa', 'Divo', 'Autre'];
const PLANS = ['TRIAL', 'STARTER', 'PRO', 'GROUP', 'ENTERPRISE'];

export default function NouvelEtablissementPage() {
  const router = useRouter();

  useEffect(() => {
    const saToken = typeof window !== 'undefined' ? localStorage.getItem('sa_token') : null;
    if (!saToken) { router.push('/super-admin/login'); }
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '', code: '', city: 'Abidjan', email: '', phone: '', address: '',
    plan: 'TRIAL',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '',
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const getHeaders = () => {
    const token = Cookies.get('sa_token');
    return { Authorization: `Bearer ${token}` };
  };

  const handleSubmit = async () => {
    if (!form.name || !form.code || !form.email || !form.adminEmail || !form.adminPassword) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (!/^\d{6}$/.test(form.code)) {
      setError('Le code MENA doit contenir exactement 6 chiffres');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/tenants', {
        name: form.name.trim(),
        code: form.code.trim(),
        city: form.city,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        plan: form.plan,
        adminFirstName: form.adminFirstName.trim(),
        adminLastName: form.adminLastName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
      }, { headers: getHeaders() });
      setSuccess(true);
      setTimeout(() => router.push('/super-admin'), 2000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar Super Admin */}
      <nav className="bg-[#1B3A6B] text-white px-6 h-16 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/super-admin')}
            className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <span className="text-white/30 mx-2">|</span>
          <span className="font-bold">Nouvel établissement</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto p-6 space-y-6">

        {/* Succès */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">Établissement créé ! Redirection...</p>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Section établissement */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#1B3A6B]" /> Informations de l'établissement
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'établissement *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="ex: Lycée Excellence d'Abidjan"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code MENA * (6 chiffres)</label>
                <input value={form.code}
                  onChange={e => set('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="058049" maxLength={6} inputMode="numeric"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                <select value={form.city} onChange={e => set('city', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="contact@ecole.ci"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+225 07 00 00 00"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select value={form.plan} onChange={e => set('plan', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input value={form.address} onChange={e => set('address', e.target.value)}
                  placeholder="Quartier, commune..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              </div>
            </div>
          </div>
        </div>

        {/* Section compte admin */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#1B3A6B]" /> Compte administrateur
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                <input value={form.adminFirstName} onChange={e => set('adminFirstName', e.target.value)}
                  placeholder="Jean"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input value={form.adminLastName} onChange={e => set('adminLastName', e.target.value)}
                  placeholder="Kouassi"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email admin *</label>
              <input type="email" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)}
                placeholder="directeur@ecole.ci"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
              <input type="password" value={form.adminPassword} onChange={e => set('adminPassword', e.target.value)}
                placeholder="Min. 8 caractères"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-3">
          <button onClick={() => router.push('/super-admin')}
            className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading || success}
            className="flex-1 bg-[#1B3A6B] text-white py-3 rounded-xl font-medium hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</> : 'Créer l\'établissement'}
          </button>
        </div>

      </main>
    </div>
  );
}
