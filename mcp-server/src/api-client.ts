/**
 * Thin HTTP client for the FlowForce Kanban REST API.
 *
 * Design contract:
 *   - No caching layer. Every call hits the API.
 *   - The bearer token is resolved through a closure on every request, so token
 *     rotation in the parent session is reflected on the next call without
 *     needing to rebuild the client.
 *   - Errors are surfaced as {@link ApiClientError} with the HTTP status and the
 *     parsed body, so MCP tools can decide how to present them to the LLM.
 */

export type TokenSupplier = () => string | undefined;

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `FlowForce API error ${status}`);
    this.name = 'ApiClientError';
    this.status = status;
    this.body = body;
  }
}

export interface ApiClientOptions {
  /** Optional AbortSignal for cooperative cancellation (e.g. per-request timeouts). */
  signal?: AbortSignal;
  /** Optional extra headers (e.g. tracing IDs). */
  extraHeaders?: Record<string, string>;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getToken: TokenSupplier;
  private readonly defaultFetch: typeof fetch;

  constructor(
    baseUrl: string,
    getToken: TokenSupplier,
    fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {
    // Strip trailing slashes so `${baseUrl}/${path}` joins cleanly.
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    // Defensive URL validation — refuse anything that isn't http(s). Cheap
    // guard against typos like `--api-url "localhost:5000"` (no scheme) or
    // `--api-url "javascript:..."` (would be a no-op in Node, but better to
    // fail loudly than silently misroute requests).
    try {
      const u = new URL(this.baseUrl);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        throw new Error(`Unsupported protocol: ${u.protocol}`);
      }
    } catch (err) {
      throw new Error(`Invalid apiUrl "${baseUrl}": ${(err as Error).message}`);
    }
    this.getToken = getToken;
    this.defaultFetch = fetchImpl;
  }

  async get<T = unknown>(path: string, opts: ApiClientOptions = {}): Promise<T> {
    return this.request<T>('GET', path, undefined, opts);
  }

  async post<T = unknown>(path: string, body?: unknown, opts: ApiClientOptions = {}): Promise<T> {
    return this.request<T>('POST', path, body, opts);
  }

  async patch<T = unknown>(path: string, body?: unknown, opts: ApiClientOptions = {}): Promise<T> {
    return this.request<T>('PATCH', path, body, opts);
  }

  async put<T = unknown>(path: string, body?: unknown, opts: ApiClientOptions = {}): Promise<T> {
    return this.request<T>('PUT', path, body, opts);
  }

  async delete<T = unknown>(path: string, opts: ApiClientOptions = {}): Promise<T> {
    return this.request<T>('DELETE', path, undefined, opts);
  }

  private buildUrl(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalized}`;
  }

  private buildHeaders(opts: ApiClientOptions): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(opts.extraHeaders ?? {}),
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(
    method: string,
    path: string,
    body: unknown,
    opts: ApiClientOptions,
  ): Promise<T> {
    const url = this.buildUrl(path);
    const headers = this.buildHeaders(opts);

    const init: RequestInit = { method, headers };
    if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    if (opts.signal) {
      init.signal = opts.signal;
    }

    const response = await this.defaultFetch(url, init);

    if (response.ok) {
      // 204 No Content — no body by spec.
      if (response.status === 204) {
        return undefined as T;
      }
      // For other 2xx, read the body once. Empty body is treated as a
      // well-defined "no payload" success. Anything else must be valid JSON
      // — a non-JSON 2xx body is almost certainly a proxy error page
      // misclassified as success, so we surface it instead of silently
      // returning undefined.
      const text = await response.text();
      if (text.length === 0) {
        return undefined as T;
      }
      try {
        return JSON.parse(text) as T;
      } catch (err) {
        throw new ApiClientError(
          response.status,
          { rawBody: text.slice(0, 2048) },
          `FlowForce API returned non-JSON 2xx body: ${(err as Error).message}`,
        );
      }
    }

    // Non-2xx — capture the body for the caller.
    let parsedBody: unknown;
    try {
      const text = await response.text();
      parsedBody = text.length > 0 ? JSON.parse(text) : undefined;
    } catch {
      parsedBody = undefined;
    }
    throw new ApiClientError(response.status, parsedBody);
  }
}