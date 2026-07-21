'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, TrendingUp, AlertCircle, CheckCircle, Plus, Loader2,
  Users, Bell, RefreshCw, Settings2, History,
} from 'lucide-react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import KpiCard from '@/components/KpiCard';
import { financeApi, classesApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

export default function FinancePage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [fees, setFees] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [processingAlerts, setProcessingAlerts] = useState(false);
  const [error, setError] = useState('');
  const [payError, setPayError] = useState('');
  const [payMsg, setPayMsg] = useState('');
  const [assignMsg, setAssignMsg] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const [assignClassId, setAssignClassId] = useState<Record<string, string>>({});

  const year = currentSchoolYear();
  const role = authStorage.getUser()?.role;
  const canCreateFee = hasRole(role, ['ADMIN', 'FOUNDER', 'DIRECTOR']);
  const canPay = hasRole(role, can.viewFinance);

  const [feeForm, setFeeForm] = useState({
    label: '',
    type: '',
    amountXof: '',
    dueDate: '',
    year,
    level: '',
  });

  const [payForm, setPayForm] = useState({
    studentId: '',
    feeId: '',
    amountPaid: '',
    paymentMode: 'especes',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, feesRes, classesRes, alertsRes, previewRes] = await Promise.all([
        financeApi.getStats(year),
        financeApi.getFees(year),
        classesApi.getAll(year).catch(() => ({ data: [] })),
        financeApi.listAlerts(30).catch(() => ({ data: [] })),
        financeApi.previewAlerts().catch(() => ({ data: null })),
      ]);
      setStats(statsRes.data);
      setFees(feesRes.data);
      setClasses(Array.isArray(classesRes.data) ? classesRes.data : classesRes.data?.data ?? []);
      setAlerts(alertsRes.data ?? []);
      setPreview(previewRes.data);
    } catch (e) {
      console.error(e);
      alert('Impossible de charger les données finance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!hasRole(authStorage.getUser()?.role, can.viewFinance)) {
      router.push('/dashboard');
      return;
    }
    load();
  }, [router]);

  const fmt = (n: number) => new Intl.NumberFormat('fr-CI').format(n) + ' FCFA';

  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await financeApi.createFee({
        label: feeForm.label,
        type: feeForm.type.trim() || 'Scolarité',
        amountXof: Number(feeForm.amountXof),
        dueDate: feeForm.dueDate,
        year: feeForm.year,
        level: feeForm.level || undefined,
      });
      setShowFeeForm(false);
      setFeeForm({ label: '', type: '', amountXof: '', dueDate: '', year, level: '' });
      await load();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur création frais');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (feeId: string) => {
    const classId = assignClassId[feeId];
    if (!classId) { setAssignMsg('Choisissez une classe'); return; }
    setAssigning(feeId);
    setAssignMsg('');
    try {
      const { data } = await financeApi.assignFee({ feeId, classId });
      setAssignMsg(data.message || `Assigné à ${data.count} élèves`);
      await load();
    } catch (err: any) {
      setAssignMsg(err.response?.data?.message || 'Erreur assignation');
    } finally {
      setAssigning(null);
    }
  };

  const handleProcessAlerts = async () => {
    if (!canCreateFee) return;
    setProcessingAlerts(true);
    setAlertMsg('');
    try {
      const { data } = await financeApi.processAlerts();
      setAlertMsg(
        `${data.totalCreated} alerte(s) créée(s) — ${data.createdUpcoming} J-7, ${data.createdOverdue} impayé(s)`,
      );
      await load();
    } catch (err: any) {
      setAlertMsg(err.response?.data?.message || 'Erreur traitement alertes');
    } finally {
      setProcessingAlerts(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPay) return;
    setPaying(true);
    setPayError('');
    setPayMsg('');
    try {
      const { data } = await financeApi.recordPayment({
        studentId: payForm.studentId.trim(),
        feeId: payForm.feeId,
        amountPaid: Number(payForm.amountPaid),
        paymentMode: payForm.paymentMode,
      });
      setPayMsg(data.message || 'Paiement enregistré');
      setPayForm({ studentId: '', feeId: '', amountPaid: '', paymentMode: 'especes' });
      setShowPayForm(false);
      await load();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setPayError(Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur paiement');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Gestion Financière" subtitle="Frais, assignation classes, alertes parents" />
        <main className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total attendu" value={loading ? '...' : fmt(stats?.totalAttenduXof ?? 0)}
              icon={DollarSign} color="text-blue-600" bgColor="bg-blue-50" loading={loading} />
            <KpiCard title="Total recouvré" value={loading ? '...' : fmt(stats?.totalRecouvertXof ?? 0)}
              icon={CheckCircle} color="text-green-600" bgColor="bg-green-50" loading={loading} />
            <KpiCard title="Reste à recouvrir" value={loading ? '...' : fmt(stats?.resteARecouvrirXof ?? 0)}
              icon={AlertCircle} color="text-red-500" bgColor="bg-red-50" loading={loading} />
            <KpiCard title="Taux de recouvrement" value={stats?.tauxRecouvrement ?? '0%'}
              icon={TrendingUp} color="text-purple-600" bgColor="bg-purple-50" loading={loading} />
          </div>

          {/* Actions rapides (comme mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => { setShowPayForm(true); setShowFeeForm(false); }}
              className="text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <DollarSign className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Enregistrer un paiement</p>
              <p className="text-xs text-gray-500 mt-1">Espèces, Mobile Money…</p>
            </button>
            <Link
              href="/finance/frais"
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-[#1B3A6B]/30 hover:bg-blue-50/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1B3A6B] flex items-center justify-center mb-3">
                <Settings2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Configurer les frais</p>
              <p className="text-xs text-gray-500 mt-1">Scolarité, transport, examens…</p>
            </Link>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 opacity-90">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-3">
                <History className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Frais de l’année</p>
              <p className="text-xs text-gray-500 mt-1">
                {loading ? '…' : `${fees.length} type(s) configuré(s)`}
              </p>
            </div>
          </div>

          {/* Frais + assignation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">Frais — {year}</h2>
              <div className="flex gap-2">
                <Link
                  href="/finance/frais"
                  className="flex items-center gap-2 px-4 py-2 border border-[#1B3A6B] text-[#1B3A6B] rounded-xl text-sm font-medium hover:bg-blue-50"
                >
                  <Settings2 className="w-4 h-4" /> Configurer les frais
                </Link>
                {canPay && (
                  <button onClick={() => { setShowPayForm(!showPayForm); setShowFeeForm(false); }}
                    className="flex items-center gap-2 px-4 py-2 border border-[#1B3A6B] text-[#1B3A6B] rounded-xl text-sm font-medium hover:bg-blue-50">
                    <DollarSign className="w-4 h-4" /> Enregistrer un paiement
                  </button>
                )}
                {canCreateFee && (
                  <button onClick={() => { setShowFeeForm(!showFeeForm); setShowPayForm(false); }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800">
                    <Plus className="w-4 h-4" /> Nouveau frais
                  </button>
                )}
              </div>
            </div>

            {showPayForm && canPay && (
              <form onSubmit={handleRecordPayment} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                {payError && <p className="md:col-span-2 text-sm text-red-600">{payError}</p>}
                {payMsg && <p className="md:col-span-2 text-sm text-green-700">{payMsg}</p>}
                <input required placeholder="ID élève *" value={payForm.studentId}
                  onChange={e => setPayForm(f => ({ ...f, studentId: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white" />
                <select required value={payForm.feeId}
                  onChange={e => setPayForm(f => ({ ...f, feeId: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                  <option value="">Frais *</option>
                  {fees.map((fee: any) => (
                    <option key={fee.id} value={fee.id}>{fee.label} — {fmt(fee.amountXof)}</option>
                  ))}
                </select>
                <input required type="number" min={1} placeholder="Montant payé FCFA *" value={payForm.amountPaid}
                  onChange={e => setPayForm(f => ({ ...f, amountPaid: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white" />
                <select value={payForm.paymentMode}
                  onChange={e => setPayForm(f => ({ ...f, paymentMode: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                  <option value="especes">Espèces</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="wave">Wave</option>
                  <option value="mtn_money">MTN MoMo</option>
                  <option value="moov_money">Moov Money</option>
                </select>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowPayForm(false)}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-xl bg-white">Annuler</button>
                  <button type="submit" disabled={paying}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-xl text-sm disabled:opacity-50">
                    {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Valider le paiement
                  </button>
                </div>
              </form>
            )}

            {showFeeForm && canCreateFee && (
              <form onSubmit={handleCreateFee} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl">
                {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
                <input required placeholder="Libellé *" value={feeForm.label}
                  onChange={e => setFeeForm(f => ({ ...f, label: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                <input required placeholder="Type de frais * (Scolarité, Transport…)" value={feeForm.type}
                  onChange={e => setFeeForm(f => ({ ...f, type: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                <input required type="number" min={1} placeholder="Montant FCFA *" value={feeForm.amountXof}
                  onChange={e => setFeeForm(f => ({ ...f, amountXof: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                <input required type="date" value={feeForm.dueDate}
                  onChange={e => setFeeForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                <input placeholder="Niveau (optionnel)" value={feeForm.level}
                  onChange={e => setFeeForm(f => ({ ...f, level: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                <input required value={feeForm.year}
                  onChange={e => setFeeForm(f => ({ ...f, year: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                <div className="md:col-span-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowFeeForm(false)}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-xl">Annuler</button>
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Créer
                  </button>
                </div>
              </form>
            )}

            {assignMsg && (
              <p className="mb-3 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">{assignMsg}</p>
            )}

            {fees.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun frais défini pour cette année.</p>
            ) : (
              <div className="divide-y divide-gray-50 space-y-1">
                {fees.map((fee) => (
                  <div key={fee.id} className="py-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{fee.label}</p>
                      <p className="text-xs text-gray-500">
                        {fee.type || '—'}
                        {fee.level ? ` · ${fee.level}` : ''}
                        {' · échéance '}
                        {new Date(fee.dueDate).toLocaleDateString('fr-FR')}
                        {' · '}
                        {fee._count?.studentFees ?? 0} élève(s) assigné(s)
                      </p>
                      <p className="text-sm font-semibold text-gray-700 mt-1">{fmt(fee.amountXof)}</p>
                    </div>

                    {canCreateFee && (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={assignClassId[fee.id] || ''}
                          onChange={e => setAssignClassId(m => ({ ...m, [fee.id]: e.target.value }))}
                          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white min-w-40"
                        >
                          <option value="">Classe…</option>
                          {classes.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name} — {c.level}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={assigning === fee.id}
                          onClick={() => handleAssign(fee.id)}
                          className="flex items-center gap-2 px-3 py-2 border border-[#1B3A6B] text-[#1B3A6B] rounded-xl text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
                        >
                          {assigning === fee.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Users className="w-4 h-4" />}
                          Assigner
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alertes parents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#1B3A6B]" /> Alertes parents
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  J-7 avant échéance · relance impayés tous les 3 jours · canal IN_APP (SMS plus tard)
                </p>
              </div>
              {canCreateFee && (
                <button onClick={handleProcessAlerts} disabled={processingAlerts}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                  {processingAlerts ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Lancer le traitement
                </button>
              )}
            </div>

            {preview && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-700">En attente J-7</p>
                  <p className="text-xl font-bold text-amber-800">{preview.pendingUpcoming ?? 0}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-red-700">Impayés à relancer</p>
                  <p className="text-xl font-bold text-red-800">{preview.pendingOverdue ?? 0}</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-600">Total à traiter</p>
                  <p className="text-xl font-bold text-gray-800">{preview.totalPending ?? 0}</p>
                </div>
              </div>
            )}

            {alertMsg && (
              <p className="mb-3 text-sm text-green-800 bg-green-50 border border-green-100 rounded-xl px-3 py-2">{alertMsg}</p>
            )}

            {alerts.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune alerte envoyée pour le moment.</p>
            ) : (
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {alerts.map((a) => (
                  <div key={a.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{a.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {a.studentFee?.student?.firstName} {a.studentFee?.student?.lastName}
                          {a.studentFee?.student?.class?.name ? ` · ${a.studentFee.student.class.name}` : ''}
                          {' · '}
                          {a.type === 'UPCOMING_J7' ? 'Rappel J-7' : 'Impayé'}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{a.message}</p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(a.sentAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {stats?.byPaymentMode && Object.keys(stats.byPaymentMode).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Répartition par mode de paiement</h2>
              <div className="space-y-3">
                {Object.entries(stats.byPaymentMode).map(([mode, amount]) => (
                  <div key={mode} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm font-medium text-gray-700 capitalize">{mode.replace('_', ' ')}</span>
                    <span className="text-sm text-gray-600">{fmt(amount as number)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
