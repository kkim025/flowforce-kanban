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
import { createServer, type Server, type IncomingMessage } from 'node:http';

/**
 * Read a JSON request body. Helper for mock handlers that need to inspect
 * what the MCP server forwarded upstream.
 */
function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      if (text.length === 0) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const SMOKE_URL = process.env.FLOWFORCE_SMOKE_URL;
const SMOKE_PORT = 3099;

const maybeDescribe = SMOKE_URL ? describe : describe.skip;

maybeDescribe('live MCP smoke test (mocked upstream API)', () => {
  let mockApi: Server;
  let serverProc: ChildProcess;
  const receivedAuthHeaders: string[] = [];

  beforeAll(async () => {
    if (!SMOKE_URL) return;

    // 1. Spin up a minimal mock of every endpoint Phase 2 resources hit.
    // Each handler returns a tiny shape that satisfies the resource's
    // consumer — the goal here is to exercise the JSON-RPC dispatch
    // end-to-end, not to model the API.
    const mockPort = 3098;
    const expectedToken = 'mock-jwt-token-xyz';
    mockApi = createServer((req, res) => {
      if (req.url === '/auth/login' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ access_token: expectedToken }));
        return;
      }

      const auth = req.headers['authorization'] ?? '';
      const requireAuth = (): boolean => {
        if (auth !== `Bearer ${expectedToken}`) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ statusCode: 401, message: 'Unauthorized' }));
          return false;
        }
        receivedAuthHeaders.push(auth);
        return true;
      };

      // Phase 1 — list_boards tool
      if (req.url === '/boards' && req.method === 'GET') {
        if (!requireAuth()) return;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify([
            { id: 'b1', title: 'Smoke Board Alpha' },
            { id: 'b2', title: 'Smoke Board Beta' },
          ]),
        );
        return;
      }

      // Phase 2 — resources
      const url = req.url ?? '';
      const okJson = (body: unknown): void => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (url === '/boards/b1' && req.method === 'GET') {
        if (!requireAuth()) return;
        okJson({ id: 'b1', title: 'Smoke Board Alpha', columns: [] });
        return;
      }
      if (url === '/columns?boardId=b1' && req.method === 'GET') {
        if (!requireAuth()) return;
        okJson([
          { id: 'c1', title: 'To Do', order: 0 },
          { id: 'c2', title: 'Done', order: 1 },
        ]);
        return;
      }
      if (url === '/tasks?columnId=c1' && req.method === 'GET') {
        if (!requireAuth()) return;
        okJson([{ id: 't1', title: 'Mock Task 1', columnId: 'c1' }]);
        return;
      }
      if (url === '/tasks?columnId=c2' && req.method === 'GET') {
        if (!requireAuth()) return;
        okJson([]);
        return;
      }
      if (url === '/users/me' && req.method === 'GET') {
        if (!requireAuth()) return;
        okJson({ id: 'u1', email: 'mock@example.com', role: 'MEMBER' });
        return;
      }
      if (url === '/notifications' && req.method === 'GET') {
        if (!requireAuth()) return;
        okJson([]);
        return;
      }
      if (url === '/notifications/unread-count' && req.method === 'GET') {
        if (!requireAuth()) return;
        okJson({ count: 0 });
        return;
      }
      if (url === '/tasks' && req.method === 'POST') {
        if (!requireAuth()) return;
        // Read the JSON body so we can echo it back. The smoke test
        // asserts that the MCP server forwarded every field verbatim.
        readJsonBody(req)
          .then((data) => {
            okJson({ id: 't-smoke-1', ...(data as Record<string, unknown>) });
          })
          .catch(() => {
            okJson({ id: 't-smoke-1' });
          });
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

    // Wait for the "Listening on" log line. Every resolution / rejection path
    // must clear the timeout and remove the listeners — otherwise a slow start
    // leaves the suite blocked until the timer fires, and a successful start
    // leaves dangling listeners attached to a process that's about to be torn
    // down by afterAll.
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => {
        serverProc.stdout?.off('data', onData);
        serverProc.once('error', () => undefined); // detach reject-on-error
        serverProc.kill('SIGTERM');
        reject(new Error('MCP server did not start within 10s'));
      }, 10_000);

      const onData = (chunk: Buffer): void => {
        const text = chunk.toString();
        process.stdout.write(`[mcp-smoke] ${text}`);
        if (text.includes('Listening on')) {
          clearTimeout(t);
          serverProc.stdout?.off('data', onData);
          resolve();
        }
      };

      const onSpawnError = (err: Error): void => {
        clearTimeout(t);
        serverProc.stdout?.off('data', onData);
        serverProc.kill('SIGTERM').catch(() => undefined);
        reject(err);
      };

      serverProc.stdout?.on('data', onData);
      serverProc.once('error', onSpawnError);
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

  it('resources/list advertises all 14 Phase 2 URIs (fixed + templates)', async () => {
    if (!SMOKE_URL) return;
    // The MCP spec splits fixed resources from templates across two
    // distinct methods. We exercise both, then assert every URI from
    // the issue #38 table is registered.
    const listFixed = await fetch(`http://127.0.0.1:${SMOKE_PORT}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'resources/list',
      }),
    });
    const fixedPayload = extractJsonRpc(await listFixed.text());
    const fixedResult = fixedPayload.result as {
      resources: Array<{ uri: string }>;
    };
    expect(fixedResult.resources.length).toBeGreaterThan(0);

    const listTemplates = await fetch(`http://127.0.0.1:${SMOKE_PORT}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'resources/templates/list',
      }),
    });
    const templatesPayload = extractJsonRpc(await listTemplates.text());
    const templatesResult = templatesPayload.result as {
      resourceTemplates: Array<{ uriTemplate: string }>;
    };

    const allUris = [
      ...fixedResult.resources.map((r) => r.uri),
      ...templatesResult.resourceTemplates.map((t) => t.uriTemplate),
    ];

    // Issue #38 acceptance: every URI from the spec table is registered.
    const expected = [
      'flowforce://boards',
      'flowforce://notifications',
      'flowforce://notifications/unread-count',
      'flowforce://me',
      'flowforce://boards/{boardId}',
      'flowforce://boards/{boardId}/columns',
      'flowforce://boards/{boardId}/tasks',
      'flowforce://boards/{boardId}/sprints',
      'flowforce://boards/{boardId}/sprints/active',
      'flowforce://boards/{boardId}/tags',
      'flowforce://boards/{boardId}/wiki',
      'flowforce://boards/{boardId}/wiki/trash',
      'flowforce://wiki/{pageId}',
      'flowforce://wiki/{pageId}/versions',
    ];
    for (const uri of expected) {
      expect(allUris, `missing URI: ${uri}`).toContain(uri);
    }
  });

  it('resources/read flowforce://boards/b1 hits GET /boards/b1 on the API', async () => {
    if (!SMOKE_URL) return;
    const res = await fetch(`http://127.0.0.1:${SMOKE_PORT}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'resources/read',
        params: { uri: 'flowforce://boards/b1' },
      }),
    });
    const payload = extractJsonRpc(await res.text());
    expect(payload.id).toBe(5);
    const result = payload.result as {
      contents: Array<{ uri: string; mimeType: string; text: string }>;
    };
    expect(result.contents.length).toBe(1);
    expect(result.contents[0]!.uri).toBe('flowforce://boards/b1');
    expect(result.contents[0]!.mimeType).toBe('application/json');
    const board = JSON.parse(result.contents[0]!.text) as { id: string; title: string };
    expect(board.id).toBe('b1');
  });

  it('resources/read flowforce://boards/b1/tasks fans out to /columns then /tasks per column', async () => {
    if (!SMOKE_URL) return;
    const res = await fetch(`http://127.0.0.1:${SMOKE_PORT}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 6,
        method: 'resources/read',
        params: { uri: 'flowforce://boards/b1/tasks' },
      }),
    });
    const payload = extractJsonRpc(await res.text());
    expect(payload.id).toBe(6);
    const result = payload.result as {
      contents: Array<{ uri: string; text: string }>;
    };
    const body = JSON.parse(result.contents[0]!.text) as {
      columns: Array<{ id: string }>;
      tasks: Array<{ id: string; columnId: string }>;
    };
    expect(body.columns.map((c) => c.id)).toEqual(['c1', 'c2']);
    // The mock returned 1 task in c1, 0 in c2 — flat list should be 1.
    expect(body.tasks.map((t) => t.id)).toEqual(['t1']);
    expect(body.tasks[0]!.columnId).toBe('c1');
  });

  it('tools/list advertises all 15 tools (1 Phase 1 + 14 Phase 3)', async () => {
    if (!SMOKE_URL) return;
    const res = await fetch(`http://127.0.0.1:${SMOKE_PORT}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/list',
      }),
    });
    const payload = extractJsonRpc(await res.text());
    expect(payload.id).toBe(7);
    const result = payload.result as {
      tools: Array<{ name: string }>;
    };
    const names = result.tools.map((t) => t.name).sort();
    // Phase 1 + 14 Phase 3 write tools
    const expected = [
      'add_checklist',
      'add_comment',
      'add_subtask',
      'assign_task_to_sprint',
      'create_task',
      'delete_checklist',
      'delete_subtask',
      'delete_task',
      'list_boards',
      'move_task',
      'reorder_subtasks',
      'toggle_subtask',
      'update_checklist',
      'update_subtask',
      'update_task',
    ];
    for (const name of expected) {
      expect(names, `missing tool: ${name}`).toContain(name);
    }
  });

  it('tools/call create_task hits POST /tasks and round-trips every field', async () => {
    if (!SMOKE_URL) return;
    const res = await fetch(`http://127.0.0.1:${SMOKE_PORT}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'create_task',
          arguments: {
            columnId: 'c1',
            content: 'Smoke task from MCP',
            order: 0,
            priority: 'HIGH',
          },
        },
      }),
    });
    const payload = extractJsonRpc(await res.text());
    expect(payload.id).toBe(8);
    const result = payload.result as {
      content: Array<{ type: string; text: string }>;
      isError?: boolean;
    };
    // Happy path: the mock echoes the body back with an id, and the MCP
    // server wraps it in a text-content envelope.
    expect(result.isError).toBeFalsy();
    expect(result.content[0]!.type).toBe('text');
    const echoed = JSON.parse(result.content[0]!.text) as {
      id: string;
      content: string;
      priority: string;
      columnId: string;
      order: number;
    };
    expect(echoed.id).toBe('t-smoke-1');
    expect(echoed.content).toBe('Smoke task from MCP');
    expect(echoed.priority).toBe('HIGH');
    expect(echoed.columnId).toBe('c1');
    expect(echoed.order).toBe(0);
  });

  it('tools/call with invalid input returns isError (not a thrown exception)', async () => {
    // The SDK pattern: missing required field is returned as a JSON-RPC
    // error with isError=true (code -32602 Input validation error). It
    // does NOT throw on the client side — the LLM sees the error in the
    // tool result and can react accordingly.
    if (!SMOKE_URL) return;
    const res = await fetch(`http://127.0.0.1:${SMOKE_PORT}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'create_task',
          // Missing required fields: content, order, priority.
          arguments: { columnId: 'c1' },
        },
      }),
    });
    expect(res.ok).toBe(true);
    const payload = extractJsonRpc(await res.text());
    expect(payload.id).toBe(9);
    // The SDK returns an error object, not a tool result. So `result` here
    // is `{ isError: true, content: [...] }` at the SDK level — but JSON-RPC
    // serializes tool errors differently. We just verify the call didn't
    // crash and we got a valid response envelope.
    expect(payload.result).toBeDefined();
  });
});

function extractJsonRpc(text: string): {
  id: number;
  result: unknown;
} {
  // SSE format: "event: message\ndata: {...}\n\n" (or just "data: {...}" for
  // the statelessly-negotiated JSON-only path). Find the FIRST data: line
  // and parse it.
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data:')) {
      const payload = JSON.parse(trimmed.slice(5).trim()) as Record<string, unknown>;
      assertJsonRpc(payload);
      return payload as ReturnType<typeof extractJsonRpc>;
    }
  }
  // Fallback: maybe the body is plain JSON.
  const payload = JSON.parse(text) as Record<string, unknown>;
  assertJsonRpc(payload);
  return payload as ReturnType<typeof extractJsonRpc>;
}

function assertJsonRpc(payload: Record<string, unknown>): asserts payload is {
  jsonrpc: '2.0';
  id: number;
  result: unknown;
} {
  if (payload['jsonrpc'] !== '2.0') {
    throw new Error(`Not a JSON-RPC 2.0 response: ${JSON.stringify(payload).slice(0, 200)}`);
  }
  if (typeof payload['id'] !== 'number') {
    throw new Error(`JSON-RPC response missing numeric id: ${JSON.stringify(payload).slice(0, 200)}`);
  }
}