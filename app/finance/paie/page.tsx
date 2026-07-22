'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { financeApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-CI').format(n || 0) + ' FCFA';

export default function PaiePage() {
  const router = useRouter();
  const year = currentSchoolYear();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    label: '',
    month: String(new Date().getMonth() + 1),
    employeeName: '',
    baseSalaryXof: '',
    allowancesXof: '0',
    deductionsXof: '0',
  });

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await financeApi.listPayroll(year);
      setRuns(Array.isArray(res.data) ? res.data : []);
    } catch {
      setRuns([]);
      setLoadError('Impossible de charger la paie.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!hasRole(authStorage.getUser()?.role, can.manageFinanceOps)) {
      router.push('/finance'); return;
    }
    load();
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await financeApi.createPayroll({
      label: form.label || `Paie ${form.month}/${year}`,
      year,
      month: Number(form.month),
      slips: [{
        employeeName: form.employeeName,
        baseSalaryXof: Number(form.baseSalaryXof),
        allowancesXof: Number(form.allowancesXof) || 0,
        deductionsXof: Number(form.deductionsXof) || 0,
      }],
    });
    setShow(false);
    await load();
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Paie" subtitle={`Bulletins · ${year}`} />
        <main className="flex-1 p-6 space-y-4 max-w-3xl">
          <div className="flex justify-between">
            <Link href="/finance" className="inline-flex items-center gap-1 text-sm text-gray-500">
              <ArrowLeft className="w-4 h-4" /> Finance
            </Link>
            <button onClick={() => setShow(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1B3A6B] text-white text-sm font-semibold">
              <Plus className="w-4 h-4" /> Nouvelle paie
            </button>
          </div>
          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {loadError}
            </div>
          )}
          {show && (
            <form onSubmit={submit} className="bg-white border rounded-xl p-4 grid sm:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Libellé (ex. Mars 2026)"
                value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Mois (1-12)"
                value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} required />
              <input required className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" placeholder="Nom employé"
                value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} />
              <input required className="border rounded-lg px-3 py-2 text-sm" placeholder="Salaire de base"
                value={form.baseSalaryXof} onChange={(e) => setForm({ ...form, baseSalaryXof: e.target.value })} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Primes"
                value={form.allowancesXof} onChange={(e) => setForm({ ...form, allowancesXof: e.target.value })} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Retenues"
                value={form.deductionsXof} onChange={(e) => setForm({ ...form, deductionsXof: e.target.value })} />
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold">Créer</button>
                <button type="button" onClick={() => setShow(false)} className="px-4 py-2 rounded-lg border text-sm">Annuler</button>
              </div>
            </form>
          )}
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <div className="space-y-3">
              {runs.length === 0 && <p className="text-sm text-gray-500">Aucune paie.</p>}
              {runs.map((r) => {
                const total = (r.slips || []).reduce((s: number, x: any) => s + (x.netXof || 0), 0);
                return (
                  <div key={r.id} className="bg-white border rounded-xl p-4 text-sm">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-800">{r.label}</p>
                        <p className="text-xs text-gray-500">
                          {r.month}/{r.year} · {r.status} · {(r.slips || []).length} bulletin(s)
                        </p>
                      </div>
                      <p className="font-bold text-[#1B3A6B]">{fmt(total)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.status === 'DRAFT' && (
                        <button
                          className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                          onClick={async () => { await financeApi.payrollStatus(r.id, 'VALIDATED'); await load(); }}
                        >
                          Valider
                        </button>
                      )}
                      {r.status !== 'PAID' && (
                        <button
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium"
                          onClick={async () => { await financeApi.payrollStatus(r.id, 'PAID'); await load(); }}
                        >
                          Marquer payé
                        </button>
                      )}
                    </div>
                    <ul className="mt-3 space-y-1 border-t pt-2">
                      {(r.slips || []).map((s: any) => (
                        <li key={s.id} className="flex justify-between text-xs text-gray-600">
                          <span>{s.employeeName}</span>
                          <span className="font-medium">{fmt(s.netXof)}</span>
                        </li>
                      ))}
                    </ul>
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
