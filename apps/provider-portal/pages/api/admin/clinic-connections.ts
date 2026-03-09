// ============================================================
// ATTENDING AI - Clinic Connection Management
// apps/provider-portal/pages/api/admin/clinic-connections.ts
//
// POST   /api/admin/clinic-connections          → Connect a new clinic
// GET    /api/admin/clinic-connections          → List connected clinics
// PATCH  /api/admin/clinic-connections?id=xxx   → Update clinic connection
// DELETE /api/admin/clinic-connections?id=xxx   → Disconnect clinic
//
// Admin-only endpoint. Creates Organization + IntegrationConnection
// records and optionally provisions an API key for the clinic to
// push patient data.
// ============================================================

import { z } from 'zod';
import { createHandler } from '@attending/shared/lib/api/handler';
import { AuditActions } from '@attending/shared/lib/audit';
import {
  createApiKeyRecord,
  type ApiKeyScope,
} from '@attending/shared/lib/auth/apiKeys';

async function getPrisma() {
  const { prisma } = await import('@attending/shared/lib/prisma');
  return prisma;
}

const EHR_VENDORS = [
  'EPIC',
  'CERNER',
  'ATHENA',
  'ALLSCRIPTS',
  'MEDITECH',
  'ECLINICALWORKS',
  'OTHER',
] as const;

const ConnectClinicSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().default('CLINIC'),
  npi: z.string().max(20).optional(),
  taxId: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
  faxNumber: z.string().max(30).optional(),
  website: z.string().url().optional(),
  ehrVendor: z.enum(EHR_VENDORS).optional(),
  fhirEndpoint: z.string().url().optional(),
  connectionConfig: z
    .object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      scopes: z.array(z.string()).optional(),
      authUrl: z.string().url().optional(),
      tokenUrl: z.string().url().optional(),
    })
    .optional(),
  createApiKey: z.boolean().default(true),
});

const UpdateClinicSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  ehrVendor: z.enum(EHR_VENDORS).optional(),
  fhirEndpoint: z.string().url().optional(),
  isActive: z.boolean().optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),
});

export default createHandler({
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  auth: 'admin',
  audit: AuditActions.SYSTEM_CONFIG_CHANGED,
  auditResource: 'System',

  handler: async (req, ctx) => {
    const prisma = await getPrisma();

    switch (req.method) {
      // ── LIST CONNECTED CLINICS ────────────────────────────────
      case 'GET': {
        const clinics = await prisma.organization.findMany({
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            npi: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            phone: true,
            ehrVendor: true,
            fhirEndpoint: true,
            tier: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                patients: true,
                encounters: true,
                users: true,
              },
            },
          },
        });

        // Fetch integration connection status for each clinic
        const integrations = await prisma.integrationConnection.findMany({
          where: {
            organizationId: { in: clinics.map((c) => c.id) },
          },
          select: {
            organizationId: true,
            status: true,
            lastSyncAt: true,
            type: true,
          },
        });

        const integrationMap = new Map(
          integrations.map((i) => [i.organizationId, i])
        );

        const result = clinics.map((clinic) => {
          const integration = integrationMap.get(clinic.id);
          return {
            ...clinic,
            patientCount: clinic._count.patients,
            encounterCount: clinic._count.encounters,
            userCount: clinic._count.users,
            _count: undefined,
            integrationStatus: integration?.status || 'NOT_CONFIGURED',
            lastSyncAt: integration?.lastSyncAt || null,
          };
        });

        ctx.success(result);
        break;
      }

      // ── CONNECT NEW CLINIC ────────────────────────────────────
      case 'POST': {
        const body = ConnectClinicSchema.parse(req.body);

        // Generate a URL-safe slug from the clinic name
        const slug = body.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50);

        // Check for duplicate slug
        const existing = await prisma.organization.findUnique({
          where: { slug },
        });
        if (existing) {
          ctx.error(
            409,
            'VALIDATION_ERROR' as any,
            `A clinic with slug "${slug}" already exists`
          );
          return;
        }

        // Create Organization
        const organization = await prisma.organization.create({
          data: {
            name: body.name,
            slug,
            type: body.type,
            npi: body.npi,
            taxId: body.taxId,
            address: body.address,
            city: body.city,
            state: body.state,
            zipCode: body.zipCode,
            phone: body.phone,
            faxNumber: body.faxNumber,
            website: body.website,
            ehrVendor: body.ehrVendor,
            fhirEndpoint: body.fhirEndpoint,
            isActive: true,
          },
        });

        // Create IntegrationConnection if FHIR endpoint provided
        let integrationId: string | undefined;
        if (body.fhirEndpoint || body.ehrVendor) {
          const integration = await prisma.integrationConnection.create({
            data: {
              name: `${body.name} - ${body.ehrVendor || 'FHIR'} Connection`,
              type: 'FHIR',
              direction: 'INBOUND',
              organizationId: organization.id,
              status: 'ACTIVE',
              config: JSON.stringify({
                fhirEndpoint: body.fhirEndpoint,
                ehrVendor: body.ehrVendor,
                ...(body.connectionConfig || {}),
              }),
              createdBy: ctx.user!.id,
            },
          });
          integrationId = integration.id;
        }

        // Optionally create an API key for the clinic
        let apiKeyResult: { key: string; id: string } | undefined;
        if (body.createApiKey) {
          const { key, record } = await createApiKeyRecord(prisma, {
            name: `${body.name} - Clinic API Key`,
            description: `Auto-generated API key for clinic data ingestion from ${body.name}`,
            organizationId: organization.id,
            scopes: [
              'patient:read',
              'patient:write',
              'assessment:read',
              'assessment:write',
            ] as ApiKeyScope[],
            expiresAt: new Date(Date.now() + 365 * 86400000), // 1 year
            createdBy: ctx.user!.id,
          });
          apiKeyResult = { key, id: record.id };
        }

        ctx.log.info('Clinic connected', {
          orgId: organization.id,
          name: body.name,
          ehrVendor: body.ehrVendor,
        });

        ctx.success(201, {
          organizationId: organization.id,
          slug,
          integrationId,
          apiKey: apiKeyResult
            ? {
                id: apiKeyResult.id,
                key: apiKeyResult.key,
                message:
                  'Store this API key securely — it cannot be retrieved again.',
              }
            : undefined,
          message: `Clinic "${body.name}" connected successfully.`,
        });
        break;
      }

      // ── UPDATE CLINIC CONNECTION ──────────────────────────────
      case 'PATCH': {
        const clinicId = req.query.id as string;
        if (!clinicId) {
          ctx.error(
            400,
            'VALIDATION_ERROR' as any,
            'Missing clinic ID (pass as ?id=...)'
          );
          return;
        }

        const body = UpdateClinicSchema.parse(req.body);

        const updated = await prisma.organization.update({
          where: { id: clinicId },
          data: {
            ...(body.name ? { name: body.name } : {}),
            ...(body.ehrVendor ? { ehrVendor: body.ehrVendor } : {}),
            ...(body.fhirEndpoint ? { fhirEndpoint: body.fhirEndpoint } : {}),
            ...(body.isActive !== undefined
              ? { isActive: body.isActive }
              : {}),
            ...(body.phone ? { phone: body.phone } : {}),
            ...(body.address ? { address: body.address } : {}),
            ...(body.city ? { city: body.city } : {}),
            ...(body.state ? { state: body.state } : {}),
            ...(body.zipCode ? { zipCode: body.zipCode } : {}),
          },
        });

        ctx.log.info('Clinic updated', { clinicId, name: updated.name });
        ctx.success({ id: clinicId, name: updated.name, updated: true });
        break;
      }

      // ── DISCONNECT CLINIC ─────────────────────────────────────
      case 'DELETE': {
        const clinicId = req.query.id as string;
        if (!clinicId) {
          ctx.error(
            400,
            'VALIDATION_ERROR' as any,
            'Missing clinic ID (pass as ?id=...)'
          );
          return;
        }

        // Soft-deactivate rather than hard delete (HIPAA retention)
        await prisma.organization.update({
          where: { id: clinicId },
          data: { isActive: false },
        });

        // Deactivate integration connections
        await prisma.integrationConnection.updateMany({
          where: { organizationId: clinicId },
          data: { status: 'DISABLED' },
        });

        // Revoke API keys
        await prisma.apiKey.updateMany({
          where: { organizationId: clinicId, isActive: true },
          data: { isActive: false, revokedAt: new Date() },
        });

        ctx.log.info('Clinic disconnected', { clinicId });
        ctx.success({ id: clinicId, disconnected: true });
        break;
      }
    }
  },
});
