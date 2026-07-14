'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, GraduationCap } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { classesApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { can, canAccessPath, hasRole } from '@/lib/rbac';

interface SchoolClass {
  id: string;
  name: string;
  level: string;
  year: string;
  capacity: number;
  _count: { students: number };
}

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const role = authStorage.getUser()?.role;
  const canCreate = hasRole(role, can.createClass);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!canAccessPath(authStorage.getUser()?.role, '/classes')) {
      router.push('/dashboard');
      return;
    }
    classesApi.getAll('2025-2026')
      .then(({ data }) => setClasses(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Gestion des classes" subtitle={`${classes.length} classe(s)`} />
        <main className="flex-1 p-6">
          {canCreate && (
            <div className="flex justify-end mb-6">
              <a
                href="/classes/nouvelle"
                className="flex items-center gap-2 bg-[#1B3A6B] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nouvelle classe
              </a>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                  <div className="h-5 bg-gray-100 rounded w-24 mb-4" />
                  <div className="h-4 bg-gray-100 rounded w-16" />
                </div>
              ))}
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <GraduationCap className="w-16 h-16 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Aucune classe créée</p>
              <p className="text-sm mt-1">
                {canCreate ? 'Ajoutez votre première classe pour commencer' : 'Aucune classe disponible pour le moment'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                      {cls.year}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg">{cls.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{cls.level}</p>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {cls._count?.students ?? 0} / {cls.capacity} élèves
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
