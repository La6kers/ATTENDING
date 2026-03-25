// =============================================================================
// ATTENDING AI - FHIR Sync Service
// apps/shared/services/fhir-sync/FhirSyncService.ts
//
// Orchestrates data synchronization between EHR systems and ATTENDING
// Pulls patient data from Epic/Cerner and writes to local database
// =============================================================================

import { FhirClient, createFhirClient } from '../../lib/fhir';
import {
  mapFhirPatientToAttending,
  mapFhirObservationToLabResult,
  mapFhirObservationToVitalSign,
  mapFhirConditionToAttending,
  mapFhirMedicationRequestToAttending,
  mapFhirAllergyToAttending,
  mapFhirEncounterToAttending,
  extractResourcesFromBundle,
  type AttendingPatient,
  type AttendingLabResult,
  type AttendingVitalSign,
  type AttendingCondition,
  type AttendingMedication,
  type AttendingAllergy,
  type AttendingEncounter,
} from '../../lib/fhir/resourceMappers';
import type {
  FhirClientConfig,
  FhirPatient,
  FhirObservation,
  FhirCondition,
  FhirMedicationRequest,
  FhirAllergyIntolerance,
  FhirEncounter,
  FhirBundle,
  EhrVendor,
} from '../../lib/fhir/types';

// =============================================================================
// Types
// =============================================================================

export interface FhirConnectionCredentials {
  vendor: EhrVendor;
  baseUrl: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: Date;
  patientId?: string;
  encounterId?: string;
}

export interface SyncOptions {
  includePatient?: boolean;
  includeMedications?: boolean;
  includeAllergies?: boolean;
  includeConditions?: boolean;
  includeLabResults?: boolean;
  includeVitals?: boolean;
  includeEncounters?: boolean;
  includeDocuments?: boolean;
  sinceDatetime?: Date;
  maxResults?: number;
}

export interface SyncResult {
  success: boolean;
  syncedAt: Date;
  duration: number;
  counts: {
    patient?: number;
    medications?: number;
    allergies?: number;
    conditions?: number;
    labResults?: number;
    vitals?: number;
    encounters?: number;
    documents?: number;
  };
  errors: SyncError[];
  data: {
    patient?: AttendingPatient;
    medications?: AttendingMedication[];
    allergies?: AttendingAllergy[];
    conditions?: AttendingCondition[];
    labResults?: AttendingLabResult[];
    vitals?: AttendingVitalSign[];
    encounters?: AttendingEncounter[];
  };
}

export interface SyncError {
  resource: string;
  message: string;
  code?: string;
}

// =============================================================================
// FHIR Sync Service
// =============================================================================

export class FhirSyncService {
  private client: FhirClient;
  private credentials: FhirConnectionCredentials;

  constructor(credentials: FhirConnectionCredentials) {
    this.credentials = credentials;
    
    const config: FhirClientConfig = {
      ehr: {
        vendor: credentials.vendor,
        baseUrl: credentials.baseUrl,
        clientId: '', // Not needed for data access
        redirectUri: '',
        scopes: [],
      },
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenExpiresAt: credentials.tokenExpiresAt,
      patientId: credentials.patientId,
      encounterId: credentials.encounterId,
    };

    this.client = createFhirClient(config);
  }

  // ===========================================================================
  // Full Patient Sync
  // ===========================================================================

  async syncAll(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      syncedAt: new Date(),
      duration: 0,
      counts: {},
      errors: [],
      data: {},
    };

    const opts: SyncOptions = {
      includePatient: true,
      includeMedications: true,
      includeAllergies: true,
      includeConditions: true,
      includeLabResults: true,
      includeVitals: true,
      includeEncounters: true,
      maxResults: 100,
      ...options,
    };

    // Sync patient demographics
    if (opts.includePatient) {
      try {
        result.data.patient = await this.syncPatient();
        result.counts.patient = 1;
      } catch (error: any) {
        result.errors.push({ resource: 'Patient', message: error.message });
      }
    }

    // Sync medications
    if (opts.includeMedications) {
      try {
        result.data.medications = await this.syncMedications(opts.sinceDatetime);
        result.counts.medications = result.data.medications.length;
      } catch (error: any) {
        result.errors.push({ resource: 'MedicationRequest', message: error.message });
      }
    }

    // Sync allergies
    if (opts.includeAllergies) {
      try {
        result.data.allergies = await this.syncAllergies();
        result.counts.allergies = result.data.allergies.length;
      } catch (error: any) {
        result.errors.push({ resource: 'AllergyIntolerance', message: error.message });
      }
    }

    // Sync conditions/problems
    if (opts.includeConditions) {
      try {
        result.data.conditions = await this.syncConditions();
        result.counts.conditions = result.data.conditions.length;
      } catch (error: any) {
        result.errors.push({ resource: 'Condition', message: error.message });
      }
    }

    // Sync lab results
    if (opts.includeLabResults) {
      try {
        result.data.labResults = await this.syncLabResults(opts.sinceDatetime, opts.maxResults);
        result.counts.labResults = result.data.labResults.length;
      } catch (error: any) {
        result.errors.push({ resource: 'Observation/Laboratory', message: error.message });
      }
    }

    // Sync vitals
    if (opts.includeVitals) {
      try {
        result.data.vitals = await this.syncVitals(opts.sinceDatetime, opts.maxResults);
        result.counts.vitals = result.data.vitals.length;
      } catch (error: any) {
        result.errors.push({ resource: 'Observation/Vitals', message: error.message });
      }
    }

    // Sync encounters
    if (opts.includeEncounters) {
      try {
        result.data.encounters = await this.syncEncounters(opts.sinceDatetime, opts.maxResults);
        result.counts.encounters = result.data.encounters.length;
      } catch (error: any) {
        result.errors.push({ resource: 'Encounter', message: error.message });
      }
    }

    result.duration = Date.now() - startTime;
    result.success = result.errors.length === 0;

    return result;
  }

  // ===========================================================================
  // Individual Resource Sync Methods
  // ===========================================================================

  async syncPatient(): Promise<AttendingPatient> {
    const fhirPatient = await this.client.getPatient();
    return mapFhirPatientToAttending(fhirPatient);
  }

  async syncMedications(since?: Date): Promise<AttendingMedication[]> {
    const bundle = await this.client.getMedications();
    const resources = extractResourcesFromBundle<FhirMedicationRequest>(bundle, 'MedicationRequest');
    
    let medications = resources.map(mapFhirMedicationRequestToAttending);
    
    if (since) {
      medications = medications.filter(m => 
        new Date(m.prescribedDate) >= since
      );
    }

    return medications;
  }

  async syncActiveMedications(): Promise<AttendingMedication[]> {
    const bundle = await this.client.getActiveMedications();
    const resources = extractResourcesFromBundle<FhirMedicationRequest>(bundle, 'MedicationRequest');
    return resources.map(mapFhirMedicationRequestToAttending);
  }

  async syncAllergies(): Promise<AttendingAllergy[]> {
    const bundle = await this.client.getAllergies();
    const resources = extractResourcesFromBundle<FhirAllergyIntolerance>(bundle, 'AllergyIntolerance');
    return resources.map(mapFhirAllergyToAttending);
  }

  async syncConditions(): Promise<AttendingCondition[]> {
    const bundle = await this.client.getConditions();
    const resources = extractResourcesFromBundle<FhirCondition>(bundle, 'Condition');
    return resources.map(mapFhirConditionToAttending);
  }

  async syncProblemList(): Promise<AttendingCondition[]> {
    const bundle = await this.client.getProblemList();
    const resources = extractResourcesFromBundle<FhirCondition>(bundle, 'Condition');
    return resources.map(mapFhirConditionToAttending);
  }

  async syncLabResults(since?: Date, maxResults: number = 100): Promise<AttendingLabResult[]> {
    const bundle = await this.client.getLabResults();
    const resources = extractResourcesFromBundle<FhirObservation>(bundle, 'Observation');
    
    let results = resources.map(mapFhirObservationToLabResult);
    
    if (since) {
      results = results.filter(r => 
        new Date(r.resultedAt) >= since
      );
    }

    return results.slice(0, maxResults);
  }

  async syncVitals(since?: Date, maxResults: number = 50): Promise<AttendingVitalSign[]> {
    const bundle = await this.client.getVitals();
    const resources = extractResourcesFromBundle<FhirObservation>(bundle, 'Observation');
    
    let vitals = resources.map(mapFhirObservationToVitalSign);
    
    if (since) {
      vitals = vitals.filter(v => 
        new Date(v.recordedAt) >= since
      );
    }

    return vitals.slice(0, maxResults);
  }

  async syncEncounters(since?: Date, maxResults: number = 50): Promise<AttendingEncounter[]> {
    const bundle = await this.client.getEncounters();
    const resources = extractResourcesFromBundle<FhirEncounter>(bundle, 'Encounter');
    
    let encounters = resources.map(mapFhirEncounterToAttending);
    
    if (since) {
      encounters = encounters.filter(e => 
        new Date(e.startTime) >= since
      );
    }

    return encounters.slice(0, maxResults);
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  getPatientId(): string | undefined {
    return this.credentials.patientId;
  }

  isTokenExpired(): boolean {
    return new Date() >= this.credentials.tokenExpiresAt;
  }

  async refreshTokenIfNeeded(): Promise<boolean> {
    if (!this.isTokenExpired()) return false;
    
    // Token refresh is handled by the FhirClient internally
    // This method is for external checks
    return true;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createFhirSyncService(credentials: FhirConnectionCredentials): FhirSyncService {
  return new FhirSyncService(credentials);
}
