// =============================================================================
// ATTENDING AI - FHIR Sync Service
// apps/provider-portal/lib/fhir/FhirSyncService.ts
//
// Orchestrates syncing FHIR data to ATTENDING database
// =============================================================================

import { FhirClient } from '@attending/shared/lib/fhir';
import {
  mapFhirPatientToAttending,
  mapFhirObservationToLabResult,
  mapFhirObservationToVitalSign,
  mapFhirConditionToAttending,
  mapFhirMedicationRequestToAttending,
  mapFhirAllergyToAttending,
  mapFhirEncounterToAttending,
  extractResourcesFromBundle,
  AttendingPatient,
  AttendingLabResult,
  AttendingVitalSign,
  AttendingCondition,
  AttendingMedication,
  AttendingAllergy,
  AttendingEncounter,
} from '@attending/shared/lib/fhir/resourceMappers';
import {
  FhirPatient,
  FhirObservation,
  FhirCondition,
  FhirMedicationRequest,
  FhirAllergyIntolerance,
  FhirEncounter,
} from '@attending/shared/lib/fhir/types';
import { PrismaClient } from '@prisma/client';

// =============================================================================
// FHIR Sync Service
// =============================================================================

export class FhirSyncService {
  private client: FhirClient;
  private prisma: PrismaClient;

  constructor(client: FhirClient, prisma: PrismaClient) {
    this.client = client;
    this.prisma = prisma;
  }

  // ===========================================================================
  // Patient Sync
  // ===========================================================================

  async syncPatient(fhirPatientId: string): Promise<AttendingPatient & { id: string }> {
    const fhirPatient = await this.client.getPatient(fhirPatientId);
    const patientData = mapFhirPatientToAttending(fhirPatient);

    const patient = await this.prisma.patient.upsert({
      where: { fhirId: fhirPatientId },
      update: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        dateOfBirth: patientData.dateOfBirth ? new Date(patientData.dateOfBirth) : undefined,
        gender: patientData.gender.toUpperCase(),
        email: patientData.email,
        phone: patientData.phone,
        preferredLanguage: patientData.preferredLanguage,
        updatedAt: new Date(),
      },
      create: {
        fhirId: fhirPatientId,
        mrn: patientData.mrn || `FHIR-${fhirPatientId.substring(0, 8)}`,
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        dateOfBirth: patientData.dateOfBirth ? new Date(patientData.dateOfBirth) : new Date(),
        gender: patientData.gender.toUpperCase(),
        email: patientData.email,
        phone: patientData.phone,
        preferredLanguage: patientData.preferredLanguage,
      },
    });

    return {
      ...patientData,
      id: patient.id,
    };
  }

  // ===========================================================================
  // Allergies Sync
  // ===========================================================================

  async syncAllergies(fhirPatientId: string): Promise<AttendingAllergy[]> {
    const bundle = await this.client.getAllergies(fhirPatientId);
    const fhirAllergies = extractResourcesFromBundle<FhirAllergyIntolerance>(bundle, 'AllergyIntolerance');
    
    const allergies: AttendingAllergy[] = [];

    const patient = await this.prisma.patient.findUnique({
      where: { fhirId: fhirPatientId },
      select: { id: true },
    });

    if (!patient) {
      throw new Error(`Patient not found for FHIR ID: ${fhirPatientId}`);
    }

    for (const fhirAllergy of fhirAllergies) {
      const allergyData = mapFhirAllergyToAttending(fhirAllergy);

      try {
        await this.prisma.allergy.upsert({
          where: {
            patientId_allergen: {
              patientId: patient.id,
              allergen: allergyData.allergen,
            },
          },
          update: {
            reaction: allergyData.reactions?.[0]?.manifestation,
            severity: allergyData.criticality === 'high' ? 'SEVERE' : allergyData.criticality === 'low' ? 'MILD' : 'MODERATE',
            type: allergyData.category.toUpperCase(),
            status: allergyData.clinicalStatus === 'active' ? 'ACTIVE' : 'INACTIVE',
            fhirId: fhirAllergy.id,
            updatedAt: new Date(),
          },
          create: {
            patientId: patient.id,
            allergen: allergyData.allergen,
            reaction: allergyData.reactions?.[0]?.manifestation,
            severity: allergyData.criticality === 'high' ? 'SEVERE' : allergyData.criticality === 'low' ? 'MILD' : 'MODERATE',
            type: allergyData.category.toUpperCase(),
            status: 'ACTIVE',
            fhirId: fhirAllergy.id,
          },
        });
      } catch (err) {
        console.warn(`[FhirSync] Could not sync allergy: ${allergyData.allergen}`, err);
      }

      allergies.push(allergyData);
    }

    return allergies;
  }

  // ===========================================================================
  // Medications Sync
  // ===========================================================================

  async syncMedications(fhirPatientId: string): Promise<AttendingMedication[]> {
    const bundle = await this.client.getActiveMedications(fhirPatientId);
    const fhirMeds = extractResourcesFromBundle<FhirMedicationRequest>(bundle, 'MedicationRequest');

    const medications: AttendingMedication[] = [];

    const patient = await this.prisma.patient.findUnique({
      where: { fhirId: fhirPatientId },
      select: { id: true },
    });

    if (!patient) {
      throw new Error(`Patient not found for FHIR ID: ${fhirPatientId}`);
    }

    for (const fhirMed of fhirMeds) {
      const medData = mapFhirMedicationRequestToAttending(fhirMed);
      const fhirId = fhirMed.id || `med-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      try {
        await this.prisma.fhirMedication.upsert({
          where: { fhirId },
          update: {
            medicationName: medData.medicationName,
            dosage: medData.dosage,
            frequency: medData.frequency,
            route: medData.route,
            status: medData.status === 'active' ? 'ACTIVE' : 'DISCONTINUED',
            prescribedDate: medData.prescribedDate ? new Date(medData.prescribedDate) : undefined,
            updatedAt: new Date(),
          },
          create: {
            patientId: patient.id,
            medicationName: medData.medicationName,
            genericName: medData.medicationCode,
            dosage: medData.dosage,
            frequency: medData.frequency,
            route: medData.route,
            status: medData.status === 'active' ? 'ACTIVE' : 'DISCONTINUED',
            prescribedDate: medData.prescribedDate ? new Date(medData.prescribedDate) : new Date(),
            fhirId,
          },
        });
      } catch (err) {
        console.warn(`[FhirSync] Could not sync medication: ${medData.medicationName}`, err);
      }

      medications.push(medData);
    }

    return medications;
  }

  // ===========================================================================
  // Conditions Sync
  // ===========================================================================

  async syncConditions(fhirPatientId: string): Promise<AttendingCondition[]> {
    const bundle = await this.client.getConditions(fhirPatientId);
    const fhirConditions = extractResourcesFromBundle<FhirCondition>(bundle, 'Condition');

    const conditions: AttendingCondition[] = [];

    const patient = await this.prisma.patient.findUnique({
      where: { fhirId: fhirPatientId },
      select: { id: true },
    });

    if (!patient) {
      throw new Error(`Patient not found for FHIR ID: ${fhirPatientId}`);
    }

    for (const fhirCondition of fhirConditions) {
      const conditionData = mapFhirConditionToAttending(fhirCondition);
      const fhirId = fhirCondition.id || `cond-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      try {
        await this.prisma.fhirCondition.upsert({
          where: { fhirId },
          update: {
            name: conditionData.name,
            icdCode: conditionData.code,
            status: conditionData.clinicalStatus === 'active' ? 'ACTIVE' : conditionData.clinicalStatus === 'resolved' ? 'RESOLVED' : 'INACTIVE',
            onsetDate: conditionData.onsetDate ? new Date(conditionData.onsetDate) : undefined,
            updatedAt: new Date(),
          },
          create: {
            patientId: patient.id,
            name: conditionData.name,
            icdCode: conditionData.code,
            status: conditionData.clinicalStatus === 'active' ? 'ACTIVE' : 'INACTIVE',
            onsetDate: conditionData.onsetDate ? new Date(conditionData.onsetDate) : undefined,
            recordedDate: conditionData.recordedDate ? new Date(conditionData.recordedDate) : new Date(),
            fhirId,
          },
        });
      } catch (err) {
        console.warn(`[FhirSync] Could not sync condition: ${conditionData.name}`, err);
      }

      conditions.push(conditionData);
    }

    return conditions;
  }

  // ===========================================================================
  // Lab Results Sync
  // ===========================================================================

  async syncLabResults(fhirPatientId: string): Promise<AttendingLabResult[]> {
    const bundle = await this.client.getLabResults(fhirPatientId);
    const fhirObs = extractResourcesFromBundle<FhirObservation>(bundle, 'Observation');

    const labResults: AttendingLabResult[] = [];

    const patient = await this.prisma.patient.findUnique({
      where: { fhirId: fhirPatientId },
      select: { id: true },
    });

    if (!patient) {
      throw new Error(`Patient not found for FHIR ID: ${fhirPatientId}`);
    }

    for (const obs of fhirObs) {
      const labData = mapFhirObservationToLabResult(obs);
      const fhirId = obs.id || `lab-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      try {
        await this.prisma.fhirLabResult.upsert({
          where: { fhirId },
          update: {
            testName: labData.testName,
            testCode: labData.testCode,
            value: labData.value,
            unit: labData.unit,
            referenceRange: labData.referenceRange,
            interpretation: labData.interpretation?.toUpperCase(),
            status: labData.status.toUpperCase(),
            resultedAt: labData.resultedAt ? new Date(labData.resultedAt) : undefined,
            updatedAt: new Date(),
          },
          create: {
            patientId: patient.id,
            testName: labData.testName,
            testCode: labData.testCode,
            value: labData.value,
            unit: labData.unit,
            referenceRange: labData.referenceRange,
            interpretation: labData.interpretation?.toUpperCase(),
            status: labData.status.toUpperCase(),
            collectedAt: labData.collectedAt ? new Date(labData.collectedAt) : new Date(),
            resultedAt: labData.resultedAt ? new Date(labData.resultedAt) : new Date(),
            fhirId,
          },
        });
      } catch (err) {
        console.warn(`[FhirSync] Could not sync lab result: ${labData.testName}`, err);
      }

      labResults.push(labData);
    }

    return labResults;
  }

  // ===========================================================================
  // Vitals Sync
  // ===========================================================================

  async syncVitals(fhirPatientId: string): Promise<AttendingVitalSign[]> {
    const bundle = await this.client.getVitals(fhirPatientId);
    const fhirObs = extractResourcesFromBundle<FhirObservation>(bundle, 'Observation');

    const vitals: AttendingVitalSign[] = [];

    const patient = await this.prisma.patient.findUnique({
      where: { fhirId: fhirPatientId },
      select: { id: true },
    });

    if (!patient) {
      throw new Error(`Patient not found for FHIR ID: ${fhirPatientId}`);
    }

    for (const obs of fhirObs) {
      const vitalData = mapFhirObservationToVitalSign(obs);
      const fhirId = obs.id || `vital-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      try {
        await this.prisma.fhirVitalSign.upsert({
          where: { fhirId },
          update: {
            type: vitalData.type.toUpperCase().replace(/_/g, '_'),
            value: vitalData.value,
            unit: vitalData.unit,
            systolic: vitalData.systolic,
            diastolic: vitalData.diastolic,
            recordedAt: vitalData.recordedAt ? new Date(vitalData.recordedAt) : undefined,
            updatedAt: new Date(),
          },
          create: {
            patientId: patient.id,
            type: vitalData.type.toUpperCase().replace(/_/g, '_'),
            value: vitalData.value,
            unit: vitalData.unit,
            systolic: vitalData.systolic,
            diastolic: vitalData.diastolic,
            recordedAt: vitalData.recordedAt ? new Date(vitalData.recordedAt) : new Date(),
            fhirId,
          },
        });
      } catch (err) {
        console.warn(`[FhirSync] Could not sync vital: ${vitalData.type}`, err);
      }

      vitals.push(vitalData);
    }

    return vitals;
  }

  // ===========================================================================
  // Encounters Sync
  // ===========================================================================

  async syncEncounters(fhirPatientId: string): Promise<AttendingEncounter[]> {
    const bundle = await this.client.getEncounters(fhirPatientId);
    const fhirEncounters = extractResourcesFromBundle<FhirEncounter>(bundle, 'Encounter');

    const encounters: AttendingEncounter[] = [];

    const patient = await this.prisma.patient.findUnique({
      where: { fhirId: fhirPatientId },
      select: { id: true },
    });

    if (!patient) {
      throw new Error(`Patient not found for FHIR ID: ${fhirPatientId}`);
    }

    for (const fhirEncounter of fhirEncounters) {
      const encounterData = mapFhirEncounterToAttending(fhirEncounter);
      const fhirId = fhirEncounter.id || `enc-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      try {
        await this.prisma.fhirEncounter.upsert({
          where: { fhirId },
          update: {
            status: encounterData.status.toUpperCase().replace(/-/g, '_'),
            type: encounterData.type,
            class: encounterData.class.toUpperCase(),
            startTime: encounterData.startTime ? new Date(encounterData.startTime) : undefined,
            endTime: encounterData.endTime ? new Date(encounterData.endTime) : undefined,
            reasonForVisit: encounterData.reasonForVisit,
            updatedAt: new Date(),
          },
          create: {
            patientId: patient.id,
            status: encounterData.status.toUpperCase().replace(/-/g, '_'),
            type: encounterData.type,
            class: encounterData.class.toUpperCase(),
            startTime: encounterData.startTime ? new Date(encounterData.startTime) : new Date(),
            endTime: encounterData.endTime ? new Date(encounterData.endTime) : undefined,
            reasonForVisit: encounterData.reasonForVisit,
            fhirId,
          },
        });
      } catch (err) {
        console.warn(`[FhirSync] Could not sync encounter: ${fhirId}`, err);
      }

      encounters.push(encounterData);
    }

    return encounters;
  }

  // ===========================================================================
  // Full Patient History Sync
  // ===========================================================================

  async syncFullPatientHistory(fhirPatientId: string): Promise<{
    patient: AttendingPatient & { id: string };
    allergies: AttendingAllergy[];
    medications: AttendingMedication[];
    conditions: AttendingCondition[];
    labResults: AttendingLabResult[];
    vitals: AttendingVitalSign[];
    encounters: AttendingEncounter[];
  }> {
    const patient = await this.syncPatient(fhirPatientId);

    const [allergies, medications, conditions, labResults, vitals, encounters] = await Promise.all([
      this.syncAllergies(fhirPatientId),
      this.syncMedications(fhirPatientId),
      this.syncConditions(fhirPatientId),
      this.syncLabResults(fhirPatientId),
      this.syncVitals(fhirPatientId),
      this.syncEncounters(fhirPatientId),
    ]);

    return {
      patient,
      allergies,
      medications,
      conditions,
      labResults,
      vitals,
      encounters,
    };
  }
}
