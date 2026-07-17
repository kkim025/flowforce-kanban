/**
 * Task write tools (Phase 3, issue #39).
 *
 * | Tool                       | Backing endpoint                  | Notes              |
 * |----------------------------|-----------------------------------|--------------------|
 * | create_task                | POST /tasks                       | see issue #39 spec |
 * | update_task                | PATCH /tasks/{id}                 |                    |
 * | delete_task                | DELETE /tasks/{id}                |                    |
 * | move_task                  | PUT /tasks/{id}/move              |                    |
 * | assign_task_to_sprint      | PATCH /tasks/{taskId}/sprint      | sprintId nullable  |
 *
 * Schema fields match the live API's DTOs. Where the issue #39 spec
 * drifted from the real API, we follow the API — see PR body for the
 * four corrections (title → content, priority required, order required,
 * sprintId optional).
 *
 * Input shapes are declared as raw ZodRawShape objects (not wrapped in
 * `z.object({...})`) because the SDK's registerTool inputSchema type
 * expects the shape directly.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { toolJson } from './_helpers.js';

// Priority values from `@prisma/client` (and the live API's @IsEnum):
//   LOW | MEDIUM | HIGH | URGENT
const PRIORITY = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

const createTaskInput = {
  columnId: z.string().describe('Target column id.'),
  content: z.string().min(1).describe('Task content (the visible headline).'),
  order: z.number().int().min(0).describe('Position within the column, 0-indexed.'),
  priority: PRIORITY.describe('LOW | MEDIUM | HIGH | URGENT.'),
  description: z.string().optional().describe('Long-form description (Markdown).'),
  sprintId: z.string().optional().describe('Sprint to assign the task to on creation.'),
};

const updateTaskInput = {
  id: z.string().describe('Task id to update.'),
  content: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: PRIORITY.optional(),
  archived: z.boolean().optional(),
  assigneeId: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
};

const deleteTaskInput = {
  id: z.string().describe('Task id to delete.'),
};

const moveTaskInput = {
  id: z.string().describe('Task id to move.'),
  columnId: z.string().describe('Destination column id.'),
  // The live API field is `order` — the issue spec calls it `position`.
  // We expose `order` to match the wire shape.
  order: z.number().int().min(0).describe('New position within the column.'),
};

const assignTaskToSprintInput = {
  taskId: z.string().describe('Task id.'),
  sprintId: z
    .string()
    .nullable()
    .describe('Sprint id, or null to unassign.'),
};

export function register(server: McpServer, api: ApiClient): void {
  server.registerTool(
    'create_task',
    {
      description:
        'Create a new task in a column. Returns the created task.',
      inputSchema: createTaskInput,
    },
    async (input) => {
      const task = await api.post<unknown>('/tasks', input);
      return toolJson(task);
    },
  );

  server.registerTool(
    'update_task',
    {
      description:
        'Patch a task. Only the supplied fields are updated.',
      inputSchema: updateTaskInput,
    },
    async ({ id, ...body }) => {
      const task = await api.patch<unknown>(`/tasks/${id}`, body);
      return toolJson(task);
    },
  );

  server.registerTool(
    'delete_task',
    {
      description: 'Delete a task by id.',
      inputSchema: deleteTaskInput,
    },
    async ({ id }) => {
      await api.delete(`/tasks/${id}`);
      return toolJson({ id, deleted: true });
    },
  );

  server.registerTool(
    'move_task',
    {
      description: 'Move a task to a different column and/or position.',
      inputSchema: moveTaskInput,
    },
    async ({ id, columnId, order }) => {
      const task = await api.put<unknown>(`/tasks/${id}/move`, {
        columnId,
        order,
      });
      return toolJson(task);
    },
  );

  server.registerTool(
    'assign_task_to_sprint',
    {
      description:
        'Assign a task to a sprint, or pass sprintId=null to unassign.',
      inputSchema: assignTaskToSprintInput,
    },
    async ({ taskId, sprintId }) => {
      const task = await api.patch<unknown>(`/tasks/${taskId}/sprint`, {
        sprintId,
      });
      return toolJson(task);
    },
  );
}