// =============================================================================
// ATTENDING AI - Family Health Hub Service
// apps/shared/services/patient-engagement/FamilyHealthHubService.ts
//
// Multi-member family health management including:
// - Family member profiles with relationships
// - Pediatric milestones and growth tracking
// - Vaccination schedules for all ages
// - Genetic risk sharing and inheritance tracking
// - Caregiver coordination for elderly/disabled
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface FamilyUnit {
  id: string;
  name: string;
  primaryAccountHolder: string;
  members: FamilyMember[];
  sharedConditions: SharedCondition[];
  sharedAlerts: FamilyAlert[];
  caregiverAssignments: CaregiverAssignment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyMember {
  id: string;
  userId?: string; // Linked user account if exists
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  relationship: FamilyRelationship;
  isMinor: boolean;
  isPrimaryCaregiver: boolean;
  needsCaregiver: boolean;
  healthProfile: MemberHealthProfile;
  accessPermissions: AccessPermission[];
  profilePhoto?: string;
}

export type FamilyRelationship =
  | 'self'
  | 'spouse'
  | 'child'
  | 'parent'
  | 'grandparent'
  | 'grandchild'
  | 'sibling'
  | 'aunt-uncle'
  | 'niece-nephew'
  | 'cousin'
  | 'in-law'
  | 'step-child'
  | 'step-parent'
  | 'guardian'
  | 'ward'
  | 'other';

export interface MemberHealthProfile {
  bloodType?: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  immunizations: ImmunizationRecord[];
  geneticRisks?: GeneticRisk[];
  pediatricMilestones?: PediatricMilestone[];
  growthRecords?: GrowthRecord[];
  primaryCareProvider?: string;
  insuranceInfo?: InsuranceInfo;
  emergencyContacts: EmergencyContact[];
}

export interface ImmunizationRecord {
  vaccine: string;
  dateGiven: Date;
  doseNumber?: number;
  totalDoses?: number;
  nextDueDate?: Date;
  administeredBy?: string;
  lotNumber?: string;
  site?: string;
  notes?: string;
}

export interface GeneticRisk {
  condition: string;
  inheritancePattern: 'autosomal-dominant' | 'autosomal-recessive' | 'x-linked' | 'multifactorial' | 'unknown';
  riskLevel: 'low' | 'moderate' | 'high';
  affectedRelatives: string[];
  recommendedScreenings: string[];
  geneticTestAvailable: boolean;
  notes?: string;
}

export interface PediatricMilestone {
  category: MilestoneCategory;
  milestone: string;
  expectedAgeMonths: number;
  achievedDate?: Date;
  achievedAgeMonths?: number;
  status: 'pending' | 'achieved' | 'delayed' | 'not-applicable';
  notes?: string;
  concernLevel?: 'none' | 'monitor' | 'evaluate';
}

export type MilestoneCategory =
  | 'gross-motor'
  | 'fine-motor'
  | 'language'
  | 'cognitive'
  | 'social-emotional'
  | 'self-care';

export interface GrowthRecord {
  date: Date;
  ageMonths: number;
  weight?: { value: number; unit: 'kg' | 'lb'; percentile?: number };
  height?: { value: number; unit: 'cm' | 'in'; percentile?: number };
  headCircumference?: { value: number; unit: 'cm'; percentile?: number };
  bmi?: { value: number; percentile?: number };
  notes?: string;
}

export interface InsuranceInfo {
  provider: string;
  planName: string;
  memberId: string;
  groupNumber?: string;
  effectiveDate: Date;
  isPrimary: boolean;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

export interface AccessPermission {
  grantedTo: string; // member ID
  permissionLevel: 'view' | 'manage' | 'full';
  categories: string[]; // which health categories they can access
  expiresAt?: Date;
}

export interface SharedCondition {
  condition: string;
  affectedMembers: string[]; // member IDs
  inheritancePattern?: string;
  notes?: string;
}

export interface FamilyAlert {
  id: string;
  type: 'vaccination-due' | 'appointment-reminder' | 'medication-refill' | 'milestone-check' | 'screening-due' | 'genetic-screening';
  memberId: string;
  memberName: string;
  title: string;
  description: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'dismissed' | 'completed';
  createdAt: Date;
}

export interface CaregiverAssignment {
  caregiverId: string; // member ID
  careRecipientId: string; // member ID
  role: 'primary' | 'secondary' | 'backup';
  responsibilities: string[];
  schedule?: CareSchedule[];
  startDate: Date;
  endDate?: Date;
  notes?: string;
}

export interface CareSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  tasks: string[];
}

// =============================================================================
// CDC Vaccination Schedules
// =============================================================================

interface VaccineSchedule {
  vaccine: string;
  doses: { doseNumber: number; ageMonths: number; ageYears?: number }[];
  catchUpAvailable: boolean;
  notes?: string;
}

const PEDIATRIC_VACCINE_SCHEDULE: VaccineSchedule[] = [
  {
    vaccine: 'Hepatitis B (HepB)',
    doses: [
      { doseNumber: 1, ageMonths: 0 },
      { doseNumber: 2, ageMonths: 1 },
      { doseNumber: 3, ageMonths: 6 },
    ],
    catchUpAvailable: true,
  },
  {
    vaccine: 'Rotavirus (RV)',
    doses: [
      { doseNumber: 1, ageMonths: 2 },
      { doseNumber: 2, ageMonths: 4 },
      { doseNumber: 3, ageMonths: 6 },
    ],
    catchUpAvailable: true,
    notes: 'Maximum age for final dose is 8 months',
  },
  {
    vaccine: 'DTaP (Diphtheria, Tetanus, Pertussis)',
    doses: [
      { doseNumber: 1, ageMonths: 2 },
      { doseNumber: 2, ageMonths: 4 },
      { doseNumber: 3, ageMonths: 6 },
      { doseNumber: 4, ageMonths: 15 },
      { doseNumber: 5, ageMonths: 48 },
    ],
    catchUpAvailable: true,
  },
  {
    vaccine: 'Haemophilus influenzae type b (Hib)',
    doses: [
      { doseNumber: 1, ageMonths: 2 },
      { doseNumber: 2, ageMonths: 4 },
      { doseNumber: 3, ageMonths: 6 },
      { doseNumber: 4, ageMonths: 12 },
    ],
    catchUpAvailable: true,
  },
  {
    vaccine: 'Pneumococcal conjugate (PCV)',
    doses: [
      { doseNumber: 1, ageMonths: 2 },
      { doseNumber: 2, ageMonths: 4 },
      { doseNumber: 3, ageMonths: 6 },
      { doseNumber: 4, ageMonths: 12 },
    ],
    catchUpAvailable: true,
  },
  {
    vaccine: 'Inactivated Poliovirus (IPV)',
    doses: [
      { doseNumber: 1, ageMonths: 2 },
      { doseNumber: 2, ageMonths: 4 },
      { doseNumber: 3, ageMonths: 6 },
      { doseNumber: 4, ageMonths: 48 },
    ],
    catchUpAvailable: true,
  },
  {
    vaccine: 'Influenza (Flu)',
    doses: [
      { doseNumber: 1, ageMonths: 6 },
    ],
    catchUpAvailable: true,
    notes: 'Annual vaccination recommended',
  },
  {
    vaccine: 'MMR (Measles, Mumps, Rubella)',
    doses: [
      { doseNumber: 1, ageMonths: 12 },
      { doseNumber: 2, ageMonths: 48 },
    ],
    catchUpAvailable: true,
  },
  {
    vaccine: 'Varicella (Chickenpox)',
    doses: [
      { doseNumber: 1, ageMonths: 12 },
      { doseNumber: 2, ageMonths: 48 },
    ],
    catchUpAvailable: true,
  },
  {
    vaccine: 'Hepatitis A (HepA)',
    doses: [
      { doseNumber: 1, ageMonths: 12 },
      { doseNumber: 2, ageMonths: 18 },
    ],
    catchUpAvailable: true,
  },
  {
    vaccine: 'HPV (Human Papillomavirus)',
    doses: [
      { doseNumber: 1, ageMonths: 132, ageYears: 11 },
      { doseNumber: 2, ageMonths: 138 },
    ],
    catchUpAvailable: true,
    notes: 'Recommended at age 11-12, catch-up through age 26',
  },
  {
    vaccine: 'Meningococcal (MenACWY)',
    doses: [
      { doseNumber: 1, ageMonths: 132, ageYears: 11 },
      { doseNumber: 2, ageMonths: 192, ageYears: 16 },
    ],
    catchUpAvailable: true,
  },
  {
    vaccine: 'Tdap (Tetanus, Diphtheria, Pertussis booster)',
    doses: [
      { doseNumber: 1, ageMonths: 132, ageYears: 11 },
    ],
    catchUpAvailable: true,
  },
];

const ADULT_VACCINE_SCHEDULE: VaccineSchedule[] = [
  {
    vaccine: 'Influenza (Flu)',
    doses: [{ doseNumber: 1, ageMonths: 0 }],
    catchUpAvailable: true,
    notes: 'Annual vaccination for all adults',
  },
  {
    vaccine: 'Td/Tdap',
    doses: [{ doseNumber: 1, ageMonths: 0 }],
    catchUpAvailable: true,
    notes: 'Td booster every 10 years; Tdap once, then Td',
  },
  {
    vaccine: 'Shingles (Shingrix)',
    doses: [
      { doseNumber: 1, ageMonths: 600, ageYears: 50 },
      { doseNumber: 2, ageMonths: 602 },
    ],
    catchUpAvailable: true,
    notes: 'Two doses, 2-6 months apart, for adults 50+',
  },
  {
    vaccine: 'Pneumococcal (PCV/PPSV)',
    doses: [{ doseNumber: 1, ageMonths: 780, ageYears: 65 }],
    catchUpAvailable: true,
    notes: 'Recommended for adults 65+ or with certain conditions',
  },
  {
    vaccine: 'RSV Vaccine',
    doses: [{ doseNumber: 1, ageMonths: 720, ageYears: 60 }],
    catchUpAvailable: true,
    notes: 'Recommended for adults 60+',
  },
  {
    vaccine: 'COVID-19',
    doses: [{ doseNumber: 1, ageMonths: 72, ageYears: 6 }],
    catchUpAvailable: true,
    notes: 'Updated vaccine recommended annually',
  },
];

// =============================================================================
// Pediatric Developmental Milestones
// =============================================================================

const DEVELOPMENTAL_MILESTONES: PediatricMilestone[] = [
  // 2 months
  { category: 'social-emotional', milestone: 'Begins to smile at people', expectedAgeMonths: 2, status: 'pending' },
  { category: 'language', milestone: 'Coos, makes gurgling sounds', expectedAgeMonths: 2, status: 'pending' },
  { category: 'cognitive', milestone: 'Pays attention to faces', expectedAgeMonths: 2, status: 'pending' },
  { category: 'gross-motor', milestone: 'Can hold head up', expectedAgeMonths: 2, status: 'pending' },
  
  // 4 months
  { category: 'social-emotional', milestone: 'Smiles spontaneously', expectedAgeMonths: 4, status: 'pending' },
  { category: 'language', milestone: 'Babbles with expression', expectedAgeMonths: 4, status: 'pending' },
  { category: 'fine-motor', milestone: 'Reaches for toy with one hand', expectedAgeMonths: 4, status: 'pending' },
  { category: 'gross-motor', milestone: 'Holds head steady, unsupported', expectedAgeMonths: 4, status: 'pending' },
  
  // 6 months
  { category: 'social-emotional', milestone: 'Knows familiar faces', expectedAgeMonths: 6, status: 'pending' },
  { category: 'language', milestone: 'Responds to sounds by making sounds', expectedAgeMonths: 6, status: 'pending' },
  { category: 'cognitive', milestone: 'Brings things to mouth', expectedAgeMonths: 6, status: 'pending' },
  { category: 'gross-motor', milestone: 'Rolls over in both directions', expectedAgeMonths: 6, status: 'pending' },
  { category: 'gross-motor', milestone: 'Begins to sit without support', expectedAgeMonths: 6, status: 'pending' },
  
  // 9 months
  { category: 'social-emotional', milestone: 'May be afraid of strangers', expectedAgeMonths: 9, status: 'pending' },
  { category: 'language', milestone: 'Understands "no"', expectedAgeMonths: 9, status: 'pending' },
  { category: 'cognitive', milestone: 'Watches the path of something as it falls', expectedAgeMonths: 9, status: 'pending' },
  { category: 'fine-motor', milestone: 'Picks things up between thumb and index finger', expectedAgeMonths: 9, status: 'pending' },
  { category: 'gross-motor', milestone: 'Stands, holding on', expectedAgeMonths: 9, status: 'pending' },
  
  // 12 months
  { category: 'social-emotional', milestone: 'Is shy or nervous with strangers', expectedAgeMonths: 12, status: 'pending' },
  { category: 'language', milestone: 'Says "mama" and "dada"', expectedAgeMonths: 12, status: 'pending' },
  { category: 'cognitive', milestone: 'Explores things in different ways', expectedAgeMonths: 12, status: 'pending' },
  { category: 'fine-motor', milestone: 'Puts things in a container', expectedAgeMonths: 12, status: 'pending' },
  { category: 'gross-motor', milestone: 'Pulls up to stand, walks holding on', expectedAgeMonths: 12, status: 'pending' },
  
  // 18 months
  { category: 'social-emotional', milestone: 'Likes to hand things to others', expectedAgeMonths: 18, status: 'pending' },
  { category: 'language', milestone: 'Says several single words', expectedAgeMonths: 18, status: 'pending' },
  { category: 'cognitive', milestone: 'Knows what ordinary things are for', expectedAgeMonths: 18, status: 'pending' },
  { category: 'fine-motor', milestone: 'Scribbles on own', expectedAgeMonths: 18, status: 'pending' },
  { category: 'gross-motor', milestone: 'Walks alone', expectedAgeMonths: 18, status: 'pending' },
  
  // 24 months
  { category: 'social-emotional', milestone: 'Copies others, especially adults', expectedAgeMonths: 24, status: 'pending' },
  { category: 'language', milestone: 'Points to things in a book', expectedAgeMonths: 24, status: 'pending' },
  { category: 'language', milestone: 'Says sentences with 2 to 4 words', expectedAgeMonths: 24, status: 'pending' },
  { category: 'cognitive', milestone: 'Sorts shapes and colors', expectedAgeMonths: 24, status: 'pending' },
  { category: 'gross-motor', milestone: 'Kicks a ball', expectedAgeMonths: 24, status: 'pending' },
  { category: 'gross-motor', milestone: 'Runs', expectedAgeMonths: 24, status: 'pending' },
  
  // 36 months (3 years)
  { category: 'social-emotional', milestone: 'Shows affection for friends', expectedAgeMonths: 36, status: 'pending' },
  { category: 'language', milestone: 'Talks well enough for strangers to understand', expectedAgeMonths: 36, status: 'pending' },
  { category: 'cognitive', milestone: 'Does puzzles with 3 or 4 pieces', expectedAgeMonths: 36, status: 'pending' },
  { category: 'fine-motor', milestone: 'Turns book pages one at a time', expectedAgeMonths: 36, status: 'pending' },
  { category: 'gross-motor', milestone: 'Climbs well', expectedAgeMonths: 36, status: 'pending' },
  { category: 'gross-motor', milestone: 'Pedals a tricycle', expectedAgeMonths: 36, status: 'pending' },
  { category: 'self-care', milestone: 'Dresses and undresses self', expectedAgeMonths: 36, status: 'pending' },
  
  // 48 months (4 years)
  { category: 'social-emotional', milestone: 'Would rather play with others than alone', expectedAgeMonths: 48, status: 'pending' },
  { category: 'language', milestone: 'Tells stories', expectedAgeMonths: 48, status: 'pending' },
  { category: 'cognitive', milestone: 'Names some colors and numbers', expectedAgeMonths: 48, status: 'pending' },
  { category: 'fine-motor', milestone: 'Draws a person with 2-4 body parts', expectedAgeMonths: 48, status: 'pending' },
  { category: 'gross-motor', milestone: 'Hops and stands on one foot up to 2 seconds', expectedAgeMonths: 48, status: 'pending' },
  
  // 60 months (5 years)
  { category: 'social-emotional', milestone: 'Wants to please friends', expectedAgeMonths: 60, status: 'pending' },
  { category: 'language', milestone: 'Speaks very clearly', expectedAgeMonths: 60, status: 'pending' },
  { category: 'cognitive', milestone: 'Counts 10 or more things', expectedAgeMonths: 60, status: 'pending' },
  { category: 'fine-motor', milestone: 'Copies a triangle and other shapes', expectedAgeMonths: 60, status: 'pending' },
  { category: 'gross-motor', milestone: 'Hops, may be able to skip', expectedAgeMonths: 60, status: 'pending' },
  { category: 'self-care', milestone: 'Uses fork and spoon, sometimes knife', expectedAgeMonths: 60, status: 'pending' },
];

// =============================================================================
// Family Health Hub Service Class
// =============================================================================

export class FamilyHealthHubService extends EventEmitter {
  private families: Map<string, FamilyUnit> = new Map();

  constructor() {
    super();
  }

  // ===========================================================================
  // Family Management
  // ===========================================================================

  createFamily(
    name: string,
    primaryAccountHolder: string,
    initialMembers?: Omit<FamilyMember, 'id' | 'isMinor' | 'healthProfile'>[]
  ): FamilyUnit {
    const id = `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const family: FamilyUnit = {
      id,
      name,
      primaryAccountHolder,
      members: [],
      sharedConditions: [],
      sharedAlerts: [],
      caregiverAssignments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add initial members
    if (initialMembers) {
      for (const member of initialMembers) {
        this.addFamilyMember(id, member);
      }
    }

    this.families.set(id, family);
    this.emit('familyCreated', family);
    return family;
  }

  addFamilyMember(
    familyId: string,
    member: Omit<FamilyMember, 'id' | 'isMinor' | 'healthProfile'>
  ): FamilyMember {
    const family = this.families.get(familyId);
    if (!family) throw new Error('Family not found');

    const id = `member_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const age = this.calculateAge(member.dateOfBirth);
    const isMinor = age < 18;

    const fullMember: FamilyMember = {
      ...member,
      id,
      isMinor,
      healthProfile: {
        allergies: [],
        conditions: [],
        medications: [],
        immunizations: [],
        emergencyContacts: [],
        pediatricMilestones: isMinor ? this.initializeMilestones(age) : undefined,
        growthRecords: isMinor ? [] : undefined,
      },
      accessPermissions: [],
    };

    family.members.push(fullMember);
    family.updatedAt = new Date();

    // Generate vaccination alerts
    this.checkVaccinationSchedule(family, fullMember);

    this.emit('memberAdded', { family, member: fullMember });
    return fullMember;
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  private calculateAgeMonths(birthDate: Date): number {
    const today = new Date();
    const months = (today.getFullYear() - birthDate.getFullYear()) * 12 +
                   (today.getMonth() - birthDate.getMonth());
    return months;
  }

  // ===========================================================================
  // Vaccination Management
  // ===========================================================================

  private checkVaccinationSchedule(family: FamilyUnit, member: FamilyMember): void {
    const ageMonths = this.calculateAgeMonths(member.dateOfBirth);
    const schedule = ageMonths < 216 ? PEDIATRIC_VACCINE_SCHEDULE : ADULT_VACCINE_SCHEDULE;

    for (const vaccine of schedule) {
      for (const dose of vaccine.doses) {
        // Check if due or overdue
        if (ageMonths >= dose.ageMonths) {
          const hasReceived = member.healthProfile.immunizations.some(
            i => i.vaccine === vaccine.vaccine && i.doseNumber === dose.doseNumber
          );

          if (!hasReceived) {
            const isOverdue = ageMonths > dose.ageMonths + 2; // 2 months grace period
            
            family.sharedAlerts.push({
              id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              type: 'vaccination-due',
              memberId: member.id,
              memberName: `${member.firstName} ${member.lastName}`,
              title: `${vaccine.vaccine} - Dose ${dose.doseNumber}`,
              description: isOverdue 
                ? `${member.firstName}'s ${vaccine.vaccine} (dose ${dose.doseNumber}) is overdue`
                : `${member.firstName} is due for ${vaccine.vaccine} (dose ${dose.doseNumber})`,
              priority: isOverdue ? 'high' : 'medium',
              status: 'active',
              createdAt: new Date(),
            });
          }
        }
      }
    }
  }

  recordImmunization(
    familyId: string,
    memberId: string,
    immunization: Omit<ImmunizationRecord, 'nextDueDate'>
  ): ImmunizationRecord {
    const family = this.families.get(familyId);
    if (!family) throw new Error('Family not found');

    const member = family.members.find(m => m.id === memberId);
    if (!member) throw new Error('Member not found');

    // Find next dose due date
    const schedule = [...PEDIATRIC_VACCINE_SCHEDULE, ...ADULT_VACCINE_SCHEDULE]
      .find(v => v.vaccine === immunization.vaccine);
    
    let nextDueDate: Date | undefined;
    if (schedule && immunization.doseNumber) {
      const nextDose = schedule.doses.find(d => d.doseNumber === immunization.doseNumber + 1);
      if (nextDose) {
        nextDueDate = new Date(member.dateOfBirth);
        nextDueDate.setMonth(nextDueDate.getMonth() + nextDose.ageMonths);
      }
    }

    const record: ImmunizationRecord = {
      ...immunization,
      nextDueDate,
    };

    member.healthProfile.immunizations.push(record);
    family.updatedAt = new Date();

    // Clear related alert
    const alertIndex = family.sharedAlerts.findIndex(
      a => a.memberId === memberId && 
           a.type === 'vaccination-due' && 
           a.title.includes(immunization.vaccine)
    );
    if (alertIndex >= 0) {
      family.sharedAlerts[alertIndex].status = 'completed';
    }

    this.emit('immunizationRecorded', { family, member, record });
    return record;
  }

  getVaccinationSchedule(familyId: string, memberId: string): {
    completed: ImmunizationRecord[];
    due: { vaccine: string; doseNumber: number; dueDate: Date }[];
    upcoming: { vaccine: string; doseNumber: number; dueDate: Date }[];
  } {
    const family = this.families.get(familyId);
    if (!family) throw new Error('Family not found');

    const member = family.members.find(m => m.id === memberId);
    if (!member) throw new Error('Member not found');

    const ageMonths = this.calculateAgeMonths(member.dateOfBirth);
    const schedule = ageMonths < 216 ? PEDIATRIC_VACCINE_SCHEDULE : ADULT_VACCINE_SCHEDULE;
    
    const completed = member.healthProfile.immunizations;
    const due: { vaccine: string; doseNumber: number; dueDate: Date }[] = [];
    const upcoming: { vaccine: string; doseNumber: number; dueDate: Date }[] = [];

    for (const vaccine of schedule) {
      for (const dose of vaccine.doses) {
        const hasReceived = completed.some(
          i => i.vaccine === vaccine.vaccine && i.doseNumber === dose.doseNumber
        );

        if (!hasReceived) {
          const dueDate = new Date(member.dateOfBirth);
          dueDate.setMonth(dueDate.getMonth() + dose.ageMonths);

          if (ageMonths >= dose.ageMonths) {
            due.push({ vaccine: vaccine.vaccine, doseNumber: dose.doseNumber, dueDate });
          } else if (dose.ageMonths - ageMonths <= 6) {
            upcoming.push({ vaccine: vaccine.vaccine, doseNumber: dose.doseNumber, dueDate });
          }
        }
      }
    }

    return { completed, due, upcoming };
  }

  // ===========================================================================
  // Pediatric Milestones
  // ===========================================================================

  private initializeMilestones(ageYears: number): PediatricMilestone[] {
    const ageMonths = ageYears * 12;
    
    return DEVELOPMENTAL_MILESTONES
      .filter(m => m.expectedAgeMonths <= 72) // Up to 6 years
      .map(m => ({
        ...m,
        status: m.expectedAgeMonths < ageMonths ? 'pending' : 'pending',
      }));
  }

  recordMilestone(
    familyId: string,
    memberId: string,
    milestoneIndex: number,
    achievedDate: Date,
    notes?: string
  ): void {
    const family = this.families.get(familyId);
    if (!family) throw new Error('Family not found');

    const member = family.members.find(m => m.id === memberId);
    if (!member || !member.healthProfile.pediatricMilestones) {
      throw new Error('Member not found or not a child');
    }

    const milestone = member.healthProfile.pediatricMilestones[milestoneIndex];
    if (milestone) {
      milestone.status = 'achieved';
      milestone.achievedDate = achievedDate;
      milestone.achievedAgeMonths = this.calculateAgeMonths(member.dateOfBirth);
      milestone.notes = notes;

      // Check if delayed
      if (milestone.achievedAgeMonths > milestone.expectedAgeMonths + 3) {
        milestone.concernLevel = 'monitor';
      }

      family.updatedAt = new Date();
      this.emit('milestoneRecorded', { family, member, milestone });
    }
  }

  getMilestonesStatus(familyId: string, memberId: string): {
    achieved: PediatricMilestone[];
    upcoming: PediatricMilestone[];
    delayed: PediatricMilestone[];
    summary: { category: MilestoneCategory; achieved: number; total: number }[];
  } {
    const family = this.families.get(familyId);
    if (!family) throw new Error('Family not found');

    const member = family.members.find(m => m.id === memberId);
    if (!member || !member.healthProfile.pediatricMilestones) {
      throw new Error('Member not found or not a child');
    }

    const ageMonths = this.calculateAgeMonths(member.dateOfBirth);
    const milestones = member.healthProfile.pediatricMilestones;

    const achieved = milestones.filter(m => m.status === 'achieved');
    const upcoming = milestones.filter(m => 
      m.status === 'pending' && 
      m.expectedAgeMonths > ageMonths && 
      m.expectedAgeMonths <= ageMonths + 3
    );
    const delayed = milestones.filter(m => 
      m.status === 'pending' && 
      m.expectedAgeMonths < ageMonths - 2
    );

    // Summary by category
    const categories: MilestoneCategory[] = ['gross-motor', 'fine-motor', 'language', 'cognitive', 'social-emotional', 'self-care'];
    const summary = categories.map(category => {
      const categoryMilestones = milestones.filter(m => m.category === category && m.expectedAgeMonths <= ageMonths);
      const achievedCount = categoryMilestones.filter(m => m.status === 'achieved').length;
      return {
        category,
        achieved: achievedCount,
        total: categoryMilestones.length,
      };
    });

    return { achieved, upcoming, delayed, summary };
  }

  // ===========================================================================
  // Growth Tracking
  // ===========================================================================

  recordGrowth(
    familyId: string,
    memberId: string,
    record: Omit<GrowthRecord, 'ageMonths'>
  ): GrowthRecord {
    const family = this.families.get(familyId);
    if (!family) throw new Error('Family not found');

    const member = family.members.find(m => m.id === memberId);
    if (!member || !member.healthProfile.growthRecords) {
      throw new Error('Member not found or not tracking growth');
    }

    const fullRecord: GrowthRecord = {
      ...record,
      ageMonths: this.calculateAgeMonths(member.dateOfBirth),
    };

    // Calculate percentiles (simplified - would use WHO growth charts)
    if (fullRecord.weight) {
      fullRecord.weight.percentile = this.calculatePercentile('weight', fullRecord.weight.value, fullRecord.ageMonths, member.gender);
    }
    if (fullRecord.height) {
      fullRecord.height.percentile = this.calculatePercentile('height', fullRecord.height.value, fullRecord.ageMonths, member.gender);
    }

    member.healthProfile.growthRecords.push(fullRecord);
    family.updatedAt = new Date();

    this.emit('growthRecorded', { family, member, record: fullRecord });
    return fullRecord;
  }

  private calculatePercentile(
    type: 'weight' | 'height',
    value: number,
    ageMonths: number,
    gender: 'male' | 'female' | 'other'
  ): number {
    // Simplified percentile calculation
    // In production, would use WHO growth chart data
    return 50; // Placeholder
  }

  // ===========================================================================
  // Genetic Risk Management
  // ===========================================================================

  addGeneticRisk(
    familyId: string,
    risk: Omit<GeneticRisk, 'affectedRelatives'>
  ): void {
    const family = this.families.get(familyId);
    if (!family) throw new Error('Family not found');

    // Find affected members based on family history
    const affectedMembers: string[] = [];
    
    for (const member of family.members) {
      // Check if member has the condition
      if (member.healthProfile.conditions.some(c => 
        c.toLowerCase().includes(risk.condition.toLowerCase())
      )) {
        affectedMembers.push(member.id);
      }
    }

    // Add to shared conditions
    const existingCondition = family.sharedConditions.find(
      c => c.condition.toLowerCase() === risk.condition.toLowerCase()
    );

    if (existingCondition) {
      existingCondition.affectedMembers = [...new Set([...existingCondition.affectedMembers, ...affectedMembers])];
      existingCondition.inheritancePattern = risk.inheritancePattern;
    } else {
      family.sharedConditions.push({
        condition: risk.condition,
        affectedMembers,
        inheritancePattern: risk.inheritancePattern,
        notes: risk.notes,
      });
    }

    // Add genetic risk to relevant family members
    for (const member of family.members) {
      if (!member.healthProfile.geneticRisks) {
        member.healthProfile.geneticRisks = [];
      }

      // Determine risk level based on family history
      const riskLevel = this.calculateGeneticRiskLevel(
        risk,
        affectedMembers,
        member.id,
        family.members
      );

      if (riskLevel !== 'low' || affectedMembers.includes(member.id)) {
        member.healthProfile.geneticRisks.push({
          ...risk,
          riskLevel,
          affectedRelatives: affectedMembers.filter(id => id !== member.id),
        });

        // Create screening alert if needed
        if (risk.recommendedScreenings.length > 0) {
          family.sharedAlerts.push({
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type: 'genetic-screening',
            memberId: member.id,
            memberName: `${member.firstName} ${member.lastName}`,
            title: `Genetic screening recommended: ${risk.condition}`,
            description: `Based on family history, screening is recommended: ${risk.recommendedScreenings.join(', ')}`,
            priority: riskLevel === 'high' ? 'high' : 'medium',
            status: 'active',
            createdAt: new Date(),
          });
        }
      }
    }

    family.updatedAt = new Date();
    this.emit('geneticRiskAdded', { family, risk });
  }

  private calculateGeneticRiskLevel(
    risk: Omit<GeneticRisk, 'affectedRelatives'>,
    affectedMembers: string[],
    memberId: string,
    allMembers: FamilyMember[]
  ): GeneticRisk['riskLevel'] {
    if (affectedMembers.includes(memberId)) return 'high';
    
    // Count first-degree relatives affected
    const member = allMembers.find(m => m.id === memberId);
    if (!member) return 'low';

    const firstDegreeRelations: FamilyRelationship[] = ['parent', 'child', 'sibling'];
    const firstDegreeAffected = allMembers.filter(m => 
      affectedMembers.includes(m.id) && 
      firstDegreeRelations.includes(m.relationship)
    ).length;

    if (firstDegreeAffected >= 2) return 'high';
    if (firstDegreeAffected === 1) return 'moderate';
    if (affectedMembers.length > 0) return 'low';
    
    return 'low';
  }

  // ===========================================================================
  // Caregiver Coordination
  // ===========================================================================

  assignCaregiver(
    familyId: string,
    assignment: Omit<CaregiverAssignment, 'startDate'>
  ): CaregiverAssignment {
    const family = this.families.get(familyId);
    if (!family) throw new Error('Family not found');

    const fullAssignment: CaregiverAssignment = {
      ...assignment,
      startDate: new Date(),
    };

    family.caregiverAssignments.push(fullAssignment);
    
    // Update member flags
    const caregiver = family.members.find(m => m.id === assignment.caregiverId);
    const recipient = family.members.find(m => m.id === assignment.careRecipientId);
    
    if (caregiver) caregiver.isPrimaryCaregiver = assignment.role === 'primary';
    if (recipient) recipient.needsCaregiver = true;

    family.updatedAt = new Date();
    this.emit('caregiverAssigned', { family, assignment: fullAssignment });
    
    return fullAssignment;
  }

  getCaregiverSchedule(familyId: string, caregiverId: string): {
    assignments: CaregiverAssignment[];
    weeklySchedule: { day: string; tasks: { time: string; recipient: string; task: string }[] }[];
  } {
    const family = this.families.get(familyId);
    if (!family) throw new Error('Family not found');

    const assignments = family.caregiverAssignments.filter(
      a => a.caregiverId === caregiverId && !a.endDate
    );

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklySchedule = days.map((day, index) => {
      const tasks: { time: string; recipient: string; task: string }[] = [];
      
      for (const assignment of assignments) {
        if (assignment.schedule) {
          const daySchedule = assignment.schedule.find(s => s.dayOfWeek === index);
          if (daySchedule) {
            const recipient = family.members.find(m => m.id === assignment.careRecipientId);
            for (const task of daySchedule.tasks) {
              tasks.push({
                time: daySchedule.startTime,
                recipient: recipient ? `${recipient.firstName} ${recipient.lastName}` : 'Unknown',
                task,
              });
            }
          }
        }
      }
      
      return { day, tasks: tasks.sort((a, b) => a.time.localeCompare(b.time)) };
    });

    return { assignments, weeklySchedule };
  }

  // ===========================================================================
  // Family Dashboard
  // ===========================================================================

  getFamilyDashboard(familyId: string): {
    family: FamilyUnit;
    activeAlerts: FamilyAlert[];
    upcomingAppointments: { memberId: string; memberName: string; type: string; date: Date }[];
    recentActivity: { date: Date; description: string; memberId: string }[];
    memberSummaries: { member: FamilyMember; pendingTasks: number; healthScore: number }[];
  } {
    const family = this.families.get(familyId);
    if (!family) throw new Error('Family not found');

    const activeAlerts = family.sharedAlerts.filter(a => a.status === 'active');
    
    const memberSummaries = family.members.map(member => {
      let pendingTasks = 0;
      let healthScore = 100;
      
      // Count pending vaccinations
      const { due } = this.getVaccinationSchedule(familyId, member.id);
      pendingTasks += due.length;
      healthScore -= due.length * 5;
      
      // Count delayed milestones
      if (member.healthProfile.pediatricMilestones) {
        const { delayed } = this.getMilestonesStatus(familyId, member.id);
        pendingTasks += delayed.length;
        healthScore -= delayed.length * 3;
      }
      
      return {
        member,
        pendingTasks,
        healthScore: Math.max(0, healthScore),
      };
    });

    return {
      family,
      activeAlerts: activeAlerts.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      upcomingAppointments: [], // Would come from scheduling integration
      recentActivity: [], // Would come from activity log
      memberSummaries,
    };
  }

  getFamily(familyId: string): FamilyUnit | undefined {
    return this.families.get(familyId);
  }
}

// Singleton instance
export const familyHealthHubService = new FamilyHealthHubService();
export default familyHealthHubService;
