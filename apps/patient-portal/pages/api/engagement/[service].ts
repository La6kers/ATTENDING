// =============================================================================
// ATTENDING AI - Patient Engagement API Endpoints
// apps/patient-portal/pages/api/engagement/[service].ts
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { service } = req.query;

  try {
    switch (service) {
      case 'medication-buddy':
        return handleMedicationBuddy(req, res);
      case 'health-coaching':
        return handleHealthCoaching(req, res);
      case 'family-hub':
        return handleFamilyHub(req, res);
      case 'wearables':
        return handleWearables(req, res);
      case 'mental-health':
        return handleMentalHealth(req, res);
      default:
        return res.status(404).json({ error: `Service ${service} not found` });
    }
  } catch (error) {
    console.error(`Engagement API error (${service}):`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// =============================================================================
// Medication Buddy
// =============================================================================
async function handleMedicationBuddy(req: NextApiRequest, res: NextApiResponse) {
  const patientId = (req as any).session?.user?.id || 'patient_1';

  if (req.method === 'GET') {
    const medications = [
      {
        id: 'med_1',
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily',
        purpose: 'Diabetes management',
        nextDose: new Date(Date.now() + 2 * 60 * 60 * 1000),
        adherenceRate: 92,
        refillsRemaining: 3,
        sideEffectsToWatch: ['Nausea', 'Diarrhea'],
      },
      {
        id: 'med_2',
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once daily',
        purpose: 'Blood pressure control',
        nextDose: new Date(Date.now() + 8 * 60 * 60 * 1000),
        adherenceRate: 88,
        refillsRemaining: 2,
        sideEffectsToWatch: ['Dry cough', 'Dizziness'],
      },
    ];

    return res.status(200).json({
      medications,
      overallAdherence: 90,
      upcomingReminders: 3,
      interactionWarnings: 0,
    });
  }

  if (req.method === 'POST') {
    const { action, medicationId, data } = req.body;

    switch (action) {
      case 'record-dose':
        return res.status(200).json({
          medicationId,
          recorded: true,
          timestamp: new Date(),
          streak: 14,
        });

      case 'check-interaction':
        return res.status(200).json({
          medications: data.medications,
          interactions: [],
          safe: true,
        });

      case 'identify-pill':
        return res.status(200).json({
          identified: true,
          medication: 'Metformin 500mg',
          confidence: 0.94,
          manufacturer: 'Generic',
        });

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// =============================================================================
// Health Coaching
// =============================================================================
async function handleHealthCoaching(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { type } = req.query;

    if (type === 'goals') {
      return res.status(200).json({
        goals: [
          {
            id: 'goal_1',
            category: 'weight-management',
            target: 'Lose 10 pounds',
            progress: 40,
            startDate: new Date('2025-01-01'),
            targetDate: new Date('2025-04-01'),
            currentStreak: 7,
          },
          {
            id: 'goal_2',
            category: 'physical-activity',
            target: '10,000 steps daily',
            progress: 75,
            dailyTarget: 10000,
            todayProgress: 7500,
          },
        ],
        achievements: ['7-day-streak', 'first-goal-set'],
      });
    }

    return res.status(200).json({
      todayCheckedIn: false,
      currentStreak: 7,
      nextMilestone: '14-day streak',
      coachingTip: 'Try adding a 15-minute walk after lunch today!',
    });
  }

  if (req.method === 'POST') {
    const { action, data } = req.body;

    switch (action) {
      case 'check-in':
        return res.status(200).json({
          recorded: true,
          streak: 8,
          coachingResponse: 'Great job checking in! Your consistency is paying off.',
          todayChallenge: 'Drink 8 glasses of water today',
          pointsEarned: 10,
        });

      case 'set-goal':
        return res.status(201).json({
          goalId: `goal_${Date.now()}`,
          ...data,
          status: 'active',
          createdAt: new Date(),
        });

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// =============================================================================
// Family Health Hub
// =============================================================================
async function handleFamilyHub(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { memberId } = req.query;

    return res.status(200).json({
      familyId: 'fam_001',
      members: [
        {
          id: 'member_1',
          name: 'John (You)',
          relationship: 'self',
          upcomingAppointments: 1,
          overdueVaccinations: 0,
        },
        {
          id: 'member_2',
          name: 'Sarah',
          relationship: 'spouse',
          upcomingAppointments: 2,
          overdueVaccinations: 0,
        },
        {
          id: 'member_3',
          name: 'Emma',
          relationship: 'child',
          age: 4,
          upcomingVaccinations: 1,
          developmentStatus: 'on-track',
        },
      ],
      familyCalendar: [
        {
          date: new Date(),
          event: 'Emma - Pediatric checkup',
          member: 'Emma',
        },
      ],
      alerts: [],
    });
  }

  if (req.method === 'POST') {
    const { action, data } = req.body;

    switch (action) {
      case 'add-member':
        return res.status(201).json({
          memberId: `member_${Date.now()}`,
          ...data,
          added: true,
        });

      case 'record-vaccination':
        return res.status(200).json({
          memberId: data.memberId,
          vaccination: data.vaccination,
          recorded: true,
          nextDue: data.nextDue,
        });

      case 'record-milestone':
        return res.status(200).json({
          memberId: data.memberId,
          milestone: data.milestone,
          achieved: true,
          ageAtAchievement: data.ageMonths,
        });

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// =============================================================================
// Wearables Integration
// =============================================================================
async function handleWearables(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { type } = req.query;

    if (type === 'vitals') {
      return res.status(200).json({
        timestamp: new Date(),
        heartRate: { value: 72, unit: 'bpm', trend: 'stable' },
        bloodOxygen: { value: 98, unit: '%' },
        steps: { today: 6500, goal: 10000 },
        sleep: { lastNight: 7.2, quality: 'good' },
        activeMinutes: 35,
      });
    }

    if (type === 'devices') {
      return res.status(200).json({
        devices: [
          {
            id: 'dev_1',
            type: 'smartwatch',
            name: 'Apple Watch Series 9',
            status: 'connected',
            battery: 78,
            lastSync: new Date(),
          },
          {
            id: 'dev_2',
            type: 'blood-pressure-monitor',
            name: 'Omron BP Monitor',
            status: 'disconnected',
            lastSync: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
        ],
      });
    }

    return res.status(200).json({
      summary: 'Vitals normal, good activity today',
      alerts: [],
    });
  }

  if (req.method === 'POST') {
    const { action, data } = req.body;

    switch (action) {
      case 'sync':
        return res.status(200).json({
          deviceId: data.deviceId,
          synced: true,
          dataPoints: 150,
          lastValue: { heartRate: 72 },
        });

      case 'pair-device':
        return res.status(200).json({
          deviceId: `dev_${Date.now()}`,
          status: 'pairing',
          instructions: 'Open the app on your device and confirm pairing',
        });

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// =============================================================================
// Mental Health
// =============================================================================
async function handleMentalHealth(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { type } = req.query;

    if (type === 'screening') {
      return res.status(200).json({
        availableScreenings: [
          { id: 'PHQ-9', name: 'Depression Screening', timeToComplete: '2-5 minutes' },
          { id: 'GAD-7', name: 'Anxiety Screening', timeToComplete: '2-3 minutes' },
        ],
        lastScreening: {
          type: 'PHQ-9',
          date: new Date('2025-01-15'),
          score: 4,
          severity: 'Minimal',
        },
        nextRecommended: new Date('2025-04-15'),
      });
    }

    if (type === 'resources') {
      return res.status(200).json({
        crisisResources: [
          { name: '988 Suicide & Crisis Lifeline', contact: '988' },
          { name: 'Crisis Text Line', contact: 'Text HOME to 741741' },
        ],
        supportGroups: [],
        therapists: [],
      });
    }

    return res.status(200).json({
      status: 'supported',
      hasSafetyPlan: false,
      lastCheckIn: new Date('2025-01-20'),
    });
  }

  if (req.method === 'POST') {
    const { action, data } = req.body;

    switch (action) {
      case 'submit-screening':
        const totalScore = data.responses.reduce((sum: number, r: any) => sum + r.score, 0);
        return res.status(200).json({
          screeningType: data.screeningType,
          totalScore,
          severity: totalScore < 5 ? 'Minimal' : totalScore < 10 ? 'Mild' : 'Moderate',
          recommendations: ['Continue self-care practices', 'Schedule follow-up if symptoms persist'],
          resources: totalScore >= 10 ? ['Consider speaking with a counselor'] : [],
        });

      case 'create-safety-plan':
        return res.status(201).json({
          safetyPlanId: `sp_${Date.now()}`,
          created: true,
          sections: ['warning-signs', 'coping-strategies', 'support-contacts'],
        });

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
