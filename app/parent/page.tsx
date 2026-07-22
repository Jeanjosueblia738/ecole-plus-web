'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, BookOpen, ClipboardList, Wallet, GraduationCap } from 'lucide-react';
import { parentApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';

export default function ParentHomePage() {
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (authStorage.getUser()?.role !== 'PARENT') {
      router.push('/dashboard');
      return;
    }
    parentApi
      .myChildren()
      .then(({ data }) => setChildren(Array.isArray(data) ? data : data?.children || []))
      .catch(() => setError('Impossible de charger vos enfants.'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Bonjour</h1>
        <p className="text-sm text-gray-500 mt-1">
          Suivez la scolarité et payez les frais en ligne.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { href: '/parent/notes', icon: BookOpen, label: 'Notes' },
          { href: '/parent/presences', icon: ClipboardList, label: 'Présences' },
          { href: '/parent/finance', icon: Wallet, label: 'Payer les frais' },
        ].map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-200 flex items-center gap-3"
          >
            <c.icon className="w-5 h-5 text-[#1B3A6B]" />
            <span className="font-medium text-gray-800">{c.label}</span>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 font-semibold text-sm flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-[#1B3A6B]" />
          Mes enfants ({children.length})
        </div>
        {children.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">
            Aucun enfant lié à ce compte.
          </p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {children.map((c) => (
              <li key={c.id} className="px-5 py-4 flex justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {c.class?.name || c.className || 'Classe non affectée'} ·{' '}
                    {c.registrationNo}
                  </p>
                </div>
                <Link
                  href={`/parent/finance?studentId=${c.id}`}
                  className="text-sm text-[#1B3A6B] font-medium self-center"
                >
                  Payer →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
