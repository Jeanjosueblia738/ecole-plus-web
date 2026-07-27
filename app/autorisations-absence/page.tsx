'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { absenceAuthApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { canAccessPath } from '@/lib/rbac';

const STUDENT_VALIDATORS = ['SURVEILLANT', 'EDUCATOR', 'CENSOR'];
const STAFF_VALIDATORS = ['ADMIN', 'FOUNDER', 'DIRECTOR'];

function daysInclusive(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  const d =
    Math.floor(
      (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
        Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
        86400000,
    ) + 1;
  return d;
}

export default function AutorisationsAbsencePage() {
  const router = useRouter();
  const user = authStorage.getUser();
  const role = String(user?.role || '').toUpperCase();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    category: 'SHORT' as 'SHORT' | 'LEAVE',
  });

  const canValidateStudent = STUDENT_VALIDATORS.includes(role);
  const canValidateStaff = STAFF_VALIDATORS.includes(role);
  const canRequestStaff = ![
    'PARENT',
    'STUDENT',
  ].includes(role);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await absenceAuthApi.list();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
      setError('Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!canAccessPath(role, '/autorisations-absence')) {
      router.push('/dashboard');
      return;
    }
    load();
  }, [router, role]);

  const durationPreview = useMemo(() => {
    if (!form.startDate || !form.endDate) return null;
    try {
      return daysInclusive(form.startDate, form.endDate);
    } catch {
      return null;
    }
  }, [form.startDate, form.endDate]);

  const submitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const max = form.category === 'LEAVE' ? 90 : 3;
    if (durationPreview != null && (durationPreview < 1 || durationPreview > max)) {
      alert(
        form.category === 'LEAVE'
          ? 'Congé RH : maximum 90 jours.'
          : 'Autorisation courte : maximum 3 jours.',
      );
      return;
    }
    setBusy('create');
    try {
      await absenceAuthApi.createStaff(form);
      setForm({ startDate: '', endDate: '', reason: '', category: 'SHORT' });
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Création impossible');
    } finally {
      setBusy('');
    }
  };

  const statusColor = (s: string) => {
    if (s === 'APPROVED') return 'text-emerald-700 bg-emerald-50';
    if (s === 'REJECTED') return 'text-red-700 bg-red-50';
    if (s === 'CANCELLED') return 'text-gray-600 bg-gray-100';
    return 'text-orange-700 bg-orange-50';
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Autorisations d’absence"
          subtitle="Courte ≤3 j · Congé RH ≤90 j · Élèves (vie scolaire) · Personnel (direction)"
        />
        <main className="flex-1 p-6 space-y-4 max-w-4xl">
          {canRequestStaff && (
            <form
              onSubmit={submitStaff}
              className="bg-white border rounded-xl p-4 grid sm:grid-cols-2 gap-3"
            >
              <p className="sm:col-span-2 text-sm font-semibold text-gray-800">
                Nouvelle demande (personnel / enseignant)
              </p>
              <div className="sm:col-span-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, category: 'SHORT' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    form.category === 'SHORT'
                      ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                      : 'bg-white text-gray-600'
                  }`}
                >
                  Autorisation courte (≤3 j)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, category: 'LEAVE' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    form.category === 'LEAVE'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600'
                  }`}
                >
                  Congé RH (≤90 j)
                </button>
              </div>
              <input
                required
                type="date"
                className="border rounded-lg px-3 py-2 text-sm"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
              <input
                required
                type="date"
                className="border rounded-lg px-3 py-2 text-sm"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
              <textarea
                required
                minLength={3}
                className="border rounded-lg px-3 py-2 text-sm sm:col-span-2"
                placeholder="Motif"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={2}
              />
              <div className="sm:col-span-2 flex items-center justify-between gap-2">
                <p
                  className={`text-xs ${
                    durationPreview != null &&
                    durationPreview > (form.category === 'LEAVE' ? 90 : 3)
                      ? 'text-red-600 font-medium'
                      : 'text-gray-500'
                  }`}
                >
                  {durationPreview != null
                    ? `${durationPreview} jour(s) — max ${form.category === 'LEAVE' ? 90 : 3}`
                    : `Sélectionnez les dates (max ${form.category === 'LEAVE' ? 90 : 3} jours)`}
                </p>
                <button
                  type="submit"
                  disabled={
                    busy === 'create' ||
                    (durationPreview != null &&
                      durationPreview > (form.category === 'LEAVE' ? 90 : 3))
                  }
                  className="px-4 py-2 rounded-lg bg-[#1B3A6B] text-white text-sm font-semibold disabled:opacity-50"
                >
                  {busy === 'create' ? 'Envoi…' : 'Demander'}
                </button>
              </div>
            </form>
          )}

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
            <div className="space-y-2">
              {rows.length === 0 && (
                <p className="text-sm text-gray-500">Aucune demande.</p>
              )}
              {rows.map((r) => {
                const canDecide =
                  r.status === 'PENDING' &&
                  ((r.kind === 'STUDENT' && canValidateStudent) ||
                    (r.kind === 'STAFF' && canValidateStaff));
                return (
                  <div key={r.id} className="bg-white border rounded-xl p-4 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {r.kind === 'STUDENT'
                            ? `Élève — ${r.student?.firstName || ''} ${r.student?.lastName || ''}`
                            : `Personnel — ${r.requesterName}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(r.startDate).toLocaleDateString('fr-FR')} →{' '}
                          {new Date(r.endDate).toLocaleDateString('fr-FR')} ·{' '}
                          {r.durationDays} j · {r.requesterRole}
                          {r.category === 'LEAVE' ? ' · Congé RH' : r.kind === 'STAFF' ? ' · Courte' : ''}
                          {r.excusedOccurrences
                            ? ` · ${r.excusedOccurrences} séance(s) excusée(s)`
                            : Array.isArray(r.excusedOccurrenceIds) &&
                                r.excusedOccurrenceIds.length > 0
                              ? ` · ${r.excusedOccurrenceIds.length} séance(s) excusée(s)`
                              : ''}
                        </p>
                        <p className="text-gray-700 mt-2">{r.reason}</p>
                        {r.decisionNote && (
                          <p className="text-xs text-gray-500 mt-1">
                            Note : {r.decisionNote}
                          </p>
                        )}
                      </div>
                      <span
                        className={`h-fit text-xs font-medium px-2 py-1 rounded-full ${statusColor(
                          r.status,
                        )}`}
                      >
                        {r.status}
                      </span>
                    </div>
                    {canDecide && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={async () => {
                            setBusy(r.id);
                            try {
                              await absenceAuthApi.approve(r.id);
                              await load();
                            } catch (e: any) {
                              alert(e?.response?.data?.message || 'Échec');
                            } finally {
                              setBusy('');
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium"
                        >
                          <Check className="w-3.5 h-3.5" /> Approuver
                        </button>
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={async () => {
                            const note = window.prompt('Motif du refus (optionnel)') || undefined;
                            setBusy(r.id);
                            try {
                              await absenceAuthApi.reject(r.id, note);
                              await load();
                            } catch (e: any) {
                              alert(e?.response?.data?.message || 'Échec');
                            } finally {
                              setBusy('');
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium"
                        >
                          <X className="w-3.5 h-3.5" /> Refuser
                        </button>
                      </div>
                    )}
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
