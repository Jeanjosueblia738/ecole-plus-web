'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import PhotoUpload from '@/components/PhotoUpload';
import { studentsApi, classesApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';

export default function NouvelElevePage() {
  const router = useRouter();
  const user = authStorage.getUser();
  const canCreate = ['ADMIN', 'SECRETARY'].includes(user?.role ?? '');
  const [classes, setClasses] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tempId] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState({
    registrationNo: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'MALE',
    classId: '',
    address: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    parentPhone2: '',
    photoUrl: '',
  });

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!canCreate) { router.push('/eleves'); return; }
    classesApi.getAll('2025-2026').then(({ data }) => {
      setClasses(data);
      if (data.length > 0) setForm(f => ({ ...f, classId: data[0].id }));
    });
  }, []);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await studentsApi.create(form);
      router.push('/eleves');
    } catch (err: any) {
      setError(err.response?.data?.message?.join(', ') || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Ajouter un élève" subtitle="Inscription d'un nouvel élève" />
        <main className="flex-1 p-6 max-w-3xl">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Photo d'identité */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
              <p className="text-sm font-semibold text-gray-700 mb-4">Photo d'identité</p>
              <PhotoUpload
                name={form.firstName && form.lastName ? `${form.firstName} ${form.lastName}` : 'Élève'}
                folder="eleves"
                entityId={tempId}
                onUpload={(url) => set('photoUrl', url)}
                size="lg"
              />
            </div>

            {/* Infos personnelles */}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Matricule *</label>
                  <input required placeholder="ex: LYC-2026-002" value={form.registrationNo}
                    onChange={e => set('registrationNo', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                  <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Genre *</label>
                  <select value={form.gender} onChange={e => set('gender', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="MALE">Garçon</option>
                    <option value="FEMALE">Fille</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Classe *</label>
                  <select required value={form.classId} onChange={e => set('classId', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.level}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input value={form.address} onChange={e => set('address', e.target.value)}
                    placeholder="Quartier, ville..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Contact parent */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-800 mb-4">Contact parent / tuteur</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du parent</label>
                  <input value={form.parentName} onChange={e => set('parentName', e.target.value)}
                    placeholder="Nom complet"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone principal</label>
                  <input value={form.parentPhone} onChange={e => set('parentPhone', e.target.value)}
                    placeholder="+225 07 00 00 00"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email parent</label>
                  <input type="email" value={form.parentEmail} onChange={e => set('parentEmail', e.target.value)}
                    placeholder="parent@email.ci"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone secondaire</label>
                  <input value={form.parentPhone2} onChange={e => set('parentPhone2', e.target.value)}
                    placeholder="+225 05 00 00 00"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-4 justify-end">
              <button type="button" onClick={() => router.back()}
                className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Enregistrement...</> : <><Save className="w-4 h-4" />Inscrire l'élève</>}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
