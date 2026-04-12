// =============================================================================
// ATTENDING AI - ID.me OIDC Provider
// packages/identity/src/providers/idme.ts
//
// ID.me IAL2 identity verification via OpenID Connect
// CMS-approved identity provider for Medicare App Library
// =============================================================================

import {
  IdmeConfig,
  IdmeConfigSchema,
  VerifiedIdentity,
  IdentityVerificationResult,
  IdmeTokenClaims,
} from '../types';

// =============================================================================
// ID.me OIDC Provider
// =============================================================================

export class IdmeProvider {
  private config: IdmeConfig;
  private issuerUrl: string;

  constructor(config: IdmeConfig) {
    this.config = IdmeConfigSchema.parse(config);
    this.issuerUrl = this.config.useSandbox
      ? this.config.sandboxIssuer
      : this.config.issuer;
  }

  // ---------------------------------------------------------------------------
  // OIDC Discovery
  // ---------------------------------------------------------------------------

  async getDiscoveryDocument(): Promise<OidcDiscoveryDocument> {
    const url = `${this.issuerUrl}/.well-known/openid-configuration`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ID.me discovery failed: ${response.status}`);
    }
    return response.json();
  }

  // ---------------------------------------------------------------------------
  // Authorization URL (Step 1: Redirect patient to ID.me)
  // ---------------------------------------------------------------------------

  async getAuthorizationUrl(params: {
    state: string;
    nonce: string;
    codeChallenge?: string;
    codeChallengeMethod?: 'S256';
  }): Promise<string> {
    const discovery = await this.getDiscoveryDocument();

    const searchParams = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: params.state,
      nonce: params.nonce,
    });

    // PKCE support (recommended for public clients)
    if (params.codeChallenge) {
      searchParams.set('code_challenge', params.codeChallenge);
      searchParams.set('code_challenge_method', params.codeChallengeMethod || 'S256');
    }

    return `${discovery.authorization_endpoint}?${searchParams.toString()}`;
  }

  // ---------------------------------------------------------------------------
  // Token Exchange (Step 2: Exchange auth code for tokens)
  // ---------------------------------------------------------------------------

  async exchangeCode(params: {
    code: string;
    codeVerifier?: string;
  }): Promise<TokenResponse> {
    const discovery = await this.getDiscoveryDocument();

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    if (params.codeVerifier) {
      body.set('code_verifier', params.codeVerifier);
    }

    const response = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ID.me token exchange failed: ${error}`);
    }

    return response.json();
  }

  // ---------------------------------------------------------------------------
  // Verify Identity (Step 3: Validate tokens and extract identity)
  // ---------------------------------------------------------------------------

  async verifyIdentity(params: {
    code: string;
    codeVerifier?: string;
    expectedNonce: string;
  }): Promise<IdentityVerificationResult> {
    try {
      // Exchange code for tokens
      const tokens = await this.exchangeCode({
        code: params.code,
        codeVerifier: params.codeVerifier,
      });

      // Decode and validate the ID token
      const claims = await this.validateIdToken(tokens.id_token, params.expectedNonce);

      // Check IAL level
      const ialLevel = this.extractIalLevel(claims);
      if (ialLevel !== 'IAL2' && ialLevel !== 'IAL3') {
        return {
          success: false,
          error: {
            code: 'IAL_INSUFFICIENT',
            message: `Identity assurance level ${ialLevel} does not meet IAL2 requirement`,
            provider: 'idme',
          },
        };
      }

      // Build verified identity
      const identity: VerifiedIdentity = {
        provider: 'idme',
        subject: claims.sub,
        ialLevel,
        verifiedAt: new Date(),
        expiresAt: tokens.refresh_token
          ? undefined // Refreshable tokens don't have a hard expiry
          : new Date(Date.now() + tokens.expires_in * 1000),
        givenName: claims.fname,
        familyName: claims.lname,
        birthDate: claims.birthdate,
        email: claims.email,
        emailVerified: claims.email_verified,
        phone: claims.phone,
        phoneVerified: claims.phone_verified,
        address: claims.address ? {
          streetAddress: claims.address.street_address,
          locality: claims.address.locality,
          region: claims.address.region,
          postalCode: claims.address.postal_code,
          country: claims.address.country,
        } : undefined,
        idToken: tokens.id_token,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      };

      return { success: true, identity };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PROVIDER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown verification error',
          provider: 'idme',
        },
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Token Validation
  // ---------------------------------------------------------------------------

  private async validateIdToken(idToken: string, expectedNonce: string): Promise<IdmeTokenClaims> {
    // Decode JWT payload (header.payload.signature)
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new Error('Invalid ID token format');

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    // Validate required claims
    if (!payload.sub) throw new Error('ID token missing sub claim');
    if (!payload.iss || !payload.iss.includes('id.me')) {
      throw new Error(`Invalid issuer: ${payload.iss}`);
    }
    if (payload.aud !== this.config.clientId) {
      throw new Error(`Invalid audience: ${payload.aud}`);
    }
    if (payload.nonce !== expectedNonce) {
      throw new Error('Nonce mismatch — possible replay attack');
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('ID token expired');
    }

    // In production, also validate the signature against ID.me's JWKS
    // using the `jose` library. For now, we validate structure and claims.
    // TODO: Add JWKS signature validation
    // const jwksUrl = `${this.issuerUrl}/.well-known/jwks.json`;
    // const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));
    // await jose.jwtVerify(idToken, JWKS, { issuer: this.issuerUrl, audience: this.config.clientId });

    return payload as IdmeTokenClaims;
  }

  // ---------------------------------------------------------------------------
  // IAL Level Extraction
  // ---------------------------------------------------------------------------

  private extractIalLevel(claims: IdmeTokenClaims): 'IAL1' | 'IAL2' | 'IAL3' {
    // ID.me encodes IAL in the `ial` claim or via credential_type
    if (claims.ial === 'http://idmanagement.gov/ns/assurance/ial/2' || claims.ial === '2') {
      return 'IAL2';
    }
    if (claims.ial === 'http://idmanagement.gov/ns/assurance/ial/3' || claims.ial === '3') {
      return 'IAL3';
    }

    // Check if verified flag indicates IAL2 (ID.me specific)
    if (claims.verified === true && claims.credential_type === 'identity_verification') {
      return 'IAL2';
    }

    return 'IAL1';
  }

  // ---------------------------------------------------------------------------
  // User Info (for additional claims after initial verification)
  // ---------------------------------------------------------------------------

  async getUserInfo(accessToken: string): Promise<IdmeTokenClaims> {
    const discovery = await this.getDiscoveryDocument();

    const response = await fetch(discovery.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`ID.me userinfo failed: ${response.status}`);
    }

    return response.json();
  }

  // ---------------------------------------------------------------------------
  // Token Refresh
  // ---------------------------------------------------------------------------

  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    const discovery = await this.getDiscoveryDocument();

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const response = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`ID.me token refresh failed: ${response.status}`);
    }

    return response.json();
  }

  // ---------------------------------------------------------------------------
  // NextAuth.js Provider Configuration
  // ---------------------------------------------------------------------------

  toNextAuthProvider() {
    const config = this.config;
    const issuerUrl = this.issuerUrl;

    return {
      id: 'idme',
      name: 'ID.me',
      type: 'oauth' as const,
      wellKnown: `${issuerUrl}/.well-known/openid-configuration`,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorization: {
        params: {
          scope: config.scopes.join(' '),
          response_type: 'code',
        },
      },
      idToken: true,
      checks: ['state', 'nonce'] as const,
      profile(profile: IdmeTokenClaims) {
        return {
          id: profile.sub,
          name: [profile.fname, profile.lname].filter(Boolean).join(' '),
          email: profile.email,
          image: null,
        };
      },
    };
  }
}

// =============================================================================
// Supporting Types
// =============================================================================

interface OidcDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  grant_types_supported?: string[];
  subject_types_supported?: string[];
  id_token_signing_alg_values_supported?: string[];
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token: string;
  scope?: string;
}
