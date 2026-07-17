/**
 * Shared helpers for write tool modules.
 *
 * `toolJson` wraps a value in the standard MCP tool result envelope
 * (a single text-content item carrying JSON). Each write tool returns
 * the created/updated/deleted entity so the LLM can see the result
 * (id, status, etc.) without an extra round trip.
 *
 * The text-content shape mirrors what {@link tools/boards.ts list_boards}
 * already produces; consolidating here keeps every write tool emitting
 * identical envelopes.
 */

export interface ToolTextContent {
  type: 'text';
  text: string;
}

export function toolJson(value: unknown): { content: ToolTextContent[] } {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}