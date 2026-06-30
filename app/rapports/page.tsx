'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet, Download, Users, BookOpen,
  BarChart2, RefreshCw, ChevronDown, TrendingUp,
  Award, AlertCircle, CheckCircle
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { classesApi, studentsApi, gradesApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import * as XLSX from 'xlsx';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  registrationNo: string;
  gender: string;
  class: { name: string; level: string };
}

interface Grade {
  subject: string;
  value: number;
  coefficient: number;
  trimestre: string;
  evalType: string;
}

interface StudentReport {
  student: Student;
  grades: Grade[];
  moyenneGenerale: number | null;
  moyennesParMatiere: Record<string, number>;
  totalAbsences: number;
  rang?: number;
}

const TRIMESTERS = ['T1', 'T2', 'T3'];
const TRIMESTER_LABELS: Record<string, string> = {
  T1: '1er Trimestre', T2: '2ème Trimestre', T3: '3ème Trimestre',
};

export default function RapportsPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTrimestre, setSelectedTrimestre] = useState('T1');
  const [reportType, setReportType] = useState<'liste' | 'trimestriel' | 'annuel'>('liste');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [generated, setGenerated] = useState(false);

  const user = authStorage.getUser();

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    classesApi.getAll('2025-2026').then(({ data }) => {
      setClasses(data);
      if (data.length > 0) { setSelectedClass(data[0].id); }
    });
  }, []);

  const generateReport = async () => {
    if (!selectedClass) { return; }
    setLoading(true);
    setGenerated(false);
    try {
      // Charger les élèves
      const { data: studData } = await studentsApi.getAll({ classId: selectedClass });
      const studList = studData.data ?? studData;
      setStudents(studList);

      if (reportType === 'liste') {
        setReports(studList.map((s: any) => ({
          student: s, grades: [], moyenneGenerale: null,
          moyennesParMatiere: {}, totalAbsences: 0,
        })));
        setGenerated(true);
        setLoading(false);
        return;
      }

      // Charger les notes pour chaque élève
      const trimesters = reportType === 'annuel' ? TRIMESTERS : [selectedTrimestre];
      const studentReports: StudentReport[] = [];

      for (const student of studList) {
        const allGrades: Grade[] = [];
        for (const trim of trimesters) {
          try {
            const { data: gradeData } = await gradesApi.getByStudent(student.id, trim);
            const grades = gradeData.grades ?? [];
            allGrades.push(...grades);
          } catch (_) {}
        }

        // Calculer moyennes par matière
        const moyennesParMatiere: Record<string, number> = {};
        const subjectMap: Record<string, { total: number; coef: number }> = {};
        for (const g of allGrades) {
          if (!subjectMap[g.subject]) { subjectMap[g.subject] = { total: 0, coef: 0 }; }
          subjectMap[g.subject].total += g.value * g.coefficient;
          subjectMap[g.subject].coef += g.coefficient;
        }
        for (const [subj, { total, coef }] of Object.entries(subjectMap)) {
          moyennesParMatiere[subj] = coef > 0 ? Math.round((total / coef) * 100) / 100 : 0;
        }

        // Moyenne générale
        const totalCoef = Object.values(subjectMap).reduce((acc, v) => acc + v.coef, 0);
        const totalPts = Object.values(subjectMap).reduce((acc, v) => acc + v.total, 0);
        const moyenneGenerale = totalCoef > 0 ? Math.round((totalPts / totalCoef) * 100) / 100 : null;

        studentReports.push({
          student, grades: allGrades, moyenneGenerale,
          moyennesParMatiere, totalAbsences: 0,
        });
      }

      // Calculer rangs
      const sorted = [...studentReports].sort((a, b) => (b.moyenneGenerale ?? 0) - (a.moyenneGenerale ?? 0));
      sorted.forEach((r, i) => { r.rang = i + 1; });

      setReports(sorted);
      setGenerated(true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── Export XLSX ────────────────────────────────────────────────
  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const className = classes.find(c => c.id === selectedClass)?.name ?? 'Classe';

    if (reportType === 'liste') {
      const data = [
        ['N°', 'Matricule', 'Nom', 'Prénom', 'Genre', 'Classe', 'Niveau'],
        ...reports.map((r, i) => [
          i + 1,
          r.student.registrationNo,
          r.student.lastName,
          r.student.firstName,
          r.student.gender === 'MALE' ? 'M' : 'F',
          r.student.class?.name ?? '',
          r.student.class?.level ?? '',
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{ wch: 4 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 6 }, { wch: 14 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Liste nominative');

    } else {
      // Récupérer toutes les matières
      const allSubjects = Array.from(new Set(reports.flatMap(r => Object.keys(r.moyennesParMatiere))));
      const headers = ['Rang', 'Matricule', 'Nom', 'Prénom', ...allSubjects, 'Moyenne générale', 'Mention'];
      const data = [
        headers,
        ...reports.map(r => [
          r.rang ?? '',
          r.student.registrationNo,
          r.student.lastName,
          r.student.firstName,
          ...allSubjects.map(s => r.moyennesParMatiere[s]?.toFixed(2) ?? '—'),
          r.moyenneGenerale?.toFixed(2) ?? '—',
          getMention(r.moyenneGenerale),
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      const label = reportType === 'annuel' ? 'Rapport annuel' : `Rapport ${TRIMESTER_LABELS[selectedTrimestre]}`;
      XLSX.utils.book_append_sheet(wb, ws, label);
    }

    const filename = reportType === 'liste'
      ? `Liste_${className}_${new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')}.xlsx`
      : reportType === 'annuel'
      ? `Rapport_annuel_${className}.xlsx`
      : `Rapport_${selectedTrimestre}_${className}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  const getMention = (moy: number | null) => {
    if (!moy) { return '—'; }
    if (moy >= 16) { return 'Très bien'; }
    if (moy >= 14) { return 'Bien'; }
    if (moy >= 12) { return 'Assez bien'; }
    if (moy >= 10) { return 'Passable'; }
    return 'Insuffisant';
  };

  const getMentionColor = (moy: number | null) => {
    if (!moy) { return 'text-gray-400'; }
    if (moy >= 14) { return 'text-green-600 font-bold'; }
    if (moy >= 10) { return 'text-blue-600'; }
    return 'text-red-500';
  };

  const allSubjects = Array.from(new Set(reports.flatMap(r => Object.keys(r.moyennesParMatiere))));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Rapports scolaires" subtitle="Liste nominative, rapports trimestriels et annuels" />
        <main className="flex-1 p-6 space-y-6">

          {/* Panneau de configuration */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#1B3A6B]" /> Paramètres du rapport
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Type de rapport */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de rapport</label>
                <select value={reportType} onChange={e => { setReportType(e.target.value as any); setGenerated(false); }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                  <option value="liste">📋 Liste nominative</option>
                  <option value="trimestriel">📊 Rapport trimestriel</option>
                  <option value="annuel">📈 Rapport annuel</option>
                </select>
              </div>

              {/* Classe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
                <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setGenerated(false); }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.level}</option>)}
                </select>
              </div>

              {/* Trimestre (seulement pour rapport trimestriel) */}
              {reportType === 'trimestriel' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trimestre</label>
                  <select value={selectedTrimestre} onChange={e => { setSelectedTrimestre(e.target.value); setGenerated(false); }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                    {TRIMESTERS.map(t => <option key={t} value={t}>{TRIMESTER_LABELS[t]}</option>)}
                  </select>
                </div>
              )}

              {/* Boutons */}
              <div className={`flex gap-2 items-end ${reportType !== 'trimestriel' ? 'md:col-start-4' : ''}`}>
                <button onClick={generateReport} disabled={loading || !selectedClass}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-40">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
                  {loading ? 'Génération...' : 'Générer'}
                </button>
                {generated && (
                  <button onClick={exportXLSX}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
                    <Download className="w-4 h-4" /> XLSX
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Résultats */}
          {generated && (
            <>
              {/* KPIs */}
              {reportType !== 'liste' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <Users className="w-5 h-5 text-blue-600 mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{reports.length}</p>
                    <p className="text-xs text-gray-500">Élèves</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <CheckCircle className="w-5 h-5 text-green-600 mb-2" />
                    <p className="text-2xl font-bold text-green-600">
                      {reports.filter(r => (r.moyenneGenerale ?? 0) >= 10).length}
                    </p>
                    <p className="text-xs text-gray-500">Admis (≥10)</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <AlertCircle className="w-5 h-5 text-red-500 mb-2" />
                    <p className="text-2xl font-bold text-red-500">
                      {reports.filter(r => (r.moyenneGenerale ?? 0) < 10).length}
                    </p>
                    <p className="text-xs text-gray-500">En difficulté (&lt;10)</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <TrendingUp className="w-5 h-5 text-purple-600 mb-2" />
                    <p className="text-2xl font-bold text-purple-600">
                      {reports.length > 0
                        ? (reports.reduce((acc, r) => acc + (r.moyenneGenerale ?? 0), 0) / reports.filter(r => r.moyenneGenerale !== null).length).toFixed(2)
                        : '—'}
                    </p>
                    <p className="text-xs text-gray-500">Moyenne classe</p>
                  </div>
                </div>
              )}

              {/* Tableau */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    {reportType === 'liste' && <><Users className="w-4 h-4" /> Liste nominative — {classes.find(c => c.id === selectedClass)?.name}</>}
                    {reportType === 'trimestriel' && <><BookOpen className="w-4 h-4" /> Rapport {TRIMESTER_LABELS[selectedTrimestre]} — {classes.find(c => c.id === selectedClass)?.name}</>}
                    {reportType === 'annuel' && <><Award className="w-4 h-4" /> Rapport annuel — {classes.find(c => c.id === selectedClass)?.name}</>}
                  </h3>
                  <span className="text-sm text-gray-400">{reports.length} élève(s)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {reportType !== 'liste' && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rang</th>}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Matricule</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nom & Prénom</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Genre</th>
                        {reportType === 'liste' && <>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Classe</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Niveau</th>
                        </>}
                        {reportType !== 'liste' && allSubjects.map(s => (
                          <th key={s} className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{s}</th>
                        ))}
                        {reportType !== 'liste' && <>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Moy. Gén.</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Mention</th>
                        </>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {reports.map((r, i) => (
                        <tr key={r.student.id} className={`hover:bg-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                          {reportType !== 'liste' && (
                            <td className="px-4 py-3 text-sm font-bold text-gray-600">#{r.rang}</td>
                          )}
                          <td className="px-4 py-3 text-sm font-mono text-[#1B3A6B]">{r.student.registrationNo}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-800 text-sm">{r.student.lastName} {r.student.firstName}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {r.student.gender === 'MALE' ? '♂ M' : '♀ F'}
                          </td>
                          {reportType === 'liste' && <>
                            <td className="px-4 py-3 text-sm text-gray-600">{r.student.class?.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{r.student.class?.level}</td>
                          </>}
                          {reportType !== 'liste' && allSubjects.map(s => (
                            <td key={s} className={`px-3 py-3 text-center text-sm ${(r.moyennesParMatiere[s] ?? 0) >= 10 ? 'text-gray-700' : 'text-red-500'}`}>
                              {r.moyennesParMatiere[s]?.toFixed(2) ?? '—'}
                            </td>
                          ))}
                          {reportType !== 'liste' && <>
                            <td className={`px-4 py-3 text-center text-sm font-bold ${getMentionColor(r.moyenneGenerale)}`}>
                              {r.moyenneGenerale?.toFixed(2) ?? '—'}
                            </td>
                            <td className={`px-4 py-3 text-center text-xs font-medium ${getMentionColor(r.moyenneGenerale)}`}>
                              {getMention(r.moyenneGenerale)}
                            </td>
                          </>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!generated && !loading && (
            <div className="bg-white rounded-xl p-16 shadow-sm border border-gray-100 text-center">
              <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-200" />
              <p className="text-gray-400 text-lg font-medium">Sélectionnez les paramètres et cliquez sur "Générer"</p>
              <p className="text-gray-300 text-sm mt-1">Le rapport apparaîtra ici avec option d'export Excel</p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}