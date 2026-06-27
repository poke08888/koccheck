// API client with bearer-token auth. Token persists in localStorage.

const TOKEN_KEY = 'livescope_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));
export const logout = () => setToken(null);

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function req(path, { method = 'GET', body, isForm } = {}) {
  const headers = {};
  const tok = getToken();
  if (tok) headers.Authorization = 'Bearer ' + tok;
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  const r = await fetch(path, { method, headers, body: isForm ? body : body ? JSON.stringify(body) : undefined });
  if (r.status === 401) { onUnauthorized(); throw new Error('unauthorized'); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

export const login = (username, password) => req('/api/auth/login', { method: 'POST', body: { username, password } });
export const me = () => req('/api/auth/me');

// Fetch dashboard with optional date range filter.
export const fetchDashboard = (from, to) => {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to)   params.set('to', to);
  const qs = params.toString();
  return req('/api/dashboard' + (qs ? '?' + qs : ''));
};

export const fetchKocSessions = (id, limit = 12) =>
  req(`/api/kocs/${encodeURIComponent(id)}/sessions?limit=${limit}`).catch(() => []);
export const saveWeights = (weights) => req('/api/settings/weights', { method: 'PUT', body: { weights } });

export function uploadDataset(file, brand) {
  const fd = new FormData();
  fd.append('brand', brand);
  fd.append('file', file);
  return req('/api/datasets/upload', { method: 'POST', body: fd, isForm: true });
}

export const deleteDataset = (id) => req(`/api/datasets/${id}`, { method: 'DELETE' });
export const listUsers = () => req('/api/users');
export const createUser = (payload) => req('/api/users', { method: 'POST', body: payload });
export const deleteUser = (id) => req(`/api/users/${id}`, { method: 'DELETE' });
export const resetUserPassword = (id, newPassword) => req(`/api/users/${id}/password`, { method: 'PUT', body: { newPassword } });
export const updateUserRole = (id, role) => req(`/api/users/${id}/role`, { method: 'PUT', body: { role } });
export const saveThresholds = (thresholds) => req('/api/settings/thresholds', { method: 'PUT', body: { thresholds } });
export const changePassword = (currentPassword, newPassword) => req('/api/auth/password', { method: 'POST', body: { currentPassword, newPassword } });
export const fetchAudit = (limit = 200) => req(`/api/audit?limit=${limit}`);

// Brand management (admin only for mutations).
export const listBrands  = ()                    => req('/api/brands');
export const createBrand = (name, plan)          => req('/api/brands',      { method: 'POST',   body: { name, plan } });
export const updateBrand = (id, name, plan)      => req(`/api/brands/${id}`, { method: 'PUT',    body: { name, plan } });
export const deleteBrand = (id)                  => req(`/api/brands/${id}`, { method: 'DELETE' });
