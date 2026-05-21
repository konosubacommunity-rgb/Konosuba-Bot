const BASE = "https://konosuba-api.onrender.com/api";

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  getStats: () => req<{ users: number; bots: number; messages: number; groups: number }>("GET", "/stats"),
  login: (data: { email: string; password: string }) => req<{ token: string; user: User }>("POST", "/auth/login", data),
  register: (data: { username: string; email: string; password: string }) => req<{ token: string; user: User }>("POST", "/auth/register", data),
  getMe: () => req<User>("GET", "/auth/me"),
  getDashboard: () => req<DashboardData>("GET", "/dashboard"),
  getBots: () => req<Bot[]>("GET", "/bots"),
  logout: () => req<void>("POST", "/auth/logout"),
};

export interface User {
  id: string;
  username: string;
  email: string;
  plan: "free" | "basic" | "pro" | "enterprise";
  createdAt: string;
}

export interface Bot {
  id: string;
  name: string;
  number: string;
  status: "active" | "inactive" | "connecting";
  groups: number;
  messagesHandled: number;
  createdAt: string;
}

export interface DashboardData {
  stats: { users: number; bots: number; messages: number; groups: number };
  bots: Bot[];
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  time: string;
}

export function getStoredToken(): string | null {
  return localStorage.getItem("token");
}

export function setStoredToken(token: string): void {
  localStorage.setItem("token", token);
}

export function clearStoredToken(): void {
  localStorage.removeItem("token");
}
