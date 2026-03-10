import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 (Unauthorized) - not on 403 (Forbidden)
    if (error.response?.status === 401) {
      // Check if we're not already on the login page to avoid redirect loop
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  register: (data) => api.post('/auth/register', data),
};

// Customer API
export const customerAPI = {
  register: (data) => api.post('/customers', data),
  getAll: () => api.get('/customers'),
  getById: (id) => api.get(`/customers/${id}`),
  update: (id, data) => api.put(`/customers/${id}`, data),
};

// Loan API
export const loanAPI = {
  apply: (data) => api.post('/loans', data),
  getAll: (params) => api.get('/loans', { params }),
  getById: (id) => api.get(`/loans/${id}`),
  approve: (id) => api.put(`/loans/${id}/approve`),
  reject: (id) => api.put(`/loans/${id}/reject`),
};

// AI API
export const aiAPI = {
  checkEligibility: (data) => api.post('/ai/predict', data),
};

export default api;
