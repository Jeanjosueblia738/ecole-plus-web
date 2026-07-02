'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, User, Phone, Trash2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { studentsApi, classesApi } from '@/lib/api';
import { authStorage } from '@/lib/auth';

const useIsClient = () => { const [isClient, setIsClient] = useState(false); useEffect(() => setIsClient(true), []); return isClient; };

interface Student {
  id: string;
  registrationNo: string;
  firstName: string;
  lastName: string;
  gender: string;
  parentName: string;
  parentPhone: string;
  class: { name: string; level: string };
}

export default function ElevesPage() {
  const isClient = useIsClient();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // ── Contrôle d'accès ─────────────────────────────────────────
 const [canCreate, setCanCreate] = useState(false);
const [canEdit, setCanEdit] = useState(false);
const [canDelete, setCanDelete] = useState(false);

useEffect(() => {
  if (!authStorage.isLoggedIn()) { router.push('/login'); return; }
  const u = authStorage.getUser();
  const r = u?.role ?? '';
  setCanCreate(['ADMIN', 'SECRETARY'].includes(r));
  setCanEdit(['ADMIN', 'SECRETARY'].includes(r));
  setCanDelete(['ADMIN'].includes(r));
  loadStudents();
}, []);

  const loadStudents = async (q?: string) => {
    try {
      const { data } = await studentsApi.getAll({ search: q });
      setStudents(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    loadStudents(e.target.value);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!canDelete) { return; }
    if (!confirm(`Supprimer l'élève ${name} ? Cette action est irréversible.`)) { return; }
    setDeleting(id);
    try {
      await studentsApi.delete(id);
      setStudents(s => s.filter(x => x.id !== id));
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  if (!isClient) { return null; }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header title="Gestion des élèves" subtitle={`${students.length} élève(s) inscrit(s)`} />
        <main className="flex-1 p-6">

          {/* Barre d'outils */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Rechercher par nom ou matricule..."
                value={search} onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
            {canCreate && (
              <a href="/eleves/nouveau"
                className="flex items-center gap-2 bg-[#1B3A6B] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors">
                <Plus className="w-4 h-4" /> Ajouter un élève
              </a>
            )}
          </div>

          {/* Tableau */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Élève</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Matricule</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Classe</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Parent</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>Aucun élève trouvé</p>
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                            {s.firstName[0]}{s.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{s.firstName} {s.lastName}</p>
                            <p className="text-xs text-gray-400">{s.gender === 'MALE' ? 'Garçon' : 'Fille'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{s.registrationNo}</td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                          {s.class?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700">{s.parentName ?? '—'}</p>
                        {s.parentPhone && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />{s.parentPhone}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Voir — tous les rôles */}
                          <a href={`/eleves/${s.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            Voir
                          </a>
                          {/* Modifier — Admin + Secrétaire */}
                          {canEdit && (
                            <a href={`/eleves/${s.id}/edit`}
                              className="text-gray-500 hover:text-gray-700 text-sm font-medium">
                              Modifier
                            </a>
                          )}
                          {/* Supprimer — Admin seulement */}
                          {canDelete && (
                            <button onClick={() => handleDelete(s.id, `${s.firstName} ${s.lastName}`)}
                              disabled={deleting === s.id}
                              className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
