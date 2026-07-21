'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { financeApi, studentsApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';
import { generatePaymentReceipt } from '@/lib/pdf';

const METHODS = [
  { value: 'especes', label: 'Espèces' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cheque', label: 'Chèque' },
] as const;

const MM_OPS = [
  { value: 'orange_money', label: 'Orange Money', prefix: '07' },
  { value: 'wave', label: 'Wave', prefix: '01' },
  { value: 'mtn_money', label: 'MTN Money', prefix: '05' },
  { value: 'moov_money', label: 'Moov Money', prefix: '01' },
] as const;

export default function FinancePaiementPage() {
  const router = useRouter();
  const year = currentSchoolYear();

  const [students, setStudents] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);

  const [studentId, setStudentId] = useState('');
  const [feeId, setFeeId] = useState('');
  const [method, setMethod] = useState<(typeof METHODS)[number]['value']>('especes');
  const [chequeNo, setChequeNo] = useState('');
  const [mmOp, setMmOp] = useState<(typeof MM_OPS)[number]['value']>('orange_money');
  const [phone, setPhone] = useState('');

  const selectedFee = useMemo(
    () => fees.find((f) => f.id === feeId),
    [fees, feeId],
  );
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId),
    [students, studentId],
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-CI').format(n || 0) + ' FCFA';

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!hasRole(authStorage.getUser()?.role, can.viewFinance)) {
      router.push('/dashboard');
      return;
    }
    Promise.all([studentsApi.getAll(), financeApi.getFees(year)])
      .then(([sRes, fRes]) => {
        setStudents(Array.isArray(sRes.data) ? sRes.data : []);
        setFees(Array.isArray(fRes.data) ? fRes.data : []);
      })
      .catch(() => setError('Impossible de charger élèves / frais.'))
      .finally(() => setLoading(false));
  }, [router, year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(null);

    if (!studentId || !feeId) {
      setError('Sélectionnez un élève et un frais');
      return;
    }
    if (method === 'cheque' && !chequeNo.trim()) {
      setError('Saisissez le numéro de chèque');
      return;
    }
    if (method === 'mobile_money' && !phone.trim()) {
      setError('Saisissez le numéro Mobile Money');
      return;
    }

    const amount = Number(selectedFee?.amountXof || 0);
    if (!amount) {
      setError('Montant du frais invalide');
      return;
    }

    setPaying(true);
    try {
      const paymentMode =
        method === 'cheque'
          ? 'cheque'
          : method === 'mobile_money'
            ? mmOp
            : 'especes';

      const { data } = await financeApi.recordPayment({
        studentId,
        feeId,
        amountPaid: amount,
        paymentMode,
        ...(method === 'cheque' ? { receiptNo: chequeNo.trim() } : {}),
        ...(method === 'mobile_money'
          ? { phoneNumber: phone.trim().replace(/\s/g, '') }
          : {}),
      });
      setSuccess(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const status = err?.response?.status;
      const detail = Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur paiement';
      setError(
        status
          ? `${detail} (HTTP ${status}${authStorage.getUser()?.role ? ` · rôle ${authStorage.getUser()?.role}` : ''})`
          : detail,
      );
    } finally {
      setPaying(false);
    }
  };

  const downloadReceipt = () => {
    const r = success?.receipt;
    if (!r) return;
    const tenant = authStorage.getTenant();
    generatePaymentReceipt({
      schoolName: tenant?.name || 'Établissement',
      schoolCity: tenant?.city || '',
      receiptNo: r.receiptNo || success.receiptNo,
      studentName: r.student,
      matricule: r.matricule,
      className: r.className,
      feeLabel: r.fee,
      amountPaid: r.montantPaye,
      amountDue: r.montantDu,
      paymentMode: r.paymentMode,
      paidAt: r.paidAt,
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Enregistrer un paiement" subtitle="Espèces, Mobile Money ou Chèque" />
        <main className="flex-1 p-6 max-w-xl">
          <Link
            href="/finance"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#1B3A6B] mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Retour Finance
          </Link>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
            </div>
          ) : success ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle className="w-6 h-6" />
                <h2 className="font-bold text-lg">Paiement enregistré</h2>
              </div>
              <p className="text-sm text-gray-700">
                Reçu N° <strong>{success.receipt?.receiptNo || success.receiptNo}</strong>
              </p>
              <p className="text-sm text-gray-700">
                Montant : <strong>{fmt(success.receipt?.montantPaye)}</strong>
              </p>
              <p className="text-sm text-gray-700">
                Élève : <strong>{success.receipt?.student}</strong>
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={downloadReceipt}
                  className="px-4 py-2 border border-[#1B3A6B] text-[#1B3A6B] rounded-xl text-sm font-medium"
                >
                  Télécharger reçu PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(null);
                    setStudentId('');
                    setFeeId('');
                    setChequeNo('');
                    setMethod('especes');
                  }}
                  className="px-4 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium"
                >
                  Nouveau paiement
                </button>
                <Link
                  href="/finance"
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm"
                >
                  OK
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5"
            >
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Élève</label>
                <select
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
                >
                  <option value="">Sélectionner un élève</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                      {s.class?.name ? ` — ${s.class.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Frais à régler
                </label>
                <select
                  required
                  value={feeId}
                  onChange={(e) => setFeeId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
                >
                  <option value="">Sélectionner un type de frais</option>
                  {fees.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label} — {fmt(f.amountXof)}
                      {f.type ? ` (${f.type})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  Méthode de paiement
                </label>
                <div className="space-y-2">
                  {METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMethod(m.value)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm text-left transition-colors ${
                        method === m.value
                          ? 'border-[#1B3A6B] bg-blue-50 text-[#1B3A6B] font-semibold'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      {m.label}
                      {method === m.value && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {method === 'cheque' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de chèque
                  </label>
                  <input
                    value={chequeNo}
                    onChange={(e) => setChequeNo(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                    placeholder="N° chèque"
                  />
                </div>
              )}

              {method === 'mobile_money' && (
                <div className="space-y-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-xs text-blue-800">
                    Enregistrement d’un paiement déjà effectué par Mobile Money (encaissement staff).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {MM_OPS.map((op) => (
                      <button
                        key={op.value}
                        type="button"
                        onClick={() => setMmOp(op.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                          mmOp === op.value
                            ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                            : 'bg-white text-gray-700 border-gray-200'
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                  <input
                    required={method === 'mobile_money'}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={`+225 ${MM_OPS.find((o) => o.value === mmOp)?.prefix} XX XX XX XX`}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
                  />
                </div>
              )}

              {selectedFee && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Montant à encaisser</span>
                  <span className="text-lg font-bold text-emerald-700">
                    {fmt(selectedFee.amountXof)}
                  </span>
                </div>
              )}

              {selectedStudent && selectedFee && (
                <p className="text-xs text-gray-500">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                  {selectedStudent.class?.name ? ` · ${selectedStudent.class.name}` : ''}
                  {' · '}
                  {selectedFee.label}
                </p>
              )}

              <button
                type="submit"
                disabled={paying}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#1B3A6B] text-white rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {method === 'mobile_money'
                  ? 'Valider le paiement Mobile Money'
                  : 'Valider le paiement'}
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
