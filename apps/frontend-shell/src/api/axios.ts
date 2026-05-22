import axios from 'axios';
import { authStore } from '../auth/auth-store';

const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  const token = authStore.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post('/api/auth/refresh', {}, { withCredentials: true })
            .then(({ data }) => {
              authStore.setToken(data.accessToken);
              return data.accessToken as string;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const token = await refreshPromise;
        err.config.headers.Authorization = `Bearer ${token}`;
        return api(err.config);
      } catch {
        authStore.clearToken();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default api;
