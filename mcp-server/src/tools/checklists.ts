/**
 * Checklist write tools (Phase 3, issue #39).
 *
 * | Tool              | Backing endpoint                       |
 * |-------------------|----------------------------------------|
 * | add_checklist     | POST /tasks/{taskId}/checklists        |
 * | update_checklist  | PATCH /checklists/{id}                 |
 * | delete_checklist  | DELETE /checklists/{id}                |
 *
 * The `add_checklist` tool follows the issue spec path (`POST
 * /tasks/{taskId}/checklists`) rather than the standalone `POST /checklists`
 * body-style endpoint. Rationale: it pairs naturally with the future
 * per-task resource (#52) where the task is the natural parent scope.
 *
 * Input shapes are declared as raw ZodRawShape objects (not wrapped in
 * `z.object({...})`) because the SDK's registerTool inputSchema type
 * expects the shape directly.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { toolJson } from './_helpers.js';

const addChecklistInput = {
  taskId: z.string().describe('Parent task id (lives in the URL).'),
  title: z.string().min(1).describe('Checklist title.'),
};

const updateChecklistInput = {
  id: z.string().describe('Checklist id.'),
  title: z.string().min(1).optional(),
};

const deleteChecklistInput = {
  id: z.string().describe('Checklist id to delete.'),
};

export function register(server: McpServer, api: ApiClient): void {
  server.registerTool(
    'add_checklist',
    {
      description: 'Add a checklist to a task. Returns the created checklist (no items).',
      inputSchema: addChecklistInput,
    },
    async ({ taskId, title }) => {
      const checklist = await api.post<unknown>(
        `/tasks/${taskId}/checklists`,
        { title },
      );
      return toolJson(checklist);
    },
  );

  server.registerTool(
    'update_checklist',
    {
      description: 'Patch a checklist. Only the supplied fields are updated.',
      inputSchema: updateChecklistInput,
    },
    async ({ id, ...body }) => {
      const checklist = await api.patch<unknown>(`/checklists/${id}`, body);
      return toolJson(checklist);
    },
  );

  server.registerTool(
    'delete_checklist',
    {
      description: 'Delete a checklist by id.',
      inputSchema: deleteChecklistInput,
    },
    async ({ id }) => {
      await api.delete(`/checklists/${id}`);
      return toolJson({ id, deleted: true });
    },
  );
}