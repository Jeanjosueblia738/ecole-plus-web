'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, User, BookOpen } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { teachersApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';

export default function EnseignantsPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!hasRole(authStorage.getUser()?.role, can.manageTeachers)) {
      router.push('/dashboard');
      return;
    }
    teachersApi.getAll()
      .then(({ data }) => setTeachers(data))
      .catch(() => {
        setTeachers([]);
        setLoadError('Impossible de charger les enseignants.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Enseignants" subtitle={`${teachers.length} enseignant(s)`} />
        <main className="flex-1 p-6">
          {loadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
              {loadError}
            </div>
          )}
          <div className="flex justify-end mb-6">
            <a href="/enseignants/nouveau"
              className="flex items-center gap-2 bg-[#1B3A6B] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors">
              <Plus className="w-4 h-4" />
              Ajouter un enseignant
            </a>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Enseignant</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Matières</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>{[...Array(4)].map((_, j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : loadError ? (
                  <tr><td colSpan={4} className="text-center py-12 text-red-500">
                    <p>Erreur de chargement</p>
                  </td></tr>
                ) : teachers.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-gray-400">
                    <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Aucun enseignant enregistré</p>
                  </td></tr>
                ) : teachers.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-sm">
                          {t.firstName[0]}{t.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{t.firstName} {t.lastName}</p>
                          {t.phone && <p className="text-xs text-gray-400">{t.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{t.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {t.subjects?.map((s: string) => (
                          <span key={s} className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {t.isActive ? 'Actif' : 'Inactif'}
                      </span>
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