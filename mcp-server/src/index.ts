/**
 * Programmatic entrypoint. Starts an Express app exposing the MCP server over
 * Streamable HTTP transport.
 *
 * Phase 1: no authentication on the `/mcp` route — the MCP server holds the
 * JWT it obtained via /auth/login. Phase 6 (issue #42) adds bearer-token
 * middleware that accepts JWT / API key / OAuth.
 */

import express, { type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { buildServer } from './server.js';
import { ApiClient, type TokenSupplier } from './api-client.js';

export interface StartServerOptions {
  /** Bearer token supplier. Called once per incoming MCP request. */
  getToken: TokenSupplier;
  /** URL of the FlowForce REST API (no trailing slash). */
  apiUrl: string;
  /** Path to mount MCP on. Defaults to `/mcp`. */
  mcpPath?: string;
  /** Port to listen on. Defaults to 3001. */
  port?: number;
  /** Bind host. Defaults to 127.0.0.1 (DNS-rebinding-safe). */
  host?: string;
}

export interface RunningServer {
  port: number;
  host: string;
  close: () => Promise<void>;
}

/**
 * Start the MCP server. Resolves once the HTTP listener is ready.
 *
 * Each request gets a fresh {@link StreamableHTTPServerTransport} — this is
 * the "stateless" pattern from the SDK examples and the right default for a
 * server where every call hits the API and there's no need to hold a session.
 */
export async function startServer(opts: StartServerOptions): Promise<RunningServer> {
  const mcpPath = (opts.mcpPath ?? '/mcp').replace(/\/+$/, '') || '/mcp';
  const port = opts.port ?? 3001;
  const host = opts.host ?? '127.0.0.1';

  const app = createMcpExpressApp({ host });

  app.get('/', (_req, res) => {
    res.json({
      name: 'flowforce-kanban-mcp',
      version: '0.1.0',
      mcpPath,
      status: 'ok',
    });
  });

  app.post(mcpPath, async (req: Request, res: Response) => {
    // Build a per-request API client so the bearer token is resolved at the
    // moment the request is processed (and can be rotated without restart).
    const api = new ApiClient(opts.apiUrl, opts.getToken);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    const server = buildServer(api);

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } finally {
      // Detach so the transport can be GC'd after the response is flushed.
      await server.close().catch(() => undefined);
      await transport.close().catch(() => undefined);
    }
  });

  // Some clients (older SSE ones) also need GET/DELETE on the same path.
  app.get(mcpPath, async (req: Request, res: Response) => {
    const api = new ApiClient(opts.apiUrl, opts.getToken);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const server = buildServer(api);
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } finally {
      await server.close().catch(() => undefined);
      await transport.close().catch(() => undefined);
    }
  });

  app.delete(mcpPath, async (req: Request, res: Response) => {
    const api = new ApiClient(opts.apiUrl, opts.getToken);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const server = buildServer(api);
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } finally {
      await server.close().catch(() => undefined);
      await transport.close().catch(() => undefined);
    }
  });

  // Fallback: 404 for everything else.
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  const httpServer = app.listen(port, host);

  await new Promise<void>((resolve, reject) => {
    httpServer.once('listening', () => resolve());
    httpServer.once('error', reject);
  });

  return {
    port,
    host,
    close: () =>
      new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

// Re-export for programmatic consumers (tests).
export { express, buildServer };