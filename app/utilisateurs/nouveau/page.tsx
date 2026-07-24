'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import PhotoUpload from '@/components/PhotoUpload';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import api from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';

/** TEACHER retiré : créer via /enseignants (profil + matières). */
const ROLES = [
  { value: 'DIRECTOR', label: 'Directeur / Proviseur' },
  { value: 'CENSOR', label: 'Censeur / Directeur des études' },
  { value: 'SURVEILLANT', label: 'Surveillant Général' },
  { value: 'SECRETARY', label: 'Secrétaire Scolarité' },
  { value: 'ACCOUNTANT', label: 'Comptable' },
  { value: 'CASHIER', label: 'Caissier' },
  { value: 'EDUCATOR', label: 'Éducateur' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'STUDENT', label: 'Élève' },
];

export default function NouvelUtilisateurPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tempId] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'SECRETARY',
    phone: '',
    photoUrl: '',
  });

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!hasRole(authStorage.getUser()?.role, can.manageUsers)) {
      router.push('/dashboard');
    }
  }, [router]);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/users', form);
      router.push('/utilisateurs');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création du compte');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Créer un compte" subtitle="Nouveau membre du personnel" />
        <main className="flex-1 p-6 max-w-2xl">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Photo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-4">Photo de profil</p>
            <PhotoUpload
              name={form.firstName && form.lastName ? `${form.firstName} ${form.lastName}` : 'Utilisateur'}
              folder="eleves"
              entityId={tempId}
              onUpload={(url) => set('photoUrl', url)}
              size="lg"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-800 mb-4">Informations personnelles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                  <input required value={form.firstName} onChange={e => set('firstName', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input required value={form.lastName} onChange={e => set('lastName', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="prenom.nom@ecole.ci"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="+225 07 00 00 00"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
                  <select required value={form.role} onChange={e => set('role', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe provisoire *
                  </label>
                  <input type="password" required minLength={8} value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="Min. 8 caractères"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                La personne pourra modifier son mot de passe depuis son profil après la première connexion.
              </p>
            </div>

            <div className="flex gap-4 justify-end">
              <button type="button" onClick={() => router.back()}
                className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Création...</> : <><Save className="w-4 h-4" />Créer le compte</>}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}