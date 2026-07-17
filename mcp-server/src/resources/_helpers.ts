/**
 * Shared helpers for resource modules.
 *
 * `jsonContent` wraps a value in the standard `ReadResourceResult` content
 * shape (uri + mimeType + JSON text). Keeping it here means every resource
 * module emits identical envelopes, and the URI passed in can differ from
 * the registered URI when the template's variables have been substituted.
 *
 * The `TextContent` shape is structurally a subset of the protocol's
 * `ReadResourceResult['contents'][number]`, but we avoid importing the
 * type from the SDK spec module to keep this helper decoupled from the
 * transport-layer types — callers just return `{ contents: [...] }` and
 * the SDK validates the shape on its end.
 */

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
