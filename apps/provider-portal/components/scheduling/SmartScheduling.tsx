// ============================================================
// ATTENDING AI - Smart Clinical Scheduling
// apps/provider-portal/components/scheduling/SmartScheduling.tsx
//
// Phase 10B: AI-optimized scheduling for better outcomes
// ============================================================

'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Zap,
  Brain,
  Phone,
  Video,
  MapPin,
  Star,
  BarChart3,
  ArrowRight,
  RefreshCw,
  Settings,
  Bell,
  X,
  Check,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type AppointmentType = 'new_patient' | 'follow_up' | 'urgent' | 'procedure' | 'telehealth' | 'wellness';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'no_show' | 'cancelled';
export type SlotAvailability = 'available' | 'booked' | 'blocked' | 'overbookable';

export interface Provider {
  id: string;
  name: string;
  specialty: string;
  avatar?: string;
  schedule: ProviderSchedule;
}

export interface ProviderSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
}

export interface DaySchedule {
  start: string;
  end: string;
  slotDuration: number;
  blocked?: string[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  type: AppointmentType;
  status: AppointmentStatus;
  date: Date;
  time: string;
  duration: number;
  reason: string;
  notes?: string;
  noShowProbability?: number;
  acuityScore?: number;
  isOverbooking?: boolean;
}

export interface TimeSlot {
  time: string;
  availability: SlotAvailability;
  appointment?: Appointment;
  aiScore?: number;
  aiReason?: string;
}

export interface SchedulingRecommendation {
  id: string;
  type: 'optimal_slot' | 'overbook' | 'reschedule' | 'no_show_risk' | 'capacity';
  title: string;
  description: string;
  action?: {
    label: string;
    handler: () => void;
  };
  impact?: string;
}

export interface SchedulingMetrics {
  utilizationRate: number;
  noShowRate: number;
  avgWaitTime: number;
  patientSatisfaction: number;
  slotsAvailable: number;
  slotsBooked: number;
  overbookings: number;
}

// ============================================================
// MOCK DATA
// ============================================================

const mockProviders: Provider[] = [
  {
    id: 'p1',
    name: 'Dr. Sarah Chen',
    specialty: 'Family Medicine',
    schedule: {
      monday: { start: '08:00', end: '17:00', slotDuration: 20 },
      tuesday: { start: '08:00', end: '17:00', slotDuration: 20 },
      wednesday: { start: '08:00', end: '12:00', slotDuration: 20 },
      thursday: { start: '08:00', end: '17:00', slotDuration: 20 },
      friday: { start: '08:00', end: '15:00', slotDuration: 20 },
    },
  },
  {
    id: 'p2',
    name: 'Dr. Michael Rodriguez',
    specialty: 'Internal Medicine',
    schedule: {
      monday: { start: '09:00', end: '18:00', slotDuration: 30 },
      tuesday: { start: '09:00', end: '18:00', slotDuration: 30 },
      wednesday: { start: '09:00', end: '18:00', slotDuration: 30 },
      thursday: { start: '09:00', end: '18:00', slotDuration: 30 },
      friday: { start: '09:00', end: '14:00', slotDuration: 30 },
    },
  },
];

const mockAppointments: Appointment[] = [
  {
    id: 'a1',
    patientId: 'pt1',
    patientName: 'John Smith',
    providerId: 'p1',
    providerName: 'Dr. Sarah Chen',
    type: 'follow_up',
    status: 'confirmed',
    date: new Date(),
    time: '09:00',
    duration: 20,
    reason: 'Diabetes follow-up',
    noShowProbability: 0.05,
    acuityScore: 3,
  },
  {
    id: 'a2',
    patientId: 'pt2',
    patientName: 'Mary Johnson',
    providerId: 'p1',
    providerName: 'Dr. Sarah Chen',
    type: 'urgent',
    status: 'scheduled',
    date: new Date(),
    time: '09:20',
    duration: 20,
    reason: 'Chest pain evaluation',
    noShowProbability: 0.02,
    acuityScore: 8,
  },
  {
    id: 'a3',
    patientId: 'pt3',
    patientName: 'Robert Williams',
    providerId: 'p1',
    providerName: 'Dr. Sarah Chen',
    type: 'new_patient',
    status: 'scheduled',
    date: new Date(),
    time: '10:00',
    duration: 40,
    reason: 'New patient evaluation',
    noShowProbability: 0.25,
    acuityScore: 4,
  },
  {
    id: 'a4',
    patientId: 'pt4',
    patientName: 'Patricia Davis',
    providerId: 'p1',
    providerName: 'Dr. Sarah Chen',
    type: 'telehealth',
    status: 'confirmed',
    date: new Date(),
    time: '11:00',
    duration: 20,
    reason: 'Medication refill',
    noShowProbability: 0.08,
    acuityScore: 2,
  },
  {
    id: 'a5',
    patientId: 'pt5',
    patientName: 'James Brown',
    providerId: 'p1',
    providerName: 'Dr. Sarah Chen',
    type: 'follow_up',
    status: 'checked_in',
    date: new Date(),
    time: '14:00',
    duration: 20,
    reason: 'Hypertension follow-up',
    noShowProbability: 0.03,
    acuityScore: 4,
  },
];

const mockMetrics: SchedulingMetrics = {
  utilizationRate: 78,
  noShowRate: 8.5,
  avgWaitTime: 12,
  patientSatisfaction: 4.3,
  slotsAvailable: 45,
  slotsBooked: 32,
  overbookings: 3,
};

// ============================================================
// AI SCHEDULING ENGINE (MOCK)
// ============================================================

const generateAIRecommendations = (appointments: Appointment[], date: Date): SchedulingRecommendation[] => {
  const recommendations: SchedulingRecommendation[] = [];
  
  // Find high no-show risk appointments
  const highRiskAppts = appointments.filter(a => (a.noShowProbability || 0) > 0.2);
  if (highRiskAppts.length > 0) {
    recommendations.push({
      id: 'r1',
      type: 'no_show_risk',
      title: `${highRiskAppts.length} appointment(s) with high no-show risk`,
      description: `Consider confirming these appointments or enabling overbooking for their time slots`,
      impact: `Potential to recover ${highRiskAppts.length * 20} minutes of provider time`,
    });
  }
  
  // Check for underutilized times
  recommendations.push({
    id: 'r2',
    type: 'capacity',
    title: 'Afternoon slots underutilized',
    description: '2:00 PM - 4:00 PM has 60% open capacity. Consider outreach to patients due for follow-up.',
    impact: 'Could increase daily visits by 3-4',
  });
  
  // Smart overbooking suggestion
  recommendations.push({
    id: 'r3',
    type: 'overbook',
    title: 'Smart overbooking opportunity',
    description: '10:00 AM slot has 25% no-show probability. AI recommends allowing 1 overbook.',
    impact: 'Reduces empty slot risk by 90%',
  });
  
  return recommendations;
};

const calculateOptimalSlot = (patientType: AppointmentType, provider: Provider): { time: string; score: number; reason: string }[] => {
  // Mock AI scoring for optimal slots
  return [
    { time: '09:00', score: 95, reason: 'Best for new patients - provider is freshest' },
    { time: '10:20', score: 88, reason: 'Good availability, low no-show period' },
    { time: '14:00', score: 75, reason: 'Available but higher no-show risk' },
  ];
};

// ============================================================
// COMPONENTS
// ============================================================

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { direction: 'up' | 'down'; value: number };
  color?: string;
}> = ({ label, value, icon, trend, color = 'text-slate-600' }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </div>
      <div className="p-2 bg-slate-100 rounded-lg">{icon}</div>
    </div>
    {trend && (
      <div className={`flex items-center gap-1 mt-2 text-sm ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
        {trend.direction === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {trend.value}% vs last week
      </div>
    )}
  </div>
);

const AppointmentTypeIcon: React.FC<{ type: AppointmentType }> = ({ type }) => {
  const icons: Record<AppointmentType, React.ReactNode> = {
    new_patient: <User size={14} className="text-teal-500" />,
    follow_up: <RefreshCw size={14} className="text-blue-500" />,
    urgent: <AlertTriangle size={14} className="text-red-500" />,
    procedure: <Star size={14} className="text-amber-500" />,
    telehealth: <Video size={14} className="text-green-500" />,
    wellness: <CheckCircle size={14} className="text-teal-500" />,
  };
  return icons[type];
};

const StatusBadge: React.FC<{ status: AppointmentStatus }> = ({ status }) => {
  const config: Record<AppointmentStatus, { color: string; label: string }> = {
    scheduled: { color: 'bg-slate-100 text-slate-700', label: 'Scheduled' },
    confirmed: { color: 'bg-blue-100 text-blue-700', label: 'Confirmed' },
    checked_in: { color: 'bg-green-100 text-green-700', label: 'Checked In' },
    in_progress: { color: 'bg-teal-100 text-teal-700', label: 'In Progress' },
    completed: { color: 'bg-emerald-100 text-emerald-700', label: 'Completed' },
    no_show: { color: 'bg-red-100 text-red-700', label: 'No Show' },
    cancelled: { color: 'bg-slate-100 text-slate-400', label: 'Cancelled' },
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config[status].color}`}>
      {config[status].label}
    </span>
  );
};

const AppointmentCard: React.FC<{
  appointment: Appointment;
  onAction: (action: string) => void;
}> = ({ appointment, onAction }) => (
  <div className={`p-3 rounded-lg border ${
    appointment.type === 'urgent' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
  }`}>
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        <AppointmentTypeIcon type={appointment.type} />
        <span className="font-medium text-slate-900">{appointment.patientName}</span>
      </div>
      <StatusBadge status={appointment.status} />
    </div>
    <p className="text-sm text-slate-600 mb-2">{appointment.reason}</p>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {appointment.time} ({appointment.duration}min)
        </span>
        {appointment.noShowProbability && appointment.noShowProbability > 0.15 && (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertTriangle size={12} />
            {Math.round(appointment.noShowProbability * 100)}% no-show risk
          </span>
        )}
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onAction('check_in')}
          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
        >
          Check In
        </button>
      </div>
    </div>
  </div>
);

const TimeSlotView: React.FC<{
  slots: TimeSlot[];
  onSlotClick: (slot: TimeSlot) => void;
}> = ({ slots, onSlotClick }) => (
  <div className="space-y-1">
    {slots.map((slot, idx) => (
      <button
        key={idx}
        onClick={() => slot.availability !== 'blocked' && onSlotClick(slot)}
        disabled={slot.availability === 'blocked'}
        className={`w-full p-2 rounded-lg text-left transition-all ${
          slot.availability === 'available' ? 'bg-green-50 hover:bg-green-100 border border-green-200' :
          slot.availability === 'booked' ? 'bg-blue-50 border border-blue-200' :
          slot.availability === 'overbookable' ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200' :
          'bg-slate-100 border border-slate-200 cursor-not-allowed'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">{slot.time}</span>
          {slot.availability === 'available' && (
            <span className="text-xs text-green-600">Available</span>
          )}
          {slot.availability === 'overbookable' && (
            <span className="text-xs text-amber-600">Overbookable</span>
          )}
          {slot.aiScore && (
            <span className="text-xs px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded">
              AI: {slot.aiScore}%
            </span>
          )}
        </div>
        {slot.appointment && (
          <p className="text-xs text-slate-500 mt-1">{slot.appointment.patientName}</p>
        )}
      </button>
    ))}
  </div>
);

const AIRecommendationCard: React.FC<{ recommendation: SchedulingRecommendation }> = ({ recommendation }) => {
  const icons: Record<string, React.ReactNode> = {
    optimal_slot: <Star className="text-teal-500" size={18} />,
    overbook: <Plus className="text-amber-500" size={18} />,
    reschedule: <RefreshCw className="text-blue-500" size={18} />,
    no_show_risk: <AlertTriangle className="text-red-500" size={18} />,
    capacity: <BarChart3 className="text-green-500" size={18} />,
  };

  return (
    <div className="p-3 bg-gradient-to-r from-teal-50 to-teal-50 rounded-lg border border-teal-100">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          {icons[recommendation.type]}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-slate-900">{recommendation.title}</h4>
          <p className="text-sm text-slate-600 mt-1">{recommendation.description}</p>
          {recommendation.impact && (
            <p className="text-xs text-teal-600 mt-2 flex items-center gap-1">
              <Zap size={12} />
              {recommendation.impact}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const SmartScheduling: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedProvider, setSelectedProvider] = useState<Provider>(mockProviders[0]);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  const recommendations = useMemo(() => 
    generateAIRecommendations(appointments, selectedDate),
    [appointments, selectedDate]
  );

  const todayAppointments = appointments.filter(a => 
    a.date.toDateString() === selectedDate.toDateString() &&
    a.providerId === selectedProvider.id
  ).sort((a, b) => a.time.localeCompare(b.time));

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleAppointmentAction = (action: string, appointmentId?: string) => {
    console.log('Action:', action, appointmentId);
  };

  // Generate time slots for the day
  const timeSlots: TimeSlot[] = useMemo(() => {
    const slots: TimeSlot[] = [];
    const daySchedule = selectedProvider.schedule.monday; // Simplified - use actual day
    
    let currentTime = daySchedule.start;
    const endTime = daySchedule.end;
    
    while (currentTime < endTime) {
      const bookedAppt = todayAppointments.find(a => a.time === currentTime);
      
      slots.push({
        time: currentTime,
        availability: bookedAppt 
          ? ((bookedAppt.noShowProbability || 0) > 0.2 ? 'overbookable' : 'booked') 
          : 'available',
        appointment: bookedAppt,
        aiScore: bookedAppt ? undefined : Math.floor(Math.random() * 30) + 70,
      });
      
      // Increment time by slot duration
      const [hours, mins] = currentTime.split(':').map(Number);
      const totalMins = hours * 60 + mins + daySchedule.slotDuration;
      currentTime = `${Math.floor(totalMins / 60).toString().padStart(2, '0')}:${(totalMins % 60).toString().padStart(2, '0')}`;
    }
    
    return slots;
  }, [selectedProvider, selectedDate, todayAppointments]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Smart Clinical Scheduling</h2>
              <p className="text-blue-100 text-sm">AI-optimized appointment management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowNewAppointment(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <Plus size={18} />
              New Appointment
            </button>
            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-5 gap-4 p-4 bg-slate-50 border-b border-slate-200">
        <MetricCard
          label="Utilization"
          value={`${mockMetrics.utilizationRate}%`}
          icon={<BarChart3 size={18} className="text-blue-600" />}
          trend={{ direction: 'up', value: 5 }}
          color="text-blue-600"
        />
        <MetricCard
          label="No-Show Rate"
          value={`${mockMetrics.noShowRate}%`}
          icon={<AlertTriangle size={18} className="text-amber-600" />}
          trend={{ direction: 'down', value: 2 }}
          color="text-amber-600"
        />
        <MetricCard
          label="Avg Wait Time"
          value={`${mockMetrics.avgWaitTime}m`}
          icon={<Clock size={18} className="text-green-600" />}
          color="text-green-600"
        />
        <MetricCard
          label="Available Today"
          value={mockMetrics.slotsAvailable - mockMetrics.slotsBooked}
          icon={<Calendar size={18} className="text-teal-600" />}
          color="text-teal-600"
        />
        <MetricCard
          label="Satisfaction"
          value={`${mockMetrics.patientSatisfaction}/5`}
          icon={<Star size={18} className="text-amber-500" />}
          color="text-amber-500"
        />
      </div>

      <div className="flex h-[600px]">
        {/* Left Panel - Calendar & AI */}
        <div className="w-80 border-r border-slate-200 p-4 overflow-y-auto">
          {/* Date Navigator */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={handlePrevDay} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <p className="font-semibold text-slate-900">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
              </p>
              <p className="text-sm text-slate-500">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <button onClick={handleNextDay} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Provider Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Provider</label>
            <select
              value={selectedProvider.id}
              onChange={(e) => setSelectedProvider(mockProviders.find(p => p.id === e.target.value) || mockProviders[0])}
              className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {mockProviders.map(p => (
                <option key={p.id} value={p.id}>{p.name} - {p.specialty}</option>
              ))}
            </select>
          </div>

          {/* AI Recommendations */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={18} className="text-teal-600" />
              <h3 className="font-semibold text-slate-900">AI Insights</h3>
            </div>
            <div className="space-y-3">
              {recommendations.slice(0, 3).map(rec => (
                <AIRecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          </div>

          {/* Time Slots */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Time Slots</h3>
            <TimeSlotView 
              slots={timeSlots} 
              onSlotClick={(slot) => console.log('Slot clicked:', slot)} 
            />
          </div>
        </div>

        {/* Main Content - Appointments */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">
              Today's Schedule ({todayAppointments.length} appointments)
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                <Filter size={18} className="text-slate-600" />
              </button>
            </div>
          </div>

          {/* Appointment List */}
          <div className="space-y-3">
            {todayAppointments.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Calendar size={48} className="mx-auto mb-3 opacity-50" />
                <p>No appointments scheduled for this day</p>
              </div>
            ) : (
              todayAppointments.map(appt => (
                <AppointmentCard 
                  key={appt.id} 
                  appointment={appt}
                  onAction={(action) => handleAppointmentAction(action, appt.id)}
                />
              ))
            )}
          </div>

          {/* Quick Stats */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl">
            <h4 className="font-medium text-slate-700 mb-3">Day Summary</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{todayAppointments.filter(a => a.status === 'completed').length}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{todayAppointments.filter(a => ['scheduled', 'confirmed'].includes(a.status)).length}</p>
                <p className="text-xs text-slate-500">Upcoming</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{todayAppointments.filter(a => a.noShowProbability && a.noShowProbability > 0.15).length}</p>
                <p className="text-xs text-slate-500">At Risk</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{todayAppointments.filter(a => a.type === 'urgent').length}</p>
                <p className="text-xs text-slate-500">Urgent</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartScheduling;
