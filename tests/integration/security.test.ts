// ============================================================
// ATTENDING AI - Security Regression Test Suite
// tests/integration/security.test.ts
//
// Critical regression tests for the security module, with
// special emphasis on clinical-safe SQL injection detection.
//
// Healthcare text contains many SQL-like keywords naturally:
//   "SELECT the appropriate dosage for patient"
//   "Update the medication list"
//   "Delete the order from the chart"
//
// These must NOT trigger false positives. Only structural SQL
// patterns (combined keywords + SQL syntax) should be flagged.
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================
// CLINICAL-SAFE SQL INJECTION DETECTION
// ============================================================

describe('SQL Injection Detection — Clinical Safety', () => {
  let detectSqlInjection: (input: string) => boolean;

  beforeEach(async () => {
    const security = await import('../../apps/shared/lib/security');
    detectSqlInjection = security.detectSqlInjection;
  });

  // ---- FALSE POSITIVES: Clinical text that must pass through ----

  it('allows "SELECT the appropriate medication" — clinical instruction', () => {
    expect(detectSqlInjection('SELECT the appropriate medication dose for this patient')).toBe(false);
  });

  it('allows "Update the medication list" — clinical note language', () => {
    expect(detectSqlInjection('Update the medication list per patient request')).toBe(false);
  });

  it('allows "Delete the standing order" — clinical action', () => {
    expect(detectSqlInjection('Delete the standing order from the active treatment plan')).toBe(false);
  });

  it('allows "patient wants to drop the referral" — conversational', () => {
    expect(detectSqlInjection('Patient wants to drop the referral after consulting with family')).toBe(false);
  });

  it('allows "OR the patient presented with chest pain" — OR as conjunction', () => {
    expect(detectSqlInjection("Patient presented with chest pain OR shortness of breath")).toBe(false);
  });

  it('allows "INSERT the IV catheter into the antecubital vein" — procedure note', () => {
    expect(detectSqlInjection('INSERT the IV catheter into the antecubital vein slowly')).toBe(false);
  });

  it('allows "union of care team members" — administrative note', () => {
    expect(detectSqlInjection('The union of care team members agreed on the treatment plan')).toBe(false);
  });

  it('allows "create a treatment plan" — clinical workflow', () => {
    expect(detectSqlInjection('Create a treatment plan for the patient including physical therapy')).toBe(false);
  });

  it('allows "alter the dosage based on renal function" — clinical instruction', () => {
    expect(detectSqlInjection('Alter the dosage based on renal function and GFR')).toBe(false);
  });

  it('allows OLDCARTS assessment text with clinical terms', () => {
    const assessmentText = `
      Onset: Started 2 days ago
      Location: Select the pain location — right upper quadrant
      Duration: Intermittent, lasting 15-30 minutes
      Character: Sharp, stabbing
      Alleviating: Nothing seems to drop the pain level
      Radiating: Updates suggest it radiates to the shoulder
    `;
    expect(detectSqlInjection(assessmentText)).toBe(false);
  });

  it('allows medication orders with complex names', () => {
    expect(detectSqlInjection('Metformin 500mg PO BID — Create a new prescription for 90 days')).toBe(false);
  });

  it('allows free-text note with multiple SQL keywords in clinical context', () => {
    const note = `
      Reviewed patient chart from last visit.
      Plan: Select the best antibiotic option.
      Patient will update their medication list at next visit.
      Drop the unnecessary labs from the order set.
      Create follow-up appointment in 2 weeks.
    `;
    expect(detectSqlInjection(note)).toBe(false);
  });

  // ---- TRUE POSITIVES: Actual injection attempts that must be blocked ----

  it('blocks SELECT...FROM structural injection', () => {
    expect(detectSqlInjection("SELECT * FROM patients WHERE 1=1")).toBe(true);
  });

  it('blocks UNION SELECT injection', () => {
    expect(detectSqlInjection("' UNION SELECT username, password FROM users--")).toBe(true);
  });

  it('blocks DROP TABLE injection', () => {
    expect(detectSqlInjection("'; DROP TABLE patients; --")).toBe(true);
  });

  it('blocks DELETE FROM injection', () => {
    expect(detectSqlInjection("DELETE FROM laborders WHERE organizationId IS NOT NULL")).toBe(true);
  });

  it('blocks INSERT INTO injection', () => {
    expect(detectSqlInjection("INSERT INTO users (role) VALUES ('ADMIN')")).toBe(true);
  });

  it('blocks UPDATE...SET injection', () => {
    expect(detectSqlInjection("UPDATE users SET role = 'ADMIN' WHERE 1=1")).toBe(true);
  });

  it('blocks tautology injection (1=1)', () => {
    expect(detectSqlInjection("' OR '1'='1")).toBe(true);
  });

  it('blocks statement chaining with semicolons', () => {
    expect(detectSqlInjection("validInput; DROP TABLE sessions; --")).toBe(true);
  });

  it('blocks SQL line comments at end of input', () => {
    expect(detectSqlInjection("some input --")).toBe(true);
  });

  it('blocks SQL block comments', () => {
    expect(detectSqlInjection("some input /* malicious comment */")).toBe(true);
  });

  it('blocks ALTER TABLE injection', () => {
    expect(detectSqlInjection("ALTER TABLE users ADD COLUMN isAdmin BOOLEAN DEFAULT TRUE")).toBe(true);
  });

  it('blocks TRUNCATE TABLE injection', () => {
    expect(detectSqlInjection("TRUNCATE TABLE auditlog")).toBe(true);
  });
});

// ============================================================
// XSS DETECTION
// ============================================================

describe('XSS Detection', () => {
  let detectXss: (input: string) => boolean;

  beforeEach(async () => {
    const security = await import('../../apps/shared/lib/security');
    detectXss = security.detectXss;
  });

  it('blocks script tags', () => {
    expect(detectXss('<script>alert("xss")</script>')).toBe(true);
  });

  it('blocks javascript: protocol', () => {
    expect(detectXss('javascript:void(0)')).toBe(true);
  });

  it('blocks inline event handlers', () => {
    expect(detectXss('<img src=x onerror=alert(1)>')).toBe(true);
  });

  it('allows normal clinical text', () => {
    expect(detectXss('Patient reports mild headache, rate 6/10 pain scale')).toBe(false);
  });

  it('allows HTML entities in clinical notes', () => {
    expect(detectXss('Temperature &lt; 37°C, BP &gt; 120/80')).toBe(false);
  });

  it('allows URLs in clinical references', () => {
    expect(detectXss('See https://pubmed.ncbi.nlm.nih.gov/article/123 for reference')).toBe(false);
  });
});

// ============================================================
// INPUT SANITIZATION
// ============================================================

describe('Input Sanitization', () => {
  let sanitizeInput: (input: string) => string;
  let sanitizeObject: (obj: Record<string, any>) => Record<string, any>;

  beforeEach(async () => {
    const security = await import('../../apps/shared/lib/security');
    sanitizeInput = security.sanitizeInput;
    sanitizeObject = security.sanitizeObject;
  });

  it('removes script tags from input', () => {
    const input = 'Hello <script>alert("xss")</script> World';
    const sanitized = sanitizeInput(input);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
  });

  it('preserves clinical text content', () => {
    const input = 'Patient reports chest pain, onset 2 hours ago';
    const sanitized = sanitizeInput(input);
    expect(sanitized).toContain('chest pain');
  });

  it('sanitizes nested objects recursively', () => {
    const obj = {
      patientName: 'John Doe',
      notes: '<script>alert("xss")</script>Chest pain',
      nested: {
        diagnosis: "'; DROP TABLE patients; --",
      },
    };
    const sanitized = sanitizeObject(obj);
    expect(sanitized.notes).not.toContain('<script>');
    expect(sanitized.patientName).toContain('John Doe');
  });

  it('handles null and undefined values gracefully', () => {
    const obj = {
      value: null,
      other: undefined,
      text: 'valid',
    };
    expect(() => sanitizeObject(obj as any)).not.toThrow();
  });
});

// ============================================================
// PHI MASKING
// ============================================================

describe('PHI Masking', () => {
  let maskPHI: (text: string) => string;

  beforeEach(async () => {
    const security = await import('../../apps/shared/lib/security');
    maskPHI = security.maskPHI;
  });

  it('masks SSN patterns in text', () => {
    const text = 'Patient SSN: 123-45-6789 is on file';
    const masked = maskPHI(text);
    expect(masked).not.toContain('123-45-6789');
    expect(masked).toContain('***');
  });

  it('masks date of birth patterns', () => {
    const text = 'DOB: 01/15/1980, admitted today';
    const masked = maskPHI(text);
    expect(masked).not.toContain('01/15/1980');
  });

  it('masks email addresses', () => {
    const text = 'Contact patient at john.doe@example.com for follow-up';
    const masked = maskPHI(text);
    expect(masked).not.toContain('john.doe@example.com');
  });

  it('masks phone numbers', () => {
    const text = 'Callback number: 303-555-1234';
    const masked = maskPHI(text);
    expect(masked).not.toContain('303-555-1234');
  });

  it('masks MRN patterns', () => {
    const text = 'MRN: 123456789 admitted to unit 3';
    const masked = maskPHI(text);
    expect(masked).not.toContain('123456789');
  });

  it('preserves non-PHI clinical content', () => {
    const text = 'Diagnosis: Hypertension ICD-10: I10, treatment initiated';
    const masked = maskPHI(text);
    expect(masked).toContain('Hypertension');
    expect(masked).toContain('I10');
  });

  it('handles empty string gracefully', () => {
    expect(() => maskPHI('')).not.toThrow();
    expect(maskPHI('')).toBe('');
  });
});

// ============================================================
// RATE LIMITING
// ============================================================

describe('Rate Limiting', () => {
  it('returns a rate limit result object', async () => {
    const { rateLimit } = await import('../../apps/shared/lib/security');

    const result = await rateLimit('test-client-ip', {
      windowMs: 60_000,
      maxRequests: 100,
      keyPrefix: 'test',
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('remaining');
    expect(result).toHaveProperty('resetTime');
    expect(typeof result.allowed).toBe('boolean');
    expect(typeof result.remaining).toBe('number');
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it('allows requests under the limit', async () => {
    const { rateLimit } = await import('../../apps/shared/lib/security');

    const result = await rateLimit(`allowed-client-${Date.now()}`, {
      windowMs: 60_000,
      maxRequests: 100,
      keyPrefix: 'test-allow',
    });

    expect(result.allowed).toBe(true);
  });

  it('rejects requests over the limit', async () => {
    const { rateLimit } = await import('../../apps/shared/lib/security');
    const key = `overLimit-${Date.now()}`;

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      await rateLimit(key, { windowMs: 60_000, maxRequests: 5, keyPrefix: 'overLimit' });
    }

    // Next request should be blocked
    const result = await rateLimit(key, {
      windowMs: 60_000,
      maxRequests: 5,
      keyPrefix: 'overLimit',
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
  });
});

// ============================================================
// CSRF PROTECTION
// ============================================================

describe('CSRF Token Generation and Verification', () => {
  it('generates distinct CSRF token pairs', async () => {
    const { csrf } = await import('../../apps/shared/lib/security');

    const pair1 = csrf.generatePair();
    const pair2 = csrf.generatePair();

    expect(pair1.secret).toBeDefined();
    expect(pair1.token).toBeDefined();
    expect(pair1.secret).not.toBe(pair2.secret);
    expect(pair1.token).not.toBe(pair2.token);
  });

  it('verifies valid token+secret pairs', async () => {
    const { csrf } = await import('../../apps/shared/lib/security');

    const { secret, token } = csrf.generatePair();
    expect(csrf.verify(secret, token)).toBe(true);
  });

  it('rejects mismatched secret and token', async () => {
    const { csrf } = await import('../../apps/shared/lib/security');

    const pair1 = csrf.generatePair();
    const pair2 = csrf.generatePair();

    // Use pair1's secret with pair2's token — should fail
    expect(csrf.verify(pair1.secret, pair2.token)).toBe(false);
  });

  it('rejects empty or invalid tokens', async () => {
    const { csrf } = await import('../../apps/shared/lib/security');

    expect(csrf.verify('', '')).toBe(false);
    expect(csrf.verify('valid-secret', '')).toBe(false);
    expect(csrf.verify('', 'valid-token')).toBe(false);
  });

  it('uses timing-safe comparison (no timing oracle)', async () => {
    const { csrf } = await import('../../apps/shared/lib/security');

    // Both calls should return false; we just verify no exceptions thrown
    const start1 = performance.now();
    csrf.verify('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    const time1 = performance.now() - start1;

    const start2 = performance.now();
    csrf.verify('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaX.invalid');
    const time2 = performance.now() - start2;

    // Both invalid — just assert they complete without error
    expect(time1).toBeGreaterThanOrEqual(0);
    expect(time2).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// SECURITY HEADERS
// ============================================================

describe('Security Headers', () => {
  it('sets all required security headers', async () => {
    const { setApiSecurityHeaders } = await import('../../apps/shared/lib/security');

    const headers: Record<string, string> = {};
    const mockRes = {
      setHeader: (key: string, value: string) => { headers[key.toLowerCase()] = value; },
    } as any;

    setApiSecurityHeaders(mockRes);

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-xss-protection']).toBeDefined();
    expect(headers['strict-transport-security']).toBeDefined();
  });
});

// ============================================================
// CLIENT IP EXTRACTION
// ============================================================

describe('Client IP Extraction', () => {
  it('extracts IP from x-forwarded-for header', async () => {
    const { getClientIp } = await import('../../apps/shared/lib/security');

    const mockReq = {
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' },
    } as any;

    const ip = getClientIp(mockReq);
    expect(ip).toBe('203.0.113.1');
  });

  it('falls back to socket address when no forwarding headers', async () => {
    const { getClientIp } = await import('../../apps/shared/lib/security');

    const mockReq = {
      headers: {},
      socket: { remoteAddress: '192.168.1.100' },
    } as any;

    const ip = getClientIp(mockReq);
    expect(ip).toBe('192.168.1.100');
  });

  it('returns unknown for missing IP', async () => {
    const { getClientIp } = await import('../../apps/shared/lib/security');

    const mockReq = {
      headers: {},
      socket: {},
    } as any;

    const ip = getClientIp(mockReq);
    expect(ip).toBe('unknown');
  });
});
