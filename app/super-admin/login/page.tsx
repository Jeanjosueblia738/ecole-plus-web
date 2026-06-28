'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import Cookies from 'js-cookie';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/super-admin/login', { email, password });

      // Stocker le token super admin séparément
      Cookies.set('sa_token', data.access_token, { expires: 7 });
      Cookies.set('sa_user', JSON.stringify(data.user), { expires: 7 });

      router.push('/super-admin');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B3A6B] via-[#1e4080] to-[#2563EB] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 text-white mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-wide">ECOLE+</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-yellow-400/20 px-4 py-2 rounded-full border border-yellow-400/30">
            <Shield className="w-4 h-4 text-yellow-300" />
            <span className="text-yellow-200 text-sm font-medium">Accès Super Administration</span>
          </div>
        </div>

        {/* Carte login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Connexion Super Admin</h2>
          <p className="text-sm text-gray-500 mb-6">
            Espace réservé aux administrateurs de la plateforme ECOLE+
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="superadmin@ecoleplus.ci"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] pr-12"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-[#1B3A6B] text-white py-3 rounded-xl font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Connexion...</>
              ) : (
                <><Shield className="w-4 h-4" /> Se connecter</>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Cet espace est réservé aux administrateurs de la plateforme.
            </p>
            <a href="/login" className="text-xs text-[#1B3A6B] hover:underline mt-1 inline-block">
              ← Retour au login établissement
            </a>
          </div>
        </div>

        <p className="text-center text-blue-200 text-xs mt-4">
          ECOLE+ © 2026 — Plateforme éducative intelligente
        </p>
      </div>
    </div>
  );
}