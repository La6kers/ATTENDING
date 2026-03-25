// ============================================================
// ATTENDING AI - Population-Aware Chart Display Seed Data
// prisma/seeds/population-seed.ts
//
// Seeds VitalSignReference, ChartDisplayRule, and ScreeningProtocol
// tables with clinically accurate reference data.
//
// Run: npx ts-node prisma/seeds/population-seed.ts
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding population-aware chart display data...\n');

  // ============================================================
  // 1. VITAL SIGN REFERENCE RANGES (Age-Stratified)
  // ============================================================
  console.log('--- Vital Sign Reference Ranges ---');

  const vitalRanges = [
    // Heart Rate - Newborn (0-1 month)
    { vitalType: 'HEART_RATE', ageMinMonths: 0, ageMaxMonths: 1, normalMin: 100, normalMax: 160, criticalMin: 60, criticalMax: 220, unit: 'bpm', source: 'AAP/AHA Pediatric Guidelines' },
    // Heart Rate - Infant (1-12 months)
    { vitalType: 'HEART_RATE', ageMinMonths: 1, ageMaxMonths: 12, normalMin: 100, normalMax: 150, criticalMin: 60, criticalMax: 200, unit: 'bpm', source: 'AAP/AHA Pediatric Guidelines' },
    // Heart Rate - Toddler (1-3 years)
    { vitalType: 'HEART_RATE', ageMinMonths: 12, ageMaxMonths: 36, normalMin: 90, normalMax: 140, criticalMin: 50, criticalMax: 190, unit: 'bpm', source: 'AAP/AHA Pediatric Guidelines' },
    // Heart Rate - Child (3-6 years)
    { vitalType: 'HEART_RATE', ageMinMonths: 36, ageMaxMonths: 72, normalMin: 80, normalMax: 120, criticalMin: 45, criticalMax: 180, unit: 'bpm', source: 'AAP/AHA Pediatric Guidelines' },
    // Heart Rate - Child (6-12 years)
    { vitalType: 'HEART_RATE', ageMinMonths: 72, ageMaxMonths: 144, normalMin: 70, normalMax: 110, criticalMin: 40, criticalMax: 170, unit: 'bpm', source: 'AAP/AHA Pediatric Guidelines' },
    // Heart Rate - Adolescent (12-18 years)
    { vitalType: 'HEART_RATE', ageMinMonths: 144, ageMaxMonths: 216, normalMin: 60, normalMax: 100, criticalMin: 40, criticalMax: 150, unit: 'bpm', source: 'AAP/AHA Pediatric Guidelines' },
    // Heart Rate - Adult (18-65 years)
    { vitalType: 'HEART_RATE', ageMinMonths: 216, ageMaxMonths: 780, normalMin: 60, normalMax: 100, criticalMin: 40, criticalMax: 150, unit: 'bpm', source: 'AHA Adult Guidelines' },
    // Heart Rate - Geriatric (65+ years)
    { vitalType: 'HEART_RATE', ageMinMonths: 780, ageMaxMonths: 1440, normalMin: 55, normalMax: 100, criticalMin: 35, criticalMax: 150, unit: 'bpm', source: 'AGS Geriatric Guidelines' },

    // Respiratory Rate - Newborn
    { vitalType: 'RESPIRATORY_RATE', ageMinMonths: 0, ageMaxMonths: 1, normalMin: 30, normalMax: 60, criticalMin: 15, criticalMax: 80, unit: 'breaths/min', source: 'AAP Neonatal Guidelines' },
    // Respiratory Rate - Infant
    { vitalType: 'RESPIRATORY_RATE', ageMinMonths: 1, ageMaxMonths: 12, normalMin: 25, normalMax: 50, criticalMin: 12, criticalMax: 70, unit: 'breaths/min', source: 'AAP Pediatric Guidelines' },
    // Respiratory Rate - Toddler
    { vitalType: 'RESPIRATORY_RATE', ageMinMonths: 12, ageMaxMonths: 36, normalMin: 20, normalMax: 40, criticalMin: 10, criticalMax: 60, unit: 'breaths/min', source: 'AAP Pediatric Guidelines' },
    // Respiratory Rate - Child
    { vitalType: 'RESPIRATORY_RATE', ageMinMonths: 36, ageMaxMonths: 144, normalMin: 18, normalMax: 30, criticalMin: 8, criticalMax: 50, unit: 'breaths/min', source: 'AAP Pediatric Guidelines' },
    // Respiratory Rate - Adolescent/Adult
    { vitalType: 'RESPIRATORY_RATE', ageMinMonths: 144, ageMaxMonths: 780, normalMin: 12, normalMax: 20, criticalMin: 6, criticalMax: 40, unit: 'breaths/min', source: 'AHA Adult Guidelines' },
    // Respiratory Rate - Geriatric
    { vitalType: 'RESPIRATORY_RATE', ageMinMonths: 780, ageMaxMonths: 1440, normalMin: 12, normalMax: 22, criticalMin: 6, criticalMax: 40, unit: 'breaths/min', source: 'AGS Geriatric Guidelines' },

    // Systolic BP - Child (3-6)
    { vitalType: 'SYSTOLIC_BP', ageMinMonths: 36, ageMaxMonths: 72, normalMin: 80, normalMax: 110, criticalMin: 60, criticalMax: 130, unit: 'mmHg', source: 'AAP Clinical Practice Guideline 2017' },
    // Systolic BP - Child (6-12)
    { vitalType: 'SYSTOLIC_BP', ageMinMonths: 72, ageMaxMonths: 144, normalMin: 85, normalMax: 120, criticalMin: 65, criticalMax: 140, unit: 'mmHg', source: 'AAP Clinical Practice Guideline 2017' },
    // Systolic BP - Adolescent
    { vitalType: 'SYSTOLIC_BP', ageMinMonths: 144, ageMaxMonths: 216, normalMin: 90, normalMax: 130, criticalMin: 70, criticalMax: 150, unit: 'mmHg', source: 'AAP Clinical Practice Guideline 2017' },
    // Systolic BP - Adult
    { vitalType: 'SYSTOLIC_BP', ageMinMonths: 216, ageMaxMonths: 780, normalMin: 90, normalMax: 130, criticalMin: 70, criticalMax: 180, unit: 'mmHg', source: 'AHA/ACC 2017 Hypertension Guidelines' },
    // Systolic BP - Geriatric (relaxed upper threshold per AGS)
    { vitalType: 'SYSTOLIC_BP', ageMinMonths: 780, ageMaxMonths: 1440, normalMin: 90, normalMax: 140, criticalMin: 70, criticalMax: 190, unit: 'mmHg', source: 'AGS 2019 - Relaxed targets for frail elderly' },

    // Temperature - All ages (same ranges, different concern thresholds for peds)
    { vitalType: 'TEMPERATURE', ageMinMonths: 0, ageMaxMonths: 3, normalMin: 36.5, normalMax: 37.5, criticalMin: 35.0, criticalMax: 38.0, unit: 'C', source: 'AAP - Fever in young infants requires workup >38.0C' },
    { vitalType: 'TEMPERATURE', ageMinMonths: 3, ageMaxMonths: 216, normalMin: 36.1, normalMax: 37.8, criticalMin: 34.0, criticalMax: 40.5, unit: 'C', source: 'Standard Pediatric/Adult Reference' },
    { vitalType: 'TEMPERATURE', ageMinMonths: 216, ageMaxMonths: 1440, normalMin: 36.1, normalMax: 37.8, criticalMin: 34.0, criticalMax: 40.5, unit: 'C', source: 'Standard Adult Reference' },

    // SpO2 - All ages
    { vitalType: 'SPO2', ageMinMonths: 0, ageMaxMonths: 1440, normalMin: 95, normalMax: 100, criticalMin: 88, criticalMax: 100, unit: '%', source: 'WHO/AHA Pulse Oximetry Guidelines' },

    // Weight percentile ranges (pediatric only, kg)
    { vitalType: 'WEIGHT', ageMinMonths: 0, ageMaxMonths: 1, normalMin: 2.5, normalMax: 4.5, criticalMin: 1.5, criticalMax: 5.5, unit: 'kg', source: 'WHO Growth Standards' },
    { vitalType: 'WEIGHT', ageMinMonths: 12, ageMaxMonths: 24, normalMin: 8.0, normalMax: 14.0, criticalMin: 6.0, criticalMax: 17.0, unit: 'kg', source: 'WHO Growth Standards' },
  ];

  for (const range of vitalRanges) {
    await prisma.vitalSignReference.upsert({
      where: {
        vitalType_ageMinMonths_ageMaxMonths: {
          vitalType: range.vitalType,
          ageMinMonths: range.ageMinMonths,
          ageMaxMonths: range.ageMaxMonths,
        },
      },
      update: range,
      create: range,
    });
  }
  console.log(`  Seeded ${vitalRanges.length} vital sign reference ranges`);

  // ============================================================
  // 2. CHART DISPLAY RULES
  // ============================================================
  console.log('\n--- Chart Display Rules ---');

  const displayRules = [
    // PEDIATRIC rules
    { populationFlag: 'PEDIATRIC', section: 'VITALS', action: 'PROMOTE', priority: 10, config: JSON.stringify({ promote: ['weight', 'height', 'headCircumference', 'growthPercentiles'], label: 'Growth Tracking' }) },
    { populationFlag: 'PEDIATRIC', section: 'SCREENING', action: 'SHOW', priority: 10, config: JSON.stringify({ show: ['developmentalMilestones', 'immunizationSchedule', 'visionHearing'], label: 'Pediatric Screening' }) },
    { populationFlag: 'PEDIATRIC', section: 'MEDICATIONS', action: 'WARN', priority: 10, config: JSON.stringify({ warn: 'Weight-based dosing required. Verify mg/kg calculation.', highlight: true }) },
    { populationFlag: 'PEDIATRIC', section: 'HISTORY', action: 'SHOW', priority: 10, config: JSON.stringify({ show: ['birthHistory', 'feedingHistory', 'parentConcerns'], label: 'Pediatric History' }) },
    { populationFlag: 'PEDIATRIC', section: 'SOCIAL', action: 'REPLACE', priority: 10, config: JSON.stringify({ replaceWith: 'pediatricSocial', fields: ['schoolPerformance', 'behavioralConcerns', 'homeEnvironment', 'careSetting'] }) },
    { populationFlag: 'PEDIATRIC', section: 'LABS', action: 'BADGE', priority: 10, config: JSON.stringify({ badge: 'Pediatric ranges applied', color: 'blue' }) },

    // GERIATRIC rules
    { populationFlag: 'GERIATRIC', section: 'MEDICATIONS', action: 'WARN', priority: 10, config: JSON.stringify({ warn: 'Beers Criteria screening active. Check for potentially inappropriate medications.', highlight: true }) },
    { populationFlag: 'GERIATRIC', section: 'SCREENING', action: 'SHOW', priority: 10, config: JSON.stringify({ show: ['fallRiskAssessment', 'cognitiveScreen', 'functionalStatus', 'advanceDirectives', 'polypharmacyReview'], label: 'Geriatric Assessment' }) },
    { populationFlag: 'GERIATRIC', section: 'VITALS', action: 'PROMOTE', priority: 10, config: JSON.stringify({ promote: ['orthostatics', 'gaitSpeed', 'gripStrength'], label: 'Functional Vitals' }) },
    { populationFlag: 'GERIATRIC', section: 'SOCIAL', action: 'PROMOTE', priority: 10, config: JSON.stringify({ promote: ['livingSituation', 'caregiverStatus', 'mobilityAids', 'homeModifications'], label: 'Social Supports' }) },
    { populationFlag: 'GERIATRIC', section: 'LABS', action: 'BADGE', priority: 10, config: JSON.stringify({ badge: 'Age-adjusted ranges applied', color: 'amber' }) },

    // TRANSGENDER rules
    { populationFlag: 'TRANSGENDER', section: 'DEMOGRAPHICS', action: 'SHOW', priority: 20, config: JSON.stringify({ show: ['chosenName', 'pronouns', 'genderIdentity', 'sexAssignedAtBirth'], label: 'Identity' }) },
    { populationFlag: 'TRANSGENDER', section: 'SCREENING', action: 'REPLACE', priority: 20, config: JSON.stringify({ replaceWith: 'organInventoryScreening', note: 'Screen by organ inventory, not assumed gender' }) },
    { populationFlag: 'TRANSGENDER', section: 'MEDICATIONS', action: 'SHOW', priority: 20, config: JSON.stringify({ show: ['hormoneTherapy', 'labMonitoring'], label: 'Gender-Affirming Care' }) },
    { populationFlag: 'TRANSGENDER', section: 'LABS', action: 'WARN', priority: 20, config: JSON.stringify({ warn: 'Lab reference ranges may need adjustment based on hormone therapy duration. Review sex-specific ranges manually.', highlight: true }) },

    // PREGNANT rules
    { populationFlag: 'PREGNANT', section: 'VITALS', action: 'PROMOTE', priority: 30, config: JSON.stringify({ promote: ['bloodPressure', 'weight', 'fetalHeartRate', 'fundalHeight'], label: 'Obstetric Vitals' }) },
    { populationFlag: 'PREGNANT', section: 'MEDICATIONS', action: 'WARN', priority: 30, config: JSON.stringify({ warn: 'FDA Pregnancy Category screening active. Verify all medications are pregnancy-safe.', highlight: true, color: 'red' }) },
    { populationFlag: 'PREGNANT', section: 'LABS', action: 'SHOW', priority: 30, config: JSON.stringify({ show: ['prenatalPanel', 'glucoseChallenge', 'groupBStrep', 'rubella'], label: 'Prenatal Labs' }) },
    { populationFlag: 'PREGNANT', section: 'SCREENING', action: 'SHOW', priority: 30, config: JSON.stringify({ show: ['depressionScreening', 'substanceUse', 'domesticViolence', 'nutritionCounseling'], label: 'Prenatal Screening' }) },
    { populationFlag: 'PREGNANT', section: 'IMAGING', action: 'WARN', priority: 30, config: JSON.stringify({ warn: 'Minimize radiation exposure. Use ultrasound or MRI when possible.', highlight: true, color: 'red' }) },

    // CHRONIC_PAIN rules
    { populationFlag: 'CHRONIC_PAIN', section: 'MEDICATIONS', action: 'WARN', priority: 10, config: JSON.stringify({ warn: 'Controlled substance monitoring active. Check PDMP before prescribing opioids.', highlight: true }) },
    { populationFlag: 'CHRONIC_PAIN', section: 'SCREENING', action: 'SHOW', priority: 10, config: JSON.stringify({ show: ['painFunctionalAssessment', 'opioidRiskTool', 'depressionScreen', 'substanceUseScreen'], label: 'Pain Management Screening' }) },

    // IMMUNOCOMPROMISED rules
    { populationFlag: 'IMMUNOCOMPROMISED', section: 'LABS', action: 'PROMOTE', priority: 20, config: JSON.stringify({ promote: ['cbc', 'absoluteNeutrophilCount', 'immunoglobulins', 'cd4Count'], label: 'Immune Monitoring' }) },
    { populationFlag: 'IMMUNOCOMPROMISED', section: 'SCREENING', action: 'SHOW', priority: 20, config: JSON.stringify({ show: ['infectionSurveillance', 'vaccineEligibility', 'prophylaxisMedications'], label: 'Infection Prevention' }) },
  ];

  for (const rule of displayRules) {
    await prisma.chartDisplayRule.create({ data: rule });
  }
  console.log(`  Seeded ${displayRules.length} chart display rules`);

  // ============================================================
  // 3. SCREENING PROTOCOLS
  // ============================================================
  console.log('\n--- Screening Protocols ---');

  const screeningProtocols = [
    // Pediatric screenings
    { name: 'Developmental Milestones (ASQ-3)', screeningCode: 'ASQ3', organRequired: null, ageMinMonths: 1, ageMaxMonths: 66, frequency: 'every 6 months', populationFlags: JSON.stringify(['PEDIATRIC']), evidenceSource: 'AAP Bright Futures' },
    { name: 'Autism Screening (M-CHAT-R)', screeningCode: 'MCHATR', organRequired: null, ageMinMonths: 16, ageMaxMonths: 30, frequency: 'once at 18 and 24 months', populationFlags: JSON.stringify(['PEDIATRIC']), evidenceSource: 'AAP/CDC' },
    { name: 'Lead Screening', screeningCode: 'LEAD', organRequired: null, ageMinMonths: 12, ageMaxMonths: 24, frequency: 'annually', populationFlags: JSON.stringify(['PEDIATRIC']), evidenceSource: 'AAP/CDC' },
    { name: 'Vision Screening', screeningCode: 'VISION_PED', organRequired: null, ageMinMonths: 36, ageMaxMonths: 72, frequency: 'annually', populationFlags: JSON.stringify(['PEDIATRIC']), evidenceSource: 'AAP/USPSTF' },
    { name: 'Depression Screening (PHQ-A)', screeningCode: 'PHQA', organRequired: null, ageMinMonths: 144, ageMaxMonths: 216, frequency: 'annually', populationFlags: JSON.stringify(['PEDIATRIC']), evidenceSource: 'USPSTF 2022' },

    // Geriatric screenings
    { name: 'Fall Risk Assessment (Timed Up & Go)', screeningCode: 'TUG', organRequired: null, ageMinMonths: 780, ageMaxMonths: 1440, frequency: 'annually', populationFlags: JSON.stringify(['GERIATRIC']), evidenceSource: 'AGS/BGS Clinical Practice Guideline' },
    { name: 'Cognitive Screen (Mini-Cog)', screeningCode: 'MINICOG', organRequired: null, ageMinMonths: 780, ageMaxMonths: 1440, frequency: 'annually', populationFlags: JSON.stringify(['GERIATRIC']), evidenceSource: 'USPSTF/Alzheimer\'s Association' },
    { name: 'Functional Status (Katz ADL)', screeningCode: 'KATZ_ADL', organRequired: null, ageMinMonths: 780, ageMaxMonths: 1440, frequency: 'annually', populationFlags: JSON.stringify(['GERIATRIC']), evidenceSource: 'AGS Comprehensive Geriatric Assessment' },
    { name: 'Polypharmacy Review', screeningCode: 'BEERS', organRequired: null, ageMinMonths: 780, ageMaxMonths: 1440, frequency: 'every 6 months', populationFlags: JSON.stringify(['GERIATRIC']), evidenceSource: 'AGS Beers Criteria 2023' },
    { name: 'Depression Screening (GDS-15)', screeningCode: 'GDS15', organRequired: null, ageMinMonths: 780, ageMaxMonths: 1440, frequency: 'annually', populationFlags: JSON.stringify(['GERIATRIC']), evidenceSource: 'USPSTF' },
    { name: 'Advance Directive Review', screeningCode: 'ADV_DIR', organRequired: null, ageMinMonths: 780, ageMaxMonths: 1440, frequency: 'annually', populationFlags: JSON.stringify(['GERIATRIC']), evidenceSource: 'ACP/AGS' },

    // Organ-based screenings (transgender patients - screen by organ inventory)
    { name: 'Cervical Cancer Screening (Pap/HPV)', screeningCode: 'PAP_HPV', organRequired: 'CERVIX', ageMinMonths: 252, ageMaxMonths: 780, frequency: 'every 3 years', populationFlags: null, evidenceSource: 'USPSTF 2018 / ACS 2020' },
    { name: 'Prostate Cancer Screening (PSA)', screeningCode: 'PSA', organRequired: 'PROSTATE', ageMinMonths: 600, ageMaxMonths: 840, frequency: 'annually (shared decision)', populationFlags: null, evidenceSource: 'USPSTF 2018 - Shared decision' },
    { name: 'Breast Cancer Screening (Mammogram)', screeningCode: 'MAMMO', organRequired: 'BREAST', ageMinMonths: 480, ageMaxMonths: 900, frequency: 'every 2 years', populationFlags: null, evidenceSource: 'USPSTF 2024' },

    // Prenatal screenings
    { name: 'Gestational Diabetes Screen (GCT)', screeningCode: 'GCT', organRequired: null, ageMinMonths: 216, ageMaxMonths: 600, frequency: 'once at 24-28 weeks gestation', populationFlags: JSON.stringify(['PREGNANT']), evidenceSource: 'ACOG Practice Bulletin' },
    { name: 'Group B Strep Screen', screeningCode: 'GBS', organRequired: null, ageMinMonths: 216, ageMaxMonths: 600, frequency: 'once at 36-37 weeks gestation', populationFlags: JSON.stringify(['PREGNANT']), evidenceSource: 'ACOG/CDC' },
    { name: 'Prenatal Depression Screen (EPDS)', screeningCode: 'EPDS', organRequired: null, ageMinMonths: 216, ageMaxMonths: 600, frequency: 'every trimester', populationFlags: JSON.stringify(['PREGNANT']), evidenceSource: 'USPSTF/ACOG' },

    // General adult screenings
    { name: 'Depression Screening (PHQ-9)', screeningCode: 'PHQ9', organRequired: null, ageMinMonths: 216, ageMaxMonths: 780, frequency: 'annually', populationFlags: null, evidenceSource: 'USPSTF 2016' },
    { name: 'Colorectal Cancer Screening', screeningCode: 'CRC', organRequired: 'COLON', ageMinMonths: 540, ageMaxMonths: 900, frequency: 'every 10 years (colonoscopy)', populationFlags: null, evidenceSource: 'USPSTF 2021' },
    { name: 'Lung Cancer Screening (LDCT)', screeningCode: 'LDCT', organRequired: 'LUNG', ageMinMonths: 600, ageMaxMonths: 960, frequency: 'annually', populationFlags: null, evidenceSource: 'USPSTF 2021 - 20 pack-year history' },
  ];

  for (const protocol of screeningProtocols) {
    await prisma.screeningProtocol.create({ data: protocol });
  }
  console.log(`  Seeded ${screeningProtocols.length} screening protocols`);

  console.log('\nPopulation-aware seed data complete!');
  console.log(`  Total: ${vitalRanges.length} vital ranges, ${displayRules.length} display rules, ${screeningProtocols.length} screening protocols`);
}

main()
  .catch((e) => {
    console.error('Population seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
