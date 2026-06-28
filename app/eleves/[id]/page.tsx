'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, User, Phone, Mail, BookOpen,
  ClipboardList, DollarSign, Calendar, GraduationCap,
  Key, Copy, RefreshCw, CheckCircle
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { studentsApi, gradesApi, attendanceApi, financeApi } from '@/lib/api';
import api from '@/lib/api';
import PhotoUpload from '@/components/PhotoUpload';
import { authStorage } from '@/lib/auth';

export default function StudentDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [grades, setGrades] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [finance, setFinance] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'notes' | 'presences' | 'finance' | 'acces'>('notes');
  const [trimestre, setTrimestre] = useState('T1');
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
    loadStudent();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    gradesApi.getByStudent(id as string, trimestre)
      .then(({ data }) => setGrades(data))
      .catch(console.error);
  }, [id, trimestre]);

  const loadStudent = async () => {
    try {
      const [studentRes, attendanceRes, financeRes] = await Promise.allSettled([
        studentsApi.getOne(id as string),
        attendanceApi.getByStudent(id as string),
        financeApi.getStudentFinance(id as string),
      ]);
      if (studentRes.status === 'fulfilled') setStudent(studentRes.value.data);
      if (attendanceRes.status === 'fulfilled') setAttendance(attendanceRes.value.data);
      if (financeRes.status === 'fulfilled') setFinance(financeRes.value.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const copyCode = async (code: string, type: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const regenerateCodes = async () => {
    if (!confirm('Régénérer les codes d\'accès ? Les anciens codes ne fonctionneront plus.')) return;
    setRegenerating(true);
    try {
      const { data } = await api.post(`/auth/students/${id}/regenerate-code`);
      setStudent((s: any) => ({ ...s, accessCode: data.accessCode, parentAccessCode: data.parentAccessCode,
        studentAccountCreated: false, parentAccountCreated: false }));
    } catch (e) { console.error(e); }
    finally { setRegenerating(false); }
  };

  const formatXof = (n: number) => new Intl.NumberFormat('fr-CI').format(n) + ' FCFA';

  const handlePhotoUpload = async (url: string) => {
    try {
      await studentsApi.update(id as string, { photoUrl: url });
      setStudent((s: any) => ({ ...s, photoUrl: url }));
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-gray-400">Élève non trouvé</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header
          title={`${student.firstName} ${student.lastName}`}
          subtitle={`Matricule : ${student.registrationNo}`}
        />
        <main className="flex-1 p-6">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />Retour à la liste
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Carte profil */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col items-center mb-6">
                  <PhotoUpload currentUrl={student.photoUrl}
                    name={`${student.firstName} ${student.lastName}`}
                    folder="eleves" entityId={student.id}
                    onUpload={handlePhotoUpload} size="lg" />
                  <h2 className="font-bold text-gray-800 text-lg text-center mt-3">
                    {student.firstName} {student.lastName}
                  </h2>
                  <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-1">
                    {student.class?.name}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <GraduationCap className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500 text-xs">Niveau</p>
                      <p className="font-medium text-gray-800">{student.class?.level}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500 text-xs">Genre</p>
                      <p className="font-medium text-gray-800">{student.gender === 'MALE' ? 'Garçon' : 'Fille'}</p>
                    </div>
                  </div>
                  {student.dateOfBirth && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500 text-xs">Date de naissance</p>
                        <p className="font-medium text-gray-800">
                          {new Date(student.dateOfBirth).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {student.parentName && (
                  <div className="mt-6 pt-6 border-t border-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Contact parent</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{student.parentName}</span>
                      </div>
                      {student.parentPhone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <a href={`tel:${student.parentPhone}`} className="text-blue-600 hover:underline">
                            {student.parentPhone}
                          </a>
                        </div>
                      )}
                      {student.parentEmail && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <a href={`mailto:${student.parentEmail}`} className="text-blue-600 hover:underline">
                            {student.parentEmail}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-50 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-blue-600">{grades?.grades?.length ?? 0}</p>
                    <p className="text-xs text-gray-500">Notes</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-red-500">{attendance?.stats?.absences ?? 0}</p>
                    <p className="text-xs text-gray-500">Absences</p>
                  </div>
                  <div className={`rounded-lg p-2 ${finance?.resume?.estAJour ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <p className={`text-lg font-bold ${finance?.resume?.estAJour ? 'text-green-600' : 'text-orange-500'}`}>
                      {finance?.resume?.estAJour ? '✓' : '!'}
                    </p>
                    <p className="text-xs text-gray-500">Finance</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenu onglets */}
            <div className="lg:col-span-2">
              <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 mb-4 flex-wrap">
                {[
                  { key: 'notes', label: 'Notes', icon: BookOpen },
                  { key: 'presences', label: 'Présences', icon: ClipboardList },
                  { key: 'finance', label: 'Finance', icon: DollarSign },
                  { key: 'acces', label: 'Codes d\'accès', icon: Key },
                ].map(({ key, label, icon: Icon }) => (
                  <button key={key} onClick={() => setActiveTab(key as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${activeTab === key ? 'bg-[#1B3A6B] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>

              {/* Notes */}
              {activeTab === 'notes' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Bulletin de notes</h3>
                    <div className="flex gap-2">
                      {['T1', 'T2', 'T3'].map((t) => (
                        <button key={t} onClick={() => setTrimestre(t)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors
                            ${trimestre === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  {grades?.moyenneGenerale !== undefined && (
                    <div className={`p-4 rounded-xl mb-4 text-center ${grades.moyenneGenerale >= 10 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className="text-sm text-gray-500 mb-1">Moyenne générale</p>
                      <p className={`text-4xl font-bold ${grades.moyenneGenerale >= 10 ? 'text-green-600' : 'text-red-500'}`}>
                        {grades.moyenneGenerale}/20
                      </p>
                    </div>
                  )}
                  {grades?.grades?.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">Aucune note ce trimestre</p>
                  ) : (
                    <div className="space-y-2">
                      {grades?.grades?.map((g: any) => (
                        <div key={g.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{g.subject}</p>
                            <p className="text-xs text-gray-400">{g.evalType} — Coef. {g.coefficient}</p>
                          </div>
                          <span className={`text-lg font-bold ${g.value >= 10 ? 'text-green-600' : 'text-red-500'}`}>
                            {g.value}/20
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Présences */}
              {activeTab === 'presences' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">Historique des présences</h3>
                  {attendance?.stats && (
                    <div className="grid grid-cols-4 gap-3 mb-6">
                      {[
                        { label: 'Total', value: attendance.stats.total, color: 'text-gray-700', bg: 'bg-gray-50' },
                        { label: 'Absences', value: attendance.stats.absences, color: 'text-red-500', bg: 'bg-red-50' },
                        { label: 'Retards', value: attendance.stats.retards, color: 'text-orange-500', bg: 'bg-orange-50' },
                        { label: 'Justifiées', value: attendance.stats.justified, color: 'text-green-600', bg: 'bg-green-50' },
                      ].map((s) => (
                        <div key={s.label} className={`${s.bg} rounded-lg p-3 text-center`}>
                          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-gray-500">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {attendance?.attendances?.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">Aucune absence enregistrée</p>
                    ) : attendance?.attendances?.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{a.subject}</p>
                          <p className="text-xs text-gray-400">{new Date(a.date).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          a.status === 'ABSENT' ? 'bg-red-50 text-red-600' :
                          a.status === 'LATE' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {a.status === 'ABSENT' ? 'Absent' : a.status === 'LATE' ? 'En retard' : 'Présent'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Finance */}
              {activeTab === 'finance' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">Situation financière</h3>
                  {finance?.resume && (
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-sm font-bold text-gray-700">{formatXof(finance.resume.totalDu)}</p>
                        <p className="text-xs text-gray-500">Total dû</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-sm font-bold text-green-600">{formatXof(finance.resume.totalPaye)}</p>
                        <p className="text-xs text-gray-500">Payé</p>
                      </div>
                      <div className={`rounded-lg p-3 text-center ${finance.resume.solde > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                        <p className={`text-sm font-bold ${finance.resume.solde > 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {formatXof(finance.resume.solde)}
                        </p>
                        <p className="text-xs text-gray-500">Solde</p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    {finance?.fees?.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">Aucun frais assigné</p>
                    ) : finance?.fees?.map((f: any) => (
                      <div key={f.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{f.fee?.label}</p>
                          <p className="text-xs text-gray-400">{formatXof(f.fee?.amountXof)}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          f.isPaid ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                        }`}>
                          {f.isPaid ? '✓ Payé' : `Reste: ${formatXof(f.fee?.amountXof - f.amountPaid)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Codes d'accès */}
              {activeTab === 'acces' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-semibold text-gray-800">Codes d'accès ECOLE+</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Transmettez ces codes à l'élève et au parent pour qu'ils créent leur compte
                      </p>
                    </div>
                    <button onClick={regenerateCodes} disabled={regenerating}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
                      <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                      Régénérer
                    </button>
                  </div>

                  {/* Code Élève */}
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-purple-800 text-sm">Code Élève</p>
                        <p className="text-xs text-purple-600">
                          {student.studentAccountCreated ? '✓ Compte créé' : 'En attente de création'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 text-center text-2xl font-bold tracking-widest text-purple-800 bg-white border border-purple-200 rounded-lg py-3 px-4">
                        {student.accessCode || '—'}
                      </code>
                      <button onClick={() => copyCode(student.accessCode, 'student')}
                        className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors">
                        {copiedCode === 'student' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copiedCode === 'student' ? 'Copié !' : 'Copier'}
                      </button>
                    </div>
                    <p className="text-xs text-purple-500 mt-3">
                      Instructions : Ouvrir ECOLE+ → "Rejoindre avec un code" → Élève → Entrer ce code
                    </p>
                  </div>

                  {/* Code Parent */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-blue-800 text-sm">Code Parent</p>
                        <p className="text-xs text-blue-600">
                          {student.parentAccountCreated ? '✓ Compte créé' : 'En attente de création'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 text-center text-2xl font-bold tracking-widest text-blue-800 bg-white border border-blue-200 rounded-lg py-3 px-4">
                        {student.parentAccessCode || '—'}
                      </code>
                      <button onClick={() => copyCode(student.parentAccessCode, 'parent')}
                        className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                        {copiedCode === 'parent' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copiedCode === 'parent' ? 'Copié !' : 'Copier'}
                      </button>
                    </div>
                    {student.parentEmail && (
                      <p className="text-xs text-blue-500 mt-2">Email parent : {student.parentEmail}</p>
                    )}
                    <p className="text-xs text-blue-500 mt-1">
                      Instructions : Ouvrir ECOLE+ → "Rejoindre avec un code" → Parent → Entrer ce code
                    </p>
                  </div>

                  {/* Info box */}
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-xs text-yellow-700">
                      ⚠️ Chaque code ne peut être utilisé qu'une seule fois. Si un parent ou élève perd son accès,
                      régénérez les codes avec le bouton ci-dessus. L'ancien compte restera actif.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}