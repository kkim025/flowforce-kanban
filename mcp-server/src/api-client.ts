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
    this.baseUrl = baseUrl.replace(/\/+$/, '');
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
      // 204 No Content — return undefined without trying to parse.
      if (response.status === 204) {
        return undefined as T;
      }
      // Some 2xx responses (200, 201, etc.) still have a JSON body.
      try {
        return (await response.json()) as T;
      } catch {
        // Non-JSON 2xx response; treat as empty success.
        return undefined as T;
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