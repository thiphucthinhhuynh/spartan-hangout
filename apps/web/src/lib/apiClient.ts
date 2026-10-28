import { API_PREFIX, ErrorCode, type ApiErrorBody } from '@sh/shared';

/** A non-2xx API response, parsed from the standard error envelope (docs/api.md#errors). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly fields: Record<string, string> | null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

/** The only place the app calls fetch. Paths are relative to /api/v1, e.g. `/health`. */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const init: RequestInit = { method, credentials: 'include' };
  if (signal) init.signal = signal;
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_PREFIX}${path}`, init);
  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (data as Partial<ApiErrorBody> | null)?.error;
    throw new ApiError(
      res.status,
      error?.code ?? ErrorCode.INTERNAL_ERROR,
      error?.message ?? 'Something went wrong. Please try again.',
      error?.fields ?? null,
    );
  }
  return data as T;
}
