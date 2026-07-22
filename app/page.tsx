'use client';

import Link from 'next/link';
import {
  GraduationCap, Users, BookOpen, DollarSign, Bell, Shield,
  CheckCircle, ArrowRight, Star, Phone, Mail, MapPin,
  BarChart2, Clock, Smartphone, Globe
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Navbar ────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1B3A6B] rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#1B3A6B] tracking-wide">ECOLE+</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#fonctionnalites" className="hover:text-[#1B3A6B] transition-colors">Fonctionnalités</a>
            <a href="#roles" className="hover:text-[#1B3A6B] transition-colors">Profils</a>
            <a href="#tarifs" className="hover:text-[#1B3A6B] transition-colors">Tarifs</a>
            <a href="#contact" className="hover:text-[#1B3A6B] transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="text-gray-600 text-sm font-medium hover:text-[#1B3A6B] transition-colors">
              Se connecter
            </Link>
            <Link href="/onboarding"
              className="bg-[#1B3A6B] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors">
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-[#1B3A6B] via-[#1e4080] to-[#2563EB] text-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm mb-6 border border-white/20">
            <Star className="w-4 h-4 text-yellow-300" />
            <span>La première plateforme éducative intelligente de Côte d'Ivoire</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Modernisez la gestion<br />
            <span className="text-blue-300">de votre école</span>
          </h1>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            ECOLE+ connecte élèves, parents, enseignants et administration
            en une seule plateforme intelligente — pensée pour les réalités africaines.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login"
              className="bg-white text-[#1B3A6B] px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors flex items-center gap-2 justify-center">
              Accéder à la plateforme
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/onboarding"
              className="border-2 border-white/40 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-colors flex items-center gap-2 justify-center">
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '100%', label: 'Cloud & Mobile' },
              { value: '12', label: 'Profils utilisateurs' },
              { value: '24/7', label: 'Accès permanent' },
              { value: '🇨🇮', label: 'Pensé pour l\'Afrique' },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl p-4 border border-white/20">
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="text-blue-200 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fonctionnalités ───────────────────────────────────────── */}
      <section id="fonctionnalites" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tout ce dont votre école a besoin
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Une solution complète pour centraliser la vie scolaire et améliorer la communication école-famille.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: 'Gestion des élèves', desc: 'Inscription, dossiers scolaires, historique académique et codes d\'accès parents.', color: 'bg-blue-50 text-blue-600' },
              { icon: BookOpen, title: 'Notes & Bulletins', desc: 'Saisie des notes, calcul automatique des moyennes et génération PDF des bulletins.', color: 'bg-purple-50 text-purple-600' },
              { icon: CheckCircle, title: 'Présences & Absences', desc: 'Appel numérique, suivi des absences et validation des justificatifs en temps réel.', color: 'bg-green-50 text-green-600' },
              { icon: DollarSign, title: 'Gestion financière', desc: 'Frais de scolarité, paiements Mobile Money, reçus et suivi des impayés.', color: 'bg-emerald-50 text-emerald-600' },
              { icon: BookOpen, title: 'Cahier de texte', desc: 'Registre pédagogique officiel avec émargement numérique conforme aux normes CI.', color: 'bg-teal-50 text-teal-600' },
              { icon: Bell, title: 'Notifications', desc: 'Alertes push pour les parents, circulaires et messagerie interne instantanée.', color: 'bg-orange-50 text-orange-600' },
              { icon: BarChart2, title: 'Tableaux de bord', desc: 'KPIs adaptés à chaque rôle : direction, censeur, surveillance, finance.', color: 'bg-indigo-50 text-indigo-600' },
              { icon: Shield, title: 'Sécurité & Rôles', desc: '12 profils utilisateurs avec contrôle d\'accès strict et données chiffrées.', color: 'bg-red-50 text-red-600' },
              { icon: Smartphone, title: 'Application mobile', desc: 'App Android & iOS pour parents, élèves et enseignants — même hors connexion.', color: 'bg-pink-50 text-pink-600' },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Profils utilisateurs ──────────────────────────────────── */}
      <section id="roles" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Une plateforme pour tous
            </h2>
            <p className="text-gray-500 text-lg">Chaque acteur de l'école dispose de son espace dédié.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { emoji: '🏫', role: 'Direction', desc: 'KPIs globaux, gestion du personnel, supervision générale de l\'établissement.', color: 'border-blue-200 bg-blue-50' },
              { emoji: '📚', role: 'Enseignants', desc: 'Saisie des notes, appel numérique, cahier de texte et emploi du temps.', color: 'border-purple-200 bg-purple-50' },
              { emoji: '👨‍👩‍👧', role: 'Parents', desc: 'Suivi en temps réel des notes, absences et paiements de leur enfant.', color: 'border-green-200 bg-green-50' },
              { emoji: '🎓', role: 'Élèves', desc: 'Consultation des notes, emploi du temps et travaux à rendre depuis l\'application.', color: 'border-orange-200 bg-orange-50' },
            ].map((r) => (
              <div key={r.role} className={`rounded-xl p-6 border-2 ${r.color} hover:shadow-md transition-shadow`}>
                <div className="text-4xl mb-4">{r.emoji}</div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">{r.role}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mobile App ────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-[#1B3A6B] to-[#2563EB] text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Disponible sur<br />Android & iOS
              </h2>
              <p className="text-blue-100 text-lg mb-8 leading-relaxed">
                L'application mobile ECOLE+ permet aux parents de suivre leur enfant
                et aux enseignants de gérer leurs classes depuis n'importe où.
              </p>
              <div className="space-y-4">
                {[
                  'Notifications push en temps réel',
                  'Paiement Mobile Money intégré (Orange Money, Wave, MTN)',
                  'Fonctionnement hors connexion',
                  'Codes d\'accès sécurisés pour parents et élèves',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-blue-100">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="bg-white/10 rounded-3xl p-8 border border-white/20 text-center">
                <Smartphone className="w-24 h-24 mx-auto text-blue-300 mb-4" />
                <p className="text-white font-bold text-xl mb-2">ECOLE+ Mobile</p>
                <p className="text-blue-200 text-sm">Bientôt sur Play Store & App Store</p>
                <div className="mt-6 flex gap-3 justify-center">
                  <div className="bg-white/20 rounded-xl px-4 py-2 text-sm">🤖 Android</div>
                  <div className="bg-white/20 rounded-xl px-4 py-2 text-sm">🍎 iOS</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tarifs ────────────────────────────────────────────────── */}
      <section id="tarifs" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Tarifs simples et transparents</h2>
            <p className="text-gray-500 text-lg">Adaptés à tous les types d'établissements scolaires.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                plan: 'Starter',
                price: '25 000',
                period: '/mois',
                desc: 'Pour les petits établissements',
                features: ['Jusqu\'à 200 élèves', '5 enseignants', 'Web + Mobile', 'Notes & Présences', 'Support email'],
                color: 'border-gray-200',
                cta: 'Commencer',
                highlight: false,
              },
              {
                plan: 'Pro',
                price: '50 000',
                period: '/mois',
                desc: 'Pour les établissements en croissance',
                features: ['Jusqu\'à 500 élèves', 'Enseignants illimités', 'Web + Mobile', 'Toutes les fonctionnalités', 'Support prioritaire', 'Bulletins PDF'],
                color: 'border-[#1B3A6B]',
                cta: 'Choisir Pro',
                highlight: true,
              },
              {
                plan: 'Enterprise',
                price: 'Sur devis',
                period: '',
                desc: 'Pour les grands établissements',
                features: ['Élèves illimités', 'Multi-campus', 'API personnalisée', 'Formation incluse', 'Support dédié 24/7', 'Déploiement sur site'],
                color: 'border-gray-200',
                cta: 'Nous contacter',
                highlight: false,
              },
            ].map((p) => (
              <div key={p.plan} className={`bg-white rounded-2xl p-8 border-2 ${p.color} ${p.highlight ? 'shadow-xl relative' : 'shadow-sm'}`}>
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1B3A6B] text-white text-xs px-4 py-1 rounded-full font-medium">
                    Le plus populaire
                  </div>
                )}
                <h3 className="font-bold text-xl text-gray-800 mb-1">{p.plan}</h3>
                <p className="text-gray-500 text-sm mb-4">{p.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{p.price}</span>
                  <span className="text-gray-500 ml-1">{p.period} FCFA</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={p.plan === 'Enterprise' ? '#contact' : '/onboarding'}
                  className={`block w-full py-3 rounded-xl text-center font-medium transition-colors ${
                    p.highlight
                      ? 'bg-[#1B3A6B] text-white hover:bg-blue-800'
                      : 'border-2 border-[#1B3A6B] text-[#1B3A6B] hover:bg-blue-50'
                  }`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#1B3A6B] text-white text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prêt à moderniser votre établissement ?
          </h2>
          <p className="text-blue-200 text-lg mb-10">
            Rejoignez les établissements scolaires qui font confiance à ECOLE+ pour gérer leur école intelligemment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login"
              className="bg-white text-[#1B3A6B] px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors flex items-center gap-2 justify-center">
              Accéder à la plateforme
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/onboarding"
              className="border-2 border-white/40 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-colors flex items-center gap-2 justify-center">
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Contact ───────────────────────────────────────────────── */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Contactez-nous</h2>
            <p className="text-gray-500">Notre équipe est disponible pour vous accompagner.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Phone, title: 'Téléphone', info: '+225 07 58 79 74 28', sub: 'Lun–Ven 8h–18h' },
              { icon: Mail, title: 'Email', info: 'contact@ecoleplus.ci', sub: 'Réponse sous 24h' },
              { icon: MapPin, title: 'Adresse', info: 'Abidjan, Côte d\'Ivoire', sub: 'Cocody, Riviera' },
            ].map((c) => (
              <div key={c.title} className="text-center p-8 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <c.icon className="w-7 h-7 text-[#1B3A6B]" />
                </div>
                <h3 className="font-bold text-gray-800 text-lg mb-1">{c.title}</h3>
                <p className="text-[#1B3A6B] font-medium">{c.info}</p>
                <p className="text-gray-400 text-sm mt-1">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#1B3A6B] rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-wide">ECOLE+</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                La première plateforme éducative intelligente pensée pour les réalités africaines.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-300">Produit</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#tarifs" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Se connecter</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-300">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>contact@ecoleplus.ci</li>
                <li>+225 07 58 79 74 28</li>
                <li>Abidjan, Côte d'Ivoire</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>© 2026 ECOLE+. Tous droits réservés.</p>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>Fait avec ❤️ en Côte d'Ivoire</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}