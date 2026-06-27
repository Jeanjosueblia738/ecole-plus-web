'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, User, Shield, CheckCircle, XCircle, Key } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import api from '@/lib/api';
import { authStorage } from '@/lib/auth';

interface TenantUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  FOUNDER: 'Fondateur',
  DIRECTOR: 'Directeur',
  CENSOR: 'Censeur',
  SURVEILLANT: 'Surveillant Général',
  SECRETARY: 'Secrétaire',
  ACCOUNTANT: 'Comptable',
  CASHIER: 'Caissier',
  TEACHER: 'Enseignant',
  EDUCATOR: 'Éducateur',
  PARENT: 'Parent',
  STUDENT: 'Élève',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-50 text-red-700',
  FOUNDER: 'bg-purple-50 text-purple-700',
  DIRECTOR: 'bg-blue-50 text-blue-700',
  CENSOR: 'bg-indigo-50 text-indigo-700',
  SURVEILLANT: 'bg-orange-50 text-orange-700',
  SECRETARY: 'bg-teal-50 text-teal-700',
  ACCOUNTANT: 'bg-green-50 text-green-700',
  CASHIER: 'bg-emerald-50 text-emerald-700',
  TEACHER: 'bg-yellow-50 text-yellow-700',
  EDUCATOR: 'bg-pink-50 text-pink-700',
  PARENT: 'bg-gray-50 text-gray-700',
  STUDENT: 'bg-sky-50 text-sky-700',
};

export default function UtilisateursPage() {
  const router = useRouter();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleToggle = async (user: TenantUser) => {
    setToggling(user.id);
    try {
      const action = user.isActive ? 'deactivate' : 'activate';
      await api.patch(`/users/${user.id}/${action}`);
      setUsers(u => u.map(us => us.id === user.id ? { ...us, isActive: !us.isActive } : us));
    } catch (e) { console.error(e); }
    finally { setToggling(null); }
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('Nouveau mot de passe (min 8 caractères) :');
    if (!newPassword || newPassword.length < 8) {
      alert('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    setResetting(userId);
    try {
      await api.patch(`/users/${userId}/reset-password`, { newPassword });
      alert('Mot de passe réinitialisé avec succès !');
    } catch (e) { console.error(e); }
    finally { setResetting(null); }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Supprimer le compte de ${name} ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/users/${userId}`);
      setUsers(u => u.filter(us => us.id !== userId));
    } catch (e: any) {
      alert(e.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const currentUser = authStorage.getUser();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Gestion des utilisateurs"
          subtitle={`${users.length} compte(s) dans votre établissement`}
        />
        <main className="flex-1 p-6">
          {/* Alerte info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Gestion des accès</p>
              <p className="text-sm text-blue-600 mt-0.5">
                Seul le Directeur/Admin peut créer et gérer les comptes. 
                Chaque membre peut modifier son propre mot de passe depuis son profil.
              </p>
            </div>
          </div>

          {/* Bouton créer */}
          <div className="flex justify-end mb-6">
            <a href="/utilisateurs/nouveau"
              className="flex items-center gap-2 bg-[#1B3A6B] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors">
              <Plus className="w-4 h-4" />
              Créer un compte
            </a>
          </div>

          {/* Tableau */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Utilisateur</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rôle</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Dernière connexion</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>{[...Array(5)].map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}</tr>
                  ))
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">
                    <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Aucun utilisateur</p>
                  </td></tr>
                ) : users.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${!user.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#1B3A6B] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">
                            {user.firstName} {user.lastName}
                            {user.id === currentUser?.id && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Moi</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[user.role] || 'bg-gray-50 text-gray-600'}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })
                        : <span className="text-gray-300">Jamais connecté</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.isActive ? (
                        <span className="flex items-center justify-center gap-1 text-green-600 text-xs font-medium">
                          <CheckCircle className="w-4 h-4" /> Actif
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 text-red-500 text-xs font-medium">
                          <XCircle className="w-4 h-4" /> Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {/* Reset mot de passe */}
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          disabled={resetting === user.id}
                          title="Réinitialiser le mot de passe"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        {/* Activer / Désactiver */}
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleToggle(user)}
                            disabled={toggling === user.id}
                            title={user.isActive ? 'Désactiver' : 'Activer'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              user.isActive
                                ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {user.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}