'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, GraduationCap, Loader2, LogOut, Save, Smartphone, Shield,
} from 'lucide-react';
import api from '@/lib/api';
import { saAuth } from '@/lib/sa-auth';

type Merchant = {
  provider: string;
  label: string;
  isEnabled: boolean;
  merchantPhone: string | null;
  merchantName: string | null;
  merchantId: string | null;
  sandbox: boolean;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  hasWebhookSecret: boolean;
  configured?: boolean;
  apiKeyMasked?: string | null;
  apiSecretMasked?: string | null;
};

const emptySecrets = { apiKey: '', apiSecret: '', webhookSecret: '' };

export default function SuperAdminMerchantsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [drafts, setDrafts] = useState<Record<string, any>>({});

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!saAuth.isLoggedIn()) {
      router.push('/super-admin/login');
      return;
    }
    load();
  }, [mounted, router]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/super-admin/merchants', {
        headers: saAuth.authHeader(),
      });
      setMerchants(data);
      const next: Record<string, any> = {};
      for (const m of data as Merchant[]) {
        next[m.provider] = {
          isEnabled: m.isEnabled,
          merchantPhone: m.merchantPhone || '',
          merchantName: m.merchantName || '',
          merchantId: m.merchantId || '',
          sandbox: m.sandbox,
          ...emptySecrets,
        };
      }
      setDrafts(next);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(' · ')
          : typeof msg === 'string'
            ? msg
            : 'Impossible de charger les comptes marchands (erreur serveur).',
      );
    } finally {
      setLoading(false);
    }
  };

  const save = async (provider: string) => {
    setSaving(provider);
    setError('');
    setOk('');
    try {
      const d = drafts[provider];
      await api.put(
        '/super-admin/merchants',
        {
          provider,
          isEnabled: d.isEnabled,
          merchantPhone: d.merchantPhone || undefined,
          merchantName: d.merchantName || undefined,
          merchantId: d.merchantId || undefined,
          sandbox: d.sandbox,
          ...(d.apiKey ? { apiKey: d.apiKey } : {}),
          ...(d.apiSecret ? { apiSecret: d.apiSecret } : {}),
          ...(d.webhookSecret ? { webhookSecret: d.webhookSecret } : {}),
        },
        { headers: saAuth.authHeader() },
      );
      setOk(`${provider} enregistré — ces comptes reçoivent les paiements d’abonnement des écoles.`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Échec de l’enregistrement');
    } finally {
      setSaving(null);
    }
  };

  const setDraft = (provider: string, key: string, value: any) => {
    setDrafts((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], [key]: value },
    }));
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#1B3A6B] text-white px-6 h-16 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6" />
          <span className="font-bold text-lg">ECOLE+</span>
          <span className="ml-2 px-3 py-1 bg-blue-400/20 text-blue-100 text-xs rounded-full border border-blue-400/30">
            Comptes marchands
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/super-admin')}
            className="text-sm text-blue-200 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10"
          >
            Établissements
          </button>
          <button
            onClick={async () => {
              await saAuth.clear();
              router.push('/super-admin/login');
            }}
            className="flex items-center gap-2 px-3 py-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl text-sm"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push('/super-admin')}
            className="p-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#1B3A6B]" />
              Encaissement abonnements écoles
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Configurez Wave, Moov, Orange Money et MTN pour recevoir les paiements
              des forfaits ECOLE+ (Starter / Pro / Groupe).
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-sm text-amber-900">
          <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Numéro / ID marchand = compte qui reçoit les fonds</p>
            <p className="text-xs mt-1">
              Les clés API seront utilisées quand les SDK officiels seront branchés.
              En sandbox, <code className="bg-amber-100 px-1 rounded">PAYMENT_ALLOW_SIMULATION=true</code> permet de tester sans API.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}
        {ok && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{ok}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {merchants.map((m) => {
              const d = drafts[m.provider] || {};
              return (
                <div key={m.provider} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">{m.label}</h3>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!d.isEnabled}
                        onChange={(e) => setDraft(m.provider, 'isEnabled', e.target.checked)}
                      />
                      Activé
                    </label>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Nom marchand</label>
                    <input
                      value={d.merchantName || ''}
                      onChange={(e) => setDraft(m.provider, 'merchantName', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="ECOLE+ SAS"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Numéro marchand (réception des fonds) *</label>
                    <input
                      value={d.merchantPhone || ''}
                      onChange={(e) => setDraft(m.provider, 'merchantPhone', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="07 XX XX XX XX"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Merchant ID (API)</label>
                    <input
                      value={d.merchantId || ''}
                      onChange={(e) => setDraft(m.provider, 'merchantId', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">
                        API Key {m.hasApiKey ? `(${m.apiKeyMasked})` : ''}
                      </label>
                      <input
                        type="password"
                        value={d.apiKey || ''}
                        onChange={(e) => setDraft(m.provider, 'apiKey', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder={m.hasApiKey ? 'Laisser vide pour conserver' : ''}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        API Secret {m.hasApiSecret ? `(${m.apiSecretMasked})` : ''}
                      </label>
                      <input
                        type="password"
                        value={d.apiSecret || ''}
                        onChange={(e) => setDraft(m.provider, 'apiSecret', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder={m.hasApiSecret ? 'Laisser vide pour conserver' : ''}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Webhook secret</label>
                      <input
                        type="password"
                        value={d.webhookSecret || ''}
                        onChange={(e) => setDraft(m.provider, 'webhookSecret', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={d.sandbox !== false}
                      onChange={(e) => setDraft(m.provider, 'sandbox', e.target.checked)}
                    />
                    Mode sandbox
                  </label>
                  <button
                    onClick={() => save(m.provider)}
                    disabled={saving === m.provider}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white bg-[#1B3A6B] hover:bg-blue-800 disabled:opacity-60"
                  >
                    {saving === m.provider ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Enregistrer
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
