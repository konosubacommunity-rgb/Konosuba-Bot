const BASE = '/api/website';

export function getToken(): string | null {
  return localStorage.getItem('konosuba_token');
}

export function setToken(token: string) {
  localStorage.setItem('konosuba_token', token);
}

export function removeToken() {
  localStorage.removeItem('konosuba_token');
  localStorage.removeItem('konosuba_user');
}

export function getCurrentUser(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem('konosuba_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: Record<string, unknown>) {
  localStorage.setItem('konosuba_user', JSON.stringify(user));
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json() as T;
}

export const api = {
  login: (phone: string, password?: string) =>
    request<{ token: string; user: Record<string, unknown> }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),

  register: (phone: string, password?: string, name?: string) =>
    request<{ token: string; user: Record<string, unknown> }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, name }),
    }),

  me: () => request<Record<string, unknown>>('/user/me'),

  profile: (phone: string) =>
    request<Record<string, unknown>>(`/user/${phone}/profile`),

  activity: (phone: string) =>
    request<unknown[]>(`/user/${phone}/activity`),

  inventory: (phone: string) =>
    request<unknown[]>(`/user/${phone}/inventory`),

  leaderboard: () => request<unknown[]>('/leaderboard'),

  stats: () => request<Record<string, unknown>>('/stats'),
};
