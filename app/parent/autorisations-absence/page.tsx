'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { absenceAuthApi, parentApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';

function daysInclusive(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  return (
    Math.floor(
      (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
        Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
        86400000,
    ) + 1
  );
}

export default function ParentAutorisationsPage() {
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [kidsRes, listRes] = await Promise.all([
        parentApi.myChildren(),
        absenceAuthApi.list({ kind: 'STUDENT' }),
      ]);
      const kids = Array.isArray(kidsRes.data)
        ? kidsRes.data
        : kidsRes.data?.children || [];
      setChildren(kids);
      if (!studentId && kids[0]?.id) setStudentId(kids[0].id);
      setRows(Array.isArray(listRes.data) ? listRes.data : []);
    } catch {
      setRows([]);
      setLoadError('Impossible de charger les autorisations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (String(authStorage.getUser()?.role || '').toUpperCase() !== 'PARENT') {
      router.push('/dashboard');
      return;
    }
    load();
  }, [router]);

  const durationPreview = useMemo(() => {
    if (!form.startDate || !form.endDate) return null;
    return daysInclusive(form.startDate, form.endDate);
  }, [form]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand text-white px-4 py-4">
        <Link
          href="/parent"
          className="inline-flex items-center gap-1 text-sm text-blue-100 mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Espace parent
        </Link>
        <h1 className="text-lg font-bold">Autorisation d’absence</h1>
        <p className="text-sm text-blue-100">
          Maximum 3 jours — validation vie scolaire
        </p>
      </header>

      <main className="p-4 max-w-xl mx-auto space-y-4">
        {loadError && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
            {loadError}
          </div>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!studentId) {
              alert('Choisissez l’élève');
              return;
            }
            if (durationPreview != null && durationPreview > 3) {
              alert('Maximum 3 jours');
              return;
            }
            setBusy(true);
            try {
              await absenceAuthApi.createStudent({ ...form, studentId });
              setForm({ startDate: '', endDate: '', reason: '' });
              await load();
            } catch (err: any) {
              alert(err?.response?.data?.message || 'Échec');
            } finally {
              setBusy(false);
            }
          }}
          className="bg-white border rounded-xl p-4 space-y-3"
        >
          <select
            required
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="">Choisir l’élève</option>
            {children.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
          <input
            required
            type="date"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
          <input
            required
            type="date"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
          <textarea
            required
            minLength={3}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Motif"
            rows={3}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
          <p
            className={`text-xs ${
              durationPreview != null && durationPreview > 3
                ? 'text-red-600'
                : 'text-gray-500'
            }`}
          >
            {durationPreview != null
              ? `${durationPreview} jour(s) — max 3`
              : 'Max 3 jours calendaires'}
          </p>
          <button
            type="submit"
            disabled={busy || (durationPreview != null && durationPreview > 3)}
            className="w-full py-2.5 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-50"
          >
            {busy ? 'Envoi…' : 'Envoyer la demande'}
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="bg-white border rounded-xl p-3 text-sm">
                <p className="font-medium">
                  {r.student?.firstName} {r.student?.lastName} · {r.status}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(r.startDate).toLocaleDateString('fr-FR')} →{' '}
                  {new Date(r.endDate).toLocaleDateString('fr-FR')} (
                  {r.durationDays} j)
                </p>
                <p className="mt-1 text-gray-700">{r.reason}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
