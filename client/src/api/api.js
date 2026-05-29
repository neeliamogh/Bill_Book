// Axios instance with JWT interceptor
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || (window.location.port === '5173' ? 'http://localhost:5000/api' : '/api');

const api = axios.create({
  baseURL: apiBaseUrl
});

// Interceptor to inject the JWT token if stored in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('billbook_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
