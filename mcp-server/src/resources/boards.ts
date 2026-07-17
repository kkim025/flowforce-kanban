/**
 * Board resources.
 *
 * | URI                                           | Backing endpoint          |
 * |-----------------------------------------------|---------------------------|
 * | flowforce://boards                            | GET /boards                |
 * | flowforce://boards/{boardId}                  | GET /boards/{id}          |
 * | flowforce://boards/{boardId}/columns          | GET /columns?boardId={id} |
 *
 * `flowforce://boards` is a static resource (lists every board the user
 * can see). The other two are templated; their parent URI is the static
 * one so the LLM's `resources/list` query enumerates them naturally.
 */

import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { jsonContent } from './_helpers.js';

export const BOARDS_URI = 'flowforce://boards';
export const BOARD_URI = 'flowforce://boards/{boardId}';
export const BOARD_COLUMNS_URI = 'flowforce://boards/{boardId}/columns';

export function register(server: McpServer, api: ApiClient): void {
  server.resource(
    'boards',
    BOARDS_URI,
    {
      description: 'All Kanban boards the current user can access.',
      mimeType: 'application/json',
    },
    async () => {
      // The MCP URI is `flowforce://boards` — it's an identifier, not an API
      // path. The REST endpoint for this collection is `/boards`.
      const boards = await api.get<unknown[]>('/boards');
      return { contents: [jsonContent(BOARDS_URI, boards)] };
    },
  );

  server.resource(
    'board',
    new ResourceTemplate(BOARD_URI, { list: undefined }),
    {
      description: 'A single Kanban board by id, including its columns.',
      mimeType: 'application/json',
    },
    async (_uri, variables) => {
      const boardId = variables['boardId'] as string;
      const board = await api.get(`/boards/${boardId}`);
      return {
        contents: [
          jsonContent(`flowforce://boards/${boardId}`, board),
        ],
      };
    },
  );

  server.resource(
    'board-columns',
    new ResourceTemplate(BOARD_COLUMNS_URI, { list: undefined }),
    {
      description: 'Columns belonging to a single board, in order.',
      mimeType: 'application/json',
    },
    async (_uri, variables) => {
      const boardId = variables['boardId'] as string;
      const columns = await api.get<unknown[]>(
        `/columns?boardId=${boardId}`,
      );
      return {
        contents: [
          jsonContent(`flowforce://boards/${boardId}/columns`, columns),
        ],
      };
    },
  );
}
