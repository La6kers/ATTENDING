// ============================================================
// ATTENDING AI - Multi-IdP SSO Configuration
// apps/shared/lib/auth/ssoProviders.ts
//
// Config-driven identity provider support.
// Generates NextAuth.js provider configs from stored settings.
//
// Supported protocols:
//   - OpenID Connect (OIDC) — Okta, Azure AD, Auth0, Google, etc.
//   - SAML 2.0 — Enterprise SSO (PingFederate, ADFS, etc.)
//   - Azure AD B2C — Current default
//
// Per-tenant IdP: Each organization can configure its own IdP,
// enabling different hospitals to use their own SSO.
//
// Usage:
//   import { buildProviders } from '@attending/shared/lib/auth/ssoProviders';
//
//   // In [...nextauth].ts:
//   export default NextAuth({
//     providers: await buildProviders(orgId),
//   });
// ============================================================

// ============================================================
// TYPES
// ============================================================

export type SSOProtocol = 'oidc' | 'saml' | 'azure-ad-b2c';

export interface SSOProviderConfig {
  /** Unique identifier for this IdP config */
  id: string;
  /** Display name (shown on login button) */
  name: string;
  /** Protocol type */
  protocol: SSOProtocol;
  /** Organization this config belongs to (null = global/default) */
  organizationId: string | null;
  /** Whether this provider is active */
  isActive: boolean;

  /** OIDC configuration */
  oidc?: {
    issuer: string;           // e.g., https://company.okta.com
    clientId: string;
    clientSecret: string;     // Should reference secret manager
    scopes?: string[];        // Default: ['openid', 'profile', 'email']
    authorizationUrl?: string; // Override auto-discovery
    tokenUrl?: string;
    userinfoUrl?: string;
    jwksUrl?: string;
  };

  /** SAML configuration */
  saml?: {
    entryPoint: string;       // IdP SSO URL
    issuer: string;           // SP Entity ID (ATTENDING's identifier)
    cert: string;             // IdP signing certificate (PEM, no headers)
    callbackUrl: string;      // ACS URL
    signatureAlgorithm?: 'sha1' | 'sha256' | 'sha512';
    digestAlgorithm?: 'sha1' | 'sha256' | 'sha512';
    wantAssertionsSigned?: boolean;
    attributeMapping?: {
      email?: string;         // SAML attribute name for email
      name?: string;
      role?: string;
      npi?: string;
    };
  };

  /** Azure AD B2C configuration */
  azureAdB2c?: {
    tenantName: string;
    clientId: string;
    clientSecret: string;
    primaryUserFlow: string;  // e.g., 'B2C_1_signupsignin'
  };

  /** Role mapping: IdP claim/attribute → ATTENDING role */
  roleMapping?: Record<string, string>;
  // e.g., { 'Physician': 'PROVIDER', 'Nurse': 'NURSE', 'Admin': 'ADMIN' }
}

// ============================================================
// PROVIDER BUILDERS
// ============================================================

/**
 * Build NextAuth.js provider configurations from SSO configs.
 * Returns an array of provider objects ready for NextAuth.
 */
export function buildNextAuthProviders(configs: SSOProviderConfig[]): any[] {
  const providers: any[] = [];

  for (const config of configs) {
    if (!config.isActive) continue;

    switch (config.protocol) {
      case 'oidc':
        if (config.oidc) {
          providers.push(buildOIDCProvider(config));
        }
        break;
      case 'saml':
        if (config.saml) {
          providers.push(buildSAMLProviderConfig(config));
        }
        break;
      case 'azure-ad-b2c':
        if (config.azureAdB2c) {
          providers.push(buildAzureADB2CProvider(config));
        }
        break;
    }
  }

  return providers;
}

function buildOIDCProvider(config: SSOProviderConfig): any {
  const oidc = config.oidc!;
  return {
    id: `oidc-${config.id}`,
    name: config.name,
    type: 'oauth',
    wellKnown: `${oidc.issuer}/.well-known/openid-configuration`,
    clientId: oidc.clientId,
    clientSecret: oidc.clientSecret,
    authorization: {
      params: {
        scope: (oidc.scopes || ['openid', 'profile', 'email']).join(' '),
      },
    },
    ...(oidc.authorizationUrl ? {
      authorization: { url: oidc.authorizationUrl },
      token: { url: oidc.tokenUrl },
      userinfo: { url: oidc.userinfoUrl },
    } : {}),
    profile(profile: any) {
      return {
        id: profile.sub,
        name: profile.name || profile.preferred_username,
        email: profile.email,
        role: mapRole(profile, config.roleMapping),
      };
    },
  };
}

function buildSAMLProviderConfig(config: SSOProviderConfig): any {
  const saml = config.saml!;
  // NextAuth doesn't natively support SAML, but we return the config
  // for a custom SAML handler using passport-saml or similar
  return {
    id: `saml-${config.id}`,
    name: config.name,
    type: 'credentials', // SAML is handled as a custom credentials provider
    _samlConfig: {
      entryPoint: saml.entryPoint,
      issuer: saml.issuer,
      cert: saml.cert,
      callbackUrl: saml.callbackUrl,
      signatureAlgorithm: saml.signatureAlgorithm || 'sha256',
      digestAlgorithm: saml.digestAlgorithm || 'sha256',
      wantAssertionsSigned: saml.wantAssertionsSigned ?? true,
      attributeMapping: saml.attributeMapping || {
        email: 'email',
        name: 'displayName',
      },
    },
    credentials: {},
    async authorize(credentials: any) {
      // SAML assertion is validated by the SAML middleware
      // and passed here as credentials. This is a simplified representation.
      if (credentials?.samlResponse) {
        return {
          id: credentials.nameId,
          email: credentials.email,
          name: credentials.name,
          role: mapRole(credentials, config.roleMapping),
        };
      }
      return null;
    },
  };
}

function buildAzureADB2CProvider(config: SSOProviderConfig): any {
  const b2c = config.azureAdB2c!;
  return {
    id: `azure-ad-b2c-${config.id}`,
    name: config.name,
    type: 'oauth',
    wellKnown: `https://${b2c.tenantName}.b2clogin.com/${b2c.tenantName}.onmicrosoft.com/${b2c.primaryUserFlow}/v2.0/.well-known/openid-configuration`,
    clientId: b2c.clientId,
    clientSecret: b2c.clientSecret,
    authorization: {
      params: {
        scope: 'openid profile email',
      },
    },
    profile(profile: any) {
      return {
        id: profile.sub || profile.oid,
        name: profile.name || `${profile.given_name} ${profile.family_name}`,
        email: profile.emails?.[0] || profile.email,
        role: mapRole(profile, config.roleMapping),
      };
    },
  };
}

// ============================================================
// ROLE MAPPING
// ============================================================

function mapRole(
  profile: Record<string, unknown>,
  roleMapping?: Record<string, string>
): string {
  if (!roleMapping) return 'STAFF';

  // Check common claim locations for roles
  const roleClaim =
    profile.role ||
    profile.roles ||
    profile['custom:role'] ||
    profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
    profile.groups;

  if (!roleClaim) return 'STAFF';

  // Handle array of roles (take highest privilege)
  const roles = Array.isArray(roleClaim) ? roleClaim : [String(roleClaim)];

  // Priority order: ADMIN > PROVIDER > NURSE > STAFF
  const priority = ['ADMIN', 'PROVIDER', 'NURSE', 'STAFF'];

  for (const priorityRole of priority) {
    for (const r of roles) {
      const mapped = roleMapping[String(r)];
      if (mapped === priorityRole) return priorityRole;
    }
  }

  // Direct match without mapping
  for (const priorityRole of priority) {
    for (const r of roles) {
      if (String(r).toUpperCase() === priorityRole) return priorityRole;
    }
  }

  return 'STAFF';
}

// ============================================================
// WELL-KNOWN SSO PRESETS
// ============================================================

/**
 * Pre-built configurations for common enterprise IdPs.
 * Fill in clientId/clientSecret from environment variables.
 */
export const SSO_PRESETS: Record<string, Partial<SSOProviderConfig>> = {
  okta: {
    name: 'Okta',
    protocol: 'oidc',
    oidc: {
      issuer: '', // https://your-org.okta.com
      clientId: '',
      clientSecret: '',
      scopes: ['openid', 'profile', 'email', 'groups'],
    },
    roleMapping: {
      'Physician': 'PROVIDER',
      'Nurse': 'NURSE',
      'Admin': 'ADMIN',
      'Staff': 'STAFF',
    },
  },
  'azure-ad': {
    name: 'Microsoft Entra ID',
    protocol: 'oidc',
    oidc: {
      issuer: '', // https://login.microsoftonline.com/{tenantId}/v2.0
      clientId: '',
      clientSecret: '',
      scopes: ['openid', 'profile', 'email'],
    },
  },
  auth0: {
    name: 'Auth0',
    protocol: 'oidc',
    oidc: {
      issuer: '', // https://your-domain.auth0.com/
      clientId: '',
      clientSecret: '',
      scopes: ['openid', 'profile', 'email'],
    },
  },
  google: {
    name: 'Google Workspace',
    protocol: 'oidc',
    oidc: {
      issuer: 'https://accounts.google.com',
      clientId: '',
      clientSecret: '',
      scopes: ['openid', 'profile', 'email'],
    },
  },
  pingfederate: {
    name: 'PingFederate',
    protocol: 'saml',
    saml: {
      entryPoint: '', // https://sso.hospital.org/idp/SSO.saml2
      issuer: 'attending-ai',
      cert: '',
      callbackUrl: '', // https://app.attending.ai/api/auth/saml/callback
    },
  },
};

export default { buildNextAuthProviders, SSO_PRESETS };
