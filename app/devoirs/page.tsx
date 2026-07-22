'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NotebookPen, ChevronDown, Loader2, Calendar, AlertCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { cahierApi } from '@/lib/api';
import { loadClassesForUser } from '@/lib/load-classes-for-user';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';

interface HomeworkItem {
  id: string;
  subject: string;
  description: string;
  dueDate?: string;
  sessionDate?: string;
  trimestre?: string;
  status: string;
  class?: { id: string; name: string; level: string };
  teacher?: string | null;
}

export default function DevoirsPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!hasRole(authStorage.getUser()?.role, can.viewCahier)) {
      router.push('/dashboard');
      return;
    }
    loadClassesForUser(authStorage.getUser()?.role)
      .then((data) => {
        setClasses(data);
        setSelectedClass('');
      })
      .catch(() => setLoadError('Impossible de charger les classes.'));
  }, [router]);

  useEffect(() => {
    loadHomework();
  }, [selectedClass]);

  const loadHomework = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await cahierApi.getHomework(selectedClass || undefined);
      const list = data?.items ?? [
        ...(data?.upcoming ?? []),
        ...(data?.past ?? []),
      ];
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
      setLoadError('Impossible de charger les travaux à rendre.');
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const filtered = items.filter((i) => {
    if (filter === 'upcoming') return i.status === 'upcoming' || i.status === 'undated';
    if (filter === 'past') return i.status === 'past';
    return true;
  });

  const statusLabel = (s: string) => {
    if (s === 'past') return { text: 'Passé', cls: 'bg-gray-100 text-gray-600' };
    if (s === 'undated') return { text: 'Sans date', cls: 'bg-amber-50 text-amber-700' };
    return { text: 'À venir', cls: 'bg-green-50 text-green-700' };
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Travail à rendre" subtitle="Agenda des travaux à rendre (cahier de texte)" />
        <main className="flex-1 p-6">
          {loadError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {loadError}
            </div>
          )}

          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
              >
                <option value="">Toutes les classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
              >
                <option value="all">Tous</option>
                <option value="upcoming">À venir</option>
                <option value="past">Passés</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <span className="text-sm text-gray-500 ml-auto">
              {filtered.length} travail{filtered.length !== 1 ? 'x' : ''} à rendre
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16 text-gray-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Chargement…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
              <NotebookPen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun travail à rendre enregistré</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((hw) => {
                const st = statusLabel(hw.status);
                return (
                  <div key={hw.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-gray-800">{hw.subject}</span>
                          {hw.class && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              {hw.class.name}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>
                            {st.text}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{hw.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Remise : {fmtDate(hw.dueDate)}
                          </span>
                          {hw.sessionDate && (
                            <span>Séance : {fmtDate(hw.sessionDate)}</span>
                          )}
                          {hw.teacher && <span>{hw.teacher}</span>}
                          {hw.trimestre && <span>{hw.trimestre}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
