'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, Plus, ChevronDown, Loader2, Trash2, X, AlertCircle,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { disciplineApi, classesApi, studentsApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, canAccessPath, hasRole } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

const TYPES = [
  { value: 'WARNING', label: 'Avertissement' },
  { value: 'BLAME', label: 'Blâme' },
  { value: 'DETENTION', label: 'Retenue' },
  { value: 'CONVOCATION', label: 'Convocation' },
  { value: 'EXCLUSION', label: 'Exclusion' },
];

const SEVERITIES = [
  { value: 'LOW', label: 'Faible' },
  { value: 'MEDIUM', label: 'Moyenne' },
  { value: 'HIGH', label: 'Grave' },
];

const typeLabel = (t: string) =>
  TYPES.find((x) => x.value === t)?.label || t;

const emptyForm = {
  studentId: '',
  classId: '',
  type: 'WARNING',
  severity: 'MEDIUM',
  reason: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  trimestre: 'T1',
  durationHours: '2',
  startDate: '',
  endDate: '',
  isDefinitive: false,
};

export default function DisciplinePage() {
  const router = useRouter();
  const year = currentSchoolYear();
  const role = authStorage.getUser()?.role;
  const canWrite = hasRole(role, can.recordSanction);
  const canDelete = hasRole(role, can.deleteSanction);

  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [filterClass, setFilterClass] = useState('');
  const [filterType, setFilterType] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState<{ total: number; byType: Record<string, number> }>({
    total: 0,
    byType: {},
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!canAccessPath(role, '/discipline')) {
      router.push('/dashboard');
      return;
    }
    classesApi
      .getAll(year)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setClasses(list);
        if (list.length) {
          setFilterClass(list[0].id);
          setForm((f) => ({ ...f, classId: list[0].id }));
        }
      })
      .catch(() => setLoadError('Impossible de charger les classes.'));
    disciplineApi
      .stats(year)
      .then(({ data }) => setStats(data))
      .catch(() => undefined);
  }, [router, year, role]);

  useEffect(() => {
    loadRows();
  }, [filterClass, filterType, year]);

  useEffect(() => {
    if (!form.classId) {
      setStudents([]);
      return;
    }
    studentsApi
      .getAll({ classId: form.classId })
      .then(({ data }) => setStudents(Array.isArray(data) ? data : []))
      .catch(() => setStudents([]));
  }, [form.classId]);

  const loadRows = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await disciplineApi.list({
        classId: filterClass || undefined,
        year,
        type: filterType || undefined,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
      setLoadError('Impossible de charger les sanctions.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setFormError('');
    if (!form.studentId || !form.reason.trim()) {
      setFormError('Élève et motif requis.');
      return;
    }
    setSaving(true);
    try {
      await disciplineApi.create({
        studentId: form.studentId,
        classId: form.classId,
        type: form.type,
        severity: form.severity,
        reason: form.reason.trim(),
        description: form.description.trim() || undefined,
        date: form.date,
        year,
        trimestre: form.trimestre,
        durationHours:
          form.type === 'DETENTION'
            ? parseInt(form.durationHours, 10) || 2
            : undefined,
        startDate:
          form.type === 'EXCLUSION' && !form.isDefinitive
            ? form.startDate || undefined
            : undefined,
        endDate:
          form.type === 'EXCLUSION' && !form.isDefinitive
            ? form.endDate || undefined
            : undefined,
        isDefinitive: form.type === 'EXCLUSION' ? form.isDefinitive : false,
      });
      setShowForm(false);
      setForm((f) => ({
        ...emptyForm,
        classId: f.classId,
        studentId: '',
      }));
      await loadRows();
      const { data } = await disciplineApi.stats(year);
      setStats(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setFormError(
        Array.isArray(msg) ? msg.join(' · ') : msg || 'Création impossible',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    if (!confirm('Supprimer cette sanction ?')) return;
    try {
      await disciplineApi.delete(id);
      await loadRows();
      const { data } = await disciplineApi.stats(year);
      setStats(data);
    } catch {
      alert('Suppression impossible');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Discipline"
          subtitle="Avertissements, retenues, convocations et exclusions"
        />
        <main className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500">Total {year}</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
            {TYPES.map((t) => (
              <div
                key={t.value}
                className="bg-white rounded-xl border border-gray-100 p-4"
              >
                <p className="text-xs text-gray-500">{t.label}</p>
                <p className="text-xl font-semibold text-gray-800">
                  {stats.byType?.[t.value] || 0}
                </p>
              </div>
            ))}
          </div>

          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {loadError}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 pr-8 text-sm"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 pr-8 text-sm"
                  >
                    <option value="">Tous types</option>
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              {canWrite && (
                <button
                  onClick={() => {
                    setFormError('');
                    setShowForm(true);
                    setForm((f) => ({
                      ...emptyForm,
                      classId: filterClass || f.classId,
                    }));
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800"
                >
                  <Plus className="w-4 h-4" /> Nouvelle sanction
                </button>
              )}
            </div>

            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
              </div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Aucune sanction pour cette sélection
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Élève
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Motif
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Gravité
                    </th>
                    {canDelete && (
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/80">
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {r.date
                          ? new Date(r.date).toLocaleDateString('fr-FR')
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-800">
                        {r.student?.lastName} {r.student?.firstName}
                      </td>
                      <td className="px-5 py-3 text-sm">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-800">
                          {typeLabel(r.type)}
                          {r.type === 'DETENTION' && r.durationHours
                            ? ` · ${r.durationHours}h`
                            : ''}
                          {r.type === 'EXCLUSION' && r.isDefinitive
                            ? ' · définitive'
                            : ''}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700 max-w-xs truncate">
                        {r.reason}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">
                        {SEVERITIES.find((s) => s.value === r.severity)?.label ||
                          r.severity}
                      </td>
                      {canDelete && (
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Nouvelle sanction</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-xl">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Classe *</label>
                <select
                  value={form.classId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      classId: e.target.value,
                      studentId: '',
                    }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                  required
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Élève *</label>
                <select
                  value={form.studentId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, studentId: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                  required
                >
                  <option value="">Sélectionner…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.lastName} {s.firstName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Gravité</label>
                  <select
                    value={form.severity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, severity: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Trimestre</label>
                  <select
                    value={form.trimestre}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, trimestre: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                  >
                    <option value="T1">T1</option>
                    <option value="T2">T2</option>
                    <option value="T3">T3</option>
                  </select>
                </div>
              </div>
              {form.type === 'DETENTION' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Durée (heures) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={48}
                    value={form.durationHours}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, durationHours: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
              )}
              {form.type === 'EXCLUSION' && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.isDefinitive}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          isDefinitive: e.target.checked,
                        }))
                      }
                    />
                    Exclusion définitive
                  </label>
                  {!form.isDefinitive && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Début *
                        </label>
                        <input
                          type="date"
                          value={form.startDate}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              startDate: e.target.value,
                            }))
                          }
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Fin *
                        </label>
                        <input
                          type="date"
                          value={form.endDate}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, endDate: e.target.value }))
                          }
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Motif *</label>
                <input
                  value={form.reason}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  placeholder="ex: Retard répété, insolence…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Détails</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
