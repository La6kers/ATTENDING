// =============================================================================
// ATTENDING AI - Auth Module Tests
// apps/shared/lib/auth/__tests__/auth.test.ts
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  hasPermission, hasAllPermissions, hasAnyPermission, getMissingPermissions,
  canPrescribeSchedule, getPermissionsForRole, hasHigherPrivilege,
  PERMISSIONS, ROLE_PRESCRIBING_PRIVILEGES,
} from '../permissions';
import { SessionManager, isSessionValid, sessionNeedsRefresh } from '../sessionManager';
import type { Permission, PrescribingPrivileges, Session } from '../types';

// Permission Tests
describe('Permissions', () => {
  describe('hasPermission', () => {
    it('returns true when user has the permission', () => {
      const userPermissions: Permission[] = ['labs:view', 'labs:create'];
      expect(hasPermission(userPermissions, 'labs:view')).toBe(true);
    });

    it('returns false when user lacks the permission', () => {
      const userPermissions: Permission[] = ['labs:view'];
      expect(hasPermission(userPermissions, 'labs:create')).toBe(false);
    });

    it('returns false for empty permissions', () => {
      expect(hasPermission([], 'labs:view')).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true when user has all permissions', () => {
      const userPermissions: Permission[] = ['labs:view', 'labs:create', 'labs:sign'];
      expect(hasAllPermissions(userPermissions, ['labs:view', 'labs:create'])).toBe(true);
    });

    it('returns false when user lacks any permission', () => {
      const userPermissions: Permission[] = ['labs:view'];
      expect(hasAllPermissions(userPermissions, ['labs:view', 'labs:create'])).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true when user has at least one permission', () => {
      const userPermissions: Permission[] = ['labs:view'];
      expect(hasAnyPermission(userPermissions, ['labs:view', 'labs:create'])).toBe(true);
    });

    it('returns false when user has none of the permissions', () => {
      const userPermissions: Permission[] = ['imaging:view'];
      expect(hasAnyPermission(userPermissions, ['labs:view', 'labs:create'])).toBe(false);
    });
  });

  describe('getMissingPermissions', () => {
    it('returns missing permissions', () => {
      const userPermissions: Permission[] = ['labs:view'];
      const required: Permission[] = ['labs:view', 'labs:create', 'labs:sign'];
      expect(getMissingPermissions(userPermissions, required)).toEqual(['labs:create', 'labs:sign']);
    });
  });
});

// Role Permissions Tests
describe('Role Permissions', () => {
  describe('getPermissionsForRole', () => {
    it('returns permissions for physician role', () => {
      const permissions = getPermissionsForRole('physician');
      expect(permissions).toContain(PERMISSIONS.medications.prescribe);
      expect(permissions).toContain(PERMISSIONS.assessments.sign);
    });

    it('returns permissions for nurse role without prescribing', () => {
      const permissions = getPermissionsForRole('nurse');
      expect(permissions).toContain(PERMISSIONS.patients.view);
      expect(permissions).not.toContain(PERMISSIONS.medications.prescribe);
    });
  });

  describe('hasHigherPrivilege', () => {
    it('physician has higher privilege than nurse', () => {
      expect(hasHigherPrivilege('physician', 'nurse')).toBe(true);
    });

    it('nurse does not have higher privilege than physician', () => {
      expect(hasHigherPrivilege('nurse', 'physician')).toBe(false);
    });
  });
});

// Prescribing Tests
describe('Prescribing Privileges', () => {
  describe('canPrescribeSchedule', () => {
    it('physician can prescribe Schedule II', () => {
      const privileges: PrescribingPrivileges = {
        canPrescribe: true, canPrescribeControlled: true,
        controlledSchedules: ['II', 'III', 'IV', 'V'], requiresSupervision: false,
      };
      expect(canPrescribeSchedule(privileges, 'II')).toBe(true);
    });

    it('nurse cannot prescribe any schedule', () => {
      const privileges = ROLE_PRESCRIBING_PRIVILEGES.nurse;
      expect(privileges.canPrescribe).toBe(false);
      expect(canPrescribeSchedule(privileges, 'V')).toBe(false);
    });
  });

  describe('Role prescribing defaults', () => {
    it('physician has full prescribing privileges', () => {
      const privileges = ROLE_PRESCRIBING_PRIVILEGES.physician;
      expect(privileges.canPrescribe).toBe(true);
      expect(privileges.canPrescribeControlled).toBe(true);
      expect(privileges.requiresSupervision).toBe(false);
    });

    it('PA requires supervision', () => {
      const privileges = ROLE_PRESCRIBING_PRIVILEGES.physician_assistant;
      expect(privileges.canPrescribe).toBe(true);
      expect(privileges.requiresSupervision).toBe(true);
    });
  });
});

// Session Manager Tests
describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new SessionManager({
      maxDuration: 8 * 60 * 60 * 1000, idleTimeout: 15 * 60 * 1000,
      expirationWarning: 5 * 60 * 1000, allowExtension: true, maxExtensions: 2, requireMfaForSensitive: false,
    });
  });

  afterEach(() => { vi.useRealTimers(); });

  describe('startSession', () => {
    it('starts a new session', () => {
      const session: Session = {
        id: 'session-1', userId: 'user-1', accessToken: 'token-123',
        createdAt: new Date(), expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        lastActivityAt: new Date(), extensionCount: 0, mfaVerified: true,
      };
      manager.startSession(session);
      expect(manager.isActive()).toBe(true);
      expect(manager.getStatus()).toBe('active');
    });
  });

  describe('extendSession', () => {
    it('extends the session', async () => {
      const session: Session = {
        id: 'session-1', userId: 'user-1', accessToken: 'token-123',
        createdAt: new Date(), expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        lastActivityAt: new Date(), extensionCount: 0, mfaVerified: true,
      };
      manager.startSession(session);
      const result = await manager.extendSession();
      expect(result).toBe(true);
      expect(manager.getSession()?.extensionCount).toBe(1);
    });

    it('prevents extension beyond max', async () => {
      const session: Session = {
        id: 'session-1', userId: 'user-1', accessToken: 'token-123',
        createdAt: new Date(), expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        lastActivityAt: new Date(), extensionCount: 2, mfaVerified: true,
      };
      manager.startSession(session);
      const result = await manager.extendSession();
      expect(result).toBe(false);
    });
  });

  describe('getRemainingTime', () => {
    it('returns remaining time in milliseconds', () => {
      const session: Session = {
        id: 'session-1', userId: 'user-1', accessToken: 'token-123',
        createdAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        lastActivityAt: new Date(), extensionCount: 0, mfaVerified: true,
      };
      manager.startSession(session);
      const remaining = manager.getRemainingTime();
      expect(remaining).toBeGreaterThan(29 * 60 * 1000);
      expect(remaining).toBeLessThanOrEqual(30 * 60 * 1000);
    });
  });
});

// Session Validation Tests
describe('Session Validation', () => {
  describe('isSessionValid', () => {
    it('returns true for valid session', () => {
      const session: Session = {
        id: 'session-1', userId: 'user-1', accessToken: 'token-123',
        createdAt: new Date(), expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        lastActivityAt: new Date(), extensionCount: 0, mfaVerified: true,
      };
      expect(isSessionValid(session)).toBe(true);
    });

    it('returns false for expired session', () => {
      const session: Session = {
        id: 'session-1', userId: 'user-1', accessToken: 'token-123',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
        lastActivityAt: new Date(), extensionCount: 0, mfaVerified: true,
      };
      expect(isSessionValid(session)).toBe(false);
    });

    it('returns false for null session', () => {
      expect(isSessionValid(null)).toBe(false);
    });
  });

  describe('sessionNeedsRefresh', () => {
    it('returns true when session expires within 5 minutes', () => {
      const session: Session = {
        id: 'session-1', userId: 'user-1', accessToken: 'token-123',
        createdAt: new Date(), expiresAt: new Date(Date.now() + 3 * 60 * 1000),
        lastActivityAt: new Date(), extensionCount: 0, mfaVerified: true,
      };
      expect(sessionNeedsRefresh(session)).toBe(true);
    });

    it('returns false when session has more than 5 minutes', () => {
      const session: Session = {
        id: 'session-1', userId: 'user-1', accessToken: 'token-123',
        createdAt: new Date(), expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        lastActivityAt: new Date(), extensionCount: 0, mfaVerified: true,
      };
      expect(sessionNeedsRefresh(session)).toBe(false);
    });
  });
});
