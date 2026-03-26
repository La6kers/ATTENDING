// ============================================================
// ATTENDING AI — Mobile API Client Tests
// ============================================================

import { api, apiFetch } from '../../lib/api/mobileApiClient';
import * as SecureStore from 'expo-secure-store';

describe('mobileApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: 'test' }),
      headers: { get: jest.fn().mockReturnValue('application/json') },
    });
  });

  it('makes GET requests with auth header', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('test-token');

    const result = await api.get('/test');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
    expect(result.ok).toBe(true);
  });

  it('makes POST requests with body', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('test-token');

    await api.post('/test', { foo: 'bar' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ foo: 'bar' }),
      })
    );
  });

  it('skips auth header when noAuth is set', async () => {
    await apiFetch('/public', { noAuth: true });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.anything(),
        }),
      })
    );
  });

  it('handles 204 No Content', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('token');
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: { get: jest.fn().mockReturnValue(null) },
    });

    const result = await api.delete('/test');
    expect(result.ok).toBe(true);
  });

  it('returns error for non-OK responses', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('token');
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: jest.fn().mockResolvedValue({ message: 'Validation failed' }),
      headers: { get: jest.fn().mockReturnValue('application/json') },
    });

    const result = await api.post('/test', {});
    expect(result.ok).toBe(false);
    expect(result.error?.status).toBe(400);
  });

  it('handles network errors', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('token');
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const result = await api.get('/test');
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('NETWORK_ERROR');
  });

  it('handles timeout via AbortError', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('token');
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    const result = await api.get('/test');
    expect(result.ok).toBe(false);
    expect(result.error?.message).toBe('Request timed out');
  });
});
