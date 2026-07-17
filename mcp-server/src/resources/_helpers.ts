/**
 * Shared helpers for resource modules.
 */

/**
 * The MCP SDK types URI-template variables as `Record<string, string | string[]>`.
 * Our resources are all declared with single-token templates (`{boardId}`,
 * `{pageId}`), so the value is always a single string. This guard narrows
 * the union and throws a typed error if a future template introduces a
 * multi-value variable that the resource handler isn't prepared to consume.
 */
export function singleString(
  variables: Record<string, string | string[]>,
  key: string,
): string {
  const v = variables[key];
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    throw new Error(
      `Resource template variable "${key}" resolved to an array; this resource expects a single value.`,
    );
  }
  throw new Error(`Resource template variable "${key}" is missing.`);
}

export interface TextContent {
  uri: string;
  mimeType: string;
  text: string;
}

export function jsonContent(uri: string, value: unknown): TextContent {
  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(value, null, 2),
  };
}
