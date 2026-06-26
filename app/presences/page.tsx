'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, ChevronDown, CheckCircle, XCircle, Clock } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { classesApi, studentsApi, attendanceApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';

export default function PresencesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<Record<string, string>>({});
  const [subject, setSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    classesApi.getAll('2025-2026').then(({ data }) => {
      setClasses(data);
      if (data.length > 0) setSelectedClass(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    studentsApi.getAll({ classId: selectedClass }).then(({ data }) => {
      setStudents(data);
      const init: Record<string, string> = {};
      data.forEach((s: any) => { init[s.id] = 'PRESENT'; });
      setRecords(init);
    });
  }, [selectedClass]);

  const toggle = (id: string) => {
    setRecords((prev) => ({
      ...prev,
      [id]: prev[id] === 'PRESENT' ? 'ABSENT' : prev[id] === 'ABSENT' ? 'LATE' : 'PRESENT',
    }));
  };

  const handleSave = async () => {
    if (!subject) { alert('Veuillez saisir la matière'); return; }
    setSaving(true);
    try {
      await attendanceApi.bulkCreate({
        classId: selectedClass,
        subject,
        date: today,
        records: students.map((s) => ({
          studentId: s.id,
          status: records[s.id] || 'PRESENT',
          isLate: records[s.id] === 'LATE',
        })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const statusIcon = (status: string) => {
    if (status === 'PRESENT') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'ABSENT') return <XCircle className="w-5 h-5 text-red-500" />;
    return <Clock className="w-5 h-5 text-orange-500" />;
  };

  const statusLabel = (status: string) => {
    if (status === 'PRESENT') return 'Présent';
    if (status === 'ABSENT') return 'Absent';
    return 'En retard';
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Présences" subtitle={`Appel du ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`} />
        <main className="flex-1 p-6">
          {/* Filtres */}
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <input
              type="text"
              placeholder="Matière (ex: Mathématiques)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[240px]"
            />
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Présents', count: Object.values(records).filter(s => s === 'PRESENT').length, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Absents', count: Object.values(records).filter(s => s === 'ABSENT').length, color: 'text-red-500', bg: 'bg-red-50' },
              { label: 'En retard', count: Object.values(records).filter(s => s === 'LATE').length, color: 'text-orange-500', bg: 'bg-orange-50' },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Liste élèves */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            {students.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Sélectionnez une classe pour faire l'appel</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Élève</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Matricule</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => toggle(s.id)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">
                            {s.firstName[0]}{s.lastName[0]}
                          </div>
                          <p className="font-medium text-gray-800 text-sm">{s.firstName} {s.lastName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">{s.registrationNo}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {statusIcon(records[s.id] || 'PRESENT')}
                          <span className="text-sm font-medium">{statusLabel(records[s.id] || 'PRESENT')}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Bouton enregistrer */}
          {students.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-6 py-3 rounded-xl font-medium text-white transition-colors ${saved ? 'bg-green-600' : 'bg-[#1B3A6B] hover:bg-blue-800'}`}
              >
                {saving ? 'Enregistrement...' : saved ? '✓ Appel enregistré !' : 'Enregistrer l\'appel'}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}