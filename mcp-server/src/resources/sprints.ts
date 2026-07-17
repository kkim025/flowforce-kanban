/**
 * Sprint resources.
 *
 * | URI                                                | Backing endpoint                       |
 * |----------------------------------------------------|----------------------------------------|
 * | flowforce://boards/{boardId}/sprints               | GET /sprints/boards/{id}               |
 * | flowforce://boards/{boardId}/sprints/active        | GET /sprints/boards/{id}/active        |
 *
 * "active" is a separate resource (not just a query string) so the LLM
 * doesn't have to filter — and so future changes to what "active" means
 * (status filter, date-window, etc.) are a backend concern only.
 */

import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { jsonContent } from './_helpers.js';

export const BOARD_SPRINTS_URI = 'flowforce://boards/{boardId}/sprints';
export const BOARD_ACTIVE_SPRINT_URI =
  'flowforce://boards/{boardId}/sprints/active';

export function register(server: McpServer, api: ApiClient): void {
  server.resource(
    'board-sprints',
    new ResourceTemplate(BOARD_SPRINTS_URI, { list: undefined }),
    {
      description:
        'Every sprint on the board, regardless of status. Use flowforce://boards/{boardId}/sprints/active for the currently-active sprint only.',
      mimeType: 'application/json',
    },
    async (_uri, variables) => {
      const boardId = variables['boardId'] as string;
      const sprints = await api.get<unknown[]>(
        `/sprints/boards/${boardId}`,
      );
      return {
        contents: [
          jsonContent(`flowforce://boards/${boardId}/sprints`, sprints),
        ],
      };
    },
  );

  server.resource(
    'board-active-sprint',
    new ResourceTemplate(BOARD_ACTIVE_SPRINT_URI, { list: undefined }),
    {
      description:
        'The currently-active sprint for the board, or { sprint: null } if none is active.',
      mimeType: 'application/json',
    },
    async (_uri, variables) => {
      const boardId = variables['boardId'] as string;
      const sprint = await api.get<unknown | null>(
        `/sprints/boards/${boardId}/active`,
      );
      return {
        contents: [
          jsonContent(
            `flowforce://boards/${boardId}/sprints/active`,
            { sprint },
          ),
        ],
      };
    },
  );
}
