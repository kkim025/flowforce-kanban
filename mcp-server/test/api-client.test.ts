import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient, ApiClientError } from '../src/api-client.js';

describe('ApiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  it('forwards the supplied Authorization header on every call', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });
    const client = new ApiClient('http://api', () => 'tk-abc', fetchMock as unknown as typeof fetch);

    await client.get('/boards');
    await client.post('/tasks', { title: 't' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstHeaders = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    const secondHeaders = (fetchMock.mock.calls[1]![1] as RequestInit).headers as Record<string, string>;
    expect(firstHeaders['Authorization']).toBe('Bearer tk-abc');
    expect(secondHeaders['Authorization']).toBe('Bearer tk-abc');
  });

  it('re-fetches the token via the closure on every request (handles rotation)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });
    let token = 'old';
    const client = new ApiClient('http://api', () => token, fetchMock as unknown as typeof fetch);

    await client.get('/boards');
    token = 'new';
    await client.get('/boards');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstHeaders = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    const secondHeaders = (fetchMock.mock.calls[1]![1] as RequestInit).headers as Record<string, string>;
    expect(firstHeaders['Authorization']).toBe('Bearer old');
    expect(secondHeaders['Authorization']).toBe('Bearer new');
  });

  it('builds the full URL by joining baseUrl and path', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    const client = new ApiClient('http://api.example.com/', () => 't', fetchMock as unknown as typeof fetch);

    await client.get('/boards');

    expect(fetchMock.mock.calls[0]![0]).toBe('http://api.example.com/boards');
  });

  it('throws ApiClientError with status + body on non-2xx responses', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ message: 'Board not found' }),
      json: async () => ({ message: 'Board not found' }),
    });
    const client = new ApiClient('http://api', () => 't', fetchMock as unknown as typeof fetch);

    await expect(client.get('/boards/missing')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 404,
      body: { message: 'Board not found' },
    });
  });

  it('sends JSON Content-Type and serialized body on POST/PATCH/PUT', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 't1' }),
    });
    const client = new ApiClient('http://api', () => 't', fetchMock as unknown as typeof fetch);

    await client.post('/tasks', { title: 'New task', priority: 'HIGH' });
    await client.patch('/tasks/t1', { title: 'Renamed' });
    await client.put('/tasks/t1/move', { columnId: 'c2', position: 3 });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://api/tasks',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ title: 'New task', priority: 'HIGH' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://api/tasks/t1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ title: 'Renamed' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://api/tasks/t1/move',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ columnId: 'c2', position: 3 }),
      }),
    );
  });

  it('DELETE request sends no body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    });
    const client = new ApiClient('http://api', () => 't', fetchMock as unknown as typeof fetch);

    await client.delete('/tasks/t1');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api/tasks/t1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('returns the parsed JSON body on a 2xx response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 'b1', name: 'My Board' }],
    });
    const client = new ApiClient('http://api', () => 't', fetchMock as unknown as typeof fetch);

    const result = await client.get<Array<{ id: string; name: string }>>('/boards');

    expect(result).toEqual([{ id: 'b1', name: 'My Board' }]);
  });

  it('handles 204 No Content (empty body) without throwing', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
      text: async () => '',
    });
    const client = new ApiClient('http://api', () => 't', fetchMock as unknown as typeof fetch);

    await expect(client.delete('/boards/b1')).resolves.toBeUndefined();
  });
});