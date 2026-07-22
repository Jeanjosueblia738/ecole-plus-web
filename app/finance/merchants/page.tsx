'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Smartphone, Shield } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import api from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';

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
  apiKeyMasked?: string | null;
  apiSecretMasked?: string | null;
};

export default function FinanceMerchantsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [drafts, setDrafts] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!hasRole(authStorage.getUser()?.role, can.managePaymentMerchants)) {
      router.push('/dashboard');
      return;
    }
    load();
  }, [router]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/finance/merchants');
      setMerchants(data);
      const next: Record<string, any> = {};
      for (const m of data as Merchant[]) {
        next[m.provider] = {
          isEnabled: m.isEnabled,
          merchantPhone: m.merchantPhone || '',
          merchantName: m.merchantName || '',
          merchantId: m.merchantId || '',
          sandbox: m.sandbox,
          apiKey: '',
          apiSecret: '',
          webhookSecret: '',
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
            : 'Impossible de charger la configuration (erreur serveur).',
      );
    } finally {
      setLoading(false);
    }
  };

  const setDraft = (provider: string, key: string, value: any) => {
    setDrafts((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], [key]: value },
    }));
  };

  const save = async (provider: string) => {
    setSaving(provider);
    setError('');
    setOk('');
    try {
      const d = drafts[provider];
      await api.put('/finance/merchants', {
        provider,
        isEnabled: d.isEnabled,
        merchantPhone: d.merchantPhone || undefined,
        merchantName: d.merchantName || undefined,
        merchantId: d.merchantId || undefined,
        sandbox: d.sandbox,
        ...(d.apiKey ? { apiKey: d.apiKey } : {}),
        ...(d.apiSecret ? { apiSecret: d.apiSecret } : {}),
        ...(d.webhookSecret ? { webhookSecret: d.webhookSecret } : {}),
      });
      setOk(`${provider} enregistré — les parents paieront vers ce compte.`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Échec de l’enregistrement');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Comptes Mobile Money"
          subtitle="Numéros / comptes qui reçoivent les frais payés par les parents"
        />
        <main className="flex-1 p-6 space-y-6 max-w-5xl">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-900">
            <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>
              Activez au moins un opérateur et renseignez le <strong>numéro marchand</strong> de l’école.
              Sans cette config, le paiement en ligne parent reste indisponible.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}
          {ok && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{ok}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {merchants.map((m) => {
                const d = drafts[m.provider] || {};
                return (
                  <div key={m.provider} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-[#1B3A6B]" />
                        {m.label}
                      </h3>
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
                      <label className="text-xs text-gray-500">Nom du compte</label>
                      <input
                        value={d.merchantName || ''}
                        onChange={(e) => setDraft(m.provider, 'merchantName', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="Lycée …"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Numéro marchand (réception) *</label>
                      <input
                        value={d.merchantPhone || ''}
                        onChange={(e) => setDraft(m.provider, 'merchantPhone', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="07 XX XX XX XX"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        Merchant ID (API / site_id CinetPay)
                      </label>
                      <input
                        value={d.merchantId || ''}
                        onChange={(e) => setDraft(m.provider, 'merchantId', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="site_id CinetPay ou API user MTN"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        API Key {m.hasApiKey ? `(${m.apiKeyMasked})` : ''} — Wave secret / CinetPay apikey / MTN sub-key
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
    </div>
  );
}
