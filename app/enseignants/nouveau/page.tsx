'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Plus, X, BookOpen } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { teachersApi } from '@/lib/api';
import PhotoUpload from '@/components/PhotoUpload';
import { authStorage } from '@/lib/auth';
import { can, hasRole } from '@/lib/rbac';
import { SCHOOL_SUBJECTS, normalizeSubjects } from '@/lib/subjects';

export default function NouvelEnseignantPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [tempId] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    subjects: [] as string[],
    photoUrl: '',
  });

  useEffect(() => {
    if (!authStorage.isLoggedIn()) {
      router.push('/login');
      return;
    }
    if (!hasRole(authStorage.getUser()?.role, can.manageTeachers)) {
      router.push('/dashboard');
    }
  }, [router]);

  const set = (key: string, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  const toggleSubject = (name: string) => {
    const current = form.subjects;
    const has = current.some(
      (s) => s.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'),
    );
    set(
      'subjects',
      has
        ? current.filter(
            (s) => s.toLocaleLowerCase('fr') !== name.toLocaleLowerCase('fr'),
          )
        : normalizeSubjects([...current, name]),
    );
  };

  const addCustomSubject = () => {
    const v = customSubject.trim();
    if (!v) return;
    set('subjects', normalizeSubjects([...form.subjects, v]));
    setCustomSubject('');
  };

  const removeSubject = (name: string) => {
    set(
      'subjects',
      form.subjects.filter(
        (s) => s.toLocaleLowerCase('fr') !== name.toLocaleLowerCase('fr'),
      ),
    );
  };

  const isSelected = (name: string) =>
    form.subjects.some(
      (s) => s.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'),
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const subjects = normalizeSubjects(form.subjects);
    if (subjects.length === 0) {
      setError('Sélectionnez au moins une matière (ex. Français + EDHC).');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await teachersApi.create({ ...form, subjects });
      router.push('/enseignants');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(', ')
          : msg || 'Erreur lors de la création',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title="Ajouter un enseignant"
          subtitle="Un enseignant peut enseigner plusieurs matières (ex. Français et EDHC)"
        />
        <main className="flex-1 p-6 max-w-2xl">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center mb-6">
            <PhotoUpload
              name={
                form.firstName && form.lastName
                  ? `${form.firstName} ${form.lastName}`
                  : 'Enseignant'
              }
              folder="enseignants"
              entityId={tempId}
              onUpload={(url) => set('photoUrl', url)}
              size="lg"
            />
            {form.photoUrl && (
              <p className="text-xs text-green-600 mt-3 text-center">
                Photo prête à être enregistrée avec le compte.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-800 mb-4">
                Informations personnelles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    key: 'firstName',
                    label: 'Prénom *',
                    required: true,
                    placeholder: '',
                  },
                  {
                    key: 'lastName',
                    label: 'Nom *',
                    required: true,
                    placeholder: '',
                  },
                  {
                    key: 'email',
                    label: 'Email *',
                    required: true,
                    placeholder: 'enseignant@ecole.ci',
                    type: 'email',
                  },
                  {
                    key: 'phone',
                    label: 'Téléphone',
                    required: false,
                    placeholder: '+225 07 00 00 00',
                  },
                  {
                    key: 'password',
                    label: 'Mot de passe *',
                    required: true,
                    placeholder: 'Min 8 caractères',
                    type: 'password',
                  },
                ].map(({ key, label, required, placeholder, type }) => (
                  <div
                    key={key}
                    className={key === 'password' ? 'md:col-span-2' : ''}
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label}
                    </label>
                    <input
                      type={type || 'text'}
                      required={required}
                      placeholder={placeholder}
                      value={(form as any)[key]}
                      onChange={(e) => set(key, e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start gap-3 mb-4">
                <BookOpen className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h2 className="font-semibold text-gray-800">
                    Matières enseignées * (1 ou plusieurs)
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Cochez toutes les matières tenues par cet enseignant — ex.{' '}
                    <strong>Français</strong> + <strong>EDHC</strong>, ou{' '}
                    <strong>Philosophie</strong> + <strong>EDHC</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {SCHOOL_SUBJECTS.map((name) => {
                  const active = isSelected(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleSubject(name)}
                      className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                        active
                          ? 'border-purple-500 bg-purple-50 text-purple-800 font-medium'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-purple-200'
                      }`}
                    >
                      <span className="mr-1.5">{active ? '✓' : '○'}</span>
                      {name}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    (e.preventDefault(), addCustomSubject())
                  }
                  placeholder="Autre matière (ex. Latin…)"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addCustomSubject}
                  className="flex items-center gap-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[2rem]">
                {form.subjects.map((s) => (
                  <span
                    key={s}
                    className="flex items-center gap-1 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm border border-purple-100"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSubject(s)}
                      aria-label={`Retirer ${s}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {form.subjects.length === 0 && (
                  <p className="text-sm text-gray-400">
                    Aucune matière sélectionnée
                  </p>
                )}
              </div>
              {form.subjects.length > 0 && (
                <p className="text-xs text-gray-500 mt-3">
                  {form.subjects.length} matière
                  {form.subjects.length > 1 ? 's' : ''} sélectionnée
                  {form.subjects.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
