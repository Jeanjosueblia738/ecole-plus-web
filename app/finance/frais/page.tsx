'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Loader2, Users, Settings2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { financeApi, classesApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

export default function ConfigurerFraisPage() {
  const router = useRouter();
  const year = currentSchoolYear();
  const role = authStorage.getUser()?.role;
  const canManage = hasRole(role, ['ADMIN', 'FOUNDER', 'DIRECTOR', 'ACCOUNTANT']);

  const [fees, setFees] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignClassId, setAssignClassId] = useState<Record<string, string>>({});

  // Champs alignés mobile : libellé, type, montant, trimestre, obligatoire (+ année affichée)
  const [form, setForm] = useState({
    label: '',
    type: 'Scolarité',
    amountXof: '',
    trimestre: 'T1',
    obligatoire: true,
  });

  const fmt = (n: number) => new Intl.NumberFormat('fr-CI').format(n) + ' FCFA';

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [feesRes, classesRes] = await Promise.all([
        financeApi.getFees(year),
        classesApi.getAll(year).catch(() => ({ data: [] })),
      ]);
      setFees(Array.isArray(feesRes.data) ? feesRes.data : []);
      setClasses(
        Array.isArray(classesRes.data)
          ? classesRes.data
          : classesRes.data?.data ?? [],
      );
    } catch {
      setFees([]);
      setLoadError('Impossible de charger les frais.');
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const due = new Date();
      due.setDate(due.getDate() + 30);
      await financeApi.createFee({
        label: form.label.trim(),
        type: form.type.trim() || 'Scolarité',
        amountXof: Number(form.amountXof),
        dueDate: due.toISOString().slice(0, 10),
        year,
        trimestre: form.trimestre,
        obligatoire: form.obligatoire,
      });
      setShowForm(false);
      setForm({
        label: '',
        type: 'Scolarité',
        amountXof: '',
        trimestre: 'T1',
        obligatoire: true,
      });
      setSuccess('Frais créé avec succès.');
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur création frais');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (feeId: string) => {
    if (!canManage) return;
    const classId = assignClassId[feeId];
    if (!classId) {
      setError('Choisissez une classe à assigner.');
      return;
    }
    setAssigning(feeId);
    setError('');
    setSuccess('');
    try {
      const { data } = await financeApi.assignFee({ feeId, classId });
      setSuccess(data.message || `Assigné à ${data.count} élève(s)`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur assignation');
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Configurer les frais"
          subtitle={`Scolarité, transport, examens… — ${year}`}
        />
        <main className="flex-1 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/finance"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#1B3A6B]"
            >
              <ArrowLeft className="w-4 h-4" /> Retour Finance
            </Link>
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  setShowForm(!showForm);
                  setError('');
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800"
              >
                <Plus className="w-4 h-4" />
                Nouveau frais
              </button>
            )}
          </div>

          {!canManage && (
            <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-4 py-3 text-sm">
              Consultation seule — la création et l’assignation des frais sont réservées à la direction / comptable.
              {role ? ` (rôle détecté : ${role})` : ' (aucun rôle détecté — reconnectez-vous)'}
            </div>
          )}

          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {loadError}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-100 text-green-800 rounded-xl px-4 py-3 text-sm">
              {success}
            </div>
          )}

          {showForm && canManage && (
            <form
              onSubmit={handleCreate}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-xl"
            >
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-[#1B3A6B]" />
                Ajouter un frais
              </h2>
              <p className="text-xs text-gray-500">Année scolaire : {year}</p>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Libellé du frais *
                </label>
                <input
                  required
                  placeholder="Ex. Scolarité 1er trimestre"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Type de frais *
                </label>
                <input
                  required
                  placeholder="Scolarité, Transport, Cantine…"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Montant (FCFA) *
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    placeholder="Ex. 75000"
                    value={form.amountXof}
                    onChange={(e) => setForm((f) => ({ ...f, amountXof: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Trimestre *
                  </label>
                  <select
                    value={form.trimestre}
                    onChange={(e) => setForm((f) => ({ ...f, trimestre: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                  >
                    <option value="T1">T1</option>
                    <option value="T2">T2</option>
                    <option value="T3">T3</option>
                    <option value="Annuel">Annuel</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.obligatoire}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, obligatoire: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                Obligatoire
              </label>
              <p className="text-xs text-gray-400">
                Échéance par défaut : dans 30 jours (comme sur mobile).
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Ajouter
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">
                Frais configurés — {year}
              </h2>
              <span className="text-xs text-gray-500">{fees.length} type(s)</span>
            </div>

            {loading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
              </div>
            ) : fees.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Settings2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Aucun frais configuré</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {fees.map((fee) => {
                  const due = fee.dueDate ? new Date(fee.dueDate) : null;
                  const expired = due ? due.getTime() < Date.now() : false;
                  return (
                    <div
                      key={fee.id}
                      className="px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-4 justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800">{fee.label}</p>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            {fee.type || '—'}
                          </span>
                          {fee.trimestre && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {fee.trimestre}
                            </span>
                          )}
                          {fee.obligatoire === false && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                              Optionnel
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Échéance{' '}
                          <span className={expired ? 'text-red-600 font-medium' : ''}>
                            {due ? due.toLocaleDateString('fr-FR') : '—'}
                          </span>
                          {' · '}
                          {fee._count?.studentFees ?? 0} élève(s) assigné(s)
                        </p>
                        <p className="text-sm font-bold text-emerald-700 mt-1">
                          {fmt(Number(fee.amountXof) || 0)}
                        </p>
                      </div>

                      {canManage && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <select
                            value={assignClassId[fee.id] || ''}
                            onChange={(e) =>
                              setAssignClassId((m) => ({
                                ...m,
                                [fee.id]: e.target.value,
                              }))
                            }
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white min-w-40"
                          >
                            <option value="">Assigner à une classe…</option>
                            {classes.map((c: any) => (
                              <option key={c.id} value={c.id}>
                                {c.name} — {c.level}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={assigning === fee.id}
                            onClick={() => handleAssign(fee.id)}
                            className="flex items-center gap-2 px-3 py-2 border border-[#1B3A6B] text-[#1B3A6B] rounded-xl text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
                          >
                            {assigning === fee.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Users className="w-4 h-4" />
                            )}
                            Assigner
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
