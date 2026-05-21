export const API_BASE = (import.meta.env.VITE_BOT_API_URL as string) || 'https://konosuba-api.onrender.com';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || `Request failed: ${res.status}`);
  return data;
}

// ── Bot management ────────────────────────────────────────────────────────────

export async function apiFetchBots(adminPassword: string) {
  return apiFetch('/api/bots', {
    headers: { 'x-admin-password': adminPassword },
  });
}

export async function apiAddBot(adminPassword: string, payload: { botName: string; phoneNumber: string; avatarData?: string }) {
  // POST /api/bots (primary endpoint, also handles /api/bots/add as alias)
  return apiFetch('/api/bots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({
      name:        payload.botName,
      botName:     payload.botName,
      phone:       payload.phoneNumber,
      phoneNumber: payload.phoneNumber,
      avatarData:  payload.avatarData,
    }),
  });
}

export async function apiGetPairingCode(adminPassword: string, botId: string) {
  // POST /api/bots/:id/pairing-code
  return apiFetch(`/api/bots/${botId}/pairing-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
  });
}

export async function apiDeleteBot(adminPassword: string, botId: string) {
  return apiFetch(`/api/bots/${botId}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': adminPassword },
  });
}

export async function apiRestartBot(adminPassword: string, botId: string) {
  return apiFetch(`/api/bots/${botId}/restart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
  });
}

export async function apiFetchBotLogs(adminPassword: string, botId: string) {
  return apiFetch(`/api/bots/${botId}/logs`, {
    headers: { 'x-admin-password': adminPassword },
  });
}

// ── User management ───────────────────────────────────────────────────────────

export interface UserRecord {
  phone: string;
  name?: string;
  username?: string;
  wallet?: number;
  bank?: number;
  totalBalance?: number;
  level?: number;
  xp?: number;
  streak?: number;
  class?: string;
  guild?: string | null;
  registered?: boolean;
  banned?: boolean;
  achievements?: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function apiFetchUsers(adminPassword: string, page = 1, limit = 50, search = '') {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  return apiFetch(`/api/admin/users?${params}`, {
    headers: { 'x-admin-password': adminPassword },
  });
}

export async function apiSearchUser(adminPassword: string, phone: string) {
  return apiFetch(`/api/admin/users/search?phone=${encodeURIComponent(phone)}`, {
    headers: { 'x-admin-password': adminPassword },
  });
}

export async function apiEditUser(adminPassword: string, payload: { phone: string; wallet?: number; bank?: number; level?: number; xp?: number; streak?: number }) {
  return apiFetch('/api/admin/edit-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify(payload),
  });
}

export async function apiBanUser(adminPassword: string, phone: string, banned: boolean) {
  return apiFetch('/api/admin/ban-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({ phone, banned }),
  });
}

export async function apiResetUserCooldowns(adminPassword: string, phone: string) {
  return apiFetch('/api/admin/reset-cooldowns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({ phone }),
  });
}

export async function apiResetUser(adminPassword: string, phone: string) {
  return apiFetch('/api/admin/reset-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({ phone }),
  });
}

export async function apiDeleteUser(adminPassword: string, phone: string) {
  return apiFetch('/api/admin/delete-user', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({ phone }),
  });
}

export async function apiDeleteAllUsers(adminPassword: string) {
  return apiFetch('/api/admin/reset-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({ confirm: 'YES_DELETE_ALL_DATA' }),
  });
}

export async function apiMergeUsers(adminPassword: string, sourcePhone: string, targetPhone: string) {
  return apiFetch('/api/admin/merge-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({ sourcePhone, targetPhone }),
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatMoney(n: number) {
  return '$' + Number(n || 0).toLocaleString('en-US');
}
