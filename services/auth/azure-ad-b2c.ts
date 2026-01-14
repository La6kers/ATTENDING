// =============================================================================
// ATTENDING AI - Azure AD B2C Authentication Service
// services/auth/azure-ad-b2c.ts
//
// Enterprise authentication service for healthcare organizations.
// Supports role-based access control with healthcare-specific permissions.
// =============================================================================

import { PublicClientApplication, Configuration, LogLevel, AccountInfo } from '@azure/msal-browser';
import { ConfidentialClientApplication, Configuration as ServerConfig } from '@azure/msal-node';

// ============================================================================
// Types
// ============================================================================

export interface HealthcareUser {
  id: string;
  email: string;
  name: string;
  role: HealthcareRole;
  permissions: Permission[];
  organization: {
    id: string;
    name: string;
    type: 'hospital' | 'clinic' | 'health_system' | 'practice';
  };
  department?: string;
  specialties?: string[];
  npiNumber?: string;
  licenseState?: string;
  sessionExpiry: Date;
}

export type HealthcareRole = 
  | 'physician'
  | 'nurse_practitioner'
  | 'physician_assistant'
  | 'registered_nurse'
  | 'medical_assistant'
  | 'clinical_staff'
  | 'admin'
  | 'superadmin';

export type Permission =
  | 'view_patients'
  | 'edit_patients'
  | 'view_assessments'
  | 'edit_assessments'
  | 'order_labs'
  | 'order_imaging'
  | 'order_medications'
  | 'prescribe_controlled'
  | 'view_reports'
  | 'generate_reports'
  | 'manage_users'
  | 'manage_settings'
  | 'audit_access'
  | 'emergency_override';

export interface AuthConfig {
  clientId: string;
  authority: string;
  knownAuthorities: string[];
  redirectUri: string;
  postLogoutRedirectUri: string;
  scopes: string[];
}

export interface TokenResponse {
  accessToken: string;
  idToken: string;
  expiresOn: Date;
  account: AccountInfo;
}

// ============================================================================
// Role-Permission Mapping
// ============================================================================

const ROLE_PERMISSIONS: Record<HealthcareRole, Permission[]> = {
  physician: [
    'view_patients',
    'edit_patients',
    'view_assessments',
    'edit_assessments',
    'order_labs',
    'order_imaging',
    'order_medications',
    'prescribe_controlled',
    'view_reports',
    'generate_reports',
    'emergency_override',
  ],
  nurse_practitioner: [
    'view_patients',
    'edit_patients',
    'view_assessments',
    'edit_assessments',
    'order_labs',
    'order_imaging',
    'order_medications',
    'prescribe_controlled', // Depends on state regulations
    'view_reports',
    'emergency_override',
  ],
  physician_assistant: [
    'view_patients',
    'edit_patients',
    'view_assessments',
    'edit_assessments',
    'order_labs',
    'order_imaging',
    'order_medications',
    'view_reports',
    'emergency_override',
  ],
  registered_nurse: [
    'view_patients',
    'edit_patients',
    'view_assessments',
    'edit_assessments',
    'view_reports',
  ],
  medical_assistant: [
    'view_patients',
    'view_assessments',
  ],
  clinical_staff: [
    'view_patients',
    'view_assessments',
  ],
  admin: [
    'view_patients',
    'view_assessments',
    'view_reports',
    'generate_reports',
    'manage_users',
    'manage_settings',
    'audit_access',
  ],
  superadmin: [
    'view_patients',
    'edit_patients',
    'view_assessments',
    'edit_assessments',
    'order_labs',
    'order_imaging',
    'order_medications',
    'prescribe_controlled',
    'view_reports',
    'generate_reports',
    'manage_users',
    'manage_settings',
    'audit_access',
    'emergency_override',
  ],
};

// ============================================================================
// Browser Authentication Client
// ============================================================================

export class AzureADB2CClient {
  private msalInstance: PublicClientApplication;
  private config: AuthConfig;
  private currentUser: HealthcareUser | null = null;

  constructor(config?: Partial<AuthConfig>) {
    this.config = {
      clientId: config?.clientId || process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || '',
      authority: config?.authority || `https://${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_NAME}.b2clogin.com/${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_NAME}.onmicrosoft.com/${process.env.NEXT_PUBLIC_AZURE_AD_POLICY_NAME}`,
      knownAuthorities: config?.knownAuthorities || [`${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_NAME}.b2clogin.com`],
      redirectUri: config?.redirectUri || process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/auth/callback',
      postLogoutRedirectUri: config?.postLogoutRedirectUri || process.env.NEXT_PUBLIC_POST_LOGOUT_URI || 'http://localhost:3000',
      scopes: config?.scopes || ['openid', 'profile', 'email', `https://${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_NAME}.onmicrosoft.com/api/access`],
    };

    const msalConfig: Configuration = {
      auth: {
        clientId: this.config.clientId,
        authority: this.config.authority,
        knownAuthorities: this.config.knownAuthorities,
        redirectUri: this.config.redirectUri,
        postLogoutRedirectUri: this.config.postLogoutRedirectUri,
      },
      cache: {
        cacheLocation: 'sessionStorage', // More secure for healthcare
        storeAuthStateInCookie: false,
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message, containsPii) => {
            if (containsPii) return;
            switch (level) {
              case LogLevel.Error:
                console.error('[AUTH]', message);
                break;
              case LogLevel.Warning:
                console.warn('[AUTH]', message);
                break;
              case LogLevel.Info:
                console.info('[AUTH]', message);
                break;
              default:
                break;
            }
          },
          piiLoggingEnabled: false,
        },
      },
    };

    this.msalInstance = new PublicClientApplication(msalConfig);
  }

  async initialize(): Promise<void> {
    await this.msalInstance.initialize();
    
    // Handle redirect promise
    const response = await this.msalInstance.handleRedirectPromise();
    if (response) {
      this.currentUser = await this.processAuthResponse(response);
    } else {
      // Check for existing session
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        try {
          const silentResponse = await this.msalInstance.acquireTokenSilent({
            scopes: this.config.scopes,
            account: accounts[0],
          });
          this.currentUser = await this.processAuthResponse(silentResponse);
        } catch (error) {
          console.warn('[AUTH] Silent token acquisition failed, user needs to re-authenticate');
        }
      }
    }
  }

  async login(): Promise<HealthcareUser | null> {
    try {
      const response = await this.msalInstance.loginPopup({
        scopes: this.config.scopes,
      });
      
      this.currentUser = await this.processAuthResponse(response);
      return this.currentUser;
    } catch (error) {
      console.error('[AUTH] Login failed:', error);
      throw error;
    }
  }

  async loginRedirect(): Promise<void> {
    await this.msalInstance.loginRedirect({
      scopes: this.config.scopes,
    });
  }

  async logout(): Promise<void> {
    const account = this.msalInstance.getAllAccounts()[0];
    if (account) {
      await this.msalInstance.logoutPopup({
        account,
        postLogoutRedirectUri: this.config.postLogoutRedirectUri,
      });
    }
    this.currentUser = null;
  }

  async getAccessToken(): Promise<string | null> {
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length === 0) return null;

    try {
      const response = await this.msalInstance.acquireTokenSilent({
        scopes: this.config.scopes,
        account: accounts[0],
      });
      return response.accessToken;
    } catch (error) {
      console.error('[AUTH] Token acquisition failed:', error);
      return null;
    }
  }

  getCurrentUser(): HealthcareUser | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  hasPermission(permission: Permission): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.permissions.includes(permission);
  }

  hasAnyPermission(permissions: Permission[]): boolean {
    if (!this.currentUser) return false;
    return permissions.some(p => this.currentUser!.permissions.includes(p));
  }

  hasAllPermissions(permissions: Permission[]): boolean {
    if (!this.currentUser) return false;
    return permissions.every(p => this.currentUser!.permissions.includes(p));
  }

  private async processAuthResponse(response: any): Promise<HealthcareUser> {
    const account = response.account;
    const claims = response.idTokenClaims as Record<string, any>;
    
    // Extract healthcare-specific claims from token
    const role = (claims.extension_Role || claims.role || 'clinical_staff') as HealthcareRole;
    const permissions = ROLE_PERMISSIONS[role] || [];
    
    const user: HealthcareUser = {
      id: account.localAccountId || account.homeAccountId,
      email: claims.email || claims.emails?.[0] || '',
      name: claims.name || `${claims.given_name || ''} ${claims.family_name || ''}`.trim(),
      role,
      permissions,
      organization: {
        id: claims.extension_OrgId || 'default',
        name: claims.extension_OrgName || 'Unknown Organization',
        type: claims.extension_OrgType || 'clinic',
      },
      department: claims.extension_Department,
      specialties: claims.extension_Specialties?.split(','),
      npiNumber: claims.extension_NPI,
      licenseState: claims.extension_LicenseState,
      sessionExpiry: new Date(response.expiresOn),
    };

    // Audit log for authentication
    console.log('[AUDIT] User authenticated:', {
      timestamp: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      role: user.role,
      organization: user.organization.name,
    });

    return user;
  }
}

// ============================================================================
// Server-side Token Validation
// ============================================================================

export class TokenValidator {
  private jwksUri: string;
  private issuer: string;
  private audience: string;

  constructor() {
    const tenantName = process.env.AZURE_AD_TENANT_NAME;
    const policyName = process.env.AZURE_AD_POLICY_NAME;
    
    this.jwksUri = `https://${tenantName}.b2clogin.com/${tenantName}.onmicrosoft.com/${policyName}/discovery/v2.0/keys`;
    this.issuer = `https://${tenantName}.b2clogin.com/${process.env.AZURE_AD_TENANT_ID}/v2.0/`;
    this.audience = process.env.AZURE_AD_CLIENT_ID || '';
  }

  async validateToken(token: string): Promise<HealthcareUser | null> {
    try {
      // In production, use jsonwebtoken with jwks-rsa for proper validation
      // This is a simplified implementation
      const payload = this.decodeToken(token);
      
      if (!payload) {
        console.error('[AUTH] Invalid token format');
        return null;
      }

      // Check expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        console.error('[AUTH] Token expired');
        return null;
      }

      // Check issuer and audience
      if (payload.iss !== this.issuer) {
        console.error('[AUTH] Invalid issuer');
        return null;
      }

      if (payload.aud !== this.audience) {
        console.error('[AUTH] Invalid audience');
        return null;
      }

      // Extract user from claims
      const role = (payload.extension_Role || payload.role || 'clinical_staff') as HealthcareRole;
      
      return {
        id: payload.sub || payload.oid,
        email: payload.email || payload.emails?.[0] || '',
        name: payload.name || '',
        role,
        permissions: ROLE_PERMISSIONS[role] || [],
        organization: {
          id: payload.extension_OrgId || 'default',
          name: payload.extension_OrgName || 'Unknown',
          type: payload.extension_OrgType || 'clinic',
        },
        department: payload.extension_Department,
        specialties: payload.extension_Specialties?.split(','),
        npiNumber: payload.extension_NPI,
        licenseState: payload.extension_LicenseState,
        sessionExpiry: new Date(payload.exp * 1000),
      };
    } catch (error) {
      console.error('[AUTH] Token validation failed:', error);
      return null;
    }
  }

  private decodeToken(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8')
      );
      
      return payload;
    } catch {
      return null;
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export const authClient = typeof window !== 'undefined' 
  ? new AzureADB2CClient() 
  : null;

export const tokenValidator = new TokenValidator();

export { ROLE_PERMISSIONS };
