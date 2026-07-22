'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, Loader2, Plus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { accountingApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { canAccessPath, hasRole, can } from '@/lib/rbac';

export default function ComptabilitePage() {
  const router = useRouter();
  const canWrite = hasRole(authStorage.getUser()?.role, can.writeOhada);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [balance, setBalance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [label, setLabel] = useState('');
  const [debitAccount, setDebitAccount] = useState('');
  const [creditAccount, setCreditAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [a, e, t] = await Promise.all([
        accountingApi.accounts(),
        accountingApi.entries(30),
        accountingApi.trialBalance(),
      ]);
      const acc = Array.isArray(a.data) ? a.data : [];
      setAccounts(acc);
      setEntries(Array.isArray(e.data) ? e.data : []);
      setBalance(Array.isArray(t.data) ? t.data : []);
      if (acc.length >= 2) {
        setDebitAccount((prev) => prev || acc[0].id);
        setCreditAccount((prev) => prev || acc[1].id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!canAccessPath(authStorage.getUser()?.role, '/comptabilite')) {
      router.push('/dashboard');
      return;
    }
    load();
  }, [router]);

  const createEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    const amt = parseInt(amount, 10);
    if (!label.trim() || !amt || !debitAccount || !creditAccount) {
      alert('Libellé, montant et comptes requis');
      return;
    }
    if (debitAccount === creditAccount) {
      alert('Comptes débit et crédit doivent différer');
      return;
    }
    setSaving(true);
    try {
      await accountingApi.createEntry({
        date: new Date().toISOString().split('T')[0],
        label: label.trim(),
        lines: [
          { accountId: debitAccount, debitXof: amt, creditXof: 0 },
          { accountId: creditAccount, debitXof: 0, creditXof: amt },
        ],
      });
      setLabel('');
      setAmount('');
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      alert(Array.isArray(msg) ? msg.join(' · ') : msg || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Comptabilité OHADA"
          subtitle="Plan SYSCOHADA simplifié + journal + balance"
        />
        <main className="flex-1 p-6 space-y-6 max-w-5xl">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 flex gap-2">
                <Calculator className="w-4 h-4 mt-0.5 shrink-0" />
                Plan de comptes seedé au 1er accès (caisse, banques, clients,
                scolarité, paie…). Les écritures doivent être équilibrées.
              </div>

              {canWrite && (
                <form
                  onSubmit={createEntry}
                  className="bg-white rounded-xl border border-gray-100 p-5 space-y-3"
                >
                  <h2 className="font-semibold text-gray-800">
                    Nouvelle écriture
                  </h2>
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Libellé (ex: Encaissement scolarité)"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      value={debitAccount}
                      onChange={(e) => setDebitAccount(e.target.value)}
                      className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          Débit {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={creditAccount}
                      onChange={(e) => setCreditAccount(e.target.value)}
                      className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          Crédit {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Montant FCFA"
                      className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                    />
                  </div>
                  <button
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Enregistrer
                  </button>
                </form>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 font-semibold text-sm">
                    Plan de comptes ({accounts.length})
                  </div>
                  <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {accounts.map((a) => (
                      <li
                        key={a.id}
                        className="px-5 py-2.5 text-sm flex justify-between"
                      >
                        <span>
                          <span className="font-mono text-[#1B3A6B]">
                            {a.code}
                          </span>{' '}
                          {a.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          Cl.{a.classNum}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 font-semibold text-sm">
                    Balance
                  </div>
                  {balance.length === 0 ? (
                    <p className="p-5 text-sm text-gray-400">
                      Aucune écriture encore
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="text-left px-4 py-2">Compte</th>
                          <th className="text-right px-4 py-2">Débit</th>
                          <th className="text-right px-4 py-2">Crédit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {balance.map((b) => (
                          <tr key={b.code}>
                            <td className="px-4 py-2">
                              {b.code} {b.name}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {b.debit.toLocaleString('fr-FR')}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {b.credit.toLocaleString('fr-FR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 font-semibold text-sm">
                  Journal récent
                </div>
                {entries.length === 0 ? (
                  <p className="p-5 text-sm text-gray-400">Aucune écriture</p>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {entries.map((en) => (
                      <li key={en.id} className="px-5 py-3 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="font-medium text-gray-800">
                            {en.label}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {en.date
                              ? new Date(en.date).toLocaleDateString('fr-FR')
                              : ''}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {(en.lines || [])
                            .map(
                              (l: any) =>
                                `${l.account?.code} D${l.debitXof}/C${l.creditXof}`,
                            )
                            .join(' · ')}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
