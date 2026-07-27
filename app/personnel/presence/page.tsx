'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Printer, RefreshCw, Users } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import QrCodeImage from '@/components/QrCodeImage';
import { staffPresenceApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { canAccessPath, hasRole } from '@/lib/rbac';

export default function StaffPresencePage() {
  const router = useRouter();
  const role = String(authStorage.getUser()?.role || '').toUpperCase();
  const canManageQr = hasRole(role, [
    'ADMIN',
    'FOUNDER',
    'DIRECTOR',
    'ACCOUNTANT',
    'RH',
  ]);
  const canRegenQr = hasRole(role, ['ADMIN', 'FOUNDER', 'DIRECTOR']);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [qrNote, setQrNote] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    setQrNote('');
    try {
      const todayRes = await staffPresenceApi.today();
      setRows(Array.isArray(todayRes.data) ? todayRes.data : []);
    } catch {
      setRows([]);
      setError('Impossible de charger les pointages du jour.');
    }

    if (canManageQr) {
      try {
        const q = await staffPresenceApi.campusQr();
        setQr(q.data);
      } catch {
        setQr(null);
        setQrNote('QR campus non disponible pour votre rôle.');
      }
    } else {
      setQr(null);
    }

    setLoading(false);
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
        'EDUCATOR',
        'RH',
      ])
    ) {
      router.push('/dashboard');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {qrNote && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
              {qrNote}
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
                  <QrCodeImage
                    value={qr.payload}
                    size={200}
                    alt="QR campus"
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
                      {canRegenQr && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm('Régénérer le QR entrée ?')) return;
                            try {
                              await staffPresenceApi.regenerateCampusQr();
                              await load();
                            } catch {
                              setError('Échec de la régénération du QR.');
                            }
                          }}
                          className="px-3 py-2 border rounded-xl text-sm"
                        >
                          Régénérer
                        </button>
                      )}
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
                    {error
                      ? 'Liste indisponible'
                      : 'Aucun pointage aujourd’hui'}
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
