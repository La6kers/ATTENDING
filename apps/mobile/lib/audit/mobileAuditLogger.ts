// ============================================================
// ATTENDING AI — Mobile Audit Logger
// apps/mobile/lib/audit/mobileAuditLogger.ts
//
// HIPAA-compliant on-device audit logging.
// SHA-256 hash chain for tamper protection.
// Batch upload every 5 minutes when online.
// 90-day local retention with auto-purge.
// ============================================================

import {
  writeAuditEntry,
  getUnsyncedAuditEntries,
  markAuditEntriesSynced,
  purgeOldAuditEntries,
} from '../offline/sqliteStore';
import api from '../api/mobileApiClient';

// ============================================================
// Audit Actions (subset of shared 70+ actions)
// ============================================================

export type MobileAuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_LOGIN_FAILED'
  | 'MFA_VERIFIED'
  | 'SESSION_EXPIRED'
  | 'SESSION_EXTENDED'
  | 'PATIENT_VIEW'
  | 'VITALS_VIEWED'
  | 'MEDICATIONS_VIEWED'
  | 'LAB_RESULTS_VIEWED'
  | 'MEDICAL_ID_VIEWED'
  | 'MESSAGE_SENT'
  | 'MESSAGE_VIEWED'
  | 'APPOINTMENT_VIEWED'
  | 'EMERGENCY_CONTACTS_VIEWED'
  | 'EMERGENCY_TRIGGERED'
  | 'CRASH_DETECTED'
  | 'CRASH_CANCELLED'
  | 'PUSH_TOKEN_REGISTERED'
  | 'OFFLINE_QUEUE_SYNCED'
  | 'APP_INTEGRITY_CHECK'
  | 'PHI_ACCESSED'
  | 'PHI_EXPORTED';

// ============================================================
// Logger
// ============================================================

class MobileAuditLogger {
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private userId: string | null = null;

  setUserId(userId: string | null): void {
    this.userId = userId;
  }

  async log(action: MobileAuditAction, details?: {
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await writeAuditEntry({
        action,
        userId: this.userId ?? undefined,
        resourceType: details?.resourceType,
        resourceId: details?.resourceId,
        details: details?.metadata,
      });
    } catch {
      // Audit logging should never crash the app
      console.warn('Failed to write audit entry:', action);
    }
  }

  startPeriodicSync(intervalMs = 5 * 60 * 1000): void {
    this.stopPeriodicSync();
    this.syncTimer = setInterval(() => this.syncToServer(), intervalMs);
    // Also sync immediately on start
    this.syncToServer();
  }

  stopPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  async syncToServer(): Promise<void> {
    try {
      const entries = await getUnsyncedAuditEntries(100);
      if (entries.length === 0) return;

      const result = await api.post('/audit/batch', {
        entries: entries.map((e) => ({
          ...e,
          details: JSON.parse(e.details),
          source: 'mobile',
        })),
      });

      if (result.ok) {
        await markAuditEntriesSynced(entries.map((e) => e.id));
      }
    } catch {
      // Will retry on next interval
    }
  }

  async cleanup(): Promise<void> {
    try {
      const purged = await purgeOldAuditEntries(90);
      if (purged > 0) {
        await this.log('OFFLINE_QUEUE_SYNCED', {
          metadata: { purgedEntries: purged },
        });
      }
    } catch {
      // Non-critical
    }
  }
}

export const auditLogger = new MobileAuditLogger();
