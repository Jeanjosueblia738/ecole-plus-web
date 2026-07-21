'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Save, Loader2, BookOpen, CheckCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { classesApi, gradesApi, studentsApi } from '@/lib/api';
import { currentSchoolYear } from '@/lib/school-year';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';

interface StudentGrade {
  studentId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  value: string; // string pour permettre la saisie vide
}

export default function NotesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [trimestre, setTrimestre] = useState('T1');
  const [subject, setSubject] = useState('');
  const [evalType, setEvalType] = useState('DEVOIR');
  const [coefficient, setCoefficient] = useState('1');
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!hasRole(authStorage.getUser()?.role, can.enterGrades)) {
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
    setLoadError('');
    studentsApi.getAll({ classId: selectedClass })
      .then(({ data }) => {
        setStudents(data.map((s: any) => ({
          studentId: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          photoUrl: s.photoUrl,
          value: '',
        })));
      })
      .catch(() => {
        setStudents([]);
        setLoadError('Impossible de charger les élèves de cette classe.');
      })
      .finally(() => setLoading(false));
  }, [selectedClass]);

  const setGrade = (studentId: string, value: string) => {
    // Valider : entre 0 et 20
    if (value !== '' && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 20)) {
      setErrors(e => ({ ...e, [studentId]: 'Entre 0 et 20' }));
    } else {
      setErrors(e => { const ne = { ...e }; delete ne[studentId]; return ne; });
    }
    setStudents(s => s.map(st => st.studentId === studentId ? { ...st, value } : st));
  };

  const filledCount = students.filter(s => s.value !== '').length;
  const hasErrors = Object.keys(errors).length > 0;

  const handleSave = async () => {
    if (!subject.trim()) { alert('Veuillez saisir la matière'); return; }
    if (filledCount === 0) { alert('Aucune note saisie'); return; }
    if (hasErrors) { alert('Corrigez les erreurs avant d\'enregistrer'); return; }

    setSaving(true);
    try {
      const grades = students
        .filter(s => s.value !== '')
        .map(s => ({
          studentId: s.studentId,
          subject,
          value: Number(s.value),
          trimestre,
          evalType,
          coefficient: Number(coefficient),
        }));

      await gradesApi.bulkCreate({ classId: selectedClass, grades });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Reset notes
      setStudents(s => s.map(st => ({ ...st, value: '' })));
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || '';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Saisie des notes"
          subtitle={selectedClassName ? `Classe : ${selectedClassName}` : 'Sélectionnez une classe'}
        />
        <main className="flex-1 p-6">
          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
              {loadError}
            </div>
          )}

          {/* Paramètres de saisie */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">Paramètres de l'évaluation</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

              {/* Classe */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Classe</label>
                <div className="relative">
                  <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Trimestre */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Trimestre</label>
                <div className="relative">
                  <select value={trimestre} onChange={e => setTrimestre(e.target.value)}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="T1">1er Trimestre</option>
                    <option value="T2">2ème Trimestre</option>
                    <option value="T3">3ème Trimestre</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Matière */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Matière *</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="ex: Mathématiques"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Type évaluation */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <div className="relative">
                  <select value={evalType} onChange={e => setEvalType(e.target.value)}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="DEVOIR">Devoir</option>
                    <option value="COMPOSITION">Composition</option>
                    <option value="EXAMEN">Examen</option>
                    <option value="INTERROGATION">Interrogation</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Coefficient */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Coefficient</label>
                <input
                  type="number"
                  min="1" max="10"
                  value={coefficient}
                  onChange={e => setCoefficient(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Tableau de saisie */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
            {/* En-tête tableau */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-800">
                  {students.length} élève(s)
                </span>
                {filledCount > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {filledCount}/{students.length} notes saisies
                  </span>
                )}
              </div>
              {/* Boutons remplissage rapide */}
              <div className="flex gap-2">
                <button
                  onClick={() => setStudents(s => s.map(st => ({ ...st, value: '' })))}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Tout effacer
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : loadError ? (
              <div className="py-16 text-center text-red-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Erreur de chargement</p>
              </div>
            ) : students.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Aucun élève dans cette classe</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase w-12">#</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Élève</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase w-40">
                      Note /20
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase w-32">
                      Appréciation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((s, idx) => {
                    const note = Number(s.value);
                    const hasNote = s.value !== '';
                    const appreciation = hasNote
                      ? note >= 16 ? { label: 'Très bien', color: 'text-green-600 bg-green-50' }
                      : note >= 14 ? { label: 'Bien', color: 'text-blue-600 bg-blue-50' }
                      : note >= 12 ? { label: 'Assez bien', color: 'text-teal-600 bg-teal-50' }
                      : note >= 10 ? { label: 'Passable', color: 'text-orange-500 bg-orange-50' }
                      : { label: 'Insuffisant', color: 'text-red-500 bg-red-50' }
                      : null;

                    return (
                      <tr key={s.studentId} className={`hover:bg-gray-50 transition-colors ${hasNote ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-6 py-3 text-sm text-gray-400">{idx + 1}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1B3A6B] flex items-center justify-center flex-shrink-0">
                              {s.photoUrl ? (
                                <img src={s.photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-white text-xs font-bold">
                                  {s.firstName[0]}{s.lastName[0]}
                                </span>
                              )}
                            </div>
                            <p className="font-medium text-gray-800 text-sm">
                              {s.firstName} {s.lastName}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              min="0" max="20"
                              step="0.25"
                              placeholder="—"
                              value={s.value}
                              onChange={e => setGrade(s.studentId, e.target.value)}
                              onKeyDown={e => {
                                // Tab/Enter → passer à l'élève suivant
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const next = document.querySelectorAll('input[type="number"]')[idx + 1] as HTMLInputElement;
                                  next?.focus();
                                }
                              }}
                              className={`w-20 text-center px-3 py-2 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
                                ${errors[s.studentId] ? 'border-red-400 bg-red-50' :
                                hasNote ? 'border-blue-300 bg-white' :
                                'border-gray-200 bg-gray-50'}`}
                            />
                            {errors[s.studentId] && (
                              <span className="text-red-500 text-xs">{errors[s.studentId]}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          {appreciation && (
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${appreciation.color}`}>
                              {appreciation.label}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Ligne stats */}
                {filledCount > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-gray-600">
                        Moyenne de classe
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className="font-bold text-blue-600 text-lg">
                          {(students
                            .filter(s => s.value !== '')
                            .reduce((sum, s) => sum + Number(s.value), 0) / filledCount
                          ).toFixed(2)}/20
                        </span>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>

          {/* Bouton enregistrer */}
          {students.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Appuyez sur <kbd className="bg-gray-100 px-2 py-0.5 rounded text-xs">Entrée</kbd> pour passer à l'élève suivant
              </p>
              <button
                onClick={handleSave}
                disabled={saving || filledCount === 0 || hasErrors}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white transition-all shadow-sm
                  ${saved ? 'bg-green-600' :
                  filledCount === 0 || hasErrors ? 'bg-gray-300 cursor-not-allowed' :
                  'bg-[#1B3A6B] hover:bg-blue-800'}`}
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Enregistrement...</>
                ) : saved ? (
                  <><CheckCircle className="w-4 h-4" />Notes enregistrées !</>
                ) : (
                  <><Save className="w-4 h-4" />Enregistrer {filledCount > 0 ? `(${filledCount} notes)` : 'les notes'}</>
                )}
              </button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}