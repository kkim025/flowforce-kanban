/**
 * User resource.
 *
 * | URI                  | Backing endpoint |
 * |----------------------|-------------------|
 * | flowforce://me       | GET /users/me     |
 *
 * Single static resource — gives the LLM the current user's id/role/status
 * without needing to know which board to scope to. Pair this with
 * flowforce://boards to discover the boards the user can act on.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { jsonContent } from './_helpers.js';

export const ME_URI = 'flowforce://me';

export function register(server: McpServer, api: ApiClient): void {
  server.resource(
    'me',
    ME_URI,
    {
      description:
        'The current authenticated user (id, email, role, status, avatar). Pair with flowforce://boards to enumerate what the user can access.',
      mimeType: 'application/json',
    },
    async () => {
      // MCP URI is an identifier — the REST endpoint is `/users/me`.
      const user = await api.get<unknown>('/users/me');
      return { contents: [jsonContent(ME_URI, user)] };
    },
  );
}
