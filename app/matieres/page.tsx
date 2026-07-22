'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Loader2, Plus, Pencil, Trash2, Save, X, RefreshCw,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { subjectsApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';

type SubjectRow = {
  id: string;
  name: string;
  coefficient: number;
  isActive: boolean;
};

export default function MatieresPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const [name, setName] = useState('');
  const [coefficient, setCoefficient] = useState('1');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCoef, setEditCoef] = useState('1');

  const canWrite = hasRole(authStorage.getUser()?.role, can.manageSubjects);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!hasRole(authStorage.getUser()?.role, can.viewSubjects)) {
      router.push('/dashboard');
      return;
    }
    load();
  }, [router, showInactive]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await subjectsApi.getAll(showInactive);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(
        typeof msg === 'string'
          ? msg
          : 'Impossible de charger les matières.',
      );
    } finally {
      setLoading(false);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    const coef = parseInt(coefficient, 10);
    if (!name.trim() || !coef || coef < 1) {
      setError('Nom et coefficient (≥ 1) requis.');
      return;
    }
    setSaving(true);
    setError('');
    setOk('');
    try {
      await subjectsApi.create({ name: name.trim(), coefficient: coef });
      setName('');
      setCoefficient('1');
      setOk('Matière créée.');
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' · ') : msg || 'Création impossible');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row: SubjectRow) => {
    setEditId(row.id);
    setEditName(row.name);
    setEditCoef(String(row.coefficient));
    setOk('');
    setError('');
  };

  const saveEdit = async () => {
    if (!editId || !canWrite) return;
    const coef = parseInt(editCoef, 10);
    if (!editName.trim() || !coef || coef < 1) {
      setError('Nom et coefficient (≥ 1) requis.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await subjectsApi.update(editId, {
        name: editName.trim(),
        coefficient: coef,
      });
      setEditId(null);
      setOk('Matière mise à jour.');
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' · ') : msg || 'Mise à jour impossible');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (row: SubjectRow) => {
    if (!canWrite) return;
    if (!confirm(`Désactiver « ${row.name} » ?`)) return;
    setSaving(true);
    setError('');
    try {
      await subjectsApi.remove(row.id);
      setOk(`« ${row.name} » désactivée.`);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Désactivation impossible');
    } finally {
      setSaving(false);
    }
  };

  const reactivate = async (row: SubjectRow) => {
    if (!canWrite) return;
    setSaving(true);
    try {
      await subjectsApi.update(row.id, { isActive: true });
      setOk(`« ${row.name} » réactivée.`);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Réactivation impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Matières"
          subtitle="Catalogue de l’établissement — nom et coefficient bulletin"
        />
        <main className="flex-1 p-6 max-w-4xl space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
            Ces matières alimentent la création d’enseignants, la saisie de notes
            et les bulletins. Le coefficient est appliqué automatiquement à la note.
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
          {ok && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
              {ok}
            </div>
          )}

          {canWrite && (
            <form
              onSubmit={create}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4"
            >
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#1B3A6B]" /> Nouvelle matière
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Nom *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: EDHC, Français…"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Coefficient *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={coefficient}
                    onChange={(e) => setCoefficient(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Créer
              </button>
            </form>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#1B3A6B]" />
                Catalogue ({rows.length})
              </h2>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                  />
                  Inclure inactives
                </label>
                <button
                  onClick={load}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                  title="Actualiser"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
              </div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                Aucune matière
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Matière
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Coefficient
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Statut
                    </th>
                    {canWrite && (
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/80">
                      <td className="px-5 py-3 text-sm font-medium text-gray-800">
                        {editId === row.id ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                          />
                        ) : (
                          row.name
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {editId === row.id ? (
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={editCoef}
                            onChange={(e) => setEditCoef(e.target.value)}
                            className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                          />
                        ) : (
                          <span className="font-semibold text-[#1B3A6B]">
                            ×{row.coefficient}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            row.isActive
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {canWrite && (
                        <td className="px-5 py-3 text-right">
                          {editId === row.id ? (
                            <div className="inline-flex gap-1">
                              <button
                                onClick={saveEdit}
                                disabled={saving}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditId(null)}
                                className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-1">
                              <button
                                onClick={() => startEdit(row)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {row.isActive ? (
                                <button
                                  onClick={() => deactivate(row)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => reactivate(row)}
                                  className="px-2 py-1 text-xs text-green-700 hover:bg-green-50 rounded-lg"
                                >
                                  Réactiver
                                </button>
                              )}
                            </div>
                          )}
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
    </div>
  );
}
