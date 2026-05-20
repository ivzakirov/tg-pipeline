import axios from 'axios';

const api = axios.create({ withCredentials: true });

api.interceptors.request.use((config) => {
  const token = (window as any).__TG_ACCESS_TOKEN__ ?? null;
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
        (window as any).__TG_ACCESS_TOKEN__ = data.accessToken;
        err.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(err.config);
      } catch {
        (window as any).__TG_ACCESS_TOKEN__ = null;
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default api;
