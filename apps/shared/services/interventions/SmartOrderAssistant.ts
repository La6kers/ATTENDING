// =============================================================================
// ATTENDING AI - Smart Order Assistant
// apps/shared/services/interventions/SmartOrderAssistant.ts
//
// Natural language order entry with AI-powered suggestions, safety checks,
// and context-aware recommendations. This transforms ordering from a
// multi-click process to a conversational experience.
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type OrderType = 'lab' | 'imaging' | 'medication' | 'referral' | 'procedure' | 'therapy' | 'diet' | 'activity' | 'nursing';

export interface SmartOrder {
  id: string;
  type: OrderType;
  name: string;
  code?: string;
  codeSystem?: string;
  
  // Order details
  instructions?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  refills?: number;
  priority: 'routine' | 'urgent' | 'stat' | 'asap';
  
  // Medication specific
  dose?: string;
  route?: string;
  prn?: boolean;
  prnReason?: string;
  
  // Lab/Imaging specific
  diagnosis?: string;
  clinicalIndication?: string;
  
  // Referral specific
  specialty?: string;
  urgency?: string;
  reasonForReferral?: string;
  
  // Safety
  alerts: OrderAlert[];
  requiresOverride: boolean;
  
  // Billing
  icd10Codes?: string[];
  estimatedCost?: number;
  insuranceCoverage?: 'covered' | 'partial' | 'not_covered' | 'unknown';
  priorAuthRequired?: boolean;
  
  // Metadata
  confidence: number;
  suggestedBy: 'ai' | 'protocol' | 'guideline' | 'user';
  evidence?: string;
}

export interface OrderAlert {
  severity: 'info' | 'warning' | 'critical';
  type: 'interaction' | 'allergy' | 'duplicate' | 'contraindication' | 'dose' | 'renal' | 'hepatic' | 'age' | 'pregnancy';
  message: string;
  details?: string;
  overridable: boolean;
  requiresReason: boolean;
}

export interface OrderSuggestion {
  order: SmartOrder;
  reason: string;
  relevantCondition?: string;
  guidelineSource?: string;
  alternativeOrders?: SmartOrder[];
}

export interface OrderSet {
  id: string;
  name: string;
  description: string;
  diagnoses: string[];
  orders: SmartOrder[];
  isCustomizable: boolean;
  source: 'evidence' | 'institution' | 'personal';
}

export interface PatientOrderContext {
  patientId: string;
  age: number;
  weight?: number;
  gender: 'male' | 'female' | 'other';
  diagnoses: Array<{ code: string; name: string }>;
  medications: Array<{ name: string; dose?: string; status: string }>;
  allergies: Array<{ allergen: string; reaction?: string; severity?: string }>;
  labs: Array<{ name: string; value: number | string; date: Date }>;
  renalFunction?: { creatinine: number; egfr: number };
  hepaticFunction?: { ast?: number; alt?: number; bilirubin?: number };
  isPregnant?: boolean;
  insurancePlan?: string;
}

// =============================================================================
// ORDER TEMPLATES DATABASE
// =============================================================================

const LAB_ORDERS: Partial<SmartOrder>[] = [
  { name: 'Complete Blood Count (CBC)', code: '58410-2', codeSystem: 'LOINC', type: 'lab' },
  { name: 'Basic Metabolic Panel (BMP)', code: '24320-4', codeSystem: 'LOINC', type: 'lab' },
  { name: 'Comprehensive Metabolic Panel (CMP)', code: '24323-8', codeSystem: 'LOINC', type: 'lab' },
  { name: 'Lipid Panel', code: '24331-1', codeSystem: 'LOINC', type: 'lab' },
  { name: 'Hemoglobin A1c', code: '4548-4', codeSystem: 'LOINC', type: 'lab' },
  { name: 'Thyroid Stimulating Hormone (TSH)', code: '3016-3', codeSystem: 'LOINC', type: 'lab' },
  { name: 'Urinalysis', code: '24356-8', codeSystem: 'LOINC', type: 'lab' },
  { name: 'Prothrombin Time (PT/INR)', code: '5902-2', codeSystem: 'LOINC', type: 'lab' },
  { name: 'Troponin I', code: '10839-9', codeSystem: 'LOINC', type: 'lab' },
  { name: 'BNP', code: '30934-4', codeSystem: 'LOINC', type: 'lab' },
  { name: 'D-Dimer', code: '48066-5', codeSystem: 'LOINC', type: 'lab' },
  { name: 'Lactate', code: '2524-7', codeSystem: 'LOINC', type: 'lab' },
  { name: 'Procalcitonin', code: '75241-0', codeSystem: 'LOINC', type: 'lab' },
  { name: 'C-Reactive Protein (CRP)', code: '1988-5', codeSystem: 'LOINC', type: 'lab' },
  { name: 'Ferritin', code: '2276-4', codeSystem: 'LOINC', type: 'lab' },
  { name: 'Vitamin D, 25-Hydroxy', code: '1989-3', codeSystem: 'LOINC', type: 'lab' },
  { name: 'Magnesium', code: '2601-3', codeSystem: 'LOINC', type: 'lab' },
  { name: 'Uric Acid', code: '3084-1', codeSystem: 'LOINC', type: 'lab' },
  { name: 'Hepatic Function Panel', code: '24325-3', codeSystem: 'LOINC', type: 'lab' },
];

const IMAGING_ORDERS: Partial<SmartOrder>[] = [
  { name: 'Chest X-Ray (PA/Lateral)', code: '71046', codeSystem: 'CPT', type: 'imaging' },
  { name: 'CT Head without Contrast', code: '70450', codeSystem: 'CPT', type: 'imaging' },
  { name: 'CT Chest with Contrast', code: '71260', codeSystem: 'CPT', type: 'imaging' },
  { name: 'CT Abdomen/Pelvis with Contrast', code: '74177', codeSystem: 'CPT', type: 'imaging' },
  { name: 'MRI Brain without Contrast', code: '70551', codeSystem: 'CPT', type: 'imaging' },
  { name: 'MRI Lumbar Spine without Contrast', code: '72148', codeSystem: 'CPT', type: 'imaging' },
  { name: 'Ultrasound Abdomen Complete', code: '76700', codeSystem: 'CPT', type: 'imaging' },
  { name: 'Echocardiogram (TTE)', code: '93306', codeSystem: 'CPT', type: 'imaging' },
  { name: 'Doppler Ultrasound Lower Extremity', code: '93970', codeSystem: 'CPT', type: 'imaging' },
  { name: 'CT Angiography Chest (PE Protocol)', code: '71275', codeSystem: 'CPT', type: 'imaging' },
  { name: 'DEXA Bone Density', code: '77080', codeSystem: 'CPT', type: 'imaging' },
  { name: 'Mammogram Screening', code: '77067', codeSystem: 'CPT', type: 'imaging' },
];

const COMMON_MEDICATIONS: Partial<SmartOrder>[] = [
  { name: 'Lisinopril', code: '29046', codeSystem: 'RXNORM', type: 'medication', dose: '10mg', frequency: 'Daily' },
  { name: 'Metformin', code: '6809', codeSystem: 'RXNORM', type: 'medication', dose: '500mg', frequency: 'BID' },
  { name: 'Atorvastatin', code: '83367', codeSystem: 'RXNORM', type: 'medication', dose: '40mg', frequency: 'Daily' },
  { name: 'Amlodipine', code: '17767', codeSystem: 'RXNORM', type: 'medication', dose: '5mg', frequency: 'Daily' },
  { name: 'Metoprolol Succinate', code: '866924', codeSystem: 'RXNORM', type: 'medication', dose: '25mg', frequency: 'Daily' },
  { name: 'Omeprazole', code: '7646', codeSystem: 'RXNORM', type: 'medication', dose: '20mg', frequency: 'Daily' },
  { name: 'Gabapentin', code: '25480', codeSystem: 'RXNORM', type: 'medication', dose: '300mg', frequency: 'TID' },
  { name: 'Prednisone', code: '8640', codeSystem: 'RXNORM', type: 'medication', dose: '10mg', frequency: 'Daily' },
  { name: 'Azithromycin', code: '18631', codeSystem: 'RXNORM', type: 'medication', dose: '250mg', frequency: 'Daily' },
  { name: 'Amoxicillin', code: '723', codeSystem: 'RXNORM', type: 'medication', dose: '500mg', frequency: 'TID' },
];

// =============================================================================
// CONDITION-BASED ORDER SETS
// =============================================================================

const ORDER_SETS: OrderSet[] = [
  {
    id: 'chest_pain_workup',
    name: 'Chest Pain Workup',
    description: 'Standard workup for acute chest pain',
    diagnoses: ['R07.9', 'I20.9', 'I21'],
    isCustomizable: true,
    source: 'evidence',
    orders: [
      { id: 'cp1', type: 'lab', name: 'Troponin I', code: '10839-9', priority: 'stat', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'cp2', type: 'lab', name: 'BNP', code: '30934-4', priority: 'stat', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'cp3', type: 'lab', name: 'Basic Metabolic Panel', code: '24320-4', priority: 'stat', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'cp4', type: 'lab', name: 'CBC', code: '58410-2', priority: 'stat', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'cp5', type: 'imaging', name: 'Chest X-Ray', code: '71046', priority: 'stat', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'cp6', type: 'imaging', name: 'ECG 12-Lead', code: '93000', priority: 'stat', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
    ],
  },
  {
    id: 'dm_annual',
    name: 'Diabetes Annual Assessment',
    description: 'Annual monitoring for diabetes mellitus',
    diagnoses: ['E11', 'E10'],
    isCustomizable: true,
    source: 'evidence',
    orders: [
      { id: 'dm1', type: 'lab', name: 'Hemoglobin A1c', code: '4548-4', priority: 'routine', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'dm2', type: 'lab', name: 'Lipid Panel', code: '24331-1', priority: 'routine', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'dm3', type: 'lab', name: 'Comprehensive Metabolic Panel', code: '24323-8', priority: 'routine', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'dm4', type: 'lab', name: 'Urine Albumin/Creatinine Ratio', code: '14959-1', priority: 'routine', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'dm5', type: 'referral', name: 'Ophthalmology Referral', specialty: 'Ophthalmology', reasonForReferral: 'Diabetic eye exam', priority: 'routine', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'dm6', type: 'referral', name: 'Podiatry Referral', specialty: 'Podiatry', reasonForReferral: 'Diabetic foot exam', priority: 'routine', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
    ],
  },
  {
    id: 'sepsis_bundle',
    name: 'Sepsis Bundle (SEP-1)',
    description: 'CMS SEP-1 compliant sepsis bundle',
    diagnoses: ['A41', 'R65.20', 'R65.21'],
    isCustomizable: false,
    source: 'evidence',
    orders: [
      { id: 'sep1', type: 'lab', name: 'Lactate', code: '2524-7', priority: 'stat', instructions: 'Draw within 3 hours', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'sep2', type: 'lab', name: 'Blood Cultures x2', code: '600-7', priority: 'stat', instructions: 'Draw before antibiotics', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'sep3', type: 'lab', name: 'Procalcitonin', code: '75241-0', priority: 'stat', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'sep4', type: 'medication', name: 'Normal Saline', dose: '30 mL/kg', route: 'IV', priority: 'stat', instructions: 'Fluid resuscitation - infuse within 3 hours', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'sep5', type: 'medication', name: 'Broad Spectrum Antibiotics', priority: 'stat', instructions: 'Administer within 1 hour - see antimicrobial stewardship', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
    ],
  },
  {
    id: 'dvt_pe_workup',
    name: 'DVT/PE Workup',
    description: 'Venous thromboembolism evaluation',
    diagnoses: ['I26', 'I82'],
    isCustomizable: true,
    source: 'evidence',
    orders: [
      { id: 'vte1', type: 'lab', name: 'D-Dimer', code: '48066-5', priority: 'stat', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'vte2', type: 'lab', name: 'CBC', code: '58410-2', priority: 'stat', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'vte3', type: 'lab', name: 'PT/INR', code: '5902-2', priority: 'stat', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'vte4', type: 'lab', name: 'BMP', code: '24320-4', priority: 'stat', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
      { id: 'vte5', type: 'imaging', name: 'CT Angiography Chest', code: '71275', priority: 'stat', clinicalIndication: 'Rule out pulmonary embolism', alerts: [], requiresOverride: false, confidence: 1, suggestedBy: 'guideline' },
    ],
  },
];

// =============================================================================
// DRUG INTERACTION DATABASE
// =============================================================================

interface DrugInteraction {
  drug1: string[];
  drug2: string[];
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  effect: string;
  management: string;
}

const DRUG_INTERACTIONS: DrugInteraction[] = [
  {
    drug1: ['warfarin', 'coumadin'],
    drug2: ['aspirin', 'ibuprofen', 'naproxen', 'nsaid'],
    severity: 'major',
    effect: 'Increased bleeding risk',
    management: 'Avoid combination if possible. If necessary, add PPI and monitor closely.',
  },
  {
    drug1: ['metformin'],
    drug2: ['contrast', 'iodinated'],
    severity: 'major',
    effect: 'Risk of lactic acidosis',
    management: 'Hold metformin for 48 hours after contrast administration. Check renal function before restarting.',
  },
  {
    drug1: ['lisinopril', 'enalapril', 'ramipril', 'ace inhibitor'],
    drug2: ['potassium', 'spironolactone', 'k-dur'],
    severity: 'moderate',
    effect: 'Hyperkalemia risk',
    management: 'Monitor potassium closely. Consider reducing potassium supplementation.',
  },
  {
    drug1: ['simvastatin', 'lovastatin'],
    drug2: ['amiodarone'],
    severity: 'major',
    effect: 'Increased risk of myopathy/rhabdomyolysis',
    management: 'Limit simvastatin to 20mg daily or switch to atorvastatin/rosuvastatin.',
  },
  {
    drug1: ['methotrexate'],
    drug2: ['trimethoprim', 'bactrim', 'sulfamethoxazole'],
    severity: 'contraindicated',
    effect: 'Severe bone marrow suppression',
    management: 'Do not use together. Choose alternative antibiotic.',
  },
  {
    drug1: ['ssri', 'sertraline', 'fluoxetine', 'paroxetine', 'citalopram', 'escitalopram'],
    drug2: ['tramadol', 'fentanyl', 'triptans'],
    severity: 'major',
    effect: 'Serotonin syndrome risk',
    management: 'Use with caution. Monitor for symptoms of serotonin syndrome.',
  },
  {
    drug1: ['digoxin'],
    drug2: ['amiodarone', 'verapamil', 'quinidine'],
    severity: 'major',
    effect: 'Increased digoxin levels and toxicity',
    management: 'Reduce digoxin dose by 50% and monitor levels closely.',
  },
  {
    drug1: ['fluoroquinolone', 'ciprofloxacin', 'levofloxacin'],
    drug2: ['theophylline'],
    severity: 'major',
    effect: 'Increased theophylline levels and toxicity',
    management: 'Reduce theophylline dose and monitor levels.',
  },
  {
    drug1: ['clopidogrel', 'plavix'],
    drug2: ['omeprazole', 'esomeprazole'],
    severity: 'moderate',
    effect: 'Reduced clopidogrel effectiveness',
    management: 'Use pantoprazole instead if PPI needed.',
  },
  {
    drug1: ['lithium'],
    drug2: ['nsaid', 'ibuprofen', 'naproxen', 'ace inhibitor', 'lisinopril'],
    severity: 'major',
    effect: 'Increased lithium levels and toxicity',
    management: 'Monitor lithium levels closely. May need dose reduction.',
  },
];

// =============================================================================
// SMART ORDER ASSISTANT SERVICE
// =============================================================================

export class SmartOrderAssistant extends EventEmitter {
  
  constructor() {
    super();
  }

  // =========================================================================
  // NATURAL LANGUAGE ORDER PROCESSING
  // =========================================================================

  async processNaturalLanguageOrder(
    input: string,
    context: PatientOrderContext
  ): Promise<OrderSuggestion[]> {
    const suggestions: OrderSuggestion[] = [];
    const normalizedInput = input.toLowerCase();

    // Parse intent and entities from natural language
    const parsedOrder = this.parseOrderIntent(normalizedInput);
    
    // Match to order templates
    const matchedOrders = this.matchOrderTemplates(parsedOrder, context);
    
    // Run safety checks
    for (const order of matchedOrders) {
      const safetyChecks = await this.runSafetyChecks(order, context);
      order.alerts = safetyChecks;
      order.requiresOverride = safetyChecks.some(a => a.severity === 'critical' && a.overridable);
      
      // Estimate cost and coverage
      const billing = this.estimateBilling(order, context.insurancePlan);
      order.estimatedCost = billing.estimatedCost;
      order.insuranceCoverage = billing.coverage;
      order.priorAuthRequired = billing.priorAuthRequired;
      
      suggestions.push({
        order,
        reason: `Based on your request: "${input}"`,
        guidelineSource: order.evidence,
      });
    }

    // Add context-aware suggestions
    const additionalSuggestions = this.getContextAwareSuggestions(parsedOrder, context);
    suggestions.push(...additionalSuggestions);

    this.emit('ordersParsed', { input, suggestions });
    return suggestions;
  }

  private parseOrderIntent(input: string): { type: OrderType; keywords: string[]; modifiers: any } {
    const labKeywords = ['lab', 'blood', 'test', 'panel', 'check', 'level', 'draw'];
    const imagingKeywords = ['xray', 'x-ray', 'ct', 'mri', 'ultrasound', 'scan', 'imaging', 'echo'];
    const medKeywords = ['prescribe', 'start', 'order', 'give', 'mg', 'medication', 'drug', 'rx'];
    const referralKeywords = ['refer', 'referral', 'consult', 'specialist', 'see'];

    let type: OrderType = 'lab';
    if (imagingKeywords.some(k => input.includes(k))) type = 'imaging';
    else if (medKeywords.some(k => input.includes(k))) type = 'medication';
    else if (referralKeywords.some(k => input.includes(k))) type = 'referral';

    const modifiers: any = {};
    if (input.includes('stat') || input.includes('urgent') || input.includes('now')) {
      modifiers.priority = 'stat';
    }
    if (input.includes('fasting')) modifiers.fasting = true;

    return { type, keywords: input.split(/\s+/), modifiers };
  }

  private matchOrderTemplates(
    parsed: { type: OrderType; keywords: string[]; modifiers: any },
    context: PatientOrderContext
  ): SmartOrder[] {
    const templates = parsed.type === 'lab' ? LAB_ORDERS :
                      parsed.type === 'imaging' ? IMAGING_ORDERS :
                      parsed.type === 'medication' ? COMMON_MEDICATIONS : [];

    const matches: SmartOrder[] = [];
    
    for (const template of templates) {
      const nameWords = template.name!.toLowerCase().split(/\s+/);
      const matchScore = parsed.keywords.filter(k => 
        nameWords.some(nw => nw.includes(k) || k.includes(nw))
      ).length;

      if (matchScore > 0) {
        matches.push({
          id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...template,
          type: parsed.type,
          priority: parsed.modifiers.priority || 'routine',
          alerts: [],
          requiresOverride: false,
          confidence: Math.min(matchScore / parsed.keywords.length, 1),
          suggestedBy: 'ai',
        } as SmartOrder);
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  // =========================================================================
  // SAFETY CHECKS
  // =========================================================================

  async runSafetyChecks(order: SmartOrder, context: PatientOrderContext): Promise<OrderAlert[]> {
    const alerts: OrderAlert[] = [];

    // Allergy check
    if (order.type === 'medication') {
      const allergyAlert = this.checkAllergies(order, context.allergies);
      if (allergyAlert) alerts.push(allergyAlert);
    }

    // Drug interactions
    if (order.type === 'medication') {
      const interactions = this.checkDrugInteractions(order, context.medications);
      alerts.push(...interactions);
    }

    // Duplicate order check
    const duplicateAlert = this.checkDuplicates(order, context);
    if (duplicateAlert) alerts.push(duplicateAlert);

    // Renal dosing
    if (order.type === 'medication' && context.renalFunction) {
      const renalAlert = this.checkRenalDosing(order, context.renalFunction);
      if (renalAlert) alerts.push(renalAlert);
    }

    // Hepatic considerations
    if (order.type === 'medication' && context.hepaticFunction) {
      const hepaticAlert = this.checkHepaticConsiderations(order, context.hepaticFunction);
      if (hepaticAlert) alerts.push(hepaticAlert);
    }

    // Age-based alerts
    const ageAlert = this.checkAgeConsiderations(order, context.age);
    if (ageAlert) alerts.push(ageAlert);

    // Pregnancy check
    if (context.isPregnant) {
      const pregAlert = this.checkPregnancyContraindications(order);
      if (pregAlert) alerts.push(pregAlert);
    }

    // Contrast + Metformin
    if (order.type === 'imaging' && order.name?.toLowerCase().includes('contrast')) {
      const metforminAlert = this.checkContrastMetformin(context.medications);
      if (metforminAlert) alerts.push(metforminAlert);
    }

    return alerts;
  }

  private checkAllergies(order: SmartOrder, allergies: PatientOrderContext['allergies']): OrderAlert | null {
    const orderName = order.name?.toLowerCase() || '';
    
    for (const allergy of allergies) {
      const allergen = allergy.allergen.toLowerCase();
      
      // Direct match
      if (orderName.includes(allergen)) {
        return {
          severity: allergy.severity === 'severe' ? 'critical' : 'warning',
          type: 'allergy',
          message: `Patient has documented ${allergy.severity || ''} allergy to ${allergy.allergen}`,
          details: allergy.reaction ? `Previous reaction: ${allergy.reaction}` : undefined,
          overridable: allergy.severity !== 'severe',
          requiresReason: true,
        };
      }

      // Cross-reactivity (simplified)
      if (allergen.includes('penicillin') && 
          ['amoxicillin', 'ampicillin', 'cephalosporin'].some(d => orderName.includes(d))) {
        return {
          severity: 'warning',
          type: 'allergy',
          message: `Patient has penicillin allergy - potential cross-reactivity with ${order.name}`,
          details: 'Cross-reactivity between penicillins and cephalosporins is ~1-2%',
          overridable: true,
          requiresReason: true,
        };
      }
    }

    return null;
  }

  private checkDrugInteractions(
    order: SmartOrder, 
    currentMeds: PatientOrderContext['medications']
  ): OrderAlert[] {
    const alerts: OrderAlert[] = [];
    const orderName = order.name?.toLowerCase() || '';

    for (const interaction of DRUG_INTERACTIONS) {
      const isOrderDrug1 = interaction.drug1.some(d => orderName.includes(d));
      const isOrderDrug2 = interaction.drug2.some(d => orderName.includes(d));

      for (const med of currentMeds.filter(m => m.status === 'active')) {
        const medName = med.name.toLowerCase();
        const isMedDrug1 = interaction.drug1.some(d => medName.includes(d));
        const isMedDrug2 = interaction.drug2.some(d => medName.includes(d));

        if ((isOrderDrug1 && isMedDrug2) || (isOrderDrug2 && isMedDrug1)) {
          alerts.push({
            severity: interaction.severity === 'contraindicated' ? 'critical' : 
                      interaction.severity === 'major' ? 'critical' : 'warning',
            type: 'interaction',
            message: `Drug interaction: ${order.name} + ${med.name}`,
            details: `${interaction.effect}. ${interaction.management}`,
            overridable: interaction.severity !== 'contraindicated',
            requiresReason: interaction.severity === 'major' || interaction.severity === 'contraindicated',
          });
        }
      }
    }

    return alerts;
  }

  private checkDuplicates(order: SmartOrder, context: PatientOrderContext): OrderAlert | null {
    // Check for duplicate medications
    if (order.type === 'medication') {
      const duplicate = context.medications.find(m => 
        m.status === 'active' && 
        m.name.toLowerCase().includes(order.name?.toLowerCase() || '')
      );

      if (duplicate) {
        return {
          severity: 'warning',
          type: 'duplicate',
          message: `Patient is already on ${duplicate.name} ${duplicate.dose || ''}`,
          details: 'Consider adjusting current prescription instead of new order',
          overridable: true,
          requiresReason: false,
        };
      }
    }

    // Check for recent duplicate labs
    if (order.type === 'lab') {
      const recentLab = context.labs.find(l => {
        const daysSince = (Date.now() - new Date(l.date).getTime()) / (1000 * 60 * 60 * 24);
        return l.name.toLowerCase().includes(order.name?.toLowerCase() || '') && daysSince < 1;
      });

      if (recentLab) {
        return {
          severity: 'info',
          type: 'duplicate',
          message: `${order.name} was ordered recently`,
          details: `Last result: ${recentLab.value} on ${new Date(recentLab.date).toLocaleDateString()}`,
          overridable: true,
          requiresReason: false,
        };
      }
    }

    return null;
  }

  private checkRenalDosing(
    order: SmartOrder, 
    renal: NonNullable<PatientOrderContext['renalFunction']>
  ): OrderAlert | null {
    const renalAdjustMeds = [
      { name: 'metformin', threshold: 30, message: 'Contraindicated if eGFR < 30' },
      { name: 'gabapentin', threshold: 60, message: 'Reduce dose if eGFR < 60' },
      { name: 'enoxaparin', threshold: 30, message: 'Reduce dose if eGFR < 30' },
      { name: 'dabigatran', threshold: 30, message: 'Contraindicated if CrCl < 30' },
    ];

    const orderName = order.name?.toLowerCase() || '';
    const adjustment = renalAdjustMeds.find(m => orderName.includes(m.name));

    if (adjustment && renal.egfr < adjustment.threshold) {
      return {
        severity: renal.egfr < 15 ? 'critical' : 'warning',
        type: 'renal',
        message: `Renal dose adjustment needed: eGFR ${renal.egfr}`,
        details: adjustment.message,
        overridable: renal.egfr >= 15,
        requiresReason: true,
      };
    }

    return null;
  }

  private checkHepaticConsiderations(
    order: SmartOrder,
    hepatic: NonNullable<PatientOrderContext['hepaticFunction']>
  ): OrderAlert | null {
    const hepaticConcerns = ['acetaminophen', 'tylenol', 'statin', 'methotrexate'];
    const orderName = order.name?.toLowerCase() || '';

    if (hepaticConcerns.some(h => orderName.includes(h))) {
      if ((hepatic.alt && hepatic.alt > 120) || (hepatic.ast && hepatic.ast > 120)) {
        return {
          severity: 'warning',
          type: 'hepatic',
          message: 'Elevated liver enzymes - use caution with hepatotoxic medications',
          details: `AST: ${hepatic.ast || 'N/A'}, ALT: ${hepatic.alt || 'N/A'}`,
          overridable: true,
          requiresReason: true,
        };
      }
    }

    return null;
  }

  private checkAgeConsiderations(order: SmartOrder, age: number): OrderAlert | null {
    const orderName = order.name?.toLowerCase() || '';

    // Beers Criteria for elderly
    if (age >= 65) {
      const beersCriteria = [
        { drug: 'diphenhydramine', reason: 'Highly anticholinergic - increased confusion, falls' },
        { drug: 'benzodiazepine', reason: 'Increased fall risk and cognitive impairment' },
        { drug: 'nsaid', reason: 'GI bleeding and renal risk increased in elderly' },
        { drug: 'muscle relaxant', reason: 'Anticholinergic effects, sedation' },
      ];

      const beersMatch = beersCriteria.find(b => orderName.includes(b.drug));
      if (beersMatch) {
        return {
          severity: 'warning',
          type: 'age',
          message: `Beers Criteria Alert: ${beersMatch.drug} in patient age ${age}`,
          details: beersMatch.reason,
          overridable: true,
          requiresReason: true,
        };
      }
    }

    return null;
  }

  private checkPregnancyContraindications(order: SmartOrder): OrderAlert | null {
    const categoryX = ['warfarin', 'methotrexate', 'isotretinoin', 'statins', 'ace inhibitor', 'arb'];
    const orderName = order.name?.toLowerCase() || '';

    if (categoryX.some(d => orderName.includes(d))) {
      return {
        severity: 'critical',
        type: 'pregnancy',
        message: 'Contraindicated in pregnancy',
        details: 'This medication is known to cause fetal harm',
        overridable: false,
        requiresReason: true,
      };
    }

    return null;
  }

  private checkContrastMetformin(medications: PatientOrderContext['medications']): OrderAlert | null {
    const onMetformin = medications.some(m => 
      m.name.toLowerCase().includes('metformin') && m.status === 'active'
    );

    if (onMetformin) {
      return {
        severity: 'warning',
        type: 'interaction',
        message: 'Patient on Metformin - hold for contrast study',
        details: 'Hold metformin for 48 hours after contrast. Check renal function before restarting.',
        overridable: true,
        requiresReason: false,
      };
    }

    return null;
  }

  // =========================================================================
  // CONTEXT-AWARE SUGGESTIONS
  // =========================================================================

  getContextAwareSuggestions(
    parsed: { type: OrderType; keywords: string[]; modifiers: any },
    context: PatientOrderContext
  ): OrderSuggestion[] {
    const suggestions: OrderSuggestion[] = [];

    // Suggest relevant order sets based on diagnoses
    for (const orderSet of ORDER_SETS) {
      const matchingDx = context.diagnoses.find(d => 
        orderSet.diagnoses.some(osd => d.code.startsWith(osd.replace('.', '')))
      );

      if (matchingDx) {
        for (const order of orderSet.orders) {
          suggestions.push({
            order: { ...order, id: `${order.id}_${Date.now()}` },
            reason: `Recommended for ${matchingDx.name}`,
            relevantCondition: matchingDx.name,
            guidelineSource: `${orderSet.name} protocol`,
          });
        }
      }
    }

    return suggestions.slice(0, 10);
  }

  // =========================================================================
  // ORDER SETS
  // =========================================================================

  getOrderSetsForDiagnosis(diagnosisCode: string): OrderSet[] {
    return ORDER_SETS.filter(os => 
      os.diagnoses.some(d => diagnosisCode.startsWith(d.replace('.', '')))
    );
  }

  getOrderSet(orderSetId: string): OrderSet | undefined {
    return ORDER_SETS.find(os => os.id === orderSetId);
  }

  // =========================================================================
  // BILLING ESTIMATION
  // =========================================================================

  private estimateBilling(
    order: SmartOrder, 
    insurancePlan?: string
  ): { estimatedCost: number; coverage: SmartOrder['insuranceCoverage']; priorAuthRequired: boolean } {
    // Simplified cost estimation
    const baseCosts: Record<OrderType, number> = {
      lab: 50,
      imaging: 500,
      medication: 100,
      referral: 200,
      procedure: 1000,
      therapy: 150,
      diet: 0,
      activity: 0,
      nursing: 0,
    };

    let estimatedCost = baseCosts[order.type] || 100;
    
    // Adjust for specific orders
    if (order.name?.toLowerCase().includes('mri')) estimatedCost = 1500;
    if (order.name?.toLowerCase().includes('ct')) estimatedCost = 800;
    if (order.name?.toLowerCase().includes('echo')) estimatedCost = 600;

    // Prior auth typically needed for imaging and specialty meds
    const priorAuthRequired = 
      (order.type === 'imaging' && ['mri', 'ct', 'pet'].some(i => order.name?.toLowerCase().includes(i))) ||
      (order.type === 'medication' && estimatedCost > 500);

    return {
      estimatedCost,
      coverage: insurancePlan ? 'covered' : 'unknown',
      priorAuthRequired,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const smartOrderAssistant = new SmartOrderAssistant();
