'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Printer, RefreshCw, Users } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { staffPresenceApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { canAccessPath, hasRole } from '@/lib/rbac';

export default function StaffPresencePage() {
  const router = useRouter();
  const role = String(authStorage.getUser()?.role || '').toUpperCase();
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [q, t] = await Promise.all([
        staffPresenceApi.campusQr(),
        staffPresenceApi.today(),
      ]);
      setQr(q.data);
      setRows(Array.isArray(t.data) ? t.data : []);
    } catch {
      setError('Impossible de charger le pointage personnel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (
      !canAccessPath(role, '/personnel/presence') &&
      !hasRole(role, [
        'ADMIN',
        'FOUNDER',
        'DIRECTOR',
        'ACCOUNTANT',
        'CENSOR',
        'SURVEILLANT',
      ])
    ) {
      router.push('/dashboard');
      return;
    }
    load();
  }, [router, role]);

  const fmt = (v: string | null) =>
    v
      ? new Date(v).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '—';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Présence du personnel"
          subtitle="QR entrée campus — tous les agents (pas seulement enseignants)"
        />
        <main className="flex-1 p-6 space-y-6 max-w-5xl">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <>
              {qr && (
                <div className="bg-white rounded-2xl border p-6 flex flex-col md:flex-row gap-6 items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qr.payload)}`}
                    alt="QR campus"
                    width={200}
                    height={200}
                    className="rounded-lg border"
                  />
                  <div className="flex-1 space-y-2">
                    <h2 className="font-bold text-lg text-gray-900">
                      QR pointage — {qr.tenantName}
                    </h2>
                    <p className="text-sm text-gray-600">{qr.printHint}</p>
                    <div className="flex gap-2 print:hidden">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-3 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm"
                      >
                        <Printer className="w-4 h-4" /> Imprimer
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('Régénérer le QR entrée ?')) return;
                          await staffPresenceApi.regenerateCampusQr();
                          await load();
                        }}
                        className="px-3 py-2 border rounded-xl text-sm"
                      >
                        Régénérer
                      </button>
                      <button
                        type="button"
                        onClick={load}
                        className="flex items-center gap-2 px-3 py-2 border rounded-xl text-sm"
                      >
                        <RefreshCw className="w-4 h-4" /> Actualiser
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#1B3A6B]" />
                  <h3 className="font-semibold text-sm">
                    Pointages du jour ({rows.length})
                  </h3>
                </div>
                {rows.length === 0 ? (
                  <p className="p-6 text-sm text-gray-400 text-center">
                    Aucun pointage aujourd’hui
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-gray-500">
                      <tr>
                        <th className="px-4 py-2">Personne</th>
                        <th className="px-4 py-2">Rôle</th>
                        <th className="px-4 py-2">Entrée</th>
                        <th className="px-4 py-2">Sortie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-t">
                          <td className="px-4 py-2 font-medium">{r.personName}</td>
                          <td className="px-4 py-2 text-gray-500">{r.role}</td>
                          <td className="px-4 py-2 text-emerald-700">
                            {fmt(r.clockInAt)}
                          </td>
                          <td className="px-4 py-2 text-blue-700">
                            {fmt(r.clockOutAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
