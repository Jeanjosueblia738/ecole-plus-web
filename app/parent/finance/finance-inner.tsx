'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Smartphone } from 'lucide-react';
import { parentApi, financeApi, paymentsApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';

const PROVIDERS = [
  { value: 'WAVE', label: 'Wave' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'MTN_MOMO', label: 'MTN MoMo' },
  { value: 'MOOV_MONEY', label: 'Moov Money' },
];

export default function ParentFinanceInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [children, setChildren] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [finance, setFinance] = useState<any>(null);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [provider, setProvider] = useState('WAVE');
  const [feeId, setFeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authStorage.isLoggedIn() || authStorage.getUser()?.role !== 'PARENT') {
      router.push('/login');
      return;
    }
    if (params.get('paid') === '1') {
      setMessage('Retour de paiement — si validé, le solde sera mis à jour.');
    }
    Promise.all([parentApi.myChildren(), paymentsApi.enabledMerchants()])
      .then(([ch, mer]) => {
        const list = Array.isArray(ch.data)
          ? ch.data
          : ch.data?.children || [];
        setChildren(list);
        const q = params.get('studentId');
        const first = q && list.find((c: any) => c.id === q) ? q : list[0]?.id;
        if (first) setStudentId(first);
        const ops = Array.isArray(mer.data)
          ? mer.data
          : mer.data?.providers || mer.data?.enabled || [];
        const codes = ops
          .map((o: any) =>
            typeof o === 'string' ? o : o.provider || o.code,
          )
          .filter(Boolean);
        setEnabled(codes.length ? codes : PROVIDERS.map((p) => p.value));
        if (codes[0]) setProvider(codes[0]);
      })
      .catch(() => setError('Chargement impossible'))
      .finally(() => setLoading(false));
  }, [router, params]);

  useEffect(() => {
    if (!studentId) return;
    financeApi
      .getStudentFinance(studentId)
      .then(({ data }) => {
        setFinance(data);
        const fees = data?.fees || data?.studentFees || [];
        const open = fees.find(
          (f: any) =>
            (f.amountDue ?? f.remaining ?? f.balance ?? 0) > 0 ||
            f.status === 'UNPAID' ||
            f.status === 'PARTIAL',
        );
        if (open) {
          setFeeId(open.id || open.feeId);
          const due =
            open.amountDue ??
            open.remaining ??
            open.balance ??
            open.amount - (open.amountPaid || 0);
          setAmount(String(Math.max(0, Math.round(due || 0))));
        }
      })
      .catch(() => setFinance(null));
  }, [studentId]);

  const fees = finance?.fees || finance?.studentFees || [];

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const amt = parseInt(amount, 10);
    if (!feeId || !amt || amt < 100 || !phone.trim()) {
      setError('Frais, montant (≥100) et téléphone requis');
      return;
    }
    setPaying(true);
    try {
      const { data } = await paymentsApi.initiateFee({
        provider,
        studentId,
        feeId,
        amountXof: amt,
        payerPhone: phone.trim(),
      });
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data?.status === 'SUCCESS') {
        setMessage(data.message || 'Paiement confirmé.');
        const refreshed = await financeApi.getStudentFinance(studentId);
        setFinance(refreshed.data);
      } else {
        setMessage(
          data?.ussdHint ||
            data?.message ||
            'Paiement initié — validez sur votre téléphone.',
        );
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' · ') : msg || 'Échec paiement');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Paiements</h1>
        <p className="text-sm text-gray-500">
          Payez les frais via Wave, Orange, MTN ou Moov.
        </p>
      </div>

      {message && (
        <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-xl text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <select
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"
      >
        {children.map((c) => (
          <option key={c.id} value={c.id}>
            {c.firstName} {c.lastName}
          </option>
        ))}
      </select>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-semibold text-sm mb-3">Frais en cours</h2>
        {fees.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun frais listé</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {fees.map((f: any) => {
              const id = f.id || f.feeId;
              const due =
                f.amountDue ??
                f.remaining ??
                f.balance ??
                (f.amount || 0) - (f.amountPaid || 0);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => {
                      setFeeId(id);
                      setAmount(String(Math.max(0, Math.round(due || 0))));
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm ${
                      feeId === id
                        ? 'border-[#1B3A6B] bg-blue-50'
                        : 'border-gray-100'
                    }`}
                  >
                    <span className="font-medium">
                      {f.label || f.fee?.label || f.name || 'Frais'}
                    </span>
                    <span className="float-right text-gray-600">
                      {Math.round(due || 0).toLocaleString('fr-FR')} FCFA
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={pay} className="space-y-3 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <Smartphone className="w-4 h-4 text-[#1B3A6B]" />
            Payer par Mobile Money
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            >
              {PROVIDERS.filter(
                (p) => !enabled.length || enabled.includes(p.value),
              ).map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Montant FCFA"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Téléphone Mobile Money (ex: 0700000000)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={paying || !feeId}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium disabled:opacity-60"
          >
            {paying ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Traitement…
              </span>
            ) : (
              'Payer maintenant'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
