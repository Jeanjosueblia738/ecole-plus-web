'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, User, BookOpen, Loader2, Key, CheckCircle, XCircle } from 'lucide-react';
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

interface Assignment {
  classId: string;
  subject: string;
  class?: SchoolClass;
}

export default function EnseignantsPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});

  const [assignTeacher, setAssignTeacher] = useState<any | null>(null);
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
  /** classId → subjects selected for that class */
  const [classSubjects, setClassSubjects] = useState<Record<string, string[]>>({});
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);

  const year = currentSchoolYear();

  const countUniqueClasses = (assignments: Assignment[]) =>
    new Set(assignments.map((a) => a.classId)).size;

  const loadClassCounts = useCallback(async (list: any[]) => {
    const entries = await Promise.all(
      list.map(async (t) => {
        try {
          const { data } = await teachersApi.getAssignments(t.id, year);
          const assignments = Array.isArray(data) ? data : [];
          return [t.id, countUniqueClasses(assignments)] as const;
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
    teachersApi.getAll({ includeInactive: true })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setTeachers(list);
        loadClassCounts(list.filter((t: any) => t.isActive));
      })
      .catch(() => {
        setTeachers([]);
        setLoadError('Impossible de charger les enseignants.');
      })
      .finally(() => setLoading(false));
  }, [router, loadClassCounts]);

  const handleToggle = async (teacher: any) => {
    setToggling(teacher.id);
    try {
      if (teacher.isActive) {
        await teachersApi.deactivate(teacher.id);
      } else {
        await teachersApi.activate(teacher.id);
      }
      setTeachers((list) =>
        list.map((t) =>
          t.id === teacher.id ? { ...t, isActive: !t.isActive } : t,
        ),
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (teacher.isActive
          ? 'Désactivation impossible. Réessayez.'
          : 'Activation impossible. Réessayez.');
      alert(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setToggling(null);
    }
  };

  const handleResetPassword = async (teacherId: string) => {
    const newPassword = prompt('Nouveau mot de passe (min 8 caractères) :');
    if (!newPassword || newPassword.length < 8) {
      alert('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    setResetting(teacherId);
    try {
      await teachersApi.resetPassword(teacherId, newPassword);
      alert('Mot de passe réinitialisé avec succès !');
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        (typeof data === 'string' && data.includes('failed to respond')
          ? 'Le serveur API ne répond pas. Réessayez dans quelques secondes.'
          : null) ||
        data?.message ||
        (typeof data === 'string' ? data.slice(0, 180) : null) ||
        'Réinitialisation impossible. Réessayez.';
      alert(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setResetting(null);
    }
  };

  const openClassesModal = async (teacher: any) => {
    setAssignTeacher(teacher);
    setModalError('');
    setModalSuccess('');
    setModalLoading(true);
    setClassSubjects({});
    setAllClasses([]);
    try {
      const [classesRes, assignedRes] = await Promise.all([
        classesApi.getAll(year),
        teachersApi.getAssignments(teacher.id, year),
      ]);
      const classes = Array.isArray(classesRes.data) ? classesRes.data : [];
      const assignments: Assignment[] = Array.isArray(assignedRes.data) ? assignedRes.data : [];
      const map: Record<string, string[]> = {};
      for (const a of assignments) {
        if (!map[a.classId]) map[a.classId] = [];
        if (!map[a.classId].includes(a.subject)) map[a.classId].push(a.subject);
      }
      setAllClasses(classes);
      setClassSubjects(map);
      setClassCounts((prev) => ({
        ...prev,
        [teacher.id]: countUniqueClasses(assignments),
      }));
    } catch {
      setModalError('Impossible de charger les affectations.');
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

  const isClassSelected = (classId: string) => classId in classSubjects;

  const toggleClass = (id: string) => {
    setClassSubjects((prev) => {
      const next = { ...prev };
      if (id in next) {
        delete next[id];
      } else {
        const subjects: string[] = assignTeacher?.subjects?.length
          ? [assignTeacher.subjects[0]]
          : ['GENERAL'];
        next[id] = subjects;
      }
      return next;
    });
    setModalSuccess('');
    setModalError('');
  };

  const toggleSubject = (classId: string, subject: string) => {
    setClassSubjects((prev) => {
      const current = prev[classId] ?? [];
      const has = current.includes(subject);
      const updated = has
        ? current.filter((s) => s !== subject)
        : [...current, subject];
      if (updated.length === 0) {
        const next = { ...prev };
        delete next[classId];
        return next;
      }
      return { ...prev, [classId]: updated };
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
      const items = Object.entries(classSubjects).flatMap(([classId, subjects]) =>
        subjects.map((subject) => ({ classId, subject })),
      );
      const { data } = await teachersApi.setAssignments(assignTeacher.id, {
        items,
        year,
      });
      const saved: Assignment[] = Array.isArray(data) ? data : [];
      const map: Record<string, string[]> = {};
      for (const a of saved) {
        if (!map[a.classId]) map[a.classId] = [];
        if (!map[a.classId].includes(a.subject)) map[a.classId].push(a.subject);
      }
      setClassSubjects(map);
      const count = countUniqueClasses(saved.length ? saved : items);
      setClassCounts((prev) => ({ ...prev, [assignTeacher.id]: count }));
      setModalSuccess(`${items.length} affectation(s) enregistrée(s) pour ${year}.`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Impossible d\'enregistrer les affectations.';
      setModalError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setModalSaving(false);
    }
  };

  const teacherSubjects: string[] = assignTeacher?.subjects?.length
    ? assignTeacher.subjects
    : ['GENERAL'];

  const totalAssignments = Object.values(classSubjects).reduce(
    (n, subs) => n + subs.length,
    0,
  );

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
                  <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${!t.isActive ? 'opacity-60' : ''}`}>
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
                      {t.isActive ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                          <CheckCircle className="w-4 h-4" /> Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium">
                          <XCircle className="w-4 h-4" /> Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openClassesModal(t)}
                          title="Affectations"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1B3A6B] hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <BookOpen className="w-4 h-4" />
                          Affectations
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetPassword(t.id)}
                          disabled={resetting === t.id}
                          title="Réinitialiser le mot de passe"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(t)}
                          disabled={toggling === t.id}
                          title={t.isActive ? 'Désactiver l\'accès' : 'Activer l\'accès'}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                            t.isActive
                              ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {t.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {assignTeacher && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-gray-800">Affectation matière-classe</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {assignTeacher.firstName} {assignTeacher.lastName} — {year}
                </p>
              </div>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl">
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
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allClasses.map((c) => {
                    const selected = isClassSelected(c.id);
                    const subjects = classSubjects[c.id] ?? [];
                    return (
                      <div
                        key={c.id}
                        className={`border rounded-xl p-4 transition-colors ${selected ? 'border-blue-200 bg-blue-50/40' : 'border-gray-100'}`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleClass(c.id)}
                            className="w-4 h-4 rounded border-gray-300 text-[#1B3A6B] focus:ring-[#1B3A6B]"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{c.name}</p>
                            <p className="text-xs text-gray-400">{c.level}</p>
                          </div>
                        </label>
                        {selected && (
                          <div className="mt-3 pl-7">
                            <p className="text-xs text-gray-500 mb-2">Matières enseignées dans cette classe :</p>
                            <div className="flex flex-wrap gap-2">
                              {teacherSubjects.map((s) => {
                                const active = subjects.includes(s);
                                return (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => toggleSubject(c.id, s)}
                                    className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                                      active
                                        ? 'bg-[#1B3A6B] text-white'
                                        : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                                    }`}
                                  >
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!modalLoading && allClasses.length > 0 && (
                <p className="text-xs text-gray-500">
                  {Object.keys(classSubjects).length} classe(s) — {totalAssignments} affectation(s)
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
