/**
 * MCP server factory. Wraps the {@link ApiClient} and registers tools/resources
 * on the {@link McpServer} instance.
 *
 * Phase 1 (issue #37) registered one tool (`list_boards`).
 * Phase 2 (issue #38) adds 14 read-only resources covering boards, tasks,
 * sprints, tags, wiki, notifications, and the current user.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from './api-client.js';
import * as boards from './resources/boards.js';
import * as tasks from './resources/tasks.js';
import * as sprints from './resources/sprints.js';
import * as tags from './resources/tags.js';
import * as wiki from './resources/wiki.js';
import * as notifications from './resources/notifications.js';
import * as users from './resources/users.js';

export const SERVER_NAME = 'flowforce-kanban-mcp';
export const SERVER_VERSION = '0.1.0';

export function buildServer(api: ApiClient): McpServer {
  // Both `tools` (Phase 1) and `resources` (Phase 2) capabilities are
  // advertised. Prompts (Phase 5, issue #41) will add `{ prompts: {} }`.
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {}, resources: {} } },
  );

  server.registerTool(
    'list_boards',
    {
      description:
        'List all Kanban boards the current user can access. Returns the full board objects as JSON.',
    },
    async () => {
      const boards = await api.get('/boards');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(boards, null, 2),
          },
        ],
      };
    },
  );

  // Resources — each module owns its URIs and registers them via the
  // shared `register(server, api)` function. Adding a new resource type
  // means a new module + one line here.
  boards.register(server, api);
  tasks.register(server, api);
  sprints.register(server, api);
  tags.register(server, api);
  wiki.register(server, api);
  notifications.register(server, api);
  users.register(server, api);

  return server;
}