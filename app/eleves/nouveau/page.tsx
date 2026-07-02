'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { studentsApi, classesApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';

const ROLES_ALLOWED = ['ADMIN', 'SECRETARY'];

export default function NouvelElevePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    firstName: '', lastName: '', registrationNo: '',
    dateOfBirth: '', gender: 'MALE', classId: '',
    parentName: '', parentPhone: '', parentEmail: '',
    address: '',
  });

  useEffect(() => {
    // Vérification stricte côté client
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    const u = authStorage.getUser();
    if (!ROLES_ALLOWED.includes(u?.role ?? '')) {
      router.push('/eleves');
      return;
    }
    setReady(true);
    classesApi.getAll('2025-2026').then(({ data }) => setClasses(data));
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.registrationNo || !form.classId) {
      setError('Veuillez remplir tous les champs obligatoires'); return;
    }
    setSaving(true); setError('');
    try {
      await studentsApi.create({
        ...form,
        dateOfBirth: form.dateOfBirth || undefined,
        parentName: form.parentName || undefined,
        parentPhone: form.parentPhone || undefined,
        parentEmail: form.parentEmail || undefined,
        address: form.address || undefined,
      });
      router.push('/eleves');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  if (!ready) { return null; }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Nouvel élève" subtitle="Créer un nouveau dossier scolaire" />
        <main className="flex-1 p-6">
          <div className="max-w-2xl mx-auto">
            <button onClick={() => router.push('/eleves')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
              <ArrowLeft className="w-4 h-4" /> Retour à la liste
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Infos personnelles */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-800 mb-4">Informations personnelles</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                    <input value={form.firstName} onChange={e => set('firstName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                    <input value={form.lastName} onChange={e => set('lastName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Matricule *</label>
                    <input value={form.registrationNo} onChange={e => set('registrationNo', e.target.value)}
                      placeholder="ex: 2025001"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                    <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Genre *</label>
                    <select value={form.gender} onChange={e => set('gender', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                      <option value="MALE">Garçon</option>
                      <option value="FEMALE">Fille</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Classe *</label>
                    <select value={form.classId} onChange={e => set('classId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                      <option value="">Choisir une classe</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.level}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                    <input value={form.address} onChange={e => set('address', e.target.value)}
                      placeholder="Quartier, commune..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>
                </div>
              </div>

              {/* Infos parent */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-800 mb-4">Informations du parent</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du parent</label>
                    <input value={form.parentName} onChange={e => set('parentName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone parent</label>
                    <input value={form.parentPhone} onChange={e => set('parentPhone', e.target.value)}
                      placeholder="+225 07 00 00 00"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email parent</label>
                    <input type="email" value={form.parentEmail} onChange={e => set('parentEmail', e.target.value)}
                      placeholder="parent@email.com"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => router.push('/eleves')}
                  className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</> : <><Save className="w-4 h-4" /> Enregistrer</>}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}