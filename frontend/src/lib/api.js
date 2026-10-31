import axios from 'axios';
import toast from 'react-hot-toast';

// Base URL from env — Vite exposes VITE_* variables
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const AI_BASE = import.meta.env.VITE_AI_URL || 'http://localhost:8000';

// ─── Express API client ───────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send cookies
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — add Bearer token and CSRF token if available
api.interceptors.request.use(
  (config) => {
    // Attach authorization bearer token if stored
    try {
      const token = localStorage.getItem('sankshep_token');
      if (token && !config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {}

    // CSRF token stored in a non-httpOnly cookie or meta tag by the server
    const csrf = getCookie('csrf-token');
    if (csrf) {
      config.headers['X-CSRF-Token'] = csrf;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — normalize errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    // Session expired
    if (status === 401 && window.location.pathname !== '/login') {
      // Don't toast on auth pages
      if (!['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password'].includes(window.location.pathname)) {
        toast.error('Session expired. Please log in again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    }

    // Normalize error
    const normalizedError = {
      message: message || getDefaultErrorMessage(status),
      status,
      data: error.response?.data,
    };

    return Promise.reject(normalizedError);
  }
);

// ─── AI Service client ────────────────────────────────────────────────────────

export const aiApi = axios.create({
  baseURL: AI_BASE,
  withCredentials: false,
  timeout: 120000, // AI operations can be slow
  headers: {
    'Content-Type': 'application/json',
  },
});

aiApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.response?.data?.message;
    return Promise.reject({
      message: message || 'AI service error',
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export const authApi = {
  signup: (data) => api.post('/api/auth/signup', data),
  login: (data) => api.post('/api/auth/login', data),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me'),
  refreshToken: () => api.post('/api/auth/refresh'),

  // Email verification
  verifyEmail: (data) => api.post('/api/auth/verify-email', data),
  resendOtp: (data) => api.post('/api/auth/resend-otp', data),

  // Password reset
  forgotPassword: (data) => api.post('/api/auth/forgot-password', data),
  resetPassword: (data) => api.post('/api/auth/reset-password', data),
  changePassword: (data) => api.post('/api/auth/change-password', data),

  // OAuth
  googleAuth: () => { window.location.href = `${API_BASE}/api/auth/google`; },
  githubAuth: () => { window.location.href = `${API_BASE}/api/auth/github`; },
  linkedinAuth: () => { window.location.href = `${API_BASE}/api/auth/linkedin`; },
};

// ─── Onboarding endpoints ─────────────────────────────────────────────────────

export const onboardingApi = {
  getProgress: () => api.get('/api/onboarding/progress'),
  saveStep: (step, data) => api.put(`/api/onboarding/step/${step}`, data),
  complete: (data) => api.post('/api/onboarding/complete', data),
};

// ─── User / Profile endpoints ─────────────────────────────────────────────────

export const userApi = {
  getProfile: () => api.get('/api/user/profile'),
  updateProfile: (data) => api.put('/api/user/profile', data),
  uploadAvatar: (formData) =>
    api.post('/api/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getSettings: () => api.get('/api/user/settings'),
  updateSettings: (data) => api.put('/api/user/settings', data),
  deleteAccount: (data) => api.delete('/api/user/account', { data }),
};

// ─── Document endpoints ───────────────────────────────────────────────────────

export const documentApi = {
  upload: (formData, onProgress) =>
    api.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    }),
  batchUpload: (formData, onProgress) =>
    api.post('/api/documents/batch-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    }),
  importUrl: (data) => api.post('/api/documents/import-url', data),
  list: (params) => api.get('/api/documents', { params }),
  get: (id) => api.get(`/api/documents/${id}`),
  getExtracted: (id) => api.get(`/api/documents/${id}/text`),
  ask: (id, question) => api.post(`/api/documents/${id}/ask`, { question }),
  queryCorpus: (data) => api.post('/api/documents/rag/query', data),
  rename: (id, name) => api.patch(`/api/documents/${id}`, { name }),
  delete: (id) => api.delete(`/api/documents/${id}`),
  batchDelete: (ids) => api.post('/api/documents/batch-delete', { ids }),
  downloadUrl: (id) => `${API_BASE}/api/documents/${id}/download`,
};

// ─── Summary endpoints ────────────────────────────────────────────────────────

export const summaryApi = {
  generate: (data) =>
    api.post('/api/summaries/generate', data, { timeout: 180000 }),
  compare: (data) =>
    api.post('/api/summaries/compare', data, { timeout: 180000 }),
  list: (params) => api.get('/api/summaries', { params }),
  get: (id) => api.get(`/api/summaries/${id}`),
  update: (id, data) => api.put(`/api/summaries/${id}`, data),
  delete: (id) => api.delete(`/api/summaries/${id}`),
  getVersions: (id) => api.get(`/api/summaries/${id}/versions`),
  rename: (id, title) => api.patch(`/api/summaries/${id}`, { title }),
  addToCollection: (id, collectionId) =>
    api.post(`/api/summaries/${id}/collection`, { collectionId }),
  export: (id, format) =>
    api.get(`/api/summaries/${id}/export`, {
      params: { format },
      responseType: 'blob',
    }),
};

// ─── Collection endpoints ─────────────────────────────────────────────────────

export const collectionApi = {
  list: () => api.get('/api/collections'),
  create: (data) => api.post('/api/collections', data),
  get: (id) => api.get(`/api/collections/${id}`),
  update: (id, data) => api.put(`/api/collections/${id}`, data),
  delete: (id) => api.delete(`/api/collections/${id}`),
};

// ─── Analytics endpoints ──────────────────────────────────────────────────────

export const analyticsApi = {
  getDashboard: () => api.get('/api/analytics/dashboard'),
  getActivity: (params) => api.get('/api/analytics/activity', { params }),
  getMethodStats: () => api.get('/api/analytics/methods'),
};

// ─── AI Service endpoints ─────────────────────────────────────────────────────

export const nlpApi = {
  health: () => aiApi.get('/health'),
  preprocess: (data) => aiApi.post('/api/preprocess', data),
  textrank: (data) => aiApi.post('/api/summarize/textrank', data),
  customModel: (data) => aiApi.post('/api/summarize/custom', data),
  gemini: (data) => aiApi.post('/api/summarize/gemini', data),
  evaluate: (data) => aiApi.post('/api/evaluate/rouge', data),

  // Model Lab
  getExperiments: () => aiApi.get('/api/experiments'),
  createExperiment: (data) => aiApi.post('/api/experiments', data),
  getExperiment: (id) => aiApi.get(`/api/experiments/${id}`),
  getModelStatus: () => aiApi.get('/api/model/status'),
  compareModels: (data) => aiApi.post('/api/summarize/compare', data),

  // Training
  startTraining: (data) => aiApi.post('/api/training/start', data),
  getTrainingStatus: (jobId) => aiApi.get(`/api/training/status/${jobId}`),
  getCheckpoints: () => aiApi.get('/api/training/checkpoints'),
};

// ─── Admin endpoints ──────────────────────────────────────────────────────────

export const adminApi = {
  getOverview: () => api.get('/api/admin/overview'),
  getDatasets: () => api.get('/api/admin/datasets'),
  addDatasetItem: (data) => api.post('/api/admin/datasets', data),
  getSystemHealth: () => api.get('/api/admin/system-health'),
  getUsers: (params) => api.get('/api/admin/users', { params }),
  updateUserRole: (id, role) => api.patch(`/api/admin/users/${id}/role`, { role }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function getDefaultErrorMessage(status) {
  const messages = {
    400: 'Invalid request. Please check your input.',
    401: 'Authentication required.',
    403: 'You do not have permission to perform this action.',
    404: 'Resource not found.',
    409: 'Conflict — this resource already exists.',
    422: 'Validation failed.',
    429: 'Too many requests. Please slow down.',
    500: 'Server error. Please try again later.',
    502: 'Service temporarily unavailable.',
    503: 'Service unavailable. Please try again later.',
  };
  return messages[status] || 'An unexpected error occurred.';
}

/**
 * Download a blob response as a file
 */
export function downloadBlob(data, filename) {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
