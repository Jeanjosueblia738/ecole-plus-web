'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Smartphone } from 'lucide-react';
import { parentApi, financeApi, paymentsApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { normalizeCiPhone } from '@/lib/phone-ci';

const PROVIDERS = [
  { value: 'WAVE', label: 'Wave' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'MTN_MOMO', label: 'MTN MoMo' },
  { value: 'MOOV_MONEY', label: 'Moov Money' },
];

function feeRemaining(f: any): number {
  return Math.max(
    0,
    Math.round(
      f.amountDue ??
        f.remaining ??
        f.balance ??
        (f.amount || 0) - (f.amountPaid || 0) ||
        0,
    ),
  );
}

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
  const [messageKind, setMessageKind] = useState<'info' | 'warn'>('info');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authStorage.isLoggedIn() || authStorage.getUser()?.role !== 'PARENT') {
      router.push('/login');
      return;
    }
    if (params.get('paid') === '1') {
      setMessageKind('info');
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
        setEnabled(codes);
        if (codes[0]) setProvider(codes[0]);
      })
      .catch(() => setError('Chargement impossible'))
      .finally(() => setLoading(false));
  }, [router, params]);

  useEffect(() => {
    if (!studentId) return;
    setError('');
    financeApi
      .getStudentFinance(studentId)
      .then(({ data }) => {
        setFinance(data);
        const fees = data?.fees || data?.studentFees || [];
        const open = fees.find(
          (f: any) =>
            feeRemaining(f) > 0 ||
            f.status === 'UNPAID' ||
            f.status === 'PARTIAL',
        );
        if (open) {
          setFeeId(open.id || open.feeId);
          setAmount(String(feeRemaining(open)));
        }
      })
      .catch(() => {
        setFinance(null);
        setError('Impossible de charger les frais de cet élève.');
      });
  }, [studentId]);

  const fees = finance?.fees || finance?.studentFees || [];

  const selectedRemaining = useMemo(() => {
    const f = fees.find((x: any) => (x.id || x.feeId) === feeId);
    return f ? feeRemaining(f) : 0;
  }, [fees, feeId]);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const amt = parseInt(amount, 10);
    if (!feeId || !amt || amt < 100) {
      setError('Frais et montant (≥100) requis');
      return;
    }
    if (selectedRemaining > 0 && amt > selectedRemaining) {
      setError(
        `Le montant ne peut pas dépasser le reste dû (${selectedRemaining.toLocaleString('fr-FR')} FCFA).`,
      );
      return;
    }
    if (selectedRemaining > 0 && amt < selectedRemaining) {
      const ok = window.confirm(
        `Paiement partiel : ${amt.toLocaleString('fr-FR')} FCFA sur ${selectedRemaining.toLocaleString('fr-FR')} FCFA restants. Continuer ?`,
      );
      if (!ok) return;
    }
    const normalized = normalizeCiPhone(phone);
    if (!normalized) {
      setError('Numéro Mobile Money invalide (format CI : +225… ou 07…).');
      return;
    }
    setPaying(true);
    try {
      const { data } = await paymentsApi.initiateFee({
        provider,
        studentId,
        feeId,
        amountXof: amt,
        payerPhone: normalized,
      });
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data?.simulated) {
        setMessageKind('warn');
        setMessage(
          'Paiement simulé : aucun débit réel. Le solde peut paraître mis à jour en environnement de test uniquement.',
        );
        const refreshed = await financeApi.getStudentFinance(studentId);
        setFinance(refreshed.data);
      } else if (data?.status === 'SUCCESS') {
        setMessageKind('info');
        setMessage(data.message || 'Paiement confirmé.');
        const refreshed = await financeApi.getStudentFinance(studentId);
        setFinance(refreshed.data);
      } else {
        setMessageKind('info');
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
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
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
        <div
          className={`px-4 py-3 rounded-xl text-sm ${
            messageKind === 'warn'
              ? 'bg-amber-50 text-amber-900 border border-amber-200'
              : 'bg-blue-50 text-blue-800'
          }`}
        >
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
              const due = feeRemaining(f);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => {
                      setFeeId(id);
                      setAmount(String(due));
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm ${
                      feeId === id
                        ? 'border-brand bg-blue-50'
                        : 'border-gray-100'
                    }`}
                  >
                    <span className="font-medium">
                      {f.label || f.fee?.label || f.name || 'Frais'}
                    </span>
                    <span className="float-right text-gray-600">
                      {due.toLocaleString('fr-FR')} FCFA
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <Smartphone className="w-4 h-4 text-brand" />
            Payer par Mobile Money
          </div>
          {enabled.length === 0 ? (
            <div className="bg-amber-50 border border-amber-100 text-amber-900 px-4 py-3 rounded-xl text-sm">
              Aucun moyen de paiement n&apos;est configuré pour cet établissement.
              Contactez l&apos;école pour activer Wave, Orange Money, MTN ou Moov.
            </div>
          ) : (
            <form onSubmit={pay} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                >
                  {PROVIDERS.filter((p) => enabled.includes(p.value)).map(
                    (p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ),
                  )}
                </select>
                <input
                  type="number"
                  min={100}
                  max={selectedRemaining > 0 ? selectedRemaining : undefined}
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (selectedRemaining > 0 && v !== '') {
                      const n = parseInt(v, 10);
                      if (!Number.isNaN(n) && n > selectedRemaining) {
                        setAmount(String(selectedRemaining));
                        return;
                      }
                    }
                    setAmount(v);
                  }}
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
                className="w-full sm:w-auto px-6 py-2.5 bg-brand text-white rounded-xl text-sm font-medium disabled:opacity-60"
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
          )}
        </div>
      </div>
    </div>
  );
}
