/**
 * Programmatic entrypoint. Starts an Express app exposing the MCP server over
 * Streamable HTTP transport.
 *
 * Phase 1: no authentication on the `/mcp` route — the MCP server holds the
 * JWT it obtained via /auth/login. Phase 6 (issue #42) adds bearer-token
 * middleware that accepts JWT / API key / OAuth.
 *
 * Each request gets a fresh {@link StreamableHTTPServerTransport} (stateless
 * mode per the SDK examples). This is the right default for a server that
 * proxies every call to the API and never holds session state.
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

type McpRequestHandler = (req: Request, res: Response, body?: unknown) => Promise<void>;

/**
 * Build a per-request handler that creates a fresh `McpServer` +
 * `StreamableHTTPServerTransport` (stateless mode), forwards the request,
 * then tears both down.
 *
 * Centralizing this here means future changes (auth middleware, request
 * logging, telemetry, etc.) only need to happen in one place — see issue
 * #42 for the bearer-token wiring that will plug in here.
 */
function buildStatelessHandler(
  apiUrl: string,
  getToken: TokenSupplier,
): McpRequestHandler {
  return async (req, res, body) => {
    // Build a per-request API client so the bearer token is resolved at the
    // moment the request is processed (and can be rotated without restart).
    const api = new ApiClient(apiUrl, getToken);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const server = buildServer(api);

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } finally {
      // Tear down so the transport + server can be GC'd after the response
      // is flushed. Swallow close errors — the request already happened.
      await server.close().catch(() => undefined);
      await transport.close().catch(() => undefined);
    }
  };
}

export async function startServer(opts: StartServerOptions): Promise<RunningServer> {
  // Normalize the MCP mount path: strip leading + trailing slashes, then
  // re-prepend a single leading slash so Express mounts it cleanly regardless
  // of what the caller passed (`mcp`, `/mcp`, `//mcp///`, etc.).
  const mcpPath = `/${(opts.mcpPath ?? '/mcp').replace(/^\/+|\/+$/g, '') || 'mcp'}`;
  const port = opts.port ?? 3001;
  const host = opts.host ?? '127.0.0.1';

  const app = createMcpExpressApp({ host });

  // Health check — useful for `curl http://host:port/` from monitoring tools.
  app.get('/', (_req, res) => {
    res.json({
      name: 'flowforce-kanban-mcp',
      version: '0.1.0',
      mcpPath,
      status: 'ok',
    });
  });

  // POST is the main MCP entry point.
  const handlePost = buildStatelessHandler(opts.apiUrl, opts.getToken);
  app.post(mcpPath, async (req, res) => handlePost(req, res, req.body));

  // GET / DELETE on the MCP path are not part of the stateless contract —
  // return 405 with a JSON-RPC error body, matching the SDK's stateless
  // example. (If we ever need GET for SSE streams, that'll be a Phase 2+
  // feature and will require switching to stateful mode.)
  const methodNotAllowed = (method: string) => (_req: Request, res: Response): void => {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: `Method ${method} not allowed on this endpoint.` },
        id: null,
      }),
    );
  };
  app.get(mcpPath, methodNotAllowed('GET'));
  app.delete(mcpPath, methodNotAllowed('DELETE'));

  // 404 fallback for anything else.
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