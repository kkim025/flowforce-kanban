/**
 * Tag resource.
 *
 * | URI                                       | Backing endpoint          |
 * |-------------------------------------------|---------------------------|
 * | flowforce://boards/{boardId}/tags          | GET /tags?boardId={id}    |
 *
 * Tags are per-board (issue #32). The board scope is explicit in the URI
 * so the LLM never has to think about cross-board tag leakage.
 */

import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { jsonContent } from './_helpers.js';

export const BOARD_TAGS_URI = 'flowforce://boards/{boardId}/tags';

export function register(server: McpServer, api: ApiClient): void {
  server.resource(
    'board-tags',
    new ResourceTemplate(BOARD_TAGS_URI, { list: undefined }),
    {
      description: 'Tag library for the board (name + color).',
      mimeType: 'application/json',
    },
    async (_uri, variables) => {
      const boardId = variables['boardId'] as string;
      const tags = await api.get<unknown[]>(`/tags?boardId=${boardId}`);
      return {
        contents: [
          jsonContent(`flowforce://boards/${boardId}/tags`, tags),
        ],
      };
    },
  );
}
