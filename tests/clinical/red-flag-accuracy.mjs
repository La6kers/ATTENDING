/**
 * ATTENDING AI — Red Flag Clinical Accuracy Test
 * tests/clinical/red-flag-accuracy.mjs
 *
 * Validates that the clinical intelligence correctly detects ALL emergency
 * presentations. These are patient safety tests — a false negative means
 * a potentially fatal condition was missed.
 *
 * Run:
 *   node tests/clinical/red-flag-accuracy.mjs
 *   node tests/clinical/red-flag-accuracy.mjs --url https://attending-staging-api.azurewebsites.net
 *
 * Exit code 0 = all emergencies detected.
 * Exit code 1 = at least one emergency MISSED — do not deploy.
 */

const API_BASE = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://localhost:5080';

const ORG_SLUG = 'dev-clinic';

// ── MUST DETECT (false negative = patient harm) ────────────────────────────
const MUST_DETECT = [
  { complaint: 'crushing chest pain radiating to left arm',       dx: 'STEMI / ACS' },
  { complaint: 'sudden severe headache worst of my life',         dx: 'Subarachnoid hemorrhage' },
  { complaint: 'sudden vision loss in left eye',                  dx: 'Retinal artery occlusion / stroke' },
  { complaint: 'shortness of breath at rest and confusion',       dx: 'Pulmonary embolism' },
  { complaint: 'right side weakness and slurred speech suddenly', dx: 'Ischemic stroke' },
  { complaint: 'tearing back pain radiating to my abdomen',       dx: 'Aortic dissection' },
  { complaint: 'severe abdominal pain with rigid hard abdomen',   dx: 'Peritonitis / perforation' },
  { complaint: 'high fever stiff neck and light sensitivity',     dx: 'Bacterial meningitis' },
  { complaint: 'severe allergic reaction difficulty breathing',   dx: 'Anaphylaxis' },
  { complaint: 'unresponsive and not breathing normally',         dx: 'Cardiac arrest' },
];

// ── MUST NOT OVER-TRIGGER (false positives erode provider trust) ───────────
const SHOULD_NOT_TRIGGER = [
  'mild headache since yesterday morning',
  'runny nose and sore throat for 3 days',
  'right knee pain after walking',
  'fatigue and poor sleep this week',
  'dental pain lower right molar since Tuesday',
  'back pain after lifting at work',
  'annual wellness exam no complaints',
];

async function submitAssessment(complaint, severity = 5) {
  const res = await fetch(`${API_BASE}/api/v1/assessments/submit`, {
    method: 'POST',
    headers: {
      'Content-Type':        'application/json',
      'X-Organization-Slug': ORG_SLUG,
    },
    body: JSON.stringify({
      chiefComplaint:    complaint,
      organization_slug: ORG_SLUG,
      dateOfBirth:       '1975-06-15',
      gender:            'unknown',
      hpi:               { severity },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for: ${complaint}`);
  return res.json();
}

async function runAccuracyTests() {
  console.log(`\nATTENDING AI — Clinical Red Flag Accuracy Test`);
  console.log(`Target: ${API_BASE}\n`);

  let passed = 0, failed = 0, warned = 0;

  // ── Sensitivity: must detect all emergencies ─────────────────────────────
  console.log('── Sensitivity (must detect all emergencies) ─────────────────');
  for (const scenario of MUST_DETECT) {
    try {
      const body = await submitAssessment(scenario.complaint, 9);
      const detected = body.urgentAlert === true || body.isEmergency === true;
      if (detected) {
        console.log(`  ✓ PASS  [${scenario.dx}]`);
        passed++;
      } else {
        console.error(`  ✗ FAIL  [${scenario.dx}] — MISSED EMERGENCY`);
        console.error(`          Complaint: "${scenario.complaint}"`);
        console.error(`          Response:  ${JSON.stringify(body)}`);
        failed++;
      }
    } catch (err) {
      console.error(`  ✗ ERROR [${scenario.dx}] — ${err.message}`);
      failed++;
    }
  }

  // ── Specificity: must not over-trigger ───────────────────────────────────
  console.log('\n── Specificity (must not over-trigger) ───────────────────────');
  for (const complaint of SHOULD_NOT_TRIGGER) {
    try {
      const body = await submitAssessment(complaint, 3);
      const triggered = body.urgentAlert === true || body.isEmergency === true;
      if (!triggered) {
        console.log(`  ✓ PASS  No false positive: "${complaint.substring(0, 55)}"`);
        passed++;
      } else {
        console.warn(`  ⚠ WARN  False positive: "${complaint.substring(0, 55)}"`);
        console.warn(`          Note: over-detection is safer than under-detection.`);
        warned++;
      }
    } catch (err) {
      console.error(`  ✗ ERROR — ${err.message}`);
      failed++;
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n──────────────────────────────────────────────────────────────');
  console.log(`Results: ${passed} passed  |  ${warned} warnings  |  ${failed} FAILED`);

  if (failed > 0) {
    console.error('\nCRITICAL: Red flag detection missed emergency scenarios.');
    console.error('DO NOT deploy until all FAIL cases are resolved.');
    process.exit(1);
  } else if (warned > 0) {
    console.log('\nAll emergencies detected. False positives should be reviewed');
    console.log('but are acceptable — over-detection is safer than under-detection.');
    process.exit(0);
  } else {
    console.log('\nAll checks passed. Red flag detection is operating correctly.');
    process.exit(0);
  }
}

runAccuracyTests().catch(err => {
  console.error(`\nFatal error: ${err.message}`);
  console.error('Is the API running? Check: ' + API_BASE + '/health/live');
  process.exit(1);
});
