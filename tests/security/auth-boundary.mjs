/**
 * ATTENDING AI — Security Boundary Tests
 * tests/security/auth-boundary.mjs
 *
 * Manual security verification script. Run against staging before every
 * pilot deployment. Tests auth bypass, PHI leakage, and security headers.
 *
 * Run:
 *   node tests/security/auth-boundary.mjs
 *   node tests/security/auth-boundary.mjs --url https://attending-staging-api.azurewebsites.net
 *
 * Exit 0 = all security boundaries hold.
 * Exit 1 = at least one boundary breached — do not deploy.
 */

const API_BASE = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://localhost:5080';

let passed = 0, failed = 0, warned = 0;

function ok(name)         { console.log(`  ✓ PASS  ${name}`);    passed++; }
function fail(name, detail) { console.error(`  ✗ FAIL  ${name}`); if (detail) console.error(`          ${detail}`); failed++; }
function warn(name, detail) { console.warn(`  ⚠ WARN  ${name}`);  if (detail) console.warn(`          ${detail}`);  warned++; }

async function get(path, headers = {}) {
  return fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json', ...headers } });
}

async function runSecurityTests() {
  console.log(`\nATTENDING AI — Security Boundary Test`);
  console.log(`Target: ${API_BASE}\n`);

  // ── Authentication gates ─────────────────────────────────────────────────
  console.log('── Authentication ─────────────────────────────────────────────');

  let r = await get('/api/v1/assessments');
  r.status === 401
    ? ok('No token → 401')
    : fail('No token accepted', `Got ${r.status}, expected 401`);

  r = await get('/api/v1/assessments', { Authorization: 'Bearer fake-token-12345' });
  r.status === 401
    ? ok('Fake token → 401')
    : fail('Fake token accepted', `Got ${r.status}, expected 401`);

  r = await get('/api/v1/assessments', { Authorization: 'Bearer dev-bypass-token' });
  if (API_BASE.includes('localhost')) {
    r.status === 200
      ? ok('DevBypass works on localhost (expected in dev mode)')
      : warn('DevBypass not working on localhost', 'Set Authentication:DevBypass=true in appsettings.Development.json');
  } else {
    r.status === 401
      ? ok('DevBypass correctly BLOCKED in non-local environment')
      : fail('DevBypass ACCEPTED in non-local environment — CRITICAL', `URL: ${API_BASE}`);
  }

  // ── Security headers ──────────────────────────────────────────────────────
  console.log('\n── Security Headers ───────────────────────────────────────────');
  r = await get('/health/live');

  const requiredHeaders = ['x-frame-options', 'x-content-type-options', 'x-correlation-id'];
  for (const h of requiredHeaders) {
    r.headers.get(h) ? ok(`${h} present`) : fail(`${h} MISSING`);
  }

  if (API_BASE.startsWith('https')) {
    r.headers.get('strict-transport-security')
      ? ok('strict-transport-security present')
      : fail('strict-transport-security MISSING (required on HTTPS)');
  } else {
    warn('strict-transport-security not checked (HTTP — required in production)');
  }

  // ── Information disclosure ────────────────────────────────────────────────
  console.log('\n── Information Disclosure ─────────────────────────────────────');
  r = await get('/api/v1/assessments/nonexistent-id-xyz-12345');
  if (r.status === 404) {
    const body = await r.text();
    (body.toLowerCase().includes('stack') || body.toLowerCase().includes('exception'))
      ? fail('Stack trace in 404 response — information disclosure')
      : ok('404 does not expose stack trace');
  } else {
    warn(`Unexpected status for missing resource: ${r.status}`);
  }

  // ── PHI not reflected in error responses ──────────────────────────────────
  console.log('\n── PHI Safety ─────────────────────────────────────────────────');
  const phiRes = await fetch(`${API_BASE}/api/v1/assessments/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Organization-Slug': 'dev-clinic' },
    body: JSON.stringify({
      chiefComplaint:    '',
      patientName:       'PHI_MARKER_SECURITY_TEST',
      organization_slug: 'dev-clinic',
    }),
  });
  const phiBody = await phiRes.text();
  phiBody.includes('PHI_MARKER_SECURITY_TEST')
    ? fail('PHI reflected in error response — PhiSafeLoggingPolicy not applied')
    : ok('PHI not reflected in validation error response');

  // ── Rate limiting ─────────────────────────────────────────────────────────
  console.log('\n── Rate Limiting ──────────────────────────────────────────────');
  let rateLimitHit = false;
  for (let i = 0; i < 120; i++) {
    const res = await fetch(`${API_BASE}/api/v1/patients/search?query=test`, {
      headers: { Accept: 'application/json' },
    });
    if (res.status === 429) {
      ok(`Rate limit triggered at request ${i + 1} — 429 returned`);
      res.headers.get('retry-after')
        ? ok('Retry-After header present')
        : warn('Retry-After header missing from 429 response');
      rateLimitHit = true;
      break;
    }
  }
  if (!rateLimitHit) warn('Rate limit not triggered within 120 requests — check RateLimitingExtensions config');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n──────────────────────────────────────────────────────────────');
  console.log(`Results: ${passed} passed  |  ${warned} warnings  |  ${failed} FAILED`);

  if (failed > 0) {
    console.error('\nSECURITY FAILURES DETECTED. Do not deploy until resolved.');
    process.exit(1);
  } else {
    console.log(warned > 0 ? '\nAll critical checks passed. Review warnings before go-live.' : '\nAll security checks passed.');
    process.exit(0);
  }
}

runSecurityTests().catch(err => {
  console.error(`\nFatal: ${err.message}`);
  console.error(`Is the API running at ${API_BASE}?`);
  process.exit(1);
});
