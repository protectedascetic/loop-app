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
  stale: boolean;
  attn: number;
  due_at: string | null;
  due_days: number | null;
  image_url?: string | null;
  summary: string;
  notes: string[];
}

export async function getLoops(): Promise<LoopItem[]> {
  const data = await request<{ loops: LoopItem[] }>('GET', '/app/api/loops');
  return data.loops;
}

// ── Today ───────────────────────────────────────────────────────────────────────

export interface FocusItem {
  id: number; title: string; type: string; priority: string;
  days_old: number; stale: boolean; attn: number;
  due_at: string | null; due_days: number | null;
}
export interface MomentumItem { title: string; days_ago: number }
export interface TodayData {
  greeting: string; name: string;
  open_count: number; stale_count: number; load: number;
  focus: FocusItem[]; momentum: MomentumItem[]; streak: number;
}

export async function getToday(): Promise<TodayData> {
  return request('GET', '/app/api/today');
}
export async function getBriefing(): Promise<{ text: string }> {
  return request('GET', '/app/api/briefing');
}

// ── Clusters / Journal ────────────────────────────────────────────────────────

export interface Cluster { name: string; emoji: string; loop_ids: number[] }
export async function getClusters(): Promise<Cluster[]> {
  const data = await request<{ clusters: Cluster[] }>('GET', '/app/api/clusters');
  return data.clusters;
}

export interface JournalEntry { id: number; type: string; days_old: number; text: string; summary: string }
export async function getJournal(): Promise<JournalEntry[]> {
  const data = await request<{ entries: JournalEntry[] }>('GET', '/app/api/journal');
  return data.entries;
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

export async function snoozeUntil(id: number, untilIso: string) {
  return request('POST', `/app/api/loops/${id}/snooze`, { until: untilIso });
}

export async function setDue(id: number, due: string | null) {
  return request('POST', `/app/api/loops/${id}/due`, { due });
}

export interface ReadingItem {
  id: number; url: string; title: string; domain: string;
  description: string; days_old: number; read: boolean;
}

export async function getReading(filter: 'unread' | 'read' | 'all' = 'unread'): Promise<{ items: ReadingItem[]; unread_count: number }> {
  return request('GET', `/app/api/reading?filter=${filter}`);
}

// ── Notes ──────────────────────────────────────────────────────────────────
export interface NoteItem {
  id: number; title: string; snippet: string; days_old: number;
  summary: string; task_count: number; item_count: number;
}
export interface NoteExtractItem { title: string; owner: string; type: string; priority: string }
export interface NoteLinkedLoop { id: number; title: string; type: string; status: string; emoji: string }
export interface NoteDetail {
  id: number; title: string; body: string; created_at: string; summary: string;
  items: NoteExtractItem[]; entities: { name: string; type: string }[]; linked_loops: NoteLinkedLoop[];
}

export async function getNotes(): Promise<{ notes: NoteItem[] }> {
  return request('GET', '/app/api/notes');
}
export async function getNote(id: number): Promise<NoteDetail> {
  return request('GET', `/app/api/notes/${id}`);
}
export async function createNote(body: string, title?: string): Promise<{ id: number; summary: string; created_loops: { id: number; title: string; type: string; emoji: string }[] }> {
  return request('POST', '/app/api/notes', { body, title });
}
export async function deleteNote(id: number) {
  return request('DELETE', `/app/api/notes/${id}`);
}

export async function addNote(id: number, text: string) {
  return request('POST', `/app/api/loops/${id}/note`, { text });
}

/** Upload a recorded audio clip → transcribe → capture as loops.
 *  `file` is a React Native file descriptor: { uri, name, type }. */
export async function captureVoice(file: { uri: string; name: string; type: string }): Promise<{ text: string; created: LoopItem[] }> {
  const token = await getToken();
  const form = new FormData();
  // RN FormData accepts { uri, name, type } for file parts.
  form.append('audio', file as unknown as Blob);
  const res = await fetch(`${BASE_URL}/app/api/capture/voice`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json() as Promise<{ text: string; created: LoopItem[] }>;
}

/** Upload an image → Supabase Storage → Claude vision → capture as loops.
 *  `file` is a React Native file descriptor: { uri, name, type }. */
export async function captureImage(file: { uri: string; name: string; type: string }): Promise<{ image_url: string; created: LoopItem[] }> {
  const token = await getToken();
  const form = new FormData();
  form.append('image', file as unknown as Blob);
  const res = await fetch(`${BASE_URL}/app/api/capture/image`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json() as Promise<{ image_url: string; created: LoopItem[] }>;
}

// ── Brain ─────────────────────────────────────────────────────────────────────

export interface BrainData {
  total: number;          // open action loops
  stale: number;
  journal: number;
  resolved_week: number;
  by_type: Record<string, number>;
}

export async function getBrain(): Promise<BrainData> {
  return request('GET', '/app/api/brain');
}
export async function getBrainInsight(): Promise<{ text: string }> {
  return request('GET', '/app/api/brain/insight');
}
export async function brainAvoidance(): Promise<{ text: string }> {
  return request('POST', '/app/api/brain/avoidance');
}
export async function brainWeek(): Promise<{ text: string }> {
  return request('POST', '/app/api/brain/week');
}
