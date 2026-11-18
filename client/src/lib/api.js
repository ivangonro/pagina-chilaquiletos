let token = localStorage.getItem('token');

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}
const API_BASE = import.meta.env.VITE_API_URL || '';
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export function fmtDate(s) {
  if (!s) return '';
  return new Date(s.replace(' ', 'T') + 'Z').toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
