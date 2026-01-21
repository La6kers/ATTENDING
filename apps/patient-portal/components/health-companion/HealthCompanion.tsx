// ============================================================
// ATTENDING AI - Patient Health Companion
// Phase 8: Clinical Excellence & Differentiation
//
// Continuous patient engagement between visits
// Improves adherence, catches problems early, drives retention
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Heart,
  Activity,
  Pill,
  Calendar,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Smile,
  Meh,
  Frown,
  TrendingUp,
  TrendingDown,
  Clock,
  BookOpen,
  Bell,
  Phone,
  Thermometer,
  Droplets,
  Scale,
  Zap,
  Award,
  X,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface HealthCheckIn {
  id: string;
  date: string;
  mood: 'great' | 'good' | 'okay' | 'not-good' | 'bad' | null;
  symptoms: string[];
  vitals: {
    bloodPressure?: { systolic: number; diastolic: number };
    weight?: number;
    bloodSugar?: number;
    temperature?: number;
    painLevel?: number;
  };
  notes?: string;
}

interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  times: string[];
  instructions?: string;
  takenToday: boolean[];
  refillDate?: string;
}

interface Appointment {
  id: string;
  type: string;
  provider: string;
  date: string;
  time: string;
  location?: string;
  notes?: string;
}

interface CareGap {
  id: string;
  type: string;
  description: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
}

interface HealthTip {
  id: string;
  title: string;
  content: string;
  category: string;
  readTime: number;
}

// ============================================================
// MOCK DATA
// ============================================================

const mockMedications: Medication[] = [
  {
    id: 'med-1',
    name: 'Metformin',
    dose: '1000mg',
    frequency: 'Twice daily',
    times: ['8:00 AM', '8:00 PM'],
    instructions: 'Take with food',
    takenToday: [true, false],
  },
  {
    id: 'med-2',
    name: 'Lisinopril',
    dose: '20mg',
    frequency: 'Once daily',
    times: ['8:00 AM'],
    takenToday: [false],
  },
  {
    id: 'med-3',
    name: 'Atorvastatin',
    dose: '40mg',
    frequency: 'Once daily',
    times: ['9:00 PM'],
    instructions: 'Take at bedtime',
    takenToday: [false],
    refillDate: '2026-02-01',
  },
];

const mockAppointments: Appointment[] = [
  {
    id: 'apt-1',
    type: 'Lab Work',
    provider: 'Quest Diagnostics',
    date: '2026-01-25',
    time: '9:00 AM',
    notes: 'Fasting required - no food or drink (except water) for 12 hours',
  },
  {
    id: 'apt-2',
    type: 'Follow-up Visit',
    provider: 'Dr. Sarah Smith',
    date: '2026-01-28',
    time: '2:00 PM',
    location: 'Rural Health Clinic',
  },
];

const mockCareGaps: CareGap[] = [
  {
    id: 'gap-1',
    type: 'A1c Test',
    description: 'Your quarterly A1c test is due',
    dueDate: '2026-02-15',
    priority: 'high',
  },
  {
    id: 'gap-2',
    type: 'Eye Exam',
    description: 'Annual diabetic eye exam recommended',
    dueDate: '2026-03-01',
    priority: 'medium',
  },
];

const mockHealthTip: HealthTip = {
  id: 'tip-1',
  title: 'Post-Meal Walking',
  content: 'Taking a 15-minute walk after meals can reduce blood sugar spikes by up to 30%. Even light activity helps your muscles use glucose more effectively.',
  category: 'Diabetes Management',
  readTime: 2,
};

// ============================================================
// HELPER COMPONENTS
// ============================================================

const MoodSelector: React.FC<{
  value: string | null;
  onChange: (mood: string) => void;
}> = ({ value, onChange }) => {
  const moods = [
    { id: 'great', emoji: '😊', label: 'Great', color: 'green' },
    { id: 'good', emoji: '🙂', label: 'Good', color: 'lime' },
    { id: 'okay', emoji: '😐', label: 'Okay', color: 'yellow' },
    { id: 'not-good', emoji: '😕', label: 'Not Good', color: 'orange' },
    { id: 'bad', emoji: '😢', label: 'Bad', color: 'red' },
  ];

  return (
    <div className="flex justify-between gap-2">
      {moods.map((mood) => (
        <button
          key={mood.id}
          onClick={() => onChange(mood.id)}
          className={`flex flex-col items-center p-3 rounded-xl transition-all ${
            value === mood.id
              ? 'bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500 scale-110'
              : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <span className="text-2xl">{mood.emoji}</span>
          <span className={`text-xs mt-1 ${
            value === mood.id ? 'text-purple-700 dark:text-purple-300 font-medium' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {mood.label}
          </span>
        </button>
      ))}
    </div>
  );
};

const VitalInput: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  unit?: string;
}> = ({ icon, label, value, onChange, placeholder, unit }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
    <div className="text-purple-500">{icon}</div>
    <div className="flex-1">
      <label className="text-xs text-gray-500 dark:text-gray-400">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-gray-900 dark:text-white font-medium focus:outline-none"
        />
        {unit && <span className="text-gray-400 text-sm">{unit}</span>}
      </div>
    </div>
  </div>
);

const MedicationCard: React.FC<{
  medication: Medication;
  onToggle: (medId: string, doseIndex: number) => void;
}> = ({ medication, onToggle }) => {
  const nextDose = medication.times.findIndex((_, i) => !medication.takenToday[i]);
  const allTaken = medication.takenToday.every(Boolean);

  return (
    <div className={`p-4 rounded-xl border-2 transition-colors ${
      allTaken 
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
    }`}>
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">{medication.name}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {medication.dose} • {medication.frequency}
          </p>
          {medication.instructions && (
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              ⓘ {medication.instructions}
            </p>
          )}
        </div>
        {allTaken && (
          <div className="bg-green-500 p-1 rounded-full">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        {medication.times.map((time, index) => (
          <button
            key={index}
            onClick={() => onToggle(medication.id, index)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              medication.takenToday[index]
                ? 'bg-green-500 text-white'
                : nextDose === index
                ? 'bg-purple-600 text-white animate-pulse'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {medication.takenToday[index] ? '✓ ' : ''}{time}
          </button>
        ))}
      </div>

      {medication.refillDate && (
        <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1">
          <Bell className="w-3 h-3" />
          Refill needed by {new Date(medication.refillDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const HealthCompanion: React.FC<{
  patientName?: string;
}> = ({ patientName = 'John' }) => {
  const [mood, setMood] = useState<string | null>(null);
  const [vitals, setVitals] = useState({
    bloodPressure: '',
    weight: '',
    bloodSugar: '',
  });
  const [medications, setMedications] = useState(mockMedications);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInSubmitted, setCheckInSubmitted] = useState(false);
  const [streak, setStreak] = useState(7);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', icon: <Sun className="w-6 h-6 text-yellow-500" /> };
    if (hour < 18) return { text: 'Good afternoon', icon: <Sun className="w-6 h-6 text-orange-500" /> };
    return { text: 'Good evening', icon: <Moon className="w-6 h-6 text-indigo-500" /> };
  };

  const greeting = getGreeting();

  const handleMedicationToggle = (medId: string, doseIndex: number) => {
    setMedications(meds => 
      meds.map(med => 
        med.id === medId
          ? { ...med, takenToday: med.takenToday.map((taken, i) => i === doseIndex ? !taken : taken) }
          : med
      )
    );
  };

  const handleCheckInSubmit = () => {
    setCheckInSubmitted(true);
    setStreak(s => s + 1);
    setTimeout(() => setShowCheckIn(false), 2000);
  };

  const medicationProgress = medications.reduce((acc, med) => {
    const taken = med.takenToday.filter(Boolean).length;
    const total = med.takenToday.length;
    return { taken: acc.taken + taken, total: acc.total + total };
  }, { taken: 0, total: 0 });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 px-4 pt-8 pb-16">
        <div className="flex items-center gap-3 mb-4">
          {greeting.icon}
          <div>
            <h1 className="text-xl font-bold text-white">{greeting.text}, {patientName}!</h1>
            <p className="text-purple-200 text-sm">How are you feeling today?</p>
          </div>
        </div>

        {/* Streak Badge */}
        <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 w-fit">
          <Award className="w-4 h-4 text-yellow-300" />
          <span className="text-white text-sm font-medium">{streak} day streak!</span>
        </div>
      </div>

      {/* Main Content - Overlapping cards */}
      <div className="px-4 -mt-10 pb-24 space-y-4">
        {/* Daily Check-In Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Daily Check-In</h2>
            </div>
            {checkInSubmitted ? (
              <span className="text-green-600 dark:text-green-400 text-sm flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Completed
              </span>
            ) : (
              <button
                onClick={() => setShowCheckIn(!showCheckIn)}
                className="text-purple-600 dark:text-purple-400 text-sm font-medium"
              >
                {showCheckIn ? 'Close' : 'Start'}
              </button>
            )}
          </div>

          {showCheckIn && !checkInSubmitted && (
            <div className="space-y-4">
              {/* Mood Selection */}
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                  How are you feeling?
                </label>
                <MoodSelector value={mood} onChange={setMood} />
              </div>

              {/* Vitals */}
              <div className="grid grid-cols-2 gap-3">
                <VitalInput
                  icon={<Heart className="w-5 h-5" />}
                  label="Blood Pressure"
                  value={vitals.bloodPressure}
                  onChange={(v) => setVitals(vs => ({ ...vs, bloodPressure: v }))}
                  placeholder="120/80"
                  unit="mmHg"
                />
                <VitalInput
                  icon={<Scale className="w-5 h-5" />}
                  label="Weight"
                  value={vitals.weight}
                  onChange={(v) => setVitals(vs => ({ ...vs, weight: v }))}
                  placeholder="180"
                  unit="lbs"
                />
                <VitalInput
                  icon={<Droplets className="w-5 h-5" />}
                  label="Blood Sugar"
                  value={vitals.bloodSugar}
                  onChange={(v) => setVitals(vs => ({ ...vs, bloodSugar: v }))}
                  placeholder="110"
                  unit="mg/dL"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleCheckInSubmit}
                disabled={!mood}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:dark:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
              >
                Submit Check-In
              </button>
            </div>
          )}

          {checkInSubmitted && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Great job! Your check-in has been recorded.
              </p>
            </div>
          )}
        </div>

        {/* Medication Reminders */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-purple-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Medications</h2>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {medicationProgress.taken}/{medicationProgress.total} taken
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(medicationProgress.taken / medicationProgress.total) * 100}%` }}
            />
          </div>

          <div className="space-y-3">
            {medications.map(med => (
              <MedicationCard
                key={med.id}
                medication={med}
                onToggle={handleMedicationToggle}
              />
            ))}
          </div>
        </div>

        {/* Health Tip */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5" />
            <span className="text-blue-100 text-sm font-medium">Health Tip of the Day</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">{mockHealthTip.title}</h3>
          <p className="text-blue-100 text-sm leading-relaxed">{mockHealthTip.content}</p>
          <div className="flex items-center gap-2 mt-3 text-blue-200 text-xs">
            <Clock className="w-3 h-3" />
            <span>{mockHealthTip.readTime} min read</span>
            <span>•</span>
            <span>{mockHealthTip.category}</span>
          </div>
        </div>

        {/* Care Gaps */}
        {mockCareGaps.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Care Reminders</h2>
            </div>
            <div className="space-y-3">
              {mockCareGaps.map(gap => (
                <div 
                  key={gap.id}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    gap.priority === 'high' 
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : 'bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{gap.type}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{gap.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Upcoming</h2>
          </div>
          <div className="space-y-3">
            {mockAppointments.map(apt => (
              <div 
                key={apt.id}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
              >
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{apt.type}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {apt.provider}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    {new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {apt.time}
                  </p>
                  {apt.notes && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      ⓘ {apt.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-900 dark:text-white">Message Care Team</span>
          </button>
          <button className="flex items-center justify-center gap-2 p-4 bg-red-500 hover:bg-red-600 rounded-xl shadow-sm text-white">
            <Zap className="w-5 h-5" />
            <span className="font-medium">New Symptom</span>
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex justify-around">
          {[
            { icon: Heart, label: 'Home', active: true },
            { icon: Activity, label: 'History', active: false },
            { icon: MessageSquare, label: 'Messages', active: false },
            { icon: Scale, label: 'Profile', active: false },
          ].map((item, index) => (
            <button 
              key={index}
              className={`flex flex-col items-center gap-1 ${
                item.active ? 'text-purple-600' : 'text-gray-400'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HealthCompanion;
