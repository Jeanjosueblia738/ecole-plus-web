'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { financeApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { canAccessPath } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-CI').format(n || 0) + ' FCFA';

export default function SuiviHeuresPage() {
  const router = useRouter();
  const schoolYear = currentSchoolYear();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await financeApi.hoursSummary(Number(year), Number(month));
      setSummary(data);
    } catch {
      setSummary(null);
      setError('Impossible de charger le suivi des heures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    const role = authStorage.getUser()?.role;
    if (!canAccessPath(role, '/finance/paie/suivi')) {
      router.push('/finance');
      return;
    }
    load();
  }, [router, year, month]);

  const generate = async () => {
    setBusy(true);
    try {
      await financeApi.generateOccurrences({
        year: Number(year),
        month: Number(month),
        schoolYear,
      });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Génération des séances impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Suivi des heures enseignants"
          subtitle="Prévu / fait / retenues estimées"
        />
        <main className="flex-1 p-6 space-y-4 max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/finance/paie" className="inline-flex items-center gap-1 text-sm text-gray-500">
              <ArrowLeft className="w-4 h-4" /> Paie
            </Link>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                className="border rounded-lg px-3 py-2 text-sm w-20"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="Mois"
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm w-28"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Année"
              />
              <button
                type="button"
                onClick={generate}
                disabled={busy}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-brand text-white text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
                Générer séances (EDT)
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Enseignant</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Prévu</th>
                    <th className="px-4 py-3">Fait</th>
                    <th className="px-4 py-3">Manqué</th>
                    <th className="px-4 py-3">Retenue est.</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.teachers || []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        Aucune séance — générez depuis l’emploi du temps.
                      </td>
                    </tr>
                  )}
                  {(summary?.teachers || []).map((t: any) => (
                    <tr key={t.teacherId} className="border-t">
                      <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                      <td className="px-4 py-3 text-xs">
                        {t.payMode} · {fmt(t.hourlyRateXof)}/h
                      </td>
                      <td className="px-4 py-3">{t.plannedMinutes} min</td>
                      <td className="px-4 py-3 text-emerald-700">{t.taughtMinutes} min</td>
                      <td className="px-4 py-3 text-orange-600">{t.shortfallMinutes} min</td>
                      <td className="px-4 py-3 font-semibold text-red-600">
                        {fmt(t.estimatedDeductionXof)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
