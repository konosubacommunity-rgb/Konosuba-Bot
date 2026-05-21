export const API_BASE = (import.meta.env.VITE_BOT_API_URL as string) || '';

export function getToken(): string | null {
  return localStorage.getItem('kono_token');
}

export function getCurrentUser(): { phone: string; username: string } | null {
  const raw = localStorage.getItem('kono_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setSession(token: string, user: { phone: string; username: string }) {
  localStorage.setItem('kono_token', token);
  localStorage.setItem('kono_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('kono_token');
  localStorage.removeItem('kono_user');
}

export function formatMoney(n: number) {
  return '$' + Number(n || 0).toLocaleString('en-US');
}

export function formatTime(date: string | Date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json();
  if (res.status === 401) { clearSession(); throw new Error('unauthorized'); }
  if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
  return data;
}

export async function apiSignup(phone: string, username: string, password: string, country: string) {
  return apiFetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, username, password, country }),
  });
}

export async function apiLogin(phone: string, password: string) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
}

export async function apiGetUser(phone: string) {
  const token = getToken();
  return apiFetch(`/api/user/${phone}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiGetActivities(phone: string) {
  const token = getToken();
  try {
    return await apiFetch(`/api/user/${phone}/activity`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return { activities: [] };
  }
}

export async function apiGetLeaderboard() {
  try {
    return await apiFetch('/api/leaderboard');
  } catch {
    return { users: [] };
  }
}
