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

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-CI').format(n || 0) + ' FCFA';

export default function BanquePage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [txs, setTxs] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccount, setShowAccount] = useState(false);
  const [showTx, setShowTx] = useState(false);
  const [showRec, setShowRec] = useState(false);
  const [accForm, setAccForm] = useState({ name: '', bankName: '', openingBalanceXof: '0' });
  const [txForm, setTxForm] = useState({ type: 'CREDIT', amountXof: '', label: '' });
  const [recForm, setRecForm] = useState({
    periodStart: '',
    periodEnd: '',
    statementBalanceXof: '',
  });

  const loadAccounts = async () => {
    const res = await financeApi.listBankAccounts();
    const list = Array.isArray(res.data) ? res.data : [];
    setAccounts(list);
    if (!selected && list[0]) setSelected(list[0].id);
    return list;
  };

  const loadDetail = async (accountId: string) => {
    if (!accountId) { setTxs([]); setRecs([]); return; }
    const [t, r] = await Promise.all([
      financeApi.listBankTransactions(accountId),
      financeApi.listReconciliations(accountId),
    ]);
    setTxs(Array.isArray(t.data) ? t.data : []);
    setRecs(Array.isArray(r.data) ? r.data : []);
  };

  const load = async () => {
    setLoading(true);
    try {
      const list = await loadAccounts();
      const id = selected || list[0]?.id;
      if (id) await loadDetail(id);
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

  useEffect(() => {
    if (selected) loadDetail(selected);
  }, [selected]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Banque" subtitle="Comptes, mouvements et rapprochements" />
        <main className="flex-1 p-6 space-y-4 max-w-4xl">
          <div className="flex flex-wrap justify-between gap-2">
            <Link href="/finance" className="inline-flex items-center gap-1 text-sm text-gray-500">
              <ArrowLeft className="w-4 h-4" /> Finance
            </Link>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowAccount(true)} className="px-3 py-2 rounded-xl border text-sm font-medium inline-flex items-center gap-1">
                <Plus className="w-4 h-4" /> Compte
              </button>
              <button onClick={() => setShowTx(true)} disabled={!selected}
                className="px-3 py-2 rounded-xl bg-[#1B3A6B] text-white text-sm font-semibold disabled:opacity-40">
                Mouvement
              </button>
              <button onClick={() => setShowRec(true)} disabled={!selected}
                className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40">
                Rapprocher
              </button>
            </div>
          </div>

          {showAccount && (
            <form className="bg-white border rounded-xl p-4 grid sm:grid-cols-3 gap-3" onSubmit={async (e) => {
              e.preventDefault();
              await financeApi.createBankAccount({
                ...accForm,
                openingBalanceXof: Number(accForm.openingBalanceXof) || 0,
              });
              setShowAccount(false);
              await load();
            }}>
              <input required className="border rounded-lg px-3 py-2 text-sm" placeholder="Nom du compte"
                value={accForm.name} onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Banque"
                value={accForm.bankName} onChange={(e) => setAccForm({ ...accForm, bankName: e.target.value })} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Solde d'ouverture"
                value={accForm.openingBalanceXof} onChange={(e) => setAccForm({ ...accForm, openingBalanceXof: e.target.value })} />
              <div className="sm:col-span-3 flex gap-2">
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold">Créer</button>
                <button type="button" onClick={() => setShowAccount(false)} className="px-4 py-2 rounded-lg border text-sm">Annuler</button>
              </div>
            </form>
          )}

          {showTx && selected && (
            <form className="bg-white border rounded-xl p-4 grid sm:grid-cols-3 gap-3" onSubmit={async (e) => {
              e.preventDefault();
              await financeApi.createBankTransaction({
                accountId: selected,
                type: txForm.type,
                amountXof: Number(txForm.amountXof),
                label: txForm.label,
              });
              setShowTx(false);
              setTxForm({ type: 'CREDIT', amountXof: '', label: '' });
              await loadDetail(selected);
            }}>
              <select className="border rounded-lg px-3 py-2 text-sm" value={txForm.type}
                onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}>
                <option value="CREDIT">Crédit (entrée)</option>
                <option value="DEBIT">Débit (sortie)</option>
              </select>
              <input required className="border rounded-lg px-3 py-2 text-sm" placeholder="Montant"
                value={txForm.amountXof} onChange={(e) => setTxForm({ ...txForm, amountXof: e.target.value })} />
              <input required className="border rounded-lg px-3 py-2 text-sm" placeholder="Libellé"
                value={txForm.label} onChange={(e) => setTxForm({ ...txForm, label: e.target.value })} />
              <div className="sm:col-span-3 flex gap-2">
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold">Enregistrer</button>
                <button type="button" onClick={() => setShowTx(false)} className="px-4 py-2 rounded-lg border text-sm">Annuler</button>
              </div>
            </form>
          )}

          {showRec && selected && (
            <form className="bg-white border rounded-xl p-4 grid sm:grid-cols-3 gap-3" onSubmit={async (e) => {
              e.preventDefault();
              await financeApi.reconcileBank({
                accountId: selected,
                periodStart: recForm.periodStart,
                periodEnd: recForm.periodEnd,
                statementBalanceXof: Number(recForm.statementBalanceXof),
                markReconciledIds: txs.filter((t) => !t.isReconciled).map((t) => t.id),
              });
              setShowRec(false);
              await loadDetail(selected);
            }}>
              <input required type="date" className="border rounded-lg px-3 py-2 text-sm"
                value={recForm.periodStart} onChange={(e) => setRecForm({ ...recForm, periodStart: e.target.value })} />
              <input required type="date" className="border rounded-lg px-3 py-2 text-sm"
                value={recForm.periodEnd} onChange={(e) => setRecForm({ ...recForm, periodEnd: e.target.value })} />
              <input required className="border rounded-lg px-3 py-2 text-sm" placeholder="Solde relevé"
                value={recForm.statementBalanceXof}
                onChange={(e) => setRecForm({ ...recForm, statementBalanceXof: e.target.value })} />
              <div className="sm:col-span-3 flex gap-2">
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold">Lancer le rapprochement</button>
                <button type="button" onClick={() => setShowRec(false)} className="px-4 py-2 rounded-lg border text-sm">Annuler</button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <>
              <select className="border rounded-xl px-3 py-2 text-sm bg-white" value={selected}
                onChange={(e) => setSelected(e.target.value)}>
                {accounts.length === 0 && <option value="">Aucun compte</option>}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}{a.bankName ? ` (${a.bankName})` : ''}</option>
                ))}
              </select>

              <div className="bg-white border rounded-xl divide-y">
                <div className="p-3 text-xs font-semibold text-gray-500 uppercase">Mouvements</div>
                {txs.length === 0 && <p className="p-4 text-sm text-gray-500">Aucun mouvement.</p>}
                {txs.map((t) => (
                  <div key={t.id} className="p-4 text-sm flex justify-between gap-2 items-center">
                    <div>
                      <p className="font-medium">{t.label}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(t.valueDate).toLocaleDateString('fr-FR')} · {t.type}
                        {t.isReconciled ? ' · rapproché' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!t.isReconciled && (
                        <button
                          type="button"
                          className="text-xs text-[#1B3A6B] font-medium underline"
                          onClick={async () => {
                            await financeApi.markBankReconciled([t.id]);
                            await loadDetail(selected);
                          }}
                        >
                          Marquer rapproché
                        </button>
                      )}
                      <p className={`font-bold ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.type === 'CREDIT' ? '+' : '-'}{fmt(t.amountXof)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white border rounded-xl divide-y">
                <div className="p-3 text-xs font-semibold text-gray-500 uppercase">Rapprochements</div>
                {recs.length === 0 && <p className="p-4 text-sm text-gray-500">Aucun rapprochement.</p>}
                {recs.map((r) => (
                  <div key={r.id} className="p-4 text-sm flex justify-between gap-2">
                    <div>
                      <p className="font-medium">{r.status}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(r.periodStart).toLocaleDateString('fr-FR')} → {new Date(r.periodEnd).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p>Relevé {fmt(r.statementBalanceXof)}</p>
                      <p>Livre {fmt(r.bookBalanceXof)}</p>
                      <p className={r.differenceXof ? 'text-amber-700 font-semibold' : 'text-emerald-700'}>
                        Écart {fmt(r.differenceXof)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
