// ============================================================
// ATTENDING AI — SQLite Store
// apps/mobile/lib/offline/sqliteStore.ts
//
// Provides SQLite-backed offline queue, data cache, and
// audit log storage. WAL journal mode for crash safety.
// ============================================================

import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('attending.db');

  // WAL mode for concurrent reads and crash safety
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_queue (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      method TEXT NOT NULL,
      body TEXT,
      headers TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      retry_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      last_error TEXT
    );

    CREATE TABLE IF NOT EXISTS cached_data (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      ttl_seconds INTEGER DEFAULT 3600
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      user_id TEXT,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      prev_hash TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(status);
    CREATE INDEX IF NOT EXISTS idx_audit_log_synced ON audit_log(synced);
    CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
  `);

  return db;
}

// ============================================================
// Offline Queue
// ============================================================

export async function queueRequest(req: {
  url: string;
  method: string;
  body: unknown;
  headers?: Record<string, string>;
}): Promise<string> {
  const db = await getDatabase();
  const id = `oq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.runAsync(
    'INSERT INTO offline_queue (id, url, method, body, headers) VALUES (?, ?, ?, ?, ?)',
    id, req.url, req.method, JSON.stringify(req.body), JSON.stringify(req.headers ?? {})
  );
  return id;
}

export async function getPendingRequests(): Promise<Array<{
  id: string;
  url: string;
  method: string;
  body: string;
  headers: string;
  retryCount: number;
}>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT id, url, method, body, headers, retry_count as retryCount FROM offline_queue WHERE status = ? ORDER BY created_at ASC',
    'pending'
  );
  return rows as any[];
}

export async function markRequestCompleted(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM offline_queue WHERE id = ?', id);
}

export async function markRequestFailed(id: string, error: string, retryCount: number): Promise<void> {
  const db = await getDatabase();
  if (retryCount >= 5) {
    await db.runAsync('UPDATE offline_queue SET status = ?, last_error = ?, retry_count = ? WHERE id = ?',
      'failed', error, retryCount, id);
  } else {
    await db.runAsync('UPDATE offline_queue SET last_error = ?, retry_count = ? WHERE id = ?',
      error, retryCount, id);
  }
}

// ============================================================
// Cache
// ============================================================

export async function getCachedData<T>(key: string): Promise<T | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    'SELECT value, updated_at, ttl_seconds FROM cached_data WHERE key = ?', key
  ) as { value: string; updated_at: string; ttl_seconds: number } | null;

  if (!row) return null;

  const age = (Date.now() - new Date(row.updated_at).getTime()) / 1000;
  if (age > row.ttl_seconds) {
    await db.runAsync('DELETE FROM cached_data WHERE key = ?', key);
    return null;
  }

  try { return JSON.parse(row.value); } catch { return null; }
}

export async function setCachedData(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO cached_data (key, value, updated_at, ttl_seconds) VALUES (?, ?, datetime('now'), ?)`,
    key, JSON.stringify(value), ttlSeconds
  );
}

// ============================================================
// Audit Log
// ============================================================

export async function writeAuditEntry(entry: {
  action: string;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const db = await getDatabase();
  const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Get previous hash for chain integrity
  const lastEntry = await db.getFirstAsync(
    'SELECT id, prev_hash FROM audit_log ORDER BY timestamp DESC LIMIT 1'
  ) as { id: string; prev_hash: string } | null;
  const prevHash = lastEntry?.id ?? 'genesis';

  await db.runAsync(
    'INSERT INTO audit_log (id, action, user_id, resource_type, resource_id, details, prev_hash) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id, entry.action, entry.userId ?? null, entry.resourceType ?? null,
    entry.resourceId ?? null, JSON.stringify(entry.details ?? {}), prevHash
  );
}

export async function getUnsyncedAuditEntries(limit = 100): Promise<Array<{
  id: string;
  action: string;
  userId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  details: string;
  timestamp: string;
}>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT id, action, user_id as userId, resource_type as resourceType, resource_id as resourceId, details, timestamp FROM audit_log WHERE synced = 0 ORDER BY timestamp ASC LIMIT ?',
    limit
  );
  return rows as any[];
}

export async function markAuditEntriesSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`UPDATE audit_log SET synced = 1 WHERE id IN (${placeholders})`, ...ids);
}

export async function purgeOldAuditEntries(daysToKeep = 90): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `DELETE FROM audit_log WHERE synced = 1 AND timestamp < datetime('now', ? || ' days')`,
    `-${daysToKeep}`
  );
  return result.changes;
}
