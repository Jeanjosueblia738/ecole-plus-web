'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Key, Copy, Check } from 'lucide-react';
import PhotoUpload from '@/components/PhotoUpload';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { studentsApi, classesApi } from '@/lib/api';
import { currentSchoolYear } from '@/lib/school-year';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';

export default function NouvelElevePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<any>(null);
  const [copied, setCopied] = useState('');

  const [form, setForm] = useState({
    firstName: '', lastName: '', registrationNo: '',
    dateOfBirth: '', gender: 'MALE', classId: '',
    niveauPrecedent: '', statut: 'AFFECTE',
    parentName: '', parentPhone: '', parentEmail: '',
    address: '', photoUrl: '',
  });
  const [tempId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!hasRole(authStorage.getUser()?.role, can.createStudent)) {
      router.push('/eleves');
      return;
    }
    setReady(true);
    classesApi.getAll(currentSchoolYear()).then(({ data }) => setClasses(data));
  }, [router]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.registrationNo) {
      setError('Veuillez remplir les champs obligatoires'); return;
    }
    if (form.statut === 'AFFECTE' && !form.classId) {
      setError('Choisissez une classe pour un élève affecté'); return;
    }
    setSaving(true); setError('');
    try {
      const { data } = await studentsApi.create({
        firstName: form.firstName,
        lastName: form.lastName,
        registrationNo: form.registrationNo,
        gender: form.gender,
        statut: form.statut,
        classId: form.classId || undefined,
        niveauPrecedent: form.niveauPrecedent || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        parentName: form.parentName || undefined,
        parentPhone: form.parentPhone || undefined,
        parentEmail: form.parentEmail || undefined,
        address: form.address || undefined,
        photoUrl: form.photoUrl || undefined,
      });
      setCreated(data);
    } catch (e: any) {
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  const copyCode = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  if (!ready) { return null; }

  if (created) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Élève inscrit" subtitle={`${created.firstName} ${created.lastName}`} />
          <main className="flex-1 p-6">
            <div className="max-w-xl mx-auto space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm">
                Inscription réussie. Communiquez ces codes pour l&apos;application mobile.
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
                <div className="flex items-center gap-2 text-[#1B3A6B] font-semibold">
                  <Key className="w-5 h-5" /> Codes d&apos;accès mobile
                </div>
                {[
                  { key: 'eleve', label: 'Code élève', value: created.accessCode },
                  { key: 'parent', label: 'Code parent', value: created.parentAccessCode },
                ].map((c) => (
                  <div key={c.key} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-xs text-gray-500">{c.label}</p>
                      <p className="font-mono text-lg font-bold text-gray-800 tracking-wider">{c.value || '—'}</p>
                    </div>
                    {c.value && (
                      <button type="button" onClick={() => copyCode(c.value, c.key)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                        {copied === c.key ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        {copied === c.key ? 'Copié' : 'Copier'}
                      </button>
                    )}
                  </div>
                ))}
                <p className="text-xs text-gray-500">
                  Élève : connexion mobile avec le <strong>matricule</strong> + mot de passe
                  (après activation du code). Parent : email enregistré + mot de passe.
                  Un même email parent peut rattacher plusieurs enfants (même mot de passe sur chaque code).
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => router.push(`/eleves/${created.id}`)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Voir le dossier
                </button>
                <button onClick={() => router.push('/eleves')}
                  className="px-5 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800">
                  Retour à la liste
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Nouvel élève" subtitle="Inscription / création du dossier scolaire" />
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
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
                <p className="text-sm font-semibold text-gray-700 mb-4">Photo d&apos;identité</p>
                <PhotoUpload
                  name={form.firstName && form.lastName ? `${form.firstName} ${form.lastName}` : 'Élève'}
                  folder="eleves"
                  entityId={tempId}
                  onUpload={(url) => setForm(f => ({ ...f, photoUrl: url }))}
                  size="lg"
                />
              </div>

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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Niveau précédent</label>
                    <input value={form.niveauPrecedent} onChange={e => set('niveauPrecedent', e.target.value)}
                      placeholder="ex: 5ème"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut *</label>
                    <select value={form.statut} onChange={e => {
                      const v = e.target.value;
                      set('statut', v);
                      if (v === 'NON_AFFECTE') set('classId', '');
                    }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                      <option value="AFFECTE">Affecté</option>
                      <option value="NON_AFFECTE">Non affecté</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Classe {form.statut === 'AFFECTE' ? '*' : '(optionnel)'}
                    </label>
                    <select value={form.classId} onChange={e => set('classId', e.target.value)}
                      disabled={form.statut === 'NON_AFFECTE'}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] disabled:bg-gray-100">
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

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-800 mb-4">Informations du parent / tuteur</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du parent</label>
                    <input value={form.parentName} onChange={e => set('parentName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input value={form.parentPhone} onChange={e => set('parentPhone', e.target.value)}
                      placeholder="+225 07 00 00 00"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email parent (requis pour le compte mobile parent)</label>
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
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
                    : <><Save className="w-4 h-4" /> Inscrire</>}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
