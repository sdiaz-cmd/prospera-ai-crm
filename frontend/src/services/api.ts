/// <reference types="vite/client" />
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// ─── Claves de storage (deben coincidir con authStore.ts) ─────────────────────
const KEY_ACCESS  = 'prosp_at';   // sessionStorage — accessToken
const KEY_REFRESH = 'prosp_rt';   // localStorage  — refreshToken

function getAccessToken()  { return sessionStorage.getItem(KEY_ACCESS)  ?? localStorage.getItem('accessToken'); }
function getRefreshToken() { return localStorage.getItem(KEY_REFRESH)   ?? localStorage.getItem('refreshToken'); }

function setTokens(at: string, rt: string) {
  sessionStorage.setItem(KEY_ACCESS, at);
  localStorage.setItem(KEY_REFRESH, rt);
}

function clearTokens() {
  sessionStorage.removeItem(KEY_ACCESS);
  localStorage.removeItem(KEY_REFRESH);
  // Limpiar claves legacy
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

// ─── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// ─── Request interceptor: adjuntar token ──────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: refresh automático de token 401 ───────────────────
let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }[] = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthRoute =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh');

    // ── Refresh automático en 401 ──────────────────────────────────────────────
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRT } = data.data;

        setTokens(accessToken, newRT);

        if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Trial expirado ─────────────────────────────────────────────────────────
    if (error.response?.status === 402) {
      window.location.href = '/trial-expired';
      return Promise.reject(error);
    }

    // ── Mostrar errores genéricos ──────────────────────────────────────────────
    if (error.response?.status !== 401 && error.response?.status !== 422) {
      const message = (error.response?.data as { message?: string })?.message || 'Error del servidor';
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;
