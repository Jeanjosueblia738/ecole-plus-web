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

export default function FournisseursPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', category: '', email: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await financeApi.listSuppliers(true);
      setRows(Array.isArray(res.data) ? res.data : []);
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
    await financeApi.createSupplier(form);
    setShow(false);
    setForm({ name: '', phone: '', category: '', email: '' });
    await load();
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Fournisseurs" subtitle="Suivi des partenaires" />
        <main className="flex-1 p-6 space-y-4 max-w-3xl">
          <div className="flex justify-between items-center">
            <Link href="/finance" className="inline-flex items-center gap-1 text-sm text-gray-500">
              <ArrowLeft className="w-4 h-4" /> Finance
            </Link>
            <button onClick={() => setShow(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1B3A6B] text-white text-sm font-semibold">
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          </div>
          {show && (
            <form onSubmit={submit} className="bg-white border rounded-xl p-4 grid sm:grid-cols-2 gap-3">
              <input required className="border rounded-lg px-3 py-2 text-sm" placeholder="Nom"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Téléphone"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Catégorie"
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="E-mail"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold">Enregistrer</button>
                <button type="button" onClick={() => setShow(false)} className="px-4 py-2 rounded-lg border text-sm">Annuler</button>
              </div>
            </form>
          )}
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <div className="bg-white rounded-xl border divide-y">
              {rows.length === 0 && <p className="p-4 text-sm text-gray-500">Aucun fournisseur.</p>}
              {rows.map((r) => (
                <div key={r.id} className="p-4 text-sm">
                  <p className="font-semibold text-gray-800">{r.name}</p>
                  <p className="text-xs text-gray-500">
                    {[r.category, r.phone, r.email].filter(Boolean).join(' · ') || '—'}
                    {!r.isActive ? ' · inactif' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
