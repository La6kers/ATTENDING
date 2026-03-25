// =============================================================================
// ATTENDING AI - Real-Time Medical Interpreter Service
// apps/shared/services/interpreter/MedicalInterpreterService.ts
//
// Real-time translation and cultural health context including:
// - Live translation during visits
// - Medical terminology translation
// - Cultural health beliefs database
// - Diet/lifestyle recommendations by culture
// - Medication name translations
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: 'general' | 'medication' | 'diagnosis' | 'instructions' | 'consent';
  medicalTerminology?: boolean;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  medicalTermsUsed?: MedicalTermTranslation[];
  culturalNotes?: string[];
  alternativePhrasing?: string;
}

export interface MedicalTermTranslation {
  english: string;
  translated: string;
  phoneticPronunciation?: string;
  explanation?: string;
}

export interface CulturalProfile {
  culture: string;
  languages: string[];
  healthBeliefs: HealthBelief[];
  dietaryConsiderations: DietaryConsideration[];
  communicationStyles: CommunicationStyle[];
  familyDynamics: FamilyDynamic[];
  religiousConsiderations: ReligiousConsideration[];
  traditionalMedicines: TraditionalMedicine[];
  commonMisconceptions: string[];
  effectiveCommunicationTips: string[];
}

export interface HealthBelief {
  topic: string;
  belief: string;
  clinicalImplication: string;
  recommendedApproach: string;
}

export interface DietaryConsideration {
  restriction: string;
  reason: 'religious' | 'cultural' | 'health-belief';
  description: string;
  alternatives?: string[];
  medicationImplications?: string[];
}

export interface CommunicationStyle {
  aspect: string;
  description: string;
  recommendation: string;
}

export interface FamilyDynamic {
  aspect: string;
  description: string;
  clinicalConsideration: string;
}

export interface ReligiousConsideration {
  practice: string;
  description: string;
  medicalImplication: string;
  accommodation?: string;
}

export interface TraditionalMedicine {
  name: string;
  nativeName?: string;
  use: string;
  activeIngredients?: string;
  interactions?: string[];
  safetyNotes: string;
}

export interface MedicationTranslation {
  genericName: string;
  brandNames: Record<string, string[]>; // country -> brand names
  translations: Record<string, string>; // language -> translated name
  pronunciationGuide?: Record<string, string>;
  commonMisunderstandings?: string[];
}

export interface InterpreterSession {
  id: string;
  patientLanguage: string;
  providerLanguage: string;
  patientCulture?: string;
  startTime: Date;
  translations: TranslationResult[];
  culturalNotesProvided: string[];
}

// =============================================================================
// Language Support
// =============================================================================

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'zh', name: 'Chinese (Mandarin)', nativeName: '中文' },
  { code: 'zh-yue', name: 'Chinese (Cantonese)', nativeName: '廣東話' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'fa', name: 'Farsi/Persian', nativeName: 'فارسی' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
];

// =============================================================================
// Cultural Health Database
// =============================================================================

const CULTURAL_PROFILES: Record<string, CulturalProfile> = {
  'hispanic-latino': {
    culture: 'Hispanic/Latino',
    languages: ['es', 'en'],
    healthBeliefs: [
      {
        topic: 'Hot/Cold Theory',
        belief: 'Illnesses and foods are classified as "hot" or "cold" and should be balanced',
        clinicalImplication: 'May affect medication adherence if perceived as imbalancing',
        recommendedApproach: 'Ask about hot/cold beliefs; explain how treatment fits within this framework',
      },
      {
        topic: 'Empacho',
        belief: 'Belief that food can become stuck in the intestines causing illness',
        clinicalImplication: 'May seek traditional remedies before medical care for GI complaints',
        recommendedApproach: 'Acknowledge the concept; provide medical explanation alongside',
      },
      {
        topic: 'Susto (Fright)',
        belief: 'Strong emotional shock can cause illness',
        clinicalImplication: 'Anxiety/somatic symptoms may be attributed to past frightening event',
        recommendedApproach: 'Explore psychosocial factors; consider cultural formulation',
      },
      {
        topic: 'Mal de Ojo (Evil Eye)',
        belief: 'Illness can result from envious looks, especially in children',
        clinicalImplication: 'May wear protective amulets; may attribute unexplained illness to this',
        recommendedApproach: 'Respect beliefs; focus on medical treatment while acknowledging concerns',
      },
    ],
    dietaryConsiderations: [
      {
        restriction: 'Fasting before religious holidays',
        reason: 'religious',
        description: 'Catholics may fast during Lent',
        medicationImplications: ['Consider medication timing during fasting periods'],
      },
    ],
    communicationStyles: [
      {
        aspect: 'Personalismo',
        description: 'Value of warm, personal relationships before business matters',
        recommendation: 'Spend time on small talk and relationship building before clinical discussion',
      },
      {
        aspect: 'Respeto',
        description: 'Deep respect for authority figures including physicians',
        recommendation: 'Patients may not question or disagree openly; ask open-ended questions to ensure understanding',
      },
      {
        aspect: 'Simpatía',
        description: 'Preference for harmony and avoiding conflict',
        recommendation: 'Create safe environment for expressing concerns; avoid confrontational approaches',
      },
    ],
    familyDynamics: [
      {
        aspect: 'Familismo',
        description: 'Strong emphasis on family involvement in healthcare decisions',
        clinicalConsideration: 'Include family members in discussions; major decisions often involve family consultation',
      },
      {
        aspect: 'Gender Roles',
        description: 'Traditional roles may influence healthcare decisions',
        clinicalConsideration: 'Be sensitive to gender dynamics; may need to speak with male family members for major decisions',
      },
    ],
    religiousConsiderations: [
      {
        practice: 'Catholicism',
        description: 'Predominant religion; faith plays important role in healing',
        medicalImplication: 'May use prayer, religious medals, or seek priest visits during illness',
        accommodation: 'Support spiritual practices as part of holistic care',
      },
    ],
    traditionalMedicines: [
      {
        name: 'Chamomile Tea (Manzanilla)',
        nativeName: 'Manzanilla',
        use: 'Digestive issues, anxiety, sleep',
        safetyNotes: 'Generally safe; may interact with blood thinners',
      },
      {
        name: 'Yerba Buena',
        use: 'Stomach aches, nausea',
        safetyNotes: 'Generally safe in moderate amounts',
      },
      {
        name: 'Sobadores (Traditional massage)',
        use: 'Muscle pain, empacho',
        safetyNotes: 'May delay medical treatment; assess for underlying conditions',
      },
    ],
    commonMisconceptions: [
      'Diabetes is caused by "susto" (fright) - provide medical explanation',
      'Insulin means diabetes is severe/end-stage - clarify it\'s about glucose control',
      'Antibiotics needed for all illnesses - educate about appropriate use',
    ],
    effectiveCommunicationTips: [
      'Use formal titles (Señor, Señora, Don, Doña) especially with elders',
      'Include family members in health discussions when appropriate',
      'Use simple, clear explanations avoiding medical jargon',
      'Allow time for questions; silence doesn\'t mean understanding',
      'Provide written instructions in Spanish when possible',
    ],
  },
  
  'chinese': {
    culture: 'Chinese',
    languages: ['zh', 'zh-yue', 'en'],
    healthBeliefs: [
      {
        topic: 'Qi (Vital Energy)',
        belief: 'Health depends on balanced flow of qi through the body',
        clinicalImplication: 'May use acupuncture, tai chi, or qigong for health maintenance',
        recommendedApproach: 'Acknowledge qi concept; discuss how treatments can support energy balance',
      },
      {
        topic: 'Yin-Yang Balance',
        belief: 'Health requires balance between opposing forces (yin/yang, hot/cold)',
        clinicalImplication: 'Foods and medicines classified as hot or cold; may affect dietary compliance',
        recommendedApproach: 'Frame treatments in terms of restoring balance',
      },
      {
        topic: 'Holistic View',
        belief: 'Mind, body, and spirit are interconnected',
        clinicalImplication: 'May prefer treatments addressing whole person, not just symptoms',
        recommendedApproach: 'Address emotional and social factors alongside physical treatment',
      },
    ],
    dietaryConsiderations: [
      {
        restriction: 'Cold foods during illness',
        reason: 'health-belief',
        description: 'Avoid cold foods/drinks when sick as they may weaken the body',
        alternatives: ['Offer warm water instead of ice water', 'Warm soup preferred'],
      },
      {
        restriction: 'Postpartum diet (Zuo Yue Zi)',
        reason: 'cultural',
        description: 'Month-long confinement with specific dietary rules after childbirth',
        medicationImplications: ['Mother may refuse certain foods/medications; work within cultural framework'],
      },
    ],
    communicationStyles: [
      {
        aspect: 'Indirect Communication',
        description: 'May not directly express disagreement or lack of understanding',
        recommendation: 'Use teach-back method; ask patient to explain in their own words',
      },
      {
        aspect: 'Respect for Authority',
        description: 'Physicians highly respected; may not question recommendations',
        recommendation: 'Explicitly invite questions; reassure that questions are welcomed',
      },
      {
        aspect: 'Face (Mianzi)',
        description: 'Importance of preserving dignity and avoiding embarrassment',
        recommendation: 'Discuss sensitive topics privately; avoid public correction',
      },
    ],
    familyDynamics: [
      {
        aspect: 'Filial Piety',
        description: 'Adult children expected to care for elderly parents',
        clinicalConsideration: 'Family involvement in elder care decisions is expected and valued',
      },
      {
        aspect: 'Decision Making',
        description: 'Major decisions often made collectively by family',
        clinicalConsideration: 'Include family members; allow time for family consultation',
      },
    ],
    religiousConsiderations: [
      {
        practice: 'Buddhism',
        description: 'May influence end-of-life decisions and dietary choices',
        medicalImplication: 'Vegetarianism common; peaceful death important',
        accommodation: 'Support meditation, visits from Buddhist monks if requested',
      },
    ],
    traditionalMedicines: [
      {
        name: 'Ginseng',
        nativeName: '人参 (Rénshēn)',
        use: 'Energy, immunity, overall health',
        interactions: ['May interact with warfarin, diabetes medications, MAOIs'],
        safetyNotes: 'Ask about use; significant drug interactions possible',
      },
      {
        name: 'Ginkgo Biloba',
        nativeName: '银杏 (Yínxìng)',
        use: 'Memory, circulation',
        interactions: ['Increases bleeding risk with anticoagulants, aspirin'],
        safetyNotes: 'Important to document; bleeding risk',
      },
      {
        name: 'Acupuncture',
        use: 'Pain, various conditions',
        safetyNotes: 'Generally safe when performed by licensed practitioner',
      },
    ],
    commonMisconceptions: [
      'Western medicine is too "strong" or has too many side effects',
      'Herbal remedies are always safe because they are natural',
      'Blood draws weaken the body - explain minimal amounts taken',
    ],
    effectiveCommunicationTips: [
      'Use interpreter for medical discussions even if patient speaks some English',
      'Provide written materials in Chinese (simplified or traditional based on origin)',
      'Allow family involvement in discussions',
      'Ask about traditional medicine use without judgment',
      'Be patient with indirect communication style',
    ],
  },

  'south-asian': {
    culture: 'South Asian (Indian, Pakistani, Bangladeshi)',
    languages: ['hi', 'ur', 'bn', 'pa', 'ta', 'te', 'en'],
    healthBeliefs: [
      {
        topic: 'Ayurveda',
        belief: 'Health depends on balance of three doshas (Vata, Pitta, Kapha)',
        clinicalImplication: 'May use Ayurvedic treatments alongside Western medicine',
        recommendedApproach: 'Ask about Ayurvedic practices; check for interactions',
      },
      {
        topic: 'Karma',
        belief: 'Illness may be seen as result of past actions',
        clinicalImplication: 'May affect attitude toward treatment or prevention',
        recommendedApproach: 'Acknowledge beliefs while emphasizing treatment effectiveness',
      },
      {
        topic: 'Hot/Cold Foods',
        belief: 'Foods classified as heating or cooling; balance needed for health',
        clinicalImplication: 'May affect dietary compliance and medication timing',
        recommendedApproach: 'Work within framework when giving dietary advice',
      },
    ],
    dietaryConsiderations: [
      {
        restriction: 'Vegetarianism',
        reason: 'religious',
        description: 'Many Hindus are vegetarian; some avoid eggs',
        alternatives: ['Plant-based protein sources'],
        medicationImplications: ['Check for gelatin capsules; offer alternatives'],
      },
      {
        restriction: 'Halal (Muslims)',
        reason: 'religious',
        description: 'Pork forbidden; meat must be halal',
        medicationImplications: ['Check for pork-derived ingredients (gelatin, insulin)'],
      },
      {
        restriction: 'Fasting',
        reason: 'religious',
        description: 'Ramadan fasting (Muslims), various Hindu fasts',
        medicationImplications: ['Adjust medication timing during fasting periods'],
      },
    ],
    communicationStyles: [
      {
        aspect: 'Head Wobble',
        description: 'Side-to-side head movement can mean yes, acknowledgment, or understanding',
        recommendation: 'Use verbal confirmation; don\'t rely on head movements alone',
      },
      {
        aspect: 'Respect for Elders/Authority',
        description: 'Physicians highly respected; patients may not question',
        recommendation: 'Explicitly encourage questions; use teach-back method',
      },
    ],
    familyDynamics: [
      {
        aspect: 'Joint Family System',
        description: 'Extended family often lives together; collective decision-making',
        clinicalConsideration: 'Include family in major decisions; respect elder authority',
      },
      {
        aspect: 'Gender Considerations',
        description: 'Some women prefer female providers; modesty important',
        clinicalConsideration: 'Offer same-gender provider when possible; ensure privacy',
      },
    ],
    religiousConsiderations: [
      {
        practice: 'Hinduism',
        description: 'May affect diet, end-of-life decisions, organ donation views',
        medicalImplication: 'Cremation preferred; death at home may be desired',
        accommodation: 'Allow religious rituals; support family presence at end of life',
      },
      {
        practice: 'Islam',
        description: 'Prayer times, fasting, modesty requirements',
        medicalImplication: 'Prayer 5 times daily; Ramadan fasting; modesty in examinations',
        accommodation: 'Allow prayer times; adjust medication for fasting; ensure modesty',
      },
    ],
    traditionalMedicines: [
      {
        name: 'Turmeric (Haldi)',
        nativeName: 'हल्दी',
        use: 'Anti-inflammatory, wound healing, general health',
        interactions: ['May increase bleeding risk with anticoagulants'],
        safetyNotes: 'Common use; generally safe in culinary amounts',
      },
      {
        name: 'Ashwagandha',
        use: 'Stress, energy, immunity',
        interactions: ['May interact with thyroid medications, sedatives'],
        safetyNotes: 'Ask about use; potential interactions',
      },
      {
        name: 'Triphala',
        use: 'Digestive health, detoxification',
        safetyNotes: 'May cause GI effects; check for interactions',
      },
    ],
    commonMisconceptions: [
      'Diabetes is not serious if no symptoms - emphasize silent progression',
      'Insulin is last resort/means failure - explain as glucose management tool',
      'Only need medication when feeling unwell - emphasize preventive treatment',
    ],
    effectiveCommunicationTips: [
      'Use professional interpreter for complex discussions',
      'Include family members as appropriate',
      'Respect modesty concerns during examinations',
      'Ask about traditional remedies without judgment',
      'Be aware of different naming conventions for medications',
    ],
  },

  'middle-eastern': {
    culture: 'Middle Eastern/Arab',
    languages: ['ar', 'fa', 'en'],
    healthBeliefs: [
      {
        topic: 'God\'s Will (Inshallah)',
        belief: 'Health and illness are determined by God\'s will',
        clinicalImplication: 'May affect prevention behaviors and treatment adherence',
        recommendedApproach: 'Frame treatment as working within God\'s plan; emphasize doing one\'s part',
      },
      {
        topic: 'Evil Eye (Ayn)',
        belief: 'Illness can result from envious looks',
        clinicalImplication: 'May wear protective amulets; reluctant to discuss good health',
        recommendedApproach: 'Respect beliefs; focus on medical treatment',
      },
      {
        topic: 'Prophetic Medicine',
        belief: 'Health practices based on Prophet Muhammad\'s teachings',
        clinicalImplication: 'May use honey, black seed, cupping (hijama)',
        recommendedApproach: 'Acknowledge these practices; assess for safety',
      },
    ],
    dietaryConsiderations: [
      {
        restriction: 'Halal',
        reason: 'religious',
        description: 'Pork and alcohol forbidden; meat must be halal',
        medicationImplications: ['Check for alcohol in liquid medications', 'Gelatin capsule alternatives needed'],
      },
      {
        restriction: 'Ramadan Fasting',
        reason: 'religious',
        description: 'No food or drink (including medications) from dawn to sunset',
        medicationImplications: ['Adjust timing to before dawn/after sunset', 'Consider long-acting formulations'],
      },
    ],
    communicationStyles: [
      {
        aspect: 'Hospitality',
        description: 'May offer food/drink; relationship building important',
        recommendation: 'Accept hospitality graciously; spend time on rapport',
      },
      {
        aspect: 'Direct Eye Contact',
        description: 'Prolonged eye contact with opposite gender may be uncomfortable',
        recommendation: 'Moderate eye contact; be aware of gender dynamics',
      },
      {
        aspect: 'Emotional Expression',
        description: 'Pain and distress may be expressed more openly',
        recommendation: 'Take complaints seriously; don\'t dismiss as exaggeration',
      },
    ],
    familyDynamics: [
      {
        aspect: 'Family Decision Making',
        description: 'Major decisions often involve extended family, especially male elders',
        clinicalConsideration: 'Include family; may need to speak with male family members',
      },
      {
        aspect: 'Gender Separation',
        description: 'Some patients prefer same-gender providers',
        clinicalConsideration: 'Offer same-gender provider; ensure chaperone for exams',
      },
    ],
    religiousConsiderations: [
      {
        practice: 'Islam',
        description: 'Prayer, fasting, dietary laws, modesty',
        medicalImplication: 'Prayer times, Ramadan considerations, halal requirements',
        accommodation: 'Provide space for prayer; adjust care during Ramadan',
      },
    ],
    traditionalMedicines: [
      {
        name: 'Black Seed (Nigella sativa)',
        nativeName: 'حبة البركة (Habba Sawda)',
        use: 'General health, immunity, various conditions',
        interactions: ['May affect blood sugar, blood pressure medications'],
        safetyNotes: 'Very commonly used; ask about it specifically',
      },
      {
        name: 'Honey',
        use: 'Healing, immunity, digestive health',
        safetyNotes: 'Generally safe; consider in diabetic patients',
      },
      {
        name: 'Cupping (Hijama)',
        use: 'Pain, detoxification, various conditions',
        safetyNotes: 'May cause bruising; ensure done by trained practitioner',
      },
    ],
    commonMisconceptions: [
      'Illness is punishment from God - emphasize medical understanding',
      'Mental illness is weakness or possession - reduce stigma, explain as medical condition',
      'Chronic medication means never getting better - explain disease management',
    ],
    effectiveCommunicationTips: [
      'Use professional interpreter for medical discussions',
      'Offer same-gender provider when possible',
      'Include family in discussions as appropriate',
      'Be sensitive to Ramadan fasting requirements',
      'Ask about traditional practices respectfully',
    ],
  },
};

// =============================================================================
// Medical Terminology Dictionary
// =============================================================================

const MEDICAL_TERMS: Record<string, Record<string, MedicalTermTranslation>> = {
  es: {
    'diabetes': { english: 'diabetes', translated: 'diabetes', phoneticPronunciation: 'dee-ah-BEH-tehs' },
    'high blood pressure': { english: 'high blood pressure', translated: 'presión arterial alta', phoneticPronunciation: 'preh-SYON ar-teh-RYAL AL-tah' },
    'heart attack': { english: 'heart attack', translated: 'ataque al corazón', phoneticPronunciation: 'ah-TAH-keh al koh-rah-SOHN' },
    'stroke': { english: 'stroke', translated: 'derrame cerebral', phoneticPronunciation: 'deh-RAH-meh seh-reh-BRAL' },
    'cancer': { english: 'cancer', translated: 'cáncer', phoneticPronunciation: 'KAHN-sehr' },
    'pain': { english: 'pain', translated: 'dolor', phoneticPronunciation: 'doh-LOR' },
    'fever': { english: 'fever', translated: 'fiebre', phoneticPronunciation: 'fee-EH-breh' },
    'cough': { english: 'cough', translated: 'tos', phoneticPronunciation: 'tohs' },
    'shortness of breath': { english: 'shortness of breath', translated: 'falta de aire', phoneticPronunciation: 'FAHL-tah deh AH-ee-reh' },
    'nausea': { english: 'nausea', translated: 'náusea', phoneticPronunciation: 'NOW-seh-ah' },
    'dizziness': { english: 'dizziness', translated: 'mareo', phoneticPronunciation: 'mah-REH-oh' },
    'headache': { english: 'headache', translated: 'dolor de cabeza', phoneticPronunciation: 'doh-LOR deh kah-BEH-sah' },
    'medication': { english: 'medication', translated: 'medicamento', phoneticPronunciation: 'meh-dee-kah-MEN-toh' },
    'prescription': { english: 'prescription', translated: 'receta', phoneticPronunciation: 'reh-SEH-tah' },
    'allergy': { english: 'allergy', translated: 'alergia', phoneticPronunciation: 'ah-LEHR-hee-ah' },
    'blood test': { english: 'blood test', translated: 'análisis de sangre', phoneticPronunciation: 'ah-NAH-lee-sees deh SAHN-greh' },
  },
  zh: {
    'diabetes': { english: 'diabetes', translated: '糖尿病', phoneticPronunciation: 'táng niào bìng' },
    'high blood pressure': { english: 'high blood pressure', translated: '高血压', phoneticPronunciation: 'gāo xuè yā' },
    'heart attack': { english: 'heart attack', translated: '心脏病发作', phoneticPronunciation: 'xīn zàng bìng fā zuò' },
    'stroke': { english: 'stroke', translated: '中风', phoneticPronunciation: 'zhòng fēng' },
    'cancer': { english: 'cancer', translated: '癌症', phoneticPronunciation: 'ái zhèng' },
    'pain': { english: 'pain', translated: '疼痛', phoneticPronunciation: 'téng tòng' },
    'fever': { english: 'fever', translated: '发烧', phoneticPronunciation: 'fā shāo' },
  },
};

// =============================================================================
// Medical Interpreter Service Class
// =============================================================================

export class MedicalInterpreterService extends EventEmitter {
  private sessions: Map<string, InterpreterSession> = new Map();
  private culturalProfiles: Record<string, CulturalProfile> = CULTURAL_PROFILES;

  constructor() {
    super();
  }

  // ===========================================================================
  // Session Management
  // ===========================================================================

  startSession(
    patientLanguage: string,
    providerLanguage: string = 'en',
    patientCulture?: string
  ): InterpreterSession {
    const session: InterpreterSession = {
      id: `interp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientLanguage,
      providerLanguage,
      patientCulture,
      startTime: new Date(),
      translations: [],
      culturalNotesProvided: [],
    };

    this.sessions.set(session.id, session);
    this.emit('sessionStarted', session);

    // Provide initial cultural notes if culture specified
    if (patientCulture && this.culturalProfiles[patientCulture]) {
      const profile = this.culturalProfiles[patientCulture];
      session.culturalNotesProvided.push(
        ...profile.effectiveCommunicationTips.slice(0, 3)
      );
    }

    return session;
  }

  endSession(sessionId: string): InterpreterSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.emit('sessionEnded', session);
    }
    return session;
  }

  // ===========================================================================
  // Translation
  // ===========================================================================

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const { text, sourceLanguage, targetLanguage, context, medicalTerminology } = request;

    // In production, this would call a translation API (Google, DeepL, Azure)
    // For now, we'll demonstrate the structure with placeholders

    let translatedText = text; // Placeholder
    const medicalTermsUsed: MedicalTermTranslation[] = [];
    const culturalNotes: string[] = [];

    // Check for medical terms that need special handling
    if (medicalTerminology !== false) {
      const terms = MEDICAL_TERMS[targetLanguage];
      if (terms) {
        for (const [englishTerm, translation] of Object.entries(terms)) {
          if (text.toLowerCase().includes(englishTerm)) {
            medicalTermsUsed.push(translation);
          }
        }
      }
    }

    // Add context-specific notes
    if (context === 'medication') {
      culturalNotes.push('Verify patient understands dosing instructions by asking them to repeat back');
    } else if (context === 'consent') {
      culturalNotes.push('Ensure patient has time to ask questions and involve family if desired');
    }

    const result: TranslationResult = {
      originalText: text,
      translatedText,
      sourceLanguage,
      targetLanguage,
      confidence: 0.95, // Would come from translation API
      medicalTermsUsed: medicalTermsUsed.length > 0 ? medicalTermsUsed : undefined,
      culturalNotes: culturalNotes.length > 0 ? culturalNotes : undefined,
    };

    this.emit('translation', result);
    return result;
  }

  // ===========================================================================
  // Real-time Translation (for live conversations)
  // ===========================================================================

  async translateLive(
    sessionId: string,
    text: string,
    direction: 'toPatient' | 'toProvider'
  ): Promise<TranslationResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const sourceLanguage = direction === 'toPatient' ? session.providerLanguage : session.patientLanguage;
    const targetLanguage = direction === 'toPatient' ? session.patientLanguage : session.providerLanguage;

    const result = await this.translate({
      text,
      sourceLanguage,
      targetLanguage,
      medicalTerminology: true,
    });

    session.translations.push(result);
    return result;
  }

  // ===========================================================================
  // Cultural Context
  // ===========================================================================

  getCulturalProfile(culture: string): CulturalProfile | undefined {
    return this.culturalProfiles[culture];
  }

  getCulturalNotes(culture: string, topic?: string): string[] {
    const profile = this.culturalProfiles[culture];
    if (!profile) return [];

    const notes: string[] = [];

    // General communication tips
    notes.push(...profile.effectiveCommunicationTips);

    // Topic-specific notes
    if (topic) {
      const lowerTopic = topic.toLowerCase();
      
      for (const belief of profile.healthBeliefs) {
        if (belief.topic.toLowerCase().includes(lowerTopic)) {
          notes.push(`${belief.topic}: ${belief.recommendedApproach}`);
        }
      }

      for (const dietary of profile.dietaryConsiderations) {
        if (dietary.restriction.toLowerCase().includes(lowerTopic) ||
            lowerTopic.includes('diet') || lowerTopic.includes('food')) {
          notes.push(`Dietary: ${dietary.restriction} - ${dietary.description}`);
        }
      }
    }

    return notes;
  }

  getTraditionalMedicines(culture: string): TraditionalMedicine[] {
    const profile = this.culturalProfiles[culture];
    return profile?.traditionalMedicines || [];
  }

  getDietaryConsiderations(culture: string): DietaryConsideration[] {
    const profile = this.culturalProfiles[culture];
    return profile?.dietaryConsiderations || [];
  }

  // ===========================================================================
  // Medication Translation
  // ===========================================================================

  getMedicationNames(genericName: string, targetLanguage: string): string[] {
    // In production, this would query a comprehensive drug database
    // For now, return placeholder
    return [genericName];
  }

  // ===========================================================================
  // Language Support
  // ===========================================================================

  getSupportedLanguages(): typeof SUPPORTED_LANGUAGES {
    return SUPPORTED_LANGUAGES;
  }

  getLanguageByCode(code: string): typeof SUPPORTED_LANGUAGES[0] | undefined {
    return SUPPORTED_LANGUAGES.find(l => l.code === code);
  }

  // ===========================================================================
  // Quick Phrases (Common medical phrases)
  // ===========================================================================

  getQuickPhrases(targetLanguage: string): { english: string; translated: string; category: string }[] {
    // Would be populated from a database of common medical phrases
    const phrases = [
      { english: 'How are you feeling today?', category: 'greeting' },
      { english: 'Where does it hurt?', category: 'assessment' },
      { english: 'On a scale of 1 to 10, how bad is the pain?', category: 'assessment' },
      { english: 'Are you allergic to any medications?', category: 'history' },
      { english: 'What medications are you currently taking?', category: 'history' },
      { english: 'Take this medication twice a day with food', category: 'instructions' },
      { english: 'Please come back if symptoms worsen', category: 'instructions' },
      { english: 'Do you have any questions?', category: 'closing' },
    ];

    return phrases.map(p => ({
      ...p,
      translated: p.english, // In production, would be actual translations
    }));
  }
}

// Singleton instance
export const medicalInterpreterService = new MedicalInterpreterService();
export default medicalInterpreterService;
