/** Forfaits officiels ECOLE+ (alignés API `subscription/plans`). */

export const YEARLY_DISCOUNT = 0.3;

export type PublicPlanKey = 'STARTER' | 'PRO' | 'GROUP';

export type PublicPlan = {
  key: PublicPlanKey;
  label: string;
  price: number;
  desc: string;
  features: string[];
  popular?: boolean;
  color: string;
  btnColor: string;
};

export const PUBLIC_PLANS: PublicPlan[] = [
  {
    key: 'STARTER',
    label: 'Starter',
    price: 15_000,
    desc: 'Pour les établissements jusqu’à 500 élèves',
    features: ["Jusqu'à 500 élèves", 'Web + Mobile', 'Notes & Présences', 'Support technique'],
    color: 'border-blue-200',
    btnColor: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    key: 'PRO',
    label: 'Pro',
    price: 35_000,
    desc: 'Pour les établissements en croissance',
    features: [
      'Élèves illimités',
      'Toutes fonctions avancées',
      'Web + Mobile',
      'Bulletins PDF',
      'Support prioritaire',
    ],
    popular: true,
    color: 'border-brand',
    btnColor: 'bg-brand hover:bg-brand-dark',
  },
  {
    key: 'GROUP',
    label: 'Groupe',
    price: 75_000,
    desc: 'Pour fondateurs multi-écoles (jusqu’à 5)',
    features: [
      'Jusqu’à 5 établissements',
      'Pilotage consolidé',
      'Toutes fonctionnalités Pro',
      'Accompagnement dédié',
    ],
    color: 'border-indigo-200',
    btnColor: 'bg-indigo-600 hover:bg-indigo-700',
  },
];

export function yearlyPrice(monthly: number) {
  return Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT));
}

export function formatXof(n: number) {
  return `${new Intl.NumberFormat('fr-CI').format(n)} FCFA`;
}
