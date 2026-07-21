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

export default function DepensesPage() {
  const router = useRouter();
  const year = currentSchoolYear();
  const [rows, setRows] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: 'Fournitures',
    label: '',
    amountXof: '',
    paymentMode: 'especes',
    supplierId: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [e, s] = await Promise.all([
        financeApi.listExpenses({ year }),
        financeApi.listSuppliers(),
      ]);
      setRows(Array.isArray(e.data) ? e.data : []);
      setSuppliers(Array.isArray(s.data) ? s.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!hasRole(authStorage.getUser()?.role, can.manageFinanceOps)) {
      router.push('/finance');
      return;
    }
    load();
  }, [router]);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      await financeApi.createExpense({
        ...form,
        amountXof: Number(form.amountXof),
        supplierId: form.supplierId || undefined,
        year,
      });
      setShow(false);
      setForm({ category: 'Fournitures', label: '', amountXof: '', paymentMode: 'especes', supplierId: '' });
      await load();
    } catch {
      alert('Échec enregistrement dépense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Dépenses" subtitle={`Année ${year}`} />
        <main className="flex-1 p-6 space-y-4 max-w-4xl">
          <div className="flex items-center justify-between gap-3">
            <Link href="/finance" className="inline-flex items-center gap-1 text-sm text-gray-500">
              <ArrowLeft className="w-4 h-4" /> Finance
            </Link>
            <button
              onClick={() => setShow(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1B3A6B] text-white text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Nouvelle dépense
            </button>
          </div>

          {show && (
            <form onSubmit={submit} className="bg-white border rounded-xl p-4 grid sm:grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Catégorie" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })} required />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Libellé" value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })} required />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Montant FCFA" value={form.amountXof}
                onChange={(e) => setForm({ ...form, amountXof: e.target.value })} required inputMode="numeric" />
              <select className="border rounded-lg px-3 py-2 text-sm" value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
                <option value="especes">Espèces</option>
                <option value="cheque">Chèque</option>
                <option value="virement">Virement</option>
                <option value="mobile_money">Mobile Money</option>
              </select>
              <select className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">Sans fournisseur</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold">
                  {saving ? '…' : 'Enregistrer'}
                </button>
                <button type="button" onClick={() => setShow(false)} className="px-4 py-2 rounded-lg border text-sm">Annuler</button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <div className="bg-white rounded-xl border divide-y">
              {rows.length === 0 && <p className="p-4 text-sm text-gray-500">Aucune dépense.</p>}
              {rows.map((r) => (
                <div key={r.id} className="p-4 flex justify-between gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-800">{r.label}</p>
                    <p className="text-xs text-gray-500">
                      {r.category} · {r.paymentMode}
                      {r.supplier?.name ? ` · ${r.supplier.name}` : ''}
                      {' · '}{new Date(r.paidAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <p className="font-bold text-red-600 whitespace-nowrap">{fmt(r.amountXof)}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
