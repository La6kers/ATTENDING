// ============================================================
// ATTENDING AI — SecureTokenStore Tests
// ============================================================

import * as SecureStore from 'expo-secure-store';
import { secureTokenStore } from '../../lib/auth/secureTokenStore';

describe('secureTokenStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores and retrieves access token', async () => {
    await secureTokenStore.setAccessToken('test-token-123');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'attending_access_token',
      'test-token-123',
      expect.any(Object)
    );
  });

  it('retrieves access token', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('stored-token');
    const token = await secureTokenStore.getAccessToken();
    expect(token).toBe('stored-token');
  });

  it('returns null when no token stored', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
    const token = await secureTokenStore.getAccessToken();
    expect(token).toBeNull();
  });

  it('stores refresh token', async () => {
    await secureTokenStore.setRefreshToken('refresh-123');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'attending_refresh_token',
      'refresh-123',
      expect.any(Object)
    );
  });

  it('clears all tokens', async () => {
    await secureTokenStore.clearAll();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
  });

  it('stores and retrieves session data as JSON', async () => {
    const sessionData = { userId: '123', role: 'patient' };
    await secureTokenStore.setSessionData(sessionData);
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
  });

  it('returns null for invalid stored session data', async () => {
    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce(null) // chunks key
      .mockResolvedValueOnce('not-json');
    const data = await secureTokenStore.getSessionData();
    expect(data).toBeNull();
  });
});
