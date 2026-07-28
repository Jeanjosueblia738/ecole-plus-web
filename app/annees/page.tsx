'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarRange, Loader2, Archive, CheckCircle2, Copy } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { academicYearsApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, canAccessPath, hasRole } from '@/lib/rbac';
import { calendarSchoolYear } from '@/lib/school-year';

type AcademicYear = {
  id: string;
  label: string;
  status: 'PLANNED' | 'ACTIVE' | 'ARCHIVED';
  isCurrent: boolean;
  _count?: { enrollments: number };
};

const STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Planifiée',
  ACTIVE: 'Active',
  ARCHIVED: 'Archivée',
};

export default function AnneesPage() {
  const router = useRouter();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cloneSource, setCloneSource] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await academicYearsApi.getAll();
      setYears(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Impossible de charger les années');
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
    if (!canAccessPath(role, '/annees')) {
      router.push('/dashboard');
      return;
    }
    load();
  }, [router]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setMessage('');
    try {
      await academicYearsApi.create({ label: label.trim() || calendarSchoolYear() });
      setLabel('');
      setMessage('Année créée');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Création impossible');
    } finally {
      setCreating(false);
    }
  };

  const activate = async (id: string) => {
    setBusyId(id);
    setError('');
    try {
      await academicYearsApi.activate(id);
      setMessage('Année activée comme année courante');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Activation impossible');
    } finally {
      setBusyId(null);
    }
  };

  const archive = async (id: string) => {
    if (!confirm('Archiver cette année ? Elle passera en lecture seule.')) return;
    setBusyId(id);
    setError('');
    try {
      await academicYearsApi.archive(id);
      setMessage('Année archivée');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Archivage impossible');
    } finally {
      setBusyId(null);
    }
  };

  const cloneClasses = async (targetId: string) => {
    const sourceYearId = cloneSource[targetId];
    if (!sourceYearId) {
      setError('Choisissez une année source pour cloner les classes');
      return;
    }
    setBusyId(targetId);
    setError('');
    try {
      const { data } = await academicYearsApi.cloneClasses(targetId, sourceYearId);
      setMessage(
        `${data.createdCount} classe(s) clonée(s), ${data.skippedCount} déjà existante(s)`,
      );
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Clonage impossible');
    } finally {
      setBusyId(null);
    }
  };

  const canManage = hasRole(authStorage.getUser()?.role, can.manageAcademicYears);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Années scolaires" subtitle="Créer, activer et archiver les années" />
        <main className="flex-1 p-6 max-w-4xl space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}
          {message && (
            <div className="bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-lg">
              {message}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center justify-between">
            <p className="text-sm text-gray-600">
              Passage / réinscription des élèves vers une nouvelle année.
            </p>
            {hasRole(authStorage.getUser()?.role, can.studentPassage) && (
              <Link
                href="/annees/passage"
                className="text-sm font-medium text-[#1B3A6B] hover:underline"
              >
                Ouvrir le passage élèves →
              </Link>
            )}
          </div>

          {canManage && (
            <form
              onSubmit={create}
              className="bg-white rounded-xl border border-gray-100 p-6 space-y-3"
            >
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-[#1B3A6B]" />
                Nouvelle année
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={calendarSchoolYear()}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-[#1B3A6B] text-white rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  {creating ? 'Création…' : 'Créer'}
                </button>
              </div>
              <p className="text-xs text-gray-500">Format : 2025-2026</p>
            </form>
          )}

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-8 flex justify-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : years.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">Aucune année scolaire.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {years.map((y) => (
                  <li key={y.id} className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {y.label}
                          {y.isCurrent && (
                            <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                              Courante
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {STATUS_LABEL[y.status] || y.status}
                          {typeof y._count?.enrollments === 'number'
                            ? ` · ${y._count.enrollments} inscription(s)`
                            : ''}
                        </p>
                      </div>
                      {canManage && y.status !== 'ARCHIVED' && (
                        <div className="flex flex-wrap gap-2">
                          {!y.isCurrent && (
                            <button
                              type="button"
                              disabled={busyId === y.id}
                              onClick={() => activate(y.id)}
                              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Activer
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === y.id}
                            onClick={() => archive(y.id)}
                            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Archiver
                          </button>
                        </div>
                      )}
                    </div>

                    {canManage && y.status !== 'ARCHIVED' && (
                      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                        <select
                          value={cloneSource[y.id] || ''}
                          onChange={(e) =>
                            setCloneSource((s) => ({ ...s, [y.id]: e.target.value }))
                          }
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                        >
                          <option value="">Cloner classes depuis…</option>
                          {years
                            .filter((o) => o.id !== y.id)
                            .map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.label}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          disabled={busyId === y.id}
                          onClick={() => cloneClasses(y.id)}
                          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Cloner les classes
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
