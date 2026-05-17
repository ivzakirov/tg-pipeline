// Access token stored in memory (not localStorage — XSS protection)
let accessToken: string | null = null;

export const authStore = {
  getToken: () => accessToken,
  setToken: (token: string) => { accessToken = token; },
  clearToken: () => { accessToken = null; },
  isAuthenticated: () => !!accessToken,
};
