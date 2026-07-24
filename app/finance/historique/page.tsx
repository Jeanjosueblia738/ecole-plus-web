'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, FileText } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { financeApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';
import { generatePaymentReceipt } from '@/lib/pdf';

const FILTERS = ['Tous', 'Validé', 'Partiel', 'Impayé'] as const;

export default function FinanceHistoriquePage() {
  const router = useRouter();
  const year = currentSchoolYear();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Tous');

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-CI').format(n || 0) + ' FCFA';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await financeApi.listPayments(year);
      setPayments(Array.isArray(data) ? data : []);
    } catch {
      setPayments([]);
      setError('Impossible de charger l’historique.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!hasRole(authStorage.getUser()?.role, can.viewFinance)) {
      router.push('/dashboard');
      return;
    }
    load();
  }, [router]);

  const filtered = useMemo(() => {
    let list = [...payments];
    if (filter === 'Validé') list = list.filter((p) => p.status === 'valide' || p.isPaid);
    if (filter === 'Partiel') list = list.filter((p) => p.status === 'partiel');
    if (filter === 'Impayé') list = list.filter((p) => p.status === 'impaye');
    return list.sort(
      (a, b) =>
        new Date(b.date || b.paidAt || 0).getTime() -
        new Date(a.date || a.paidAt || 0).getTime(),
    );
  }, [payments, filter]);

  const modeLabel = (mode?: string) => {
    const m = (mode || '').toLowerCase();
    if (m.includes('cheque') || m.includes('chèque')) return 'Chèque';
    if (m.includes('orange') || m.includes('wave') || m.includes('mtn') || m.includes('moov') || m.includes('mobile')) {
      return 'Mobile Money';
    }
    return 'Espèces';
  };

  const download = (p: any) => {
    const tenant = authStorage.getTenant();
    generatePaymentReceipt({
      schoolName: tenant?.name || 'Établissement',
      schoolCity: tenant?.city || '',
      receiptNo: p.receiptNo || `REC-${String(p.id).slice(0, 8)}`,
      studentName: p.studentName,
      matricule: '',
      className: p.className,
      feeLabel: p.feeLabel,
      amountPaid: p.montant,
      amountDue: p.montantDu,
      paymentMode: p.paymentMode,
      paidAt: p.paidAt || p.date,
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Historique des paiements" subtitle={`Année ${year}`} />
        <main className="flex-1 p-6 max-w-3xl">
          <Link
            href="/finance"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#1B3A6B] mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Retour Finance
          </Link>

          <div className="flex flex-wrap gap-2 mb-4">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  filter === f
                    ? 'bg-[#1B3A6B]/10 text-[#1B3A6B] border-[#1B3A6B]/30 font-bold'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <p className="text-sm text-gray-500 mb-3">
            {filtered.length} paiement{filtered.length !== 1 ? 's' : ''}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">Aucun paiement</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((p) => {
                const status = p.status === 'valide' || p.isPaid
                  ? 'valide'
                  : p.status === 'partiel'
                    ? 'partiel'
                    : 'impaye';
                const statusColor =
                  status === 'valide'
                    ? 'bg-emerald-50 text-emerald-700'
                    : status === 'partiel'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700';
                const statusLabel =
                  status === 'valide' ? 'Validé' : status === 'partiel' ? 'Partiel' : 'Impayé';
                const date = p.date || p.paidAt;
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{p.studentName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {p.feeLabel}
                          {p.className ? ` · ${p.className}` : ''}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs text-gray-500">
                        {date ? new Date(date).toLocaleDateString('fr-FR') : '—'}
                        {' · '}
                        {modeLabel(p.paymentMode)}
                        {p.receiptNo ? ` · ${p.receiptNo}` : ''}
                      </div>
                      <p className="text-sm font-bold text-emerald-700">{fmt(p.montant)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => download(p)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#1B3A6B]"
                    >
                      <FileText className="w-3.5 h-3.5" /> Reçu
                    </button>
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
