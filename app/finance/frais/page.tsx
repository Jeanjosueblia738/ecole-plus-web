'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Loader2, Users, Settings2,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { financeApi, classesApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

const FEE_TYPES = [
  { value: 'SCOLAIRE', label: 'Scolarité / Inscription' },
  { value: 'ANNEXE', label: 'Annexe (transport, cantine, examens…)' },
] as const;

export default function ConfigurerFraisPage() {
  const router = useRouter();
  const year = currentSchoolYear();
  const role = authStorage.getUser()?.role;
  const canManage = hasRole(role, ['ADMIN', 'FOUNDER', 'DIRECTOR']);

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

  const [form, setForm] = useState({
    label: '',
    type: 'SCOLAIRE',
    amountXof: '',
    dueDate: '',
    year,
    level: '',
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
      await financeApi.createFee({
        label: form.label.trim(),
        type: form.type,
        amountXof: Number(form.amountXof),
        dueDate: form.dueDate,
        year: form.year || year,
        level: form.level.trim() || undefined,
      });
      setShowForm(false);
      setForm({
        label: '',
        type: 'SCOLAIRE',
        amountXof: '',
        dueDate: '',
        year,
        level: '',
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
              Consultation seule — la création et l’assignation des frais sont réservées à la direction.
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
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <h2 className="md:col-span-2 text-base font-semibold text-gray-800 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-[#1B3A6B]" />
                Ajouter un frais
              </h2>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Libellé *</label>
                <input
                  required
                  placeholder="Ex. Scolarité T1, Transport…"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                >
                  {FEE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Montant (FCFA) *</label>
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Échéance *</label>
                <input
                  required
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Niveau (optionnel)</label>
                <input
                  placeholder="Ex. 6ème, Terminale…"
                  value={form.level}
                  onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Année scolaire *</label>
                <input
                  required
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
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
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="mt-4 text-sm text-[#1B3A6B] font-medium hover:underline"
                  >
                    Créer le premier frais
                  </button>
                )}
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
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              fee.type === 'ANNEXE'
                                ? 'bg-orange-50 text-orange-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {fee.type === 'ANNEXE' ? 'Annexe' : 'Scolarité'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {fee.level ? `${fee.level} · ` : ''}
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

          <p className="text-xs text-gray-400">
            Après création, assignez chaque frais à une ou plusieurs classes pour générer les dettes élèves.
          </p>
        </main>
      </div>
    </div>
  );
}
