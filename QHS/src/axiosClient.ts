import axios, { type InternalAxiosRequestConfig } from 'axios';

export const apiBaseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
export const backendBaseUrl = (
  import.meta.env.VITE_APP_URL || new URL(apiBaseUrl, window.location.origin).origin
).replace(/\/$/, '');

export const assetUrl = (path?: string | null, fallback = '/storage/itemImage/No-image-default.png') => {
  const normalized = path && path !== 'null' ? path : fallback;
  return `${backendBaseUrl}/${String(normalized).replace(/^\//, '')}`;
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
};

const axiosClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20_000,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
});

const csrfClient = axios.create({
  baseURL: backendBaseUrl,
  timeout: 20_000,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json' },
});

let csrfReady = false;
let csrfRequest: Promise<void> | null = null;

export const ensureCsrfCookie = async (force = false) => {
  if (force) csrfReady = false;
  if (csrfReady) return;

  csrfRequest ??= csrfClient.get('/sanctum/csrf-cookie')
    .then(() => { csrfReady = true; })
    .finally(() => { csrfRequest = null; });

  await csrfRequest;
};

export const resetCsrfCookie = () => {
  csrfReady = false;
};

const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);

axiosClient.interceptors.request.use(async (config) => {
  if (unsafeMethods.has((config.method || 'get').toLowerCase())) {
    await ensureCsrfCookie();
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as (InternalAxiosRequestConfig & { csrfRetried?: boolean }) | undefined;

    if (error.response?.status === 419 && config && !config.csrfRetried) {
      config.csrfRetried = true;
      await ensureCsrfCookie(true);
      return axiosClient(config);
    }

    if (error.response?.status === 401) {
      resetCsrfCookie();
      window.dispatchEvent(new Event('qhs:auth-expired'));
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
