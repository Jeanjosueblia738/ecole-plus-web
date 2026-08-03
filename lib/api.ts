import axios from 'axios';

/** Appels API via proxy Next.js — JWT httpOnly injecté côté serveur */
const api = axios.create({
  baseURL: '/api/proxy',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;
      const { default: Cookies } = await import('js-cookie');
      if (path.startsWith('/super-admin')) {
        await fetch('/api/auth/session?kind=sa', { method: 'DELETE' });
        Cookies.remove('sa_user', { path: '/' });
        if (!path.startsWith('/super-admin/login')) {
          const next = encodeURIComponent(path);
          window.location.href = `/super-admin/login?next=${next}`;
        }
      } else {
        await fetch('/api/auth/session?kind=ecole', { method: 'DELETE' });
        Cookies.remove('ecole_user', { path: '/' });
        Cookies.remove('ecole_tenant', { path: '/' });
        if (!path.startsWith('/login')) {
          const next = encodeURIComponent(path + window.location.search);
          window.location.href = `/login?next=${next}`;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Types ───────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface AuthTenant {
  id: string;
  code: string;
  name: string;
  city: string;
  plan: string;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  docHeaderLine?: string | null;
  docFooterLine?: string | null;
  motto?: string | null;
  directorName?: string | null;
  schoolStatus?: string | null;
  drena?: string | null;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
  tenant: AuthTenant;
  subscriptionRequired?: boolean;
  billingReason?: string | null;
}

// ── Auth ────────────────────────────────────────────────────────────────
export const authApi = {
  login: (tenantCode: string, email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { tenantCode, email, password }),
};

export const tenantsApi = {
  getMe: () => api.get<AuthTenant>('/tenants/me'),
  updateMe: (data: Partial<AuthTenant>) =>
    api.patch<AuthTenant>('/tenants/me', data),
};

// ── Students ─────────────────────────────────────────────────────────────
export const studentsApi = {
  getAll: (params?: { classId?: string; search?: string }) =>
    api.get('/students', { params }),
  getOne: (id: string) => api.get(`/students/${id}`),
  getEnrollments: (id: string) => api.get(`/students/${id}/enrollments`),
  getStats: () => api.get('/students/stats'),
  create: (data: object) => api.post('/students', data),
  update: (id: string, data: object) => api.put(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
};

// ── Années scolaires ─────────────────────────────────────────────────────
export const academicYearsApi = {
  getAll: () => api.get('/academic-years'),
  getCurrent: () => api.get('/academic-years/current'),
  create: (data: { label: string; startDate?: string; endDate?: string }) =>
    api.post('/academic-years', data),
  activate: (id: string) => api.patch(`/academic-years/${id}/activate`),
  archive: (id: string) => api.patch(`/academic-years/${id}/archive`),
  cloneClasses: (id: string, sourceYearId: string) =>
    api.post(`/academic-years/${id}/clone-classes`, { sourceYearId }),
  getEnrollments: (id: string) => api.get(`/academic-years/${id}/enrollments`),
  passage: (data: {
    fromYearId: string;
    toYearId: string;
    items: { studentId: string; targetClassId: string; decision: string }[];
  }) => api.post('/academic-years/passage', data),
};

// ── Espace parent ────────────────────────────────────────────────────────
export const parentApi = {
  myChildren: () => api.get('/students/my-children'),
  myChild: () => api.get('/students/my-child'),
};

export const paymentsApi = {
  enabledMerchants: () => api.get('/finance/merchants/enabled'),
  initiateFee: (data: {
    provider: string;
    studentId: string;
    feeId: string;
    amountXof: number;
    payerPhone: string;
  }) => api.post('/payments/fees/initiate', data),
  getTransaction: (id: string) => api.get(`/payments/transactions/${id}`),
};

// ── Classes ──────────────────────────────────────────────────────────────
export const classesApi = {
  getAll: (year?: string) => api.get('/classes', { params: { year } }),
  getOne: (id: string) => api.get(`/classes/${id}`),
  create: (data: object) => api.post('/classes', data),
  update: (id: string, data: object) => api.put(`/classes/${id}`, data),
};

// ── Grades ───────────────────────────────────────────────────────────────
export const gradesApi = {
  getByStudent: (studentId: string, trimestre?: string) =>
    api.get(`/grades/student/${studentId}`, { params: { trimestre } }),
  getByClass: (classId: string, trimestre: string) =>
    api.get(`/grades/class/${classId}`, { params: { trimestre } }),
  bulkCreate: (data: object) => api.post('/grades/bulk', data),
};

// ── Attendance ───────────────────────────────────────────────────────────
export const attendanceApi = {
  bulkCreate: (data: object) => api.post('/attendance/bulk', data),
  notifyAbsents: (data: object) => api.post('/attendance/notify-absents', data),
  getByStudent: (studentId: string) => api.get(`/attendance/student/${studentId}`),
  getByClass: (classId: string, date: string) =>
    api.get(`/attendance/class/${classId}`, { params: { date } }),
  getStats: () => api.get('/attendance/stats'),
};

// ── Finance ──────────────────────────────────────────────────────────────
export const financeApi = {
  getStats: (year?: string) => api.get('/finance/stats', { params: { year } }),
  getFees: (year?: string) => api.get('/finance/fees', { params: { year } }),
  getStudentFinance: (studentId: string) => api.get(`/finance/student/${studentId}`),
  recordPayment: (data: object) => api.post('/finance/payments', data),
  createFee: (data: object) => api.post('/finance/fees', data),
  assignFee: (data: { feeId: string; classId: string }) => api.post('/finance/fees/assign', data),
  listAlerts: (limit?: number) => api.get('/finance/alerts', { params: { limit } }),
  previewAlerts: () => api.get('/finance/alerts/preview'),
  processAlerts: () => api.post('/finance/alerts/process'),
  listPayments: (year?: string) => api.get('/finance/payments', { params: { year } }),
  /** Reçu PDF généré côté API (branding école). */
  downloadReceiptPdf: (receiptNo: string) =>
    api.get(`/finance/receipts/${encodeURIComponent(receiptNo)}/pdf`, {
      responseType: 'blob',
    }),

  // Caisse
  cashCurrent: () => api.get('/finance/cash/current'),
  cashSessions: (limit?: number) => api.get('/finance/cash/sessions', { params: { limit } }),
  cashOpen: (data: { openingFloatXof?: number; notes?: string }) =>
    api.post('/finance/cash/open', data),
  cashClose: (data: object) => api.post('/finance/cash/close', data),
  cashJustify: (id: string, varianceNote: string) =>
    api.patch(`/finance/cash/sessions/${id}/justify`, { varianceNote }),

  // Ops comptable
  opsSummary: (year?: string) => api.get('/finance/ops/summary', { params: { year } }),
  listSuppliers: (all?: boolean) =>
    api.get('/finance/suppliers', { params: all ? { all: '1' } : {} }),
  createSupplier: (data: object) => api.post('/finance/suppliers', data),
  updateSupplier: (id: string, data: object) => api.put(`/finance/suppliers/${id}`, data),
  listExpenses: (params?: { year?: string; category?: string }) =>
    api.get('/finance/expenses', { params }),
  createExpense: (data: object) => api.post('/finance/expenses', data),
  listPayroll: (year?: string) => api.get('/finance/payroll', { params: { year } }),
  createPayroll: (data: object) => api.post('/finance/payroll', data),
  payrollStatus: (id: string, status: string) =>
    api.patch(`/finance/payroll/${id}/status`, { status }),
  generatePayrollFromHours: (data: {
    year: number;
    month: number;
    schoolYear: string;
    label?: string;
    notes?: string;
  }) => api.post('/payroll/generate', data),
  payPayrollWave: (id: string) => api.post(`/payroll/runs/${id}/pay-wave`),
  hoursSummary: (year: number, month: number, teacherId?: string) =>
    api.get('/payroll/hours-summary', { params: { year, month, teacherId } }),
  listOccurrences: (year: number, month: number, teacherId?: string) =>
    api.get('/payroll/occurrences', { params: { year, month, teacherId } }),
  generateOccurrences: (data: { year: number; month: number; schoolYear: string }) =>
    api.post('/payroll/occurrences/generate', data),
  updateTeacherPayProfile: (
    teacherId: string,
    data: {
      payMode?: 'HOURLY' | 'FIXED';
      hourlyRateXof?: number;
      monthlyBaseXof?: number | null;
      wavePhone?: string | null;
    },
  ) => api.patch(`/payroll/teachers/${teacherId}/profile`, data),
  clockIn: (id: string) => api.post(`/payroll/occurrences/${id}/clock-in`),
  clockOut: (id: string) => api.post(`/payroll/occurrences/${id}/clock-out`),
  listClassQr: (year?: string) =>
    api.get('/payroll/class-qr', { params: { year } }),
  getClassQr: (classId: string, roomLabel?: string) =>
    api.get(`/payroll/class-qr/${classId}`, {
      params: roomLabel != null ? { roomLabel } : undefined,
    }),
  updateClassQr: (
    classId: string,
    data: { roomLabel?: string | null; regenerate?: boolean },
  ) => api.patch(`/payroll/class-qr/${classId}`, data),
  qrScan: (data: { payload: string; clientTime: string }) =>
    api.post('/payroll/qr-scan', data),
  todayAlerts: () => api.get('/payroll/alerts/today'),
  assignSubstitute: (id: string, substituteTeacherId: string | null) =>
    api.patch(`/payroll/occurrences/${id}/substitute`, { substituteTeacherId }),
  reportUncovered: (id: string, note?: string) =>
    api.post(`/payroll/occurrences/${id}/report-uncovered`, { note }),
  excuseOccurrence: (id: string, notes?: string) =>
    api.patch(`/payroll/occurrences/${id}/excuse`, { notes }),
  listBudgets: (year?: string) => api.get('/finance/budgets', { params: { year } }),
  createBudget: (data: object) => api.post('/finance/budgets', data),
  budgetVsActual: (id: string) => api.get(`/finance/budgets/${id}/vs-actual`),
  listBankAccounts: () => api.get('/finance/bank/accounts'),
  createBankAccount: (data: object) => api.post('/finance/bank/accounts', data),
  listBankTransactions: (accountId: string, reconciled?: boolean) =>
    api.get(`/finance/bank/accounts/${accountId}/transactions`, {
      params: reconciled === undefined ? {} : { reconciled: reconciled ? '1' : '0' },
    }),
  createBankTransaction: (data: object) => api.post('/finance/bank/transactions', data),
  reconcileBank: (data: object) => api.post('/finance/bank/reconcile', data),
  listReconciliations: (accountId?: string) =>
    api.get('/finance/bank/reconciliations', { params: { accountId } }),
  markBankReconciled: (ids: string[]) =>
    api.post('/finance/bank/transactions/mark-reconciled', { ids }),
};

export const analyticsApi = {
  dropoutRisk: (params?: { classId?: string; minLevel?: string }) =>
    api.get('/analytics/dropout-risk', { params }),
  studentDropoutRisk: (studentId: string) =>
    api.get(`/analytics/dropout-risk/${studentId}`),
  studentProgress: (studentId: string) =>
    api.get(`/analytics/student/${studentId}/progress`),
};

// ── Teachers ─────────────────────────────────────────────────────────────
export const teachersApi = {
  getAll: (params?: { includeInactive?: boolean }) =>
    api.get('/teachers', {
      params: params?.includeInactive ? { includeInactive: true } : undefined,
    }),
  create: (data: object) => api.post('/teachers', data),
  activate: (id: string) => api.patch(`/teachers/${id}/activate`),
  deactivate: (id: string) => api.patch(`/teachers/${id}/deactivate`),
  resetPassword: (id: string, newPassword: string) =>
    api.patch(`/teachers/${id}/reset-password`, { newPassword }),
  /** Classes de l'enseignant connecté (1 → N) */
  getMyClasses: (year?: string) =>
    api.get('/teachers/my-classes', { params: { year } }),
  getMyStats: (year?: string) =>
    api.get('/teachers/my-stats', { params: { year } }),
  /** Affectations officielles d'un enseignant */
  getClasses: (id: string, year?: string) =>
    api.get(`/teachers/${id}/classes`, { params: { year } }),
  setClasses: (id: string, data: { classIds: string[]; year?: string }) =>
    api.put(`/teachers/${id}/classes`, data),
  getAssignments: (id: string, year?: string) =>
    api.get(`/teachers/${id}/assignments`, { params: { year } }),
  setAssignments: (
    id: string,
    data: { items: { classId: string; subject: string }[]; year?: string },
  ) => api.put(`/teachers/${id}/assignments`, data),
};

// ── Matières (catalogue école) ───────────────────────────────────────────
export const subjectsApi = {
  getAll: (includeInactive?: boolean) =>
    api.get('/subjects', {
      params: includeInactive ? { includeInactive: true } : undefined,
    }),
  create: (data: { name: string; coefficient: number }) =>
    api.post('/subjects', data),
  update: (
    id: string,
    data: { name?: string; coefficient?: number; isActive?: boolean },
  ) => api.put(`/subjects/${id}`, data),
  remove: (id: string) => api.delete(`/subjects/${id}`),
};

// ── Cahier de texte ───────────────────────────────────────────────────────
export const cahierApi = {
  create: (data: object) => api.post('/cahier', data),
  getByClass: (classId: string, trimestre?: string) =>
    api.get(`/cahier/classe/${classId}`, { params: { trimestre } }),
  getByTeacher: (teacherId: string, trimestre?: string) =>
    api.get(`/cahier/enseignant/${teacherId}`, { params: { trimestre } }),
  getStats: () => api.get('/cahier/stats'),
  getOne: (id: string) => api.get(`/cahier/${id}`),
  update: (id: string, data: object) => api.put(`/cahier/${id}`, data),
  emargement: (id: string, actualMinutes?: number) =>
    api.patch(`/cahier/${id}/emargement`, actualMinutes != null ? { actualMinutes } : {}),
  delete: (id: string) => api.delete(`/cahier/${id}`),
  getHomework: (classId?: string) =>
    api.get('/cahier/homework', { params: classId ? { classId } : {} }),
};

// ── Conseil de classe ────────────────────────────────────────────────────
export const conseilApi = {
  list: (params: { classId: string; trimestre: string; year: string }) =>
    api.get('/conseil', { params }),
  upsert: (data: {
    studentId: string;
    classId: string;
    trimestre: string;
    year: string;
    mention?: string;
    decision?: string;
    appreciation?: string;
  }) => api.put('/conseil', data),
};

// ── Examens ────────────────────────────────────────────────────────────────
export const examensApi = {
  list: (params?: { classId?: string; year?: string; from?: string; to?: string }) =>
    api.get('/examens', { params }),
  create: (data: object) => api.post('/examens', data),
  update: (id: string, data: object) => api.put(`/examens/${id}`, data),
  delete: (id: string) => api.delete(`/examens/${id}`),
};

// ── Discipline / sanctions ─────────────────────────────────────────────────
export const disciplineApi = {
  list: (params?: {
    classId?: string;
    studentId?: string;
    year?: string;
    type?: string;
  }) => api.get('/discipline', { params }),
  stats: (year?: string) =>
    api.get('/discipline/stats', { params: year ? { year } : undefined }),
  create: (data: object) => api.post('/discipline', data),
  update: (id: string, data: object) => api.put(`/discipline/${id}`, data),
  delete: (id: string) => api.delete(`/discipline/${id}`),
  byStudent: (studentId: string) => api.get(`/discipline/student/${studentId}`),
};

// ── Autorisations d'absence ────────────────────────────────────────────────
export const absenceAuthApi = {
  list: (params?: { status?: string; kind?: string }) =>
    api.get('/absence-auth', { params }),
  createStudent: (data: {
    studentId?: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => api.post('/absence-auth/student', data),
  createStaff: (data: {
    startDate: string;
    endDate: string;
    reason: string;
    category?: 'SHORT' | 'LEAVE';
  }) => api.post('/absence-auth/staff', data),
  approve: (id: string, decisionNote?: string) =>
    api.patch(`/absence-auth/${id}/approve`, { decisionNote }),
  reject: (id: string, decisionNote?: string) =>
    api.patch(`/absence-auth/${id}/reject`, { decisionNote }),
  cancel: (id: string) => api.patch(`/absence-auth/${id}/cancel`),
};

export const staffPresenceApi = {
  campusQr: () => api.get('/staff-presence/campus-qr'),
  regenerateCampusQr: () => api.patch('/staff-presence/campus-qr/regenerate'),
  qrScan: (data: { payload: string; clientTime: string }) =>
    api.post('/staff-presence/qr-scan', data),
  today: (date?: string) =>
    api.get('/staff-presence/today', { params: { date } }),
  list: (params?: { from?: string; to?: string }) =>
    api.get('/staff-presence', { params }),
};

// ── Crédits SMS ────────────────────────────────────────────────────────────
export const smsApi = {
  packs: () => api.get('/sms/packs'),
  balance: () => api.get('/sms/balance'),
  analytics: () => api.get('/sms/analytics'),
  purchases: () => api.get('/sms/purchases'),
  purchase: (data: { packId: string; payerPhone: string }) =>
    api.post('/sms/purchase', data),
};

// ── Sync offline ───────────────────────────────────────────────────────────
export const syncApi = {
  pushOutbox: (ops: { clientOpId: string; type: string; payload?: object }[]) =>
    api.post('/sync/outbox', { ops }),
};

// ── Campus ─────────────────────────────────────────────────────────────────
export const campusApi = {
  overview: () => api.get('/campus/overview'),
  listBooks: () => api.get('/campus/library'),
  createBook: (data: object) => api.post('/campus/library', data),
  listLoans: (all?: boolean) =>
    api.get('/campus/library/loans', { params: all ? { all: true } : undefined }),
  loan: (data: object) => api.post('/campus/library/loans', data),
  returnLoan: (id: string) => api.patch(`/campus/library/loans/${id}/return`),
  listRoutes: () => api.get('/campus/transport'),
  createRoute: (data: object) => api.post('/campus/transport', data),
  assignTransport: (data: object) => api.post('/campus/transport/assign', data),
  listPlans: () => api.get('/campus/canteen'),
  createPlan: (data: object) => api.post('/campus/canteen', data),
  subscribeCanteen: (data: object) => api.post('/campus/canteen/subscribe', data),
};

// ── Comptabilité OHADA ─────────────────────────────────────────────────────
export const accountingApi = {
  accounts: () => api.get('/accounting/accounts'),
  entries: (limit?: number) =>
    api.get('/accounting/entries', { params: limit ? { limit } : undefined }),
  createEntry: (data: object) => api.post('/accounting/entries', data),
  trialBalance: () => api.get('/accounting/trial-balance'),
};

// ── Pré-inscriptions ───────────────────────────────────────────────────────
export const enrollmentsApi = {
  submitPublic: (data: object) => api.post('/enrollments', data),
  list: (status?: string) => api.get('/enrollments', { params: status ? { status } : {} }),
  review: (id: string, data: object) => api.patch(`/enrollments/${id}`, data),
};

// ── Super Admin — groupes scolaires ────────────────────────────────────────
export const schoolGroupsApi = {
  list: () => api.get('/school-groups'),
  getOne: (id: string) => api.get(`/school-groups/${id}`),
  create: (data: { name: string; code: string; city?: string }) =>
    api.post('/school-groups', data),
  attachTenants: (id: string, tenantIds: string[]) =>
    api.patch(`/school-groups/${id}/tenants`, { tenantIds }),
  detachTenant: (tenantId: string) =>
    api.delete(`/tenants/${tenantId}/group`),
};
