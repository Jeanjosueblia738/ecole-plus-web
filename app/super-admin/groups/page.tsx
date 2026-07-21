'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Layers, Plus, RefreshCw, GraduationCap, LogOut, Loader2, Building2, X,
} from 'lucide-react';
import api from '@/lib/api';
import { saAuth } from '@/lib/sa-auth';

export default function SchoolGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', city: '' });
  const [saving, setSaving] = useState(false);

  const headers = () => saAuth.authHeader();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!saAuth.isLoggedIn()) { router.push('/super-admin/login'); return; }
    loadGroups();
  }, [mounted, router]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/school-groups', { headers: headers() });
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/school-groups', {
        name: form.name,
        code: form.code.toUpperCase(),
        city: form.city || undefined,
      }, { headers: headers() });
      setShowForm(false);
      setForm({ name: '', code: '', city: '' });
      loadGroups();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Création impossible.';
      alert(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#1B3A6B] text-white px-6 h-16 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6" />
          <span className="font-bold text-lg">ECOLE+</span>
          <span className="ml-2 px-3 py-1 bg-indigo-400/20 text-indigo-100 text-xs rounded-full border border-indigo-400/30">
            Groupes scolaires
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/super-admin')}
            className="text-sm text-blue-200 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10">
            Établissements
          </button>
          <button onClick={() => router.push('/super-admin/drena')}
            className="text-sm text-blue-200 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10">
            Dashboard DRENA
          </button>
          <button onClick={async () => { await saAuth.clear(); router.push('/super-admin/login'); }}
            className="flex items-center gap-2 px-3 py-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl text-sm">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Groupes d&apos;établissements</h1>
          <div className="flex gap-2">
            <button onClick={loadGroups}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm hover:bg-blue-800">
              <Plus className="w-4 h-4" /> Nouveau groupe
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Créer un groupe</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
                <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono uppercase" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ville</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Créer
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun groupe enregistré</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">{g.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{g.code}</p>
                    {g.city && <p className="text-xs text-gray-400 mt-1">{g.city}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {g._count?.tenants ?? g.tenants?.length ?? 0} établissement(s)
                  </div>
                </div>
                {g.tenants?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {g.tenants.map((t: any) => (
                      <span key={t.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {t.name} ({t.code})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
