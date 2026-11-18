import { api, setToken } from './api.js';

export const auth = $state({
  user: null,
  ready: false,
});

export async function login(email, password) {
  const data = await api('/auth/login', { method: 'POST', body: { email, password } });
  setToken(data.token);
  auth.user = data.user;
  return data.user;
}

export async function loadMe() {
  try {
    auth.user = await api('/auth/me');
  } catch {
    auth.user = null;
    setToken(null);
  } finally {
    auth.ready = true;
  }
}

export function logout() {
  auth.user = null;
  setToken(null);
}

export const isAdmin = () => auth.user?.role === 'admin';
