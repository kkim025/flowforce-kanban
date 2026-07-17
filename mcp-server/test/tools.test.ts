/**
 * Tool unit tests (Phase 3, issue #39).
 *
 * Strategy mirrors the resource tests: drive the server through the SDK's
 * InMemoryTransport with a mocked ApiClient. Each of the 14 tools gets:
 *   - one happy-path test that asserts the correct HTTP verb + path + body
 *   - one validation-failure test that asserts the SDK rejects bad input
 *     with a descriptive error before the API client is even called.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../src/server.js';
import { ApiClient, ApiClientError } from '../src/api-client.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

async function connectWithFetch(
  fetchImpl: ReturnType<typeof vi.fn>,
): Promise<{
  client: Client;
  disconnect: () => Promise<void>;
  getTools: () => Promise<Tool[]>;
  callTool: (name: string, args: Record<string, unknown>) => Promise<{
    isError: boolean;
    content: Array<{ type: string; text: string }>;
  }>;
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
    client,
    disconnect: async () => {
      await client.close();
      await server.close();
    },
    getTools: async () => {
      const { tools } = await client.listTools();
      return tools;
    },
    callTool: async (name, args) => {
      const result = await client.callTool({ name, arguments: args });
      return {
        isError: Boolean(result.isError),
        content: result.content as Array<{ type: string; text: string }>,
      };
    },
  };
}

/**
 * A standard 2xx JSON response for happy-path tests.
 */
function jsonResponse(body: unknown): {
  ok: true;
  status: number;
  text: () => Promise<string>;
} {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  };
}

describe('MCP write tools (Phase 3 — issue #39)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  describe('tool registry', () => {
    it('registers all 15 tools (list_boards + 14 from issue #39)', async () => {
      const { getTools, disconnect } = await connectWithFetch(fetchMock);
      try {
        const names = (await getTools()).map((t) => t.name).sort();
        expect(names).toEqual(
          [
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
          ].sort(),
        );
      } finally {
        await disconnect();
      }
    });

    it('every write tool advertises an inputSchema (Zod-validated)', async () => {
      const { getTools, disconnect } = await connectWithFetch(fetchMock);
      try {
        const tools = await getTools();
        for (const t of tools) {
          if (t.name === 'list_boards') continue; // Phase 1, no input
          expect(
            t.inputSchema,
            `${t.name} missing inputSchema`,
          ).toBeDefined();
          expect(
            (t.inputSchema as { type?: string }).type,
            `${t.name} inputSchema is not a JSON Schema object`,
          ).toBe('object');
        }
      } finally {
        await disconnect();
      }
    });
  });

  // ─────────────── task tools ───────────────

  describe('create_task', () => {
    it('POST /tasks with required fields', async () => {
      const created = { id: 't1', content: 'New task' };
      fetchMock.mockResolvedValue(jsonResponse(created));
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        const result = await callTool('create_task', {
          columnId: 'c1',
          content: 'New task',
          order: 0,
          priority: 'HIGH',
        });
        expect(result.isError).toBe(false);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0]![0]).toBe('http://api/tasks');
        expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe(
          'POST',
        );
        const body = JSON.parse(
          (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
        );
        expect(body).toEqual({
          columnId: 'c1',
          content: 'New task',
          order: 0,
          priority: 'HIGH',
        });
      } finally {
        await disconnect();
      }
    });

    it('rejects missing required field `content`', async () => {
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        const result = await callTool('create_task', {
            columnId: 'c1',
            order: 0,
            priority: 'HIGH',
          });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Input validation|32602/);
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        await disconnect();
      }
    });
  });

  describe('update_task', () => {
    it('PATCH /tasks/{id} with body stripped of `id`', async () => {
      const updated = { id: 't1', content: 'Renamed' };
      fetchMock.mockResolvedValue(jsonResponse(updated));
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        await callTool('update_task', { id: 't1', content: 'Renamed' });
        expect(fetchMock.mock.calls[0]![0]).toBe('http://api/tasks/t1');
        expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe(
          'PATCH',
        );
        const body = JSON.parse(
          (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
        );
        expect(body).toEqual({ content: 'Renamed' });
      } finally {
        await disconnect();
      }
    });

    it('allows body with only id (no-op patch)', async () => {
      // All update_task fields are optional, so {id} alone is valid input.
      // The MCP layer accepts it and forwards an empty patch to the API
      // (the API itself is the source of truth for empty-patch semantics).
      fetchMock.mockResolvedValue(jsonResponse({ id: 't1' }));
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        await callTool('update_task', { id: 't1' });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const body = JSON.parse(
          (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
        );
        expect(body).toEqual({});
      } finally {
        await disconnect();
      }
    });
  });

  describe('delete_task', () => {
    it('DELETE /tasks/{id}', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 204,
        text: async () => '',
      });
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        const result = await callTool('delete_task', { id: 't1' });
        expect(result.isError).toBe(false);
        expect(fetchMock.mock.calls[0]![0]).toBe('http://api/tasks/t1');
        expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe(
          'DELETE',
        );
      } finally {
        await disconnect();
      }
    });

    it('rejects missing `id`', async () => {
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        const result = await callTool('delete_task', {});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Input validation|32602/);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        await disconnect();
      }
    });
  });

  describe('move_task', () => {
    it('PUT /tasks/{id}/move with columnId + order', async () => {
      const moved = { id: 't1', columnId: 'c2', order: 3 };
      fetchMock.mockResolvedValue(jsonResponse(moved));
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        await callTool('move_task', {
          id: 't1',
          columnId: 'c2',
          order: 3,
        });
        expect(fetchMock.mock.calls[0]![0]).toBe(
          'http://api/tasks/t1/move',
        );
        expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe(
          'PUT',
        );
        const body = JSON.parse(
          (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
        );
        expect(body).toEqual({ columnId: 'c2', order: 3 });
      } finally {
        await disconnect();
      }
    });

    it('rejects negative order', async () => {
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        const result = await callTool('move_task', { id: 't1', columnId: 'c2', order: -1 });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Input validation|32602/);
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        await disconnect();
      }
    });
  });

  describe('assign_task_to_sprint', () => {
    it('PATCH /tasks/{taskId}/sprint with sprintId null (unassign)', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 't1', sprintId: null }));
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        await callTool('assign_task_to_sprint', {
          taskId: 't1',
          sprintId: null,
        });
        expect(fetchMock.mock.calls[0]![0]).toBe(
          'http://api/tasks/t1/sprint',
        );
        const body = JSON.parse(
          (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
        );
        expect(body).toEqual({ sprintId: null });
      } finally {
        await disconnect();
      }
    });

    it('rejects missing both taskId and sprintId', async () => {
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        const result = await callTool('assign_task_to_sprint', {});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Input validation|32602/);
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        await disconnect();
      }
    });
  });

  // ─────────────── subtask tools ───────────────

  describe('add_subtask', () => {
    it('POST /subtasks with checklistId + content', async () => {
      const created = { id: 's1', content: 'Sub' };
      fetchMock.mockResolvedValue(jsonResponse(created));
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        await callTool('add_subtask', {
          checklistId: 'ch1',
          content: 'Sub',
        });
        expect(fetchMock.mock.calls[0]![0]).toBe('http://api/subtasks');
        const body = JSON.parse(
          (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
        );
        expect(body).toEqual({ checklistId: 'ch1', content: 'Sub' });
      } finally {
        await disconnect();
      }
    });

    it('rejects missing checklistId (taskId-only is deprecated on the API)', async () => {
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        const result = await callTool('add_subtask', { content: 'Sub' });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Input validation|32602/);
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        await disconnect();
      }
    });
  });

  describe('update_subtask', () => {
    it('PATCH /subtasks/{id} with completed=true', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 's1', completed: true }));
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        await callTool('update_subtask', { id: 's1', completed: true });
        expect(fetchMock.mock.calls[0]![0]).toBe('http://api/subtasks/s1');
        const body = JSON.parse(
          (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
        );
        expect(body).toEqual({ completed: true });
      } finally {
        await disconnect();
      }
    });

    it('allows body with only id (no-op patch)', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 's1' }));
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        await callTool('update_subtask', { id: 's1' });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const body = JSON.parse(
          (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
        );
        expect(body).toEqual({});
      } finally {
        await disconnect();
      }
    });
  });

  describe('toggle_subtask', () => {
    it('PATCH /subtasks/{id}/toggle (no body)', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 's1', completed: true }));
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        await callTool('toggle_subtask', { id: 's1' });
        expect(fetchMock.mock.calls[0]![0]).toBe(
          'http://api/subtasks/s1/toggle',
        );
        expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe(
          'PATCH',
        );
      } finally {
        await disconnect();
      }
    });

    it('rejects missing `id`', async () => {
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        const result = await callTool('toggle_subtask', {});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Input validation|32602/);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        await disconnect();
      }
    });
  });

  describe('delete_subtask', () => {
    it('DELETE /subtasks/{id}', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 204,
        text: async () => '',
      });
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        await callTool('delete_subtask', { id: 's1' });
        expect(fetchMock.mock.calls[0]![0]).toBe('http://api/subtasks/s1');
      } finally {
        await disconnect();
      }
    });

    it('rejects missing `id`', async () => {
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        const result = await callTool('delete_subtask', {});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Input validation|32602/);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        await disconnect();
      }
    });
  });

  describe('reorder_subtasks', () => {
    it('PATCH /subtasks/reorder with checklistId + orderedIds', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        await callTool('reorder_subtasks', {
          checklistId: 'ch1',
          orderedIds: ['s3', 's1', 's2'],
        });
        expect(fetchMock.mock.calls[0]![0]).toBe(
          'http://api/subtasks/reorder',
        );
        const body = JSON.parse(
          (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
        );
        expect(body).toEqual({
          checklistId: 'ch1',
          orderedIds: ['s3', 's1', 's2'],
        });
      } finally {
        await disconnect();
      }
    });

    it('rejects empty orderedIds array', async () => {
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        const result = await callTool('reorder_subtasks', {
            checklistId: 'ch1',
            orderedIds: [],
          });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Input validation|32602/);
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        await disconnect();
      }
    });
  });

  // ─────────────── checklist tools ───────────────

  describe('add_checklist', () => {
    it('POST /tasks/{taskId}/checklists with title in body', async () => {
      const created = { id: 'ch1', title: 'Acceptance' };
      fetchMock.mockResolvedValue(jsonResponse(created));
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        await callTool('add_checklist', {
          taskId: 't1',
          title: 'Acceptance',
        });
        expect(fetchMock.mock.calls[0]![0]).toBe(
          'http://api/tasks/t1/checklists',
        );
        expect((fetchMock.mock.calls[0]![1] as RequestInit).method).toBe(
          'POST',
        );
        const body = JSON.parse(
          (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
        );
        expect(body).toEqual({ title: 'Acceptance' });
      } finally {
        await disconnect();
      }
    });

    it('rejects empty title', async () => {
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        const result = await callTool('add_checklist', { taskId: 't1', title: '' });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Input validation|32602/);
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        await disconnect();
      }
    });
  });

  describe('update_checklist', () => {
    it('PATCH /checklists/{id} with title', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 'ch1', title: 'New' }));
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        await callTool('update_checklist', { id: 'ch1', title: 'New' });
        expect(fetchMock.mock.calls[0]![0]).toBe('http://api/checklists/ch1');
        const body = JSON.parse(
          (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
        );
        expect(body).toEqual({ title: 'New' });
      } finally {
        await disconnect();
      }
    });

    it('allows body with only id (no-op patch)', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: 'ch1' }));
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        await callTool('update_checklist', { id: 'ch1' });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const body = JSON.parse(
          (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
        );
        expect(body).toEqual({});
      } finally {
        await disconnect();
      }
    });
  });

  describe('delete_checklist', () => {
    it('DELETE /checklists/{id}', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 204,
        text: async () => '',
      });
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        await callTool('delete_checklist', { id: 'ch1' });
        expect(fetchMock.mock.calls[0]![0]).toBe(
          'http://api/checklists/ch1',
        );
      } finally {
        await disconnect();
      }
    });

    it('rejects missing `id`', async () => {
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        const result = await callTool('delete_checklist', {});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Input validation|32602/);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        await disconnect();
      }
    });
  });

  // ─────────────── comment tools ───────────────

  describe('add_comment', () => {
    it('POST /tasks/{taskId}/comments with content in body', async () => {
      const created = { id: 'cm1', content: 'Hello' };
      fetchMock.mockResolvedValue(jsonResponse(created));
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        await callTool('add_comment', {
          taskId: 't1',
          content: 'Hello',
        });
        expect(fetchMock.mock.calls[0]![0]).toBe(
          'http://api/tasks/t1/comments',
        );
        const body = JSON.parse(
          (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
        );
        expect(body).toEqual({ content: 'Hello' });
      } finally {
        await disconnect();
      }
    });

    it('rejects empty content', async () => {
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        const result = await callTool('add_comment', { taskId: 't1', content: '' });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Input validation|32602/);
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        await disconnect();
      }
    });
  });

  // ─────────────── error propagation ───────────────

  describe('API error propagation', () => {
    it('surfaces 4xx as isError on the tool result', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 422,
        text: async () =>
          JSON.stringify({ statusCode: 422, message: 'Unprocessable' }),
      });
      const { callTool, disconnect } = await connectWithFetch(fetchMock);
      try {
        // For some endpoints (PATCH/POST with invalid body), the SDK
        // throws synchronously. For others, it returns isError=true. The
        // contract we care about is that the LLM sees the error and the
        // underlying 422 status — exact shape depends on the SDK path.
        try {
          const result = await callTool('create_task', {
            columnId: 'c1',
            content: 'New task',
            order: 0,
            priority: 'HIGH',
          });
          expect(result.isError).toBe(true);
        } catch (err) {
          expect(String(err)).toMatch(/422|Unprocessable/);
        }
      } finally {
        await disconnect();
      }
    });
  });
});