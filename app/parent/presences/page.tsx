'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { parentApi, attendanceApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';

export default function ParentPresencesPage() {
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authStorage.isLoggedIn() || authStorage.getUser()?.role !== 'PARENT') {
      router.push('/login');
      return;
    }
    parentApi
      .myChildren()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.children || [];
        setChildren(list);
        if (list[0]) setStudentId(list[0].id);
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!studentId) return;
    attendanceApi
      .getByStudent(studentId)
      .then(({ data }) => {
        const list = Array.isArray(data)
          ? data
          : data?.attendances || data?.records || [];
        setRows(list);
      })
      .catch(() => setRows([]));
  }, [studentId]);

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Présences</h1>
      <select
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"
      >
        {children.map((c) => (
          <option key={c.id} value={c.id}>
            {c.firstName} {c.lastName}
          </option>
        ))}
      </select>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">Aucun enregistrement</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {rows.slice(0, 50).map((r: any) => (
              <li
                key={r.id}
                className="px-5 py-3 flex justify-between text-sm"
              >
                <span>
                  {r.date
                    ? new Date(r.date).toLocaleDateString('fr-FR')
                    : '—'}{' '}
                  · {r.subject || 'Cours'}
                </span>
                <span
                  className={
                    r.status === 'ABSENT' || r.status === 'LATE'
                      ? 'text-amber-700 font-medium'
                      : 'text-green-700'
                  }
                >
                  {r.status}
                  {r.isJustified ? ' (justifié)' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
