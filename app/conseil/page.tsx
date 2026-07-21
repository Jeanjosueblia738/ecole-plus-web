'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gavel, ChevronDown, Loader2, Save, AlertCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { conseilApi, classesApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { canAccessPath, hasRole, can } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

const MENTIONS = [
  { value: 'TRES_BIEN', label: 'Très bien' },
  { value: 'BIEN', label: 'Bien' },
  { value: 'ASSEZ_BIEN', label: 'Assez bien' },
  { value: 'PASSABLE', label: 'Passable' },
  { value: 'MEDIOCRE', label: 'Médiocre' },
  { value: 'NIL', label: '—' },
];

const DECISIONS = [
  { value: 'PASSAGE', label: 'Passage' },
  { value: 'REDOUBLEMENT', label: 'Redoublement' },
  { value: 'CONDITIONAL', label: 'Passage conditionnel' },
];

type RowState = {
  studentId: string;
  student: { firstName: string; lastName: string; registrationNo: string };
  mention: string;
  decision: string;
  appreciation: string;
  dirty: boolean;
};

export default function ConseilPage() {
  const router = useRouter();
  const year = currentSchoolYear();
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [trimestre, setTrimestre] = useState('T1');
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  const canWrite = hasRole(authStorage.getUser()?.role, can.generateBulletin);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!canAccessPath(authStorage.getUser()?.role, '/conseil')) {
      router.push('/dashboard');
      return;
    }
    classesApi.getAll(year).then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setClasses(list);
      if (list.length) setClassId(list[0].id);
    }).catch(() => setLoadError('Impossible de charger les classes.'));
  }, [router, year]);

  useEffect(() => {
    if (!classId) return;
    loadCouncil();
  }, [classId, trimestre, year]);

  const loadCouncil = async () => {
    setLoading(true);
    setLoadError('');
    setSaveMsg('');
    try {
      const { data } = await conseilApi.list({ classId, trimestre, year });
      const list = Array.isArray(data) ? data : [];
      setRows(list.map((r: any) => ({
        studentId: r.student.id,
        student: r.student,
        mention: r.decision?.mention ?? 'NIL',
        decision: r.decision?.decision ?? 'PASSAGE',
        appreciation: r.decision?.appreciation ?? '',
        dirty: false,
      })));
    } catch {
      setRows([]);
      setLoadError('Impossible de charger le conseil de classe.');
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (studentId: string, patch: Partial<RowState>) => {
    setRows((prev) =>
      prev.map((r) =>
        r.studentId === studentId ? { ...r, ...patch, dirty: true } : r,
      ),
    );
    setSaveMsg('');
  };

  const saveAll = async () => {
    const dirty = rows.filter((r) => r.dirty);
    if (!dirty.length) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await Promise.all(
        dirty.map((r) =>
          conseilApi.upsert({
            studentId: r.studentId,
            classId,
            trimestre,
            year,
            mention: r.mention,
            decision: r.decision,
            appreciation: r.appreciation || undefined,
          }),
        ),
      );
      setRows((prev) => prev.map((r) => ({ ...r, dirty: false })));
      setSaveMsg(`${dirty.length} décision(s) enregistrée(s).`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Enregistrement impossible.';
      setLoadError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSaving(false);
    }
  };

  const dirtyCount = rows.filter((r) => r.dirty).length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Conseil de classe" subtitle={`${year} — Décisions trimestrielles`} />
        <main className="flex-1 p-6">
          {loadError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {loadError}
            </div>
          )}
          {saveMsg && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm text-green-700">
              {saveMsg}
            </div>
          )}

          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <div className="relative">
              <select value={classId} onChange={(e) => setClassId(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={trimestre} onChange={(e) => setTrimestre(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                <option value="T1">1er Trimestre</option>
                <option value="T2">2ème Trimestre</option>
                <option value="T3">3ème Trimestre</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {canWrite && dirtyCount > 0 && (
              <button
                type="button"
                onClick={saveAll}
                disabled={saving}
                className="ml-auto flex items-center gap-2 bg-[#1B3A6B] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer ({dirtyCount})
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16 text-gray-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
              <Gavel className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun élève dans cette classe</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Élève</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mention</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Décision</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Appréciation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r) => (
                    <tr key={r.studentId} className={r.dirty ? 'bg-amber-50/50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">
                          {r.student.lastName} {r.student.firstName}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">{r.student.registrationNo}</p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={r.mention}
                          disabled={!canWrite}
                          onChange={(e) => updateRow(r.studentId, { mention: e.target.value })}
                          className="w-full max-w-[140px] px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-50"
                        >
                          {MENTIONS.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={r.decision}
                          disabled={!canWrite}
                          onChange={(e) => updateRow(r.studentId, { decision: e.target.value })}
                          className="w-full max-w-[160px] px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-50"
                        >
                          {DECISIONS.map((d) => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={r.appreciation}
                          disabled={!canWrite}
                          onChange={(e) => updateRow(r.studentId, { appreciation: e.target.value })}
                          placeholder="Appréciation du conseil…"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                        />
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
