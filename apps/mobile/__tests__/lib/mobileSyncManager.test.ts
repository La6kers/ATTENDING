// ============================================================
// ATTENDING AI — Mobile Sync Manager Tests
// ============================================================

import { mobileSyncManager, type SyncEvent } from '../../lib/offline/mobileSyncManager';
import * as sqliteStore from '../../lib/offline/sqliteStore';

jest.mock('../../lib/offline/sqliteStore');
jest.mock('../../lib/auth/secureTokenStore', () => ({
  secureTokenStore: {
    getAccessToken: jest.fn().mockResolvedValue('test-token'),
  },
}));

describe('MobileSyncManager', () => {
  let events: SyncEvent[];

  beforeEach(() => {
    jest.clearAllMocks();
    events = [];
    mobileSyncManager.onEvent((event) => events.push(event));
  });

  it('does nothing when no pending requests', async () => {
    (sqliteStore.getPendingRequests as jest.Mock).mockResolvedValueOnce([]);
    await mobileSyncManager.syncAll();
    expect(events).toHaveLength(0);
  });

  it('syncs pending requests', async () => {
    (sqliteStore.getPendingRequests as jest.Mock).mockResolvedValueOnce([
      { id: 'req-1', url: '/test', method: 'POST', body: '{"a":1}', headers: '{}', retryCount: 0 },
    ]);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    await mobileSyncManager.syncAll();

    expect(sqliteStore.markRequestCompleted).toHaveBeenCalledWith('req-1');
    expect(events).toContainEqual({ type: 'item-synced', id: 'req-1' });
    expect(events).toContainEqual(expect.objectContaining({ type: 'sync-complete', succeeded: 1, failed: 0 }));
  });

  it('handles failed requests', async () => {
    (sqliteStore.getPendingRequests as jest.Mock).mockResolvedValueOnce([
      { id: 'req-2', url: '/fail', method: 'POST', body: '{}', headers: '{}', retryCount: 0 },
    ]);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    await mobileSyncManager.syncAll();

    expect(sqliteStore.markRequestFailed).toHaveBeenCalledWith('req-2', 'Non-transient error', 1);
    expect(events).toContainEqual(expect.objectContaining({ type: 'sync-complete', succeeded: 0, failed: 1 }));
  });

  it('reports isSyncing correctly', () => {
    expect(mobileSyncManager.isSyncing()).toBe(false);
  });
});
