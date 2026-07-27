'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Printer, QrCode, RefreshCw } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import QrCodeImage from '@/components/QrCodeImage';
import { financeApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { canAccessPath, hasRole } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

type ClassQr = {
  classId: string;
  name: string;
  level: string;
  year: string;
  roomLabel: string | null;
  payload: string;
  printHint?: string;
};

export default function ClassQrPage() {
  const router = useRouter();
  const role = String(authStorage.getUser()?.role || '').toUpperCase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ClassQr[]>([]);
  const [busyId, setBusyId] = useState('');
  const year = currentSchoolYear();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await financeApi.listClassQr(year);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger les QR classes.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!canAccessPath(role, '/classes/qr') && !hasRole(role, ['ADMIN', 'FOUNDER', 'DIRECTOR', 'ACCOUNTANT', 'RH'])) {
      router.push('/classes');
      return;
    }
    load();
  }, [router, role]);

  const saveRoom = async (classId: string, roomLabel: string) => {
    setBusyId(classId);
    try {
      await financeApi.updateClassQr(classId, { roomLabel: roomLabel || null });
      await load();
    } finally {
      setBusyId('');
    }
  };

  const regenerate = async (classId: string) => {
    if (!confirm('Régénérer ce QR ? L’ancien code collé en classe ne fonctionnera plus.')) {
      return;
    }
    setBusyId(classId);
    try {
      await financeApi.updateClassQr(classId, { regenerate: true });
      await load();
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="QR présence enseignants"
          subtitle="Un QR par classe — coller sur le bureau, scan avant et après le cours"
        />
        <main className="flex-1 p-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between print:hidden">
            <p className="text-sm text-gray-600 max-w-2xl">
              L’heure d’arrivée et de fin sont prises sur l’horloge du téléphone au moment du scan.
              1er scan = arrivée · 2e scan = fin de cours.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={load}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" /> Actualiser
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm hover:bg-blue-800"
              >
                <Printer className="w-4 h-4" /> Imprimer
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm print:hidden">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#1B3A6B]" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <QrCode className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Aucune classe active pour {year}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((c) => {
                return (
                  <div
                    key={c.classId}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center text-center break-inside-avoid"
                  >
                    <p className="font-bold text-lg text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500 mb-3">
                      {c.level} · {c.year}
                    </p>
                    <QrCodeImage
                      value={c.payload}
                      size={200}
                      alt={`QR ${c.name}`}
                      className="rounded-lg border border-gray-100"
                    />
                    <p className="text-sm font-medium text-gray-800 mt-3">
                      Salle : {c.roomLabel || '—'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 font-mono break-all px-2">
                      Scan ECOLE+ · avant & après cours
                    </p>

                    <div className="w-full mt-3 space-y-2 print:hidden">
                      <input
                        defaultValue={c.roomLabel || ''}
                        placeholder="Libellé salle (ex: Salle 12)"
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                        onBlur={(e) => {
                          if ((e.target.value || '') !== (c.roomLabel || '')) {
                            saveRoom(c.classId, e.target.value.trim());
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={busyId === c.classId}
                        onClick={() => regenerate(c.classId)}
                        className="w-full text-xs text-red-600 hover:underline disabled:opacity-40"
                      >
                        Régénérer le QR
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
