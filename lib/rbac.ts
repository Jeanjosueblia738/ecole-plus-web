/** Matrice d'accès ECOLE+ — source de vérité UI (Sidebar + gardes pages). */

export type Role =
  | 'ADMIN'
  | 'FOUNDER'
  | 'DIRECTOR'
  | 'CENSOR'
  | 'SURVEILLANT'
  | 'SECRETARY'
  | 'ACCOUNTANT'
  | 'CASHIER'
  | 'TEACHER'
  | 'EDUCATOR'
  | 'PARENT'
  | 'STUDENT'
  | 'SUPER_ADMIN';

const ALL_STAFF: Role[] = [
  'ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SURVEILLANT',
  'SECRETARY', 'ACCOUNTANT', 'CASHIER', 'TEACHER', 'EDUCATOR',
];

/** Qui voit chaque entrée de navigation */
export const NAV_ACCESS: Record<string, Role[]> = {
  '/dashboard': ALL_STAFF,
  '/eleves': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SURVEILLANT', 'SECRETARY', 'TEACHER', 'EDUCATOR'],
  '/classes': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SURVEILLANT', 'SECRETARY', 'TEACHER', 'EDUCATOR'],
  '/notes': ['TEACHER'],
  '/presences': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SURVEILLANT', 'TEACHER', 'EDUCATOR'],
  '/finance': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'ACCOUNTANT', 'CASHIER'],
  '/bulletins': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR'],
  '/rapports': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SECRETARY', 'SURVEILLANT', 'TEACHER'],
  '/cahier': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'TEACHER'],
  '/messagerie': ALL_STAFF,
  '/emploi-du-temps': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SURVEILLANT', 'SECRETARY', 'TEACHER', 'EDUCATOR'],
  '/enseignants': ['ADMIN', 'FOUNDER'],
  '/utilisateurs': ['ADMIN', 'FOUNDER'],
  '/abonnement': ['ADMIN', 'FOUNDER'],
  '/parametres': ALL_STAFF,
};

export const can = {
  createClass: ['ADMIN', 'FOUNDER'] as Role[],
  createStudent: ['ADMIN', 'FOUNDER', 'SECRETARY'] as Role[],
  editStudent: ['ADMIN', 'FOUNDER', 'SECRETARY'] as Role[],
  deleteStudent: ['ADMIN', 'FOUNDER'] as Role[],
  manageUsers: ['ADMIN', 'FOUNDER'] as Role[],
  manageTeachers: ['ADMIN', 'FOUNDER'] as Role[],
  enterGrades: ['TEACHER'] as Role[],
  doAppel: ['TEACHER'] as Role[],
  generateBulletin: ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR'] as Role[],
  viewCahier: ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'TEACHER'] as Role[],
  writeCahier: ['TEACHER'] as Role[],
  validateCahier: ['CENSOR'] as Role[],
  viewTimetable: ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SURVEILLANT', 'SECRETARY', 'TEACHER', 'EDUCATOR'] as Role[],
  writeTimetable: ['CENSOR'] as Role[],
  viewFinance: ['ADMIN', 'FOUNDER', 'DIRECTOR', 'ACCOUNTANT', 'CASHIER'] as Role[],
  manageSubscription: ['ADMIN', 'FOUNDER'] as Role[],
};

export function hasRole(role: string | undefined | null, allowed: readonly Role[]): boolean {
  return !!role && allowed.includes(role as Role);
}

export function canAccessPath(role: string | undefined | null, path: string): boolean {
  const match = Object.entries(NAV_ACCESS)
    .filter(([p]) => path === p || path.startsWith(`${p}/`))
    .sort((a, b) => b[0].length - a[0].length)[0];
  if (!match) return true;
  return hasRole(role, match[1]);
}
