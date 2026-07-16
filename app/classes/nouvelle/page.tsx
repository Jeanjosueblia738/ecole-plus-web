'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { classesApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

export default function NouvelleClassePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    level: '',
    year: currentSchoolYear(),
    capacity: '40',
  });

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    const role = authStorage.getUser()?.role;
    if (!hasRole(role, can.createClass)) { router.push('/classes'); }
  }, [router]);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await classesApi.create({
        name: form.name.trim(),
        level: form.level.trim(),
        year: form.year.trim().replace(/\s+/g, ''),
        capacity: Number(form.capacity) || 40,
      });
      router.push('/classes');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Nouvelle classe" subtitle="Création d'une classe pour l'année scolaire" />
        <main className="flex-1 p-6 max-w-2xl">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la classe *</label>
              <input required value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="ex: 6ème A"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Niveau *</label>
              <input required value={form.level} onChange={(e) => set('level', e.target.value)}
                placeholder="ex: 6ème, 5ème, Terminale…"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Année scolaire *</label>
                <input required value={form.year} onChange={(e) => set('year', e.target.value)}
                  placeholder={currentSchoolYear()}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">
                  Format CIV : {currentSchoolYear()} (sept→août). Une année différente n&apos;apparaîtra pas dans le filtre « année en cours ».
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacité *</label>
                <input required type="number" min={1} value={form.capacity}
                  onChange={(e) => set('capacity', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="flex gap-4 justify-end pt-2">
              <button type="button" onClick={() => router.back()}
                className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Enregistrement…</> : <><Save className="w-4 h-4" />Créer la classe</>}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
