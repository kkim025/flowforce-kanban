/**
 * Wiki resources.
 *
 * | URI                                            | Backing endpoint                         |
 * |------------------------------------------------|------------------------------------------|
 * | flowforce://boards/{boardId}/wiki               | GET /wiki/{boardId}                      |
 * | flowforce://boards/{boardId}/wiki/trash        | GET /wiki/{boardId}/trash                |
 * | flowforce://wiki/{pageId}                      | GET /wiki/pages/{pageId}                 |
 * | flowforce://wiki/{pageId}/versions             | GET /wiki/pages/{pageId}/versions        |
 *
 * Wiki pages belong to exactly one board, but a `pageId` lookup is the
 * natural LLM verb ("open this specific page"). The two scopes are
 * intentionally separate URIs rather than a single templated form, so
 * there's no ambiguity about which collection is being read.
 */

import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { jsonContent, singleString } from './_helpers.js';

export const BOARD_WIKI_URI = 'flowforce://boards/{boardId}/wiki';
export const BOARD_WIKI_TRASH_URI =
  'flowforce://boards/{boardId}/wiki/trash';
export const BOARD_WIKI_PAGE_URI = 'flowforce://wiki/{pageId}';
export const BOARD_WIKI_PAGE_VERSIONS_URI = 'flowforce://wiki/{pageId}/versions';

export function register(server: McpServer, api: ApiClient): void {
  server.resource(
    'board-wiki',
    new ResourceTemplate(BOARD_WIKI_URI, { list: undefined }),
    {
      description:
        'Active (non-trashed) wiki pages for the board. Use .../wiki/trash for deleted pages awaiting restore.',
      mimeType: 'application/json',
    },
    async (_uri, variables) => {
      const boardId = singleString(variables, 'boardId');
      const pages = await api.get<unknown[]>(`/wiki/${boardId}`);
      return {
        contents: [jsonContent(`flowforce://boards/${boardId}/wiki`, pages)],
      };
    },
  );

  server.resource(
    'board-wiki-trash',
    new ResourceTemplate(BOARD_WIKI_TRASH_URI, { list: undefined }),
    {
      description:
        'Trashed (soft-deleted) wiki pages for the board. Pages here are restorable via a future write tool (issue #40).',
      mimeType: 'application/json',
    },
    async (_uri, variables) => {
      const boardId = singleString(variables, 'boardId');
      const pages = await api.get<unknown[]>(`/wiki/${boardId}/trash`);
      return {
        contents: [
          jsonContent(`flowforce://boards/${boardId}/wiki/trash`, pages),
        ],
      };
    },
  );

  server.resource(
    'board-wiki-page',
    new ResourceTemplate(BOARD_WIKI_PAGE_URI, { list: undefined }),
    {
      description: 'A single wiki page including its current Markdown body.',
      mimeType: 'application/json',
    },
    async (_uri, variables) => {
      const pageId = singleString(variables, 'pageId');
      const page = await api.get<unknown>(`/wiki/pages/${pageId}`);
      return {
        contents: [
          jsonContent(`flowforce://wiki/${pageId}`, page),
        ],
      };
    },
  );

  server.resource(
    'board-wiki-page-versions',
    new ResourceTemplate(BOARD_WIKI_PAGE_VERSIONS_URI, { list: undefined }),
    {
      description:
        'Version history of a wiki page. Useful for diffing or restoring an earlier version (issue #40 plans the restore write tool).',
      mimeType: 'application/json',
    },
    async (_uri, variables) => {
      const pageId = singleString(variables, 'pageId');
      const versions = await api.get<unknown[]>(
        `/wiki/pages/${pageId}/versions`,
      );
      return {
        contents: [
          jsonContent(
            `flowforce://wiki/${pageId}/versions`,
            versions,
          ),
        ],
      };
    },
  );
}
