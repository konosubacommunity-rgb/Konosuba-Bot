export const API_BASE = (import.meta.env.VITE_BOT_API_URL as string) || '';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || `Request failed: ${res.status}`);
  return data;
}

export async function apiFetchBots(adminPassword: string) {
  return apiFetch('/api/bots', {
    headers: { 'x-admin-password': adminPassword },
  });
}

export async function apiAddBot(adminPassword: string, payload: { botName: string; phoneNumber: string; avatarData?: string }) {
  return apiFetch('/api/bots/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify(payload),
  });
}

export async function apiGetPairingCode(adminPassword: string, botId: string) {
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

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
