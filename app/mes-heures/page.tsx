'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Loader2, Play, Square } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { financeApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-CI').format(n || 0) + ' FCFA';

export default function MesHeuresPage() {
  const router = useRouter();
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [occ, sum] = await Promise.all([
        financeApi.listOccurrences(year, month),
        financeApi.hoursSummary(year, month),
      ]);
      setOccurrences(Array.isArray(occ.data) ? occ.data : []);
      setSummary(sum.data);
    } catch {
      setOccurrences([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    const role = String(authStorage.getUser()?.role || '').toUpperCase();
    if (role !== 'TEACHER') {
      router.push('/dashboard');
      return;
    }
    load();
  }, [router]);

  const me = summary?.teachers?.[0];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Mes heures" subtitle={`${month}/${year} — pointe & suivi`} />
        <main className="flex-1 p-6 space-y-4 max-w-3xl">
          {me && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border rounded-xl p-3">
                <p className="text-xs text-gray-500">Prévu</p>
                <p className="font-bold">{me.plannedMinutes} min</p>
              </div>
              <div className="bg-white border rounded-xl p-3">
                <p className="text-xs text-gray-500">Fait</p>
                <p className="font-bold text-emerald-700">{me.taughtMinutes} min</p>
              </div>
              <div className="bg-white border rounded-xl p-3">
                <p className="text-xs text-gray-500">Manqué</p>
                <p className="font-bold text-orange-600">{me.shortfallMinutes} min</p>
              </div>
              <div className="bg-white border rounded-xl p-3">
                <p className="text-xs text-gray-500">Retenue est.</p>
                <p className="font-bold text-red-600">{fmt(me.estimatedDeductionXof)}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {occurrences.length === 0 && (
                <p className="text-sm text-gray-500">
                  Aucune séance ce mois. La direction doit générer les séances depuis l’EDT.
                </p>
              )}
              {occurrences.map((o) => (
                <div
                  key={o.id}
                  className="bg-white border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-gray-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#1B3A6B]" />
                      {o.subject} · {o.class?.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(o.date).toLocaleDateString('fr-FR')} · {o.startTime}–
                      {o.endTime} · prévu {o.plannedMinutes} min · {o.status}
                      {o.actualMinutes != null ? ` · fait ${o.actualMinutes} min` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {o.status === 'SCHEDULED' && (
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={async () => {
                          setBusyId(o.id);
                          try {
                            await financeApi.clockIn(o.id);
                            await load();
                          } catch (e: any) {
                            alert(e?.response?.data?.message || 'Pointe début impossible');
                          } finally {
                            setBusyId('');
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium"
                      >
                        <Play className="w-3.5 h-3.5" /> Début
                      </button>
                    )}
                    {o.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={async () => {
                          setBusyId(o.id);
                          try {
                            await financeApi.clockOut(o.id);
                            await load();
                          } catch (e: any) {
                            alert(e?.response?.data?.message || 'Pointe fin impossible');
                          } finally {
                            setBusyId('');
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-medium"
                      >
                        <Square className="w-3.5 h-3.5" /> Fin
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
