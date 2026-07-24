'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bus, BookOpen, Utensils, Loader2, Plus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { campusApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { canAccessPath, hasRole, Role } from '@/lib/rbac';

type Tab = 'library' | 'transport' | 'canteen';

/** Aligné sur campus.controller create* (OWNER + DIRECTOR + SECRETARY ; cantine + ACCOUNTANT) */
const CAMPUS_WRITE: Role[] = ['ADMIN', 'FOUNDER', 'DIRECTOR', 'SECRETARY'];
const CAMPUS_CANTEEN_WRITE: Role[] = [...CAMPUS_WRITE, 'ACCOUNTANT'];

export default function CampusPage() {
  const router = useRouter();
  const role = authStorage.getUser()?.role;
  const canWrite = hasRole(role, CAMPUS_WRITE);
  const canWriteCanteen = hasRole(role, CAMPUS_CANTEEN_WRITE);
  const [tab, setTab] = useState<Tab>('library');
  const [overview, setOverview] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [routeName, setRouteName] = useState('');
  const [planName, setPlanName] = useState('');
  const [planFee, setPlanFee] = useState('15000');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [o, b, r, p] = await Promise.all([
        campusApi.overview(),
        campusApi.listBooks(),
        campusApi.listRoutes(),
        campusApi.listPlans(),
      ]);
      setOverview(o.data);
      setBooks(Array.isArray(b.data) ? b.data : []);
      setRoutes(Array.isArray(r.data) ? r.data : []);
      setPlans(Array.isArray(p.data) ? p.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Chargement campus impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!canAccessPath(authStorage.getUser()?.role, '/campus')) {
      router.push('/dashboard');
      return;
    }
    load();
  }, [router]);

  const addBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !title.trim()) return;
    setSaving(true);
    try {
      await campusApi.createBook({ title: title.trim(), quantity: 1 });
      setTitle('');
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const addRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !routeName.trim()) return;
    setSaving(true);
    try {
      await campusApi.createRoute({ name: routeName.trim() });
      setRouteName('');
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const addPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteCanteen || !planName.trim()) return;
    setSaving(true);
    try {
      await campusApi.createPlan({
        name: planName.trim(),
        feeXof: parseInt(planFee, 10) || 0,
      });
      setPlanName('');
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Campus"
          subtitle="Bibliothèque, transport scolaire et cantine"
        />
        <main className="flex-1 p-6 space-y-6 max-w-5xl">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Ouvrages', value: overview?.books ?? '—', icon: BookOpen },
              { label: 'Prêts ouverts', value: overview?.openLoans ?? '—', icon: BookOpen },
              { label: 'Circuits', value: overview?.routes ?? '—', icon: Bus },
              { label: 'Formules cantine', value: overview?.plans ?? '—', icon: Utensils },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white border border-gray-100 rounded-xl p-4"
              >
                <s.icon className="w-4 h-4 text-[#1B3A6B] mb-2" />
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-semibold">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {(
              [
                ['library', 'Bibliothèque'],
                ['transport', 'Transport'],
                ['canteen', 'Cantine'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  tab === id
                    ? 'bg-[#1B3A6B] text-white'
                    : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
            </div>
          ) : tab === 'library' ? (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              {canWrite && (
              <form onSubmit={addBook} className="flex gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre de l’ouvrage"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                />
                <button
                  disabled={saving}
                  className="flex items-center gap-1 px-4 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm"
                >
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </form>
              )}
              <ul className="divide-y divide-gray-50">
                {books.map((b) => (
                  <li
                    key={b.id}
                    className="py-3 flex justify-between text-sm"
                  >
                    <span className="font-medium text-gray-800">{b.title}</span>
                    <span className="text-gray-500">
                      Dispo {b.available}/{b.quantity}
                    </span>
                  </li>
                ))}
                {books.length === 0 && (
                  <li className="py-8 text-center text-gray-400 text-sm">
                    Aucun ouvrage
                  </li>
                )}
              </ul>
            </div>
          ) : tab === 'transport' ? (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              {canWrite && (
              <form onSubmit={addRoute} className="flex gap-2">
                <input
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="Nom du circuit (ex: Riviera → École)"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                />
                <button
                  disabled={saving}
                  className="flex items-center gap-1 px-4 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm"
                >
                  <Plus className="w-4 h-4" /> Circuit
                </button>
              </form>
              )}
              <ul className="divide-y divide-gray-50">
                {routes.map((r) => (
                  <li
                    key={r.id}
                    className="py-3 flex justify-between text-sm"
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="text-gray-500">
                      {r._count?.assignments ?? 0} élève(s) ·{' '}
                      {(r.feeXof || 0).toLocaleString('fr-FR')} FCFA
                    </span>
                  </li>
                ))}
                {routes.length === 0 && (
                  <li className="py-8 text-center text-gray-400 text-sm">
                    Aucun circuit
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
              {canWriteCanteen && (
              <form onSubmit={addPlan} className="flex flex-wrap gap-2">
                <input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Formule (ex: Demi-pension)"
                  className="flex-1 min-w-[160px] border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                />
                <input
                  type="number"
                  value={planFee}
                  onChange={(e) => setPlanFee(e.target.value)}
                  placeholder="FCFA / mois"
                  className="w-36 border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                />
                <button
                  disabled={saving}
                  className="flex items-center gap-1 px-4 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm"
                >
                  <Plus className="w-4 h-4" /> Formule
                </button>
              </form>
              )}
              <ul className="divide-y divide-gray-50">
                {plans.map((p) => (
                  <li
                    key={p.id}
                    className="py-3 flex justify-between text-sm"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-gray-500">
                      {(p.feeXof || 0).toLocaleString('fr-FR')} FCFA ·{' '}
                      {p.mealsPerWeek} repas/sem
                    </span>
                  </li>
                ))}
                {plans.length === 0 && (
                  <li className="py-8 text-center text-gray-400 text-sm">
                    Aucune formule
                  </li>
                )}
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
