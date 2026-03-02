// =============================================================================
// ATTENDING AI - Schedule / Patients Today Page
// apps/provider-portal/pages/schedule/index.tsx
//
// Shows today's patient schedule with appointment times and status
// =============================================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  Home,
  Calendar,
  Clock,
  User,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  XCircle,
  Filter,
  Search,
  Plus,
  MapPin,
  Phone,
  FileText,
} from 'lucide-react';

// =============================================================================
// Theme
// =============================================================================

const theme = {
  gradient: 'linear-gradient(135deg, #0C3547 0%, #1A8FA8 100%)',
};

// =============================================================================
// Types
// =============================================================================

interface Appointment {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  mrn: string;
  phone: string;
  time: string;
  endTime: string;
  type: 'new' | 'follow-up' | 'urgent' | 'telehealth' | 'procedure';
  reason: string;
  status: 'scheduled' | 'checked-in' | 'in-progress' | 'completed' | 'no-show' | 'cancelled';
  room?: string;
  notes?: string;
  hasRedFlags?: boolean;
}

// =============================================================================
// Mock Data
// =============================================================================

const getMockSchedule = (): Appointment[] => [
  {
    id: 'apt-1',
    patientName: 'James Anderson',
    patientAge: 58,
    patientGender: 'Male',
    mrn: 'MRN-101',
    phone: '(555) 123-4567',
    time: '08:00 AM',
    endTime: '08:30 AM',
    type: 'follow-up',
    reason: 'Diabetes management',
    status: 'completed',
    room: 'Exam 1',
  },
  {
    id: 'apt-2',
    patientName: 'Maria Garcia',
    patientAge: 42,
    patientGender: 'Female',
    mrn: 'MRN-102',
    phone: '(555) 234-5678',
    time: '08:30 AM',
    endTime: '09:00 AM',
    type: 'follow-up',
    reason: 'Hypertension follow-up',
    status: 'completed',
    room: 'Exam 2',
  },
  {
    id: 'apt-3',
    patientName: 'Robert Chen',
    patientAge: 35,
    patientGender: 'Male',
    mrn: 'MRN-103',
    phone: '(555) 345-6789',
    time: '09:00 AM',
    endTime: '09:30 AM',
    type: 'new',
    reason: 'New patient visit',
    status: 'completed',
    room: 'Exam 1',
  },
  {
    id: 'apt-4',
    patientName: 'Sarah Johnson',
    patientAge: 32,
    patientGender: 'Female',
    mrn: '78932145',
    phone: '(555) 456-7890',
    time: '09:30 AM',
    endTime: '10:00 AM',
    type: 'urgent',
    reason: 'Severe headache - 3 days',
    status: 'in-progress',
    room: 'Exam 3',
    hasRedFlags: true,
  },
  {
    id: 'apt-5',
    patientName: 'Dorothy Clark',
    patientAge: 81,
    patientGender: 'Female',
    mrn: 'MRN-021',
    phone: '(555) 567-8901',
    time: '10:00 AM',
    endTime: '10:30 AM',
    type: 'urgent',
    reason: 'Fall at home - evaluation',
    status: 'checked-in',
    room: 'Exam 2',
    hasRedFlags: true,
  },
  {
    id: 'apt-6',
    patientName: 'Michael Brown',
    patientAge: 67,
    patientGender: 'Male',
    mrn: 'MRN-105',
    phone: '(555) 678-9012',
    time: '10:30 AM',
    endTime: '11:00 AM',
    type: 'telehealth',
    reason: 'Medication review',
    status: 'scheduled',
  },
  {
    id: 'apt-7',
    patientName: 'Jennifer Wilson',
    patientAge: 29,
    patientGender: 'Female',
    mrn: 'MRN-106',
    phone: '(555) 789-0123',
    time: '11:00 AM',
    endTime: '11:30 AM',
    type: 'follow-up',
    reason: 'Anxiety management',
    status: 'scheduled',
  },
  {
    id: 'apt-8',
    patientName: 'William Davis',
    patientAge: 54,
    patientGender: 'Male',
    mrn: 'MRN-107',
    phone: '(555) 890-1234',
    time: '11:30 AM',
    endTime: '12:00 PM',
    type: 'procedure',
    reason: 'Joint injection - knee',
    status: 'scheduled',
    room: 'Procedure Room',
  },
  {
    id: 'apt-9',
    patientName: 'Linda Thompson',
    patientAge: 45,
    patientGender: 'Female',
    mrn: 'MRN-024',
    phone: '(555) 901-2345',
    time: '01:00 PM',
    endTime: '01:30 PM',
    type: 'urgent',
    reason: 'Abdominal pain',
    status: 'scheduled',
    hasRedFlags: true,
  },
  {
    id: 'apt-10',
    patientName: 'Kevin Martinez',
    patientAge: 28,
    patientGender: 'Male',
    mrn: 'MRN-023',
    phone: '(555) 012-3456',
    time: '01:30 PM',
    endTime: '02:00 PM',
    type: 'new',
    reason: 'Establish care',
    status: 'scheduled',
  },
  {
    id: 'apt-11',
    patientName: 'Nancy White',
    patientAge: 71,
    patientGender: 'Female',
    mrn: 'MRN-109',
    phone: '(555) 123-4568',
    time: '02:00 PM',
    endTime: '02:30 PM',
    type: 'follow-up',
    reason: 'COPD management',
    status: 'scheduled',
  },
  {
    id: 'apt-12',
    patientName: 'Thomas Lee',
    patientAge: 62,
    patientGender: 'Male',
    mrn: 'MRN-110',
    phone: '(555) 234-5679',
    time: '02:30 PM',
    endTime: '03:00 PM',
    type: 'follow-up',
    reason: 'Post-surgery follow-up',
    status: 'cancelled',
    notes: 'Patient rescheduled to next week',
  },
  {
    id: 'apt-13',
    patientName: 'Margaret White',
    patientAge: 72,
    patientGender: 'Female',
    mrn: 'MRN-020',
    phone: '(555) 345-6780',
    time: '03:00 PM',
    endTime: '03:30 PM',
    type: 'urgent',
    reason: 'Shortness of breath',
    status: 'scheduled',
    hasRedFlags: true,
  },
  {
    id: 'apt-14',
    patientName: 'Robert Martinez',
    patientAge: 66,
    patientGender: 'Male',
    mrn: 'MRN-022',
    phone: '(555) 456-7891',
    time: '03:30 PM',
    endTime: '04:00 PM',
    type: 'urgent',
    reason: 'Chest discomfort',
    status: 'scheduled',
    hasRedFlags: true,
  },
  {
    id: 'apt-15',
    patientName: 'Susan Taylor',
    patientAge: 39,
    patientGender: 'Female',
    mrn: 'MRN-112',
    phone: '(555) 567-8902',
    time: '04:00 PM',
    endTime: '04:30 PM',
    type: 'telehealth',
    reason: 'Lab results review',
    status: 'scheduled',
  },
  {
    id: 'apt-16',
    patientName: 'David Johnson',
    patientAge: 48,
    patientGender: 'Male',
    mrn: 'MRN-113',
    phone: '(555) 678-9013',
    time: '04:30 PM',
    endTime: '05:00 PM',
    type: 'follow-up',
    reason: 'Weight management',
    status: 'no-show',
    notes: 'Called - no answer. Left voicemail.',
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

const getStatusIcon = (status: Appointment['status']) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'in-progress':
      return <PlayCircle className="w-5 h-5 text-blue-500" />;
    case 'checked-in':
      return <Clock className="w-5 h-5 text-amber-500" />;
    case 'scheduled':
      return <Calendar className="w-5 h-5 text-gray-400" />;
    case 'cancelled':
      return <XCircle className="w-5 h-5 text-gray-400" />;
    case 'no-show':
      return <PauseCircle className="w-5 h-5 text-red-400" />;
  }
};

const getStatusLabel = (status: Appointment['status']) => {
  switch (status) {
    case 'completed': return 'Completed';
    case 'in-progress': return 'In Progress';
    case 'checked-in': return 'Checked In';
    case 'scheduled': return 'Scheduled';
    case 'cancelled': return 'Cancelled';
    case 'no-show': return 'No Show';
  }
};

const getTypeColor = (type: Appointment['type']) => {
  switch (type) {
    case 'new': return 'bg-blue-100 text-blue-700';
    case 'follow-up': return 'bg-gray-100 text-gray-700';
    case 'urgent': return 'bg-red-100 text-red-700';
    case 'telehealth': return 'bg-teal-100 text-teal-700';
    case 'procedure': return 'bg-amber-100 text-amber-700';
  }
};

// =============================================================================
// Appointment Row Component
// =============================================================================

const AppointmentRow: React.FC<{ appointment: Appointment }> = ({ appointment }) => {
  const router = useRouter();
  const isActive = appointment.status === 'in-progress' || appointment.status === 'checked-in';
  const isPast = appointment.status === 'completed' || appointment.status === 'no-show' || appointment.status === 'cancelled';

  return (
    <div
      onClick={() => {
        if (appointment.status !== 'cancelled' && appointment.status !== 'no-show') {
          router.push(`/previsit/${appointment.id}`);
        }
      }}
      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
        isActive 
          ? 'bg-teal-50 border-2 border-teal-300 shadow-md cursor-pointer hover:shadow-lg' 
          : isPast 
            ? 'bg-gray-50 opacity-75'
            : 'bg-white border border-gray-200 cursor-pointer hover:border-teal-300 hover:shadow-md'
      }`}
    >
      {/* Time */}
      <div className="w-24 flex-shrink-0">
        <p className={`font-semibold ${isActive ? 'text-teal-700' : 'text-gray-900'}`}>
          {appointment.time}
        </p>
        <p className="text-xs text-gray-500">{appointment.endTime}</p>
      </div>

      {/* Status Icon */}
      <div className="flex-shrink-0">
        {getStatusIcon(appointment.status)}
      </div>

      {/* Patient Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-semibold ${isActive ? 'text-teal-900' : 'text-gray-900'}`}>
            {appointment.patientName}
          </span>
          <span className="text-gray-500 text-sm">
            {appointment.patientAge}yo {appointment.patientGender}
          </span>
          {appointment.hasRedFlags && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
              <AlertTriangle className="w-3 h-3" />
              Red Flags
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 truncate">{appointment.reason}</p>
        {appointment.notes && (
          <p className="text-xs text-gray-400 mt-1 italic">{appointment.notes}</p>
        )}
      </div>

      {/* Type Badge */}
      <div className="flex-shrink-0">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(appointment.type)}`}>
          {appointment.type === 'follow-up' ? 'Follow-up' : 
           appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)}
        </span>
      </div>

      {/* Room */}
      {appointment.room && (
        <div className="flex-shrink-0 flex items-center gap-1 text-sm text-gray-500">
          <MapPin className="w-4 h-4" />
          {appointment.room}
        </div>
      )}

      {/* Action */}
      {!isPast && appointment.status !== 'cancelled' && (
        <ChevronRight className="w-5 h-5 text-gray-400" />
      )}
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export default function SchedulePage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');

  useEffect(() => {
    setTimeout(() => {
      setAppointments(getMockSchedule());
      setLoading(false);
    }, 300);
  }, []);

  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'upcoming') {
      return apt.status === 'scheduled' || apt.status === 'checked-in' || apt.status === 'in-progress';
    }
    if (filter === 'completed') {
      return apt.status === 'completed';
    }
    return true;
  });

  const stats = {
    total: appointments.length,
    completed: appointments.filter(a => a.status === 'completed').length,
    remaining: appointments.filter(a => a.status === 'scheduled' || a.status === 'checked-in').length,
    inProgress: appointments.filter(a => a.status === 'in-progress').length,
    urgent: appointments.filter(a => a.type === 'urgent' && a.status !== 'completed').length,
  };

  const dateStr = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.gradient }}>
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Schedule - {dateStr} | ATTENDING AI</title>
      </Head>

      <div className="min-h-screen" style={{ background: theme.gradient }}>
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Link
                  href="/"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <Home className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-white">Today's Schedule</h1>
                  <p className="text-teal-200 text-sm">{dateStr}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button className="px-4 py-2 bg-white/20 text-white rounded-lg font-medium">
                  Today
                </button>
                <button className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-teal-200 text-sm">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-teal-200 text-sm">Completed</p>
              <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-teal-200 text-sm">In Progress</p>
              <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-teal-200 text-sm">Remaining</p>
              <p className="text-2xl font-bold text-amber-400">{stats.remaining}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-teal-200 text-sm">Urgent</p>
              <p className="text-2xl font-bold text-red-400">{stats.urgent}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            {[
              { value: 'all', label: 'All' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'completed', label: 'Completed' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as typeof filter)}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                  filter === f.value
                    ? 'bg-white text-teal-700'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Schedule List */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="space-y-3">
              {filteredAppointments.map((apt) => (
                <AppointmentRow key={apt.id} appointment={apt} />
              ))}
            </div>

            {filteredAppointments.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No appointments match your filter.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
