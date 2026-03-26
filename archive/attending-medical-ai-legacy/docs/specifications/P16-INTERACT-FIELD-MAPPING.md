# P16 INTERACT Field Mapping Specification

Last Updated: March 24, 2026

## Overview

This document defines the field-by-field mapping from SNF clinical data sources to the INTERACT (Interventions to Reduce Acute Care Transfers) version 4.0 Transfer Communication Form. Each field specifies its data source, transformation logic, validation rules, and CMS regulatory reference.

**Transfer Urgency Impact**: Fields marked [E] are extracted in Emergency mode. Fields marked [U] are extracted in Urgent and Planned modes. Fields marked [E+U] are extracted in all modes.

---

## Section A: Patient Identification [E+U]

| # | INTERACT Field | Source Model | Source Field(s) | Transformation | Validation | CMS Reference |
|---|---------------|-------------|-----------------|---------------|------------|---------------|
| A1 | Patient Full Name | Patient | firstName, lastName | Concatenate: "{lastName}, {firstName}" | Non-empty, max 100 chars | 42 CFR 483.15(c)(2)(iii) |
| A2 | Date of Birth | Patient | dateOfBirth | ISO 8601 → MM/DD/YYYY | Valid date, not future | 42 CFR 483.15(c)(2)(iii) |
| A3 | Gender | Patient | gender | Map to INTERACT values: M/F/O | Required | — |
| A4 | SSN Last 4 | External SNF System | ssn | Extract last 4 digits | 4-digit numeric | — |
| A5 | Medicare/Medicaid Number | Patient | insurancePolicyNum | Direct mapping | Non-empty for Medicare patients | — |
| A6 | Insurance Provider | Patient | insuranceProvider | Direct mapping | Non-empty | — |
| A7 | SNF Facility Name | Organization | name (where type='SNF') | Direct mapping | Non-empty | 42 CFR 483.15(c)(2)(iii) |
| A8 | SNF Phone | Organization | phone | Direct mapping | Valid phone format | 42 CFR 483.15(c)(2)(iii) |
| A9 | SNF Fax | Organization | fax | Direct mapping | Valid phone format | — |
| A10 | SNF Address | Organization | address, city, state, zip | Concatenate full address | Non-empty | — |
| A11 | Attending Physician | User | name (via Encounter.providerId) | Direct mapping | Non-empty | 42 CFR 483.15(c)(2)(iii) |
| A12 | Attending Physician Phone | User | phone (via Encounter.providerId) | Direct mapping | Valid phone format | — |
| A13 | Responsible Party/POA | Patient | emergencyContactName | Direct mapping | Recommended | — |
| A14 | Responsible Party Phone | Patient | emergencyContactPhone | Direct mapping | Valid phone format | — |
| A15 | Date/Time of Transfer | TransferRequest | createdAt | ISO 8601 → MM/DD/YYYY HH:MM | Auto-populated | 42 CFR 483.15(c)(2)(iii) |

## Section B: Reason for Transfer [E+U]

| # | INTERACT Field | Source Model | Source Field(s) | Transformation | Validation | CMS Reference |
|---|---------------|-------------|-----------------|---------------|------------|---------------|
| B1 | Transfer Urgency Level | TransferRequest | urgencyLevel | Map: EMERGENCY/URGENT/PLANNED | Required, enum | INTERACT 4.0 §2 |
| B2 | Primary Reason for Transfer | TransferRequest | reasonForTransfer | Free text, max 500 chars | Non-empty | 42 CFR 483.15(c)(2)(ii) |
| B3 | Primary Diagnosis (ICD-10) | TransferRequest | icdCodes[0] | JSON array → first element | Valid ICD-10 format | — |
| B4 | Secondary Diagnoses | TransferRequest | icdCodes[1..n] | JSON array → remaining | Valid ICD-10 format each | — |
| B5 | Presenting Signs/Symptoms | PatientAssessment | chiefComplaint, aiSummary | Extract symptom list | Non-empty | INTERACT 4.0 §2 |
| B6 | Onset Date/Time | Encounter | startTime | ISO 8601 → MM/DD/YYYY HH:MM | Required for acute changes | INTERACT 4.0 §2 |
| B7 | Early Warning Signs Documented | TransferRequest | metadata.earlyWarningSigns | JSON → formatted list | Required by INTERACT | INTERACT 4.0 SBAR |
| B8 | Interventions Attempted at SNF | TransferRequest | metadata.interventionsAttempted | JSON array → formatted list with timestamps | Required by INTERACT | INTERACT 4.0 §3 |
| B9 | Physician Notification Time | TransferRequest | metadata.physicianNotifiedAt | ISO 8601 → MM/DD/YYYY HH:MM | Required | INTERACT 4.0 §3 |
| B10 | Physician Response/Orders | TransferRequest | metadata.physicianOrders | Free text | Required | INTERACT 4.0 §3 |
| B11 | Family/Responsible Party Notified | TransferRequest | metadata.familyNotifiedAt | ISO 8601 → MM/DD/YYYY HH:MM | Required | INTERACT 4.0 §3 |

## Section C: Current Medications (MAR) [E+U]

| # | INTERACT Field | Source Model | Source Field(s) | Transformation | Validation | CMS Reference |
|---|---------------|-------------|-----------------|---------------|------------|---------------|
| C1 | Complete Medication List | SNFMedication | all active records | Aggregate: name, dose, frequency, route | Min 0, no max | 42 CFR 483.15(c)(2)(iii) |
| C2 | Last Administration Time per Med | SNFMedicationAdministration | administeredTime (most recent per med) | Most recent WHERE status='GIVEN' | DateTime or "not yet administered" | — |
| C3 | PRN Medications | SNFMedication | WHERE isPRN=true | Filter + include prnIndication | Flag if used in last 24h | — |
| C4 | PRN Last Use | SNFMedicationAdministration | WHERE snfMedication.isPRN=true, most recent | Most recent admin time | DateTime or "not used" | — |
| C5 | Dose Holds | SNFMedication | WHERE holdStartDate IS NOT NULL AND holdEndDate IS NULL | Include holdReason | Flag as active hold | — |
| C6 | Recent Changes (7 days) | SNFMedication | WHERE lastDoseChange > NOW()-7d | Include previousDose for comparison | Flag prominently | INTERACT 4.0 §4 |
| C7 | Controlled Substances | SNFMedication | WHERE isControlled=true | Include deaSchedule | Requires count verification | DEA 21 CFR 1304 |
| C8 | Allergies/Contraindications Cross-Ref | Allergy + SNFMedication | Cross-reference allergens against active meds | Flag any active med matching allergen class | Alert if match found | — |
| C9 | MAR Reconciliation Summary | MARReconciliation | discrepancyCount, criticalDiscrepancyCount | Summary: "{total} meds, {disc} discrepancies ({crit} critical)" | Auto-generated | — |
| C10 | Medication Discrepancy Detail | MARDiscrepancy | all records for this reconciliation | Formatted list with severity and resolution | Include unresolved items | — |

## Section D: Allergies [E+U]

| # | INTERACT Field | Source Model | Source Field(s) | Transformation | Validation | CMS Reference |
|---|---------------|-------------|-----------------|---------------|------------|---------------|
| D1 | Allergen Name | Allergy | allergen | Direct mapping | Non-empty | 42 CFR 483.15(c)(2)(iii) |
| D2 | Reaction Type | Allergy | reactions | JSON → formatted list | Non-empty | — |
| D3 | Severity | Allergy | severity | Map: MILD/MODERATE/SEVERE/LIFE_THREATENING | Required | — |
| D4 | NKDA Status | Allergy | (absence of records) | If no allergies: "No Known Drug Allergies" | Must be explicitly confirmed | — |

## Section E: Advance Directives [E+U]

| # | INTERACT Field | Source Model | Source Field(s) | Transformation | Validation | CMS Reference |
|---|---------------|-------------|-----------------|---------------|------------|---------------|
| E1 | Code Status | AdvanceDirective | codeStatus | Map: FULL_CODE/DNR/DNR_DNI/CMO/LIMITED | Required — first field transmitted | 42 CFR 483.15(c)(2)(iii) |
| E2 | Document Type | AdvanceDirective | documentType | Map: POLST/MOLST/AD/DNR/LIVING_WILL | Required | — |
| E3 | Document Date | AdvanceDirective | effectiveDate | ISO 8601 → MM/DD/YYYY | Required | — |
| E4 | Intubation Preference | AdvanceDirective | intubationPreference | Map: YES/NO/TRIAL_PERIOD | Recommended | — |
| E5 | Dialysis Preference | AdvanceDirective | dialysisPreference | Map: YES/NO/TRIAL_PERIOD | Recommended | — |
| E6 | Antibiotic Preference | AdvanceDirective | antibioticsPreference | Map: YES/LIMITED/COMFORT_ONLY | Recommended | — |
| E7 | Nutrition Directive | AdvanceDirective | nutritionDirective | Map: FULL/COMFORT_FEEDING/NO_ARTIFICIAL/PATIENT_CHOICE | Recommended | — |
| E8 | Treatment Limitations | AdvanceDirective | treatmentLimitations | JSON → formatted list | Free text if present | — |
| E9 | Verification Status | AdvanceDirective | verifiedAt, verifiedBy | "Verified {date} by {name}" or "NOT VERIFIED — LAST VERIFIED {date}" | Alert if >90 days since verification | INTERACT 4.0 §5 |
| E10 | Scanned Document Available | AdvanceDirective | documentUrl | Boolean: URL present or not | Flag if no document on file | — |

## Section F: Functional Status [U]

| # | INTERACT Field | Source Model | Source Field(s) | Transformation | Validation | CMS Reference |
|---|---------------|-------------|-----------------|---------------|------------|---------------|
| F1 | Barthel Index Score | FunctionalStatusAssessment | totalScore WHERE instrumentType='BARTHEL' | Score + interpretation: 0-20 Total, 21-60 Severe, 61-90 Moderate, 91-99 Slight, 100 Independent | Score 0-100 | — |
| F2 | Barthel Subscores | FunctionalStatusAssessment | subscores WHERE instrumentType='BARTHEL' | JSON → formatted table of 10 ADL categories | Each 0-10 or 0-15 | — |
| F3 | Katz ADL Score | FunctionalStatusAssessment | totalScore WHERE instrumentType='KATZ_ADL' | Score + letter grade (A-G) | Score 0-6 | — |
| F4 | Morse Fall Risk Score | FunctionalStatusAssessment | totalScore WHERE instrumentType='MORSE_FALL' | Score + risk level: 0-24 Low, 25-44 Moderate, ≥45 High | Score 0-125 | — |
| F5 | MDS Section GG Summary | FunctionalStatusAssessment | subscores WHERE instrumentType='MDS_GG' | JSON → self-care + mobility performance summary | Per MDS 3.0 spec | CMS MDS 3.0 RAI Manual |
| F6 | Mobility Status | FunctionalStatusAssessment | mobilityAids | JSON array → formatted list | Recommended | — |
| F7 | Weight-Bearing Status | FunctionalStatusAssessment | weightBearingStatus | Map: FULL/PARTIAL/NON_WEIGHT_BEARING/TOUCH_DOWN | Required if applicable | — |
| F8 | Transfer Assistance Level | FunctionalStatusAssessment | transferAssistance | Map: INDEPENDENT through DEPENDENT (6 levels) | Required | — |
| F9 | Cognitive Status | FunctionalStatusAssessment | cognitiveStatus | Map: INTACT/MILD/MODERATE/SEVERE + baseline qualifier | Required — critical for ED evaluation | — |
| F10 | Assessment Date | FunctionalStatusAssessment | assessedAt | ISO 8601 → MM/DD/YYYY | Must be within 90 days | — |

## Section G: Skin/Wound Assessment [U]

| # | INTERACT Field | Source Model | Source Field(s) | Transformation | Validation | CMS Reference |
|---|---------------|-------------|-----------------|---------------|------------|---------------|
| G1 | Wound Count | WoundAssessment | COUNT(*) for patient | Integer count | Min 0 | — |
| G2 | Wound Location | WoundAssessment | location | Anatomical site description | Non-empty per wound | CMS F686 |
| G3 | Wound Type | WoundAssessment | woundType | Map: PRESSURE_INJURY/SURGICAL/VENOUS/ARTERIAL/DIABETIC/TRAUMA/OTHER | Required per wound | CMS F686 |
| G4 | Pressure Injury Stage | WoundAssessment | stage | Map: STAGE_1 through STAGE_4, UNSTAGEABLE, DTI | Required for pressure injuries | CMS F686 |
| G5 | Dimensions (L x W x D) | WoundAssessment | length, width, depth | Format: "{L} x {W} x {D} cm" | Numeric, ≥0 | CMS F686 |
| G6 | Wound Bed Description | WoundAssessment | woundBed | Map: GRANULATION/SLOUGH/ESCHAR/MIXED/EPITHELIALIZING | Required per wound | CMS F686 |
| G7 | Exudate | WoundAssessment | exudate, exudateAmount | Format: "{type}, {amount}" | Required per wound | CMS F686 |
| G8 | Periwound Condition | WoundAssessment | periWoundSkin | Free text description | Required per wound | CMS F686 |
| G9 | Odor Present | WoundAssessment | odor | Boolean → "Yes"/"No" | Required per wound | CMS F686 |
| G10 | Current Treatment | WoundAssessment | currentTreatment | Free text | Required per wound | CMS F686 |
| G11 | Braden Score | WoundAssessment | bradenScore | Score + risk level: ≤9 Very High, 10-12 High, 13-14 Moderate, 15-18 Mild, ≥19 No Risk | Score 6-23 | CMS F686 |
| G12 | Braden Subscores | WoundAssessment | bradenSubscores | JSON → formatted: sensory, moisture, activity, mobility, nutrition, friction | Each 1-4 (friction 1-3) | CMS F686 |
| G13 | Wound Photo Reference | WoundAssessment | photographIds | JSON → list of image references | Optional but recommended | — |
| G14 | AI Staging Suggestion | WoundAssessment | aiStagingSuggestion | Stage classification from CV model | Flagged as "AI-assisted — requires clinical verification" | — |
| G15 | AI Wound Narrative | WoundAssessment | aiNarrative | CMS-compliant narrative text | Flagged as "AI-generated — requires clinical verification" | — |

## Section H: Isolation Precautions [E+U]

| # | INTERACT Field | Source Model | Source Field(s) | Transformation | Validation | CMS Reference |
|---|---------------|-------------|-----------------|---------------|------------|---------------|
| H1 | Active Isolation | IsolationPrecaution | status WHERE status='ACTIVE' | Boolean: any active precautions | Required | 42 CFR 483.80 |
| H2 | Precaution Type | IsolationPrecaution | precautionType | Map: CONTACT/DROPLET/AIRBORNE/CONTACT_PLUS/ENTERIC/NEUTROPENIC_REVERSE | Required if H1=Yes | 42 CFR 483.80 |
| H3 | Causative Organism | IsolationPrecaution | organism | Direct mapping (e.g., "MRSA", "VRE", "CRE", "C. difficile") | Required if H1=Yes | 42 CFR 483.80 |
| H4 | Organism Code | IsolationPrecaution | organismCode | SNOMED CT or ICD-10-CM code | Recommended | — |
| H5 | Most Recent Culture Date | IsolationPrecaution | cultureDate | ISO 8601 → MM/DD/YYYY | Required if H1=Yes | — |
| H6 | Culture Source | IsolationPrecaution | cultureSource | Map: wound/blood/urine/sputum/stool/nares | Required if H1=Yes | — |
| H7 | Susceptibilities | IsolationPrecaution | susceptibilities | JSON → antibiogram table | Recommended | — |
| H8 | PPE Requirements | IsolationPrecaution | ppeRequirements | JSON → list: gown, gloves, mask, N95, eye protection | Required if H1=Yes | — |
| H9 | Room Requirements | IsolationPrecaution | roomRequirements | Map: PRIVATE/NEGATIVE_PRESSURE/ANTEROOM | Required if H1=Yes | — |
| H10 | Clearance Criteria | IsolationPrecaution | clearanceCriteria | Free text | Recommended | — |

## Section I: Recent Diagnostics [E+U]

| # | INTERACT Field | Source Model | Source Field(s) | Transformation | Validation | CMS Reference |
|---|---------------|-------------|-----------------|---------------|------------|---------------|
| I1 | Lab Results (Last 30 Days) | LabResult | WHERE createdAt > NOW()-30d | Formatted table: test, result, units, reference range, date | Include abnormal flags | — |
| I2 | Critical Lab Values | LabResult | WHERE isCritical=true AND createdAt > NOW()-7d | Highlighted subset of I1 | Flag prominently | — |
| I3 | Imaging Results | ImagingOrder | WHERE status='COMPLETED' AND createdAt > NOW()-30d | Study type, date, key findings | Include pending studies | — |
| I4 | Vital Signs (Last 72 Hours) | VitalSigns | WHERE recordedAt > NOW()-72h | Formatted trending table: BP, HR, RR, Temp, O2 Sat, Weight | Include most recent + trends | — |
| I5 | Most Recent Vitals | VitalSigns | Most recent record | Formatted: BP/HR/RR/Temp/O2/Wt | Required | 42 CFR 483.15(c)(2)(iii) |

## Section J: Hospital-Specific / Transfer Logistics [E+U]

| # | INTERACT Field | Source Model | Source Field(s) | Transformation | Validation | CMS Reference |
|---|---------------|-------------|-----------------|---------------|------------|---------------|
| J1 | Receiving Hospital | Organization | name (via TransferRequest.receivingFacilityId) | Direct mapping | Required | — |
| J2 | Receiving Hospital Phone | Organization | phone (via receivingFacilityId) | Direct mapping | Valid phone | — |
| J3 | Receiving Physician | User | name (via TransferRequest.receivingProviderId) | Direct mapping or "ED physician on duty" | Recommended | — |
| J4 | Estimated Departure Time | TransferRequest | estimatedDeparture | ISO 8601 → MM/DD/YYYY HH:MM | Required | — |
| J5 | Estimated Arrival Time | TransferRequest | estimatedArrival | ISO 8601 → MM/DD/YYYY HH:MM | Required | — |
| J6 | Mode of Transport | TransferRequest | metadata.transportMode | Map: AMBULANCE_BLS/AMBULANCE_ALS/PRIVATE/WHEELCHAIR_VAN | Required | — |
| J7 | PPR Risk Flag | TransferRequest | pprFlagged | Boolean → "PPR RISK: {diagnosis category}" or "Not flagged" | Auto-evaluated | CMS SNF QRP |
| J8 | PPR Diagnosis Match | TransferRequest | pprDiagnosisCodes | JSON → matched PPR categories | Auto-populated if J7=true | CMS SNF QRP |
| J9 | 30-Day Transfer History | TransferRequest | (query: patient transfers in last 30d) | Count + dates + reasons | Auto-populated | CMS SNF QRP |
| J10 | INTERACT Compliance Score | TransferRequest | metadata.interactComplianceScore | Percentage of required fields completed | Auto-calculated | INTERACT 4.0 |
| J11 | Document Transmission Time | TransferRequest | transmittedAt | ISO 8601 → MM/DD/YYYY HH:MM | Auto-populated on transmission | — |
| J12 | Hospital Acknowledgment Time | TransferRequest | hospitalAcknowledgedAt | ISO 8601 → MM/DD/YYYY HH:MM | Auto-populated on receipt | — |

---

## Field Priority by Transfer Mode

### Emergency Mode — Priority Tiers

**Tier 1 (Transmitted immediately, within 2 minutes):**
E1 (Code Status), A1-A2 (Name, DOB), B1-B2 (Urgency, Reason), D1-D4 (Allergies), H1-H3 (Isolation status/type/organism)

**Tier 2 (Transmitted within 5 minutes):**
C1-C2 (Medication list + last admin times), I5 (Most recent vitals), A7-A8 (SNF name/phone), A11 (Attending physician)

**Tier 3 (Transmitted within 10-15 minutes):**
All remaining Section A, B, C, I fields. E2-E10 (full advance directive detail). H4-H10 (full isolation detail). J1-J5 (logistics).

**Deferred (transmitted when available, or in follow-up):**
Section F (Functional Status), Section G (Wounds), C9-C10 (MAR Reconciliation), J7-J10 (PPR/compliance).

### Urgent Mode — All sections required. Completion target: 2-4 hours.

### Planned Mode — All sections required. Completion target: 24-48 hours. Additional multidisciplinary review cycle.

---

## Validation Rules Summary

| Rule Type | Description | Fields Affected |
|-----------|------------|-----------------|
| NON_EMPTY | Field must have a value | A1, A2, A7, A8, B1, B2, E1, I5 |
| ENUM_MATCH | Value must match defined enum | B1, E1, E2, G3, G4, H2 |
| VALID_DATE | Must be valid date, not future | A2, E3, F10, H5 |
| VALID_ICD10 | Must match ICD-10-CM pattern | B3, B4, H4 |
| NUMERIC_RANGE | Must be within instrument range | F1 (0-100), F3 (0-6), F4 (0-125), G11 (6-23) |
| CONDITIONAL_REQUIRED | Required only if parent condition met | H2-H10 (if H1=Yes), G4 (if G3=PRESSURE_INJURY) |
| CROSS_REFERENCE | Must match existing record | A11 (valid User), J1 (valid Organization) |
| FRESHNESS | Assessment must be within time window | F10 (90d), I1 (30d), I4 (72h) |
