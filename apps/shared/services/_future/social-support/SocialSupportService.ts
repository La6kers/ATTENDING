// =============================================================================
// ATTENDING AI - Social Support Matching Service
// apps/shared/services/social-support/SocialSupportService.ts
//
// Peer support and social connection matching including:
// - Condition-based peer matching
// - Support group recommendations
// - Volunteer visitor coordination
// - Loneliness screening & intervention
// - Community resource connection
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface PatientSocialProfile {
  patientId: string;
  demographics: SocialDemographics;
  healthConditions: string[];
  socialAssessment: SocialAssessment;
  interests: string[];
  preferences: SocialPreferences;
  supportNetwork: SupportNetworkMember[];
  supportGroupMemberships: SupportGroupMembership[];
  peerConnections: PeerConnection[];
  volunteerVisits: VolunteerVisit[];
  interventions: SocialIntervention[];
  riskLevel: 'low' | 'moderate' | 'high';
}

export interface SocialDemographics {
  ageRange: string;
  gender: string;
  language: string;
  location: string;
  livingArrangement: 'alone' | 'with-spouse' | 'with-family' | 'assisted-living' | 'nursing-home' | 'other';
  employmentStatus: 'employed' | 'unemployed' | 'retired' | 'disabled' | 'student' | 'homemaker';
  hasTransportation: boolean;
  hasTechnology: boolean;
  mobilityLevel: 'independent' | 'limited' | 'homebound';
}

export interface SocialAssessment {
  id: string;
  assessmentDate: Date;
  lonelinessScore?: number;
  socialIsolationScore?: number;
  perceivedSupportScore?: number;
  screeningTool: string;
  responses: AssessmentResponse[];
  riskFactors: string[];
  protectiveFactors: string[];
  recommendations: string[];
}

export interface AssessmentResponse {
  question: string;
  response: number | string;
  interpretation?: string;
}

export interface SocialPreferences {
  preferredContactMethod: 'phone' | 'video' | 'in-person' | 'text' | 'any';
  preferredMeetingTime: string[];
  groupVsIndividual: 'group' | 'individual' | 'both';
  religiousAffiliation?: string;
  culturalConsiderations?: string[];
  topicsOfInterest: string[];
  topicsToAvoid?: string[];
  peerMatchPreferences: PeerMatchPreferences;
}

export interface PeerMatchPreferences {
  sameCondition: boolean;
  sameAgeRange: boolean;
  sameGender: boolean;
  sameLanguage: boolean;
  experienceLevel: 'new-diagnosis' | 'experienced' | 'any';
}

export interface SupportNetworkMember {
  id: string;
  name: string;
  relationship: string;
  contactFrequency: 'daily' | 'weekly' | 'monthly' | 'rarely';
  supportType: ('emotional' | 'practical' | 'informational' | 'companionship')[];
  qualityOfRelationship: 'supportive' | 'neutral' | 'strained';
  phone?: string;
  canBeEmergencyContact: boolean;
}

export interface SupportGroupMembership {
  id: string;
  groupId: string;
  groupName: string;
  condition: string;
  joinDate: Date;
  status: 'active' | 'inactive' | 'interested';
  attendanceRate?: number;
  format: 'in-person' | 'virtual' | 'hybrid';
  meetingFrequency: string;
  facilitated: boolean;
}

export interface PeerConnection {
  id: string;
  matchedPatientId?: string;
  peerMentorId?: string;
  peerName: string;
  matchReason: string[];
  matchScore: number;
  status: 'suggested' | 'pending' | 'active' | 'ended' | 'declined';
  connectionType: 'peer-support' | 'mentor-mentee' | 'buddy';
  startDate?: Date;
  endDate?: Date;
  interactionCount: number;
  lastInteraction?: Date;
  feedback?: ConnectionFeedback;
}

export interface ConnectionFeedback {
  date: Date;
  rating: number;
  helpful: boolean;
  comments?: string;
  wouldRecommend: boolean;
}

export interface VolunteerVisit {
  id: string;
  volunteerId: string;
  volunteerName: string;
  scheduledDate: Date;
  duration: number; // minutes
  visitType: 'companionship' | 'activity' | 'errand' | 'transportation' | 'meal';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  patientFeedback?: {
    rating: number;
    enjoyedVisit: boolean;
    comments?: string;
  };
}

export interface SocialIntervention {
  id: string;
  type: InterventionType;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'discontinued';
  goals: string[];
  outcomes?: string[];
  provider?: string;
  notes?: string;
}

export type InterventionType =
  | 'peer-support-program'
  | 'support-group-referral'
  | 'volunteer-visitor'
  | 'social-prescribing'
  | 'care-navigation'
  | 'telephone-outreach'
  | 'technology-training'
  | 'transportation-assistance'
  | 'community-engagement';

// =============================================================================
// Support Group Types
// =============================================================================

export interface SupportGroup {
  id: string;
  name: string;
  description: string;
  condition: string[];
  format: 'in-person' | 'virtual' | 'hybrid';
  location?: string;
  virtualPlatform?: string;
  meetingSchedule: MeetingSchedule;
  facilitator?: Facilitator;
  capacity: number;
  currentMembers: number;
  acceptingNewMembers: boolean;
  cost: 'free' | string;
  language: string[];
  ageRange?: string;
  genderSpecific?: 'male' | 'female' | 'all';
  contactInfo: ContactInfo;
  tags: string[];
}

export interface MeetingSchedule {
  frequency: 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek?: string;
  time?: string;
  duration: number; // minutes
  nextMeeting?: Date;
}

export interface Facilitator {
  name: string;
  credentials?: string;
  isProfessional: boolean;
  isPeerLed: boolean;
}

export interface ContactInfo {
  name?: string;
  phone?: string;
  email?: string;
  website?: string;
}

// =============================================================================
// Peer Mentor Types
// =============================================================================

export interface PeerMentor {
  id: string;
  name: string;
  condition: string[];
  yearsWithCondition: number;
  bio: string;
  expertise: string[];
  availability: string[];
  preferredContact: string;
  languages: string[];
  trained: boolean;
  trainingDate?: Date;
  activeMatches: number;
  maxMatches: number;
  totalMentees: number;
  rating: number;
  status: 'active' | 'inactive' | 'on-leave';
}

// =============================================================================
// Volunteer Types
// =============================================================================

export interface Volunteer {
  id: string;
  name: string;
  phone: string;
  email: string;
  availability: VolunteerAvailability[];
  services: string[];
  hasTransportation: boolean;
  backgroundCheckDate: Date;
  trainingCompleted: string[];
  languages: string[];
  specialSkills?: string[];
  preferences?: {
    ageRange?: string;
    genderPreference?: string;
    maxVisitsPerWeek: number;
  };
  status: 'active' | 'inactive' | 'pending';
  totalVisits: number;
  rating: number;
}

export interface VolunteerAvailability {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

// =============================================================================
// Loneliness Screening
// =============================================================================

const UCLA_LONELINESS_QUESTIONS = [
  { question: 'How often do you feel that you lack companionship?', options: ['Hardly ever', 'Some of the time', 'Often'] },
  { question: 'How often do you feel left out?', options: ['Hardly ever', 'Some of the time', 'Often'] },
  { question: 'How often do you feel isolated from others?', options: ['Hardly ever', 'Some of the time', 'Often'] },
];

// =============================================================================
// Sample Support Groups Database
// =============================================================================

const SAMPLE_SUPPORT_GROUPS: SupportGroup[] = [
  {
    id: 'sg_1',
    name: 'Diabetes Support Circle',
    description: 'Weekly support group for people living with diabetes. Share experiences, learn management tips, and connect with others.',
    condition: ['Type 2 Diabetes', 'Type 1 Diabetes', 'Prediabetes'],
    format: 'hybrid',
    location: 'Community Health Center, Room 201',
    virtualPlatform: 'Zoom',
    meetingSchedule: { frequency: 'weekly', dayOfWeek: 'Tuesday', time: '6:00 PM', duration: 90 },
    facilitator: { name: 'Maria Rodriguez, RN, CDE', credentials: 'Certified Diabetes Educator', isProfessional: true, isPeerLed: false },
    capacity: 20,
    currentMembers: 14,
    acceptingNewMembers: true,
    cost: 'free',
    language: ['English', 'Spanish'],
    contactInfo: { phone: '555-0123', email: 'diabetes-support@example.com' },
    tags: ['diabetes', 'chronic-disease', 'lifestyle', 'nutrition'],
  },
  {
    id: 'sg_2',
    name: 'Heart Health Warriors',
    description: 'Support group for heart disease survivors and those managing cardiovascular conditions.',
    condition: ['Heart Failure', 'Coronary Artery Disease', 'Post-MI', 'Arrhythmia'],
    format: 'in-person',
    location: 'Cardiac Rehab Center',
    meetingSchedule: { frequency: 'biweekly', dayOfWeek: 'Thursday', time: '10:00 AM', duration: 60 },
    facilitator: { name: 'John Smith', isProfessional: false, isPeerLed: true },
    capacity: 15,
    currentMembers: 11,
    acceptingNewMembers: true,
    cost: 'free',
    language: ['English'],
    contactInfo: { phone: '555-0124', email: 'heart-warriors@example.com' },
    tags: ['heart-disease', 'cardiac', 'recovery', 'lifestyle'],
  },
  {
    id: 'sg_3',
    name: 'Cancer Survivors Network',
    description: 'A supportive community for cancer survivors at any stage of their journey.',
    condition: ['Cancer - Any Type'],
    format: 'virtual',
    virtualPlatform: 'Microsoft Teams',
    meetingSchedule: { frequency: 'weekly', dayOfWeek: 'Wednesday', time: '7:00 PM', duration: 75 },
    facilitator: { name: 'Dr. Sarah Chen, LCSW', credentials: 'Oncology Social Worker', isProfessional: true, isPeerLed: false },
    capacity: 25,
    currentMembers: 18,
    acceptingNewMembers: true,
    cost: 'free',
    language: ['English'],
    contactInfo: { email: 'cancer-support@example.com', website: 'www.cancersupportnetwork.org' },
    tags: ['cancer', 'oncology', 'survivorship', 'coping'],
  },
  {
    id: 'sg_4',
    name: 'Caregiver Support Circle',
    description: 'Support and respite for family caregivers of loved ones with chronic illness or dementia.',
    condition: ['Caregiver'],
    format: 'hybrid',
    location: 'Senior Center',
    virtualPlatform: 'Zoom',
    meetingSchedule: { frequency: 'monthly', dayOfWeek: 'Saturday', time: '10:00 AM', duration: 90 },
    capacity: 20,
    currentMembers: 12,
    acceptingNewMembers: true,
    cost: 'free',
    language: ['English'],
    contactInfo: { phone: '555-0126', email: 'caregiver-support@example.com' },
    tags: ['caregiver', 'family', 'respite', 'dementia', 'chronic-illness'],
  },
];

// =============================================================================
// Social Support Service Class
// =============================================================================

export class SocialSupportService extends EventEmitter {
  private profiles: Map<string, PatientSocialProfile> = new Map();
  private supportGroups: Map<string, SupportGroup> = new Map();
  private peerMentors: Map<string, PeerMentor> = new Map();
  private volunteers: Map<string, Volunteer> = new Map();

  constructor() {
    super();
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    for (const group of SAMPLE_SUPPORT_GROUPS) {
      this.supportGroups.set(group.id, group);
    }
  }

  // ===========================================================================
  // Loneliness Screening
  // ===========================================================================

  administerLonelinessScreening(
    patientId: string,
    responses: { questionIndex: number; response: number }[] // 1=Hardly ever, 2=Some of the time, 3=Often
  ): SocialAssessment {
    const totalScore = responses.reduce((sum, r) => sum + r.response, 0);
    
    // UCLA 3-Item: 3-9 scale, higher = more lonely
    let interpretation: string;
    let riskLevel: 'low' | 'moderate' | 'high';
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    if (totalScore <= 4) {
      interpretation = 'Low loneliness';
      riskLevel = 'low';
      recommendations.push('Continue current social engagement');
    } else if (totalScore <= 6) {
      interpretation = 'Moderate loneliness';
      riskLevel = 'moderate';
      recommendations.push('Consider joining a support group');
      recommendations.push('Explore peer support options');
      riskFactors.push('Moderate loneliness score');
    } else {
      interpretation = 'High loneliness - intervention recommended';
      riskLevel = 'high';
      recommendations.push('Immediate outreach recommended');
      recommendations.push('Consider volunteer visitor program');
      recommendations.push('Refer to social services');
      recommendations.push('Screen for depression');
      riskFactors.push('High loneliness score');
    }

    const assessment: SocialAssessment = {
      id: `assess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      assessmentDate: new Date(),
      lonelinessScore: totalScore,
      screeningTool: 'UCLA 3-Item Loneliness Scale',
      responses: responses.map((r, i) => ({
        question: UCLA_LONELINESS_QUESTIONS[i].question,
        response: r.response,
        interpretation: UCLA_LONELINESS_QUESTIONS[i].options[r.response - 1],
      })),
      riskFactors,
      protectiveFactors: [],
      recommendations,
    };

    // Update profile
    const profile = this.profiles.get(patientId);
    if (profile) {
      profile.socialAssessment = assessment;
      profile.riskLevel = riskLevel;
    }

    this.emit('lonelinessScreeningCompleted', { patientId, assessment });

    if (riskLevel === 'high') {
      this.emit('highLonelinessAlert', { patientId, assessment });
    }

    return assessment;
  }

  // ===========================================================================
  // Support Group Matching
  // ===========================================================================

  findSupportGroups(
    patientId: string,
    filters?: {
      condition?: string;
      format?: 'in-person' | 'virtual' | 'hybrid';
      language?: string;
    }
  ): { group: SupportGroup; matchScore: number; matchReasons: string[] }[] {
    const profile = this.profiles.get(patientId);
    const groups = Array.from(this.supportGroups.values());
    const matches: { group: SupportGroup; matchScore: number; matchReasons: string[] }[] = [];

    for (const group of groups) {
      if (!group.acceptingNewMembers) continue;

      let matchScore = 50;
      const matchReasons: string[] = [];

      // Condition match
      if (profile?.healthConditions) {
        const conditionMatch = profile.healthConditions.some(c =>
          group.condition.some(gc => gc.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(gc.toLowerCase()))
        );
        if (conditionMatch) {
          matchScore += 30;
          matchReasons.push('Matches your health condition');
        }
      }

      // Format preference
      if (profile?.preferences?.preferredContactMethod) {
        if (profile.preferences.preferredContactMethod === 'in-person' && group.format !== 'virtual') {
          matchScore += 10;
          matchReasons.push('In-person option available');
        }
        if (profile.preferences.preferredContactMethod === 'video' && group.format !== 'in-person') {
          matchScore += 10;
          matchReasons.push('Virtual option available');
        }
      }

      // Language match
      if (profile?.demographics?.language) {
        if (group.language.includes(profile.demographics.language)) {
          matchScore += 15;
          matchReasons.push(`Available in ${profile.demographics.language}`);
        }
      }

      // Apply filters
      if (filters?.condition && !group.condition.some(c => c.toLowerCase().includes(filters.condition!.toLowerCase()))) {
        continue;
      }
      if (filters?.format && group.format !== filters.format && group.format !== 'hybrid') {
        continue;
      }
      if (filters?.language && !group.language.includes(filters.language)) {
        continue;
      }

      // Peer-led bonus if patient prefers
      if (group.facilitator?.isPeerLed) {
        matchScore += 5;
        matchReasons.push('Peer-led group');
      }

      matches.push({ group, matchScore, matchReasons });
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  // ===========================================================================
  // Peer Matching
  // ===========================================================================

  findPeerMatches(
    patientId: string
  ): { mentor: PeerMentor; matchScore: number; matchReasons: string[] }[] {
    const profile = this.profiles.get(patientId);
    if (!profile) return [];

    const mentors = Array.from(this.peerMentors.values()).filter(
      m => m.status === 'active' && m.activeMatches < m.maxMatches
    );

    const matches: { mentor: PeerMentor; matchScore: number; matchReasons: string[] }[] = [];

    for (const mentor of mentors) {
      let matchScore = 50;
      const matchReasons: string[] = [];

      // Condition match
      const conditionMatch = profile.healthConditions.some(c =>
        mentor.condition.some(mc => mc.toLowerCase().includes(c.toLowerCase()))
      );
      if (conditionMatch) {
        matchScore += 35;
        matchReasons.push('Same health condition');
      }

      // Language match
      if (mentor.languages.includes(profile.demographics.language)) {
        matchScore += 15;
        matchReasons.push(`Speaks ${profile.demographics.language}`);
      }

      // Experience level
      if (mentor.yearsWithCondition >= 5) {
        matchScore += 10;
        matchReasons.push('Experienced mentor');
      }

      // Rating
      if (mentor.rating >= 4.5) {
        matchScore += 10;
        matchReasons.push('Highly rated');
      }

      // Availability match
      if (profile.preferences.preferredMeetingTime) {
        const availabilityMatch = mentor.availability.some(a =>
          profile.preferences.preferredMeetingTime.includes(a)
        );
        if (availabilityMatch) {
          matchScore += 5;
          matchReasons.push('Schedule compatibility');
        }
      }

      matches.push({ mentor, matchScore, matchReasons });
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  requestPeerConnection(
    patientId: string,
    mentorId: string,
    connectionType: PeerConnection['connectionType']
  ): PeerConnection {
    const mentor = this.peerMentors.get(mentorId);
    if (!mentor) throw new Error('Mentor not found');

    const connection: PeerConnection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      peerMentorId: mentorId,
      peerName: mentor.name,
      matchReason: ['Requested by patient'],
      matchScore: 100,
      status: 'pending',
      connectionType,
      interactionCount: 0,
    };

    const profile = this.profiles.get(patientId);
    if (profile) {
      profile.peerConnections.push(connection);
    }

    this.emit('peerConnectionRequested', { patientId, connection });

    return connection;
  }

  // ===========================================================================
  // Volunteer Visitor Program
  // ===========================================================================

  requestVolunteerVisit(
    patientId: string,
    visitType: VolunteerVisit['visitType'],
    preferredDate: Date,
    duration: number = 60
  ): VolunteerVisit | null {
    const profile = this.profiles.get(patientId);
    if (!profile) return null;

    // Find available volunteer
    const volunteers = Array.from(this.volunteers.values()).filter(
      v => v.status === 'active' && v.services.includes(visitType)
    );

    if (volunteers.length === 0) {
      this.emit('noVolunteersAvailable', { patientId, visitType });
      return null;
    }

    // Simple matching - in production would be more sophisticated
    const volunteer = volunteers[0];

    const visit: VolunteerVisit = {
      id: `visit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      volunteerId: volunteer.id,
      volunteerName: volunteer.name,
      scheduledDate: preferredDate,
      duration,
      visitType,
      status: 'scheduled',
    };

    profile.volunteerVisits.push(visit);
    this.emit('volunteerVisitScheduled', { patientId, visit });

    return visit;
  }

  recordVolunteerVisitOutcome(
    patientId: string,
    visitId: string,
    status: VolunteerVisit['status'],
    feedback?: VolunteerVisit['patientFeedback'],
    notes?: string
  ): void {
    const profile = this.profiles.get(patientId);
    if (!profile) return;

    const visit = profile.volunteerVisits.find(v => v.id === visitId);
    if (visit) {
      visit.status = status;
      visit.patientFeedback = feedback;
      visit.notes = notes;

      this.emit('volunteerVisitCompleted', { patientId, visit });
    }
  }

  // ===========================================================================
  // Social Interventions
  // ===========================================================================

  createIntervention(
    patientId: string,
    type: InterventionType,
    goals: string[],
    provider?: string
  ): SocialIntervention {
    const intervention: SocialIntervention = {
      id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      startDate: new Date(),
      status: 'active',
      goals,
      provider,
    };

    const profile = this.profiles.get(patientId);
    if (profile) {
      profile.interventions.push(intervention);
    }

    this.emit('interventionCreated', { patientId, intervention });

    return intervention;
  }

  // ===========================================================================
  // Profile Management
  // ===========================================================================

  getProfile(patientId: string): PatientSocialProfile | undefined {
    return this.profiles.get(patientId);
  }

  createOrUpdateProfile(
    patientId: string,
    data: Partial<PatientSocialProfile>
  ): PatientSocialProfile {
    const existing = this.profiles.get(patientId) || {
      patientId,
      demographics: {
        ageRange: '',
        gender: '',
        language: 'English',
        location: '',
        livingArrangement: 'other',
        employmentStatus: 'employed',
        hasTransportation: true,
        hasTechnology: true,
        mobilityLevel: 'independent',
      },
      healthConditions: [],
      socialAssessment: undefined as any,
      interests: [],
      preferences: {
        preferredContactMethod: 'any',
        preferredMeetingTime: [],
        groupVsIndividual: 'both',
        topicsOfInterest: [],
        peerMatchPreferences: {
          sameCondition: true,
          sameAgeRange: false,
          sameGender: false,
          sameLanguage: true,
          experienceLevel: 'any',
        },
      },
      supportNetwork: [],
      supportGroupMemberships: [],
      peerConnections: [],
      volunteerVisits: [],
      interventions: [],
      riskLevel: 'low',
    };

    const updated: PatientSocialProfile = {
      ...existing,
      ...data,
    };

    this.profiles.set(patientId, updated);
    return updated;
  }

  // ===========================================================================
  // Support Network Assessment
  // ===========================================================================

  assessSupportNetwork(patientId: string): {
    networkSize: number;
    networkStrength: 'strong' | 'moderate' | 'weak' | 'isolated';
    gaps: string[];
    recommendations: string[];
  } {
    const profile = this.profiles.get(patientId);
    if (!profile) {
      return {
        networkSize: 0,
        networkStrength: 'isolated',
        gaps: ['No profile found'],
        recommendations: ['Complete social assessment'],
      };
    }

    const network = profile.supportNetwork;
    const gaps: string[] = [];
    const recommendations: string[] = [];

    // Analyze network
    const supportiveMembers = network.filter(m => m.qualityOfRelationship === 'supportive');
    const frequentContacts = network.filter(m => m.contactFrequency === 'daily' || m.contactFrequency === 'weekly');
    const emergencyContacts = network.filter(m => m.canBeEmergencyContact);

    // Determine strength
    let networkStrength: 'strong' | 'moderate' | 'weak' | 'isolated';
    
    if (supportiveMembers.length >= 3 && frequentContacts.length >= 2) {
      networkStrength = 'strong';
    } else if (supportiveMembers.length >= 1 && frequentContacts.length >= 1) {
      networkStrength = 'moderate';
    } else if (network.length > 0) {
      networkStrength = 'weak';
    } else {
      networkStrength = 'isolated';
    }

    // Identify gaps
    if (emergencyContacts.length === 0) {
      gaps.push('No emergency contacts identified');
      recommendations.push('Identify at least one emergency contact');
    }

    if (!network.some(m => m.supportType.includes('emotional'))) {
      gaps.push('No emotional support identified');
      recommendations.push('Consider peer support or support group');
    }

    if (!network.some(m => m.supportType.includes('practical'))) {
      gaps.push('No practical support identified');
      recommendations.push('Explore community resources for practical assistance');
    }

    if (frequentContacts.length === 0) {
      gaps.push('No regular social contact');
      recommendations.push('Consider volunteer visitor program');
      recommendations.push('Join condition-specific support group');
    }

    if (networkStrength === 'isolated' || networkStrength === 'weak') {
      recommendations.push('Complete loneliness screening');
      recommendations.push('Referral to social services');
    }

    return {
      networkSize: network.length,
      networkStrength,
      gaps,
      recommendations,
    };
  }

  // ===========================================================================
  // Analytics
  // ===========================================================================

  getProgramStatistics(): {
    totalProfiles: number;
    highRiskPatients: number;
    activePeerConnections: number;
    activeInterventions: number;
    supportGroupReferrals: number;
    volunteerVisitsThisMonth: number;
  } {
    const profiles = Array.from(this.profiles.values());
    const thisMonth = new Date();
    thisMonth.setDate(1);

    return {
      totalProfiles: profiles.length,
      highRiskPatients: profiles.filter(p => p.riskLevel === 'high').length,
      activePeerConnections: profiles.reduce(
        (sum, p) => sum + p.peerConnections.filter(c => c.status === 'active').length, 0
      ),
      activeInterventions: profiles.reduce(
        (sum, p) => sum + p.interventions.filter(i => i.status === 'active').length, 0
      ),
      supportGroupReferrals: profiles.reduce(
        (sum, p) => sum + p.supportGroupMemberships.length, 0
      ),
      volunteerVisitsThisMonth: profiles.reduce(
        (sum, p) => sum + p.volunteerVisits.filter(
          v => v.scheduledDate >= thisMonth && v.status === 'completed'
        ).length, 0
      ),
    };
  }
}

// Singleton instance
export const socialSupportService = new SocialSupportService();
export default socialSupportService;
