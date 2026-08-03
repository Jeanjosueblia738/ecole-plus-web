'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  School,
  Smartphone,
  CalendarRange,
  GraduationCap,
  FileText,
  Loader2,
  Save,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import PhotoUpload from '@/components/PhotoUpload';
import { authStorage } from '@/lib/auth';
import { AuthTenant, tenantsApi } from '@/lib/api';
import { can, canAccessPath, hasRole } from '@/lib/rbac';

type BrandForm = {
  phone: string;
  address: string;
  logoUrl: string;
  docHeaderLine: string;
  docFooterLine: string;
  motto: string;
  directorName: string;
  schoolStatus: string;
  drena: string;
};

function tenantToForm(t: AuthTenant | null): BrandForm {
  return {
    phone: t?.phone || '',
    address: t?.address || '',
    logoUrl: t?.logoUrl || '',
    docHeaderLine: t?.docHeaderLine || '',
    docFooterLine: t?.docFooterLine || '',
    motto: t?.motto || '',
    directorName: t?.directorName || '',
    schoolStatus: t?.schoolStatus || '',
    drena: t?.drena || '',
  };
}

export default function ParametresPage() {
  const router = useRouter();
  const user = authStorage.getUser();
  const [tenant, setTenant] = useState<AuthTenant | null>(null);
  const [form, setForm] = useState<BrandForm>(tenantToForm(null));
  const [saving, setSaving] = useState(false);
  const [loadingBrand, setLoadingBrand] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canMerchants = hasRole(user?.role, can.managePaymentMerchants);
  const canYears = hasRole(user?.role, can.manageAcademicYears);
  const canPassage = hasRole(user?.role, can.studentPassage);
  const canBrand = hasRole(user?.role, can.manageTenantBranding);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!canAccessPath(authStorage.getUser()?.role, '/parametres')) {
      const role = String(authStorage.getUser()?.role || '').toUpperCase();
      router.push(role === 'PARENT' ? '/parent' : '/dashboard');
      return;
    }
    const t = authStorage.getTenant();
    setTenant(t);
    setForm(tenantToForm(t));
    if (canBrand) {
      setLoadingBrand(true);
      tenantsApi
        .getMe()
        .then(({ data }) => {
          setTenant(data);
          setForm(tenantToForm(data));
          authStorage.setTenant(data);
        })
        .catch(() => {
          /* cookie session suffit */
        })
        .finally(() => setLoadingBrand(false));
    }
  }, [router, canBrand]);

  const setField = (key: keyof BrandForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const saveBranding = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const { data } = await tenantsApi.updateMe({
        phone: form.phone || null,
        address: form.address || null,
        logoUrl: form.logoUrl || null,
        docHeaderLine: form.docHeaderLine || null,
        docFooterLine: form.docFooterLine || null,
        motto: form.motto || null,
        directorName: form.directorName || null,
        schoolStatus: form.schoolStatus || null,
        drena: form.drena || null,
      });
      setTenant(data);
      setForm(tenantToForm(data));
      authStorage.setTenant(data);
      setMsg('Identité documents enregistrée.');
    } catch (e: any) {
      setMsg(
        e?.response?.data?.message ||
          'Enregistrement impossible. Vérifiez les champs (logo https).',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Paramètres" subtitle="Configuration de votre établissement" />
        <main className="flex-1 p-6 max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-800">Mon profil</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">Nom</span>
                <span className="text-sm font-medium text-gray-800">
                  {user?.firstName} {user?.lastName}
                </span>
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

          {canBrand && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-800">Identité & documents</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Logo, en-tête et pied de page utilisés sur bulletins, attestations,
                certificats, relevés et reçus.
              </p>
              {loadingBrand ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center mb-2">
                    <PhotoUpload
                      currentUrl={form.logoUrl || undefined}
                      name={tenant?.name}
                      folder="ecoles"
                      entityId={tenant?.id || 'school'}
                      onUpload={(url) => setField('logoUrl', url)}
                    />
                  </div>
                  <label className="block text-sm">
                    <span className="text-gray-500">Adresse</span>
                    <input
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      value={form.address}
                      onChange={(e) => setField('address', e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-500">Téléphone</span>
                    <input
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-500">Ligne d&apos;en-tête (documents)</span>
                    <input
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="République de Côte d’Ivoire — MEN…"
                      value={form.docHeaderLine}
                      onChange={(e) => setField('docHeaderLine', e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-500">Pied de page</span>
                    <input
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      value={form.docFooterLine}
                      onChange={(e) => setField('docFooterLine', e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-500">Devise</span>
                    <input
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      value={form.motto}
                      onChange={(e) => setField('motto', e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-gray-500">Directeur / Chef d&apos;établissement</span>
                    <input
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      value={form.directorName}
                      onChange={(e) => setField('directorName', e.target.value)}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">
                      <span className="text-gray-500">Statut</span>
                      <select
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        value={form.schoolStatus}
                        onChange={(e) => setField('schoolStatus', e.target.value)}
                      >
                        <option value="">—</option>
                        <option value="Public">Public</option>
                        <option value="Privé">Privé</option>
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="text-gray-500">DRENA / Inspection</span>
                      <input
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        value={form.drena}
                        onChange={(e) => setField('drena', e.target.value)}
                      />
                    </label>
                  </div>
                  {msg && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{msg}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => void saveBranding()}
                    disabled={saving || !tenant?.id}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand-dark disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Enregistrer
                  </button>
                </div>
              )}
            </div>
          )}

          {(canYears || canPassage) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4 space-y-3">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-blue-600" />
                Années scolaires
              </h2>
              {canYears && (
                <Link
                  href="/annees"
                  className="block text-sm text-brand hover:underline"
                >
                  Gérer les années (créer, activer, archiver, cloner classes) →
                </Link>
              )}
              {canPassage && (
                <Link
                  href="/annees/passage"
                  className="flex items-center gap-2 text-sm text-brand hover:underline"
                >
                  <GraduationCap className="w-4 h-4" />
                  Passage / réinscription des élèves →
                </Link>
              )}
            </div>
          )}

          {canMerchants && (
            <Link
              href="/finance/merchants"
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <h2 className="font-semibold text-gray-800">Comptes Mobile Money</h2>
              </div>
              <p className="text-sm text-gray-500">
                Configurez les numéros / comptes marchands (Wave, Moov, Orange, MTN)
                qui reçoivent les frais payés en ligne par les parents.
              </p>
            </Link>
          )}
        </main>
      </div>
    </div>
  );
}
