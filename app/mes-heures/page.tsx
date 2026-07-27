'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Loader2, QrCode, Smartphone } from 'lucide-react';
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
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
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
      setError('Impossible de charger vos heures. Réessayez.');
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

  const meId = authStorage.getUser()?.id;
  const teachers = Array.isArray(summary?.teachers) ? summary.teachers : [];
  const me =
    (meId && teachers.find((t: any) => t.teacherId === meId)) ||
    teachers[0];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Mes heures"
          subtitle={`${month}/${year} — suivi (pointe via app mobile QR)`}
        />
        <main className="flex-1 p-6 space-y-4 max-w-3xl">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start">
            <Smartphone className="w-5 h-5 text-[#1B3A6B] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold text-[#1B3A6B]">
                Pointe uniquement via l’app mobile
              </p>
              <p className="mt-1">
                Scannez le QR collé sur le bureau de la classe (1er scan = arrivée,
                2e = fin). Les heures viennent de l’horloge du téléphone.
              </p>
            </div>
          </div>

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
                  Aucune séance ce mois. La direction doit générer les séances depuis
                  l’EDT.
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
                      {o.clockSource ? ` · ${o.clockSource}` : ''}
                      {o.room ? ` · ${o.room}` : ''}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    {(o.status === 'SCHEDULED' || o.status === 'IN_PROGRESS') && (
                      <>
                        <QrCode className="w-4 h-4" />
                        Scanner sur mobile
                      </>
                    )}
                    {o.status === 'COMPLETED' && (
                      <span className="text-emerald-600 font-medium">Terminé</span>
                    )}
                    {o.status === 'EXCUSED' && (
                      <span className="text-blue-600 font-medium">Excusé</span>
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
