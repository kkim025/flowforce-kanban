/**
 * Notification resources.
 *
 * | URI                                          | Backing endpoint                       |
 * |----------------------------------------------|----------------------------------------|
 * | flowforce://notifications                    | GET /notifications                     |
 * | flowforce://notifications/unread-count      | GET /notifications/unread-count        |
 *
 * These are user-scoped (no boardId) — notifications fan out across
 * every board the user belongs to. Kept separate from per-board resources
 * so the LLM can pull "what needs my attention" without first having to
 * enumerate boards.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { jsonContent } from './_helpers.js';

export const NOTIFICATIONS_URI = 'flowforce://notifications';
export const NOTIFICATIONS_UNREAD_URI =
  'flowforce://notifications/unread-count';

export function register(server: McpServer, api: ApiClient): void {
  server.resource(
    'notifications',
    NOTIFICATIONS_URI,
    {
      description:
        'All notifications for the current user (read + unread). Cross-board; no boardId required.',
      mimeType: 'application/json',
    },
    async () => {
      const items = await api.get<unknown[]>('/notifications');
      return {
        contents: [jsonContent(NOTIFICATIONS_URI, items)],
      };
    },
  );

  server.resource(
    'notifications-unread-count',
    NOTIFICATIONS_UNREAD_URI,
    {
      description:
        'Just the unread notification count — cheap to poll repeatedly. Cheaper than listing all notifications when the LLM only needs the badge number.',
      mimeType: 'application/json',
    },
    async () => {
      const count = await api.get<{ count: number }>(
        '/notifications/unread-count',
      );
      return {
        contents: [jsonContent(NOTIFICATIONS_UNREAD_URI, count)],
      };
    },
  );
}
