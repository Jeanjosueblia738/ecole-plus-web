'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, RefreshCw, Plus, Trash2, BookOpen, User } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import api from '@/lib/api';
import { authStorage } from '@/lib/auth';

const DAYS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
const DAY_LABELS: Record<string, string> = {
  LUNDI: 'Lundi', MARDI: 'Mardi', MERCREDI: 'Mercredi',
  JEUDI: 'Jeudi', VENDREDI: 'Vendredi', SAMEDI: 'Samedi',
};

const COLORS = [
  'bg-blue-50 border-blue-200 text-blue-800',
  'bg-purple-50 border-purple-200 text-purple-800',
  'bg-green-50 border-green-200 text-green-800',
  'bg-orange-50 border-orange-200 text-orange-800',
  'bg-teal-50 border-teal-200 text-teal-800',
  'bg-pink-50 border-pink-200 text-pink-800',
  'bg-indigo-50 border-indigo-200 text-indigo-800',
  'bg-yellow-50 border-yellow-200 text-yellow-800',
];

function getSubjectColor(subject: string) {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface Slot {
  id: string;
  subject: string;
  day: string;
  startTime: string;
  endTime: string;
  room?: string;
  teacher?: { firstName: string; lastName: string };
  class?: { name: string };
}

interface Class { id: string; name: string; level: string; }
interface Teacher { id: string; firstName: string; lastName: string; }

export default function EmploiDuTempsPage() {
  const router = useRouter();
  const [byDay, setByDay] = useState<Record<string, Slot[]>>({});
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const year = new Date().getFullYear();
  const currentYear = `${year}-${year + 1}`;

  const user = authStorage.getUser();
  const isAdmin = ['ADMIN', 'DIRECTOR', 'FOUNDER', 'SECRETARY'].includes(user?.role ?? '');

  const [form, setForm] = useState({
    classId: '', teacherId: '', subject: '',
    day: 'LUNDI', startTime: '08:00', endTime: '09:00', room: '', year: currentYear,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    loadClasses();
    loadTeachers();
  }, []);

  useEffect(() => {
    if (viewMode === 'class' && selectedClass) loadTimetable();
    if (viewMode === 'teacher' && selectedTeacher) loadTimetable();
  }, [selectedClass, selectedTeacher, viewMode]);

  const loadClasses = async () => {
    try {
      const { data } = await api.get('/classes');
      setClasses(data.data ?? data);
    } catch (e) { console.error(e); }
  };

  const loadTeachers = async () => {
    try {
      const { data } = await api.get('/teachers');
      setTeachers(data.data ?? data);
    } catch (e) { console.error(e); }
  };

  const loadTimetable = async () => {
    setLoading(true);
    setByDay({});
    try {
      let url = '';
      if (viewMode === 'class' && selectedClass) {
        url = `/timetable/class/${selectedClass}?year=${currentYear}`;
      } else if (viewMode === 'teacher' && selectedTeacher) {
        url = `/timetable/teacher/${selectedTeacher}?year=${currentYear}`;
      }
      if (!url) { return; }
      const { data } = await api.get(url);
      setByDay(data.byDay ?? {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.classId || !form.subject || !form.startTime || !form.endTime) { return; }
    setSaving(true);
    try {
      await api.post('/timetable', form);
      setShowForm(false);
      setForm({ classId: '', teacherId: '', subject: '', day: 'LUNDI', startTime: '08:00', endTime: '09:00', room: '', year: currentYear });
      if (selectedClass === form.classId) { loadTimetable(); }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(`/timetable/${id}`);
      setByDay(prev => {
        const updated = { ...prev };
        for (const day in updated) {
          updated[day] = updated[day].filter(s => s.id !== id);
        }
        return updated;
      });
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  const totalSlots = Object.values(byDay).reduce((acc, slots) => acc + slots.length, 0);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Emploi du temps" subtitle={`Année scolaire ${currentYear}`} />
        <main className="flex-1 p-6 space-y-6">

          {/* Barre de contrôle */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex gap-3 flex-wrap items-center">
                {/* Toggle vue */}
                <div className="flex bg-gray-100 rounded-xl p-1">
                  <button onClick={() => { setViewMode('class'); setSelectedTeacher(''); }}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'class' ? 'bg-white text-[#1B3A6B] shadow-sm' : 'text-gray-500'}`}>
                    Par classe
                  </button>
                  <button onClick={() => { setViewMode('teacher'); setSelectedClass(''); }}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'teacher' ? 'bg-white text-[#1B3A6B] shadow-sm' : 'text-gray-500'}`}>
                    Par enseignant
                  </button>
                </div>

                {/* Sélecteur classe */}
                {viewMode === 'class' && (
                  <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] min-w-40">
                    <option value="">Choisir une classe</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.level}</option>)}
                  </select>
                )}

                {/* Sélecteur enseignant */}
                {viewMode === 'teacher' && (
                  <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] min-w-48">
                    <option value="">Choisir un enseignant</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                  </select>
                )}

                <button onClick={loadTimetable} disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {isAdmin && (
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm hover:bg-blue-800">
                  <Plus className="w-4 h-4" /> Ajouter un créneau
                </button>
              )}
            </div>
          </div>

          {/* Grille emploi du temps */}
          {!selectedClass && !selectedTeacher ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-200" />
              <p className="text-gray-400 text-lg font-medium">
                {viewMode === 'class' ? 'Sélectionnez une classe' : 'Sélectionnez un enseignant'}
              </p>
              <p className="text-gray-300 text-sm mt-1">pour afficher l'emploi du temps</p>
            </div>
          ) : loading ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full mx-auto" />
            </div>
          ) : totalSlots === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400">Aucun créneau configuré</p>
              {isAdmin && (
                <button onClick={() => setShowForm(true)}
                  className="mt-4 bg-[#1B3A6B] text-white px-6 py-2 rounded-xl text-sm hover:bg-blue-800">
                  Ajouter un créneau
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {DAYS.map(day => (
                <div key={day} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-[#1B3A6B] px-4 py-3">
                    <h3 className="text-white font-semibold text-sm">{DAY_LABELS[day]}</h3>
                    <p className="text-blue-200 text-xs">{(byDay[day] ?? []).length} créneau(x)</p>
                  </div>
                  <div className="p-3 space-y-2 min-h-32">
                    {(byDay[day] ?? []).length === 0 ? (
                      <p className="text-gray-300 text-xs text-center py-4">Libre</p>
                    ) : (
                      [...(byDay[day] ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime)).map(slot => (
                        <div key={slot.id} className={`p-2.5 rounded-lg border text-xs ${getSubjectColor(slot.subject)}`}>
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate">{slot.subject}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3 flex-shrink-0" />
                                <span>{slot.startTime} — {slot.endTime}</span>
                              </div>
                              {slot.teacher && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <User className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{slot.teacher.firstName} {slot.teacher.lastName}</span>
                                </div>
                              )}
                              {slot.class && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <BookOpen className="w-3 h-3 flex-shrink-0" />
                                  <span>{slot.class.name}</span>
                                </div>
                              )}
                              {slot.room && (
                                <p className="mt-0.5 text-xs opacity-70">Salle : {slot.room}</p>
                              )}
                            </div>
                            {isAdmin && (
                              <button onClick={() => handleDelete(slot.id)} disabled={deleting === slot.id}
                                className="text-red-400 hover:text-red-600 flex-shrink-0 p-0.5">
                                {deleting === slot.id
                                  ? <RefreshCw className="w-3 h-3 animate-spin" />
                                  : <Trash2 className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>

      {/* Modal ajout créneau */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Nouveau créneau</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Classe *</label>
                  <select value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                    <option value="">Choisir</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enseignant</label>
                  <select value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                    <option value="">Aucun</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matière *</label>
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="ex: Mathématiques"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jour *</label>
                  <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                    {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Début *</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fin *</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salle</label>
                <input value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                  placeholder="ex: Salle A1"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Annuler
                </button>
                <button onClick={handleSave} disabled={saving || !form.classId || !form.subject}
                  className="flex-1 bg-[#1B3A6B] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-40">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}