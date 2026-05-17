import axios from 'axios';
import { authStore } from '../auth/auth-store';

const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  const token = authStore.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        authStore.setToken(data.accessToken);
        err.config.headers.Authorization = `Bearer ${data.accessToken}`;
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
