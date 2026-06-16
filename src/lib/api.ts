/**
 * Loop API client.
 * All requests attach the JWT stored in SecureStore.
 */

import * as SecureStore from 'expo-secure-store';

// ── Config ────────────────────────────────────────────────────────────────────

// Point this at your v2 Railway service URL during development,
// then switch to the merged prod URL when ready.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://your-v2-railway-url.railway.app';

const TOKEN_KEY = 'loop_jwt';

// ── Token helpers ─────────────────────────────────────────────────────────────

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
  get isUnauthorized() { return this.status === 401; }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  email: string | null;
  display_name: string | null;
  photo_url: string | null;
  is_new_user: boolean;
}

export async function login(idToken: string, fcmToken?: string): Promise<LoginResponse> {
  const data = await request<LoginResponse>('POST', '/auth/login', {
    id_token: idToken,
    fcm_token: fcmToken,
  });
  await saveToken(data.access_token);
  return data;
}

export async function updateFcmToken(fcmToken: string) {
  return request('POST', '/auth/fcm', { fcm_token: fcmToken });
}

export async function getMe() {
  return request<{ id: number; email: string; display_name: string; has_telegram: boolean }>(
    'GET', '/auth/me',
  );
}

// ── Loops ─────────────────────────────────────────────────────────────────────

export interface LoopItem {
  id: number;
  title: string;
  type: string;
  priority: string;
  emoji: string;
  is_journal: boolean;
  days_old: number;
  summary: string;
  notes: string[];
}

export async function getLoops(): Promise<LoopItem[]> {
  const data = await request<{ loops: LoopItem[] }>('GET', '/app/api/loops');
  return data.loops;
}

export async function capture(text: string): Promise<{ created: LoopItem[] }> {
  return request('POST', '/app/api/capture', { text });
}

export async function resolveLoop(id: number) {
  return request('POST', `/app/api/loops/${id}/resolve`);
}

export async function snoozeLoop(id: number, days: number) {
  return request('POST', `/app/api/loops/${id}/snooze`, { days });
}

export async function addNote(id: number, text: string) {
  return request('POST', `/app/api/loops/${id}/note`, { text });
}

// ── Brain ─────────────────────────────────────────────────────────────────────

export interface BrainData {
  total: number;
  journal: number;
  stale: number;
  by_type: Record<string, number>;
  top: Array<{ title: string; type: string; emoji: string; score: number }>;
  narrative: string;
}

export async function getBrain(): Promise<BrainData> {
  return request('GET', '/app/api/brain');
}
