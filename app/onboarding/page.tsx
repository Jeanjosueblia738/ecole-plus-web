'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  GraduationCap,
  Loader2,
  Shield,
  Star,
} from 'lucide-react';
import api from '@/lib/api';
import { authStorage } from '@/lib/auth';

const PLANS = [
  {
    key: 'STARTER',
    label: 'Starter',
    price: 25000,
    desc: 'Petits établissements',
    popular: false,
    features: ["Jusqu'à 200 élèves", '5 enseignants', 'Web + Mobile', 'Notes & Présences'],
  },
  {
    key: 'PRO',
    label: 'Pro',
    price: 50000,
    desc: 'Établissements en croissance',
    popular: true,
    features: [
      "Jusqu'à 500 élèves",
      'Enseignants illimités',
      'Toutes fonctionnalités',
      'Bulletins PDF',
      'Support prioritaire',
    ],
  },
  {
    key: 'GROUP',
    label: 'Groupe',
    price: 75000,
    desc: 'Réseaux / multi-campus',
    popular: false,
    features: [
      'Plusieurs établissements',
      'Pilotage consolidé',
      'Toutes fonctionnalités Pro',
      'Accompagnement dédié',
    ],
  },
] as const;

type PlanKey = (typeof PLANS)[number]['key'];

const fmt = (n: number) =>
  `${new Intl.NumberFormat('fr-CI').format(n)} FCFA`;

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = (searchParams.get('plan') || 'PRO').toUpperCase();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<PlanKey>(
    PLANS.some((p) => p.key === initialPlan)
      ? (initialPlan as PlanKey)
      : 'PRO',
  );
  const [form, setForm] = useState({
    code: '',
    name: '',
    city: '',
    email: '',
    phone: '',
    address: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
  });

  useEffect(() => {
    if (authStorage.isLoggedIn()) {
      router.replace('/dashboard');
    }
  }, [router]);

  const selected = useMemo(
    () => PLANS.find((p) => p.key === plan) ?? PLANS[1],
    [plan],
  );

  const set = (k: string, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validateStep2 = () => {
    if (!form.code.trim() || !form.name.trim() || !form.city.trim() || !form.email.trim()) {
      setError('Renseignez le code, le nom, la ville et l’email de l’école.');
      return false;
    }
    if (!/^[A-Za-z0-9-]{3,32}$/.test(form.code.trim())) {
      setError('Code école : 3–32 caractères (lettres, chiffres, tirets).');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (
      !form.adminFirstName.trim() ||
      !form.adminLastName.trim() ||
      !form.adminEmail.trim() ||
      !form.adminPassword
    ) {
      setError('Complétez le compte administrateur.');
      return false;
    }
    if (form.adminPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return false;
    }
    if (form.adminPassword !== form.adminPasswordConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return false;
    }
    return true;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateStep3()) return;

    setLoading(true);
    try {
      const { data } = await api.post('/tenants/register', {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        city: form.city.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        plan,
        adminFirstName: form.adminFirstName.trim(),
        adminLastName: form.adminLastName.trim(),
        adminEmail: form.adminEmail.trim().toLowerCase(),
        adminPassword: form.adminPassword,
      });

      await authStorage.save(data.access_token, data.user, data.tenant);
      router.push('/dashboard?welcome=trial');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Impossible de créer l’établissement. Vérifiez les informations.';
      setError(Array.isArray(msg) ? msg.join(' · ') : String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-blue-50 border-b border-blue-100 px-6 py-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-[#1B3A6B] mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-[#1B3A6B] text-sm">
            Essai gratuit 30 jours inclus
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            Choisissez votre forfait maintenant. Vous utilisez la plateforme gratuitement
            pendant 30 jours. Ensuite, un forfait payant est obligatoire pour continuer.
          </p>
        </div>
      </div>

      <div className="px-6 pt-5 flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${
              step >= s ? 'bg-[#1B3A6B]' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <form onSubmit={submit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Choisissez votre forfait</h1>
              <p className="text-sm text-gray-500 mt-1">
                Facturation après l’essai — vous ne payez rien aujourd’hui.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPlan(p.key)}
                  className={`text-left rounded-xl border-2 p-4 transition-all ${
                    plan === p.key
                      ? 'border-[#1B3A6B] ring-2 ring-[#1B3A6B]/20 bg-blue-50/50'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  {p.popular && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-[#1B3A6B] text-white px-2 py-0.5 rounded-full mb-2">
                      <Star className="w-3 h-3" /> Populaire
                    </span>
                  )}
                  <p className="font-bold text-gray-900">{p.label}</p>
                  <p className="text-xs text-gray-500 mb-2">{p.desc}</p>
                  <p className="text-lg font-bold text-[#1B3A6B]">
                    {fmt(p.price)}
                    <span className="text-xs font-normal text-gray-500">/mois</span>
                  </p>
                  <ul className="mt-3 space-y-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep(2);
              }}
              className="w-full md:w-auto ml-auto flex items-center justify-center gap-2 bg-[#1B3A6B] text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-800"
            >
              Continuer avec {selected.label}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Votre établissement</h1>
              <p className="text-sm text-gray-500 mt-1">
                Forfait sélectionné : <strong>{selected.label}</strong> ({fmt(selected.price)}/mois après essai)
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code école *</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => set('code', e.target.value.toUpperCase())}
                  placeholder="ex: LYCEE-COCODY"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Lycée Moderne…"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                <input
                  required
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder="Abidjan"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email école *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+225…"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep(1);
                }}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  if (validateStep2()) setStep(3);
                }}
                className="flex items-center justify-center gap-2 bg-[#1B3A6B] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800"
              >
                Continuer
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Compte administrateur</h1>
              <p className="text-sm text-gray-500 mt-1">
                Ce compte gère l’école et pourra souscrire le forfait après l’essai.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                <input
                  required
                  value={form.adminFirstName}
                  onChange={(e) => set('adminFirstName', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  required
                  value={form.adminLastName}
                  onChange={(e) => set('adminLastName', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de connexion *</label>
                <input
                  required
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => set('adminEmail', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={form.adminPassword}
                  onChange={(e) => set('adminPassword', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer *</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={form.adminPasswordConfirm}
                  onChange={(e) => set('adminPasswordConfirm', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
              Après 30 jours, l’accès sera suspendu tant qu’un forfait payant
              ({selected.label} — {fmt(selected.price)}/mois ou autre) n’aura pas été souscrit.
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setStep(2);
                }}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
              >
                Retour
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-[#1B3A6B] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Création…
                  </>
                ) : (
                  <>
                    Créer mon école — essai 30 j
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B3A6B] via-[#1e4080] to-[#2563EB]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 text-white/90 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Retour</span>
          </Link>
          <div className="flex items-center gap-2 text-white">
            <GraduationCap className="w-6 h-6" />
            <span className="font-bold text-lg">ECOLE+</span>
          </div>
          <Link href="/login" className="text-sm text-blue-100 hover:text-white">
            Déjà un compte ?
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="bg-white rounded-2xl p-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
            </div>
          }
        >
          <OnboardingForm />
        </Suspense>
      </div>
    </div>
  );
}
