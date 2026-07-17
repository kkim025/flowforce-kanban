/**
 * Comment write tools (Phase 3, issue #39).
 *
 * | Tool         | Backing endpoint               |
 * |--------------|--------------------------------|
 * | add_comment  | POST /tasks/{taskId}/comments   |
 *
 * Note: the issue spec says the body field is `body`, but the live API
 * uses `content` (see tasks.service.ts addComment). We follow the API.
 *
 * Reads aren't included in Phase 3 — `add_comment` is the only mutation.
 * Reading comments comes in the Phase 3.5 follow-up (per-task resource
 * coverage is issue #52).
 *
 * Input shapes are declared as raw ZodRawShape objects (not wrapped in
 * `z.object({...})`) because the SDK's registerTool inputSchema type
 * expects the shape directly.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { toolJson } from './_helpers.js';

const addCommentInput = {
  taskId: z.string().describe('Parent task id (lives in the URL).'),
  content: z.string().min(1).describe('Comment text (Markdown supported).'),
};

export function register(server: McpServer, api: ApiClient): void {
  server.registerTool(
    'add_comment',
    {
      description: 'Add a comment to a task. Returns the created comment.',
      inputSchema: addCommentInput,
    },
    async ({ taskId, content }) => {
      const comment = await api.post<unknown>(
        `/tasks/${taskId}/comments`,
        { content },
      );
      return toolJson(comment);
    },
  );
}