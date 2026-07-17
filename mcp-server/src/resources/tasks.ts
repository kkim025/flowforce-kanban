/**
 * Task resource.
 *
 * The FlowForce REST API exposes tasks under `/tasks?columnId=...`, but a
 * task only makes sense in the context of its board. We expose
 * `flowforce://boards/{boardId}/tasks` as the canonical resource URI and
 * internally fan out to `/columns?boardId=...` then `/tasks?columnId=...`
 * per column. This matches the LLM's mental model ("show me the tasks on
 * this board") and is independent of how many columns the board has.
 */

import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ApiClient } from '../api-client.js';
import { jsonContent } from './_helpers.js';

export const BOARD_TASKS_URI = 'flowforce://boards/{boardId}/tasks';

interface Column {
  id: string;
  // other fields are forward-compatible; the LLM only needs id here.
  title?: string;
  order?: number;
  boardId?: string;
}

interface Task {
  id: string;
  title: string;
  [key: string]: unknown;
}

export function register(server: McpServer, api: ApiClient): void {
  server.resource(
    'board-tasks',
    new ResourceTemplate(BOARD_TASKS_URI, { list: undefined }),
    {
      description:
        'Every task on a board, grouped by column. Returned as { columns: [...], tasks: [...] } so the LLM can place each task back into its column without an extra round trip.',
      mimeType: 'application/json',
    },
    async (_uri, variables) => {
      const boardId = variables['boardId'] as string;

      const columns = await api.get<Column[]>(`/columns?boardId=${boardId}`);

      // Fan out across columns in parallel — for boards with many columns
      // this is materially faster than sequential calls. The plan accepts
      // one round trip per column; a follow-up could add a bulk endpoint.
      const perColumn = await Promise.all(
        columns.map(async (col) => {
          const tasks = await api.get<Task[]>(`/tasks?columnId=${col.id}`);
          return { column: col, tasks };
        }),
      );

      const payload = {
        columns: columns.map((c) => ({
          id: c.id,
          title: c.title ?? null,
          order: c.order ?? null,
        })),
        tasks: perColumn.flatMap(({ column, tasks }) =>
          tasks.map((t) => ({ ...t, columnId: column.id })),
        ),
      };

      return {
        contents: [
          jsonContent(`flowforce://boards/${boardId}/tasks`, payload),
        ],
      };
    },
  );
}
