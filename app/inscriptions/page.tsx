'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserPlus, Loader2, CheckCircle, XCircle, AlertCircle, ChevronDown,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { enrollmentsApi, classesApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { canAccessPath } from '@/lib/rbac';
import { currentSchoolYear } from '@/lib/school-year';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  REJECTED: 'Refusée',
};

export default function InscriptionsPage() {
  const router = useRouter();
  const year = currentSchoolYear();
  const [applications, setApplications] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [approveModal, setApproveModal] = useState<any | null>(null);
  const [approveForm, setApproveForm] = useState({ classId: '', registrationNo: '' });

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    if (!canAccessPath(authStorage.getUser()?.role, '/inscriptions')) {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [appsRes, classesRes] = await Promise.all([
        enrollmentsApi.list('PENDING'),
        classesApi.getAll(year),
      ]);
      setApplications(Array.isArray(appsRes.data) ? appsRes.data : []);
      setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
    } catch {
      setApplications([]);
      setLoadError('Impossible de charger les pré-inscriptions.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveModal) return;
    setActionId(approveModal.id);
    try {
      await enrollmentsApi.review(approveModal.id, {
        status: 'APPROVED',
        classId: approveForm.classId || undefined,
        registrationNo: approveForm.registrationNo || undefined,
      });
      setApplications((prev) => prev.filter((a) => a.id !== approveModal.id));
      setApproveModal(null);
      setApproveForm({ classId: '', registrationNo: '' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Approbation impossible.';
      alert(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (app: any) => {
    const reason = prompt('Motif du refus (optionnel) :') || undefined;
    setActionId(app.id);
    try {
      await enrollmentsApi.review(app.id, {
        status: 'REJECTED',
        rejectionReason: reason,
      });
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
    } catch {
      alert('Refus impossible.');
    } finally {
      setActionId(null);
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Pré-inscriptions" subtitle={`${applications.length} demande(s) en attente`} />
        <main className="flex-1 p-6">
          {loadError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {loadError}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16 text-gray-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
              <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune pré-inscription en attente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800">
                          {app.firstName} {app.lastName}
                        </h3>
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                          {STATUS_LABELS[app.status] ?? app.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Niveau demandé : {app.levelRequested || '—'} · Reçu le {fmtDate(app.createdAt)}
                      </p>
                      <div className="mt-2 text-sm text-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        <span>Parent : {app.parentName}</span>
                        <span>Tél. : {app.parentPhone}</span>
                        {app.parentEmail && <span>Email : {app.parentEmail}</span>}
                        {app.address && <span>Adresse : {app.address}</span>}
                        {app.notes && <span className="sm:col-span-2">Notes : {app.notes}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={actionId === app.id}
                        onClick={() => {
                          setApproveModal(app);
                          setApproveForm({
                            classId: classes[0]?.id ?? '',
                            registrationNo: '',
                          });
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Approuver
                      </button>
                      <button
                        type="button"
                        disabled={actionId === app.id}
                        onClick={() => handleReject(app)}
                        className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" /> Refuser
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {approveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="font-bold text-gray-800 mb-1">Approuver la pré-inscription</h3>
            <p className="text-sm text-gray-500 mb-4">
              {approveModal.firstName} {approveModal.lastName}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Classe d&apos;affectation</label>
                <div className="relative">
                  <select
                    value={approveForm.classId}
                    onChange={(e) => setApproveForm({ ...approveForm, classId: e.target.value })}
                    className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white pr-10"
                  >
                    <option value="">— Non affecté —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Matricule (optionnel)</label>
                <input
                  value={approveForm.registrationNo}
                  onChange={(e) => setApproveForm({ ...approveForm, registrationNo: e.target.value })}
                  placeholder="Généré automatiquement si vide"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setApproveModal(null)}
                className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button type="button" onClick={handleApprove} disabled={!!actionId}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
