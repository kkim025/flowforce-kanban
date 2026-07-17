/**
 * Resource unit tests.
 *
 * Strategy mirrors the tools tests: drive the server through the SDK's
 * InMemoryTransport so we exercise the real registration + dispatch path
 * without going over the wire.
 *
 * Per issue #38 acceptance criteria:
 *   - boards (fixed + templated)
 *   - one other templated URI (wiki page)
 *   - an unauthorized case (401 from the API surfaces as a resource error)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../src/server.js';
import { ApiClient } from '../src/api-client.js';

// Centralised factory so each test can override fetch behaviour per case
// without rebuilding the server from scratch (which would lose the
// singleton registration state McpServer maintains internally).
async function connectServerWithFetch(
  fetchImpl: ReturnType<typeof vi.fn>,
): Promise<{
  server: ReturnType<typeof buildServer>;
  client: Client;
  disconnect: () => Promise<void>;
}> {
  const api = new ApiClient(
    'http://api',
    () => 'tk-test',
    fetchImpl as unknown as typeof fetch,
  );
  const server = buildServer(api);
  const client = new Client(
    { name: 'test-client', version: '0.0.0' },
    { capabilities: {} },
  );
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientT), server.connect(serverT)]);
  return {
    server,
    client,
    disconnect: async () => {
      await client.close();
      await server.close();
    },
  };
}

describe('MCP resources (Phase 2 — issue #38)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  describe('capabilities + resources/list', () => {
    it('advertises both tools and resources capabilities', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '[]',
      });
      const { client, disconnect } = await connectServerWithFetch(fetchMock);
      try {
        const caps = client.getServerCapabilities();
        expect(caps).toBeDefined();
        expect(caps?.tools).toBeDefined();
        expect(caps?.resources).toBeDefined();
      } finally {
        await disconnect();
      }
    });

    it('registers all 14 URIs from issue #38 in resources/list + resources/templates/list', async () => {
      // Every resource eventually calls /boards or /me (notifications/me
      // are static) so the mock returns [] for any list endpoint.
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '[]',
      });
      const { client, disconnect } = await connectServerWithFetch(fetchMock);
      try {
        // The MCP spec splits fixed and templated resources across two
        // distinct list methods — the SDK exposes them as `listResources()`
        // (fixed) and `listResourceTemplates()` (templated).
        const { resources } = await client.listResources();
        const { resourceTemplates } = await client.listResourceTemplates();
        const uris = [
          ...resources.map((r) => r.uri),
          ...resourceTemplates.map((t) => t.uriTemplate),
        ].sort();

        // Static resources
        expect(uris).toContain('flowforce://boards');
        expect(uris).toContain('flowforce://notifications');
        expect(uris).toContain('flowforce://notifications/unread-count');
        expect(uris).toContain('flowforce://me');
        // Templated resources (issue #38 spec, exactly these 10)
        expect(uris).toContain('flowforce://boards/{boardId}');
        expect(uris).toContain('flowforce://boards/{boardId}/columns');
        expect(uris).toContain('flowforce://boards/{boardId}/tasks');
        expect(uris).toContain('flowforce://boards/{boardId}/sprints');
        expect(uris).toContain('flowforce://boards/{boardId}/sprints/active');
        expect(uris).toContain('flowforce://boards/{boardId}/tags');
        expect(uris).toContain('flowforce://boards/{boardId}/wiki');
        expect(uris).toContain('flowforce://boards/{boardId}/wiki/trash');
        expect(uris).toContain('flowforce://wiki/{pageId}');
        expect(uris).toContain('flowforce://wiki/{pageId}/versions');

        // 4 static + 10 templated = 14 total.
        expect(resources.length + resourceTemplates.length).toBe(14);
      } finally {
        await disconnect();
      }
    });
  });

  describe('boards resource (static URI)', () => {
    it('flowforce://boards hits GET /boards and returns the array', async () => {
      const boards = [
        { id: 'b1', title: 'Alpha' },
        { id: 'b2', title: 'Beta' },
      ];
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(boards),
      });

      const { client, disconnect } = await connectServerWithFetch(fetchMock);
      try {
        const result = await client.readResource({ uri: 'flowforce://boards' });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0]![0]).toBe('http://api/boards');
        const auth = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
        expect(auth['Authorization']).toBe('Bearer tk-test');
        expect(result.contents[0]!.mimeType).toBe('application/json');
        expect(JSON.parse(result.contents[0]!.text as string)).toEqual(boards);
      } finally {
        await disconnect();
      }
    });
  });

  describe('boards resource (templated URI)', () => {
    it('flowforce://boards/{boardId} hits GET /boards/{boardId}', async () => {
      const board = { id: 'b1', title: 'Alpha', columns: [] };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(board),
      });

      const { client, disconnect } = await connectServerWithFetch(fetchMock);
      try {
        const result = await client.readResource({
          uri: 'flowforce://boards/b1',
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0]![0]).toBe('http://api/boards/b1');
        // The substituted URI must appear in the response envelope, not the
        // raw template form. This is the contract `readCallback` callers
        // depend on.
        expect(result.contents[0]!.uri).toBe('flowforce://boards/b1');
        expect(JSON.parse(result.contents[0]!.text as string)).toEqual(board);
      } finally {
        await disconnect();
      }
    });

    it('flowforce://boards/{boardId}/columns hits GET /columns?boardId=...', async () => {
      const columns = [
        { id: 'c1', title: 'To Do', order: 0 },
        { id: 'c2', title: 'Done', order: 1 },
      ];
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(columns),
      });

      const { client, disconnect } = await connectServerWithFetch(fetchMock);
      try {
        await client.readResource({
          uri: 'flowforce://boards/b1/columns',
        });
        expect(fetchMock.mock.calls[0]![0]).toBe(
          'http://api/columns?boardId=b1',
        );
      } finally {
        await disconnect();
      }
    });
  });

  describe('board tasks resource (fan-out)', () => {
    it('flowforce://boards/{boardId}/tasks hits /columns then /tasks?columnId= per column', async () => {
      // The tasks resource does a fan-out: one /columns call, then one
      // /tasks?columnId= per column, in parallel. We verify both shapes hit
      // and the merged payload is well-formed.
      const columns = [
        { id: 'c1', title: 'To Do', order: 0 },
        { id: 'c2', title: 'Done', order: 1 },
      ];
      const tasksC1 = [{ id: 't1', title: 'A', columnId: 'c1' }];
      const tasksC2 = [
        { id: 't2', title: 'B', columnId: 'c2' },
        { id: 't3', title: 'C', columnId: 'c2' },
      ];
      fetchMock.mockImplementation(async (url: string | URL | Request) => {
        const u = String(url);
        if (u === 'http://api/columns?boardId=b1') {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(columns),
          };
        }
        if (u === 'http://api/tasks?columnId=c1') {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(tasksC1),
          };
        }
        if (u === 'http://api/tasks?columnId=c2') {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(tasksC2),
          };
        }
        throw new Error(`Unexpected URL: ${u}`);
      });

      const { client, disconnect } = await connectServerWithFetch(fetchMock);
      try {
        const result = await client.readResource({
          uri: 'flowforce://boards/b1/tasks',
        });
        expect(fetchMock).toHaveBeenCalledTimes(3);
        const payload = JSON.parse(result.contents[0]!.text as string) as {
          columns: Array<{ id: string }>;
          tasks: Array<{ id: string; title: string; columnId: string }>;
        };
        expect(payload.columns.map((c) => c.id)).toEqual(['c1', 'c2']);
        expect(payload.tasks.map((t) => t.id).sort()).toEqual([
          't1',
          't2',
          't3',
        ]);
        // The fan-out must annotate each task with its columnId so the LLM
        // can place it without re-querying.
        for (const t of payload.tasks) {
          expect(['c1', 'c2']).toContain(t.columnId);
        }
      } finally {
        await disconnect();
      }
    });
  });

  describe('wiki page resource (templated URI)', () => {
    it('flowforce://wiki/{pageId} hits GET /wiki/pages/{pageId}', async () => {
      const page = { id: 'p1', title: 'Onboarding', body: '# Welcome' };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(page),
      });

      const { client, disconnect } = await connectServerWithFetch(fetchMock);
      try {
        const result = await client.readResource({
          uri: 'flowforce://wiki/p1',
        });
        expect(fetchMock.mock.calls[0]![0]).toBe('http://api/wiki/pages/p1');
        expect(result.contents[0]!.uri).toBe('flowforce://wiki/p1');
        expect(JSON.parse(result.contents[0]!.text as string)).toEqual(page);
      } finally {
        await disconnect();
      }
    });
  });

  describe('unauthorized case (401 from API)', () => {
    it('surfaces as a resource read error when the API returns 401', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({ statusCode: 401, message: 'Unauthorized' }),
      });

      const { client, disconnect } = await connectServerWithFetch(fetchMock);
      try {
        // The SDK throws McpError with a JSON-RPC-shaped error code. We
        // verify the error is surfaced (not silently swallowed) and that it
        // carries the 401 status from the upstream API in the message.
        await expect(
          client.readResource({ uri: 'flowforce://boards/b1' }),
        ).rejects.toThrow(/401|Unauthorized/);
      } finally {
        await disconnect();
      }
    });
  });

  describe('me resource (static, user-scoped)', () => {
    it('flowforce://me hits GET /users/me', async () => {
      const user = { id: 'u1', email: 'pk@example.com', role: 'MEMBER' };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(user),
      });

      const { client, disconnect } = await connectServerWithFetch(fetchMock);
      try {
        await client.readResource({ uri: 'flowforce://me' });
        expect(fetchMock.mock.calls[0]![0]).toBe('http://api/users/me');
      } finally {
        await disconnect();
      }
    });
  });
});
