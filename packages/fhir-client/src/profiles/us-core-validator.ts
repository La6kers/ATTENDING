// =============================================================================
// ATTENDING AI - US Core 6.1.0 Profile Validator
// packages/fhir-client/src/profiles/us-core-validator.ts
//
// Validates FHIR resources against US Core profiles required by CMS HTE
// =============================================================================

import type { ProfileValidationResult, ProfileValidationError, ProfileValidationWarning, USCoreProfile } from '../types';

// =============================================================================
// US Core Profile Validator
// =============================================================================

export class USCoreValidator {
  /**
   * Validate a FHIR resource against its US Core profile.
   */
  validate(resource: any): ProfileValidationResult {
    const profile = this.detectProfile(resource);
    if (!profile) {
      return {
        isValid: false,
        profile: 'us-core-patient' as USCoreProfile,
        errors: [{ path: 'resourceType', message: `Unsupported resource type: ${resource?.resourceType}`, severity: 'error' }],
        warnings: [],
      };
    }

    const errors: ProfileValidationError[] = [];
    const warnings: ProfileValidationWarning[] = [];

    // Common validations
    this.validateBase(resource, errors, warnings);

    // Profile-specific validations
    switch (profile) {
      case 'us-core-patient': this.validatePatient(resource, errors, warnings); break;
      case 'us-core-condition': this.validateCondition(resource, errors, warnings); break;
      case 'us-core-observation-lab': this.validateLabObservation(resource, errors, warnings); break;
      case 'us-core-vital-signs': this.validateVitalSigns(resource, errors, warnings); break;
      case 'us-core-medication-request': this.validateMedicationRequest(resource, errors, warnings); break;
      case 'us-core-allergy-intolerance': this.validateAllergyIntolerance(resource, errors, warnings); break;
      case 'us-core-encounter': this.validateEncounter(resource, errors, warnings); break;
    }

    return { isValid: errors.length === 0, profile, errors, warnings };
  }

  private detectProfile(resource: any): USCoreProfile | null {
    switch (resource?.resourceType) {
      case 'Patient': return 'us-core-patient';
      case 'Condition': return 'us-core-condition';
      case 'Observation': {
        const categories = resource.category || [];
        for (const cat of categories) {
          for (const coding of cat.coding || []) {
            if (coding.code === 'laboratory') return 'us-core-observation-lab';
            if (coding.code === 'vital-signs') return 'us-core-vital-signs';
          }
        }
        return 'us-core-observation-lab'; // default
      }
      case 'MedicationRequest': return 'us-core-medication-request';
      case 'AllergyIntolerance': return 'us-core-allergy-intolerance';
      case 'Encounter': return 'us-core-encounter';
      case 'Procedure': return 'us-core-procedure';
      case 'Immunization': return 'us-core-immunization';
      case 'DocumentReference': return 'us-core-document-reference';
      case 'DiagnosticReport': return 'us-core-diagnostic-report-lab';
      default: return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Base Validation (all resources)
  // ---------------------------------------------------------------------------

  private validateBase(resource: any, errors: ProfileValidationError[], warnings: ProfileValidationWarning[]): void {
    if (!resource.resourceType) {
      errors.push({ path: 'resourceType', message: 'Missing resourceType', severity: 'error' });
    }
    if (!resource.id && !resource.meta?.versionId) {
      warnings.push({ path: 'id', message: 'Resource has no id — may not be persisted', severity: 'warning' });
    }
  }

  // ---------------------------------------------------------------------------
  // US Core Patient (USCDI v3)
  // ---------------------------------------------------------------------------

  private validatePatient(patient: any, errors: ProfileValidationError[], warnings: ProfileValidationWarning[]): void {
    // Required: identifier, name, gender
    if (!patient.identifier?.length) {
      errors.push({ path: 'identifier', message: 'US Core Patient requires at least one identifier', severity: 'error' });
    }
    if (!patient.name?.length) {
      errors.push({ path: 'name', message: 'US Core Patient requires at least one name', severity: 'error' });
    } else {
      const officialName = patient.name.find((n: any) => n.use === 'official') || patient.name[0];
      if (!officialName.family) {
        errors.push({ path: 'name.family', message: 'US Core Patient requires family name', severity: 'error' });
      }
    }
    if (!patient.gender) {
      errors.push({ path: 'gender', message: 'US Core Patient requires gender', severity: 'error' });
    }

    // Must Support: birthDate, communication, address, telecom
    if (!patient.birthDate) {
      warnings.push({ path: 'birthDate', message: 'US Core Patient should include birthDate (Must Support)', severity: 'warning' });
    }
  }

  // ---------------------------------------------------------------------------
  // US Core Condition
  // ---------------------------------------------------------------------------

  private validateCondition(condition: any, errors: ProfileValidationError[], warnings: ProfileValidationWarning[]): void {
    if (!condition.clinicalStatus) {
      errors.push({ path: 'clinicalStatus', message: 'US Core Condition requires clinicalStatus', severity: 'error' });
    }
    if (!condition.category?.length) {
      errors.push({ path: 'category', message: 'US Core Condition requires at least one category', severity: 'error' });
    }
    if (!condition.code) {
      errors.push({ path: 'code', message: 'US Core Condition requires code', severity: 'error' });
    } else {
      this.validateSnomedCoding(condition.code, 'code', errors, warnings);
    }
    if (!condition.subject?.reference) {
      errors.push({ path: 'subject', message: 'US Core Condition requires subject reference', severity: 'error' });
    }
  }

  // ---------------------------------------------------------------------------
  // US Core Lab Observation
  // ---------------------------------------------------------------------------

  private validateLabObservation(obs: any, errors: ProfileValidationError[], warnings: ProfileValidationWarning[]): void {
    if (!obs.status) {
      errors.push({ path: 'status', message: 'US Core Observation requires status', severity: 'error' });
    }
    if (!obs.category?.length) {
      errors.push({ path: 'category', message: 'US Core Lab Observation requires category=laboratory', severity: 'error' });
    }
    if (!obs.code) {
      errors.push({ path: 'code', message: 'US Core Observation requires code', severity: 'error' });
    } else {
      this.validateLoincCoding(obs.code, 'code', errors, warnings);
    }
    if (!obs.subject?.reference) {
      errors.push({ path: 'subject', message: 'US Core Observation requires subject', severity: 'error' });
    }
    // Value or dataAbsentReason
    if (!obs.valueQuantity && !obs.valueCodeableConcept && !obs.valueString && !obs.dataAbsentReason) {
      warnings.push({ path: 'value', message: 'Observation should have a value or dataAbsentReason', severity: 'warning' });
    }
  }

  // ---------------------------------------------------------------------------
  // US Core Vital Signs
  // ---------------------------------------------------------------------------

  private validateVitalSigns(obs: any, errors: ProfileValidationError[], warnings: ProfileValidationWarning[]): void {
    this.validateLabObservation(obs, errors, warnings);
    if (!obs.effectiveDateTime && !obs.effectivePeriod) {
      errors.push({ path: 'effective', message: 'Vital signs require effectiveDateTime or effectivePeriod', severity: 'error' });
    }
  }

  // ---------------------------------------------------------------------------
  // US Core MedicationRequest
  // ---------------------------------------------------------------------------

  private validateMedicationRequest(med: any, errors: ProfileValidationError[], warnings: ProfileValidationWarning[]): void {
    if (!med.status) {
      errors.push({ path: 'status', message: 'MedicationRequest requires status', severity: 'error' });
    }
    if (!med.intent) {
      errors.push({ path: 'intent', message: 'MedicationRequest requires intent', severity: 'error' });
    }
    if (!med.medicationCodeableConcept && !med.medicationReference) {
      errors.push({ path: 'medication', message: 'MedicationRequest requires medication (CodeableConcept or Reference)', severity: 'error' });
    }
    if (med.medicationCodeableConcept) {
      this.validateRxNormCoding(med.medicationCodeableConcept, 'medicationCodeableConcept', errors, warnings);
    }
    if (!med.subject?.reference) {
      errors.push({ path: 'subject', message: 'MedicationRequest requires subject', severity: 'error' });
    }
  }

  // ---------------------------------------------------------------------------
  // US Core AllergyIntolerance
  // ---------------------------------------------------------------------------

  private validateAllergyIntolerance(allergy: any, errors: ProfileValidationError[], warnings: ProfileValidationWarning[]): void {
    if (!allergy.clinicalStatus) {
      warnings.push({ path: 'clinicalStatus', message: 'AllergyIntolerance should include clinicalStatus', severity: 'warning' });
    }
    if (!allergy.code) {
      errors.push({ path: 'code', message: 'US Core AllergyIntolerance requires code', severity: 'error' });
    }
    if (!allergy.patient?.reference) {
      errors.push({ path: 'patient', message: 'AllergyIntolerance requires patient', severity: 'error' });
    }
  }

  // ---------------------------------------------------------------------------
  // US Core Encounter
  // ---------------------------------------------------------------------------

  private validateEncounter(encounter: any, errors: ProfileValidationError[], warnings: ProfileValidationWarning[]): void {
    if (!encounter.status) {
      errors.push({ path: 'status', message: 'Encounter requires status', severity: 'error' });
    }
    if (!encounter.class) {
      errors.push({ path: 'class', message: 'US Core Encounter requires class', severity: 'error' });
    }
    if (!encounter.type?.length) {
      errors.push({ path: 'type', message: 'US Core Encounter requires at least one type', severity: 'error' });
    }
    if (!encounter.subject?.reference) {
      errors.push({ path: 'subject', message: 'Encounter requires subject', severity: 'error' });
    }
  }

  // ---------------------------------------------------------------------------
  // Terminology Validation Helpers
  // ---------------------------------------------------------------------------

  private validateSnomedCoding(codeableConcept: any, path: string, _errors: ProfileValidationError[], warnings: ProfileValidationWarning[]): void {
    const hasSnomedCoding = codeableConcept.coding?.some(
      (c: any) => c.system === 'http://snomed.info/sct'
    );
    if (!hasSnomedCoding) {
      warnings.push({ path, message: 'US Core prefers SNOMED CT coding for conditions', severity: 'warning' });
    }
  }

  private validateLoincCoding(codeableConcept: any, path: string, _errors: ProfileValidationError[], warnings: ProfileValidationWarning[]): void {
    const hasLoincCoding = codeableConcept.coding?.some(
      (c: any) => c.system === 'http://loinc.org'
    );
    if (!hasLoincCoding) {
      warnings.push({ path, message: 'US Core requires LOINC coding for lab observations', severity: 'warning' });
    }
  }

  private validateRxNormCoding(codeableConcept: any, path: string, _errors: ProfileValidationError[], warnings: ProfileValidationWarning[]): void {
    const hasRxNormCoding = codeableConcept.coding?.some(
      (c: any) => c.system === 'http://www.nlm.nih.gov/research/umls/rxnorm'
    );
    if (!hasRxNormCoding) {
      warnings.push({ path, message: 'US Core prefers RxNorm coding for medications', severity: 'warning' });
    }
  }
}
