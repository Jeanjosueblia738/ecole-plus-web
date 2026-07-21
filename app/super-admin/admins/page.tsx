'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap, LogOut, ArrowLeft, Plus, Shield, Eye,
  RefreshCw, CheckCircle, XCircle, Upload, Lock, User
} from 'lucide-react';
import api from '@/lib/api';
import { saAuth } from '@/lib/sa-auth';

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  VIEWER: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function SuperAdminsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saUser, setSaUser] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    role: 'VIEWER', photoUrl: '',
  });

  const getHeaders = () => saAuth.authHeader();

  const handleLogout = async () => {
    await saAuth.clear();
    router.push('/super-admin/login');
  };

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) { return; }
    if (!saAuth.isLoggedIn()) { router.push('/super-admin/login'); return; }
    setSaUser(saAuth.getUser() || {});
    loadAdmins();
  }, [mounted]);

  const loadAdmins = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get('/auth/super-admin/list', { headers: getHeaders() });
      setAdmins(data);
    } catch (e) {
      console.error(e);
      setAdmins([]);
      setLoadError('Impossible de charger les super-admins.');
    }
    finally { setLoading(false); }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let photoUrl = form.photoUrl;
      // En production, uploader l'image vers Supabase Storage
      // Pour l'instant on utilise le base64 comme URL temporaire
      if (photoFile && photoPreview) { photoUrl = photoPreview; }

      await api.post('/auth/super-admin/create', { ...form, photoUrl }, { headers: getHeaders() });
      setSuccess('Super admin créé avec succès !');
      setShowForm(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'VIEWER', photoUrl: '' });
      setPhotoFile(null);
      setPhotoPreview('');
      loadAdmins();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  const handleUpdatePassword = async (adminId: string) => {
    if (!newPassword || newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setPasswordSaving(true);
    try {
      await api.patch(`/auth/super-admin/${adminId}/password`,
        { newPassword }, { headers: getHeaders() });
      setSuccess('Mot de passe mis à jour !');
      setShowPasswordModal(null);
      setNewPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur');
    } finally { setPasswordSaving(false); }
  };

  const handleToggle = async (adminId: string, isActive: boolean) => {
    try {
      await api.patch(`/auth/super-admin/${adminId}/toggle`,
        { isActive: !isActive }, { headers: getHeaders() });
      setAdmins(a => a.map(x => x.id === adminId ? { ...x, isActive: !isActive } : x));
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur');
    }
  };

  const isOwner = saUser.role === 'OWNER';
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  if (!mounted) { return null; }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#1B3A6B] text-white px-6 h-16 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">ECOLE+</span>
          <span className="ml-3 px-3 py-1 bg-yellow-400/20 text-yellow-200 text-xs rounded-full border border-yellow-400/30">
            Super Administration
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/super-admin')}
            className="flex items-center gap-2 px-3 py-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl text-sm">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <span className="text-blue-200 text-sm">{saUser.firstName} {saUser.lastName}</span>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl text-sm">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium text-sm">{success}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#1B3A6B]" /> Super Administrateurs
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{admins.length} compte(s)</p>
          </div>
          {isOwner && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm hover:bg-blue-800">
              <Plus className="w-4 h-4" /> Nouveau super admin
            </button>
          )}
        </div>

        {/* Liste */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-[#1B3A6B] border-t-transparent rounded-full" />
            </div>
          ) : loadError ? (
            <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-700">
              <p className="font-medium">{loadError}</p>
              <button type="button" onClick={loadAdmins}
                className="mt-3 text-sm underline">Réessayer</button>
            </div>
          ) : admins.length === 0 ? (
            <div className="col-span-2 bg-white rounded-xl p-12 text-center text-gray-400 border border-gray-100">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun super-admin trouvé</p>
            </div>
          ) : admins.map(admin => (
            <div key={admin.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start gap-4">
                {/* Photo */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#1B3A6B]/10 flex-shrink-0 flex items-center justify-center">
                  {admin.photoUrl
                    ? <img src={admin.photoUrl} alt={admin.firstName} className="w-full h-full object-cover" />
                    : <User className="w-7 h-7 text-[#1B3A6B]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-800">{admin.firstName} {admin.lastName}</p>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${ROLE_COLORS[admin.role]}`}>
                      {admin.role}
                    </span>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg ${admin.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {admin.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {admin.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{admin.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Créé le {fmtDate(admin.createdAt)}</p>
                </div>
              </div>
              {isOwner && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button onClick={() => { setShowPasswordModal(admin.id); setError(''); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                    <Lock className="w-3.5 h-3.5" /> Mot de passe
                  </button>
                  <button onClick={() => handleToggle(admin.id, admin.isActive)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border ${
                      admin.isActive
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-green-200 text-green-600 hover:bg-green-50'
                    }`}>
                    {admin.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    {admin.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Modal créer super admin */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Nouveau super admin</h3>
              <button onClick={() => { setShowForm(false); setError(''); }}
                className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}

              {/* Photo */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                  {photoPreview
                    ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                    : <User className="w-10 h-10 text-gray-300" />}
                </div>
                <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm cursor-pointer hover:bg-gray-50">
                  <Upload className="w-4 h-4" /> Choisir une photo
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 6 caractères"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                  <option value="VIEWER">VIEWER — Lecture seule</option>
                  <option value="OWNER">OWNER — Contrôle total</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  VIEWER : peut voir les établissements · OWNER : peut tout modifier
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setError(''); }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Annuler
                </button>
                <button onClick={handleCreate} disabled={saving}
                  className="flex-1 bg-[#1B3A6B] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-40 flex items-center justify-center gap-2">
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Créer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal mot de passe */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Modifier le mot de passe</h3>
              <button onClick={() => { setShowPasswordModal(null); setNewPassword(''); setError(''); }}
                className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 caractères"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowPasswordModal(null); setNewPassword(''); setError(''); }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                  Annuler
                </button>
                <button onClick={() => handleUpdatePassword(showPasswordModal)} disabled={passwordSaving}
                  className="flex-1 bg-[#1B3A6B] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-40 flex items-center justify-center gap-2">
                  {passwordSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}