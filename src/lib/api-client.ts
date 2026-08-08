'use client';

import { API_BASE } from './config';
import { cartId, csrf } from './session';

/** Thrown on non-2xx responses; carries the HTTP status + server message. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Options = RequestInit & { auth?: boolean };

const SAFE_METHODS = new Set(['GET', 'HEAD']);

function buildHeaders(opts: Options): Headers {
  const headers = new Headers(opts.headers);
  const isForm = opts.body instanceof FormData;
  if (opts.body && !isForm && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Cookie-mode auth: tell both services to read the token from the HttpOnly
  // cookie (sent automatically because every request uses credentials).
  headers.set('X-Auth-Source', 'cookie');

  // CSRF double-submit: echo the readable csrf cookie on state-changing calls.
  const method = (opts.method ?? 'GET').toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    const token = csrf.token;
    if (token) headers.set('X-CSRF-Token', token);
  }

  const cid = cartId.get();
  if (cid) headers.set('X-Cart-Id', cid);
  return headers;
}

async function raw(path: string, opts: Options = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    // Always send/receive the auth + csrf cookies (cross-origin to the gateway).
    credentials: 'include',
    headers: buildHeaders(opts),
  });
}

async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message ?? json?.message ?? res.statusText;
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join(', ') : msg);
  }
  return (json.data ?? json) as T;
}

/**
 * Refresh the session cookies. The refresh token rides in its HttpOnly cookie,
 * so there's no body — the server rotates the cookies and we just report
 * whether it worked.
 */
async function tryRefresh(): Promise<boolean> {
  const res = await raw('/auth/refresh', { method: 'POST', auth: false });
  return res.ok;
}

/** Core request: unwraps the {success,data} envelope, refreshes once on 401. */
export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T> {
  let res = await raw(path, opts);
  if (res.status === 401 && opts.auth !== false && (await tryRefresh())) {
    res = await raw(path, opts);
  }
  return unwrap<T>(res);
}

export const api = {
  get: <T>(p: string) => apiFetch<T>(p),
  post: <T>(p: string, body?: unknown, auth = true) =>
    apiFetch<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined, auth }),
  patch: <T>(p: string, body?: unknown) =>
    apiFetch<T>(p, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(p: string, body?: unknown) =>
    apiFetch<T>(p, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(p: string) => apiFetch<T>(p, { method: 'DELETE' }),
  postForm: <T>(p: string, form: FormData) =>
    apiFetch<T>(p, { method: 'POST', body: form }),
};

/** Fetch a protected image (auth cookie sent automatically) → object URL. */
export async function fetchImageUrl(path: string): Promise<string> {
  const res = await raw(path);
  if (!res.ok) throw new ApiError(res.status, 'image failed');
  return URL.createObjectURL(await res.blob());
}

/**
 * SSE URL. EventSource can't set headers, but with `{ withCredentials: true }`
 * it sends the auth cookie, which the API accepts — so no token in the query.
 */
export const sseUrl = (path: string) => `${API_BASE}${path}`;
