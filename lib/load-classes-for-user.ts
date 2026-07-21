import { classesApi, teachersApi } from '@/lib/api';
import { currentSchoolYear } from '@/lib/school-year';

/**
 * Charge les classes visibles pour l'utilisateur courant.
 * Enseignant : uniquement ses classes (1 → N via /teachers/my-classes).
 * Autres rôles : toutes les classes de l'année scolaire.
 */
export async function loadClassesForUser(role?: string | null): Promise<any[]> {
  const year = currentSchoolYear();
  if (role === 'TEACHER') {
    const { data } = await teachersApi.getMyClasses(year);
    return Array.isArray(data) ? data : [];
  }
  const { data } = await classesApi.getAll(year);
  return Array.isArray(data) ? data : data?.data ?? [];
}
