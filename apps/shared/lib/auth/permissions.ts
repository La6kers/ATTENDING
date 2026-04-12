// =============================================================================
// ATTENDING AI - Permission Definitions
// apps/shared/lib/auth/permissions.ts
//
// Role-based permission mappings for healthcare workflows
// =============================================================================

import {
  Permission,
  UserRole,
  PrescribingPrivileges,
  ControlledSubstanceSchedule,
  PermissionCategory,
  ROLE_HIERARCHY,
} from './types';

// =============================================================================
// Permission Constants
// =============================================================================

/**
 * All available permissions organized by category
 */
export const PERMISSIONS = {
  // Assessment permissions
  assessments: {
    view: 'assessments:view' as Permission,
    create: 'assessments:create' as Permission,
    edit: 'assessments:edit' as Permission,
    delete: 'assessments:delete' as Permission,
    sign: 'assessments:sign' as Permission,
    approve: 'assessments:approve' as Permission,
  },
  
  // Patient permissions
  patients: {
    view: 'patients:view' as Permission,
    create: 'patients:create' as Permission,
    edit: 'patients:edit' as Permission,
    delete: 'patients:delete' as Permission,
    export: 'patients:export' as Permission,
  },
  
  // Order permissions (general)
  orders: {
    view: 'orders:view' as Permission,
    create: 'orders:create' as Permission,
    edit: 'orders:edit' as Permission,
    delete: 'orders:delete' as Permission,
    sign: 'orders:sign' as Permission,
    approve: 'orders:approve' as Permission,
  },
  
  // Medication permissions
  medications: {
    view: 'medications:view' as Permission,
    create: 'medications:create' as Permission,
    edit: 'medications:edit' as Permission,
    delete: 'medications:delete' as Permission,
    prescribe: 'medications:prescribe' as Permission,
    sign: 'medications:sign' as Permission,
  },
  
  // Lab permissions
  labs: {
    view: 'labs:view' as Permission,
    create: 'labs:create' as Permission,
    edit: 'labs:edit' as Permission,
    delete: 'labs:delete' as Permission,
    sign: 'labs:sign' as Permission,
  },
  
  // Imaging permissions
  imaging: {
    view: 'imaging:view' as Permission,
    create: 'imaging:create' as Permission,
    edit: 'imaging:edit' as Permission,
    delete: 'imaging:delete' as Permission,
    sign: 'imaging:sign' as Permission,
  },
  
  // Referral permissions
  referrals: {
    view: 'referrals:view' as Permission,
    create: 'referrals:create' as Permission,
    edit: 'referrals:edit' as Permission,
    delete: 'referrals:delete' as Permission,
    sign: 'referrals:sign' as Permission,
    approve: 'referrals:approve' as Permission,
  },
  
  // Document permissions
  documents: {
    view: 'documents:view' as Permission,
    create: 'documents:create' as Permission,
    edit: 'documents:edit' as Permission,
    delete: 'documents:delete' as Permission,
    sign: 'documents:sign' as Permission,
    export: 'documents:export' as Permission,
  },
  
  // Messaging permissions
  messaging: {
    view: 'messaging:view' as Permission,
    create: 'messaging:create' as Permission,
    delete: 'messaging:delete' as Permission,
  },
  
  // Scheduling permissions
  scheduling: {
    view: 'scheduling:view' as Permission,
    create: 'scheduling:create' as Permission,
    edit: 'scheduling:edit' as Permission,
    delete: 'scheduling:delete' as Permission,
    manage: 'scheduling:manage' as Permission,
  },
  
  // Billing permissions
  billing: {
    view: 'billing:view' as Permission,
    create: 'billing:create' as Permission,
    edit: 'billing:edit' as Permission,
    delete: 'billing:delete' as Permission,
    approve: 'billing:approve' as Permission,
    export: 'billing:export' as Permission,
  },
  
  // Reports permissions
  reports: {
    view: 'reports:view' as Permission,
    create: 'reports:create' as Permission,
    export: 'reports:export' as Permission,
  },
  
  // Admin permissions
  admin: {
    view: 'admin:view' as Permission,
    create: 'admin:create' as Permission,
    edit: 'admin:edit' as Permission,
    delete: 'admin:delete' as Permission,
    manage: 'admin:manage' as Permission,
  },
  
  // System permissions
  system: {
    view: 'system:view' as Permission,
    manage: 'system:manage' as Permission,
  },
} as const;

// =============================================================================
// Role-Permission Mappings
// =============================================================================

/**
 * Default permissions for each role
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Physician - Full clinical access
  physician: [
    PERMISSIONS.assessments.view, PERMISSIONS.assessments.create, PERMISSIONS.assessments.edit,
    PERMISSIONS.assessments.delete, PERMISSIONS.assessments.sign, PERMISSIONS.assessments.approve,
    PERMISSIONS.patients.view, PERMISSIONS.patients.create, PERMISSIONS.patients.edit, PERMISSIONS.patients.export,
    PERMISSIONS.orders.view, PERMISSIONS.orders.create, PERMISSIONS.orders.edit,
    PERMISSIONS.orders.delete, PERMISSIONS.orders.sign, PERMISSIONS.orders.approve,
    PERMISSIONS.medications.view, PERMISSIONS.medications.create, PERMISSIONS.medications.edit,
    PERMISSIONS.medications.delete, PERMISSIONS.medications.prescribe, PERMISSIONS.medications.sign,
    PERMISSIONS.labs.view, PERMISSIONS.labs.create, PERMISSIONS.labs.edit, PERMISSIONS.labs.delete, PERMISSIONS.labs.sign,
    PERMISSIONS.imaging.view, PERMISSIONS.imaging.create, PERMISSIONS.imaging.edit, PERMISSIONS.imaging.delete, PERMISSIONS.imaging.sign,
    PERMISSIONS.referrals.view, PERMISSIONS.referrals.create, PERMISSIONS.referrals.edit,
    PERMISSIONS.referrals.delete, PERMISSIONS.referrals.sign, PERMISSIONS.referrals.approve,
    PERMISSIONS.documents.view, PERMISSIONS.documents.create, PERMISSIONS.documents.edit,
    PERMISSIONS.documents.delete, PERMISSIONS.documents.sign, PERMISSIONS.documents.export,
    PERMISSIONS.messaging.view, PERMISSIONS.messaging.create,
    PERMISSIONS.scheduling.view, PERMISSIONS.scheduling.create, PERMISSIONS.scheduling.edit,
    PERMISSIONS.reports.view, PERMISSIONS.reports.create, PERMISSIONS.reports.export,
  ],

  // Nurse Practitioner - Similar to physician, may need supervision
  nurse_practitioner: [
    PERMISSIONS.assessments.view, PERMISSIONS.assessments.create, PERMISSIONS.assessments.edit, PERMISSIONS.assessments.sign,
    PERMISSIONS.patients.view, PERMISSIONS.patients.create, PERMISSIONS.patients.edit,
    PERMISSIONS.orders.view, PERMISSIONS.orders.create, PERMISSIONS.orders.edit, PERMISSIONS.orders.sign,
    PERMISSIONS.medications.view, PERMISSIONS.medications.create, PERMISSIONS.medications.edit, PERMISSIONS.medications.prescribe, PERMISSIONS.medications.sign,
    PERMISSIONS.labs.view, PERMISSIONS.labs.create, PERMISSIONS.labs.edit, PERMISSIONS.labs.sign,
    PERMISSIONS.imaging.view, PERMISSIONS.imaging.create, PERMISSIONS.imaging.edit, PERMISSIONS.imaging.sign,
    PERMISSIONS.referrals.view, PERMISSIONS.referrals.create, PERMISSIONS.referrals.edit, PERMISSIONS.referrals.sign,
    PERMISSIONS.documents.view, PERMISSIONS.documents.create, PERMISSIONS.documents.edit, PERMISSIONS.documents.sign, PERMISSIONS.documents.export,
    PERMISSIONS.messaging.view, PERMISSIONS.messaging.create,
    PERMISSIONS.scheduling.view, PERMISSIONS.scheduling.create, PERMISSIONS.scheduling.edit,
    PERMISSIONS.reports.view,
  ],

  // Physician Assistant - Requires physician supervision
  physician_assistant: [
    PERMISSIONS.assessments.view, PERMISSIONS.assessments.create, PERMISSIONS.assessments.edit, PERMISSIONS.assessments.sign,
    PERMISSIONS.patients.view, PERMISSIONS.patients.create, PERMISSIONS.patients.edit,
    PERMISSIONS.orders.view, PERMISSIONS.orders.create, PERMISSIONS.orders.edit, PERMISSIONS.orders.sign,
    PERMISSIONS.medications.view, PERMISSIONS.medications.create, PERMISSIONS.medications.edit, PERMISSIONS.medications.prescribe, PERMISSIONS.medications.sign,
    PERMISSIONS.labs.view, PERMISSIONS.labs.create, PERMISSIONS.labs.edit, PERMISSIONS.labs.sign,
    PERMISSIONS.imaging.view, PERMISSIONS.imaging.create, PERMISSIONS.imaging.edit, PERMISSIONS.imaging.sign,
    PERMISSIONS.referrals.view, PERMISSIONS.referrals.create, PERMISSIONS.referrals.edit, PERMISSIONS.referrals.sign,
    PERMISSIONS.documents.view, PERMISSIONS.documents.create, PERMISSIONS.documents.edit, PERMISSIONS.documents.sign,
    PERMISSIONS.messaging.view, PERMISSIONS.messaging.create,
    PERMISSIONS.scheduling.view, PERMISSIONS.scheduling.create, PERMISSIONS.scheduling.edit,
    PERMISSIONS.reports.view,
  ],

  // Nurse - Clinical care, no prescribing
  nurse: [
    PERMISSIONS.assessments.view, PERMISSIONS.assessments.create, PERMISSIONS.assessments.edit,
    PERMISSIONS.patients.view, PERMISSIONS.patients.create, PERMISSIONS.patients.edit,
    PERMISSIONS.orders.view,
    PERMISSIONS.medications.view,
    PERMISSIONS.labs.view, PERMISSIONS.labs.create,
    PERMISSIONS.imaging.view,
    PERMISSIONS.referrals.view,
    PERMISSIONS.documents.view, PERMISSIONS.documents.create, PERMISSIONS.documents.edit,
    PERMISSIONS.messaging.view, PERMISSIONS.messaging.create,
    PERMISSIONS.scheduling.view, PERMISSIONS.scheduling.create, PERMISSIONS.scheduling.edit,
  ],

  // Medical Assistant - Limited clinical tasks
  medical_assistant: [
    PERMISSIONS.assessments.view, PERMISSIONS.assessments.create,
    PERMISSIONS.patients.view, PERMISSIONS.patients.create, PERMISSIONS.patients.edit,
    PERMISSIONS.orders.view,
    PERMISSIONS.medications.view,
    PERMISSIONS.labs.view,
    PERMISSIONS.imaging.view,
    PERMISSIONS.documents.view, PERMISSIONS.documents.create,
    PERMISSIONS.messaging.view, PERMISSIONS.messaging.create,
    PERMISSIONS.scheduling.view, PERMISSIONS.scheduling.create, PERMISSIONS.scheduling.edit,
  ],

  // Administrator - Full system access
  administrator: [
    ...Object.values(PERMISSIONS.assessments),
    ...Object.values(PERMISSIONS.patients),
    ...Object.values(PERMISSIONS.orders),
    ...Object.values(PERMISSIONS.medications).filter(p => p !== PERMISSIONS.medications.prescribe),
    ...Object.values(PERMISSIONS.labs),
    ...Object.values(PERMISSIONS.imaging),
    ...Object.values(PERMISSIONS.referrals),
    ...Object.values(PERMISSIONS.documents),
    ...Object.values(PERMISSIONS.messaging),
    ...Object.values(PERMISSIONS.scheduling),
    ...Object.values(PERMISSIONS.billing),
    ...Object.values(PERMISSIONS.reports),
    ...Object.values(PERMISSIONS.admin),
    ...Object.values(PERMISSIONS.system),
  ],

  // Office Manager - Practice management
  office_manager: [
    PERMISSIONS.patients.view, PERMISSIONS.patients.create, PERMISSIONS.patients.edit,
    PERMISSIONS.documents.view, PERMISSIONS.documents.create, PERMISSIONS.documents.edit,
    PERMISSIONS.messaging.view, PERMISSIONS.messaging.create,
    PERMISSIONS.scheduling.view, PERMISSIONS.scheduling.create, PERMISSIONS.scheduling.edit, PERMISSIONS.scheduling.manage,
    PERMISSIONS.billing.view, PERMISSIONS.billing.create, PERMISSIONS.billing.edit,
    PERMISSIONS.reports.view, PERMISSIONS.reports.create, PERMISSIONS.reports.export,
    PERMISSIONS.admin.view,
  ],

  // Billing Specialist
  billing_specialist: [
    PERMISSIONS.patients.view,
    PERMISSIONS.documents.view,
    PERMISSIONS.billing.view, PERMISSIONS.billing.create, PERMISSIONS.billing.edit, PERMISSIONS.billing.export,
    PERMISSIONS.reports.view, PERMISSIONS.reports.export,
  ],

  // Receptionist - Front desk
  receptionist: [
    PERMISSIONS.patients.view, PERMISSIONS.patients.create, PERMISSIONS.patients.edit,
    PERMISSIONS.documents.view,
    PERMISSIONS.messaging.view, PERMISSIONS.messaging.create,
    PERMISSIONS.scheduling.view, PERMISSIONS.scheduling.create, PERMISSIONS.scheduling.edit,
  ],
};

// =============================================================================
// Prescribing Privileges by Role
// =============================================================================

export const ROLE_PRESCRIBING_PRIVILEGES: Record<UserRole, PrescribingPrivileges> = {
  physician: {
    canPrescribe: true,
    canPrescribeControlled: true,
    controlledSchedules: ['II', 'III', 'IV', 'V'],
    requiresSupervision: false,
  },
  nurse_practitioner: {
    canPrescribe: true,
    canPrescribeControlled: true,
    controlledSchedules: ['III', 'IV', 'V'],
    requiresSupervision: false,
  },
  physician_assistant: {
    canPrescribe: true,
    canPrescribeControlled: true,
    controlledSchedules: ['III', 'IV', 'V'],
    requiresSupervision: true,
  },
  nurse: { canPrescribe: false, canPrescribeControlled: false, controlledSchedules: [], requiresSupervision: true },
  medical_assistant: { canPrescribe: false, canPrescribeControlled: false, controlledSchedules: [], requiresSupervision: true },
  administrator: { canPrescribe: false, canPrescribeControlled: false, controlledSchedules: [], requiresSupervision: false },
  office_manager: { canPrescribe: false, canPrescribeControlled: false, controlledSchedules: [], requiresSupervision: false },
  billing_specialist: { canPrescribe: false, canPrescribeControlled: false, controlledSchedules: [], requiresSupervision: false },
  receptionist: { canPrescribe: false, canPrescribeControlled: false, controlledSchedules: [], requiresSupervision: false },
};

// =============================================================================
// Permission Checking Utilities
// =============================================================================

export function hasPermission(userPermissions: Permission[], permission: Permission): boolean {
  return userPermissions.includes(permission);
}

export function hasAllPermissions(userPermissions: Permission[], permissions: Permission[]): boolean {
  return permissions.every((p) => userPermissions.includes(p));
}

export function hasAnyPermission(userPermissions: Permission[], permissions: Permission[]): boolean {
  return permissions.some((p) => userPermissions.includes(p));
}

export function getMissingPermissions(userPermissions: Permission[], requiredPermissions: Permission[]): Permission[] {
  return requiredPermissions.filter((p) => !userPermissions.includes(p));
}

export function canPrescribeSchedule(privileges: PrescribingPrivileges, schedule: ControlledSubstanceSchedule): boolean {
  return privileges.canPrescribeControlled && privileges.controlledSchedules.includes(schedule);
}

export function requiresSupervision(role: UserRole): boolean {
  return ROLE_PRESCRIBING_PRIVILEGES[role].requiresSupervision;
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function hasHigherPrivilege(role1: UserRole, role2: UserRole): boolean {
  return (ROLE_HIERARCHY[role1] || 0) > (ROLE_HIERARCHY[role2] || 0);
}

export function getPermissionDisplayName(permission: Permission): string {
  const [category, action] = permission.split(':');
  const categoryNames: Record<string, string> = {
    assessments: 'Assessments', patients: 'Patients', orders: 'Orders', medications: 'Medications',
    labs: 'Lab Orders', imaging: 'Imaging Orders', referrals: 'Referrals', documents: 'Documents',
    messaging: 'Messaging', scheduling: 'Scheduling', billing: 'Billing', reports: 'Reports',
    admin: 'Administration', system: 'System',
  };
  const actionNames: Record<string, string> = {
    view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', sign: 'Sign',
    prescribe: 'Prescribe', approve: 'Approve', export: 'Export', manage: 'Manage',
  };
  return `${categoryNames[category] || category} - ${actionNames[action] || action}`;
}

export function groupPermissionsByCategory(permissions: Permission[]): Record<PermissionCategory, Permission[]> {
  const grouped: Record<string, Permission[]> = {};
  for (const permission of permissions) {
    const [category] = permission.split(':');
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(permission);
  }
  return grouped as Record<PermissionCategory, Permission[]>;
}
