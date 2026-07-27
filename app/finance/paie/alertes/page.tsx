'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, RefreshCw, UserX } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { financeApi, teachersApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { canAccessPath, hasRole } from '@/lib/rbac';

export default function AlertesPresencePage() {
  const router = useRouter();
  const role = String(authStorage.getUser()?.role || '').toUpperCase();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any>(null);
  const [error, setError] = useState('');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teachersNote, setTeachersNote] = useState('');
  const [busy, setBusy] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    setTeachersNote('');
    try {
      const { data } = await financeApi.todayAlerts();
      setAlerts(data);
      try {
        const t = await teachersApi.getAll();
        setTeachers(Array.isArray(t.data) ? t.data : []);
      } catch {
        setTeachers([]);
        setTeachersNote(
          'Liste des remplaçants indisponible — réessayez plus tard.',
        );
      }
    } catch {
      setError('Impossible de charger les alertes.');
      setAlerts(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (
      !canAccessPath(role, '/finance/paie/alertes') &&
      !hasRole(role, ['ADMIN', 'FOUNDER', 'DIRECTOR', 'ACCOUNTANT', 'CENSOR', 'SURVEILLANT', 'EDUCATOR'])
    ) {
      router.push('/dashboard');
      return;
    }
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [router, role]);

  const assignSub = async (occurrenceId: string, substituteTeacherId: string) => {
    setBusy(occurrenceId);
    try {
      await financeApi.assignSubstitute(occurrenceId, substituteTeacherId || null);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Assignation impossible');
    } finally {
      setBusy('');
    }
  };

  const report = async (occurrenceId: string) => {
    const note = prompt('Motif du cours non assuré ?') || undefined;
    setBusy(occurrenceId);
    try {
      await financeApi.reportUncovered(occurrenceId, note);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Signalement impossible');
    } finally {
      setBusy('');
    }
  };

  const s = alerts?.summary;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Alertes présence (jour J)"
          subtitle="Cours non pointés · sorties en retard · non assurés"
        />
        <main className="flex-1 p-6 space-y-4 max-w-5xl">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={load}
              className="flex items-center gap-2 px-3 py-2 border rounded-xl text-sm bg-white"
            >
              <RefreshCw className="w-4 h-4" /> Actualiser
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}
          {teachersNote && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
              {teachersNote}
            </div>
          )}

          {loading && !alerts ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Non pointés', value: s?.unpointed ?? 0, color: 'text-orange-600' },
                  { label: 'Sortie en retard', value: s?.overdueCheckout ?? 0, color: 'text-red-600' },
                  { label: 'Non assurés', value: s?.uncovered ?? 0, color: 'text-purple-600' },
                ].map((k) => (
                  <div key={k.label} className="bg-white rounded-xl border p-4">
                    <p className="text-xs text-gray-500">{k.label}</p>
                    <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              <section className="bg-white rounded-xl border p-4 space-y-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Cours sans pointe
                </h2>
                {(alerts?.unpointed || []).length === 0 && (
                  <p className="text-sm text-gray-400">Aucun pour le moment.</p>
                )}
                {(alerts?.unpointed || []).map((o: any) => (
                  <div
                    key={o.id}
                    className="border rounded-lg p-3 text-sm flex flex-col sm:flex-row sm:items-center gap-2 justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {o.subject} · {o.className}{' '}
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            o.severity === 'HIGH'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-yellow-50 text-yellow-700'
                          }`}
                        >
                          {o.severity}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {o.teacherName} · {o.startTime}-{o.endTime}
                        {o.room ? ` · ${o.room}` : ''}
                        {o.substituteName ? ` · remplacé par ${o.substituteName}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <select
                        className="border rounded-lg text-xs px-2 py-1.5"
                        defaultValue=""
                        disabled={busy === o.id}
                        onChange={(e) => {
                          if (e.target.value) assignSub(o.id, e.target.value);
                        }}
                      >
                        <option value="">Remplaçant…</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.firstName} {t.lastName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={busy === o.id}
                        onClick={() => report(o.id)}
                        className="text-xs px-2 py-1.5 rounded-lg border text-purple-700 hover:bg-purple-50"
                      >
                        <UserX className="w-3.5 h-3.5 inline mr-1" />
                        Non assuré
                      </button>
                    </div>
                  </div>
                ))}
              </section>

              <section className="bg-white rounded-xl border p-4 space-y-2">
                <h2 className="font-semibold text-sm">Sorties non pointées</h2>
                {(alerts?.overdueCheckout || []).map((o: any) => (
                  <p key={o.id} className="text-sm text-gray-700">
                    {o.subject} · {o.className} — {o.teacherName} (fin prévue {o.endTime})
                  </p>
                ))}
                {(alerts?.overdueCheckout || []).length === 0 && (
                  <p className="text-sm text-gray-400">RAS</p>
                )}
              </section>

              <section className="bg-white rounded-xl border p-4 space-y-2">
                <h2 className="font-semibold text-sm">Cours signalés non assurés</h2>
                {(alerts?.uncovered || []).map((o: any) => (
                  <p key={o.id} className="text-sm text-gray-700">
                    {o.subject} · {o.className} — {o.teacherName}
                    {o.note ? ` · ${o.note}` : ''}
                  </p>
                ))}
                {(alerts?.uncovered || []).length === 0 && (
                  <p className="text-sm text-gray-400">RAS</p>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
