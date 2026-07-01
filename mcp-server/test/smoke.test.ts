/**
 * Live MCP smoke test: starts a real MCP server binary (the same `dist/cli.js`
 * users will run via `npx flowforce-kanban-mcp`) with a **mocked upstream
 * API** on a local port, then exercises the MCP JSON-RPC `tools/list` and
 * `tools/call list_boards` endpoints and asserts the boards come back.
 *
 * Why a mocked API instead of a real FlowForce instance?
 *   - Self-contained — runs in CI without Postgres / NestJS
 *   - Doesn't depend on the live API's auth chain being healthy
 *   - Still exercises the real `McpServer` factory, the real Streamable HTTP
 *     transport, and the real JSON-RPC wire format end-to-end
 *
 * Skipped unless FLOWFORCE_SMOKE_URL is set.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type Server } from 'node:http';

const SMOKE_URL = process.env.FLOWFORCE_SMOKE_URL;
const SMOKE_PORT = 3099;

const maybeDescribe = SMOKE_URL ? describe : describe.skip;

maybeDescribe('live MCP smoke test (mocked upstream API)', () => {
  let mockApi: Server;
  let serverProc: ChildProcess;
  const receivedAuthHeaders: string[] = [];

  beforeAll(async () => {
    if (!SMOKE_URL) return;

    // 1. Spin up a minimal mock of GET /boards on 127.0.0.1:3098
    const mockPort = 3098;
    const expectedToken = 'mock-jwt-token-xyz';
    mockApi = createServer((req, res) => {
      if (req.url === '/auth/login' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ access_token: expectedToken }));
        return;
      }
      if (req.url === '/boards' && req.method === 'GET') {
        const auth = req.headers['authorization'] ?? '';
        receivedAuthHeaders.push(auth);
        if (auth !== `Bearer ${expectedToken}`) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 401, message: 'Unauthorized' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify([
            { id: 'b1', title: 'Smoke Board Alpha' },
            { id: 'b2', title: 'Smoke Board Beta' },
          ]),
        );
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => mockApi.listen(mockPort, '127.0.0.1', resolve));

    // 2. Spawn the MCP server as a real process
    serverProc = spawn('node', ['dist/cli.js'], {
      cwd: import.meta.dirname + '/..',
      env: {
        ...process.env,
        FLOWFORCE_API_URL: `http://127.0.0.1:${mockPort}`,
        FLOWFORCE_PORT: String(SMOKE_PORT),
        FLOWFORCE_EMAIL: 'mock@example.com',
        FLOWFORCE_PASSWORD: 'mockpw',
        NODE_ENV: 'test',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Wait for the "Listening on" log line
    await new Promise<void>((resolve, reject) => {
      const onData = (chunk: Buffer): void => {
        const text = chunk.toString();
        process.stdout.write(`[mcp-smoke] ${text}`);
        if (text.includes('Listening on')) {
          serverProc.stdout?.off('data', onData);
          resolve();
        }
      };
      serverProc.stdout?.on('data', onData);
      serverProc.on('error', reject);
      setTimeout(() => reject(new Error('MCP server did not start within 10s')), 10_000);
    });
  }, 30_000);

  afterAll(async () => {
    if (serverProc && !serverProc.killed) {
      serverProc.kill('SIGTERM');
      // Give it a moment
      await new Promise((r) => setTimeout(r, 500));
    }
    if (mockApi) {
      await new Promise<void>((resolve) => mockApi.close(() => resolve()));
    }
  });

  it('GET / returns a health-check JSON', async () => {
    if (!SMOKE_URL) return;
    const res = await fetch(`http://127.0.0.1:${SMOKE_PORT}/`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { name: string; mcpPath: string; status: string };
    expect(body.name).toBe('flowforce-kanban-mcp');
    expect(body.mcpPath).toBe('/mcp');
    expect(body.status).toBe('ok');
  });

  it('tools/list returns list_boards', async () => {
    if (!SMOKE_URL) return;
    const res = await fetch(`http://127.0.0.1:${SMOKE_PORT}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      }),
    });
    expect(res.ok).toBe(true);
    const text = await res.text();
    const payload = extractJsonRpc(text);
    expect(payload.id).toBe(1);
    expect(payload.result.tools?.map((t) => t.name) ?? []).toContain('list_boards');
  });

  it('tools/call list_boards hits the API and returns the boards', async () => {
    if (!SMOKE_URL) return;
    const res = await fetch(`http://127.0.0.1:${SMOKE_PORT}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'list_boards' },
      }),
    });
    expect(res.ok).toBe(true);
    const text = await res.text();
    const payload = extractJsonRpc(text);
    expect(payload.id).toBe(2);
    expect(payload.result).toBeDefined();
    const toolContent = payload.result.content[0];
    expect(toolContent.type).toBe('text');
    const boards = JSON.parse(toolContent.text) as Array<{ id: string; title: string }>;
    expect(boards.map((b) => b.title)).toEqual([
      'Smoke Board Alpha',
      'Smoke Board Beta',
    ]);

    // Sanity: the mock API must have seen the JWT we obtained at startup
    expect(receivedAuthHeaders.length).toBeGreaterThan(0);
    expect(receivedAuthHeaders.at(-1)).toBe('Bearer mock-jwt-token-xyz');
  });
});

function extractJsonRpc(text: string): {
  id: number;
  result: { tools?: Array<{ name: string }>; content: Array<{ type: string; text: string }> };
} {
  // SSE format: "event: message\ndata: {...}\n\n"
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data:')) {
      return JSON.parse(trimmed.slice(5).trim());
    }
  }
  return JSON.parse(text);
}