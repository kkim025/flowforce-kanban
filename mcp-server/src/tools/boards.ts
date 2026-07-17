/**
 * Phase 1 hello-world tool (issue #37).
 *
 * Kept as its own module so server.ts stays clean — it now imports
 * `boards.read` (the resource module name) AND `boards.list` (this
 * tool module), both registered via the shared pattern.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { toolJson } from './_helpers.js';

export function register(server: McpServer, api: ApiClient): void {
  server.registerTool(
    'list_boards',
    {
      description:
        'List all Kanban boards the current user can access. Returns the full board objects as JSON.',
    },
    async () => {
      const boards = await api.get('/boards');
      return toolJson(boards);
    },
  );
}