'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Star } from 'lucide-react';
import {
  PUBLIC_PLANS,
  formatXof,
  yearlyPrice,
  type PublicPlanKey,
} from '@/lib/subscription-plans';

type Props = {
  /** Lien CTA : onboarding (public) ou callback sélection (connecté) */
  mode?: 'public' | 'select';
  selectedPlan?: string;
  onSelect?: (plan: PublicPlanKey) => void;
  currentPlan?: string | null;
  className?: string;
};

export default function PricingPlans({
  mode = 'public',
  selectedPlan,
  onSelect,
  currentPlan,
  className = '',
}: Props) {
  const [billingPeriod, setBillingPeriod] = useState<'MONTH' | 'YEAR'>('MONTH');

  return (
    <div className={className}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-sm text-gray-500">
            30 jours d’essai Découverte gratuits, puis forfait payant obligatoire.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setBillingPeriod('MONTH')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              billingPeriod === 'MONTH' ? 'bg-brand text-white' : 'text-gray-600'
            }`}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod('YEAR')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              billingPeriod === 'YEAR' ? 'bg-orange-500 text-white' : 'text-gray-600'
            }`}
          >
            Annuel −30 %
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-6 border-2 border-sky-200 shadow-sm">
          <h3 className="font-bold text-xl text-gray-800">Découverte</h3>
          <p className="text-gray-500 text-sm mb-3">Essai à l’inscription</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">GRATUIT</p>
          <p className="text-sm text-sky-700 font-medium mb-5">30 jours inclus</p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              Toutes les fonctionnalités incluses
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              Puis passage au forfait choisi
            </li>
          </ul>
          {mode === 'public' && (
            <Link
              href="/onboarding"
              className="block w-full py-3 rounded-xl text-center font-medium border-2 border-sky-400 text-sky-800 hover:bg-sky-50"
            >
              Commencer l’essai
            </Link>
          )}
        </div>

        {PUBLIC_PLANS.map((p) => {
          const amount =
            billingPeriod === 'YEAR' ? yearlyPrice(p.price) : p.price;
          const periodLabel = billingPeriod === 'YEAR' ? '/an' : '/mois';
          const isCurrent = currentPlan === p.key;
          const isSelected = selectedPlan === p.key;

          return (
            <div
              key={p.key}
              className={`bg-white rounded-2xl p-6 border-2 ${p.color} ${
                p.popular ? 'shadow-xl relative' : 'shadow-sm'
              } ${isSelected ? 'ring-2 ring-brand ring-offset-2' : ''}`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs px-4 py-1 rounded-full font-medium inline-flex items-center gap-1">
                  <Star className="w-3 h-3" /> Recommandé
                </div>
              )}
              <h3 className="font-bold text-xl text-gray-800">{p.label}</h3>
              <p className="text-gray-500 text-sm mb-3">{p.desc}</p>
              <div className="mb-2">
                <span className="text-3xl font-bold text-gray-900">
                  {formatXof(amount).replace(' FCFA', '')}
                </span>
                <span className="text-gray-500 ml-1 text-sm">
                  {periodLabel} FCFA
                </span>
              </div>
              {billingPeriod === 'YEAR' && (
                <p className="text-xs text-orange-700 font-medium mb-4">
                  soit {formatXof(p.price)}/mois — économie{' '}
                  {formatXof(p.price * 12 - amount)}
                </p>
              )}
              {billingPeriod === 'MONTH' && <div className="mb-4" />}
              <ul className="space-y-2 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {mode === 'public' ? (
                <Link
                  href={`/onboarding?plan=${p.key}`}
                  className={`block w-full py-3 rounded-xl text-center font-medium text-white ${p.btnColor}`}
                >
                  Choisir {p.label}
                </Link>
              ) : isCurrent ? (
                <div className="w-full py-3 rounded-xl text-center text-sm font-medium bg-gray-200 text-gray-500">
                  Plan actuel
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect?.(p.key)}
                  className={`w-full py-3 rounded-xl text-sm font-medium text-white ${p.btnColor}`}
                >
                  {isSelected ? '✓ Sélectionné' : 'Choisir ce plan'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
