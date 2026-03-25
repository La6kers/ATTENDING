// =============================================================================
// COMPASS Webhook — Receiver Verification Example
// apps/shared/lib/webhooks/receiverExample.ts
//
// THIS FILE IS DOCUMENTATION — it's the code a practice's IT team
// copies into their EHR integration to verify incoming COMPASS webhooks.
//
// Include this in the webhook setup documentation / developer portal.
// =============================================================================

/*
 * ============================================================
 * COMPASS Webhook Receiver — Integration Guide
 * ============================================================
 *
 * When COMPASS delivers a webhook, it sends these headers:
 *
 *   X-Compass-Event:           "assessment.completed"
 *   X-Compass-Delivery:        "uuid — unique delivery ID"
 *   X-Compass-Signature:       "hex HMAC-SHA256 signature"
 *   X-Compass-Timestamp:       "ISO 8601 timestamp"
 *   X-Compass-Idempotency-Key: "hash for deduplication"
 *   Content-Type:               "application/json"
 *
 * STEP 1: Verify the signature
 * STEP 2: Check timestamp freshness (reject > 5 minutes old)
 * STEP 3: Check idempotency key (reject duplicates)
 * STEP 4: Process the payload
 * STEP 5: Return 200 OK (any 2xx = success)
 *
 * ============================================================
 */

// --- Node.js / Express Example ---

import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.COMPASS_WEBHOOK_SECRET!;
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

// In-memory idempotency store (use Redis/DB in production)
const processedKeys = new Set<string>();

export function handleCompassWebhook(req: any, res: any) {
  const signature = req.headers['x-compass-signature'] as string;
  const timestamp = req.headers['x-compass-timestamp'] as string;
  const idempotencyKey = req.headers['x-compass-idempotency-key'] as string;
  const event = req.headers['x-compass-event'] as string;
  const rawBody = JSON.stringify(req.body);

  // ── Step 1: Verify HMAC signature ─────────────────────────
  const expectedSig = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSig, 'hex'),
  );

  if (!isValid) {
    console.error('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // ── Step 2: Check timestamp freshness ─────────────────────
  const age = Date.now() - new Date(timestamp).getTime();
  if (age > MAX_AGE_MS) {
    console.error('Webhook timestamp too old:', age, 'ms');
    return res.status(400).json({ error: 'Timestamp expired' });
  }

  // ── Step 3: Idempotency check ─────────────────────────────
  if (processedKeys.has(idempotencyKey)) {
    console.log('Duplicate delivery, skipping:', idempotencyKey);
    return res.status(200).json({ status: 'duplicate' });
  }
  processedKeys.add(idempotencyKey);

  // ── Step 4: Process the payload ───────────────────────────
  const payload = req.body;

  switch (event) {
    case 'assessment.completed':
      // Insert into your EHR's patient intake queue
      console.log('New COMPASS assessment:', {
        patient: payload.patient.name,
        chief_complaint: payload.assessment.chiefComplaint,
        triage: payload.assessment.triageLevel,
        red_flags: payload.assessment.redFlags.length,
      });
      // TODO: Your EHR integration code here
      break;

    case 'assessment.emergency':
      // Trigger immediate clinical alert
      console.log('🚨 EMERGENCY:', {
        patient: payload.patient.name,
        red_flags: payload.assessment.redFlags.map((rf: any) => rf.symptom),
      });
      // TODO: Page on-call provider, create urgent task, etc.
      break;

    default:
      console.log('Received event:', event);
  }

  // ── Step 5: Return 200 OK ─────────────────────────────────
  return res.status(200).json({ status: 'received' });
}

/*
 * ============================================================
 * Python / Flask Example
 * ============================================================
 *
 * import hmac, hashlib, json, time
 * from flask import Flask, request, jsonify
 *
 * WEBHOOK_SECRET = os.environ['COMPASS_WEBHOOK_SECRET']
 *
 * @app.route('/webhooks/compass', methods=['POST'])
 * def compass_webhook():
 *     signature = request.headers.get('X-Compass-Signature')
 *     timestamp = request.headers.get('X-Compass-Timestamp')
 *     body = request.get_data(as_text=True)
 *
 *     # Verify signature
 *     message = f"{timestamp}.{body}"
 *     expected = hmac.new(
 *         WEBHOOK_SECRET.encode(),
 *         message.encode(),
 *         hashlib.sha256
 *     ).hexdigest()
 *
 *     if not hmac.compare_digest(signature, expected):
 *         return jsonify(error='Invalid signature'), 401
 *
 *     payload = request.get_json()
 *     event = request.headers.get('X-Compass-Event')
 *
 *     if event == 'assessment.completed':
 *         # Process new assessment
 *         pass
 *
 *     return jsonify(status='received'), 200
 *
 * ============================================================
 * C# / ASP.NET Example
 * ============================================================
 *
 * [HttpPost("webhooks/compass")]
 * public IActionResult ReceiveCompassWebhook()
 * {
 *     var signature = Request.Headers["X-Compass-Signature"].FirstOrDefault();
 *     var timestamp = Request.Headers["X-Compass-Timestamp"].FirstOrDefault();
 *     using var reader = new StreamReader(Request.Body);
 *     var body = await reader.ReadToEndAsync();
 *
 *     var key = Encoding.UTF8.GetBytes(webhookSecret);
 *     var message = Encoding.UTF8.GetBytes($"{timestamp}.{body}");
 *     using var hmac = new HMACSHA256(key);
 *     var expected = BitConverter.ToString(hmac.ComputeHash(message))
 *         .Replace("-", "").ToLower();
 *
 *     if (!CryptographicOperations.FixedTimeEquals(
 *         Encoding.UTF8.GetBytes(signature),
 *         Encoding.UTF8.GetBytes(expected)))
 *         return Unauthorized();
 *
 *     var payload = JsonSerializer.Deserialize<CompassPayload>(body);
 *     // Process...
 *     return Ok(new { status = "received" });
 * }
 */
