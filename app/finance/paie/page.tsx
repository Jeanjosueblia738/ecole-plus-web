'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, Smartphone, Wand2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { financeApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-CI').format(n || 0) + ' FCFA';

export default function PaiePage() {
  const router = useRouter();
  const schoolYear = currentSchoolYear();
  const now = new Date();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [gen, setGen] = useState({
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    label: '',
  });
  const [form, setForm] = useState({
    label: '',
    month: String(now.getMonth() + 1),
    employeeName: '',
    baseSalaryXof: '',
    allowancesXof: '0',
    deductionsXof: '0',
  });

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await financeApi.listPayroll(String(now.getFullYear()));
      setRuns(Array.isArray(res.data) ? res.data : []);
    } catch {
      setRuns([]);
      setLoadError('Impossible de charger la paie.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!hasRole(authStorage.getUser()?.role, can.manageFinanceOps)) {
      router.push('/finance');
      return;
    }
    load();
  }, [router]);

  const generateFromHours = async () => {
    setBusy('gen');
    try {
      await financeApi.generatePayrollFromHours({
        year: Number(gen.year),
        month: Number(gen.month),
        schoolYear,
        label: gen.label || undefined,
      });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Génération impossible');
    } finally {
      setBusy('');
    }
  };

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeApi.createPayroll({
        label: form.label || `Paie ${form.month}/${gen.year}`,
        year: String(now.getFullYear()),
        month: Number(form.month),
        slips: [
          {
            employeeName: form.employeeName,
            baseSalaryXof: Number(form.baseSalaryXof),
            allowancesXof: Number(form.allowancesXof) || 0,
            deductionsXof: Number(form.deductionsXof) || 0,
          },
        ],
      });
      setShowManual(false);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      alert(Array.isArray(msg) ? msg.join(' · ') : msg || 'Échec création du bulletin.');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Paie enseignants" subtitle={`Bulletins · retenues heures · Wave`} />
        <main className="flex-1 p-6 space-y-4 max-w-4xl">
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex gap-3 text-sm">
              <Link href="/finance" className="inline-flex items-center gap-1 text-gray-500">
                <ArrowLeft className="w-4 h-4" /> Finance
              </Link>
              <Link href="/finance/paie/suivi" className="text-brand font-medium">
                Suivi des heures →
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm"
            >
              <Plus className="w-4 h-4" /> Bulletin manuel
            </button>
          </div>

          <div className="bg-white border rounded-xl p-4 space-y-3">
            <p className="font-semibold text-gray-800 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-orange-500" />
              Générer depuis les heures de cours
            </p>
            <p className="text-xs text-gray-500">
              Calcule le salaire (horaire ou fixe) et retire les minutes non faites × taux horaire.
            </p>
            <div className="grid sm:grid-cols-4 gap-2">
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Mois"
                value={gen.month}
                onChange={(e) => setGen({ ...gen, month: e.target.value })}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Année civile"
                value={gen.year}
                onChange={(e) => setGen({ ...gen, year: e.target.value })}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm sm:col-span-2"
                placeholder="Libellé (optionnel)"
                value={gen.label}
                onChange={(e) => setGen({ ...gen, label: e.target.value })}
              />
            </div>
            <button
              type="button"
              disabled={busy === 'gen'}
              onClick={generateFromHours}
              className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold disabled:opacity-60"
            >
              {busy === 'gen' ? 'Génération…' : 'Générer brouillon'}
            </button>
          </div>

          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {loadError}
            </div>
          )}

          {showManual && (
            <form
              onSubmit={submitManual}
              className="bg-white border rounded-xl p-4 grid sm:grid-cols-2 gap-3"
            >
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Libellé"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Mois"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
                required
              />
              <input
                required
                className="border rounded-lg px-3 py-2 text-sm sm:col-span-2"
                placeholder="Nom employé"
                value={form.employeeName}
                onChange={(e) => setForm({ ...form, employeeName: e.target.value })}
              />
              <input
                required
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Salaire de base"
                value={form.baseSalaryXof}
                onChange={(e) => setForm({ ...form, baseSalaryXof: e.target.value })}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Primes"
                value={form.allowancesXof}
                onChange={(e) => setForm({ ...form, allowancesXof: e.target.value })}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Retenues"
                value={form.deductionsXof}
                onChange={(e) => setForm({ ...form, deductionsXof: e.target.value })}
              />
              <div className="sm:col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold"
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => setShowManual(false)}
                  className="px-4 py-2 rounded-lg border text-sm"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {runs.length === 0 && <p className="text-sm text-gray-500">Aucune paie.</p>}
              {runs.map((r) => {
                const total = (r.slips || []).reduce(
                  (s: number, x: any) => s + (x.netXof || 0),
                  0,
                );
                return (
                  <div key={r.id} className="bg-white border rounded-xl p-4 text-sm">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-800">{r.label}</p>
                        <p className="text-xs text-gray-500">
                          {r.month}/{r.year} · {r.status} · {(r.slips || []).length}{' '}
                          bulletin(s)
                        </p>
                      </div>
                      <p className="font-bold text-brand">{fmt(total)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.status === 'DRAFT' && (
                        <button
                          className="px-3 py-1.5 rounded-lg border text-xs font-medium"
                          onClick={async () => {
                            try {
                              await financeApi.payrollStatus(r.id, 'VALIDATED');
                              await load();
                            } catch (err: any) {
                              const msg = err?.response?.data?.message;
                              alert(Array.isArray(msg) ? msg.join(' · ') : msg || 'Validation impossible.');
                            }
                          }}
                        >
                          Valider
                        </button>
                      )}
                      {r.status === 'VALIDATED' && (
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-medium disabled:opacity-60"
                          disabled={busy === r.id}
                          onClick={async () => {
                            setBusy(r.id);
                            try {
                              const { data } = await financeApi.payPayrollWave(r.id);
                              alert(
                                data?.allPaid
                                  ? 'Tous les versements Wave sont terminés (ou simulés).'
                                  : `Versements initiés — voir détail (${(data?.results || []).length}).`,
                              );
                              await load();
                            } catch (e: any) {
                              alert(
                                e?.response?.data?.message ||
                                  'Échec versement Wave (configurez le merchant Wave école).',
                              );
                            } finally {
                              setBusy('');
                            }
                          }}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          {busy === r.id ? 'Wave…' : 'Payer via Wave'}
                        </button>
                      )}
                      {r.status !== 'PAID' && (
                        <button
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium"
                          onClick={async () => {
                            try {
                              await financeApi.payrollStatus(r.id, 'PAID');
                              await load();
                            } catch (err: any) {
                              const msg = err?.response?.data?.message;
                              alert(Array.isArray(msg) ? msg.join(' · ') : msg || 'Mise à jour impossible.');
                            }
                          }}
                        >
                          Marquer payé
                        </button>
                      )}
                    </div>
                    <ul className="mt-3 space-y-1 border-t pt-2">
                      {(r.slips || []).map((s: any) => (
                        <li key={s.id} className="text-xs text-gray-600">
                          <div className="flex justify-between gap-2">
                            <span>
                              {s.employeeName}
                              {s.shortfallMinutes
                                ? ` · −${s.shortfallMinutes} min`
                                : ''}
                              {s.payoutStatus ? ` · ${s.payoutStatus}` : ''}
                            </span>
                            <span className="font-medium">{fmt(s.netXof)}</span>
                          </div>
                          {(s.deductionsXof > 0 || s.plannedMinutes > 0) && (
                            <p className="text-[11px] text-gray-400">
                              Base {fmt(s.baseSalaryXof)}
                              {s.deductionsXof
                                ? ` − retenues ${fmt(s.deductionsXof)}`
                                : ''}
                              {s.plannedMinutes
                                ? ` · prévu ${s.plannedMinutes} min / fait ${s.taughtMinutes || 0} min`
                                : ''}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
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
