// =============================================================================
// ATTENDING AI - Health Coaching AI Service
// apps/shared/services/patient-engagement/HealthCoachingService.ts
//
// Personalized behavioral health support including:
// - Daily check-ins via text/app
// - Motivational interviewing techniques
// - Progress visualization
// - Goal setting and tracking
// - Wearable integration
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

export interface HealthGoal {
  id: string;
  patientId: string;
  category: GoalCategory;
  title: string;
  description: string;
  targetValue?: number;
  targetUnit?: string;
  currentValue?: number;
  startDate: Date;
  targetDate?: Date;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  milestones: GoalMilestone[];
  dailyTargets?: DailyTarget[];
  streakDays: number;
  longestStreak: number;
  completionRate: number;
  motivation?: string;
  barriers?: string[];
  strategies?: string[];
}

export type GoalCategory =
  | 'weight-management'
  | 'physical-activity'
  | 'nutrition'
  | 'sleep'
  | 'stress-management'
  | 'medication-adherence'
  | 'smoking-cessation'
  | 'alcohol-reduction'
  | 'chronic-disease-management'
  | 'mental-health'
  | 'social-connection'
  | 'custom';

export interface GoalMilestone {
  id: string;
  title: string;
  targetValue?: number;
  achieved: boolean;
  achievedDate?: Date;
  celebration?: string;
}

export interface DailyTarget {
  type: string;
  target: number;
  unit: string;
}

export interface DailyCheckIn {
  id: string;
  patientId: string;
  date: Date;
  mood: 1 | 2 | 3 | 4 | 5;
  moodFactors?: string[];
  energyLevel: 1 | 2 | 3 | 4 | 5;
  sleepHours?: number;
  sleepQuality?: 1 | 2 | 3 | 4 | 5;
  stressLevel?: 1 | 2 | 3 | 4 | 5;
  exerciseMinutes?: number;
  exerciseType?: string;
  waterIntake?: number;
  mealsLogged?: number;
  medicationsTaken?: boolean;
  customMetrics?: Record<string, number>;
  notes?: string;
  aiResponse?: CoachingResponse;
}

export interface CoachingResponse {
  message: string;
  tone: 'encouraging' | 'celebratory' | 'supportive' | 'motivating' | 'informative';
  tips?: string[];
  challenge?: DailyChallenge;
  reflection?: string;
  resourceLinks?: string[];
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  pointsValue: number;
  completed: boolean;
  expiresAt: Date;
}

export interface ProgressReport {
  patientId: string;
  period: 'week' | 'month' | 'quarter';
  startDate: Date;
  endDate: Date;
  goalsProgress: GoalProgress[];
  overallScore: number;
  achievements: Achievement[];
  trends: Trend[];
  insights: string[];
  recommendations: string[];
  nextPeriodFocus: string[];
}

export interface GoalProgress {
  goalId: string;
  goalTitle: string;
  category: GoalCategory;
  startValue: number;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  onTrack: boolean;
  trend: 'improving' | 'stable' | 'declining';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedDate: Date;
  category: GoalCategory;
  pointsValue: number;
}

export interface Trend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  percentChange: number;
  interpretation: string;
}

export interface CoachingConversation {
  patientId: string;
  messages: CoachingMessage[];
  currentTopic?: GoalCategory;
  conversationState: 'greeting' | 'check-in' | 'goal-setting' | 'problem-solving' | 'motivation' | 'closing';
}

export interface CoachingMessage {
  id: string;
  timestamp: Date;
  sender: 'patient' | 'coach';
  content: string;
  intent?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

// =============================================================================
// Motivational Messages Database
// =============================================================================

const MOTIVATIONAL_MESSAGES: Record<string, string[]> = {
  'streak-milestone': [
    '🔥 Amazing! You\'ve maintained your streak for {days} days! Your consistency is inspiring.',
    '💪 {days} days strong! You\'re building habits that will last a lifetime.',
    '🌟 Wow! {days} consecutive days of progress. You should be incredibly proud!',
  ],
  'goal-progress': [
    'You\'re {percent}% of the way to your goal! Every step counts.',
    'Look at that progress - {percent}% complete! Keep going, you\'ve got this!',
    'You\'ve already achieved {percent}% of your goal. The finish line is in sight!',
  ],
  'low-mood': [
    'I hear that today is tough. Remember, it\'s okay to have hard days. What small thing might bring you a moment of peace?',
    'Thank you for being honest about how you\'re feeling. Would you like to talk about what\'s on your mind?',
    'Some days are harder than others. What has helped you feel better in the past?',
  ],
  'high-energy': [
    'Fantastic energy today! What would you like to channel that into?',
    'You\'re feeling great! This is a perfect day to challenge yourself a bit more.',
    'Love to see that energy! What\'s one goal you want to crush today?',
  ],
  'missed-checkin': [
    'Hey! I noticed we missed connecting yesterday. No worries - every day is a fresh start. How are you doing today?',
    'Welcome back! Life gets busy sometimes. What\'s one small healthy choice you can make today?',
  ],
  'milestone-achieved': [
    '🎉 CONGRATULATIONS! You\'ve reached a major milestone: {milestone}! Take a moment to celebrate this achievement.',
    '🏆 You did it! {milestone} - this is huge! You should be so proud of your dedication.',
  ],
  'struggling': [
    'It sounds like you\'re facing some challenges. Remember, setbacks are part of the journey, not the end of it.',
    'I appreciate you sharing this with me. Let\'s think about this together - what\'s the biggest obstacle right now?',
    'Change is hard, and it\'s okay to struggle. What would make things just a little bit easier?',
  ],
};

const DAILY_TIPS: Record<GoalCategory, string[]> = {
  'weight-management': [
    'Drink a full glass of water before each meal to help with portion control.',
    'Use smaller plates - it naturally helps you eat less while feeling satisfied.',
    'Eat slowly and mindfully. It takes 20 minutes for your brain to register fullness.',
    'Plan your meals for the week ahead to avoid impulsive food choices.',
  ],
  'physical-activity': [
    'Even a 10-minute walk counts! Movement adds up throughout the day.',
    'Try taking the stairs instead of the elevator when possible.',
    'Schedule your workouts like important meetings - they\'re appointments with your health.',
    'Find an activity you enjoy. Exercise shouldn\'t feel like punishment!',
  ],
  'sleep': [
    'Keep your bedroom cool, dark, and quiet for optimal sleep.',
    'Try to wake up at the same time every day, even on weekends.',
    'Avoid screens for at least 30 minutes before bed.',
    'A warm bath or shower before bed can help you relax and sleep better.',
  ],
  'stress-management': [
    'Take three deep breaths when you feel stress rising.',
    'Try the 5-4-3-2-1 grounding technique: notice 5 things you see, 4 you hear, 3 you can touch, 2 you smell, 1 you taste.',
    'Even 5 minutes of meditation can make a difference.',
    'Write down three things you\'re grateful for each day.',
  ],
  'nutrition': [
    'Aim to fill half your plate with vegetables at each meal.',
    'Keep healthy snacks visible and accessible.',
    'Read nutrition labels - you might be surprised what\'s in your food.',
    'Eat the rainbow - different colored foods provide different nutrients.',
  ],
  'medication-adherence': [
    'Set a daily alarm for medication times.',
    'Use a pill organizer to keep track of what you\'ve taken.',
    'Link taking medication to an existing habit, like brushing your teeth.',
    'Keep a backup supply in your bag or at work.',
  ],
  'smoking-cessation': [
    'Identify your triggers and plan alternatives.',
    'Keep your hands busy with a stress ball or fidget toy.',
    'Take deep breaths when cravings hit - they usually pass in a few minutes.',
    'Calculate how much money you\'re saving by not smoking.',
  ],
  'alcohol-reduction': [
    'Alternate alcoholic drinks with water or sparkling water.',
    'Keep track of your drinks - it\'s easy to lose count.',
    'Find alcohol-free activities you enjoy.',
    'Have a plan before social events where alcohol will be present.',
  ],
  'chronic-disease-management': [
    'Keep a symptom diary to share with your healthcare provider.',
    'Learn your early warning signs that indicate you need to take action.',
    'Stay connected with your care team between appointments.',
    'Join a support group to connect with others managing similar conditions.',
  ],
  'mental-health': [
    'Check in with yourself throughout the day.',
    'Reach out to a friend or loved one today.',
    'Do one thing that brings you joy, no matter how small.',
    'It\'s okay to ask for help when you need it.',
  ],
  'social-connection': [
    'Send a text to someone you haven\'t talked to in a while.',
    'Join a class or group related to your interests.',
    'Schedule regular catch-ups with friends or family.',
    'Volunteer in your community to meet like-minded people.',
  ],
  'custom': [
    'Remember why you started this journey.',
    'Small steps lead to big changes.',
    'Progress, not perfection.',
  ],
};

// =============================================================================
// Health Coaching Service Class
// =============================================================================

export class HealthCoachingService extends EventEmitter {
  private goals: Map<string, HealthGoal[]> = new Map();
  private checkIns: Map<string, DailyCheckIn[]> = new Map();
  private achievements: Map<string, Achievement[]> = new Map();
  private conversations: Map<string, CoachingConversation> = new Map();

  constructor() {
    super();
  }

  // ===========================================================================
  // Goal Management
  // ===========================================================================

  createGoal(goal: Omit<HealthGoal, 'id' | 'streakDays' | 'longestStreak' | 'completionRate' | 'milestones'>): HealthGoal {
    const id = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullGoal: HealthGoal = {
      ...goal,
      id,
      streakDays: 0,
      longestStreak: 0,
      completionRate: 0,
      milestones: this.generateMilestones(goal),
    };
    
    const patientGoals = this.goals.get(goal.patientId) || [];
    patientGoals.push(fullGoal);
    this.goals.set(goal.patientId, patientGoals);
    
    this.emit('goalCreated', fullGoal);
    return fullGoal;
  }

  private generateMilestones(goal: Omit<HealthGoal, 'id' | 'streakDays' | 'longestStreak' | 'completionRate' | 'milestones'>): GoalMilestone[] {
    const milestones: GoalMilestone[] = [];
    
    if (goal.targetValue && goal.currentValue !== undefined) {
      const range = goal.targetValue - goal.currentValue;
      const steps = [0.25, 0.5, 0.75, 1];
      
      for (const step of steps) {
        const value = goal.currentValue + (range * step);
        milestones.push({
          id: `milestone_${Math.random().toString(36).substr(2, 6)}`,
          title: step === 1 ? 'Goal achieved!' : `${Math.round(step * 100)}% progress`,
          targetValue: Math.round(value * 10) / 10,
          achieved: false,
        });
      }
    }
    
    return milestones;
  }

  getGoals(patientId: string, status?: HealthGoal['status']): HealthGoal[] {
    const goals = this.goals.get(patientId) || [];
    if (status) {
      return goals.filter(g => g.status === status);
    }
    return goals;
  }

  updateGoalProgress(goalId: string, patientId: string, newValue: number): void {
    const goals = this.goals.get(patientId) || [];
    const goal = goals.find(g => g.id === goalId);
    
    if (goal) {
      goal.currentValue = newValue;
      
      // Check milestones
      for (const milestone of goal.milestones) {
        if (!milestone.achieved && milestone.targetValue && newValue >= milestone.targetValue) {
          milestone.achieved = true;
          milestone.achievedDate = new Date();
          this.emit('milestoneAchieved', { goal, milestone });
          this.awardAchievement(patientId, {
            title: milestone.title,
            description: `Achieved milestone in ${goal.title}`,
            category: goal.category,
            pointsValue: 50,
          });
        }
      }
      
      // Update completion rate
      if (goal.targetValue) {
        const startValue = goal.currentValue || 0;
        goal.completionRate = Math.min(100, (newValue / goal.targetValue) * 100);
      }
      
      this.emit('goalProgressUpdated', goal);
    }
  }

  // ===========================================================================
  // Daily Check-ins
  // ===========================================================================

  recordCheckIn(checkIn: Omit<DailyCheckIn, 'id' | 'aiResponse'>): DailyCheckIn {
    const id = `checkin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate AI response
    const aiResponse = this.generateCoachingResponse(checkIn);
    
    const fullCheckIn: DailyCheckIn = {
      ...checkIn,
      id,
      aiResponse,
    };
    
    const patientCheckIns = this.checkIns.get(checkIn.patientId) || [];
    patientCheckIns.push(fullCheckIn);
    this.checkIns.set(checkIn.patientId, patientCheckIns);
    
    // Update streaks
    this.updateStreaks(checkIn.patientId);
    
    this.emit('checkInRecorded', fullCheckIn);
    return fullCheckIn;
  }

  private generateCoachingResponse(checkIn: Omit<DailyCheckIn, 'id' | 'aiResponse'>): CoachingResponse {
    let tone: CoachingResponse['tone'] = 'encouraging';
    let message = '';
    const tips: string[] = [];
    
    // Determine tone based on check-in data
    if (checkIn.mood <= 2) {
      tone = 'supportive';
      const messages = MOTIVATIONAL_MESSAGES['low-mood'];
      message = messages[Math.floor(Math.random() * messages.length)];
    } else if (checkIn.energyLevel >= 4 && checkIn.mood >= 4) {
      tone = 'celebratory';
      const messages = MOTIVATIONAL_MESSAGES['high-energy'];
      message = messages[Math.floor(Math.random() * messages.length)];
    } else {
      tone = 'encouraging';
      message = 'Thanks for checking in today! Every day you show up for yourself matters.';
    }
    
    // Add relevant tips based on data
    if (checkIn.sleepHours && checkIn.sleepHours < 7) {
      tips.push(...DAILY_TIPS['sleep'].slice(0, 2));
    }
    
    if (checkIn.stressLevel && checkIn.stressLevel >= 4) {
      tips.push(...DAILY_TIPS['stress-management'].slice(0, 2));
    }
    
    if (checkIn.exerciseMinutes === 0 || checkIn.exerciseMinutes === undefined) {
      tips.push(DAILY_TIPS['physical-activity'][0]);
    }
    
    // Generate daily challenge
    const challenge = this.generateDailyChallenge(checkIn);
    
    return {
      message,
      tone,
      tips: tips.length > 0 ? tips : undefined,
      challenge,
    };
  }

  private generateDailyChallenge(checkIn: Omit<DailyCheckIn, 'id' | 'aiResponse'>): DailyChallenge {
    const categories: GoalCategory[] = ['physical-activity', 'nutrition', 'stress-management', 'sleep', 'social-connection'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    const challenges: Record<GoalCategory, DailyChallenge[]> = {
      'physical-activity': [
        { id: '', title: 'Take a 10-minute walk', description: 'Get moving with a short walk around your neighborhood or office', category: 'physical-activity', difficulty: 'easy', pointsValue: 10, completed: false, expiresAt: new Date() },
        { id: '', title: 'Stretch for 5 minutes', description: 'Do a quick stretching routine', category: 'physical-activity', difficulty: 'easy', pointsValue: 10, completed: false, expiresAt: new Date() },
      ],
      'nutrition': [
        { id: '', title: 'Eat a fruit or vegetable', description: 'Add one extra serving of produce to your day', category: 'nutrition', difficulty: 'easy', pointsValue: 10, completed: false, expiresAt: new Date() },
        { id: '', title: 'Drink 8 glasses of water', description: 'Stay hydrated throughout the day', category: 'nutrition', difficulty: 'medium', pointsValue: 15, completed: false, expiresAt: new Date() },
      ],
      'stress-management': [
        { id: '', title: 'Practice deep breathing', description: 'Take 3 minutes to do deep breathing exercises', category: 'stress-management', difficulty: 'easy', pointsValue: 10, completed: false, expiresAt: new Date() },
        { id: '', title: 'Write 3 gratitudes', description: 'Note three things you\'re grateful for today', category: 'stress-management', difficulty: 'easy', pointsValue: 10, completed: false, expiresAt: new Date() },
      ],
      'sleep': [
        { id: '', title: 'No screens 30 min before bed', description: 'Put away your phone and computer before sleeping', category: 'sleep', difficulty: 'medium', pointsValue: 15, completed: false, expiresAt: new Date() },
      ],
      'social-connection': [
        { id: '', title: 'Reach out to a friend', description: 'Send a text or make a call to someone you care about', category: 'social-connection', difficulty: 'easy', pointsValue: 10, completed: false, expiresAt: new Date() },
      ],
      'weight-management': [],
      'medication-adherence': [],
      'smoking-cessation': [],
      'alcohol-reduction': [],
      'chronic-disease-management': [],
      'mental-health': [],
      'custom': [],
    };
    
    const categoryOptions = challenges[category];
    if (categoryOptions.length === 0) {
      return challenges['physical-activity'][0];
    }
    
    const challenge = categoryOptions[Math.floor(Math.random() * categoryOptions.length)];
    challenge.id = `challenge_${Date.now()}`;
    
    const expiresAt = new Date();
    expiresAt.setHours(23, 59, 59, 999);
    challenge.expiresAt = expiresAt;
    
    return challenge;
  }

  private updateStreaks(patientId: string): void {
    const checkIns = this.checkIns.get(patientId) || [];
    const goals = this.goals.get(patientId) || [];
    
    // Calculate streak for each goal
    for (const goal of goals) {
      if (goal.status !== 'active') continue;
      
      // Sort check-ins by date descending
      const sorted = checkIns.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      let streak = 0;
      let lastDate: Date | null = null;
      
      for (const checkIn of sorted) {
        if (!lastDate) {
          lastDate = checkIn.date;
          streak = 1;
          continue;
        }
        
        const dayDiff = Math.floor((lastDate.getTime() - checkIn.date.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
          streak++;
          lastDate = checkIn.date;
        } else {
          break;
        }
      }
      
      goal.streakDays = streak;
      if (streak > goal.longestStreak) {
        goal.longestStreak = streak;
        
        // Award streak achievement
        if (streak >= 7) {
          this.awardAchievement(patientId, {
            title: `${streak}-Day Streak!`,
            description: `Maintained a ${streak}-day streak for ${goal.title}`,
            category: goal.category,
            pointsValue: streak * 5,
          });
        }
      }
    }
  }

  // ===========================================================================
  // Achievements
  // ===========================================================================

  private awardAchievement(
    patientId: string,
    achievement: Omit<Achievement, 'id' | 'earnedDate' | 'icon'>
  ): void {
    const id = `ach_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const icons: Record<GoalCategory, string> = {
      'weight-management': '⚖️',
      'physical-activity': '🏃',
      'nutrition': '🥗',
      'sleep': '😴',
      'stress-management': '🧘',
      'medication-adherence': '💊',
      'smoking-cessation': '🚭',
      'alcohol-reduction': '🍃',
      'chronic-disease-management': '💪',
      'mental-health': '🧠',
      'social-connection': '👥',
      'custom': '⭐',
    };
    
    const fullAchievement: Achievement = {
      ...achievement,
      id,
      earnedDate: new Date(),
      icon: icons[achievement.category] || '⭐',
    };
    
    const patientAchievements = this.achievements.get(patientId) || [];
    patientAchievements.push(fullAchievement);
    this.achievements.set(patientId, patientAchievements);
    
    this.emit('achievementEarned', fullAchievement);
  }

  getAchievements(patientId: string): Achievement[] {
    return this.achievements.get(patientId) || [];
  }

  // ===========================================================================
  // Progress Reports
  // ===========================================================================

  generateProgressReport(patientId: string, period: ProgressReport['period']): ProgressReport {
    const endDate = new Date();
    const startDate = new Date();
    
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setMonth(startDate.getMonth() - 3);
    }
    
    const goals = this.goals.get(patientId) || [];
    const checkIns = this.checkIns.get(patientId) || [];
    const achievements = this.achievements.get(patientId) || [];
    
    const periodCheckIns = checkIns.filter(c => c.date >= startDate && c.date <= endDate);
    const periodAchievements = achievements.filter(a => a.earnedDate >= startDate && a.earnedDate <= endDate);
    
    // Calculate goal progress
    const goalsProgress: GoalProgress[] = goals.map(goal => ({
      goalId: goal.id,
      goalTitle: goal.title,
      category: goal.category,
      startValue: goal.currentValue || 0,
      currentValue: goal.currentValue || 0,
      targetValue: goal.targetValue || 100,
      progressPercent: goal.completionRate,
      onTrack: goal.completionRate >= 50,
      trend: goal.streakDays > 3 ? 'improving' : goal.streakDays > 0 ? 'stable' : 'declining',
    }));
    
    // Calculate overall score
    const overallScore = Math.round(
      goals.reduce((sum, g) => sum + g.completionRate, 0) / Math.max(goals.length, 1)
    );
    
    // Generate insights
    const insights = this.generateInsights(periodCheckIns, goals);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(periodCheckIns, goals);
    
    return {
      patientId,
      period,
      startDate,
      endDate,
      goalsProgress,
      overallScore,
      achievements: periodAchievements,
      trends: this.calculateTrends(periodCheckIns),
      insights,
      recommendations,
      nextPeriodFocus: recommendations.slice(0, 2),
    };
  }

  private calculateTrends(checkIns: DailyCheckIn[]): Trend[] {
    const trends: Trend[] = [];
    
    if (checkIns.length < 2) return trends;
    
    // Mood trend
    const moods = checkIns.map(c => c.mood);
    const moodTrend = this.calculateMetricTrend(moods);
    trends.push({
      metric: 'Mood',
      direction: moodTrend.direction,
      percentChange: moodTrend.percentChange,
      interpretation: moodTrend.direction === 'up' 
        ? 'Your mood has been improving!' 
        : moodTrend.direction === 'down'
        ? 'You\'ve been having some harder days'
        : 'Your mood has been consistent',
    });
    
    // Energy trend
    const energy = checkIns.map(c => c.energyLevel);
    const energyTrend = this.calculateMetricTrend(energy);
    trends.push({
      metric: 'Energy',
      direction: energyTrend.direction,
      percentChange: energyTrend.percentChange,
      interpretation: energyTrend.direction === 'up'
        ? 'Your energy levels are increasing!'
        : energyTrend.direction === 'down'
        ? 'Your energy has been lower lately'
        : 'Your energy has been steady',
    });
    
    return trends;
  }

  private calculateMetricTrend(values: number[]): { direction: 'up' | 'down' | 'stable'; percentChange: number } {
    if (values.length < 2) return { direction: 'stable', percentChange: 0 };
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (percentChange > 10) return { direction: 'up', percentChange };
    if (percentChange < -10) return { direction: 'down', percentChange: Math.abs(percentChange) };
    return { direction: 'stable', percentChange: 0 };
  }

  private generateInsights(checkIns: DailyCheckIn[], goals: HealthGoal[]): string[] {
    const insights: string[] = [];
    
    if (checkIns.length > 0) {
      const avgMood = checkIns.reduce((sum, c) => sum + c.mood, 0) / checkIns.length;
      if (avgMood >= 4) {
        insights.push('Your mood has been consistently positive this period! Keep doing what you\'re doing.');
      }
      
      const exerciseDays = checkIns.filter(c => c.exerciseMinutes && c.exerciseMinutes > 0).length;
      const exerciseRate = (exerciseDays / checkIns.length) * 100;
      if (exerciseRate >= 70) {
        insights.push(`Great job staying active! You exercised on ${Math.round(exerciseRate)}% of days.`);
      }
    }
    
    for (const goal of goals) {
      if (goal.streakDays >= 7) {
        insights.push(`Amazing! You've maintained a ${goal.streakDays}-day streak on ${goal.title}.`);
      }
    }
    
    return insights;
  }

  private generateRecommendations(checkIns: DailyCheckIn[], goals: HealthGoal[]): string[] {
    const recommendations: string[] = [];
    
    // Check for low sleep
    const avgSleep = checkIns.filter(c => c.sleepHours).reduce((sum, c) => sum + (c.sleepHours || 0), 0) / 
                     checkIns.filter(c => c.sleepHours).length;
    if (avgSleep < 7) {
      recommendations.push('Try to prioritize getting 7-8 hours of sleep. Sleep significantly impacts mood and energy.');
    }
    
    // Check for high stress
    const avgStress = checkIns.filter(c => c.stressLevel).reduce((sum, c) => sum + (c.stressLevel || 0), 0) /
                      checkIns.filter(c => c.stressLevel).length;
    if (avgStress >= 3.5) {
      recommendations.push('Your stress levels have been elevated. Consider adding a daily 5-minute breathing practice.');
    }
    
    // Check for inactive goals
    for (const goal of goals) {
      if (goal.status === 'active' && goal.streakDays === 0) {
        recommendations.push(`Let's refocus on your goal: ${goal.title}. What small step can you take today?`);
      }
    }
    
    return recommendations;
  }

  // ===========================================================================
  // Coaching Conversation
  // ===========================================================================

  sendMessage(patientId: string, message: string): CoachingMessage {
    let conversation = this.conversations.get(patientId);
    
    if (!conversation) {
      conversation = {
        patientId,
        messages: [],
        conversationState: 'greeting',
      };
      this.conversations.set(patientId, conversation);
    }
    
    const patientMessage: CoachingMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      sender: 'patient',
      content: message,
      sentiment: this.analyzeSentiment(message),
    };
    
    conversation.messages.push(patientMessage);
    
    // Generate coach response
    const coachResponse = this.generateCoachMessage(conversation, message);
    conversation.messages.push(coachResponse);
    
    this.emit('conversationUpdated', conversation);
    
    return coachResponse;
  }

  private analyzeSentiment(message: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['good', 'great', 'happy', 'better', 'excited', 'motivated', 'proud', 'achieved'];
    const negativeWords = ['bad', 'sad', 'tired', 'stressed', 'anxious', 'frustrated', 'failed', 'struggling'];
    
    const lower = message.toLowerCase();
    const positiveCount = positiveWords.filter(w => lower.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lower.includes(w)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private generateCoachMessage(conversation: CoachingConversation, patientMessage: string): CoachingMessage {
    const sentiment = this.analyzeSentiment(patientMessage);
    let response = '';
    
    if (sentiment === 'negative') {
      response = 'I hear you. It sounds like things are challenging right now. Remember, it\'s okay to have tough moments. What\'s one small thing that might help you feel a bit better today?';
    } else if (sentiment === 'positive') {
      response = 'That\'s wonderful to hear! I love seeing you in a positive space. What contributed to this good feeling? Let\'s capture that so we can recreate it!';
    } else {
      response = 'Thanks for sharing. How can I support you today? Would you like to check in on your goals, talk about any challenges, or just chat?';
    }
    
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      sender: 'coach',
      content: response,
    };
  }
}

// Singleton instance
export const healthCoachingService = new HealthCoachingService();
export default healthCoachingService;
