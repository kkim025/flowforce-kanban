/**
 * MCP server factory. Wraps the {@link ApiClient} and registers tools/resources
 * on the {@link McpServer} instance.
 *
 * Phase 1 registers exactly one tool — `list_boards` — to prove end-to-end
 * connectivity. Later phases (issues #38-#41) will add the rest.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from './api-client.js';

export const SERVER_NAME = 'flowforce-kanban-mcp';
export const SERVER_VERSION = '0.1.0';

export function buildServer(api: ApiClient): McpServer {
  // Phase 1 advertises only `tools` — adding `resources: {}` / `prompts: {}`
  // here would lie to clients. Phases 2 (resources) and 5 (prompts) will
  // fill those in.
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
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

  return server;
}