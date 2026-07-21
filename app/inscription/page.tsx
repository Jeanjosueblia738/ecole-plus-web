'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { School, Loader2, CheckCircle } from 'lucide-react';
import { enrollmentsApi } from '@/lib/api';

function InscriptionForm() {
  const searchParams = useSearchParams();
  const tenantCode = (searchParams.get('code') || 'ECOLE').toUpperCase();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    gender: 'MALE',
    dateOfBirth: '',
    levelRequested: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    parentPhone2: '',
    address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await enrollmentsApi.submitPublic({
        tenantCode,
        ...form,
        dateOfBirth: form.dateOfBirth || undefined,
        levelRequested: form.levelRequested || undefined,
        parentEmail: form.parentEmail || undefined,
        parentPhone2: form.parentPhone2 || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Envoi impossible. Vérifiez le code établissement.';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Demande envoyée</h1>
          <p className="text-sm text-gray-600">
            Votre demande de pré-inscription a été transmise à l&apos;établissement ({tenantCode}).
            Vous serez contacté(e) par la scolarité.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#1B3A6B] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <School className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Pré-inscription</h1>
          <p className="text-sm text-gray-500 mt-1">
            Établissement : <span className="font-mono font-semibold text-[#1B3A6B]">{tenantCode}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          {error && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">{error}</p>
          )}

          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Élève</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
              <input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
              <input required value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Genre</label>
              <select value={form.gender} onChange={(e) => set('gender', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white">
                <option value="MALE">Garçon</option>
                <option value="FEMALE">Fille</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date de naissance</label>
              <input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Niveau demandé</label>
              <input value={form.levelRequested} onChange={(e) => set('levelRequested', e.target.value)}
                placeholder="ex: 6ème, Terminale A…"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>

          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide pt-2">Parent / tuteur</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom du parent *</label>
              <input required value={form.parentName} onChange={(e) => set('parentName', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone *</label>
              <input required value={form.parentPhone} onChange={(e) => set('parentPhone', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone 2</label>
              <input value={form.parentPhone2} onChange={(e) => set('parentPhone2', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.parentEmail} onChange={(e) => set('parentEmail', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
              <input value={form.address} onChange={(e) => set('address', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Remarques</label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#1B3A6B] text-white py-3 rounded-xl font-medium hover:bg-blue-800 disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Envoyer la demande'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
      </div>
    }>
      <InscriptionForm />
    </Suspense>
  );
}
