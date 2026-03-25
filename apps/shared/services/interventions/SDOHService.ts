// =============================================================================
// ATTENDING AI - Social Determinants of Health (SDOH) Service
// apps/shared/services/interventions/SDOHService.ts
//
// Screens for social determinants, identifies risk factors, and connects
// patients with community resources. Addresses the 80% of health outcomes
// determined by factors outside the healthcare system.
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type SDOHDomain = 
  | 'food_insecurity'
  | 'housing_instability'
  | 'transportation'
  | 'financial_strain'
  | 'social_isolation'
  | 'education'
  | 'employment'
  | 'safety'
  | 'health_literacy'
  | 'childcare'
  | 'legal_needs'
  | 'utilities';

export type RiskLevel = 'none' | 'low' | 'moderate' | 'high' | 'critical';

export interface SDOHScreening {
  id: string;
  patientId: string;
  screeningDate: Date;
  screenedBy: string;
  tool: 'AHC-HRSN' | 'PRAPARE' | 'WellRx' | 'Custom';
  
  // Results by domain
  domainResults: SDOHDomainResult[];
  
  // Overall
  overallRisk: RiskLevel;
  priorityDomains: SDOHDomain[];
  
  // Follow-up
  referralsGenerated: ResourceReferral[];
  followUpDate?: Date;
  notes?: string;
}

export interface SDOHDomainResult {
  domain: SDOHDomain;
  risk: RiskLevel;
  score?: number;
  responses: ScreeningResponse[];
  flaggedConcerns: string[];
  recommendedResources: CommunityResource[];
}

export interface ScreeningResponse {
  questionId: string;
  question: string;
  answer: string | number | boolean;
  concernFlag: boolean;
}

export interface CommunityResource {
  id: string;
  name: string;
  organization: string;
  domain: SDOHDomain;
  
  // Description
  description: string;
  services: string[];
  
  // Eligibility
  eligibilityCriteria?: string[];
  incomeLimit?: string;
  ageRequirements?: string;
  
  // Contact
  phone?: string;
  website?: string;
  email?: string;
  
  // Location
  address?: string;
  city: string;
  state: string;
  zipCode?: string;
  serviceArea?: string[];
  
  // Availability
  hours?: string;
  appointmentRequired: boolean;
  walkInAvailable: boolean;
  
  // Languages
  languages: string[];
  
  // Costs
  cost: 'free' | 'sliding_scale' | 'insurance' | 'paid';
  
  // Verified
  lastVerified: Date;
  active: boolean;
}

export interface ResourceReferral {
  id: string;
  patientId: string;
  resourceId: string;
  resource: CommunityResource;
  domain: SDOHDomain;
  
  // Status
  status: 'generated' | 'given_to_patient' | 'patient_contacted' | 'enrolled' | 'declined' | 'unable_to_reach';
  
  // Tracking
  createdAt: Date;
  updatedAt: Date;
  followUpDate?: Date;
  notes?: string;
  
  // Outcome
  outcome?: 'need_met' | 'partial' | 'unmet' | 'unknown';
}

// =============================================================================
// SCREENING QUESTIONS (AHC-HRSN BASED)
// =============================================================================

interface ScreeningQuestion {
  id: string;
  domain: SDOHDomain;
  question: string;
  type: 'yes_no' | 'frequency' | 'scale' | 'multiple_choice';
  options?: string[];
  concernThreshold: any;
  weight: number;
}

const SCREENING_QUESTIONS: ScreeningQuestion[] = [
  // Food Insecurity (Hunger Vital Sign)
  {
    id: 'food_1',
    domain: 'food_insecurity',
    question: 'Within the past 12 months, you worried that your food would run out before you got money to buy more.',
    type: 'frequency',
    options: ['Never true', 'Sometimes true', 'Often true'],
    concernThreshold: ['Sometimes true', 'Often true'],
    weight: 1,
  },
  {
    id: 'food_2',
    domain: 'food_insecurity',
    question: 'Within the past 12 months, the food you bought just didn\'t last and you didn\'t have money to get more.',
    type: 'frequency',
    options: ['Never true', 'Sometimes true', 'Often true'],
    concernThreshold: ['Sometimes true', 'Often true'],
    weight: 1,
  },

  // Housing
  {
    id: 'housing_1',
    domain: 'housing_instability',
    question: 'What is your living situation today?',
    type: 'multiple_choice',
    options: [
      'I have a steady place to live',
      'I have a place to live today, but I am worried about losing it in the future',
      'I do not have a steady place to live (staying with others, in a hotel, shelter, living outside, etc.)',
    ],
    concernThreshold: [1, 2], // Index of concerning options
    weight: 2,
  },
  {
    id: 'housing_2',
    domain: 'housing_instability',
    question: 'Think about the place you live. Do you have problems with any of the following?',
    type: 'multiple_choice',
    options: ['Pests', 'Mold', 'Lead paint or pipes', 'Lack of heat', 'Oven or stove not working', 'Smoke detectors', 'Water leaks', 'None'],
    concernThreshold: [0, 1, 2, 3, 4, 5, 6],
    weight: 1,
  },

  // Transportation
  {
    id: 'transport_1',
    domain: 'transportation',
    question: 'In the past 12 months, has lack of reliable transportation kept you from medical appointments, meetings, work or from getting things needed for daily living?',
    type: 'yes_no',
    concernThreshold: true,
    weight: 1.5,
  },

  // Utilities
  {
    id: 'utilities_1',
    domain: 'utilities',
    question: 'In the past 12 months has the electric, gas, oil, or water company threatened to shut off services in your home?',
    type: 'yes_no',
    concernThreshold: true,
    weight: 1.5,
  },

  // Safety
  {
    id: 'safety_1',
    domain: 'safety',
    question: 'How often does anyone, including family and friends, physically hurt you?',
    type: 'frequency',
    options: ['Never', 'Rarely', 'Sometimes', 'Fairly often', 'Frequently'],
    concernThreshold: ['Rarely', 'Sometimes', 'Fairly often', 'Frequently'],
    weight: 3,
  },
  {
    id: 'safety_2',
    domain: 'safety',
    question: 'How often does anyone, including family and friends, insult or talk down to you?',
    type: 'frequency',
    options: ['Never', 'Rarely', 'Sometimes', 'Fairly often', 'Frequently'],
    concernThreshold: ['Sometimes', 'Fairly often', 'Frequently'],
    weight: 1.5,
  },
  {
    id: 'safety_3',
    domain: 'safety',
    question: 'How often does anyone, including family and friends, threaten you with harm?',
    type: 'frequency',
    options: ['Never', 'Rarely', 'Sometimes', 'Fairly often', 'Frequently'],
    concernThreshold: ['Rarely', 'Sometimes', 'Fairly often', 'Frequently'],
    weight: 3,
  },
  {
    id: 'safety_4',
    domain: 'safety',
    question: 'How often does anyone, including family and friends, scream or curse at you?',
    type: 'frequency',
    options: ['Never', 'Rarely', 'Sometimes', 'Fairly often', 'Frequently'],
    concernThreshold: ['Sometimes', 'Fairly often', 'Frequently'],
    weight: 1,
  },

  // Financial Strain
  {
    id: 'financial_1',
    domain: 'financial_strain',
    question: 'How hard is it for you to pay for the very basics like food, housing, medical care, and heating?',
    type: 'scale',
    options: ['Not hard at all', 'Somewhat hard', 'Hard', 'Very hard'],
    concernThreshold: [2, 3], // Hard or Very hard
    weight: 1.5,
  },

  // Social Isolation
  {
    id: 'social_1',
    domain: 'social_isolation',
    question: 'How often do you feel lonely or isolated from those around you?',
    type: 'frequency',
    options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
    concernThreshold: ['Sometimes', 'Often', 'Always'],
    weight: 1,
  },

  // Employment
  {
    id: 'employ_1',
    domain: 'employment',
    question: 'Do you want help finding or keeping work or a job?',
    type: 'yes_no',
    concernThreshold: true,
    weight: 1,
  },

  // Education
  {
    id: 'edu_1',
    domain: 'education',
    question: 'Do you want help with school or training? For example, starting or completing job training or getting a high school diploma, GED or equivalent.',
    type: 'yes_no',
    concernThreshold: true,
    weight: 1,
  },

  // Childcare
  {
    id: 'child_1',
    domain: 'childcare',
    question: 'Do problems getting childcare make it difficult for you to work or study?',
    type: 'yes_no',
    concernThreshold: true,
    weight: 1,
  },

  // Health Literacy
  {
    id: 'literacy_1',
    domain: 'health_literacy',
    question: 'How confident are you filling out medical forms by yourself?',
    type: 'scale',
    options: ['Extremely', 'Quite a bit', 'Somewhat', 'A little bit', 'Not at all'],
    concernThreshold: [3, 4], // A little bit or Not at all
    weight: 1,
  },
];

// =============================================================================
// COMMUNITY RESOURCES DATABASE
// =============================================================================

const COMMUNITY_RESOURCES: CommunityResource[] = [
  // Food Resources
  {
    id: 'res_1',
    name: 'Food Bank of the Rockies',
    organization: 'Food Bank of the Rockies',
    domain: 'food_insecurity',
    description: 'Distributes food to hunger-relief programs across Colorado',
    services: ['Food distribution', 'Mobile food pantry', 'SNAP enrollment assistance'],
    phone: '303-371-9250',
    website: 'https://www.foodbankrockies.org',
    address: '10700 E 45th Ave',
    city: 'Denver',
    state: 'CO',
    zipCode: '80239',
    hours: 'M-F 8am-5pm',
    appointmentRequired: false,
    walkInAvailable: true,
    languages: ['English', 'Spanish'],
    cost: 'free',
    lastVerified: new Date(),
    active: true,
  },
  {
    id: 'res_2',
    name: 'SNAP (Food Stamps) Enrollment',
    organization: 'Colorado Department of Human Services',
    domain: 'food_insecurity',
    description: 'Federal nutrition assistance program',
    services: ['Food assistance benefits', 'Enrollment help'],
    eligibilityCriteria: ['Income below 200% federal poverty level'],
    phone: '1-800-536-5298',
    website: 'https://www.colorado.gov/cdhs/snap',
    city: 'Statewide',
    state: 'CO',
    hours: 'M-F 8am-5pm',
    appointmentRequired: false,
    walkInAvailable: true,
    languages: ['English', 'Spanish', 'Multiple via interpreters'],
    cost: 'free',
    lastVerified: new Date(),
    active: true,
  },

  // Housing Resources
  {
    id: 'res_3',
    name: 'Colorado Coalition for the Homeless',
    organization: 'Colorado Coalition for the Homeless',
    domain: 'housing_instability',
    description: 'Housing assistance and homeless services',
    services: ['Emergency shelter', 'Transitional housing', 'Rental assistance', 'Case management'],
    phone: '303-293-2217',
    website: 'https://www.coloradocoalition.org',
    address: '2111 Champa St',
    city: 'Denver',
    state: 'CO',
    zipCode: '80205',
    hours: '24/7 for emergency services',
    appointmentRequired: false,
    walkInAvailable: true,
    languages: ['English', 'Spanish'],
    cost: 'free',
    lastVerified: new Date(),
    active: true,
  },
  {
    id: 'res_4',
    name: 'Section 8 Housing Choice Voucher Program',
    organization: 'Denver Housing Authority',
    domain: 'housing_instability',
    description: 'Rental assistance vouchers',
    services: ['Rental assistance', 'Housing search assistance'],
    eligibilityCriteria: ['Income below 50% area median income', 'US citizen or eligible immigrant'],
    phone: '720-932-3000',
    website: 'https://www.denverhousing.org',
    city: 'Denver',
    state: 'CO',
    hours: 'M-F 8am-5pm',
    appointmentRequired: true,
    walkInAvailable: false,
    languages: ['English', 'Spanish'],
    cost: 'free',
    lastVerified: new Date(),
    active: true,
  },

  // Transportation
  {
    id: 'res_5',
    name: 'Access-a-Ride',
    organization: 'RTD Denver',
    domain: 'transportation',
    description: 'Paratransit service for people with disabilities',
    services: ['Door-to-door transportation', 'Medical appointment rides'],
    eligibilityCriteria: ['ADA eligible', 'Unable to use fixed-route transit'],
    phone: '303-299-2960',
    website: 'https://www.rtd-denver.com/access-a-ride',
    city: 'Denver Metro',
    state: 'CO',
    hours: 'Varies by route',
    appointmentRequired: true,
    walkInAvailable: false,
    languages: ['English', 'Spanish'],
    cost: 'sliding_scale',
    lastVerified: new Date(),
    active: true,
  },
  {
    id: 'res_6',
    name: 'Medicaid Non-Emergency Medical Transportation',
    organization: 'Colorado Medicaid',
    domain: 'transportation',
    description: 'Free rides to medical appointments for Medicaid members',
    services: ['Medical appointment transportation'],
    eligibilityCriteria: ['Active Medicaid enrollment'],
    phone: '1-855-489-7463',
    website: 'https://www.healthcolorado.org',
    city: 'Statewide',
    state: 'CO',
    hours: 'M-F 8am-5pm',
    appointmentRequired: true,
    walkInAvailable: false,
    languages: ['English', 'Spanish'],
    cost: 'free',
    lastVerified: new Date(),
    active: true,
  },

  // Utilities
  {
    id: 'res_7',
    name: 'LEAP (Low-income Energy Assistance Program)',
    organization: 'Colorado Department of Human Services',
    domain: 'utilities',
    description: 'Help paying heating bills',
    services: ['Heating bill assistance', 'Crisis intervention'],
    eligibilityCriteria: ['Income below 60% state median income'],
    incomeLimit: '60% state median income',
    phone: '1-866-432-8435',
    website: 'https://www.colorado.gov/cdhs/leap',
    city: 'Statewide',
    state: 'CO',
    hours: 'M-F 8am-5pm (Nov-Apr)',
    appointmentRequired: false,
    walkInAvailable: false,
    languages: ['English', 'Spanish'],
    cost: 'free',
    lastVerified: new Date(),
    active: true,
  },

  // Safety
  {
    id: 'res_8',
    name: 'National Domestic Violence Hotline',
    organization: 'National Domestic Violence Hotline',
    domain: 'safety',
    description: '24/7 confidential support for domestic violence',
    services: ['Crisis support', 'Safety planning', 'Referrals to local resources'],
    phone: '1-800-799-7233',
    website: 'https://www.thehotline.org',
    city: 'National',
    state: 'US',
    hours: '24/7',
    appointmentRequired: false,
    walkInAvailable: false,
    languages: ['English', 'Spanish', '200+ via interpreters'],
    cost: 'free',
    lastVerified: new Date(),
    active: true,
  },
  {
    id: 'res_9',
    name: 'SafeHouse Denver',
    organization: 'SafeHouse Denver',
    domain: 'safety',
    description: 'Emergency shelter and services for domestic violence survivors',
    services: ['Emergency shelter', 'Counseling', 'Legal advocacy', 'Children\'s services'],
    phone: '303-318-9989',
    website: 'https://www.safehouse-denver.org',
    city: 'Denver',
    state: 'CO',
    hours: '24/7 hotline',
    appointmentRequired: false,
    walkInAvailable: false,
    languages: ['English', 'Spanish'],
    cost: 'free',
    lastVerified: new Date(),
    active: true,
  },

  // Financial
  {
    id: 'res_10',
    name: 'Mile High United Way 211',
    organization: 'Mile High United Way',
    domain: 'financial_strain',
    description: 'Central resource for community services',
    services: ['Referrals to financial assistance', 'Utility help', 'Rent assistance', 'Food assistance'],
    phone: '211',
    website: 'https://www.211colorado.org',
    city: 'Statewide',
    state: 'CO',
    hours: '24/7',
    appointmentRequired: false,
    walkInAvailable: false,
    languages: ['English', 'Spanish', 'Multiple'],
    cost: 'free',
    lastVerified: new Date(),
    active: true,
  },
];

// =============================================================================
// SDOH SERVICE
// =============================================================================

export class SDOHService extends EventEmitter {
  private resources: CommunityResource[] = COMMUNITY_RESOURCES;

  constructor() {
    super();
  }

  // =========================================================================
  // SCREENING
  // =========================================================================

  getScreeningQuestions(tool: SDOHScreening['tool'] = 'AHC-HRSN'): ScreeningQuestion[] {
    // Return all questions for the selected tool
    return SCREENING_QUESTIONS;
  }

  async processScreeningResponses(
    patientId: string,
    screenedBy: string,
    responses: ScreeningResponse[]
  ): Promise<SDOHScreening> {
    // Group responses by domain
    const domainResponses = new Map<SDOHDomain, ScreeningResponse[]>();
    
    for (const response of responses) {
      const question = SCREENING_QUESTIONS.find(q => q.id === response.questionId);
      if (question) {
        const existing = domainResponses.get(question.domain) || [];
        existing.push(response);
        domainResponses.set(question.domain, existing);
      }
    }

    // Calculate risk for each domain
    const domainResults: SDOHDomainResult[] = [];
    const priorityDomains: SDOHDomain[] = [];

    domainResponses.forEach((domainResp, domain) => {
      const result = this.calculateDomainRisk(domain, domainResp);
      domainResults.push(result);
      
      if (result.risk === 'high' || result.risk === 'critical') {
        priorityDomains.push(domain);
      }
    });

    // Calculate overall risk
    const overallRisk = this.calculateOverallRisk(domainResults);

    // Generate referrals for high-risk domains
    const referrals: ResourceReferral[] = [];
    for (const priorityDomain of priorityDomains) {
      const domainResources = this.findResourcesForDomain(priorityDomain, 'CO'); // Default to CO
      for (const resource of domainResources.slice(0, 2)) {
        referrals.push({
          id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          patientId,
          resourceId: resource.id,
          resource,
          domain: priorityDomain,
          status: 'generated',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    const screening: SDOHScreening = {
      id: `sdoh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientId,
      screeningDate: new Date(),
      screenedBy,
      tool: 'AHC-HRSN',
      domainResults,
      overallRisk,
      priorityDomains,
      referralsGenerated: referrals,
    };

    this.emit('screeningCompleted', screening);
    return screening;
  }

  private calculateDomainRisk(domain: SDOHDomain, responses: ScreeningResponse[]): SDOHDomainResult {
    const flaggedConcerns: string[] = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const response of responses) {
      const question = SCREENING_QUESTIONS.find(q => q.id === response.questionId);
      if (!question) continue;

      maxScore += question.weight;

      // Check if response indicates concern
      if (response.concernFlag) {
        totalScore += question.weight;
        flaggedConcerns.push(question.question);
      }
    }

    const riskScore = maxScore > 0 ? totalScore / maxScore : 0;
    let risk: RiskLevel = 'none';
    if (riskScore >= 0.75) risk = 'critical';
    else if (riskScore >= 0.5) risk = 'high';
    else if (riskScore >= 0.25) risk = 'moderate';
    else if (riskScore > 0) risk = 'low';

    // Get recommended resources
    const recommendedResources = this.findResourcesForDomain(domain, 'CO');

    return {
      domain,
      risk,
      score: riskScore,
      responses,
      flaggedConcerns,
      recommendedResources: recommendedResources.slice(0, 3),
    };
  }

  private calculateOverallRisk(domainResults: SDOHDomainResult[]): RiskLevel {
    const hasCritical = domainResults.some(r => r.risk === 'critical');
    const highCount = domainResults.filter(r => r.risk === 'high').length;
    const moderateCount = domainResults.filter(r => r.risk === 'moderate').length;

    if (hasCritical || highCount >= 2) return 'critical';
    if (highCount >= 1 || moderateCount >= 3) return 'high';
    if (moderateCount >= 1) return 'moderate';
    if (domainResults.some(r => r.risk === 'low')) return 'low';
    return 'none';
  }

  // =========================================================================
  // RESOURCE MATCHING
  // =========================================================================

  findResourcesForDomain(domain: SDOHDomain, state: string): CommunityResource[] {
    return this.resources.filter(r => 
      r.domain === domain && 
      r.active &&
      (r.state === state || r.state === 'US' || r.city === 'Statewide' || r.city === 'National')
    );
  }

  searchResources(query: {
    domain?: SDOHDomain;
    zipCode?: string;
    state?: string;
    costPreference?: CommunityResource['cost'];
    languages?: string[];
    walkIn?: boolean;
  }): CommunityResource[] {
    let results = [...this.resources].filter(r => r.active);

    if (query.domain) {
      results = results.filter(r => r.domain === query.domain);
    }

    if (query.state) {
      results = results.filter(r => 
        r.state === query.state || r.state === 'US' || r.city === 'Statewide' || r.city === 'National'
      );
    }

    if (query.costPreference === 'free') {
      results = results.filter(r => r.cost === 'free');
    }

    if (query.languages && query.languages.length > 0) {
      results = results.filter(r => 
        query.languages!.some(lang => r.languages.includes(lang))
      );
    }

    if (query.walkIn) {
      results = results.filter(r => r.walkInAvailable);
    }

    return results;
  }

  // =========================================================================
  // REFERRAL MANAGEMENT
  // =========================================================================

  async updateReferralStatus(
    referralId: string,
    status: ResourceReferral['status'],
    notes?: string,
    outcome?: ResourceReferral['outcome']
  ): Promise<void> {
    // In production, this would update the database
    this.emit('referralUpdated', { referralId, status, notes, outcome });
  }

  // =========================================================================
  // REPORTING
  // =========================================================================

  async generatePatientSDOHSummary(screening: SDOHScreening): Promise<string> {
    let summary = `**Social Determinants of Health Assessment**\n`;
    summary += `Date: ${screening.screeningDate.toLocaleDateString()}\n`;
    summary += `Overall Risk Level: ${screening.overallRisk.toUpperCase()}\n\n`;

    if (screening.priorityDomains.length > 0) {
      summary += `**Priority Areas Identified:**\n`;
      for (const domain of screening.priorityDomains) {
        const result = screening.domainResults.find(r => r.domain === domain);
        summary += `• ${this.formatDomainName(domain)}: ${result?.risk.toUpperCase()}\n`;
        if (result?.flaggedConcerns.length) {
          for (const concern of result.flaggedConcerns.slice(0, 2)) {
            summary += `  - ${concern}\n`;
          }
        }
      }
      summary += `\n`;
    }

    if (screening.referralsGenerated.length > 0) {
      summary += `**Recommended Resources:**\n`;
      for (const referral of screening.referralsGenerated) {
        summary += `• ${referral.resource.name}\n`;
        summary += `  Phone: ${referral.resource.phone || 'N/A'}\n`;
        summary += `  Services: ${referral.resource.services.slice(0, 2).join(', ')}\n`;
      }
    }

    return summary;
  }

  private formatDomainName(domain: SDOHDomain): string {
    const names: Record<SDOHDomain, string> = {
      food_insecurity: 'Food Insecurity',
      housing_instability: 'Housing Instability',
      transportation: 'Transportation Barriers',
      financial_strain: 'Financial Strain',
      social_isolation: 'Social Isolation',
      education: 'Education Needs',
      employment: 'Employment Support',
      safety: 'Personal Safety',
      health_literacy: 'Health Literacy',
      childcare: 'Childcare Needs',
      legal_needs: 'Legal Assistance',
      utilities: 'Utility Assistance',
    };
    return names[domain] || domain;
  }

  // =========================================================================
  // ICD-10 Z CODES
  // =========================================================================

  getZCodesForScreening(screening: SDOHScreening): Array<{ code: string; description: string }> {
    const codes: Array<{ code: string; description: string }> = [];

    for (const result of screening.domainResults) {
      if (result.risk === 'none' || result.risk === 'low') continue;

      switch (result.domain) {
        case 'food_insecurity':
          codes.push({ code: 'Z59.41', description: 'Food insecurity' });
          break;
        case 'housing_instability':
          codes.push({ code: 'Z59.00', description: 'Homelessness, unspecified' });
          break;
        case 'transportation':
          codes.push({ code: 'Z59.82', description: 'Transportation insecurity' });
          break;
        case 'financial_strain':
          codes.push({ code: 'Z59.86', description: 'Financial insecurity' });
          break;
        case 'social_isolation':
          codes.push({ code: 'Z60.4', description: 'Social exclusion and rejection' });
          break;
        case 'employment':
          codes.push({ code: 'Z56.0', description: 'Unemployment, unspecified' });
          break;
        case 'education':
          codes.push({ code: 'Z55.9', description: 'Problems related to education and literacy' });
          break;
        case 'safety':
          codes.push({ code: 'Z63.0', description: 'Problems in relationship with spouse or partner' });
          break;
        case 'health_literacy':
          codes.push({ code: 'Z55.0', description: 'Illiteracy and low-level literacy' });
          break;
        case 'utilities':
          codes.push({ code: 'Z59.1', description: 'Inadequate housing' });
          break;
      }
    }

    return codes;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const sdohService = new SDOHService();
