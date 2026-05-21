const BASE = "https://konosuba-api.onrender.com/api/admin";

function getAdminKey(): string {
  return localStorage.getItem("admin_key") || "";
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": getAdminKey(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const adminApi = {
  verifyKey: (key: string) =>
    fetch(`${BASE}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    }).then(r => r.json() as Promise<{ valid: boolean }>),

  getStats: () => req<AdminStats>("GET", "/stats"),
  getBots: () => req<AdminBot[]>("GET", "/bots"),
  createBot: (data: Partial<AdminBot>) => req<AdminBot>("POST", "/bots", data),
  updateBot: (id: string, data: Partial<AdminBot>) => req<AdminBot>("PATCH", `/bots/${id}`, data),
  deleteBot: (id: string) => req<void>("DELETE", `/bots/${id}`),
  restartBot: (id: string) => req<void>("POST", `/bots/${id}/restart`),

  getUsers: () => req<AdminUser[]>("GET", "/users"),
  updateUser: (id: string, data: Partial<AdminUser>) => req<AdminUser>("PATCH", `/users/${id}`, data),
  deleteUser: (id: string) => req<void>("DELETE", `/users/${id}`),

  getDuplicates: () => req<Duplicate[]>("GET", "/duplicates"),
  deleteDuplicate: (id: string) => req<void>("DELETE", `/duplicates/${id}`),

  getLogs: () => req<LogEntry[]>("GET", "/logs"),

  migrateData: (data: unknown) => req<{ migrated: number }>("POST", "/migrate", data),
  broadcastMessage: (data: { message: string; targets: string[] }) =>
    req<{ sent: number }>("POST", "/broadcast", data),
};

export interface AdminStats {
  totalBots: number;
  activeBots: number;
  totalUsers: number;
  premiumUsers: number;
  totalGroups: number;
  messagesHandled: number;
  duplicatesFound: number;
  uptime: string;
}

export interface AdminBot {
  id: string;
  name: string;
  number: string;
  status: "active" | "inactive" | "connecting" | "error";
  groups: number;
  users: number;
  messagesHandled: number;
  owner: string;
  createdAt: string;
  lastSeen: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  plan: "free" | "basic" | "pro" | "enterprise";
  bots: number;
  status: "active" | "suspended";
  joinedAt: string;
  lastLogin: string;
}

export interface Duplicate {
  id: string;
  number: string;
  occurrences: number;
  groups: string[];
  firstSeen: string;
}

export interface LogEntry {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  botId?: string;
  timestamp: string;
}
