/**
 * Tests for the McpServer factory + the registered `list_boards` tool.
 *
 * Strategy: drive the server through its public tool-handler callback by
 * using the SDK's InMemoryTransport, which is exactly how the SDK's own
 * tests exercise the server without going over the wire.
 */

import { describe, it, expect, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer } from '../src/server.js';
import { ApiClient } from '../src/api-client.js';

function makePair() {
  const server = buildServer(
    new ApiClient(
      'http://unused',
      () => 'unused',
      vi.fn() as unknown as typeof fetch,
    ),
  );
  const client = new Client(
    { name: 'test-client', version: '0.0.0' },
    { capabilities: {} },
  );
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  return { server, client, clientT, serverT };
}

describe('buildServer', () => {
  it('exposes list_boards with a non-empty description', async () => {
    const { server, client, clientT, serverT } = makePair();
    await Promise.all([client.connect(clientT), server.connect(serverT)]);

    const { tools } = await client.listTools();

    // The test was written for Phase 1 (single list_boards tool). Phase 3
    // (issue #39) added 14 more. Keep the original assertion that
    // list_boards is present + first (LLMs see tools in registration
    // order) but tolerate Phase 3+ additions rather than hardcoding.
    const names = tools.map((t) => t.name);
    expect(names).toContain('list_boards');
    expect(names[0]).toBe('list_boards');
    const tool = tools.find((t) => t.name === 'list_boards')!;
    // Trim before length-check so a placeholder like ' '.repeat(25) doesn't
    // silently pass — we want real prose the LLM can act on.
    expect(tool.description?.trim().length ?? 0).toBeGreaterThan(20);
  });

  it('list_boards calls GET /boards on the API and returns the JSON', async () => {
    const boards = [{ id: 'b1', title: 'Board 1' }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => boards,
      text: async () => JSON.stringify(boards),
    });
    const api = new ApiClient(
      'http://api',
      () => 'tk-abc',
      fetchMock as unknown as typeof fetch,
    );
    const server = buildServer(api);
    const client = new Client(
      { name: 'test-client', version: '0.0.0' },
      { capabilities: {} },
    );
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(clientT), server.connect(serverT)]);

    const result = await client.callTool({ name: 'list_boards' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe('http://api/boards');
    const firstHeaders = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(firstHeaders['Authorization']).toBe('Bearer tk-abc');

    // Tool result content. The SDK marks result.isError when the handler throws;
    // we verify both that error propagation works (third test below) and that
    // happy-path results don't carry the error flag.
    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.type).toBe('text');
    expect(JSON.parse(content[0]!.text)).toEqual(boards);
  });

  it('list_boards surfaces ApiClientError as a tool error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ statusCode: 401, message: 'Unauthorized' }),
      json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
    });
    const api = new ApiClient(
      'http://api',
      () => 'tk',
      fetchMock as unknown as typeof fetch,
    );
    const server = buildServer(api);
    const client = new Client(
      { name: 'test-client', version: '0.0.0' },
      { capabilities: {} },
    );
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(clientT), server.connect(serverT)]);

    const result = await client.callTool({ name: 'list_boards' });

    // The SDK marks the result as an error when the handler throws.
    expect(result.isError).toBe(true);
  });
});