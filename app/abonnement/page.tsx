'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle, XCircle, Clock, CreditCard, Smartphone,
  AlertTriangle, RefreshCw, Zap, Shield, Star, Loader2
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import api from '@/lib/api';
import { authStorage } from '@/lib/auth';

const PLANS = [
  {
    key: 'STARTER', label: 'Starter', price: 25000,
    color: 'border-blue-200 bg-blue-50',
    btnColor: 'bg-blue-600 hover:bg-blue-700',
    features: ["Jusqu'à 200 élèves", '5 enseignants', 'Web + Mobile', 'Notes & Présences', 'Support email'],
  },
  {
    key: 'PRO', label: 'Pro', price: 50000,
    color: 'border-purple-200 bg-purple-50',
    btnColor: 'bg-purple-600 hover:bg-purple-700',
    features: ["Jusqu'à 500 élèves", 'Enseignants illimités', 'Web + Mobile', 'Toutes fonctionnalités', 'Support prioritaire', 'Bulletins PDF'],
    popular: true,
  },
  {
    key: 'ENTERPRISE', label: 'Enterprise', price: 0,
    color: 'border-green-200 bg-green-50',
    btnColor: 'bg-green-600 hover:bg-green-700',
    features: ['Élèves illimités', 'Multi-campus', 'API personnalisée', 'Formation incluse', 'Support 24/7'],
  },
];

const PAYMENT_METHODS = [
  { key: 'orange_money', label: 'Orange Money', emoji: '🟠' },
  { key: 'wave', label: 'Wave', emoji: '🔵' },
  { key: 'mtn_momo', label: 'MTN MoMo', emoji: '🟡' },
  { key: 'moov_money', label: 'Moov Money', emoji: '🟢' },
];

export default function AbonnementPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('orange_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paying, setPaying] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/subscription/my');
      setSubscription(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handlePay = async () => {
    if (!selectedPlan || !phoneNumber.trim()) { return; }
    setPaying(true);
    setPaymentResult(null);
    try {
      const { data } = await api.post('/subscription/pay', {
        plan: selectedPlan,
        paymentMethod,
        phoneNumber: phoneNumber.trim(),
      });
      setPaymentResult(data);
      setShowPaymentForm(false);
      await loadSubscription();
    } catch (e: any) {
      setPaymentResult({ success: false, message: e.response?.data?.message || 'Erreur de paiement' });
    } finally { setPaying(false); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('fr-CI').format(n) + ' FCFA';
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const statusConfig: Record<string, { label: string; color: string; icon: any; bg: string }> = {
    ACTIVE:       { label: 'Actif',          color: 'text-green-700',  icon: CheckCircle,    bg: 'bg-green-50 border-green-200' },
    TRIAL:        { label: 'Essai gratuit',  color: 'text-blue-700',   icon: Clock,          bg: 'bg-blue-50 border-blue-200' },
    TRIAL_EXPIRED:{ label: 'Essai expiré',   color: 'text-red-700',    icon: XCircle,        bg: 'bg-red-50 border-red-200' },
    EXPIRED:      { label: 'Expiré',         color: 'text-red-700',    icon: XCircle,        bg: 'bg-red-50 border-red-200' },
    SUSPENDED:    { label: 'Suspendu',       color: 'text-red-700',    icon: AlertTriangle,  bg: 'bg-red-50 border-red-200' },
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
        </div>
      </div>
    );
  }

  const status = subscription?.status ?? 'TRIAL';
  const cfg = statusConfig[status] ?? statusConfig.TRIAL;
  const StatusIcon = cfg.icon;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Abonnement" subtitle="Gérez votre plan et vos paiements" />
        <main className="flex-1 p-6 space-y-6">

          {/* Résultat paiement */}
          {paymentResult && (
            <div className={`rounded-xl p-4 border flex items-center gap-3 ${
              paymentResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              {paymentResult.success
                ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                : <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
              <div>
                <p className={`font-medium text-sm ${paymentResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {paymentResult.message}
                </p>
                {paymentResult.transactionId && (
                  <p className="text-xs text-green-600 mt-0.5">ID : {paymentResult.transactionId}</p>
                )}
              </div>
            </div>
          )}

          {/* Carte état abonnement */}
          <div className={`rounded-xl p-6 border-2 ${cfg.bg}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <StatusIcon className={`w-8 h-8 ${cfg.color}`} />
                <div>
                  <p className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</p>
                  <p className="text-gray-600 text-sm">{subscription?.tenant?.name}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${cfg.color} ${cfg.bg} border`}>
                  Plan {subscription?.tenant?.plan}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {subscription?.trialDaysLeft !== null && status === 'TRIAL' && (
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Jours d'essai restants</p>
                  <p className={`text-2xl font-bold ${(subscription?.trialDaysLeft ?? 0) <= 7 ? 'text-red-600' : 'text-blue-600'}`}>
                    {subscription?.trialDaysLeft}
                  </p>
                </div>
              )}
              {subscription?.subscription?.endDate && (
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Renouvellement</p>
                  <p className="text-sm font-bold text-gray-800">{fmtDate(subscription.subscription.endDate)}</p>
                </div>
              )}
              {subscription?.subscription?.lastPaymentAt && (
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Dernier paiement</p>
                  <p className="text-sm font-bold text-gray-800">{fmtDate(subscription.subscription.lastPaymentAt)}</p>
                </div>
              )}
              {subscription?.subscription?.priceXof > 0 && (
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Mensualité</p>
                  <p className="text-sm font-bold text-green-600">{fmt(subscription.subscription.priceXof)}</p>
                </div>
              )}
            </div>

            {/* Avertissement J-7 */}
            {((subscription?.trialDaysLeft !== null && subscription?.trialDaysLeft <= 7 && subscription?.trialDaysLeft > 0) ||
              (subscription?.subDaysLeft !== null && subscription?.subDaysLeft <= 7 && subscription?.subDaysLeft > 0)) && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-800 font-medium">
                  Votre accès expire dans {subscription?.trialDaysLeft ?? subscription?.subDaysLeft} jour(s).
                  Renouvelez maintenant pour éviter la suspension.
                </p>
              </div>
            )}
          </div>

          {/* Plans */}
          <div>
            <h2 className="font-bold text-gray-800 text-lg mb-4">Choisir un plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map(p => (
                <div key={p.key}
                  onClick={() => { setSelectedPlan(p.key); setShowPaymentForm(p.key !== 'ENTERPRISE'); }}
                  className={`rounded-xl p-5 border-2 cursor-pointer transition-all ${p.color}
                    ${selectedPlan === p.key ? 'ring-2 ring-[#1B3A6B] ring-offset-2' : 'hover:shadow-md'}
                    ${subscription?.tenant?.plan === p.key ? 'opacity-60 cursor-default' : ''}`}>
                  {p.popular && (
                    <span className="inline-flex items-center gap-1 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full mb-2">
                      <Star className="w-3 h-3" /> Populaire
                    </span>
                  )}
                  <h3 className="font-bold text-gray-800 text-lg">{p.label}</h3>
                  <p className="text-2xl font-bold text-gray-900 my-2">
                    {p.price === 0 ? 'Sur devis' : fmt(p.price)}
                    {p.price > 0 && <span className="text-sm font-normal text-gray-500">/mois</span>}
                  </p>
                  <ul className="space-y-1.5 mb-4">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  {subscription?.tenant?.plan === p.key ? (
                    <div className="w-full py-2 rounded-xl text-center text-sm font-medium bg-gray-200 text-gray-500">
                      Plan actuel
                    </div>
                  ) : p.key === 'ENTERPRISE' ? (
                    <a href="mailto:contact@ecoleplus.ci"
                      className="block w-full py-2 rounded-xl text-center text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                      Nous contacter
                    </a>
                  ) : (
                    <button onClick={() => { setSelectedPlan(p.key); setShowPaymentForm(true); }}
                      className={`w-full py-2 rounded-xl text-sm font-medium text-white ${p.btnColor}`}>
                      {selectedPlan === p.key ? '✓ Sélectionné' : 'Choisir ce plan'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Formulaire paiement */}
          {showPaymentForm && selectedPlan && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#1B3A6B]" />
                Paiement Mobile Money — Plan {selectedPlan}
              </h3>

              <div className="space-y-4">
                {/* Opérateur */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Opérateur</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PAYMENT_METHODS.map(m => (
                      <button key={m.key} onClick={() => setPaymentMethod(m.key)}
                        className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          paymentMethod === m.key
                            ? 'border-[#1B3A6B] bg-blue-50 text-[#1B3A6B]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <span className="text-lg">{m.emoji}</span>
                        <p className="mt-1">{m.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Numéro */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de téléphone
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                      placeholder="+225 07 00 00 00"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>
                </div>

                {/* Récapitulatif */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Plan</span>
                    <span className="font-medium">{selectedPlan}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Montant</span>
                    <span className="font-bold text-green-600">
                      {fmt(PLANS.find(p => p.key === selectedPlan)?.price ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Durée</span>
                    <span className="font-medium">30 jours</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowPaymentForm(false)}
                    className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50">
                    Annuler
                  </button>
                  <button onClick={handlePay} disabled={paying || !phoneNumber.trim()}
                    className="flex-1 bg-[#1B3A6B] text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-40 flex items-center justify-center gap-2">
                    {paying
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement...</>
                      : <><Zap className="w-4 h-4" /> Payer maintenant</>}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}