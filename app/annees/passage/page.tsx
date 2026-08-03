'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { academicYearsApi, classesApi, studentsApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, canAccessPath, hasRole } from '@/lib/rbac';

type Year = { id: string; label: string; status: string };
type StudentRow = {
  studentId: string;
  name: string;
  registrationNo: string;
  fromClassId?: string | null;
  targetClassId: string;
  decision: 'PASSAGE' | 'REDOUBLEMENT' | 'CONDITIONAL';
  selected: boolean;
};

export default function PassagePage() {
  const router = useRouter();
  const [years, setYears] = useState<Year[]>([]);
  const [fromYearId, setFromYearId] = useState('');
  const [toYearId, setToYearId] = useState('');
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [targetClasses, setTargetClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!canAccessPath(authStorage.getUser()?.role, '/annees/passage')) {
      router.push('/dashboard');
      return;
    }
    if (!hasRole(authStorage.getUser()?.role, can.studentPassage)) {
      router.push('/dashboard');
      return;
    }

    academicYearsApi
      .getAll()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setYears(list);
        const current = list.find((y: Year) => (y as any).isCurrent) || list[0];
        const next = list.find((y: Year) => y.id !== current?.id && y.status !== 'ARCHIVED');
        if (current) setFromYearId(current.id);
        if (next) setToYearId(next.id);
      })
      .catch(() => setError('Impossible de charger les années'))
      .finally(() => setLoading(false));
  }, [router]);

  const fromYear = useMemo(
    () => years.find((y) => y.id === fromYearId),
    [years, fromYearId],
  );
  const toYear = useMemo(
    () => years.find((y) => y.id === toYearId),
    [years, toYearId],
  );

  useEffect(() => {
    if (!fromYearId) return;
    setError('');
    academicYearsApi
      .getEnrollments(fromYearId)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setRows(
          list
            .filter((e: any) => e.status === 'ENROLLED' && e.student)
            .map((e: any) => ({
              studentId: e.student.id,
              name: `${e.student.lastName} ${e.student.firstName}`,
              registrationNo: e.student.registrationNo,
              fromClassId: e.classId,
              targetClassId: '',
              decision: 'PASSAGE' as const,
              selected: true,
            })),
        );
      })
      .catch(async () => {
        // Fallback: all active students
        try {
          const { data } = await studentsApi.getAll();
          const list = Array.isArray(data) ? data : [];
          setRows(
            list.map((s: any) => ({
              studentId: s.id,
              name: `${s.lastName} ${s.firstName}`,
              registrationNo: s.registrationNo,
              fromClassId: s.classId,
              targetClassId: '',
              decision: 'PASSAGE' as const,
              selected: true,
            })),
          );
        } catch {
          setError('Impossible de charger les élèves');
        }
      });
  }, [fromYearId]);

  useEffect(() => {
    if (!toYear?.label) {
      setTargetClasses([]);
      return;
    }
    classesApi
      .getAll(toYear.label)
      .then(({ data }) => setTargetClasses(Array.isArray(data) ? data : []))
      .catch(() => setTargetClasses([]));
  }, [toYear?.label]);

  const updateRow = (studentId: string, patch: Partial<StudentRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)),
    );
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    setResult(null);
    const items = rows
      .filter((r) => r.selected && r.targetClassId)
      .map((r) => ({
        studentId: r.studentId,
        targetClassId: r.targetClassId,
        decision: r.decision,
      }));
    if (!fromYearId || !toYearId) {
      setError('Sélectionnez les années source et cible');
      setSubmitting(false);
      return;
    }
    if (!items.length) {
      setError('Sélectionnez au moins un élève avec une classe cible');
      setSubmitting(false);
      return;
    }
    try {
      const { data } = await academicYearsApi.passage({
        fromYearId,
        toYearId,
        items,
      });
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Passage impossible');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Passage élèves"
          subtitle="Clôturer l'année et réinscrire vers la suivante"
        />
        <main className="flex-1 p-6 max-w-6xl space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}
          {result && (
            <div className="bg-emerald-50 text-emerald-800 text-sm px-4 py-3 rounded-lg">
              {result.successCount} réussi(s), {result.failureCount} échec(s)
              {Array.isArray(result.results) &&
                result.results
                  .filter((r: any) => !r.ok)
                  .slice(0, 5)
                  .map((r: any) => (
                    <div key={r.studentId} className="text-red-600 text-xs mt-1">
                      {r.error}
                    </div>
                  ))}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center p-10 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-100 p-4 grid sm:grid-cols-2 gap-4">
                <label className="text-sm">
                  <span className="text-gray-500 block mb-1">Année source</span>
                  <select
                    value={fromYearId}
                    onChange={(e) => setFromYearId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  >
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-gray-500 block mb-1">Année cible</span>
                  <select
                    value={toYearId}
                    onChange={(e) => setToYearId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  >
                    {years
                      .filter((y) => y.status !== 'ARCHIVED')
                      .map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.label}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              {toYear && targetClasses.length === 0 && (
                <p className="text-sm text-amber-700 bg-amber-50 px-4 py-3 rounded-lg">
                  Aucune classe pour {toYear.label}. Clonez d&apos;abord les classes depuis
                  Années scolaires.
                </p>
              )}

              <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-3 py-2"> </th>
                      <th className="px-3 py-2">Élève</th>
                      <th className="px-3 py-2">Décision</th>
                      <th className="px-3 py-2">Classe cible ({toYear?.label || '—'})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.studentId} className="border-t border-gray-50">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={r.selected}
                            onChange={(e) =>
                              updateRow(r.studentId, { selected: e.target.checked })
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-800">{r.name}</div>
                          <div className="text-xs text-gray-400">{r.registrationNo}</div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={r.decision}
                            onChange={(e) =>
                              updateRow(r.studentId, {
                                decision: e.target.value as StudentRow['decision'],
                              })
                            }
                            className="border border-gray-200 rounded px-2 py-1"
                          >
                            <option value="PASSAGE">Passage</option>
                            <option value="REDOUBLEMENT">Redoublement</option>
                            <option value="CONDITIONAL">Conditionnel</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={r.targetClassId}
                            onChange={(e) =>
                              updateRow(r.studentId, { targetClassId: e.target.value })
                            }
                            className="border border-gray-200 rounded px-2 py-1 min-w-[160px]"
                          >
                            <option value="">Choisir…</option>
                            {targetClasses.map((c: any) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.level})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length === 0 && (
                  <p className="p-6 text-sm text-gray-500">Aucun élève inscrit sur l’année source.</p>
                )}
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={submit}
                className="px-5 py-2.5 bg-brand text-white rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {submitting ? 'Traitement…' : 'Valider le passage'}
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
