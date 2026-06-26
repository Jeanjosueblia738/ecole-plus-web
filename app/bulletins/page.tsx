'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Download, Loader2, ChevronDown, CheckCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { classesApi, studentsApi, gradesApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { generateBulletin } from '@/lib/pdf';

export default function BulletinsPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [trimestre, setTrimestre] = useState('T1');
  const [students, setStudents] = useState<any[]>([]);
  const [gradesMap, setGradesMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const tenant = authStorage.getTenant();

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    classesApi.getAll('2025-2026').then(({ data }) => {
      setClasses(data);
      if (data.length > 0) setSelectedClass(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    setDone([]);
    studentsApi.getAll({ classId: selectedClass })
      .then(({ data }) => setStudents(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedClass]);

  const loadGrades = async (studentId: string) => {
    if (gradesMap[`${studentId}_${trimestre}`]) return gradesMap[`${studentId}_${trimestre}`];
    const { data } = await gradesApi.getByStudent(studentId, trimestre);
    setGradesMap(m => ({ ...m, [`${studentId}_${trimestre}`]: data }));
    return data;
  };

  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || '';
  const selectedClassLevel = classes.find(c => c.id === selectedClass)?.level || '';

  const generateOne = async (student: any) => {
    setGenerating(student.id);
    try {
      const data = await loadGrades(student.id);
      generateBulletin({
        schoolName: tenant?.name || 'Etablissement',
        schoolCity: tenant?.city || 'Abidjan',
        schoolCode: tenant?.code || '',
        studentName: `${student.firstName} ${student.lastName}`,
        studentRegistration: student.registrationNo,
        className: selectedClassName,
        level: selectedClassLevel,
        trimestre,
        year: '2025-2026',
        grades: data.grades || [],
        moyenneGenerale: data.moyenneGenerale || 0,
      });
      setDone(d => [...d, student.id]);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la génération du bulletin');
    } finally {
      setGenerating(null);
    }
  };

  const generateAll = async () => {
    setGeneratingAll(true);
    for (const student of students) {
      try {
        const data = await loadGrades(student.id);
        generateBulletin({
          schoolName: tenant?.name || 'Etablissement',
          schoolCity: tenant?.city || 'Abidjan',
          schoolCode: tenant?.code || '',
          studentName: `${student.firstName} ${student.lastName}`,
          studentRegistration: student.registrationNo,
          className: selectedClassName,
          level: selectedClassLevel,
          trimestre,
          year: '2025-2026',
          grades: data.grades || [],
          moyenneGenerale: data.moyenneGenerale || 0,
        });
        setDone(d => [...d, student.id]);
        // Petit délai entre chaque PDF
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`Erreur bulletin ${student.firstName}:`, e);
      }
    }
    setGeneratingAll(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Bulletins de notes" subtitle="Génération et téléchargement des bulletins PDF" />
        <main className="flex-1 p-6">

          {/* Filtres */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="flex gap-4 items-end flex-wrap">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Classe</label>
                <div className="relative">
                  <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setDone([]); }}
                    className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Trimestre</label>
                <div className="relative">
                  <select value={trimestre} onChange={e => { setTrimestre(e.target.value); setDone([]); }}
                    className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                  <><Loader2 className="w-4 h-4 animate-spin" />Génération en cours...</>
                ) : (
                  <><FileText className="w-4 h-4" />Générer tous les bulletins ({students.length})</>
                )}
              </button>
            </div>
          </div>

          {/* Liste élèves */}
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
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Élève</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Matricule</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((s: any) => (
                    <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${done.includes(s.id) ? 'bg-green-50/40' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1B3A6B] flex items-center justify-center flex-shrink-0">
                            {s.photoUrl ? (
                              <img src={s.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white text-xs font-bold">{s.firstName[0]}{s.lastName[0]}</span>
                            )}
                          </div>
                          <p className="font-medium text-gray-800 text-sm">{s.firstName} {s.lastName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">{s.registrationNo}</td>
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