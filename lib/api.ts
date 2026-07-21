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
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
  tenant: AuthTenant;
}

// ── Auth ────────────────────────────────────────────────────────────────
export const authApi = {
  login: (tenantCode: string, email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { tenantCode, email, password }),
};

// ── Students ─────────────────────────────────────────────────────────────
export const studentsApi = {
  getAll: (params?: { classId?: string; search?: string }) =>
    api.get('/students', { params }),
  getOne: (id: string) => api.get(`/students/${id}`),
  getStats: () => api.get('/students/stats'),
  create: (data: object) => api.post('/students', data),
  update: (id: string, data: object) => api.put(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
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
};

export const analyticsApi = {
  dropoutRisk: (params?: { classId?: string; minLevel?: string }) =>
    api.get('/analytics/dropout-risk', { params }),
  studentDropoutRisk: (studentId: string) =>
    api.get(`/analytics/dropout-risk/${studentId}`),
};

// ── Teachers ─────────────────────────────────────────────────────────────
export const teachersApi = {
  getAll: () => api.get('/teachers'),
  create: (data: object) => api.post('/teachers', data),
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
  emargement: (id: string) => api.patch(`/cahier/${id}/emargement`),
  delete: (id: string) => api.delete(`/cahier/${id}`),
};
