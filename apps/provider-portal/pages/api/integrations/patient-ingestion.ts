// ============================================================
// ATTENDING AI - Patient Data Ingestion API
// apps/provider-portal/pages/api/integrations/patient-ingestion.ts
//
// POST /api/integrations/patient-ingestion → Receive patient
// data from connected clinics.
//
// Authenticated via API key (X-API-Key header).
// The API key determines the organizationId — all data is
// scoped to that clinic's tenant.
//
// Supports two formats:
//   - CUSTOM: Flat patient objects matching internal schema
//   - FHIR_R4: FHIR R4 Patient/Condition/MedicationStatement
//              resources (Bundle or individual resources)
// ============================================================

import crypto from 'crypto';
import { z } from 'zod';
import { apiKeyHandler } from '@attending/shared/lib/api/handler';
import { AuditActions } from '@attending/shared/lib/audit';

async function getPrisma() {
  const { prisma } = await import('@attending/shared/lib/prisma');
  return prisma;
}

// ── Zod Schemas ─────────────────────────────────────────────

const ConditionSchema = z.object({
  name: z.string().min(1),
  icdCode: z.string().optional(),
  severity: z.string().optional(),
  onsetDate: z.string().optional(),
  notes: z.string().optional(),
});

const MedicationSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  prescribedBy: z.string().optional(),
  startDate: z.string().optional(),
});

const AllergySchema = z.object({
  allergen: z.string().min(1),
  reaction: z.string().optional(),
  severity: z.string().optional(),
});

const PatientSchema = z.object({
  mrn: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().min(1, 'dateOfBirth is required').refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'dateOfBirth must be a valid date string (e.g., YYYY-MM-DD)' }
  ),
  gender: z.string().optional(),
  sexAssignedAtBirth: z.string().optional(),
  genderIdentity: z.string().optional(),
  pronouns: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  preferredLanguage: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNum: z.string().optional(),
  emergencyContact: z.string().optional(),
  conditions: z.array(ConditionSchema).optional(),
  medications: z.array(MedicationSchema).optional(),
  allergies: z.array(AllergySchema).optional(),
});

// Two-phase validation: the ingestion envelope accepts raw patient objects,
// then CUSTOM patients are validated against PatientSchema directly while
// FHIR_R4 patients are transformed first, then validated.
const IngestionEnvelopeSchema = z.object({
  format: z.enum(['CUSTOM', 'FHIR_R4']).default('CUSTOM'),
  patients: z.array(z.record(z.unknown())).min(1).max(500),
});

// ── FHIR R4 Transformer ────────────────────────────────────

interface FhirPatient {
  resourceType: 'Patient';
  identifier?: Array<{ system?: string; value?: string }>;
  name?: Array<{
    family?: string;
    given?: string[];
  }>;
  birthDate?: string;
  gender?: string;
  telecom?: Array<{ system?: string; value?: string }>;
  address?: Array<{
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
  }>;
}

function transformFhirPatient(fhir: FhirPatient): z.infer<typeof PatientSchema> {
  const mrn =
    fhir.identifier?.find((id) => id.system?.includes('mrn'))?.value ||
    fhir.identifier?.[0]?.value ||
    `fhir-${Date.now()}`;

  const name = fhir.name?.[0];
  const phone = fhir.telecom?.find((t) => t.system === 'phone')?.value;
  const email = fhir.telecom?.find((t) => t.system === 'email')?.value;
  const addr = fhir.address?.[0];

  return {
    mrn,
    firstName: name?.given?.[0] || 'Unknown',
    lastName: name?.family || 'Unknown',
    dateOfBirth: fhir.birthDate || null as any,
    gender: fhir.gender,
    email,
    phone,
    address: addr?.line?.join(', '),
    city: addr?.city,
    state: addr?.state,
    zipCode: addr?.postalCode,
  };
}

// ── Handler ─────────────────────────────────────────────────

export default apiKeyHandler({
  methods: ['POST'],
  body: IngestionEnvelopeSchema,
  audit: AuditActions.SYSTEM_CONFIG_CHANGED,
  auditResource: 'Patient' as any,
  phi: true,
  rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'ingestion' },

  handler: async (req, ctx) => {
    const prisma = await getPrisma();

    // apiKeyHandler already validated the API key and set ctx.apiKey.
    // Resolve the organization from the validated key.
    const apiKeyHeader = req.headers['x-api-key'] as string;
    if (!apiKeyHeader) {
      ctx.error(401, 'AUTH_REQUIRED' as any, 'API key required');
      return;
    }

    const apiKeyHash = crypto
      .createHash('sha256')
      .update(apiKeyHeader)
      .digest('hex');

    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        keyHash: apiKeyHash,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!apiKeyRecord) {
      ctx.error(401, 'AUTH_REQUIRED' as any, 'Invalid or expired API key');
      return;
    }

    // Check scope
    const scopes: string[] = (() => {
      try { return JSON.parse(apiKeyRecord.scopes as string); }
      catch { return []; }
    })();
    if (!scopes.includes('patient:write')) {
      ctx.error(
        403,
        'ROLE_FORBIDDEN' as any,
        'API key does not have patient:write scope'
      );
      return;
    }

    const organizationId = apiKeyRecord.organizationId;

    // Track API key usage
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    });

    // Process patients: transform FHIR first, then validate all against PatientSchema
    const body = ctx.body as z.infer<typeof IngestionEnvelopeSchema>;
    let rawPatients = body.patients;

    // Transform FHIR resources to flat patient objects before validation
    if (body.format === 'FHIR_R4') {
      rawPatients = rawPatients.map((p) =>
        transformFhirPatient(p as unknown as FhirPatient)
      ) as Record<string, unknown>[];
    }

    // Validate all patients against the patient schema
    const validationResult = z.array(PatientSchema).safeParse(rawPatients);
    if (!validationResult.success) {
      ctx.error(
        400,
        'VALIDATION_ERROR' as any,
        `Patient data validation failed: ${validationResult.error.issues.map(i => `[${i.path.join('.')}] ${i.message}`).join('; ')}`
      );
      return;
    }
    const patients = validationResult.data;

    const results = {
      received: patients.length,
      created: 0,
      updated: 0,
      errors: [] as Array<{ mrn: string; error: string }>,
    };

    // Process all patients in a single transaction to ensure atomicity
    // and reduce round-trips. If any patient fails, the entire batch
    // rolls back so results.created/updated stay accurate.
    try {
      await prisma.$transaction(async (tx) => {
        for (const patient of patients) {
          // Upsert patient by MRN within the organization
          const existing = await tx.patient.findFirst({
            where: {
              mrn: patient.mrn,
              organizationId,
              deletedAt: null,
            },
          });

          const parsedDob = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
          const patientData = {
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: parsedDob && !isNaN(parsedDob.getTime())
              ? parsedDob
              : undefined,
            gender: patient.gender,
            sexAssignedAtBirth: patient.sexAssignedAtBirth,
            genderIdentity: patient.genderIdentity,
            pronouns: patient.pronouns,
            email: patient.email,
            phone: patient.phone,
            address: patient.address,
            city: patient.city,
            state: patient.state,
            zipCode: patient.zipCode,
            preferredLanguage: patient.preferredLanguage,
            insuranceProvider: patient.insuranceProvider,
            insurancePolicyNum: patient.insurancePolicyNum,
            emergencyContact: patient.emergencyContact,
          };

          let patientId: string;

          if (existing) {
            await tx.patient.update({
              where: { id: existing.id },
              data: patientData,
            });
            patientId = existing.id;
            results.updated++;
          } else {
            const created = await tx.patient.create({
              data: {
                ...patientData,
                mrn: patient.mrn,
                organizationId,
              },
            });
            patientId = created.id;
            results.created++;
          }

          // Upsert conditions
          if (patient.conditions?.length) {
            for (const condition of patient.conditions) {
              const existingCondition = await tx.condition.findFirst({
                where: { patientId, name: condition.name, deletedAt: null },
              });
              if (!existingCondition) {
                await tx.condition.create({
                  data: {
                    patientId,
                    organizationId,
                    name: condition.name,
                    icdCode: condition.icdCode,
                    severity: condition.severity,
                    notes: condition.notes,
                  },
                });
              }
            }
          }

          // Upsert medications
          if (patient.medications?.length) {
            for (const med of patient.medications) {
              const existingMed = await tx.medication.findFirst({
                where: { patientId, name: med.name, deletedAt: null },
              });
              if (!existingMed) {
                await tx.medication.create({
                  data: {
                    patientId,
                    organizationId,
                    name: med.name,
                    dose: med.dosage,
                    frequency: med.frequency,
                    route: med.route,
                  },
                });
              }
            }
          }

          // Upsert allergies
          if (patient.allergies?.length) {
            for (const allergy of patient.allergies) {
              const existingAllergy = await tx.allergy.findFirst({
                where: { patientId, allergen: allergy.allergen, deletedAt: null },
              });
              if (!existingAllergy) {
                await tx.allergy.create({
                  data: {
                    patientId,
                    organizationId,
                    allergen: allergy.allergen,
                    reaction: allergy.reaction,
                    severity: allergy.severity,
                  },
                });
              }
            }
          }
        }
      }, { timeout: 60_000 }); // 60s timeout for large batches
    } catch (error) {
      // Transaction rolled back — reset counts to zero since nothing was committed
      const message = error instanceof Error ? error.message : 'Unknown error';
      ctx.log.error('Patient ingestion transaction failed', { error: message });
      results.created = 0;
      results.updated = 0;
      results.errors = patients.map((p) => ({ mrn: p.mrn, error: `Transaction rolled back: ${message}` }));
    }

    ctx.log.info('Patient ingestion completed', {
      organizationId,
      received: results.received,
      created: results.created,
      updated: results.updated,
      errors: results.errors.length,
    });

    ctx.success(200, results);
  },
});
