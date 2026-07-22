'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { parentApi, gradesApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';

export default function ParentNotesPage() {
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [grades, setGrades] = useState<any[]>([]);
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
    gradesApi
      .getByStudent(studentId)
      .then(({ data }) => setGrades(Array.isArray(data) ? data : data?.grades || []))
      .catch(() => setGrades([]));
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
      <h1 className="text-xl font-semibold text-gray-900">Notes</h1>
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
        {grades.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">Aucune note</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">Matière</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-right px-4 py-2">Note</th>
                <th className="text-right px-4 py-2">Coef</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {grades.map((g: any) => (
                <tr key={g.id}>
                  <td className="px-4 py-2.5">{g.subject}</td>
                  <td className="px-4 py-2.5 text-gray-500">{g.evalType}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">
                    {g.value}/20
                  </td>
                  <td className="px-4 py-2.5 text-right">×{g.coefficient}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
