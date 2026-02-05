export type TraceEvent = {
  ts: number;
  flow: string;
  step: string;
  data?: unknown;
};

const TRACE_KEY = 'hoppiness_trace_v1';
const MAX_EVENTS = 200;

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function traceLog(flow: string, step: string, data?: unknown) {
  const evt: TraceEvent = { ts: Date.now(), flow, step, data };

  // Console in dev (keeps prod quieter)
  if (import.meta.env.DEV) {
    console.log(`[trace:${flow}] ${step}`, data ?? '');
  }

  try {
    const existing = safeJsonParse<TraceEvent[]>(localStorage.getItem(TRACE_KEY)) ?? [];
    existing.push(evt);
    const trimmed = existing.slice(-MAX_EVENTS);
    localStorage.setItem(TRACE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage errors
  }
}

export function traceRead(): TraceEvent[] {
  return safeJsonParse<TraceEvent[]>(localStorage.getItem(TRACE_KEY)) ?? [];
}

export function traceClear() {
  try {
    localStorage.removeItem(TRACE_KEY);
  } catch {
    // ignore
  }
}
