import axios from 'axios';

let accessToken: string | null = null;

export const authStore = {
  getToken: () => accessToken,
  setToken: (token: string) => {
    accessToken = token;
    (window as any).__TG_ACCESS_TOKEN__ = token;
  },
  clearToken: () => {
    accessToken = null;
    (window as any).__TG_ACCESS_TOKEN__ = null;
  },
  isAuthenticated: () => !!accessToken,
  tryRestore: async (): Promise<boolean> => {
    try {
      const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
      authStore.setToken(data.accessToken);
      return true;
    } catch {
      return false;
    }
  },
};
