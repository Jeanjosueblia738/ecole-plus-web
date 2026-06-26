'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, User, School, Bell } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { authStorage } from '@/lib/auth';

export default function ParametresPage() {
  const router = useRouter();
  const user = authStorage.getUser();
  const tenant = authStorage.getTenant();

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); }
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Paramètres" subtitle="Configuration de votre établissement" />
        <main className="flex-1 p-6 max-w-2xl">
          {/* Profil */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-800">Mon profil</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Nom</span>
                <span className="text-sm font-medium text-gray-800">{user?.firstName} {user?.lastName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Email</span>
                <span className="text-sm font-medium text-gray-800">{user?.email}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">Rôle</span>
                <span className="text-sm font-medium text-blue-600">{user?.role}</span>
              </div>
            </div>
          </div>

          {/* Établissement */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <School className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-800">Mon établissement</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Nom</span>
                <span className="text-sm font-medium text-gray-800">{tenant?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Code</span>
                <span className="text-sm font-mono text-gray-800">{tenant?.code}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Ville</span>
                <span className="text-sm font-medium text-gray-800">{tenant?.city}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">Forfait</span>
                <span className="text-sm font-medium text-blue-600">{tenant?.plan}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}