'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck, Plus, ChevronDown, Loader2, Trash2, X, AlertCircle,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { examensApi, classesApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { canAccessPath, hasRole } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

const EXAM_TYPES = [
  { value: 'DEVOIR', label: 'Devoir' },
  { value: 'COMPOSITION', label: 'Composition' },
  { value: 'EXAMEN', label: 'Examen' },
];

const emptyForm = {
  classId: '',
  subject: '',
  type: 'DEVOIR',
  date: new Date().toISOString().split('T')[0],
  startTime: '',
  endTime: '',
  room: '',
  trimestre: 'T1',
};

export default function ExamensPage() {
  const router = useRouter();
  const year = currentSchoolYear();
  const [classes, setClasses] = useState<any[]>([]);
  const [filterClass, setFilterClass] = useState('');
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const canCreate = hasRole(authStorage.getUser()?.role, [
    'ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'TEACHER',
  ] as any);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!canAccessPath(authStorage.getUser()?.role, '/examens')) {
      router.push('/dashboard');
      return;
    }
    classesApi.getAll(year).then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setClasses(list);
      if (list.length) {
        setFilterClass(list[0].id);
        setForm((f) => ({ ...f, classId: list[0].id }));
      }
    }).catch(() => setLoadError('Impossible de charger les classes.'));
  }, [router, year]);

  useEffect(() => {
    loadExams();
  }, [filterClass, year]);

  const loadExams = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await examensApi.list({
        classId: filterClass || undefined,
        year,
      });
      setExams(Array.isArray(data) ? data : []);
    } catch {
      setExams([]);
      setLoadError('Impossible de charger les examens.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await examensApi.create({
        ...form,
        year,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        room: form.room || undefined,
      });
      setShowForm(false);
      setForm((f) => ({ ...emptyForm, classId: f.classId }));
      loadExams();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Création impossible.';
      alert(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette session d\'examen ?')) return;
    try {
      await examensApi.delete(id);
      setExams((prev) => prev.filter((x) => x.id !== id));
    } catch {
      alert('Suppression impossible.');
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  const typeLabel = (t: string) => EXAM_TYPES.find((x) => x.value === t)?.label ?? t;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Examens" subtitle={`Sessions d'évaluation — ${year}`} />
        <main className="flex-1 p-6">
          {loadError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {loadError}
            </div>
          )}

          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <div className="relative">
              <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                <option value="">Toutes les classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <span className="text-sm text-gray-500">{exams.length} session(s)</span>
            {canCreate && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="ml-auto flex items-center gap-2 bg-[#1B3A6B] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800"
              >
                <Plus className="w-4 h-4" /> Nouvelle session
              </button>
            )}
          </div>

          {showForm && canCreate && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">Nouvelle session</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Classe *</label>
                  <select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Matière *</label>
                  <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Mathématiques" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                    {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Date *</label>
                  <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Heure début</label>
                  <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Heure fin</label>
                  <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Salle</label>
                  <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Salle 3" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Trimestre</label>
                  <select value={form.trimestre} onChange={(e) => setForm({ ...form, trimestre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                    <option value="T1">T1</option>
                    <option value="T2">T2</option>
                    <option value="T3">T3</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-3 flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                    Annuler
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm disabled:opacity-50">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Créer
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16 text-gray-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : exams.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune session planifiée</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Date', 'Matière', 'Type', 'Classe', 'Horaire', 'Salle', 'Trim.', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {exams.map((ex) => (
                    <tr key={ex.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-800">{fmtDate(ex.date)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{ex.subject}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                          {typeLabel(ex.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{ex.class?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {ex.startTime && ex.endTime
                          ? `${ex.startTime} – ${ex.endTime}`
                          : ex.startTime || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">{ex.room || '—'}</td>
                      <td className="px-4 py-3 text-sm">{ex.trimestre || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {hasRole(authStorage.getUser()?.role, ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR'] as any) && (
                          <button type="button" onClick={() => handleDelete(ex.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
