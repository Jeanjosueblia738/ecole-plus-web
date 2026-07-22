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
  '/eleves': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SURVEILLANT', 'SECRETARY', 'TEACHER', 'EDUCATOR', 'ACCOUNTANT', 'CASHIER'],
  '/classes': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SURVEILLANT', 'SECRETARY', 'TEACHER', 'EDUCATOR'],
  '/notes': ['TEACHER'],
  '/presences': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SURVEILLANT', 'TEACHER', 'EDUCATOR'],
  '/discipline': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SURVEILLANT', 'EDUCATOR'],
  '/campus': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SECRETARY', 'SURVEILLANT', 'EDUCATOR'],
  '/comptabilite': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'ACCOUNTANT'],
  '/finance': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'ACCOUNTANT', 'CASHIER'],
  /** Config / pilotage = comptable uniquement (direction = vue globale) */
  '/finance/frais': ['ACCOUNTANT'],
  '/finance/paiement': ['ACCOUNTANT', 'CASHIER'],
  '/finance/historique': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'ACCOUNTANT', 'CASHIER'],
  '/finance/caisse': ['ACCOUNTANT', 'CASHIER'],
  '/finance/depenses': ['ACCOUNTANT'],
  '/finance/fournisseurs': ['ACCOUNTANT'],
  '/finance/paie': ['ACCOUNTANT'],
  '/finance/budget': ['ACCOUNTANT'],
  '/finance/banque': ['ACCOUNTANT'],
  '/finance/merchants': ['ADMIN', 'FOUNDER'],
  '/bulletins': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR'],
  '/rapports': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SECRETARY', 'SURVEILLANT', 'TEACHER'],
  '/risques': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SURVEILLANT'],
  '/cahier': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'TEACHER'],
  '/devoirs': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'TEACHER', 'SECRETARY'],
  '/conseil': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR'],
  '/examens': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'TEACHER', 'SECRETARY', 'SURVEILLANT'],
  '/inscriptions': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'SECRETARY', 'CENSOR'],
  '/messagerie': ALL_STAFF,
  '/emploi-du-temps': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SURVEILLANT', 'SECRETARY', 'TEACHER', 'EDUCATOR'],
  '/enseignants': ['ADMIN', 'FOUNDER'],
  '/matieres': ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR'],
  '/utilisateurs': ['ADMIN', 'FOUNDER'],
  '/abonnement': ['ADMIN', 'FOUNDER'],
  '/parametres': ALL_STAFF,
  '/parent': ['PARENT'] as Role[],
  '/parent/notes': ['PARENT'] as Role[],
  '/parent/presences': ['PARENT'] as Role[],
  '/parent/finance': ['PARENT'] as Role[],
};

export const can = {
  createClass: ['ADMIN', 'FOUNDER'] as Role[],
  createStudent: ['ADMIN', 'FOUNDER', 'SECRETARY'] as Role[],
  editStudent: ['ADMIN', 'FOUNDER', 'SECRETARY'] as Role[],
  deleteStudent: ['ADMIN', 'FOUNDER'] as Role[],
  manageUsers: ['ADMIN', 'FOUNDER'] as Role[],
  manageTeachers: ['ADMIN', 'FOUNDER'] as Role[],
  /** Catalogue matières (lecture) */
  viewSubjects: ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'TEACHER'] as Role[],
  /** Créer / modifier / désactiver matières */
  manageSubjects: ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR'] as Role[],
  /** Sanctions / discipline (vie scolaire) */
  recordSanction: ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SURVEILLANT', 'EDUCATOR'] as Role[],
  deleteSanction: ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR'] as Role[],
  enterGrades: ['TEACHER'] as Role[],
  doAppel: ['TEACHER', 'SURVEILLANT', 'EDUCATOR'] as Role[],
  generateBulletin: ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR'] as Role[],
  viewCahier: ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'TEACHER', 'SECRETARY'] as Role[],
  writeCahier: ['TEACHER'] as Role[],
  validateCahier: ['CENSOR'] as Role[],
  viewTimetable: ['ADMIN', 'FOUNDER', 'DIRECTOR', 'CENSOR', 'SURVEILLANT', 'SECRETARY', 'TEACHER', 'EDUCATOR'] as Role[],
  writeTimetable: ['CENSOR'] as Role[],
  viewFinance: ['ADMIN', 'FOUNDER', 'DIRECTOR', 'ACCOUNTANT', 'CASHIER'] as Role[],
  /** Encaisser / reçus — caissier + comptable (pas la direction) */
  recordPayment: ['ACCOUNTANT', 'CASHIER'] as Role[],
  /** Définir / modifier les frais scolaires — comptable */
  configureFees: ['ACCOUNTANT'] as Role[],
  /** Tableau de bord financier complet (taux, attendu, analyses) */
  viewFinanceFull: ['ADMIN', 'FOUNDER', 'DIRECTOR', 'ACCOUNTANT'] as Role[],
  /** Dépenses, fournisseurs, paie, budget, banque — comptable */
  manageFinanceOps: ['ACCOUNTANT'] as Role[],
  /** Ouverture / clôture de caisse */
  manageCashSession: ['ACCOUNTANT', 'CASHIER'] as Role[],
  manageSubscription: ['ADMIN', 'FOUNDER'] as Role[],
  /** Comptes marchands MM (frais parents) — Admin / Fondateur uniquement */
  managePaymentMerchants: ['ADMIN', 'FOUNDER'] as Role[],
  /** Écriture journal OHADA — comptable seul */
  writeOhada: ['ACCOUNTANT'] as Role[],
};

export function hasRole(role: string | undefined | null, allowed: readonly Role[]): boolean {
  if (!role) return false;
  const normalized = String(role).trim().toUpperCase() as Role;
  return allowed.includes(normalized);
}

export function canAccessPath(role: string | undefined | null, path: string): boolean {
  const match = Object.entries(NAV_ACCESS)
    .filter(([p]) => path === p || path.startsWith(`${p}/`))
    .sort((a, b) => b[0].length - a[0].length)[0];
  if (!match) return false;
  return hasRole(role, match[1]);
}
