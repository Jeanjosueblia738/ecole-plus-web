'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { financeApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-CI').format(n || 0) + ' FCFA';

export default function CaissePage() {
  const router = useRouter();
  const [current, setCurrent] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [float, setFloat] = useState('0');
  const [counted, setCounted] = useState('');
  const [varianceNote, setVarianceNote] = useState('');
  const [deposit, setDeposit] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [msg, setMsg] = useState('');
  const canOps = hasRole(authStorage.getUser()?.role, can.manageFinanceOps);

  const load = async () => {
    setLoading(true);
    try {
      const [cur, list, banks] = await Promise.all([
        financeApi.cashCurrent(),
        financeApi.cashSessions(20),
        canOps
          ? financeApi.listBankAccounts().catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);
      setCurrent(cur.data || null);
      setSessions(Array.isArray(list.data) ? list.data : []);
      setAccounts(Array.isArray(banks.data) ? banks.data : []);
    } catch {
      setMsg('Impossible de charger la caisse.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!hasRole(authStorage.getUser()?.role, can.manageCashSession)) {
      router.push('/finance');
      return;
    }
    load();
  }, [router]);

  const openCash = async () => {
    setBusy(true);
    setMsg('');
    try {
      await financeApi.cashOpen({ openingFloatXof: Number(float) || 0 });
      setMsg('Caisse ouverte.');
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Échec ouverture.');
    } finally {
      setBusy(false);
    }
  };

  const closeCash = async () => {
    if (counted === '') {
      setMsg('Indiquez le montant compté.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      await financeApi.cashClose({
        closingCountedXof: Number(counted),
        varianceNote: varianceNote || undefined,
        bankDepositXof: deposit ? Number(deposit) : undefined,
        bankAccountId: bankAccountId || undefined,
      });
      setMsg('Caisse clôturée.');
      setCounted('');
      setVarianceNote('');
      setDeposit('');
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || 'Échec clôture.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Caisse" subtitle="Ouverture et clôture journalière" />
        <main className="flex-1 p-6 space-y-6 max-w-3xl">
          <Link href="/finance" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1B3A6B]">
            <ArrowLeft className="w-4 h-4" /> Finance
          </Link>

          {msg && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {msg}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#1B3A6B]" />
            </div>
          ) : current ? (
            <div className="bg-white rounded-xl border border-emerald-100 p-5 space-y-4">
              <div>
                <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide">Session ouverte</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  Fond de caisse : {fmt(current.openingFloatXof)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Ouverte le {new Date(current.openedAt).toLocaleString('fr-FR')}
                  {current.openedByName ? ` · ${current.openedByName}` : ''}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="text-gray-600">Montant compté (FCFA)</span>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={counted}
                    onChange={(e) => setCounted(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-gray-600">Justification écart</span>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={varianceNote}
                    onChange={(e) => setVarianceNote(e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <span className="text-gray-600">Versement banque (optionnel)</span>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
                {accounts.length > 0 && (
                  <label className="text-sm">
                    <span className="text-gray-600">Compte bancaire</span>
                    <select
                      className="mt-1 w-full border rounded-lg px-3 py-2"
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                    >
                      <option value="">—</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <button
                disabled={busy}
                onClick={closeCash}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? '…' : 'Clôturer la caisse'}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              <p className="text-sm text-gray-600">Aucune session ouverte.</p>
              <label className="text-sm block max-w-xs">
                <span className="text-gray-600">Fond d&apos;ouverture (FCFA)</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={float}
                  onChange={(e) => setFloat(e.target.value)}
                  inputMode="numeric"
                />
              </label>
              <button
                disabled={busy}
                onClick={openCash}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? '…' : 'Ouvrir la caisse'}
              </button>
            </div>
          )}

          <div>
            <h2 className="text-sm font-bold text-gray-800 mb-3">Historique des sessions</h2>
            <div className="bg-white rounded-xl border border-gray-100 divide-y">
              {sessions.length === 0 && (
                <p className="p-4 text-sm text-gray-500">Aucune session.</p>
              )}
              {sessions.map((s) => (
                <div key={s.id} className="p-4 text-sm flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-800">
                      {new Date(s.openedAt).toLocaleDateString('fr-FR')} · {s.status}
                    </p>
                    <p className="text-xs text-gray-500">
                      Fond {fmt(s.openingFloatXof)}
                      {s.expectedXof != null ? ` · Attendu ${fmt(s.expectedXof)}` : ''}
                      {s.closingCountedXof != null ? ` · Compté ${fmt(s.closingCountedXof)}` : ''}
                    </p>
                    {s.varianceXof != null && s.varianceXof !== 0 && (
                      <p className="text-xs text-amber-700 mt-0.5">
                        Écart {fmt(s.varianceXof)}
                        {s.varianceNote ? ` — ${s.varianceNote}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
