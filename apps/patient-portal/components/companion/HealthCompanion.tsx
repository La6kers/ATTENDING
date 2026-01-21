// ============================================================
// ATTENDING AI - Patient Health Companion
// apps/patient-portal/components/companion/HealthCompanion.tsx
//
// Phase 8C: Continuous patient engagement between visits
// Medication reminders, symptom tracking, and care gap alerts
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  Heart,
  Pill,
  Activity,
  Calendar,
  MessageSquare,
  Bell,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Plus,
  Clock,
  Thermometer,
  Droplets,
  Scale,
  Smile,
  Meh,
  Frown,
  Sun,
  Moon,
  Send,
  BookOpen,
  Phone,
  Video,
  AlertTriangle,
  Award,
  Target,
  Zap,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type MoodLevel = 'great' | 'good' | 'okay' | 'poor' | 'bad';
export type SymptomSeverity = 'none' | 'mild' | 'moderate' | 'severe';
export type MedicationStatus = 'taken' | 'missed' | 'skipped' | 'pending';

export interface DailyCheckIn {
  date: Date;
  mood: MoodLevel;
  painLevel: number; // 0-10
  energyLevel: number; // 0-10
  sleepQuality: number; // 0-10
  sleepHours: number;
  symptoms: SymptomEntry[];
  vitals?: VitalReading[];
  notes?: string;
}

export interface SymptomEntry {
  id: string;
  symptom: string;
  severity: SymptomSeverity;
  duration?: string;
  notes?: string;
}

export interface VitalReading {
  type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'blood_sugar' | 'oxygen';
  value: string;
  unit: string;
  timestamp: Date;
  isAbnormal?: boolean;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'bedtime' | 'as_needed';
  instructions?: string;
  refillDate?: Date;
  refillsRemaining?: number;
}

export interface MedicationReminder {
  id: string;
  medication: Medication;
  scheduledTime: Date;
  status: MedicationStatus;
  takenAt?: Date;
}

export interface CareGap {
  id: string;
  type: 'screening' | 'vaccination' | 'lab' | 'follow_up' | 'referral';
  title: string;
  description: string;
  dueDate?: Date;
  isOverdue: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface HealthGoal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  deadline?: Date;
  streak?: number;
}

export interface Message {
  id: string;
  from: 'patient' | 'care_team';
  senderName: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

// ============================================================
// MOCK DATA
// ============================================================

const mockMedications: MedicationReminder[] = [
  {
    id: 'rem1',
    medication: {
      id: 'med1',
      name: 'Metformin',
      dosage: '1000mg',
      frequency: 'Twice daily',
      timeOfDay: 'morning',
      instructions: 'Take with food',
      refillDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      refillsRemaining: 2,
    },
    scheduledTime: new Date(),
    status: 'pending',
  },
  {
    id: 'rem2',
    medication: {
      id: 'med2',
      name: 'Lisinopril',
      dosage: '20mg',
      frequency: 'Once daily',
      timeOfDay: 'morning',
      refillsRemaining: 3,
    },
    scheduledTime: new Date(),
    status: 'taken',
    takenAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: 'rem3',
    medication: {
      id: 'med3',
      name: 'Atorvastatin',
      dosage: '40mg',
      frequency: 'Once daily',
      timeOfDay: 'bedtime',
    },
    scheduledTime: new Date(),
    status: 'pending',
  },
];

const mockCareGaps: CareGap[] = [
  {
    id: 'cg1',
    type: 'lab',
    title: 'A1c Test Due',
    description: 'Your diabetes monitoring lab work is due',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isOverdue: false,
    priority: 'high',
  },
  {
    id: 'cg2',
    type: 'screening',
    title: 'Annual Eye Exam',
    description: 'Diabetic eye screening recommended annually',
    dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    isOverdue: true,
    priority: 'high',
  },
  {
    id: 'cg3',
    type: 'vaccination',
    title: 'Flu Vaccine',
    description: 'Annual flu vaccination recommended',
    isOverdue: false,
    priority: 'medium',
  },
];

const mockGoals: HealthGoal[] = [
  {
    id: 'g1',
    title: 'Daily Steps',
    description: 'Walk 8,000 steps per day',
    target: 8000,
    current: 6234,
    unit: 'steps',
    streak: 5,
  },
  {
    id: 'g2',
    title: 'Blood Sugar Control',
    description: 'Keep fasting glucose under 130',
    target: 130,
    current: 118,
    unit: 'mg/dL',
  },
  {
    id: 'g3',
    title: 'Medication Adherence',
    description: 'Take all medications on time',
    target: 100,
    current: 92,
    unit: '%',
    streak: 12,
  },
];

const mockMessages: Message[] = [
  {
    id: 'm1',
    from: 'care_team',
    senderName: 'Dr. Smith',
    content: 'Your recent lab results look good! Keep up the great work with your diet and exercise.',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    read: true,
  },
  {
    id: 'm2',
    from: 'care_team',
    senderName: 'Care Coordinator',
    content: 'Reminder: Your A1c lab work is due next week. Please schedule at your convenience.',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    read: false,
  },
];

// ============================================================
// COMPONENTS
// ============================================================

const MoodSelector: React.FC<{
  value?: MoodLevel;
  onChange: (mood: MoodLevel) => void;
}> = ({ value, onChange }) => {
  const moods: Array<{ level: MoodLevel; icon: React.ReactNode; label: string; color: string }> = [
    { level: 'great', icon: <Smile className="w-8 h-8" />, label: 'Great', color: 'text-emerald-500' },
    { level: 'good', icon: <Smile className="w-8 h-8" />, label: 'Good', color: 'text-green-500' },
    { level: 'okay', icon: <Meh className="w-8 h-8" />, label: 'Okay', color: 'text-amber-500' },
    { level: 'poor', icon: <Frown className="w-8 h-8" />, label: 'Poor', color: 'text-orange-500' },
    { level: 'bad', icon: <Frown className="w-8 h-8" />, label: 'Bad', color: 'text-red-500' },
  ];

  return (
    <div className="flex justify-between">
      {moods.map((mood) => (
        <button
          key={mood.level}
          onClick={() => onChange(mood.level)}
          className={`flex flex-col items-center p-3 rounded-xl transition-all ${
            value === mood.level
              ? 'bg-purple-100 scale-110'
              : 'hover:bg-slate-50'
          }`}
        >
          <span className={mood.color}>{mood.icon}</span>
          <span className={`text-xs mt-1 ${value === mood.level ? 'font-medium' : 'text-slate-500'}`}>
            {mood.label}
          </span>
        </button>
      ))}
    </div>
  );
};

const SliderInput: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  max: number;
  icon: React.ReactNode;
  lowLabel: string;
  highLabel: string;
}> = ({ label, value, onChange, max, icon, lowLabel, highLabel }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <span className="text-lg font-bold text-purple-600">{value}/{max}</span>
      </div>
      <input
        type="range"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
};

const MedicationCard: React.FC<{
  reminder: MedicationReminder;
  onTake: (id: string) => void;
  onSkip: (id: string) => void;
}> = ({ reminder, onTake, onSkip }) => {
  const { medication, status, takenAt } = reminder;
  
  const timeIcons = {
    morning: <Sun className="w-4 h-4 text-amber-500" />,
    afternoon: <Sun className="w-4 h-4 text-orange-500" />,
    evening: <Moon className="w-4 h-4 text-indigo-500" />,
    bedtime: <Moon className="w-4 h-4 text-purple-500" />,
    as_needed: <Clock className="w-4 h-4 text-slate-500" />,
  };

  return (
    <div className={`p-4 rounded-xl border ${
      status === 'taken' ? 'bg-emerald-50 border-emerald-200' :
      status === 'missed' ? 'bg-red-50 border-red-200' :
      'bg-white border-slate-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            status === 'taken' ? 'bg-emerald-100' :
            status === 'missed' ? 'bg-red-100' :
            'bg-purple-100'
          }`}>
            <Pill className={`w-5 h-5 ${
              status === 'taken' ? 'text-emerald-600' :
              status === 'missed' ? 'text-red-600' :
              'text-purple-600'
            }`} />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">{medication.name}</h4>
            <p className="text-sm text-slate-500">{medication.dosage} • {medication.frequency}</p>
            <div className="flex items-center gap-2 mt-1">
              {timeIcons[medication.timeOfDay]}
              <span className="text-xs text-slate-500 capitalize">{medication.timeOfDay.replace('_', ' ')}</span>
            </div>
            {medication.instructions && (
              <p className="text-xs text-amber-600 mt-1">💡 {medication.instructions}</p>
            )}
          </div>
        </div>
        
        {status === 'pending' ? (
          <div className="flex gap-2">
            <button
              onClick={() => onTake(reminder.id)}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Take
            </button>
            <button
              onClick={() => onSkip(reminder.id)}
              className="px-3 py-2 text-slate-500 text-sm hover:bg-slate-100 rounded-lg transition-colors"
            >
              Skip
            </button>
          </div>
        ) : status === 'taken' ? (
          <div className="flex items-center gap-1 text-emerald-600">
            <CheckCircle size={16} />
            <span className="text-sm">Taken {takenAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ) : (
          <span className="text-sm text-red-600">Missed</span>
        )}
      </div>

      {medication.refillsRemaining !== undefined && medication.refillsRemaining <= 2 && (
        <div className="mt-3 p-2 bg-amber-50 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-xs text-amber-700">
            {medication.refillsRemaining} refills remaining
            {medication.refillDate && ` • Refill by ${medication.refillDate.toLocaleDateString()}`}
          </span>
        </div>
      )}
    </div>
  );
};

const CareGapCard: React.FC<{
  gap: CareGap;
  onSchedule: (id: string) => void;
}> = ({ gap, onSchedule }) => {
  const typeIcons = {
    screening: <Activity className="w-5 h-5" />,
    vaccination: <Zap className="w-5 h-5" />,
    lab: <Droplets className="w-5 h-5" />,
    follow_up: <Calendar className="w-5 h-5" />,
    referral: <Phone className="w-5 h-5" />,
  };

  const priorityColors = {
    high: 'border-red-200 bg-red-50',
    medium: 'border-amber-200 bg-amber-50',
    low: 'border-slate-200 bg-slate-50',
  };

  return (
    <div className={`p-4 rounded-xl border ${priorityColors[gap.priority]}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            gap.isOverdue ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600'
          }`}>
            {typeIcons[gap.type]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-900">{gap.title}</h4>
              {gap.isOverdue && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Overdue</span>
              )}
            </div>
            <p className="text-sm text-slate-500">{gap.description}</p>
            {gap.dueDate && (
              <p className="text-xs text-slate-400 mt-1">
                {gap.isOverdue ? 'Was due' : 'Due'}: {gap.dueDate.toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => onSchedule(gap.id)}
          className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          Schedule
        </button>
      </div>
    </div>
  );
};

const GoalCard: React.FC<{ goal: HealthGoal }> = ({ goal }) => {
  const progress = Math.min((goal.current / goal.target) * 100, 100);
  const isAchieved = goal.current >= goal.target;

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-slate-900">{goal.title}</h4>
          <p className="text-xs text-slate-500">{goal.description}</p>
        </div>
        {goal.streak && goal.streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-full">
            <Award className="w-3 h-3 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">{goal.streak} day streak</span>
          </div>
        )}
      </div>
      
      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-bold text-slate-900">
          {goal.current.toLocaleString()}
          <span className="text-sm font-normal text-slate-500"> {goal.unit}</span>
        </span>
        <span className="text-sm text-slate-500">
          Goal: {goal.target.toLocaleString()} {goal.unit}
        </span>
      </div>

      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${isAchieved ? 'bg-emerald-500' : 'bg-purple-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {isAchieved && (
        <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
          <CheckCircle size={12} />
          Goal achieved!
        </p>
      )}
    </div>
  );
};

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isPatient = message.from === 'patient';

  return (
    <div className={`flex ${isPatient ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] p-3 rounded-2xl ${
        isPatient 
          ? 'bg-purple-600 text-white rounded-br-md' 
          : 'bg-slate-100 text-slate-900 rounded-bl-md'
      }`}>
        {!isPatient && (
          <p className="text-xs font-medium text-purple-600 mb-1">{message.senderName}</p>
        )}
        <p className="text-sm">{message.content}</p>
        <p className={`text-xs mt-1 ${isPatient ? 'text-purple-200' : 'text-slate-400'}`}>
          {message.timestamp.toLocaleString([], { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const HealthCompanion: React.FC<{
  patientName: string;
  patientId: string;
}> = ({ patientName, patientId }) => {
  const [activeTab, setActiveTab] = useState<'checkin' | 'medications' | 'goals' | 'messages'>('checkin');
  const [medications, setMedications] = useState<MedicationReminder[]>(mockMedications);
  const [careGaps] = useState<CareGap[]>(mockCareGaps);
  const [goals] = useState<HealthGoal[]>(mockGoals);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  
  // Check-in state
  const [checkInMood, setCheckInMood] = useState<MoodLevel | undefined>();
  const [painLevel, setPainLevel] = useState(0);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [sleepQuality, setSleepQuality] = useState(5);
  const [checkInSubmitted, setCheckInSubmitted] = useState(false);

  const pendingMeds = medications.filter(m => m.status === 'pending').length;
  const overdueCareGaps = careGaps.filter(g => g.isOverdue).length;
  const unreadMessages = messages.filter(m => !m.read && m.from === 'care_team').length;

  const handleTakeMedication = (id: string) => {
    setMedications(prev => prev.map(med => 
      med.id === id ? { ...med, status: 'taken' as MedicationStatus, takenAt: new Date() } : med
    ));
  };

  const handleSkipMedication = (id: string) => {
    setMedications(prev => prev.map(med => 
      med.id === id ? { ...med, status: 'skipped' as MedicationStatus } : med
    ));
  };

  const handleSubmitCheckIn = () => {
    // In production, save to database
    setCheckInSubmitted(true);
    setTimeout(() => setCheckInSubmitted(false), 3000);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message: Message = {
      id: `m_${Date.now()}`,
      from: 'patient',
      senderName: patientName,
      content: newMessage,
      timestamp: new Date(),
      read: true,
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-purple-200">{getGreeting()}</p>
          <h1 className="text-2xl font-bold mt-1">{patientName}</h1>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold">{pendingMeds}</p>
              <p className="text-xs text-purple-200">Medications Due</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold">{overdueCareGaps}</p>
              <p className="text-xs text-purple-200">Care Gaps</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold">{unreadMessages}</p>
              <p className="text-xs text-purple-200">New Messages</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-2xl mx-auto flex">
          {[
            { key: 'checkin', label: 'Check-In', icon: Heart },
            { key: 'medications', label: 'Medications', icon: Pill, badge: pendingMeds },
            { key: 'goals', label: 'Goals', icon: Target },
            { key: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute top-2 right-4 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-6">
        {/* Daily Check-In Tab */}
        {activeTab === 'checkin' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">How are you feeling today?</h2>
              
              <MoodSelector value={checkInMood} onChange={setCheckInMood} />

              <div className="mt-6 space-y-6">
                <SliderInput
                  label="Pain Level"
                  value={painLevel}
                  onChange={setPainLevel}
                  max={10}
                  icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
                  lowLabel="No pain"
                  highLabel="Severe"
                />

                <SliderInput
                  label="Energy Level"
                  value={energyLevel}
                  onChange={setEnergyLevel}
                  max={10}
                  icon={<Zap className="w-4 h-4 text-amber-500" />}
                  lowLabel="Very low"
                  highLabel="Very high"
                />

                <SliderInput
                  label="Sleep Quality"
                  value={sleepQuality}
                  onChange={setSleepQuality}
                  max={10}
                  icon={<Moon className="w-4 h-4 text-indigo-500" />}
                  lowLabel="Poor"
                  highLabel="Excellent"
                />
              </div>

              <button
                onClick={handleSubmitCheckIn}
                disabled={!checkInMood}
                className="w-full mt-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {checkInSubmitted ? (
                  <>
                    <CheckCircle size={20} />
                    Check-In Submitted!
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Submit Daily Check-In
                  </>
                )}
              </button>
            </div>

            {/* Care Gaps */}
            {careGaps.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Care Reminders</h2>
                <div className="space-y-3">
                  {careGaps.map(gap => (
                    <CareGapCard
                      key={gap.id}
                      gap={gap}
                      onSchedule={(id) => console.log('Schedule:', id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Health Tip */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Health Tip of the Day</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Taking a 15-minute walk after meals can reduce blood sugar spikes by up to 30%. 
                    Try a short stroll after dinner tonight!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Medications Tab */}
        {activeTab === 'medications' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Today's Medications</h2>
            
            {medications.map(reminder => (
              <MedicationCard
                key={reminder.id}
                reminder={reminder}
                onTake={handleTakeMedication}
                onSkip={handleSkipMedication}
              />
            ))}

            <div className="mt-6 p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Medication Adherence</p>
                  <p className="text-sm text-slate-500">This week</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600">92%</p>
                  <p className="text-xs text-emerald-600">+5% from last week</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Health Goals</h2>
              <button className="flex items-center gap-1 text-purple-600 text-sm font-medium">
                <Plus size={16} />
                Add Goal
              </button>
            </div>
            
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="flex flex-col h-[calc(100vh-300px)]">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Care Team Messages</h2>
            
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map(message => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                <Phone size={18} />
                Request Call
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                <Video size={18} />
                Video Visit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Emergency Button */}
      <div className="fixed bottom-6 right-6">
        <button className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white font-medium rounded-full shadow-lg hover:bg-red-700 transition-colors">
          <AlertTriangle size={20} />
          <span className="hidden sm:inline">Emergency</span>
        </button>
      </div>
    </div>
  );
};

export default HealthCompanion;
