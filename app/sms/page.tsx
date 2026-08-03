'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Smartphone } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { smsApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { canAccessPath, hasRole } from '@/lib/rbac';

const fmt = (n: number) => new Intl.NumberFormat('fr-CI').format(n || 0);
const fmtMoney = (n: number) => fmt(n) + ' FCFA';

export default function SmsDashboardPage() {
  const router = useRouter();
  const role = String(authStorage.getUser()?.role || '').toUpperCase();
  const canBuy = hasRole(role, ['ADMIN', 'FOUNDER']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [packs, setPacks] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [a, p, buy] = await Promise.all([
        smsApi.analytics(),
        smsApi.packs(),
        canBuy ? smsApi.purchases() : Promise.resolve({ data: [] }),
      ]);
      setAnalytics(a.data);
      setPacks(Array.isArray(p.data) ? p.data : []);
      setPurchases(Array.isArray(buy.data) ? buy.data : []);
    } catch {
      setError('Impossible de charger les données SMS.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!canAccessPath(role, '/sms')) {
      router.push('/dashboard');
      return;
    }
    load();
  }, [router, role]);

  const bal = analytics?.balance;
  const totals = analytics?.totals;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="SMS & crédits"
          subtitle="Souscription école · consommation · restant"
        />
        <main className="flex-1 p-6 space-y-6 max-w-5xl">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-xs text-gray-500">SMS restants</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {fmt(bal?.remaining ?? 0)}
                  </p>
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-xs text-gray-500">SMS utilisés (total)</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {fmt(bal?.used ?? 0)}
                  </p>
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-xs text-gray-500">SMS achetés</p>
                  <p className="text-2xl font-bold text-brand">
                    {fmt(bal?.purchased ?? 0)}
                  </p>
                </div>
                <div className="bg-white border rounded-xl p-4 flex items-center gap-3">
                  <Smartphone className="w-8 h-8 text-sky-600" />
                  <div>
                    <p className="text-xs text-gray-500">Aujourd’hui</p>
                    <p className="text-lg font-bold">{fmt(totals?.day ?? 0)}</p>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { label: 'Cette semaine', v: totals?.week },
                  { label: 'Ce mois', v: totals?.month },
                  { label: 'Cette année', v: totals?.year },
                ].map((x) => (
                  <div key={x.label} className="bg-white border rounded-xl p-4">
                    <p className="text-xs text-gray-500">{x.label}</p>
                    <p className="text-xl font-bold text-gray-800">{fmt(x.v ?? 0)} SMS</p>
                  </div>
                ))}
              </div>

              {canBuy && (
                <div className="bg-white border rounded-xl p-4 space-y-4">
                  <h2 className="font-semibold text-gray-800">Souscrire un forfait SMS</h2>
                  <p className="text-xs text-gray-500">
                    Paiement Wave via le compte Mobile Money de l’école (sandbox = simulation).
                  </p>
                  <input
                    className="border rounded-lg px-3 py-2 text-sm w-full max-w-sm"
                    placeholder="N° Wave payeur"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {packs.map((p) => (
                      <div
                        key={p.id}
                        className="border rounded-xl p-4 flex flex-col gap-2"
                      >
                        <p className="font-semibold text-gray-800">{p.label}</p>
                        <p className="text-sm text-sky-700">{fmt(p.credits)} SMS</p>
                        <p className="text-lg font-bold">{fmtMoney(p.priceXof)}</p>
                        <button
                          type="button"
                          disabled={!phone.trim() || busy === p.id}
                          onClick={async () => {
                            setBusy(p.id);
                            try {
                              const { data } = await smsApi.purchase({
                                packId: p.id,
                                payerPhone: phone.trim(),
                              });
                              if (data?.checkoutUrl) {
                                window.open(data.checkoutUrl, '_blank');
                              }
                              alert(
                                data?.simulated
                                  ? `${data.credits} SMS crédités (simulation).`
                                  : data?.message || 'Paiement initié',
                              );
                              await load();
                            } catch (e: any) {
                              alert(
                                e?.response?.data?.message ||
                                  'Achat impossible — configurez Wave école.',
                              );
                            } finally {
                              setBusy('');
                            }
                          }}
                          className="mt-auto px-3 py-2 rounded-lg bg-brand text-white text-sm font-medium disabled:opacity-50"
                        >
                          {busy === p.id ? '…' : 'Acheter'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid lg:grid-cols-3 gap-4">
                <div className="bg-white border rounded-xl p-4">
                  <h3 className="font-semibold text-sm mb-3">Top élèves (SMS)</h3>
                  <ul className="space-y-2 text-sm">
                    {(analytics?.topStudents || []).length === 0 && (
                      <li className="text-gray-400">Aucune conso.</li>
                    )}
                    {(analytics?.topStudents || []).map((s: any) => (
                      <li key={s.studentId} className="flex justify-between gap-2">
                        <span>
                          {s.name}
                          {s.className ? (
                            <span className="text-xs text-gray-400"> · {s.className}</span>
                          ) : null}
                        </span>
                        <span className="font-medium">{s.units}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <h3 className="font-semibold text-sm mb-3">Top classes</h3>
                  <ul className="space-y-2 text-sm">
                    {(analytics?.topClasses || []).length === 0 && (
                      <li className="text-gray-400">Aucune conso.</li>
                    )}
                    {(analytics?.topClasses || []).map((c: any) => (
                      <li key={c.classId} className="flex justify-between gap-2">
                        <span>{c.name}</span>
                        <span className="font-medium">{c.units}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <h3 className="font-semibold text-sm mb-3">Top personnels</h3>
                  <ul className="space-y-2 text-sm">
                    {(analytics?.topStaff || []).length === 0 && (
                      <li className="text-gray-400">Aucune conso.</li>
                    )}
                    {(analytics?.topStaff || []).map((s: any) => (
                      <li key={s.id} className="flex justify-between gap-2">
                        <span>
                          {s.name}
                          {s.role ? (
                            <span className="text-xs text-gray-400"> · {s.role}</span>
                          ) : null}
                        </span>
                        <span className="font-medium">{s.units}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {canBuy && purchases.length > 0 && (
                <div className="bg-white border rounded-xl p-4">
                  <h3 className="font-semibold text-sm mb-3">Historique d’achats</h3>
                  <ul className="space-y-2 text-sm">
                    {purchases.map((p) => (
                      <li key={p.id} className="flex justify-between border-b pb-2">
                        <span>
                          {p.pack?.label || p.credits + ' SMS'} · {p.status}
                        </span>
                        <span className="text-gray-500">
                          {fmtMoney(p.amountXof)} ·{' '}
                          {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
