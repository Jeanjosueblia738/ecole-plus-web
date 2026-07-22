'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, ChevronDown, CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { studentsApi, attendanceApi } from '@/lib/api';
import { loadClassesForUser } from '@/lib/load-classes-for-user';
import { authStorage } from '@/lib/auth';
import { can, canAccessPath, hasRole } from '@/lib/rbac';

export default function PresencesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<Record<string, string>>({});
  const [subject, setSubject] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsResult, setSmsResult] = useState<string | null>(null);
  const [banner, setBanner] = useState('');
  const [studentsError, setStudentsError] = useState('');

  const user = authStorage.getUser();
  const canDoAppel = hasRole(user?.role, can.doAppel);
  const today = new Date().toISOString().split('T')[0];

  const absentIds = students
    .filter((s) => records[s.id] === 'ABSENT')
    .map((s) => s.id);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!canAccessPath(authStorage.getUser()?.role, '/presences')) {
      router.push('/dashboard');
      return;
    }
    if (!canDoAppel) {
      setBanner('Consultation seule : seuls les enseignants, surveillants et éducateurs peuvent faire l\'appel.');
    }
    loadClassesForUser(authStorage.getUser()?.role)
      .then((data) => {
        setClasses(data);
        if (data.length > 0) setSelectedClass(data[0].id);
        else if (authStorage.getUser()?.role === 'TEACHER') {
          setBanner((prev) =>
            prev
              ? `${prev} Aucune classe assignée pour cet enseignant.`
              : 'Aucune classe assignée pour cet enseignant.',
          );
        }
      })
      .catch(() => {
        setBanner((prev) =>
          prev
            ? `${prev} Impossible de charger les classes.`
            : 'Impossible de charger les classes.',
        );
      });
  }, [router]);

  useEffect(() => {
    if (!selectedClass) return;
    setSaved(false);
    setSmsResult(null);
    setStudentsError('');
    studentsApi.getAll({ classId: selectedClass }).then(({ data }) => {
      setStudents(data);
      const init: Record<string, string> = {};
      data.forEach((s: any) => { init[s.id] = 'PRESENT'; });
      setRecords(init);
    }).catch(() => {
      setStudents([]);
      setRecords({});
      setStudentsError('Impossible de charger les élèves de cette classe.');
    });
  }, [selectedClass]);

  const toggle = (id: string) => {
    setRecords((prev) => ({
      ...prev,
      [id]: prev[id] === 'PRESENT' ? 'ABSENT' : prev[id] === 'ABSENT' ? 'LATE' : 'PRESENT',
    }));
    setSaved(false);
    setSmsResult(null);
  };

  const handleSave = async () => {
    if (!subject.trim()) { alert('Veuillez saisir la matière'); return; }
    if (!startTime || !endTime) { alert('Indiquez l\'heure de début et de fin du cours'); return; }
    setSaving(true);
    setSmsResult(null);
    try {
      await attendanceApi.bulkCreate({
        classId: selectedClass,
        subject: subject.trim(),
        date: today,
        startTime,
        endTime,
        records: students.map((s) => ({
          studentId: s.id,
          status: records[s.id] || 'PRESENT',
          isLate: records[s.id] === 'LATE',
        })),
      });
      setSaved(true);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l\'enregistrement de l\'appel');
    } finally {
      setSaving(false);
    }
  };

  const handleSmsParents = async () => {
    if (!saved) {
      alert('Enregistrez d\'abord l\'appel');
      return;
    }
    if (absentIds.length === 0) {
      alert('Aucun élève absent coché');
      return;
    }
    setSmsLoading(true);
    setSmsResult(null);
    try {
      const { data } = await attendanceApi.notifyAbsents({
        classId: selectedClass,
        subject: subject.trim(),
        date: today,
        startTime,
        endTime,
        studentIds: absentIds,
      });
      const sim = data.simulated ? ' (mode simulation — configurez SMS_WEBHOOK_URL)' : '';
      setSmsResult(`${data.message}${sim}`);
    } catch (e: any) {
      console.error(e);
      setSmsResult(e?.response?.data?.message || 'Erreur envoi SMS');
    } finally {
      setSmsLoading(false);
    }
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
          {banner && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm mb-4">
              {banner}
            </div>
          )}
          {studentsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
              {studentsError}
            </div>
          )}
          <div className="flex gap-4 mb-6 flex-wrap items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Classe</label>
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
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Matière</label>
              <input
                type="text"
                placeholder="ex: Mathématiques"
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setSaved(false); setSmsResult(null); }}
                className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Début cours</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => { setStartTime(e.target.value); setSaved(false); }}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fin cours</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => { setEndTime(e.target.value); setSaved(false); }}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Cochez les absents (clic sur la ligne : Présent → Absent → Retard). Après enregistrement, envoyez un SMS aux parents.
          </p>

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

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            {students.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Sélectionnez une classe pour faire l&apos;appel</p>
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
                    <tr
                      key={s.id}
                      className={`hover:bg-gray-50 cursor-pointer ${records[s.id] === 'ABSENT' ? 'bg-red-50/50' : ''}`}
                      onClick={() => canDoAppel && toggle(s.id)}
                    >
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

          {smsResult && (
            <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-800 text-sm border border-blue-100">
              {smsResult}
            </div>
          )}

          {students.length > 0 && canDoAppel && (
            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-6 py-3 rounded-xl font-medium text-white transition-colors ${saved ? 'bg-green-600' : 'bg-[#1B3A6B] hover:bg-blue-800'} disabled:opacity-50`}
              >
                {saving ? 'Enregistrement...' : saved ? '✓ Appel enregistré' : 'Enregistrer l\'appel'}
              </button>
              <button
                onClick={handleSmsParents}
                disabled={!saved || smsLoading || absentIds.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-40 transition-colors"
                title={!saved ? 'Enregistrez d\'abord l\'appel' : `${absentIds.length} absent(s)`}
              >
                <MessageSquare className="w-4 h-4" />
                {smsLoading
                  ? 'Envoi SMS...'
                  : `SMS parents (${absentIds.length} absent${absentIds.length > 1 ? 's' : ''})`}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
