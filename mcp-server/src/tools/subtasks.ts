/**
 * Subtask write tools (Phase 3, issue #39).
 *
 * | Tool             | Backing endpoint             |
 * |------------------|------------------------------|
 * | add_subtask      | POST /subtasks               |
 * | update_subtask   | PATCH /subtasks/{id}         |
 * | toggle_subtask   | PATCH /subtasks/{id}/toggle  |
 * | delete_subtask   | DELETE /subtasks/{id}        |
 * | reorder_subtasks | PATCH /subtasks/reorder      |
 *
 * Note: the issue spec lists `add_subtask` with `taskId + title`, but
 * the live API requires `checklistId + content` (taskId-only creation
 * is deprecated — see create-subtask.dto.ts). The `checklistId` field is
 * what the web frontend and existing use-cases already use.
 *
 * Input shapes are declared as raw ZodRawShape objects (not wrapped in
 * `z.object({...})`) because the SDK's registerTool inputSchema type
 * expects the shape directly.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { toolJson } from './_helpers.js';

const PRIORITY = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

const addSubtaskInput = {
  checklistId: z
    .string()
    .describe('Id of the parent checklist (subtasks live on checklists).'),
  content: z.string().min(1).describe('Subtask content.'),
  priority: PRIORITY.optional(),
};

const updateSubtaskInput = {
  id: z.string().describe('Subtask id.'),
  content: z.string().min(1).optional(),
  completed: z.boolean().optional(),
  priority: PRIORITY.nullable().optional(),
};

const toggleSubtaskInput = {
  id: z.string().describe('Subtask id to toggle.'),
};

const deleteSubtaskInput = {
  id: z.string().describe('Subtask id to delete.'),
};

const reorderSubtasksInput = {
  // The issue spec says `taskId`, but the live API requires `checklistId`.
  checklistId: z
    .string()
    .describe('Parent checklist id — all subtasks in the array must belong to it.'),
  orderedIds: z
    .array(z.string())
    .min(1)
    .describe('Subtask ids in the new order.'),
};

export function register(server: McpServer, api: ApiClient): void {
  server.registerTool(
    'add_subtask',
    {
      description:
        'Add a subtask to a checklist. Returns the created subtask.',
      inputSchema: addSubtaskInput,
    },
    async (input) => {
      const subtask = await api.post<unknown>('/subtasks', input);
      return toolJson(subtask);
    },
  );

  server.registerTool(
    'update_subtask',
    {
      description: 'Patch a subtask. Only the supplied fields are updated.',
      inputSchema: updateSubtaskInput,
    },
    async ({ id, ...body }) => {
      const subtask = await api.patch<unknown>(`/subtasks/${id}`, body);
      return toolJson(subtask);
    },
  );

  server.registerTool(
    'toggle_subtask',
    {
      description: 'Toggle the completed flag on a subtask.',
      inputSchema: toggleSubtaskInput,
    },
    async ({ id }) => {
      const subtask = await api.patch<unknown>(`/subtasks/${id}/toggle`);
      return toolJson(subtask);
    },
  );

  server.registerTool(
    'delete_subtask',
    {
      description: 'Delete a subtask by id.',
      inputSchema: deleteSubtaskInput,
    },
    async ({ id }) => {
      await api.delete(`/subtasks/${id}`);
      return toolJson({ id, deleted: true });
    },
  );

  server.registerTool(
    'reorder_subtasks',
    {
      description:
        'Reorder the subtasks of a checklist. orderedIds[0] becomes position 0.',
      inputSchema: reorderSubtasksInput,
    },
    async ({ checklistId, orderedIds }) => {
      const result = await api.patch<unknown>('/subtasks/reorder', {
        checklistId,
        orderedIds,
      });
      return toolJson(result);
    },
  );
}