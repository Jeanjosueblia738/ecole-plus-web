'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, User, BookOpen, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { teachersApi, classesApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

interface SchoolClass {
  id: string;
  name: string;
  level: string;
  year: string;
}

export default function EnseignantsPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});

  // Modal affectation classes
  const [assignTeacher, setAssignTeacher] = useState<any | null>(null);
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const year = currentSchoolYear();

  const loadClassCounts = useCallback(async (list: any[]) => {
    const entries = await Promise.all(
      list.map(async (t) => {
        try {
          const { data } = await teachersApi.getClasses(t.id, year);
          const classes = Array.isArray(data) ? data : [];
          return [t.id, classes.length] as const;
        } catch {
          return [t.id, 0] as const;
        }
      }),
    );
    setClassCounts(Object.fromEntries(entries));
  }, [year]);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!hasRole(authStorage.getUser()?.role, can.manageTeachers)) {
      router.push('/dashboard');
      return;
    }
    teachersApi.getAll()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setTeachers(list);
        loadClassCounts(list);
      })
      .catch(() => {
        setTeachers([]);
        setLoadError('Impossible de charger les enseignants.');
      })
      .finally(() => setLoading(false));
  }, [router, loadClassCounts]);

  const openClassesModal = async (teacher: any) => {
    setAssignTeacher(teacher);
    setModalError('');
    setModalSuccess('');
    setModalLoading(true);
    setSelectedIds(new Set());
    setAllClasses([]);
    try {
      const [classesRes, assignedRes] = await Promise.all([
        classesApi.getAll(year),
        teachersApi.getClasses(teacher.id, year),
      ]);
      const classes = Array.isArray(classesRes.data) ? classesRes.data : [];
      const assigned = Array.isArray(assignedRes.data) ? assignedRes.data : [];
      setAllClasses(classes);
      setSelectedIds(new Set(assigned.map((c: SchoolClass) => c.id)));
      setClassCounts((prev) => ({ ...prev, [teacher.id]: assigned.length }));
    } catch {
      setModalError('Impossible de charger les classes.');
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    if (modalSaving) return;
    setAssignTeacher(null);
    setModalError('');
    setModalSuccess('');
  };

  const toggleClass = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setModalSuccess('');
    setModalError('');
  };

  const saveClasses = async () => {
    if (!assignTeacher) return;
    setModalSaving(true);
    setModalError('');
    setModalSuccess('');
    try {
      const classIds = [...selectedIds];
      const { data } = await teachersApi.setClasses(assignTeacher.id, {
        classIds,
        year,
      });
      const saved: SchoolClass[] = Array.isArray(data) ? data : [];
      const count = saved.length > 0 ? saved.length : classIds.length;
      if (saved.length > 0) {
        setSelectedIds(new Set(saved.map((c) => c.id)));
      }
      setClassCounts((prev) => ({ ...prev, [assignTeacher.id]: count }));
      setModalSuccess(`${count} classe(s) affectée(s) pour ${year}.`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Impossible d\'enregistrer les affectations.';
      setModalError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Enseignants" subtitle={`${teachers.length} enseignant(s)`} />
        <main className="flex-1 p-6">
          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
              {loadError}
            </div>
          )}
          <div className="flex justify-end mb-6">
            <a href="/enseignants/nouveau"
              className="flex items-center gap-2 bg-[#1B3A6B] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors">
              <Plus className="w-4 h-4" />
              Ajouter un enseignant
            </a>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Enseignant</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Matières</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Classes</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>{[...Array(6)].map((_, j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : teachers.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                    <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Aucun enseignant enregistré</p>
                  </td></tr>
                ) : teachers.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-sm">
                          {t.firstName?.[0]}{t.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{t.firstName} {t.lastName}</p>
                          {t.phone && <p className="text-xs text-gray-400">{t.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{t.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {t.subjects?.map((s: string) => (
                          <span key={s} className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-50 text-blue-700">
                        {classCounts[t.id] ?? '—'} classe{(classCounts[t.id] ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {t.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openClassesModal(t)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1B3A6B] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <BookOpen className="w-4 h-4" />
                        Classes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* Modal affectation classes */}
      {assignTeacher && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-gray-800">Affecter des classes</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {assignTeacher.firstName} {assignTeacher.lastName} — {year}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {modalError && (
                <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">{modalError}</p>
              )}
              {modalSuccess && (
                <p className="text-green-700 text-sm bg-green-50 p-3 rounded-xl">{modalSuccess}</p>
              )}

              {modalLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Chargement…</span>
                </div>
              ) : allClasses.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">
                  Aucune classe pour l&apos;année {year}.
                </p>
              ) : (
                <div className="space-y-1 max-h-72 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                  {allClasses.map((c) => {
                    const checked = selectedIds.has(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${checked ? 'bg-blue-50/60' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleClass(c.id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#1B3A6B] focus:ring-[#1B3A6B]"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.level}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {!modalLoading && allClasses.length > 0 && (
                <p className="text-xs text-gray-500">
                  {selectedIds.size} classe(s) sélectionnée(s)
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={closeModal}
                disabled={modalSaving}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={saveClasses}
                disabled={modalSaving || modalLoading}
                className="flex-1 bg-[#1B3A6B] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {modalSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
