const API_ORIGIN = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL ?? '';
const BASE = `${API_ORIGIN}/api/website`;
const ADMIN_KEY = (() => {
  try { return localStorage.getItem('adminKey') || ''; } catch { return ''; }
})();

export function getStoredKey(): string {
  try { return localStorage.getItem('adminKey') || ''; } catch { return ''; }
}

function adminHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-admin-key':  getStoredKey(),
  };
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...adminHeaders(), ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json() as Promise<T>;
}

export interface AdminUser {
  _id: string;
  phone: string;
  jid?: string;
  lid?: string;
  name: string;
  wallet: number;
  bank: number;
  bankLimit: number;
  netWorth: number;
  level: number;
  xp: number;
  banned: boolean;
  isMod: boolean;
  isAdmin: boolean;
  warnings: number;
  registered: boolean;
  createdAt?: string;
  updatedAt?: string;
  inventory?: { item: string; qty: number }[];
  cooldowns?: Record<string, string>;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface DuplicateUser {
  _id: string;
  jid?: string;
  lid?: string;
  phone: string;
  name: string;
  wallet: number;
  bank: number;
  level: number;
  xp: number;
  banned: boolean;
  createdAt?: string;
}

export interface DuplicateGroup {
  phone: string;
  count: number;
  users: DuplicateUser[];
}

export interface MigrationResult {
  success: boolean;
  normalized: number;
  alreadySet: number;
  lidOnly: number;
  conflicts: number;
  conflictList: { phone: string; userA: string; userB: string }[];
  message: string;
}

export interface BotEntry {
  _id: string;
  botId: string;
  name: string;
  phone: string;
  avatarData?: string;
  createdAt: string;
  status?: 'connected' | 'offline' | 'pending' | 'disconnected';
}

export interface PairingResult {
  success: boolean;
  botId: string;
  pairingCode?: string;
  status: 'pending' | 'already_connected';
  message?: string;
}

export interface PairingStatus {
  status: 'pending' | 'connected' | 'disconnected' | 'not_found';
  pairingCode?: string;
  phone?: string;
}

export const adminApi = {
  // ── Stats ──────────────────────────────────────────────────────────────
  getStats: () => request<Record<string, unknown>>('/stats'),

  // ── Users ──────────────────────────────────────────────────────────────
  listUsers: (page = 1, limit = 20, search = '') =>
    request<{ users: AdminUser[]; pagination: PaginationInfo }>(
      `/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
    ),

  getUser: (phone: string) =>
    request<AdminUser>(`/admin/user/${phone}`),

  editUser: (phone: string, data: Partial<AdminUser>) =>
    request<{ success: boolean; user: AdminUser }>('/admin/edit-user', {
      method: 'PUT',
      body: JSON.stringify({ phone, ...data }),
    }),

  banUser: (phone: string) =>
    request<{ success: boolean }>('/admin/ban-user', {
      method: 'POST', body: JSON.stringify({ phone }),
    }),

  unbanUser: (phone: string) =>
    request<{ success: boolean }>('/admin/unban-user', {
      method: 'POST', body: JSON.stringify({ phone }),
    }),

  resetCooldowns: (phone: string) =>
    request<{ success: boolean }>('/admin/reset-cooldowns', {
      method: 'POST', body: JSON.stringify({ phone }),
    }),

  deleteUser: (phone: string) =>
    request<{ success: boolean }>('/admin/delete-user', {
      method: 'DELETE', body: JSON.stringify({ phone }),
    }),

  // ── Global wipes ───────────────────────────────────────────────────────
  wipeEconomy:   () => request<{ success: boolean; message: string }>('/admin/wipe-economy',   { method: 'POST' }),
  wipeXP:        () => request<{ success: boolean; message: string }>('/admin/wipe-xp',        { method: 'POST' }),
  wipeInventory: () => request<{ success: boolean; message: string }>('/admin/wipe-inventory', { method: 'POST' }),

  exportUsers: () => {
    const key = encodeURIComponent(getStoredKey());
    const a = document.createElement('a');
    a.href = `${BASE}/admin/export-users?adminKey=${key}`;
    a.download = 'users.csv';
    a.click();
  },

  // ── Duplicate detection & merge ────────────────────────────────────────
  detectDuplicates: () =>
    request<{ duplicates: DuplicateGroup[]; totalGroups: number }>('/admin/detect-duplicates'),

  mergeUsers: (primaryPhone: string, secondaryPhone: string) =>
    request<{ success: boolean; merged: string; deleted: string; summary: Record<string, unknown> }>(
      '/admin/merge-users',
      { method: 'POST', body: JSON.stringify({ primaryPhone, secondaryPhone }) }
    ),

  // ── Migration ──────────────────────────────────────────────────────────
  runMigration: () =>
    request<MigrationResult>('/admin/run-migration', { method: 'POST' }),

  // ── Bots ───────────────────────────────────────────────────────────────
  listBots: () =>
    request<{ bots: BotEntry[] }>('/admin/bots'),

  startPairing: (phone: string, name: string) =>
    request<PairingResult>('/admin/bots/start-pairing', {
      method: 'POST',
      body: JSON.stringify({ phone, name }),
    }),

  getPairingStatus: (botId: string) =>
    request<PairingStatus>(`/admin/bots/pairing-status/${encodeURIComponent(botId)}`),

  deleteBot: (botId: string) =>
    request<{ success: boolean }>(`/admin/bots/${encodeURIComponent(botId)}`, { method: 'DELETE' }),
};
