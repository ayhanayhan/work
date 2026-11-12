import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

type TraceState = { traceId: string };
const storage = new AsyncLocalStorage<TraceState>();

export function normalizeTraceId(value: unknown): string {
  const raw=String(value||'').trim();
  if (/^[A-Za-z0-9._:-]{8,128}$/.test(raw)) return raw;
  return randomUUID();
}

export function runWithTrace<T>(traceId: string, fn: () => T): T {
  return storage.run({ traceId }, fn);
}

export function currentTraceId(): string | null {
  return storage.getStore()?.traceId || null;
}
