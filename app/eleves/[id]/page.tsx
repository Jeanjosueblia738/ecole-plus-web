'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, BookOpen, Save, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { studentsApi, classesApi } from '@/lib/api';
import { currentSchoolYear } from '@/lib/school-year';
import { authStorage } from '@/lib/auth';
import { can, canAccessPath, hasRole } from '@/lib/rbac';

export default function EleveDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [ready, setReady] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    const u = authStorage.getUser();
    if (!canAccessPath(u?.role, '/eleves')) { router.push('/dashboard'); return; }
    setCanEdit(hasRole(u?.role, can.editStudent));
    setReady(true);
    loadStudent();
    classesApi.getAll(currentSchoolYear()).then(({ data }) => setClasses(data));
  }, [id, router]);

  const loadStudent = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const { data } = await studentsApi.getOne(id);
      setStudent(data);
      setForm({
        firstName: data.firstName, lastName: data.lastName,
        registrationNo: data.registrationNo, gender: data.gender,
        classId: data.classId ?? '', parentName: data.parentName ?? '',
        parentPhone: data.parentPhone ?? '', parentEmail: data.parentEmail ?? '',
        address: data.address ?? '',
        niveauPrecedent: data.niveauPrecedent ?? '',
        statut: data.statut ?? (data.classId ? 'AFFECTE' : 'NON_AFFECTE'),
      });
    } catch (e) {
      console.error(e);
      setStudent(null);
      setNotFound(true);
      alert('Impossible de charger le dossier élève.');
    }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await studentsApi.update(id, form);
      setStudent((s: any) => ({ ...s, ...form }));
      setEditing(false);
    } catch (e) {
      console.error(e);
      alert('Enregistrement impossible. Réessayez.');
    }
    finally { setSaving(false); }
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  if (!ready || loading) { return null; }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Dossier élève" subtitle={student ? `${student.firstName} ${student.lastName}` : ''} />
        <main className="flex-1 p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => router.push('/eleves')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>
              {canEdit && !editing && student && (
                <button onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800">
                  Modifier
                </button>
              )}
            </div>

            {notFound && (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
                <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium text-gray-700">Élève introuvable</p>
                <p className="text-sm text-gray-400 mt-1">Ce dossier n&apos;existe pas ou a été supprimé.</p>
                <button onClick={() => router.push('/eleves')}
                  className="mt-4 px-4 py-2 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800">
                  Retour à la liste
                </button>
              </div>
            )}

            {student && (
              <div className="space-y-6">
                {/* Carte identité */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xl">
                      {student.firstName[0]}{student.lastName[0]}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{student.firstName} {student.lastName}</h2>
                      <p className="text-sm text-gray-500 font-mono">Matricule : {student.registrationNo}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                          {student.class?.name ?? 'Sans classe'} — {student.class?.level ?? '—'}
                        </span>
                        <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
                          student.statut === 'NON_AFFECTE'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-green-50 text-green-700'
                        }`}>
                          {student.statut === 'NON_AFFECTE' ? 'Non affecté' : 'Affecté'}
                        </span>
                        {student.niveauPrecedent && (
                          <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
                            Précédent : {student.niveauPrecedent}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {(student.accessCode || student.parentAccessCode) && (
                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl px-4 py-3">
                        <p className="text-xs text-gray-500">Code élève (mobile)</p>
                        <p className="font-mono font-bold text-gray-800 tracking-wider">{student.accessCode || '—'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl px-4 py-3">
                        <p className="text-xs text-gray-500">Code parent (mobile)</p>
                        <p className="font-mono font-bold text-gray-800 tracking-wider">{student.parentAccessCode || '—'}</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl px-4 py-3 sm:col-span-2">
                        <p className="text-xs text-blue-800">
                          Connexion élève : matricule <span className="font-mono font-semibold">{student.registrationNo}</span> + mot de passe.
                          Parent : email de la fiche — un même email peut suivre plusieurs enfants.
                        </p>
                      </div>
                    </div>
                  )}

                  {editing ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Prénom *', key: 'firstName' },
                        { label: 'Nom *', key: 'lastName' },
                        { label: 'Matricule *', key: 'registrationNo' },
                        { label: 'Adresse', key: 'address' },
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                          <input value={form[key]} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                        <select value={form.gender} onChange={e => setForm((f: any) => ({ ...f, gender: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                          <option value="MALE">Garçon</option>
                          <option value="FEMALE">Fille</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
                        <select value={form.classId} onChange={e => setForm((f: any) => ({ ...f, classId: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]">
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{student.gender === 'MALE' ? 'Garçon' : 'Fille'}</span>
                      </div>
                      {student.dateOfBirth && (
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{fmtDate(student.dateOfBirth)}</span>
                        </div>
                      )}
                      {student.address && (
                        <div className="flex items-center gap-3 text-sm col-span-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{student.address}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Infos parent */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-800 mb-4">Parent / Tuteur</h3>
                  {editing ? (
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Nom du parent', key: 'parentName' },
                        { label: 'Téléphone', key: 'parentPhone' },
                        { label: 'Email', key: 'parentEmail' },
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                          <input value={form[key]} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {student.parentName && (
                        <div className="flex items-center gap-3 text-sm">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{student.parentName}</span>
                        </div>
                      )}
                      {student.parentPhone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{student.parentPhone}</span>
                        </div>
                      )}
                      {student.parentEmail && (
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{student.parentEmail}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Boutons save/cancel */}
                {editing && (
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setEditing(false)}
                      className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                      Annuler
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[#1B3A6B] text-white rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
                      {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</> : <><Save className="w-4 h-4" /> Enregistrer</>}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}