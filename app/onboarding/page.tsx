'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, ArrowLeft, ArrowRight, CheckCircle, Building2, User, Loader2 } from 'lucide-react';
import { authStorage } from '@/lib/auth';
import api from '@/lib/api';

const SCHOOL_TYPES = ['Lycée', 'Collège', 'École primaire', 'École privée', 'Institut', 'Université', 'Autre'];
const CITIES = ['Abidjan', 'Bouaké', 'Daloa', 'San-Pédro', 'Korhogo', 'Man', 'Gagnoa', 'Divo', 'Autre'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    // École
    name: '',
    code: '',
    type: 'Lycée',
    city: 'Abidjan',
    address: '',
    phone: '',
    email: '',
    // Directeur
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));



  const validateStep1 = () => {
    if (!form.name.trim()) return 'Le nom de l\'établissement est obligatoire';
    if (!form.code.trim()) return 'Le code MENA est obligatoire';
    if (!/^\d{6}$/.test(form.code)) return 'Le code MENA doit contenir exactement 6 chiffres (ex: 058049)';
    if (!form.email.trim() || !form.email.includes('@')) return 'Email de l\'établissement invalide';
    return '';
  };

  const validateStep2 = () => {
    if (!form.adminFirstName.trim()) return 'Le prénom est obligatoire';
    if (!form.adminLastName.trim()) return 'Le nom est obligatoire';
    if (!form.adminEmail.trim() || !form.adminEmail.includes('@')) return 'Email invalide';
    if (form.adminPassword.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
    if (form.adminPassword !== form.adminPasswordConfirm) return 'Les mots de passe ne correspondent pas';
    return '';
  };

  const handleNext = () => {
    const err = step === 1 ? validateStep1() : validateStep2();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    const err = validateStep2();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/tenants/register', {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        city: form.city,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        plan: 'TRIAL',
        adminFirstName: form.adminFirstName.trim(),
        adminLastName: form.adminLastName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
      });

      // Sauvegarder le token et rediriger
      authStorage.save(data.access_token, data.user, data.tenant);
      setStep(4);
      setTimeout(() => router.push('/dashboard'), 3000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur lors de la création. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B3A6B] via-[#1e4080] to-[#2563EB] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-wide">ECOLE+</span>
          </Link>
          <p className="text-blue-200 mt-2 text-sm">Inscription de votre établissement</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Progress steps */}
          {step < 4 && (
            <div className="px-8 pt-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                {[
                  { n: 1, label: 'Établissement', icon: Building2 },
                  { n: 2, label: 'Directeur', icon: User },
                  { n: 3, label: 'Confirmation', icon: CheckCircle },
                ].map((s, i) => (
                  <div key={s.n} className="flex items-center">
                    <div className={`flex flex-col items-center ${i > 0 ? 'ml-2' : ''}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                        step >= s.n ? 'bg-[#1B3A6B] text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {step > s.n ? <CheckCircle className="w-5 h-5" /> : s.n}
                      </div>
                      <span className={`text-xs mt-1 ${step >= s.n ? 'text-[#1B3A6B] font-medium' : 'text-gray-400'}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < 2 && <div className={`flex-1 h-0.5 mx-3 mt-[-14px] ${step > s.n ? 'bg-[#1B3A6B]' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-8 pb-8">

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
                {error}
              </div>
            )}

            {/* ── Étape 1 — Établissement ── */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Votre établissement</h2>
                <p className="text-sm text-gray-500 mb-6">Informations générales de votre école</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'établissement *</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)}
                      placeholder="ex: Lycée Excellence d'Abidjan"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Code école *</label>
                      <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
                        placeholder="LYCEE-CI-001"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                      <p className="text-xs text-gray-400 mt-1">Généré automatiquement</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                      <select value={form.type} onChange={e => set('type', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                        {SCHOOL_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                      <select value={form.city} onChange={e => set('city', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                        {CITIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                      <input value={form.phone} onChange={e => set('phone', e.target.value)}
                        placeholder="+225 07 00 00 00"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email de l'école *</label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="contact@monecole.ci"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                    <input value={form.address} onChange={e => set('address', e.target.value)}
                      placeholder="Quartier, commune..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>
                </div>

                <button onClick={handleNext}
                  className="w-full mt-6 bg-[#1B3A6B] text-white py-3 rounded-xl font-medium hover:bg-blue-800 transition-colors flex items-center justify-center gap-2">
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── Étape 2 — Compte Directeur ── */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Votre compte directeur</h2>
                <p className="text-sm text-gray-500 mb-6">Ces identifiants vous permettront d'accéder à ECOLE+</p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                      <input value={form.adminFirstName} onChange={e => set('adminFirstName', e.target.value)}
                        placeholder="Jean"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                      <input value={form.adminLastName} onChange={e => set('adminLastName', e.target.value)}
                        placeholder="Kouassi"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)}
                      placeholder="directeur@monecole.ci"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                    <input type="password" value={form.adminPassword} onChange={e => set('adminPassword', e.target.value)}
                      placeholder="Min. 8 caractères"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe *</label>
                    <input type="password" value={form.adminPasswordConfirm} onChange={e => set('adminPasswordConfirm', e.target.value)}
                      placeholder="Répétez le mot de passe"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setStep(1); setError(''); }}
                    className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Retour
                  </button>
                  <button onClick={handleNext}
                    className="flex-1 bg-[#1B3A6B] text-white py-3 rounded-xl font-medium hover:bg-blue-800 transition-colors flex items-center justify-center gap-2">
                    Continuer <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Étape 3 — Confirmation ── */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Confirmation</h2>
                <p className="text-sm text-gray-500 mb-6">Vérifiez les informations avant de créer votre école</p>

                <div className="space-y-3 mb-6">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Établissement</p>
                    <p className="font-bold text-gray-800">{form.name}</p>
                    <p className="text-sm text-gray-500">{form.type} — {form.city}</p>
                    <p className="text-sm font-mono text-blue-600 mt-1">Code MENA : {form.code}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Compte directeur</p>
                    <p className="font-bold text-gray-800">{form.adminFirstName} {form.adminLastName}</p>
                    <p className="text-sm text-gray-500">{form.adminEmail}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <p className="text-xs font-semibold text-green-600 uppercase mb-2">Plan</p>
                    <p className="font-bold text-gray-800">Essai gratuit — 30 jours</p>
                    <p className="text-sm text-gray-500">Accès complet à toutes les fonctionnalités</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setStep(2); setError(''); }}
                    className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Modifier
                  </button>
                  <button onClick={handleSubmit} disabled={loading}
                    className="flex-1 bg-[#1B3A6B] text-white py-3 rounded-xl font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</> : <>Créer mon école <CheckCircle className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            )}

            {/* ── Étape 4 — Succès ── */}
            {step === 4 && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Bienvenue sur ECOLE+ ! 🎉</h2>
                <p className="text-gray-500 mb-4">
                  Votre école <strong>{form.name}</strong> a été créée avec succès.
                </p>
                <p className="text-sm text-gray-400 mb-6">
                  Code MENA : <span className="font-mono font-bold text-[#1B3A6B]">{form.code}</span>
                </p>
                <div className="bg-blue-50 rounded-xl p-4 text-left mb-6">
                  <p className="text-sm font-semibold text-blue-800 mb-2">Prochaines étapes :</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>✅ Inscrire vos élèves</li>
                    <li>✅ Ajouter vos enseignants</li>
                    <li>✅ Configurer les classes</li>
                    <li>✅ Partager les codes d'accès aux parents</li>
                  </ul>
                </div>
                <p className="text-sm text-gray-400">Redirection vers votre tableau de bord...</p>
                <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1B3A6B] rounded-full animate-[progress_3s_linear]" style={{width: '100%', animation: 'none', transition: 'width 3s linear'}} />
                </div>
              </div>
            )}

          </div>
        </div>

        <p className="text-center text-blue-200 text-sm mt-6">
          Déjà inscrit ?{' '}
          <Link href="/login" className="text-white font-medium hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}