import axios from 'axios';

export const apiBaseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
export const backendBaseUrl = (
  import.meta.env.VITE_APP_URL || new URL(apiBaseUrl, window.location.origin).origin
).replace(/\/$/, '');

export const assetUrl = (path, fallback = '/storage/itemImage/No-image-default.png') => {
  const normalized = path && path !== 'null' ? path : fallback;
  return `${backendBaseUrl}/${String(normalized).replace(/^\//, '')}`;
};

const axiosClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ACCESS_TOKEN');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ACCESS_TOKEN');
      localStorage.removeItem('USER');
      window.dispatchEvent(new Event('qhs:auth-expired'));
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
