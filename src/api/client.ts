import { Alert, Rule, Agent, LogLine } from '../types';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Stats ────────────────────────────────────────────────────────────────────

export interface StatsResponse {
  total_alerts:   number;
  critical_count: number;
  warning_count:  number;
  chart_data:     { time: string; count: number }[];
}

export const fetchStats = () =>
  apiFetch<StatsResponse>('/api/stats');

// ── Alerts ───────────────────────────────────────────────────────────────────

export interface AlertsResponse {
  total: number;
  page:  number;
  limit: number;
  data:  Alert[];
}

export const fetchAlerts = (params?: { severity?: string; status?: string; page?: number; limit?: number }) => {
  const qs = new URLSearchParams();
  if (params?.severity) qs.set('severity', params.severity);
  if (params?.status)   qs.set('status',   params.status);
  if (params?.page)     qs.set('page',     String(params.page));
  if (params?.limit)    qs.set('limit',    String(params.limit));
  return apiFetch<AlertsResponse>(`/api/alerts?${qs}`);
};

export const fetchAlert = (id: string) =>
  apiFetch<Alert & { rawLog?: string }>(`/api/alerts/${id}`);

export const acknowledgeAlert = (id: string) =>
  apiFetch<{ id: number; status: string }>(`/api/alerts/${id}/acknowledge`, { method: 'PATCH' });

export const analyzeAlert = (id: string) =>
  apiFetch<{ explanation: string }>(`/api/alerts/${id}/analyze`, { method: 'POST' });

// ── Rules ────────────────────────────────────────────────────────────────────

export const fetchRules = () =>
  apiFetch<Rule[]>('/api/rules');

export const createRule = (body: Omit<Rule, 'id'>) =>
  apiFetch<Rule>('/api/rules', { method: 'POST', body: JSON.stringify(body) });

export const updateRule = (id: string, body: Partial<Rule>) =>
  apiFetch<Rule>(`/api/rules/${id}`, { method: 'PATCH', body: JSON.stringify(body) });

// ── Health ───────────────────────────────────────────────────────────────────

export interface HealthResponse {
  agents_online: number;
  agents_total:  number;
  agents:        (Agent & { logs: LogLine[] })[];
}

export const fetchHealth = () =>
  apiFetch<HealthResponse>('/api/health');
