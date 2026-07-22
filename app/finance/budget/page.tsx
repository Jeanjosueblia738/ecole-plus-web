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

export default function BudgetPage() {
  const router = useRouter();
  const year = currentSchoolYear();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    label: `Budget ${year}`,
    category: 'Fonctionnement',
    lineLabel: '',
    plannedXof: '',
  });

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await financeApi.listBudgets(year);
      const list = Array.isArray(res.data) ? res.data : [];
      setBudgets(list);
      if (list[0]) {
        const a = await financeApi.budgetVsActual(list[0].id);
        setAnalysis(a.data);
      } else {
        setAnalysis(null);
      }
    } catch {
      setBudgets([]);
      setAnalysis(null);
      setLoadError('Impossible de charger le budget.');
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
    await financeApi.createBudget({
      year,
      label: form.label,
      lines: [{
        category: form.category,
        label: form.lineLabel || form.category,
        plannedXof: Number(form.plannedXof),
      }],
    });
    setShow(false);
    await load();
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Budget" subtitle={`Prévisionnel vs réel · ${year}`} />
        <main className="flex-1 p-6 space-y-4 max-w-3xl">
          <div className="flex justify-between">
            <Link href="/finance" className="inline-flex items-center gap-1 text-sm text-gray-500">
              <ArrowLeft className="w-4 h-4" /> Finance
            </Link>
            <button onClick={() => setShow(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1B3A6B] text-white text-sm font-semibold">
              <Plus className="w-4 h-4" /> Nouveau budget
            </button>
          </div>
          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {loadError}
            </div>
          )}
          {show && (
            <form onSubmit={submit} className="bg-white border rounded-xl p-4 grid sm:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Catégorie" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })} required />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Montant prévu" value={form.plannedXof}
                onChange={(e) => setForm({ ...form, plannedXof: e.target.value })} required />
              <input className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" placeholder="Libellé ligne"
                value={form.lineLabel} onChange={(e) => setForm({ ...form, lineLabel: e.target.value })} />
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold">Créer</button>
                <button type="button" onClick={() => setShow(false)} className="px-4 py-2 rounded-lg border text-sm">Annuler</button>
              </div>
            </form>
          )}
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : analysis ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-xs text-gray-500">Prévu</p>
                  <p className="font-bold text-gray-800">{fmt(analysis.summary?.plannedTotal)}</p>
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-xs text-gray-500">Réel (dépenses)</p>
                  <p className="font-bold text-red-600">{fmt(analysis.summary?.actualTotal)}</p>
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-xs text-gray-500">Écart</p>
                  <p className="font-bold text-[#1B3A6B]">{fmt(analysis.summary?.varianceTotal)}</p>
                </div>
              </div>
              <div className="bg-white border rounded-xl divide-y">
                {(analysis.lines || []).map((l: any) => (
                  <div key={l.id} className="p-4 text-sm flex justify-between gap-2">
                    <div>
                      <p className="font-medium">{l.label}</p>
                      <p className="text-xs text-gray-500">{l.category}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p>Prévu {fmt(l.plannedXof)}</p>
                      <p className="text-red-600">Réel {fmt(l.actualXof)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Aucun budget pour cette année.</p>
          )}
          {budgets.length > 1 && (
            <p className="text-xs text-gray-400">{budgets.length} budgets — analyse sur le plus récent.</p>
          )}
        </main>
      </div>
    </div>
  );
}
