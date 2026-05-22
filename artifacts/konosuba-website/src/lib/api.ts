const API_ORIGIN: string = (import.meta.env.VITE_API_URL as string | undefined) || '';
const BASE = `${API_ORIGIN}/api/website`;

export function getToken(): string | null { return localStorage.getItem('konosuba_token'); }
export function setToken(token: string) { localStorage.setItem('konosuba_token', token); }
export function removeToken() { localStorage.removeItem('konosuba_token'); localStorage.removeItem('konosuba_user'); }
export function getCurrentUser(): Record<string, unknown> | null {
  try { const raw = localStorage.getItem('konosuba_user'); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function setCurrentUser(user: Record<string, unknown>) { localStorage.setItem('konosuba_user', JSON.stringify(user)); }

function authHeaders() {
  const token = getToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });
  if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || 'Request failed'); }
  return res.json() as T;
}

export const api = {
  login:      (phone: string, password?: string) => request<{ token: string; user: Record<string, unknown> }>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
  register:   (phone: string, password?: string, name?: string) => request<{ token: string; user: Record<string, unknown> }>('/auth/register', { method: 'POST', body: JSON.stringify({ phone, password, name }) }),
  me:         () => request<Record<string, unknown>>('/user/me'),
  profile:    (phone: string) => request<Record<string, unknown>>(`/user/${phone}/profile`),
  activity:   (phone: string) => request<unknown[]>(`/user/${phone}/activity`),
  inventory:  (phone: string) => request<unknown[]>(`/user/${phone}/inventory`),
  leaderboard:() => request<unknown[]>('/leaderboard'),
  stats:      () => request<Record<string, unknown>>('/stats'),
};

export interface AdminUser { _id: string; phone: string; jid?: string; lid?: string; name: string; wallet: number; bank: number; bankLimit: number; netWorth: number; level: number; xp: number; banned: boolean; isMod: boolean; isAdmin: boolean; warnings: number; registered: boolean; createdAt?: string; updatedAt?: string; inventory?: { item: string; qty: number }[]; }
export interface Pagination { page: number; limit: number; total: number; pages: number; }

const ADMIN_KEY = () => localStorage.getItem('konosuba_admin_key') || '';
function adminHeaders() { return { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY() }; }
async function adminRequest<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...adminHeaders(), ...(opts.headers || {}) } });
  if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || 'Request failed'); }
  return res.json() as T;
}
export function getAdminKey(): string | null { return localStorage.getItem('konosuba_admin_key'); }
export function setAdminKey(key: string) { localStorage.setItem('konosuba_admin_key', key); }
export function removeAdminKey() { localStorage.removeItem('konosuba_admin_key'); }

export const adminApi = {
  getUsers:       (page = 1, limit = 20, search = '') => adminRequest<{ users: AdminUser[]; pagination: Pagination }>(`/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
  getUser:        (phone: string) => adminRequest<AdminUser>(`/admin/user/${phone}`),
  editUser:       (phone: string, data: Partial<AdminUser>) => adminRequest<{ success: boolean; user: AdminUser }>('/admin/edit-user', { method: 'PUT', body: JSON.stringify({ phone, ...data }) }),
  banUser:        (phone: string) => adminRequest<{ success: boolean }>('/admin/ban-user', { method: 'POST', body: JSON.stringify({ phone }) }),
  unbanUser:      (phone: string) => adminRequest<{ success: boolean }>('/admin/unban-user', { method: 'POST', body: JSON.stringify({ phone }) }),
  resetCooldowns: (phone: string) => adminRequest<{ success: boolean }>('/admin/reset-cooldowns', { method: 'POST', body: JSON.stringify({ phone }) }),
  deleteUser:     (phone: string) => adminRequest<{ success: boolean }>('/admin/delete-user', { method: 'DELETE', body: JSON.stringify({ phone }) }),
  wipeEconomy:    () => adminRequest<{ success: boolean; message: string }>('/admin/wipe-economy', { method: 'POST' }),
  wipeXP:         () => adminRequest<{ success: boolean; message: string }>('/admin/wipe-xp', { method: 'POST' }),
  wipeInventory:  () => adminRequest<{ success: boolean; message: string }>('/admin/wipe-inventory', { method: 'POST' }),
  exportUsers:    () => { window.open(`${BASE}/admin/export-users?adminKey=${encodeURIComponent(ADMIN_KEY())}`, '_blank'); },
};
