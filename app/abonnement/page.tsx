'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle, XCircle, Clock, CreditCard, Smartphone,
  AlertTriangle, Zap, Star, Loader2, GraduationCap,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import PricingPlans from '@/components/PricingPlans';
import api from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';
import {
  PUBLIC_PLANS,
  formatXof,
  yearlyPrice,
  type PublicPlanKey,
} from '@/lib/subscription-plans';
import { normalizeCiPhone } from '@/lib/phone-ci';

const PAYMENT_METHODS = [
  { key: 'ORANGE_MONEY', label: 'Orange Money', emoji: '🟠' },
  { key: 'WAVE', label: 'Wave', emoji: '🔵' },
  { key: 'MTN_MOMO', label: 'MTN MoMo', emoji: '🟡' },
  { key: 'MOOV_MONEY', label: 'Moov Money', emoji: '🟢' },
];

function PublicAbonnementView() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-brand">ECOLE+</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-brand font-medium"
          >
            Se connecter
          </Link>
          <Link
            href="/onboarding"
            className="bg-brand text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-dark"
          >
            Créer mon école
          </Link>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Abonnements ECOLE+</h1>
          <p className="text-gray-500">
            Consultez les tarifs librement. L’inscription démarre un essai Découverte de 30 jours.
          </p>
        </div>
        <PricingPlans mode="public" />
      </main>
    </div>
  );
}

export default function AbonnementPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<'MONTH' | 'YEAR'>('MONTH');
  const [paymentMethod, setPaymentMethod] = useState('ORANGE_MONEY');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paying, setPaying] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      setIsGuest(true);
      setAuthReady(true);
      setLoading(false);
      return;
    }
    if (!hasRole(authStorage.getUser()?.role, can.manageSubscription)) {
      const role = String(authStorage.getUser()?.role || '').toUpperCase();
      router.push(role === 'PARENT' ? '/parent' : '/dashboard');
      return;
    }
    setIsGuest(false);
    setAuthReady(true);
    loadSubscription();
  }, [router]);

  const loadSubscription = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/subscription/my');
      setSubscription(data);
      if (data?.intendedPlan && ['STARTER', 'PRO', 'GROUP'].includes(data.intendedPlan)) {
        setSelectedPlan(data.intendedPlan);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: PublicPlanKey) => {
    setSelectedPlan(plan);
    setShowPaymentForm(true);
  };

  const handlePay = async () => {
    if (!selectedPlan || !phoneNumber.trim()) return;
    const normalized = normalizeCiPhone(phoneNumber);
    if (!normalized) {
      setPaymentResult({
        success: false,
        message: 'Numéro invalide — format CI attendu (ex. +225 07… ou 07…).',
      });
      return;
    }
    setPaying(true);
    setPaymentResult(null);
    try {
      const { data } = await api.post('/subscription/pay', {
        plan: selectedPlan,
        paymentMethod,
        phoneNumber: normalized,
        billingPeriod,
      });
      setPaymentResult(data);
      setShowPaymentForm(false);
      await loadSubscription();
    } catch (e: any) {
      setPaymentResult({
        success: false,
        message: e.response?.data?.message || 'Erreur de paiement',
      });
    } finally {
      setPaying(false);
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const statusConfig: Record<
    string,
    { label: string; color: string; icon: any; bg: string }
  > = {
    ACTIVE: {
      label: 'Actif',
      color: 'text-green-700',
      icon: CheckCircle,
      bg: 'bg-green-50 border-green-200',
    },
    TRIAL: {
      label: 'Essai gratuit',
      color: 'text-blue-700',
      icon: Clock,
      bg: 'bg-blue-50 border-blue-200',
    },
    TRIAL_EXPIRED: {
      label: 'Essai expiré',
      color: 'text-red-700',
      icon: XCircle,
      bg: 'bg-red-50 border-red-200',
    },
    EXPIRED: {
      label: 'Expiré',
      color: 'text-red-700',
      icon: XCircle,
      bg: 'bg-red-50 border-red-200',
    },
    SUSPENDED: {
      label: 'Suspendu',
      color: 'text-red-700',
      icon: AlertTriangle,
      bg: 'bg-red-50 border-red-200',
    },
  };

  if (!authReady || (loading && !isGuest)) {
    return (
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (isGuest) {
    return <PublicAbonnementView />;
  }

  const status = subscription?.status ?? 'TRIAL';
  const cfg = statusConfig[status] ?? statusConfig.TRIAL;
  const StatusIcon = cfg.icon;
  const selected = PUBLIC_PLANS.find((p) => p.key === selectedPlan);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Abonnement" subtitle="Gérez votre plan et vos paiements" />
        <main className="flex-1 p-6 space-y-6">
          {paymentResult && (
            <div
              className={`rounded-xl p-4 border flex items-center gap-3 ${
                paymentResult.simulated
                  ? 'bg-amber-50 border-amber-200'
                  : paymentResult.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
              }`}
            >
              {paymentResult.simulated ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              ) : paymentResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p
                  className={`font-medium text-sm ${
                    paymentResult.simulated
                      ? 'text-amber-900'
                      : paymentResult.success
                        ? 'text-green-800'
                        : 'text-red-800'
                  }`}
                >
                  {paymentResult.simulated
                    ? paymentResult.message ||
                      'Paiement simulé — aucun débit réel. En production, désactivez la simulation.'
                    : paymentResult.message}
                </p>
                {paymentResult.transactionId && !paymentResult.simulated && (
                  <p className="text-xs text-green-600 mt-0.5">
                    ID : {paymentResult.transactionId}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className={`rounded-xl p-6 border-2 ${cfg.bg}`}>
            {(status === 'TRIAL_EXPIRED' ||
              status === 'EXPIRED' ||
              status === 'SUSPENDED') && (
              <div className="mb-4 bg-red-100 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 font-medium">
                  Accès suspendu : un forfait payant est obligatoire pour réactiver
                  l’établissement.
                  {subscription?.intendedPlan
                    ? ` Forfait prévu à l’inscription : ${subscription.intendedPlan}.`
                    : ''}
                </p>
              </div>
            )}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <StatusIcon className={`w-8 h-8 ${cfg.color}`} />
                <div>
                  <p className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</p>
                  <p className="text-gray-600 text-sm">{subscription?.tenant?.name}</p>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-bold ${cfg.color} ${cfg.bg} border`}
                >
                  Plan {subscription?.tenant?.plan}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {subscription?.trialDaysLeft !== null && status === 'TRIAL' && (
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Jours d&apos;essai restants</p>
                  <p
                    className={`text-2xl font-bold ${
                      (subscription?.trialDaysLeft ?? 0) <= 7
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {subscription?.trialDaysLeft}
                  </p>
                </div>
              )}
              {subscription?.subscription?.endDate && (
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Renouvellement</p>
                  <p className="text-sm font-bold text-gray-800">
                    {fmtDate(subscription.subscription.endDate)}
                  </p>
                </div>
              )}
              {subscription?.subscription?.lastPaymentAt && (
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Dernier paiement</p>
                  <p className="text-sm font-bold text-gray-800">
                    {fmtDate(subscription.subscription.lastPaymentAt)}
                  </p>
                </div>
              )}
              {subscription?.subscription?.priceXof > 0 && (
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Mensualité</p>
                  <p className="text-sm font-bold text-green-600">
                    {formatXof(subscription.subscription.priceXof)}
                  </p>
                </div>
              )}
            </div>

            {((subscription?.trialDaysLeft !== null &&
              subscription?.trialDaysLeft <= 7 &&
              subscription?.trialDaysLeft > 0) ||
              (subscription?.subDaysLeft !== null &&
                subscription?.subDaysLeft <= 7 &&
                subscription?.subDaysLeft > 0)) && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-800 font-medium">
                  Votre accès expire dans{' '}
                  {subscription?.trialDaysLeft ?? subscription?.subDaysLeft} jour(s).
                  Renouvelez maintenant pour éviter la suspension.
                </p>
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
              <div>
                <h2 className="font-bold text-gray-800 text-lg">Choisir un plan</h2>
                <p className="text-sm text-gray-500">
                  Vous payez uniquement ce dont vous avez besoin.
                </p>
              </div>
              <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setBillingPeriod('MONTH')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    billingPeriod === 'MONTH'
                      ? 'bg-brand text-white'
                      : 'text-gray-600'
                  }`}
                >
                  Mensuel
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod('YEAR')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    billingPeriod === 'YEAR'
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-600'
                  }`}
                >
                  Annuel −30 %
                </button>
              </div>
            </div>

            {/* Cartes manuelles pour garder le billingPeriod du paiement sync */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4 mt-4">
              <div className="rounded-xl p-5 border-2 border-sky-200 bg-sky-50">
                <h3 className="font-bold text-gray-800 text-lg">Découverte</h3>
                <p className="text-2xl font-bold text-gray-900 my-2">GRATUIT</p>
                <p className="text-sm text-sky-800 font-medium mb-3">30 jours d’essai</p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    Toutes les fonctionnalités incluses
                  </li>
                </ul>
              </div>

              {PUBLIC_PLANS.map((p) => {
                const displayPrice =
                  billingPeriod === 'YEAR' ? yearlyPrice(p.price) : p.price;
                const periodLabel = billingPeriod === 'YEAR' ? '/an' : '/mois';
                return (
                  <div
                    key={p.key}
                    onClick={() => handleSelectPlan(p.key)}
                    className={`rounded-xl p-5 border-2 cursor-pointer transition-all ${
                      p.key === 'PRO'
                        ? 'border-orange-200 bg-orange-50'
                        : p.key === 'GROUP'
                          ? 'border-indigo-200 bg-indigo-50'
                          : 'border-blue-200 bg-blue-50'
                    } ${
                      selectedPlan === p.key
                        ? 'ring-2 ring-brand ring-offset-2'
                        : 'hover:shadow-md'
                    } ${subscription?.tenant?.plan === p.key ? 'opacity-60' : ''}`}
                  >
                    {p.popular && (
                      <span className="inline-flex items-center gap-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full mb-2">
                        <Star className="w-3 h-3" /> Recommandé
                      </span>
                    )}
                    <h3 className="font-bold text-gray-800 text-lg">{p.label}</h3>
                    <p className="text-2xl font-bold text-gray-900 my-2">
                      {formatXof(displayPrice)}
                      <span className="text-sm font-normal text-gray-500">
                        {periodLabel}
                      </span>
                    </p>
                    {billingPeriod === 'YEAR' && (
                      <p className="text-xs text-orange-700 font-medium mb-2">
                        soit {formatXof(p.price)}/mois − économie{' '}
                        {formatXof(p.price * 12 - displayPrice)}
                      </p>
                    )}
                    <ul className="space-y-1.5 mb-4">
                      {p.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 text-xs text-gray-600"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{' '}
                          {f}
                        </li>
                      ))}
                    </ul>
                    {subscription?.tenant?.plan === p.key ? (
                      <div className="w-full py-2 rounded-xl text-center text-sm font-medium bg-gray-200 text-gray-500">
                        Plan actuel
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectPlan(p.key)}
                        className={`w-full py-2 rounded-xl text-sm font-medium text-white ${p.btnColor}`}
                      >
                        {selectedPlan === p.key ? '✓ Sélectionné' : 'Choisir ce plan'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500">
              Tous les forfaits incluent : support technique, mises à jour automatiques,
              sauvegarde des données.
            </p>
          </div>

          {showPaymentForm && selectedPlan && selected && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-brand" />
                Paiement Mobile Money — Plan {selected.label}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Montant :{' '}
                <strong>
                  {formatXof(
                    billingPeriod === 'YEAR'
                      ? yearlyPrice(selected.price)
                      : selected.price,
                  )}
                </strong>
                {billingPeriod === 'YEAR' ? ' (annuel, −30 %)' : ' / mois'}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opérateur
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setPaymentMethod(m.key)}
                        className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          paymentMethod === m.key
                            ? 'border-brand bg-blue-50 text-brand'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-lg">{m.emoji}</span>
                        <p className="mt-1">{m.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro payeur (votre Mobile Money)
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+225 07 00 00 00"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Plan</span>
                    <span className="font-medium">{selected.label}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Montant</span>
                    <span className="font-bold text-green-600">
                      {formatXof(
                        billingPeriod === 'YEAR'
                          ? yearlyPrice(selected.price)
                          : selected.price,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Durée</span>
                    <span className="font-medium">
                      {billingPeriod === 'YEAR' ? '365 jours' : '30 jours'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={paying || !phoneNumber.trim()}
                    className="flex-1 bg-brand text-white py-3 rounded-xl text-sm font-medium hover:bg-brand-dark disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {paying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Traitement...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" /> Payer maintenant
                      </>
                    )}
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
