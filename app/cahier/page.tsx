'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Plus, ChevronDown, Save, Loader2,
  Calendar, Clock, Trash2, X, CheckCircle, PenLine,
  FileCheck, AlertCircle
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { classesApi, cahierApi } from '@/lib/api';
import { currentSchoolYear } from '@/lib/school-year';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';

interface Entry {
  id: string;
  subject: string;
  date: string;
  planCours: string;
  prochainCours?: string;
  devoirDescription?: string;
  devoirDateRemise?: string;
  sequence?: string;
  trimestre: string;
  isEmarge: boolean;
  emargeAt?: string;
  class: { name: string; level: string };
  teacher?: { firstName: string; lastName: string };
}

interface FormState {
  subject: string;
  date: string;
  trimestre: string;
  planCours: string;
  prochainCours: string;
  devoirDescription: string;
  devoirDateRemise: string;
  sequence: string;
}

const emptyForm: FormState = {
  subject: '',
  date: new Date().toISOString().split('T')[0],
  trimestre: 'T1',
  planCours: '',
  prochainCours: '',
  devoirDescription: '',
  devoirDateRemise: '',
  sequence: '',
};

export default function CahierPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [trimestre, setTrimestre] = useState('T1');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emarging, setEmarging] = useState<string | null>(null);

  const user = authStorage.getUser();
  const canWrite = hasRole(user?.role, can.writeCahier);
  const canValidate = hasRole(user?.role, can.validateCahier);
  const canDelete = hasRole(user?.role, can.writeCahier);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!hasRole(authStorage.getUser()?.role, can.viewCahier)) {
      router.push('/dashboard');
      return;
    }
    classesApi.getAll(currentSchoolYear()).then(({ data }) => {
      setClasses(data);
      if (data.length > 0) setSelectedClass(data[0].id);
    });
  }, [router]);

  useEffect(() => {
    if (!selectedClass) return;
    loadEntries();
  }, [selectedClass, trimestre]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const { data } = await cahierApi.getByClass(selectedClass, trimestre);
      setEntries(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const set = (key: keyof FormState, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) { return; }
    setSaving(true);
    try {
      await cahierApi.create({
        classId: selectedClass,
        subject: form.subject,
        date: form.date,
        trimestre,
        planCours: form.planCours,
        prochainCours: form.prochainCours || undefined,
        devoirDescription: form.devoirDescription || undefined,
        devoirDateRemise: form.devoirDateRemise || undefined,
        sequence: form.sequence || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setForm(emptyForm);
      setShowForm(false);
      loadEntries();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleEmargement = async (id: string) => {
    if (!canValidate) { return; }
    setEmarging(id);
    try {
      await cahierApi.emargement(id);
      setEntries(e => e.map(en => en.id === id ? { ...en, isEmarge: true, emargeAt: new Date().toISOString() } : en));
    } catch (e) { console.error(e); }
    finally { setEmarging(null); }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) { return; }
    if (!confirm('Supprimer cette entrée ?')) return;
    await cahierApi.delete(id);
    setEntries(e => e.filter(en => en.id !== id));
  };

  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || '';
  const nonEmarges = entries.filter(e => !e.isEmarge).length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Cahier de texte"
          subtitle={`${selectedClassName} — Registre pédagogique officiel`}
        />
        <main className="flex-1 p-6">

          {!canWrite && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <p className="text-sm text-blue-700 font-medium">
                {canValidate
                  ? 'Mode validation — Vous pouvez valider les séances. Seuls les enseignants saisissent le contenu.'
                  : 'Mode lecture — Seuls les enseignants saisissent le cahier de texte.'}
              </p>
            </div>
          )}

          {nonEmarges > 0 && canValidate && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
              <p className="text-sm text-orange-700">
                <span className="font-bold">{nonEmarges} entrée(s)</span> en attente de validation.
              </p>
            </div>
          )}

          {/* Barre d'outils */}
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <div className="relative">
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={trimestre} onChange={e => setTrimestre(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="T1">1er Trimestre</option>
                <option value="T2">2ème Trimestre</option>
                <option value="T3">3ème Trimestre</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-gray-500">{entries.length} séance(s)</span>
              {canWrite && (
                <button onClick={() => setShowForm(!showForm)}
                  className="flex items-center gap-2 bg-[#1B3A6B] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors">
                  <Plus className="w-4 h-4" />
                  Nouvelle séance
                </button>
              )}
            </div>
          </div>

          {/* Formulaire — uniquement pour canWrite */}
          {showForm && canWrite && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <PenLine className="w-5 h-5 text-blue-600" />
                  Nouvelle entrée du cahier de texte
                </h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Matière *</label>
                    <input required value={form.subject} onChange={e => set('subject', e.target.value)}
                      placeholder="ex: Mathématiques"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Date *</label>
                    <input type="date" required value={form.date} onChange={e => set('date', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Séquence / Chapitre</label>
                    <input value={form.sequence} onChange={e => set('sequence', e.target.value)}
                      placeholder="ex: Chap. 3 — Algèbre"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Trimestre</label>
                    <select value={form.trimestre} onChange={e => set('trimestre', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="T1">T1</option>
                      <option value="T2">T2</option>
                      <option value="T3">T3</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Plan du cours * <span className="text-gray-400 font-normal">(ce qui a été fait aujourd'hui)</span>
                  </label>
                  <textarea required value={form.planCours} onChange={e => set('planCours', e.target.value)}
                    rows={4} placeholder="Décrivez le contenu du cours, les notions abordées, les activités réalisées..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Prochain cours <span className="text-gray-400 font-normal">(annonce de la prochaine séance)</span>
                  </label>
                  <textarea value={form.prochainCours} onChange={e => set('prochainCours', e.target.value)}
                    rows={2} placeholder="Ce qui sera fait au prochain cours..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Devoir donné <span className="text-gray-400 font-normal">(description)</span>
                    </label>
                    <textarea value={form.devoirDescription} onChange={e => set('devoirDescription', e.target.value)}
                      rows={3} placeholder="Exercice page 42, problème n°5..."
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Date de remise du devoir</label>
                    <input type="date" value={form.devoirDateRemise} onChange={e => set('devoirDateRemise', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                    Annuler
                  </button>
                  <button type="submit" disabled={saving}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors
                      ${saved ? 'bg-green-600' : 'bg-[#1B3A6B] hover:bg-blue-800'} disabled:opacity-50`}>
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Enregistrement...</>
                      : saved ? <><CheckCircle className="w-4 h-4" />Enregistré !</>
                      : <><Save className="w-4 h-4" />Enregistrer</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tableau officiel du cahier de texte */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : entries.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Aucune séance enregistrée</p>
                {canWrite && <p className="text-sm mt-1">Cliquez sur "Nouvelle séance" pour commencer</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="bg-[#1B3A6B] text-white">
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase w-32">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase">Plan du cours</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase w-48">Prochain cours</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase w-40">Devoir</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase w-32">Émargement</th>
                      {canDelete && <th className="text-center px-4 py-3 text-xs font-semibold uppercase w-16"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entries.map((entry, idx) => (
                      <tr key={entry.id} className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-800 text-sm">
                              {new Date(entry.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                            <span className="text-xs text-blue-600 font-medium mt-0.5">{entry.subject}</span>
                            {entry.sequence && <span className="text-xs text-gray-400 mt-0.5">{entry.sequence}</span>}
                            {entry.teacher && (
                              <span className="text-xs text-gray-400 mt-1">
                                {entry.teacher.firstName} {entry.teacher.lastName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{entry.planCours}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          {entry.prochainCours
                            ? <p className="text-sm text-gray-600 italic">{entry.prochainCours}</p>
                            : <span className="text-gray-300 text-sm">—</span>}
                        </td>
                        <td className="px-4 py-4 align-top">
                          {entry.devoirDescription ? (
                            <div>
                              <p className="text-sm text-gray-700">{entry.devoirDescription}</p>
                              {entry.devoirDateRemise && (
                                <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(entry.devoirDateRemise).toLocaleDateString('fr-FR')}
                                </p>
                              )}
                            </div>
                          ) : <span className="text-gray-300 text-sm">—</span>}
                        </td>
                        <td className="px-4 py-4 align-top text-center">
                          {entry.isEmarge ? (
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                <FileCheck className="w-4 h-4 text-green-600" />
                              </div>
                              <span className="text-xs text-green-600 font-medium">Émargé</span>
                              {entry.emargeAt && (
                                <span className="text-xs text-gray-400">
                                  {new Date(entry.emargeAt).toLocaleDateString('fr-FR')}
                                </span>
                              )}
                            </div>
                          ) : canValidate ? (
                            <button onClick={() => handleEmargement(entry.id)} disabled={emarging === entry.id}
                              className="flex flex-col items-center gap-1 mx-auto group">
                              <div className="w-8 h-8 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center group-hover:border-blue-400 transition-colors">
                                {emarging === entry.id
                                  ? <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                  : <PenLine className="w-4 h-4 text-gray-300 group-hover:text-blue-400" />}
                              </div>
                              <span className="text-xs text-gray-400 group-hover:text-blue-500">Valider</span>
                            </button>
                          ) : (
                            <span className="text-xs text-gray-300">Non émargé</span>
                          )}
                        </td>
                        {canDelete && (
                          <td className="px-4 py-4 align-top text-center">
                            <button onClick={() => handleDelete(entry.id)}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}