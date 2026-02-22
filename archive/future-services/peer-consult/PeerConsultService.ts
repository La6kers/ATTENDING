// =============================================================================
// ATTENDING AI - Peer Consultation Network Service
// apps/shared/services/peer-consult/PeerConsultService.ts
//
// Secure peer-to-peer consultation network including:
// - De-identified case sharing
// - AI-suggested specialist matching
// - Asynchronous e-consults
// - Outcome tracking
// - CME credit integration
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface ConsultRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterSpecialty: string;
  patientCase: DeidentifiedCase;
  consultType: ConsultType;
  targetSpecialty: string;
  urgency: 'emergent' | 'urgent' | 'routine';
  clinicalQuestion: string;
  additionalContext?: string;
  attachments: ConsultAttachment[];
  status: ConsultStatus;
  suggestedConsultants: SuggestedConsultant[];
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  dueBy?: Date;
  responses: ConsultResponse[];
  outcome?: ConsultOutcome;
  cmeEligible: boolean;
}

export type ConsultType = 'curbside' | 'formal-econsult' | 'second-opinion' | 'case-discussion' | 'educational';
export type ConsultStatus = 'draft' | 'submitted' | 'assigned' | 'in-progress' | 'responded' | 'closed' | 'expired';

export interface DeidentifiedCase {
  ageRange: string;
  gender: string;
  chiefComplaint: string;
  relevantHistory: string[];
  relevantMedications: string[];
  relevantAllergies: string[];
  pertinentFindings: string[];
  relevantLabs: { name: string; value: string; interpretation: string }[];
  relevantImaging: { type: string; findings: string }[];
  currentAssessment: string;
  currentPlan: string;
  diagnosticUncertainty?: string;
}

export interface ConsultAttachment {
  id: string;
  type: 'image' | 'document' | 'lab' | 'ecg' | 'imaging';
  name: string;
  description?: string;
  deidentified: boolean;
  url?: string;
  base64?: string;
}

export interface SuggestedConsultant {
  consultantId: string;
  name: string;
  specialty: string;
  subspecialty?: string;
  institution: string;
  matchScore: number;
  matchReasons: string[];
  avgResponseTime: string;
  rating: number;
  consultCount: number;
  available: boolean;
}

export interface ConsultResponse {
  id: string;
  responderId: string;
  responderName: string;
  responderSpecialty: string;
  responderCredentials: string;
  responseDate: Date;
  assessment: string;
  recommendations: string[];
  additionalWorkup?: string[];
  references?: ConsultReference[];
  confidenceLevel: 'high' | 'moderate' | 'low';
  followUpAvailable: boolean;
  timeSpent: number; // minutes
  disclaimers: string[];
}

export interface ConsultReference {
  title: string;
  source: string;
  year?: number;
  url?: string;
  relevance: string;
}

export interface ConsultOutcome {
  recordedDate: Date;
  wasHelpful: boolean;
  implementedRecommendations: string[];
  patientOutcome?: string;
  feedback?: string;
  rating: number;
}

export interface Consultant {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  subspecialties: string[];
  institution: string;
  email: string;
  phone?: string;
  expertise: string[];
  languages: string[];
  availability: ConsultantAvailability;
  preferences: ConsultantPreferences;
  stats: ConsultantStats;
  verified: boolean;
  verificationDate?: Date;
}

export interface ConsultantAvailability {
  acceptingConsults: boolean;
  maxConsultsPerWeek: number;
  currentConsults: number;
  preferredResponseTime: string;
  blackoutDates?: Date[];
}

export interface ConsultantPreferences {
  consultTypes: ConsultType[];
  urgencyLevels: string[];
  caseComplexity: 'all' | 'complex-only' | 'routine-only';
  notificationMethod: 'email' | 'sms' | 'app' | 'all';
}

export interface ConsultantStats {
  totalConsults: number;
  avgResponseTime: number; // hours
  avgRating: number;
  helpfulnessRate: number;
  cmeCreditsEarned: number;
}

export interface ConsultNetwork {
  id: string;
  name: string;
  description: string;
  specialties: string[];
  memberCount: number;
  consultantCount: number;
  isPublic: boolean;
  joinCriteria?: string;
  moderators: string[];
}

// =============================================================================
// Specialty Matching Data
// =============================================================================

const SPECIALTY_EXPERTISE_MAP: Record<string, string[]> = {
  'Cardiology': ['heart failure', 'arrhythmia', 'coronary disease', 'valvular disease', 'hypertension', 'lipids', 'chest pain', 'ecg', 'palpitations'],
  'Endocrinology': ['diabetes', 'thyroid', 'adrenal', 'pituitary', 'osteoporosis', 'metabolic', 'hormone'],
  'Gastroenterology': ['liver', 'hepatitis', 'gi bleed', 'ibd', 'celiac', 'pancreatitis', 'gerd', 'cirrhosis'],
  'Hematology': ['anemia', 'bleeding', 'clotting', 'lymphoma', 'leukemia', 'myeloma', 'anticoagulation'],
  'Infectious Disease': ['hiv', 'sepsis', 'fever', 'infection', 'antimicrobial', 'travel medicine', 'immunocompromised'],
  'Nephrology': ['kidney', 'ckd', 'dialysis', 'electrolyte', 'hypertension', 'proteinuria', 'aki'],
  'Neurology': ['stroke', 'seizure', 'headache', 'dementia', 'neuropathy', 'ms', 'parkinsons', 'tremor'],
  'Oncology': ['cancer', 'tumor', 'chemotherapy', 'malignancy', 'screening', 'palliative'],
  'Pulmonology': ['copd', 'asthma', 'pneumonia', 'sleep apnea', 'pulmonary', 'lung', 'dyspnea'],
  'Rheumatology': ['arthritis', 'lupus', 'autoimmune', 'joint', 'connective tissue', 'vasculitis', 'gout'],
  'Psychiatry': ['depression', 'anxiety', 'bipolar', 'psychosis', 'substance use', 'ptsd', 'suicidal'],
  'Dermatology': ['rash', 'skin', 'lesion', 'melanoma', 'psoriasis', 'eczema', 'acne'],
  'Allergy/Immunology': ['allergy', 'anaphylaxis', 'immunodeficiency', 'asthma', 'urticaria', 'angioedema'],
};

// =============================================================================
// Peer Consultation Service Class
// =============================================================================

export class PeerConsultService extends EventEmitter {
  private consultRequests: Map<string, ConsultRequest> = new Map();
  private consultants: Map<string, Consultant> = new Map();
  private networks: Map<string, ConsultNetwork> = new Map();

  constructor() {
    super();
    this.initializeSampleConsultants();
  }

  private initializeSampleConsultants(): void {
    // Add sample consultants for demonstration
    const sampleConsultants: Consultant[] = [
      {
        id: 'cons_1',
        name: 'Dr. Sarah Chen',
        credentials: 'MD, FACC',
        specialty: 'Cardiology',
        subspecialties: ['Heart Failure', 'Preventive Cardiology'],
        institution: 'University Medical Center',
        email: 'schen@example.com',
        expertise: ['heart failure', 'cardiomyopathy', 'preventive cardiology'],
        languages: ['English', 'Mandarin'],
        availability: { acceptingConsults: true, maxConsultsPerWeek: 10, currentConsults: 3, preferredResponseTime: '24 hours' },
        preferences: { consultTypes: ['formal-econsult', 'curbside'], urgencyLevels: ['urgent', 'routine'], caseComplexity: 'all', notificationMethod: 'email' },
        stats: { totalConsults: 245, avgResponseTime: 18, avgRating: 4.8, helpfulnessRate: 94, cmeCreditsEarned: 45 },
        verified: true,
        verificationDate: new Date('2024-01-15'),
      },
      {
        id: 'cons_2',
        name: 'Dr. Michael Rodriguez',
        credentials: 'MD, FACE',
        specialty: 'Endocrinology',
        subspecialties: ['Diabetes', 'Thyroid Disorders'],
        institution: 'Community Health System',
        email: 'mrodriguez@example.com',
        expertise: ['diabetes management', 'thyroid disease', 'adrenal disorders'],
        languages: ['English', 'Spanish'],
        availability: { acceptingConsults: true, maxConsultsPerWeek: 8, currentConsults: 2, preferredResponseTime: '48 hours' },
        preferences: { consultTypes: ['formal-econsult', 'educational'], urgencyLevels: ['urgent', 'routine'], caseComplexity: 'all', notificationMethod: 'all' },
        stats: { totalConsults: 189, avgResponseTime: 24, avgRating: 4.7, helpfulnessRate: 91, cmeCreditsEarned: 35 },
        verified: true,
        verificationDate: new Date('2024-02-20'),
      },
    ];

    for (const consultant of sampleConsultants) {
      this.consultants.set(consultant.id, consultant);
    }
  }

  // ===========================================================================
  // Consult Request Management
  // ===========================================================================

  createConsultRequest(
    request: Omit<ConsultRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'responses' | 'suggestedConsultants'>
  ): ConsultRequest {
    const id = `consult_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Find suggested consultants
    const suggestedConsultants = this.findMatchingConsultants(
      request.targetSpecialty,
      request.clinicalQuestion,
      request.patientCase
    );
    
    const fullRequest: ConsultRequest = {
      ...request,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'submitted',
      responses: [],
      suggestedConsultants,
    };
    
    // Set due date based on urgency
    if (request.urgency === 'emergent') {
      fullRequest.dueBy = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours
    } else if (request.urgency === 'urgent') {
      fullRequest.dueBy = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    } else {
      fullRequest.dueBy = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
    }
    
    this.consultRequests.set(id, fullRequest);
    this.emit('consultRequestCreated', fullRequest);
    
    // Notify suggested consultants
    this.notifyConsultants(fullRequest);
    
    return fullRequest;
  }

  private findMatchingConsultants(
    targetSpecialty: string,
    clinicalQuestion: string,
    patientCase: DeidentifiedCase
  ): SuggestedConsultant[] {
    const consultants = Array.from(this.consultants.values());
    const matches: SuggestedConsultant[] = [];
    
    // Extract keywords from clinical question and case
    const keywords = this.extractKeywords(clinicalQuestion + ' ' + patientCase.chiefComplaint + ' ' + patientCase.currentAssessment);
    
    for (const consultant of consultants) {
      if (!consultant.availability.acceptingConsults) continue;
      if (consultant.availability.currentConsults >= consultant.availability.maxConsultsPerWeek) continue;
      
      let matchScore = 0;
      const matchReasons: string[] = [];
      
      // Specialty match
      if (consultant.specialty === targetSpecialty) {
        matchScore += 50;
        matchReasons.push(`Specialty match: ${targetSpecialty}`);
      } else if (consultant.subspecialties.includes(targetSpecialty)) {
        matchScore += 40;
        matchReasons.push(`Subspecialty match: ${targetSpecialty}`);
      }
      
      // Expertise match
      const expertiseKeywords = SPECIALTY_EXPERTISE_MAP[consultant.specialty] || [];
      const expertiseMatches = keywords.filter(k => 
        expertiseKeywords.some(e => e.includes(k) || k.includes(e)) ||
        consultant.expertise.some(e => e.includes(k) || k.includes(e))
      );
      
      if (expertiseMatches.length > 0) {
        matchScore += expertiseMatches.length * 10;
        matchReasons.push(`Expertise match: ${expertiseMatches.slice(0, 3).join(', ')}`);
      }
      
      // Performance factors
      if (consultant.stats.avgRating >= 4.5) {
        matchScore += 10;
        matchReasons.push('Highly rated consultant');
      }
      
      if (consultant.stats.avgResponseTime <= 24) {
        matchScore += 5;
        matchReasons.push('Fast response time');
      }
      
      if (matchScore > 30) {
        matches.push({
          consultantId: consultant.id,
          name: consultant.name,
          specialty: consultant.specialty,
          subspecialty: consultant.subspecialties[0],
          institution: consultant.institution,
          matchScore,
          matchReasons,
          avgResponseTime: `${consultant.stats.avgResponseTime} hours`,
          rating: consultant.stats.avgRating,
          consultCount: consultant.stats.totalConsults,
          available: true,
        });
      }
    }
    
    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    return matches.slice(0, 5);
  }

  private extractKeywords(text: string): string[] {
    const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'with', 'for', 'and', 'or', 'of', 'to', 'in', 'on', 'at'];
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.includes(w));
    
    return [...new Set(words)];
  }

  private notifyConsultants(request: ConsultRequest): void {
    for (const suggested of request.suggestedConsultants) {
      const consultant = this.consultants.get(suggested.consultantId);
      if (consultant) {
        this.emit('consultantNotified', { consultant, request });
      }
    }
  }

  // ===========================================================================
  // Consult Response
  // ===========================================================================

  submitConsultResponse(
    consultId: string,
    response: Omit<ConsultResponse, 'id' | 'responseDate'>
  ): ConsultResponse {
    const request = this.consultRequests.get(consultId);
    if (!request) throw new Error('Consult request not found');
    
    const fullResponse: ConsultResponse = {
      ...response,
      id: `resp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      responseDate: new Date(),
    };
    
    request.responses.push(fullResponse);
    request.status = 'responded';
    request.updatedAt = new Date();
    
    // Update consultant stats
    const consultant = this.consultants.get(response.responderId);
    if (consultant) {
      consultant.stats.totalConsults++;
      consultant.availability.currentConsults++;
    }
    
    this.emit('consultResponseSubmitted', { request, response: fullResponse });
    
    return fullResponse;
  }

  // ===========================================================================
  // Outcome Recording
  // ===========================================================================

  recordOutcome(consultId: string, outcome: Omit<ConsultOutcome, 'recordedDate'>): void {
    const request = this.consultRequests.get(consultId);
    if (!request) throw new Error('Consult request not found');
    
    request.outcome = {
      ...outcome,
      recordedDate: new Date(),
    };
    request.status = 'closed';
    request.updatedAt = new Date();
    
    // Update consultant ratings
    for (const response of request.responses) {
      const consultant = this.consultants.get(response.responderId);
      if (consultant) {
        // Update running average
        const newAvg = (consultant.stats.avgRating * (consultant.stats.totalConsults - 1) + outcome.rating) / consultant.stats.totalConsults;
        consultant.stats.avgRating = Math.round(newAvg * 10) / 10;
        
        if (outcome.wasHelpful) {
          consultant.stats.helpfulnessRate = Math.round(
            (consultant.stats.helpfulnessRate * (consultant.stats.totalConsults - 1) + 100) / consultant.stats.totalConsults
          );
        }
        
        // Award CME credits
        if (request.cmeEligible) {
          consultant.stats.cmeCreditsEarned += 0.5; // 0.5 credits per consult
        }
      }
    }
    
    this.emit('consultOutcomeRecorded', request);
  }

  // ===========================================================================
  // Consultant Management
  // ===========================================================================

  registerConsultant(consultant: Omit<Consultant, 'id' | 'stats' | 'verified' | 'verificationDate'>): Consultant {
    const id = `cons_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const fullConsultant: Consultant = {
      ...consultant,
      id,
      stats: {
        totalConsults: 0,
        avgResponseTime: 0,
        avgRating: 0,
        helpfulnessRate: 0,
        cmeCreditsEarned: 0,
      },
      verified: false,
    };
    
    this.consultants.set(id, fullConsultant);
    this.emit('consultantRegistered', fullConsultant);
    
    return fullConsultant;
  }

  updateConsultantAvailability(consultantId: string, availability: Partial<ConsultantAvailability>): void {
    const consultant = this.consultants.get(consultantId);
    if (consultant) {
      consultant.availability = { ...consultant.availability, ...availability };
      this.emit('consultantAvailabilityUpdated', consultant);
    }
  }

  // ===========================================================================
  // Query Methods
  // ===========================================================================

  getConsultRequest(consultId: string): ConsultRequest | undefined {
    return this.consultRequests.get(consultId);
  }

  getConsultsByRequester(requesterId: string): ConsultRequest[] {
    return Array.from(this.consultRequests.values())
      .filter(c => c.requesterId === requesterId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getConsultsByConsultant(consultantId: string): ConsultRequest[] {
    return Array.from(this.consultRequests.values())
      .filter(c => c.responses.some(r => r.responderId === consultantId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getPendingConsultsForSpecialty(specialty: string): ConsultRequest[] {
    return Array.from(this.consultRequests.values())
      .filter(c => c.targetSpecialty === specialty && c.status === 'submitted')
      .sort((a, b) => {
        const urgencyOrder = { emergent: 0, urgent: 1, routine: 2 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });
  }

  getConsultant(consultantId: string): Consultant | undefined {
    return this.consultants.get(consultantId);
  }

  searchConsultants(specialty?: string, expertise?: string): Consultant[] {
    let consultants = Array.from(this.consultants.values());
    
    if (specialty) {
      consultants = consultants.filter(c => 
        c.specialty === specialty || c.subspecialties.includes(specialty)
      );
    }
    
    if (expertise) {
      const searchTerms = expertise.toLowerCase().split(/\s+/);
      consultants = consultants.filter(c =>
        searchTerms.some(term =>
          c.expertise.some(e => e.includes(term)) ||
          c.subspecialties.some(s => s.toLowerCase().includes(term))
        )
      );
    }
    
    return consultants.sort((a, b) => b.stats.avgRating - a.stats.avgRating);
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  getNetworkStats(): {
    totalConsults: number;
    pendingConsults: number;
    avgResponseTime: number;
    avgRating: number;
    consultantCount: number;
    topSpecialties: { specialty: string; consultCount: number }[];
  } {
    const requests = Array.from(this.consultRequests.values());
    const consultants = Array.from(this.consultants.values());
    
    const specialtyCounts: Record<string, number> = {};
    for (const req of requests) {
      specialtyCounts[req.targetSpecialty] = (specialtyCounts[req.targetSpecialty] || 0) + 1;
    }
    
    const topSpecialties = Object.entries(specialtyCounts)
      .map(([specialty, consultCount]) => ({ specialty, consultCount }))
      .sort((a, b) => b.consultCount - a.consultCount)
      .slice(0, 5);
    
    const respondedRequests = requests.filter(r => r.responses.length > 0);
    const avgResponseTime = respondedRequests.length > 0
      ? respondedRequests.reduce((sum, r) => {
          const responseTime = (r.responses[0].responseDate.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60);
          return sum + responseTime;
        }, 0) / respondedRequests.length
      : 0;
    
    const closedWithOutcome = requests.filter(r => r.outcome);
    const avgRating = closedWithOutcome.length > 0
      ? closedWithOutcome.reduce((sum, r) => sum + (r.outcome?.rating || 0), 0) / closedWithOutcome.length
      : 0;
    
    return {
      totalConsults: requests.length,
      pendingConsults: requests.filter(r => r.status === 'submitted').length,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      avgRating: Math.round(avgRating * 10) / 10,
      consultantCount: consultants.length,
      topSpecialties,
    };
  }
}

// Singleton instance
export const peerConsultService = new PeerConsultService();
export default peerConsultService;
