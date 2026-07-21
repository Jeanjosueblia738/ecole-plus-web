'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, Loader2, ChevronDown, CheckCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { classesApi, studentsApi, gradesApi, conseilApi } from '@/lib/api';
import { currentSchoolYear } from '@/lib/school-year';
import { authStorage } from '@/lib/auth';
import { generateBulletin } from '@/lib/pdf';
import { can, hasRole } from '@/lib/rbac';

export default function BulletinsPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [trimestre, setTrimestre] = useState('T1');
  const [students, setStudents] = useState<any[]>([]);
  const [gradesMap, setGradesMap] = useState<Record<string, any>>({});
  const [classStats, setClassStats] = useState<{
    averages: Record<string, number>;
    classAverage?: number;
    classMin?: number;
    classMax?: number;
  }>({ averages: {} });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const [councilByStudent, setCouncilByStudent] = useState<Record<string, any>>({});
  const tenant = authStorage.getTenant();

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!hasRole(authStorage.getUser()?.role, can.generateBulletin)) {
      router.push('/dashboard');
      return;
    }
    classesApi.getAll(currentSchoolYear()).then(({ data }) => {
      setClasses(data);
      if (data.length > 0) setSelectedClass(data[0].id);
    }).catch(() => setLoadError('Impossible de charger les classes.'));
  }, [router]);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    setDone([]);
    setLoadError('');
    setClassStats({ averages: {} });
    setCouncilByStudent({});
    Promise.all([
      studentsApi.getAll({ classId: selectedClass }),
      conseilApi.list({
        classId: selectedClass,
        trimestre,
        year: currentSchoolYear(),
      }).catch(() => ({ data: [] })),
    ])
      .then(([studentsRes, councilRes]) => {
        setStudents(studentsRes.data);
        const map: Record<string, any> = {};
        const rows = Array.isArray(councilRes.data) ? councilRes.data : [];
        for (const row of rows) {
          const sid = row.student?.id || row.decision?.studentId;
          if (sid && row.decision) map[sid] = row.decision;
        }
        setCouncilByStudent(map);
      })
      .catch(() => {
        setStudents([]);
        setLoadError('Impossible de charger les élèves de cette classe.');
      })
      .finally(() => setLoading(false));
  }, [selectedClass, trimestre]);

  const loadClassStats = async () => {
    if (!selectedClass) return { averages: {} };
    try {
      const { data } = await gradesApi.getByClass(selectedClass, trimestre);
      const averages: Record<string, number> = {};
      const list: number[] = [];
      for (const row of data as any[]) {
        const sid = row.student?.id;
        if (!sid || row.moyenne == null) continue;
        averages[sid] = Number(row.moyenne);
        list.push(Number(row.moyenne));
      }
      const stats = {
        averages,
        classAverage: list.length
          ? list.reduce((a, b) => a + b, 0) / list.length
          : undefined,
        classMin: list.length ? Math.min(...list) : undefined,
        classMax: list.length ? Math.max(...list) : undefined,
      };
      setClassStats(stats);
      return stats;
    } catch (e) {
      console.error(e);
      alert('Impossible de charger les moyennes de classe. Les rangs peuvent être incomplets.');
      const empty = { averages: {} as Record<string, number> };
      setClassStats(empty);
      return empty;
    }
  };

  const loadGrades = async (studentId: string) => {
    const key = `${studentId}_${trimestre}`;
    if (gradesMap[key]) return gradesMap[key];
    const { data } = await gradesApi.getByStudent(studentId, trimestre);
    setGradesMap((m) => ({ ...m, [key]: data }));
    return data;
  };

  const selectedClassName = classes.find((c) => c.id === selectedClass)?.name || '';
  const selectedClassLevel = classes.find((c) => c.id === selectedClass)?.level || '';

  const buildPayload = (student: any, data: any, stats: typeof classStats) => {
    const moy = Number(data.moyenneGenerale || 0);
    const avgs = Object.entries(stats.averages);
    let rang: number | undefined;
    if (avgs.length) {
      const sorted = [...avgs].sort((a, b) => b[1] - a[1]);
      const idx = sorted.findIndex(([id]) => id === student.id);
      rang = idx >= 0 ? idx + 1 : undefined;
    }
    const payload: Record<string, unknown> = {
      schoolName: tenant?.name || 'Etablissement',
      schoolCity: tenant?.city || 'Abidjan',
      schoolCode: tenant?.code || '',
      schoolStatus: '—',
      studentName: `${student.lastName} ${student.firstName}`.trim(),
      studentRegistration: student.registrationNo,
      className: selectedClassName,
      level: selectedClassLevel,
      trimestre,
      year: currentSchoolYear(),
      grades: data.grades || [],
      moyenneGenerale: moy,
      rang,
      effectif: students.length,
      classAverage: stats.classAverage,
      classMin: stats.classMin,
      classMax: stats.classMax,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      photoUrl: student.photoUrl,
    };
    if (student.nationality != null && student.nationality !== '') {
      payload.nationality = student.nationality;
    }
    if (typeof student.isRepeater === 'boolean') {
      payload.isRepeater = student.isRepeater;
    }
    const council = councilByStudent[student.id];
    if (council) {
      if (council.mention) payload.councilMention = council.mention;
      if (council.decision) payload.councilDecision = council.decision;
      if (council.appreciation) payload.councilAppreciation = council.appreciation;
    }
    return payload as any;
  };

  const generateOne = async (student: any) => {
    setGenerating(student.id);
    try {
      const stats = await loadClassStats();
      const data = await loadGrades(student.id);
      generateBulletin(buildPayload(student, data, stats));
      setDone((d) => [...d, student.id]);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la génération du bulletin');
    } finally {
      setGenerating(null);
    }
  };

  const generateAll = async () => {
    setGeneratingAll(true);
    const failures: string[] = [];
    try {
      const stats = await loadClassStats();
      for (const student of students) {
        try {
          const data = await loadGrades(student.id);
          generateBulletin(buildPayload(student, data, stats));
          setDone((d) => [...d, student.id]);
          await new Promise((r) => setTimeout(r, 400));
        } catch (e) {
          console.error(`Erreur bulletin ${student.firstName}:`, e);
          failures.push(`${student.lastName} ${student.firstName}`);
        }
      }
      if (failures.length > 0) {
        alert(
          `${failures.length} bulletin(s) en échec sur ${students.length} :\n${failures.slice(0, 8).join('\n')}${failures.length > 8 ? '\n…' : ''}`,
        );
      }
    } finally {
      setGeneratingAll(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Bulletins de notes"
          subtitle="Format MEN ivoirien — génération PDF trimestrielle"
        />
        <main className="flex-1 p-6">
          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
              {loadError}
            </div>
          )}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="flex gap-4 items-end flex-wrap">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Classe</label>
                <div className="relative">
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      setDone([]);
                    }}
                    className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Trimestre</label>
                <div className="relative">
                  <select
                    value={trimestre}
                    onChange={(e) => {
                      setTrimestre(e.target.value);
                      setDone([]);
                    }}
                    className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="T1">1er Trimestre</option>
                    <option value="T2">2ème Trimestre</option>
                    <option value="T3">3ème Trimestre</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <button
                onClick={generateAll}
                disabled={generatingAll || students.length === 0}
                className="flex items-center gap-2 bg-[#1B3A6B] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50"
              >
                {generatingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Générer tous les bulletins ({students.length})
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="font-semibold text-gray-800">
                {selectedClassName} — {students.length} élève(s)
              </span>
              {done.length > 0 && (
                <span className="text-sm text-green-600 font-medium">
                  {done.length} bulletin(s) généré(s)
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : students.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Aucun élève dans cette classe</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Élève
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Matricule
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Statut
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((s: any) => (
                    <tr
                      key={s.id}
                      className={`hover:bg-gray-50 transition-colors ${done.includes(s.id) ? 'bg-green-50/40' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1B3A6B] flex items-center justify-center flex-shrink-0">
                            {s.photoUrl ? (
                              <img src={s.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white text-xs font-bold">
                                {s.firstName[0]}
                                {s.lastName[0]}
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-gray-800 text-sm">
                            {s.lastName} {s.firstName}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                        {s.registrationNo}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {done.includes(s.id) ? (
                          <span className="flex items-center justify-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle className="w-4 h-4" /> Généré
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">En attente</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => generateOne(s)}
                          disabled={generating === s.id || generatingAll}
                          className="flex items-center gap-1.5 mx-auto bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {generating === s.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          {generating === s.id ? 'Génération...' : 'Télécharger PDF'}
                        </button>
                      </td>
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
