import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ecole-plus-api-production.up.railway.app/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur — ajoute le JWT automatiquement
api.interceptors.request.use((config) => {
  const token = Cookies.get('ecole_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Intercepteur — redirige si token expiré
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('ecole_token');
      Cookies.remove('ecole_user');
      window.location.href = '/login';
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