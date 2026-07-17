/**
 * Auth provider for Phase 1 hello-world smoke test only.
 *
 * Phase 6 (issue #42) replaces this entirely with a per-request bearer token
 * supplied by the LLM client. For now we need a way to obtain a JWT so the
 * MCP server can call the protected FlowForce endpoints.
 *
 * Strategy:
 *   1. Try to use a pre-existing token from {@link getToken} if it returns one.
 *   2. Otherwise, perform a POST /auth/login with FLOWFORCE_EMAIL/PASSWORD
 *      and cache the resulting access_token.
 */

import type { TokenSupplier } from './api-client.js';
import { ApiClient, ApiClientError } from './api-client.js';

export interface StaticLoginAuthOptions {
  apiUrl: string;
  email: string;
  password: string;
}

export interface StaticLoginAuth {
  getToken: TokenSupplier;
  /** Force a fresh login (drops the cached token). */
  refresh: () => Promise<void>;
}

interface LoginResponse {
  access_token: string;
}

export async function createStaticLoginAuth(opts: StaticLoginAuthOptions): Promise<StaticLoginAuth> {
  let cachedToken: string | undefined;

  const loginClient = new ApiClient(opts.apiUrl, () => undefined);

  const doLogin = async (): Promise<string> => {
    try {
      const res = await loginClient.post<LoginResponse>('/auth/login', {
        email: opts.email,
        password: opts.password,
      });
      if (!res.access_token) {
        throw new Error('Login response missing access_token');
      }
      return res.access_token;
    } catch (err) {
      if (err instanceof ApiClientError) {
        throw new Error(
          `FlowForce login failed (HTTP ${err.status}). Check FLOWFORCE_EMAIL / FLOWFORCE_PASSWORD in mcp-server/.env.`,
          { cause: err },
        );
      }
      throw err;
    }
  };

  // Resolve on construction so we fail fast on bad credentials rather than
  // at first MCP request.
  cachedToken = await doLogin();

  return {
    getToken: () => cachedToken,
    refresh: async () => {
      cachedToken = await doLogin();
    },
  };
}