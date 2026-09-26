import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// For local dev, replace with your local IP if running on a physical device or android emulator (e.g. 10.0.2.2:8000)
// If running on iOS simulator, localhost:8000 usually works.
export const API_URL = 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests and attach the JWT token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept responses to handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Auto-logout the user if the token is invalid/expired
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
