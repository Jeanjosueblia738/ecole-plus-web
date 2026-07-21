'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, RefreshCw, ChevronDown, ShieldAlert,
  TrendingDown, Users, Lightbulb,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { analyticsApi, classesApi } from '@/lib/api';
import { currentSchoolYear } from '@/lib/school-year';
import { authStorage } from '@/lib/auth';
import { canAccessPath } from '@/lib/rbac';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const LEVEL_STYLE: Record<RiskLevel, string> = {
  LOW: 'bg-green-50 text-green-700 border-green-200',
  MEDIUM: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  HIGH: 'bg-orange-50 text-orange-800 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
};

const LEVEL_LABEL: Record<RiskLevel, string> = {
  LOW: 'Faible',
  MEDIUM: 'Modéré',
  HIGH: 'Élevé',
  CRITICAL: 'Critique',
};

export default function RisquesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [minLevel, setMinLevel] = useState<RiskLevel | ''>('MEDIUM');
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await analyticsApi.dropoutRisk({
        classId: classId || undefined,
        minLevel: minLevel || undefined,
      });
      setData(res);
      setSelected(null);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Impossible de charger l’analyse');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!canAccessPath(authStorage.getUser()?.role, '/risques')) {
      router.push('/dashboard');
      return;
    }
    classesApi.getAll(currentSchoolYear()).then(({ data }) => setClasses(data)).catch(() => {
      setError('Impossible de charger les classes.');
    });
    load();
  }, [router]);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) return;
    load();
  }, [classId, minLevel]);

  const summary = data?.summary;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Risque de décrochage"
          subtitle="Score prédictif basé sur absences, notes, tendance et impayés (30 jours)"
        />
        <main className="flex-1 p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <strong>MVP analytique</strong> — score pondéré interprétable (pas un réseau de neurones).
            Les recommandations sont générées automatiquement selon les facteurs dominants. Un modèle ML
            entraîné pourra remplacer le moteur plus tard sans changer l’écran.
          </div>

          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Élèves analysés', value: summary.total, color: 'text-gray-800' },
                { label: 'Critiques', value: summary.critical, color: 'text-red-600' },
                { label: 'Élevés', value: summary.high, color: 'text-orange-600' },
                { label: 'Modérés', value: summary.medium, color: 'text-yellow-700' },
                { label: 'Faibles', value: summary.low, color: 'text-green-600' },
              ].map((k) => (
                <div key={k.label} className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-500">{k.label}</p>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Classe</label>
              <div className="relative">
                <select value={classId} onChange={(e) => setClassId(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white min-w-44">
                  <option value="">Toutes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Seuil min.</label>
              <select value={minLevel} onChange={(e) => setMinLevel(e.target.value as RiskLevel | '')}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white">
                <option value="">Tous</option>
                <option value="MEDIUM">Modéré+</option>
                <option value="HIGH">Élevé+</option>
                <option value="CRITICAL">Critique</option>
              </select>
            </div>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1B3A6B]" />
                <h2 className="text-sm font-semibold text-gray-800">
                  Élèves à risque ({data?.students?.length ?? 0})
                </h2>
              </div>
              {loading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Analyse en cours…</div>
              ) : error && !data?.students ? (
                <div className="p-8 text-center text-red-500 text-sm">Erreur de chargement</div>
              ) : !data?.students?.length ? (
                <div className="p-8 text-center text-gray-400 text-sm">Aucun élève au-dessus du seuil.</div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-[560px] overflow-y-auto">
                  {data.students.map((s: any) => (
                    <button
                      key={s.studentId}
                      type="button"
                      onClick={() => setSelected(s)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        selected?.studentId === s.studentId ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {s.lastName} {s.firstName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {s.className ?? 'Sans classe'} · {s.registrationNo}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700">{s.score}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${LEVEL_STYLE[s.riskLevel as RiskLevel]}`}>
                            {LEVEL_LABEL[s.riskLevel as RiskLevel]}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 min-h-[320px]">
              {!selected ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm gap-2 py-16">
                  <ShieldAlert className="w-10 h-10 opacity-30" />
                  Sélectionnez un élève pour voir les facteurs et recommandations
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">
                          {selected.lastName} {selected.firstName}
                        </h3>
                        <p className="text-xs text-gray-500">{selected.className}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${LEVEL_STYLE[selected.riskLevel as RiskLevel]}`}>
                        {LEVEL_LABEL[selected.riskLevel as RiskLevel]} · {selected.score}/100
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" /> Facteurs
                    </h4>
                    <div className="space-y-3">
                      {selected.factors?.map((f: any) => (
                        <div key={f.key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-700 font-medium">{f.label}</span>
                            <span className="text-gray-500">{f.score}/100 · poids {f.weight}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                f.score >= 60 ? 'bg-red-500' : f.score >= 35 ? 'bg-amber-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, f.score)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{f.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5" /> Recommandations
                    </h4>
                    <ul className="space-y-2">
                      {selected.recommendations?.map((r: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(`/eleves/${selected.studentId}`)}
                    className="w-full py-2.5 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    Ouvrir le dossier élève
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
