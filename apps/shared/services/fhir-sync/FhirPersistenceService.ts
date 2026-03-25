// =============================================================================
// ATTENDING AI - FHIR Database Persistence Service
// apps/shared/services/fhir-sync/FhirPersistenceService.ts
//
// Writes synced FHIR data to the ATTENDING database
// =============================================================================

import type {
  AttendingPatient,
  AttendingLabResult,
  AttendingVitalSign,
  AttendingCondition,
  AttendingMedication,
  AttendingAllergy,
  AttendingEncounter,
} from '../../lib/fhir/resourceMappers';
import type { SyncResult } from './FhirSyncService';

// =============================================================================
// Types
// =============================================================================

export interface PersistenceResult {
  success: boolean;
  persisted: {
    patient?: boolean;
    medications?: number;
    allergies?: number;
    conditions?: number;
    labResults?: number;
    vitals?: number;
    encounters?: number;
  };
  errors: string[];
}

export interface PrismaClient {
  patient: any;
  medication: any;
  allergy: any;
  condition: any;
  labResult: any;
  vitalSign: any;
  encounter: any;
  fhirSyncLog: any;
  $transaction: (fn: (tx: any) => Promise<any>) => Promise<any>;
}

// =============================================================================
// FHIR Persistence Service
// =============================================================================

export class FhirPersistenceService {
  private prisma: PrismaClient;
  private userId: string;
  private fhirPatientId: string;

  constructor(prisma: PrismaClient, userId: string, fhirPatientId: string) {
    this.prisma = prisma;
    this.userId = userId;
    this.fhirPatientId = fhirPatientId;
  }

  // ===========================================================================
  // Persist Full Sync Result
  // ===========================================================================

  async persistSyncResult(syncResult: SyncResult): Promise<PersistenceResult> {
    const result: PersistenceResult = {
      success: true,
      persisted: {},
      errors: [],
    };

    try {
      await this.prisma.$transaction(async (tx: any) => {
        // Persist patient
        if (syncResult.data.patient) {
          try {
            await this.persistPatient(tx, syncResult.data.patient);
            result.persisted.patient = true;
          } catch (error: any) {
            result.errors.push(`Patient: ${error.message}`);
          }
        }

        // Persist medications
        if (syncResult.data.medications?.length) {
          try {
            const count = await this.persistMedications(tx, syncResult.data.medications);
            result.persisted.medications = count;
          } catch (error: any) {
            result.errors.push(`Medications: ${error.message}`);
          }
        }

        // Persist allergies
        if (syncResult.data.allergies?.length) {
          try {
            const count = await this.persistAllergies(tx, syncResult.data.allergies);
            result.persisted.allergies = count;
          } catch (error: any) {
            result.errors.push(`Allergies: ${error.message}`);
          }
        }

        // Persist conditions
        if (syncResult.data.conditions?.length) {
          try {
            const count = await this.persistConditions(tx, syncResult.data.conditions);
            result.persisted.conditions = count;
          } catch (error: any) {
            result.errors.push(`Conditions: ${error.message}`);
          }
        }

        // Persist lab results
        if (syncResult.data.labResults?.length) {
          try {
            const count = await this.persistLabResults(tx, syncResult.data.labResults);
            result.persisted.labResults = count;
          } catch (error: any) {
            result.errors.push(`Lab Results: ${error.message}`);
          }
        }

        // Persist vitals
        if (syncResult.data.vitals?.length) {
          try {
            const count = await this.persistVitals(tx, syncResult.data.vitals);
            result.persisted.vitals = count;
          } catch (error: any) {
            result.errors.push(`Vitals: ${error.message}`);
          }
        }

        // Persist encounters
        if (syncResult.data.encounters?.length) {
          try {
            const count = await this.persistEncounters(tx, syncResult.data.encounters);
            result.persisted.encounters = count;
          } catch (error: any) {
            result.errors.push(`Encounters: ${error.message}`);
          }
        }

        // Log the sync
        await tx.fhirSyncLog.create({
          data: {
            userId: this.userId,
            fhirPatientId: this.fhirPatientId,
            syncedAt: syncResult.syncedAt,
            duration: syncResult.duration,
            resourceCounts: JSON.stringify(syncResult.counts),
            errors: syncResult.errors.length > 0 ? JSON.stringify(syncResult.errors) : null,
            success: result.errors.length === 0,
          },
        });
      });

    } catch (error: any) {
      result.success = false;
      result.errors.push(`Transaction failed: ${error.message}`);
    }

    result.success = result.errors.length === 0;
    return result;
  }

  // ===========================================================================
  // Individual Persistence Methods
  // ===========================================================================

  private async persistPatient(tx: any, patient: AttendingPatient): Promise<void> {
    await tx.patient.upsert({
      where: { 
        fhirId: patient.id,
      },
      update: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth) : null,
        gender: patient.gender?.toUpperCase(),
        email: patient.email,
        phone: patient.phone,
        addressLine1: patient.address?.line1,
        addressLine2: patient.address?.line2,
        city: patient.address?.city,
        state: patient.address?.state,
        postalCode: patient.address?.postalCode,
        preferredLanguage: patient.preferredLanguage,
        emergencyContactName: patient.emergencyContact?.name,
        emergencyContactPhone: patient.emergencyContact?.phone,
        emergencyContactRelation: patient.emergencyContact?.relationship,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        fhirId: patient.id,
        mrn: patient.mrn || `MRN-${Date.now()}`,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth) : null,
        gender: patient.gender?.toUpperCase() || 'UNKNOWN',
        email: patient.email,
        phone: patient.phone,
        addressLine1: patient.address?.line1,
        addressLine2: patient.address?.line2,
        city: patient.address?.city,
        state: patient.address?.state,
        postalCode: patient.address?.postalCode,
        preferredLanguage: patient.preferredLanguage,
        emergencyContactName: patient.emergencyContact?.name,
        emergencyContactPhone: patient.emergencyContact?.phone,
        emergencyContactRelation: patient.emergencyContact?.relationship,
        lastSyncedAt: new Date(),
      },
    });
  }

  private async persistMedications(tx: any, medications: AttendingMedication[]): Promise<number> {
    let count = 0;

    for (const med of medications) {
      await tx.medication.upsert({
        where: {
          fhirId: med.id,
        },
        update: {
          medicationName: med.medicationName,
          medicationCode: med.medicationCode,
          dosage: med.dosage,
          frequency: med.frequency,
          route: med.route,
          status: med.status?.toUpperCase(),
          prescribedDate: med.prescribedDate ? new Date(med.prescribedDate) : null,
          prescriber: med.prescriber,
          startDate: med.startDate ? new Date(med.startDate) : null,
          endDate: med.endDate ? new Date(med.endDate) : null,
          quantity: med.quantity,
          refills: med.refills,
          instructions: med.instructions,
          isControlled: med.isControlled || false,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          fhirId: med.id,
          patientFhirId: med.patientId,
          medicationName: med.medicationName,
          medicationCode: med.medicationCode,
          dosage: med.dosage,
          frequency: med.frequency,
          route: med.route,
          status: med.status?.toUpperCase() || 'ACTIVE',
          prescribedDate: med.prescribedDate ? new Date(med.prescribedDate) : null,
          prescriber: med.prescriber,
          startDate: med.startDate ? new Date(med.startDate) : null,
          endDate: med.endDate ? new Date(med.endDate) : null,
          quantity: med.quantity,
          refills: med.refills,
          instructions: med.instructions,
          isControlled: med.isControlled || false,
          source: 'FHIR',
          lastSyncedAt: new Date(),
        },
      });
      count++;
    }

    return count;
  }

  private async persistAllergies(tx: any, allergies: AttendingAllergy[]): Promise<number> {
    let count = 0;

    for (const allergy of allergies) {
      await tx.allergy.upsert({
        where: {
          fhirId: allergy.id,
        },
        update: {
          allergen: allergy.allergen,
          allergenCode: allergy.allergenCode,
          type: allergy.type?.toUpperCase(),
          category: allergy.category?.toUpperCase(),
          criticality: allergy.criticality?.toUpperCase(),
          clinicalStatus: allergy.clinicalStatus?.toUpperCase(),
          reactions: allergy.reactions ? JSON.stringify(allergy.reactions) : null,
          recordedDate: allergy.recordedDate ? new Date(allergy.recordedDate) : null,
          recorder: allergy.recorder,
          notes: allergy.notes,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          fhirId: allergy.id,
          patientFhirId: allergy.patientId,
          allergen: allergy.allergen,
          allergenCode: allergy.allergenCode,
          type: allergy.type?.toUpperCase() || 'ALLERGY',
          category: allergy.category?.toUpperCase() || 'MEDICATION',
          criticality: allergy.criticality?.toUpperCase() || 'UNABLE_TO_ASSESS',
          clinicalStatus: allergy.clinicalStatus?.toUpperCase() || 'ACTIVE',
          reactions: allergy.reactions ? JSON.stringify(allergy.reactions) : null,
          recordedDate: allergy.recordedDate ? new Date(allergy.recordedDate) : null,
          recorder: allergy.recorder,
          notes: allergy.notes,
          source: 'FHIR',
          lastSyncedAt: new Date(),
        },
      });
      count++;
    }

    return count;
  }

  private async persistConditions(tx: any, conditions: AttendingCondition[]): Promise<number> {
    let count = 0;

    for (const condition of conditions) {
      await tx.condition.upsert({
        where: {
          fhirId: condition.id,
        },
        update: {
          code: condition.code,
          codeSystem: condition.codeSystem,
          name: condition.name,
          clinicalStatus: condition.clinicalStatus?.toUpperCase(),
          verificationStatus: condition.verificationStatus?.toUpperCase(),
          severity: condition.severity?.toUpperCase(),
          category: condition.category?.toUpperCase(),
          onsetDate: condition.onsetDate ? new Date(condition.onsetDate) : null,
          abatementDate: condition.abatementDate ? new Date(condition.abatementDate) : null,
          recordedDate: condition.recordedDate ? new Date(condition.recordedDate) : null,
          recorder: condition.recorder,
          notes: condition.notes,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          fhirId: condition.id,
          patientFhirId: condition.patientId,
          code: condition.code,
          codeSystem: condition.codeSystem,
          name: condition.name,
          clinicalStatus: condition.clinicalStatus?.toUpperCase() || 'ACTIVE',
          verificationStatus: condition.verificationStatus?.toUpperCase(),
          severity: condition.severity?.toUpperCase(),
          category: condition.category?.toUpperCase() || 'PROBLEM',
          onsetDate: condition.onsetDate ? new Date(condition.onsetDate) : null,
          abatementDate: condition.abatementDate ? new Date(condition.abatementDate) : null,
          recordedDate: condition.recordedDate ? new Date(condition.recordedDate) : null,
          recorder: condition.recorder,
          notes: condition.notes,
          source: 'FHIR',
          lastSyncedAt: new Date(),
        },
      });
      count++;
    }

    return count;
  }

  private async persistLabResults(tx: any, labResults: AttendingLabResult[]): Promise<number> {
    let count = 0;

    for (const lab of labResults) {
      await tx.labResult.upsert({
        where: {
          fhirId: lab.id,
        },
        update: {
          testName: lab.testName,
          testCode: lab.testCode,
          value: lab.value,
          unit: lab.unit,
          referenceRange: lab.referenceRange,
          interpretation: lab.interpretation?.toUpperCase(),
          status: lab.status?.toUpperCase(),
          collectedAt: lab.collectedAt ? new Date(lab.collectedAt) : null,
          resultedAt: lab.resultedAt ? new Date(lab.resultedAt) : null,
          performedBy: lab.performedBy,
          notes: lab.notes,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          fhirId: lab.id,
          patientFhirId: lab.patientId,
          testName: lab.testName,
          testCode: lab.testCode,
          value: lab.value,
          unit: lab.unit,
          referenceRange: lab.referenceRange,
          interpretation: lab.interpretation?.toUpperCase(),
          status: lab.status?.toUpperCase() || 'FINAL',
          collectedAt: lab.collectedAt ? new Date(lab.collectedAt) : null,
          resultedAt: lab.resultedAt ? new Date(lab.resultedAt) : null,
          performedBy: lab.performedBy,
          notes: lab.notes,
          source: 'FHIR',
          lastSyncedAt: new Date(),
        },
      });
      count++;
    }

    return count;
  }

  private async persistVitals(tx: any, vitals: AttendingVitalSign[]): Promise<number> {
    let count = 0;

    for (const vital of vitals) {
      await tx.vitalSign.upsert({
        where: {
          fhirId: vital.id,
        },
        update: {
          type: vital.type?.toUpperCase().replace(/_/g, '_'),
          value: vital.value,
          unit: vital.unit,
          systolic: vital.systolic,
          diastolic: vital.diastolic,
          recordedAt: vital.recordedAt ? new Date(vital.recordedAt) : null,
          recordedBy: vital.recordedBy,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          fhirId: vital.id,
          patientFhirId: vital.patientId,
          type: vital.type?.toUpperCase().replace(/_/g, '_') || 'OTHER',
          value: vital.value,
          unit: vital.unit,
          systolic: vital.systolic,
          diastolic: vital.diastolic,
          recordedAt: vital.recordedAt ? new Date(vital.recordedAt) : null,
          recordedBy: vital.recordedBy,
          source: 'FHIR',
          lastSyncedAt: new Date(),
        },
      });
      count++;
    }

    return count;
  }

  private async persistEncounters(tx: any, encounters: AttendingEncounter[]): Promise<number> {
    let count = 0;

    for (const encounter of encounters) {
      await tx.encounter.upsert({
        where: {
          fhirId: encounter.id,
        },
        update: {
          status: encounter.status?.toUpperCase(),
          type: encounter.type,
          class: encounter.class?.toUpperCase(),
          startTime: encounter.startTime ? new Date(encounter.startTime) : null,
          endTime: encounter.endTime ? new Date(encounter.endTime) : null,
          provider: encounter.provider,
          location: encounter.location,
          reasonForVisit: encounter.reasonForVisit,
          chiefComplaint: encounter.chiefComplaint,
          diagnoses: encounter.diagnoses ? JSON.stringify(encounter.diagnoses) : null,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          fhirId: encounter.id,
          patientFhirId: encounter.patientId,
          status: encounter.status?.toUpperCase() || 'FINISHED',
          type: encounter.type,
          class: encounter.class?.toUpperCase() || 'AMBULATORY',
          startTime: encounter.startTime ? new Date(encounter.startTime) : null,
          endTime: encounter.endTime ? new Date(encounter.endTime) : null,
          provider: encounter.provider,
          location: encounter.location,
          reasonForVisit: encounter.reasonForVisit,
          chiefComplaint: encounter.chiefComplaint,
          diagnoses: encounter.diagnoses ? JSON.stringify(encounter.diagnoses) : null,
          source: 'FHIR',
          lastSyncedAt: new Date(),
        },
      });
      count++;
    }

    return count;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createFhirPersistenceService(
  prisma: PrismaClient,
  userId: string,
  fhirPatientId: string
): FhirPersistenceService {
  return new FhirPersistenceService(prisma, userId, fhirPatientId);
}
