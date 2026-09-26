import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Assuming we are testing on localhost. For Android emulator, use 10.0.2.2
const API_URL = 'http://localhost:8000'; 

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
