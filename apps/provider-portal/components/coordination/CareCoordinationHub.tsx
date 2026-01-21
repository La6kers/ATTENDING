// ============================================================
// ATTENDING AI - Care Coordination Hub
// apps/provider-portal/components/coordination/CareCoordinationHub.tsx
//
// Phase 9C: Everyone on the care team, on the same page
// Seamless collaboration across all providers
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Phone,
  Video,
  FileText,
  Share2,
  Send,
  Plus,
  Filter,
  Search,
  ChevronRight,
  ChevronDown,
  Bell,
  UserPlus,
  Activity,
  Heart,
  Pill,
  Stethoscope,
  Building2,
  ArrowRight,
  RefreshCw,
  MapPin,
  X,
  MoreVertical,
  Star,
  Flag,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type TeamMemberRole = 
  | 'pcp' 
  | 'specialist' 
  | 'nurse' 
  | 'care_manager' 
  | 'pharmacist' 
  | 'social_worker'
  | 'therapist'
  | 'dietitian';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type ReferralStatus = 'pending' | 'scheduled' | 'completed' | 'declined' | 'no_show';

export interface CareTeamMember {
  id: string;
  name: string;
  role: TeamMemberRole;
  specialty?: string;
  organization: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
  lastActivity?: Date;
  avatar?: string;
}

export interface CareTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  dueDate: Date;
  status: TaskStatus;
  priority: TaskPriority;
  category: 'follow_up' | 'order' | 'referral' | 'documentation' | 'outreach' | 'review';
  patientId: string;
  createdAt: Date;
  completedAt?: Date;
  notes?: string;
}

export interface Referral {
  id: string;
  patientId: string;
  patientName: string;
  fromProvider: CareTeamMember;
  toProvider: CareTeamMember;
  specialty: string;
  reason: string;
  urgency: 'emergent' | 'urgent' | 'routine';
  status: ReferralStatus;
  createdAt: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  notes?: string;
  documents?: string[];
}

export interface CareMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: TeamMemberRole;
  content: string;
  timestamp: Date;
  patientId: string;
  isUrgent: boolean;
  readBy: string[];
  attachments?: string[];
}

export interface TransitionOfCare {
  id: string;
  patientId: string;
  patientName: string;
  type: 'admission' | 'discharge' | 'transfer' | 'ed_visit';
  fromFacility: string;
  toFacility: string;
  date: Date;
  diagnoses: string[];
  medications: string[];
  followUpNeeded: boolean;
  followUpDate?: Date;
  summary: string;
  status: 'pending_review' | 'reviewed' | 'action_required';
}

export interface PatientJourneyEvent {
  id: string;
  type: 'visit' | 'lab' | 'imaging' | 'procedure' | 'hospitalization' | 'medication' | 'referral';
  title: string;
  date: Date;
  provider?: string;
  facility?: string;
  summary: string;
  documents?: string[];
}

// ============================================================
// MOCK DATA
// ============================================================

const mockCareTeam: CareTeamMember[] = [
  {
    id: 'ct1',
    name: 'Dr. Sarah Chen',
    role: 'pcp',
    specialty: 'Family Medicine',
    organization: 'Valley Primary Care',
    isPrimary: true,
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: 'ct2',
    name: 'Dr. Michael Rodriguez',
    role: 'specialist',
    specialty: 'Cardiology',
    organization: 'Heart & Vascular Institute',
    lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: 'ct3',
    name: 'Dr. Emily Johnson',
    role: 'specialist',
    specialty: 'Endocrinology',
    organization: 'Diabetes Care Center',
    lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'ct4',
    name: 'Jennifer Adams, RN',
    role: 'care_manager',
    organization: 'Valley Primary Care',
    lastActivity: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: 'ct5',
    name: 'Mark Thompson, PharmD',
    role: 'pharmacist',
    organization: 'Valley Pharmacy',
    lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
];

const mockTasks: CareTask[] = [
  {
    id: 't1',
    title: 'Follow-up on cardiology referral',
    description: 'Confirm patient scheduled with Dr. Rodriguez for cardiac evaluation',
    assignedTo: 'ct4',
    assignedBy: 'ct1',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: 'pending',
    priority: 'high',
    category: 'referral',
    patientId: 'p1',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: 't2',
    title: 'Review A1c results',
    description: 'Patient A1c came back at 8.2%. Need to discuss medication adjustment.',
    assignedTo: 'ct1',
    assignedBy: 'ct3',
    dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'overdue',
    priority: 'urgent',
    category: 'review',
    patientId: 'p1',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: 't3',
    title: 'Medication reconciliation',
    description: 'Verify current medications after hospital discharge',
    assignedTo: 'ct5',
    assignedBy: 'ct4',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: 'in_progress',
    priority: 'high',
    category: 'order',
    patientId: 'p1',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
];

const mockReferrals: Referral[] = [
  {
    id: 'r1',
    patientId: 'p1',
    patientName: 'John Smith',
    fromProvider: mockCareTeam[0],
    toProvider: mockCareTeam[1],
    specialty: 'Cardiology',
    reason: 'Evaluation for exertional chest pain and shortness of breath',
    urgency: 'urgent',
    status: 'scheduled',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'r2',
    patientId: 'p1',
    patientName: 'John Smith',
    fromProvider: mockCareTeam[0],
    toProvider: mockCareTeam[2],
    specialty: 'Endocrinology',
    reason: 'Diabetes management - A1c not at goal despite medication changes',
    urgency: 'routine',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
];

const mockMessages: CareMessage[] = [
  {
    id: 'm1',
    senderId: 'ct2',
    senderName: 'Dr. Michael Rodriguez',
    senderRole: 'specialist',
    content: 'Stress test scheduled for next week. Please ensure patient holds beta blocker morning of test.',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    patientId: 'p1',
    isUrgent: false,
    readBy: ['ct1', 'ct4'],
  },
  {
    id: 'm2',
    senderId: 'ct4',
    senderName: 'Jennifer Adams, RN',
    senderRole: 'care_manager',
    content: 'Patient called with questions about new medication side effects. Left VM for Dr. Chen.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    patientId: 'p1',
    isUrgent: false,
    readBy: ['ct4'],
  },
  {
    id: 'm3',
    senderId: 'ct3',
    senderName: 'Dr. Emily Johnson',
    senderRole: 'specialist',
    content: 'Recommending starting GLP-1 agonist given A1c and BMI. Please confirm no contraindications.',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    patientId: 'p1',
    isUrgent: true,
    readBy: [],
  },
];

const mockTransitions: TransitionOfCare[] = [
  {
    id: 'toc1',
    patientId: 'p1',
    patientName: 'John Smith',
    type: 'discharge',
    fromFacility: 'Valley General Hospital',
    toFacility: 'Home',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    diagnoses: ['CHF Exacerbation', 'Type 2 Diabetes'],
    medications: ['Lisinopril 20mg', 'Lasix 40mg', 'Metformin 1000mg'],
    followUpNeeded: true,
    followUpDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    summary: 'Admitted for CHF exacerbation. Diuresed 5kg. Echo showed EF 35%. Started on new medications.',
    status: 'action_required',
  },
];

const mockJourneyEvents: PatientJourneyEvent[] = [
  {
    id: 'e1',
    type: 'hospitalization',
    title: 'Hospital Admission - CHF',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    facility: 'Valley General Hospital',
    summary: 'Admitted for CHF exacerbation with shortness of breath and weight gain',
  },
  {
    id: 'e2',
    type: 'procedure',
    title: 'Echocardiogram',
    date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    provider: 'Dr. Rodriguez',
    summary: 'EF 35%, moderate MR, no pericardial effusion',
  },
  {
    id: 'e3',
    type: 'hospitalization',
    title: 'Hospital Discharge',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    facility: 'Valley General Hospital',
    summary: 'Discharged home with new medications and follow-up appointments',
  },
  {
    id: 'e4',
    type: 'lab',
    title: 'Lab Results - BMP, BNP',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    summary: 'Creatinine stable at 1.4, BNP improved to 450',
  },
  {
    id: 'e5',
    type: 'visit',
    title: 'Upcoming: PCP Follow-up',
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    provider: 'Dr. Sarah Chen',
    summary: 'Post-discharge follow-up appointment',
  },
];

// ============================================================
// COMPONENTS
// ============================================================

const TeamMemberCard: React.FC<{
  member: CareTeamMember;
  isSelected?: boolean;
  onClick?: () => void;
}> = ({ member, isSelected, onClick }) => {
  const roleConfig: Record<TeamMemberRole, { color: string; label: string }> = {
    pcp: { color: 'bg-purple-100 text-purple-700', label: 'PCP' },
    specialist: { color: 'bg-blue-100 text-blue-700', label: 'Specialist' },
    nurse: { color: 'bg-green-100 text-green-700', label: 'Nurse' },
    care_manager: { color: 'bg-teal-100 text-teal-700', label: 'Care Manager' },
    pharmacist: { color: 'bg-amber-100 text-amber-700', label: 'Pharmacist' },
    social_worker: { color: 'bg-pink-100 text-pink-700', label: 'Social Worker' },
    therapist: { color: 'bg-indigo-100 text-indigo-700', label: 'Therapist' },
    dietitian: { color: 'bg-orange-100 text-orange-700', label: 'Dietitian' },
  };

  const config = roleConfig[member.role];
  const initials = member.name.split(' ').map(n => n[0]).join('').slice(0, 2);

  const getLastActivityText = (date?: Date) => {
    if (!date) return 'No recent activity';
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 1) return 'Active now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl border transition-all cursor-pointer ${
        isSelected 
          ? 'border-purple-300 bg-purple-50' 
          : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center font-semibold text-sm`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900 truncate">{member.name}</p>
            {member.isPrimary && (
              <Star size={12} className="text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-500">{member.specialty || config.label}</p>
          <p className="text-xs text-slate-400">{member.organization}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>
            {config.label}
          </span>
          <p className="text-xs text-slate-400 mt-1">{getLastActivityText(member.lastActivity)}</p>
        </div>
      </div>
    </div>
  );
};

const TaskCard: React.FC<{
  task: CareTask;
  teamMembers: CareTeamMember[];
  onStatusChange: (id: string, status: TaskStatus) => void;
}> = ({ task, teamMembers, onStatusChange }) => {
  const assignee = teamMembers.find(m => m.id === task.assignedTo);
  
  const statusConfig: Record<TaskStatus, { color: string; icon: React.ReactNode }> = {
    pending: { color: 'bg-slate-100 text-slate-700', icon: <Clock size={14} /> },
    in_progress: { color: 'bg-blue-100 text-blue-700', icon: <RefreshCw size={14} /> },
    completed: { color: 'bg-green-100 text-green-700', icon: <CheckCircle size={14} /> },
    overdue: { color: 'bg-red-100 text-red-700', icon: <AlertCircle size={14} /> },
    cancelled: { color: 'bg-slate-100 text-slate-400', icon: <X size={14} /> },
  };

  const priorityConfig: Record<TaskPriority, string> = {
    urgent: 'border-l-red-500',
    high: 'border-l-orange-500',
    medium: 'border-l-blue-500',
    low: 'border-l-slate-300',
  };

  const config = statusConfig[task.status];

  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${priorityConfig[task.priority]} p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900">{task.title}</h4>
          <p className="text-sm text-slate-600 mt-1">{task.description}</p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Users size={12} />
              {assignee?.name || 'Unassigned'}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Calendar size={12} />
              Due {task.dueDate.toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${config.color}`}>
            {config.icon}
            {task.status.replace('_', ' ')}
          </span>
          {task.status !== 'completed' && task.status !== 'cancelled' && (
            <button
              onClick={() => onStatusChange(task.id, 'completed')}
              className="text-xs text-green-600 hover:text-green-700"
            >
              Mark Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ReferralCard: React.FC<{
  referral: Referral;
  onStatusChange: (id: string, status: ReferralStatus) => void;
}> = ({ referral, onStatusChange }) => {
  const statusConfig: Record<ReferralStatus, { color: string; label: string }> = {
    pending: { color: 'bg-amber-100 text-amber-700', label: 'Pending' },
    scheduled: { color: 'bg-blue-100 text-blue-700', label: 'Scheduled' },
    completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
    declined: { color: 'bg-red-100 text-red-700', label: 'Declined' },
    no_show: { color: 'bg-slate-100 text-slate-700', label: 'No Show' },
  };

  const urgencyConfig: Record<string, string> = {
    emergent: 'border-l-red-500',
    urgent: 'border-l-orange-500',
    routine: 'border-l-blue-500',
  };

  const config = statusConfig[referral.status];

  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${urgencyConfig[referral.urgency]} p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-slate-900">{referral.specialty} Referral</h4>
          <p className="text-sm text-slate-500">{referral.patientName}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${config.color}`}>
          {config.label}
        </span>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 p-2 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500">From</p>
          <p className="text-sm font-medium">{referral.fromProvider.name}</p>
        </div>
        <ArrowRight size={16} className="text-slate-400" />
        <div className="flex-1 p-2 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500">To</p>
          <p className="text-sm font-medium">{referral.toProvider.name}</p>
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-3">{referral.reason}</p>

      {referral.scheduledDate && (
        <div className="flex items-center gap-2 text-sm text-blue-600 mb-3">
          <Calendar size={14} />
          Scheduled: {referral.scheduledDate.toLocaleDateString()}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition-colors">
          <FileText size={14} />
          View Details
        </button>
        <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-100 text-purple-700 text-sm rounded-lg hover:bg-purple-200 transition-colors">
          <MessageSquare size={14} />
          Message
        </button>
      </div>
    </div>
  );
};

const TransitionCard: React.FC<{
  transition: TransitionOfCare;
  onReview: (id: string) => void;
}> = ({ transition, onReview }) => {
  const typeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    admission: { icon: <Building2 size={16} />, label: 'Admission', color: 'text-blue-600' },
    discharge: { icon: <ArrowRight size={16} />, label: 'Discharge', color: 'text-green-600' },
    transfer: { icon: <RefreshCw size={16} />, label: 'Transfer', color: 'text-amber-600' },
    ed_visit: { icon: <AlertCircle size={16} />, label: 'ED Visit', color: 'text-red-600' },
  };

  const config = typeConfig[transition.type];

  return (
    <div className={`bg-white rounded-lg border p-4 ${
      transition.status === 'action_required' ? 'border-red-200 bg-red-50' : 'border-slate-200'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={config.color}>{config.icon}</span>
          <div>
            <h4 className="font-semibold text-slate-900">{config.label}</h4>
            <p className="text-sm text-slate-500">{transition.patientName}</p>
          </div>
        </div>
        {transition.status === 'action_required' && (
          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full flex items-center gap-1">
            <Flag size={12} />
            Action Required
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
        <span>{transition.fromFacility}</span>
        <ArrowRight size={14} />
        <span>{transition.toFacility}</span>
      </div>

      <p className="text-sm text-slate-600 mb-3">{transition.summary}</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {transition.diagnoses.map((dx, idx) => (
          <span key={idx} className="text-xs px-2 py-1 bg-slate-100 rounded-full">
            {dx}
          </span>
        ))}
      </div>

      {transition.followUpNeeded && transition.followUpDate && (
        <div className="flex items-center gap-2 text-sm text-amber-600 mb-3">
          <Calendar size={14} />
          Follow-up needed by {transition.followUpDate.toLocaleDateString()}
        </div>
      )}

      <button
        onClick={() => onReview(transition.id)}
        className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
      >
        Review & Acknowledge
      </button>
    </div>
  );
};

const PatientJourney: React.FC<{ events: PatientJourneyEvent[] }> = ({ events }) => {
  const typeIcons: Record<string, React.ReactNode> = {
    visit: <Stethoscope size={16} />,
    lab: <Activity size={16} />,
    imaging: <FileText size={16} />,
    procedure: <Heart size={16} />,
    hospitalization: <Building2 size={16} />,
    medication: <Pill size={16} />,
    referral: <Share2 size={16} />,
  };

  const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

      <div className="space-y-4">
        {sortedEvents.map((event, idx) => {
          const isPast = event.date <= new Date();
          return (
            <div key={event.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                isPast ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'
              }`}>
                {typeIcons[event.type]}
              </div>
              
              {/* Event content */}
              <div className={`flex-1 p-3 rounded-lg ${
                isPast ? 'bg-white border border-slate-200' : 'bg-slate-50 border border-dashed border-slate-300'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{event.title}</p>
                    <p className="text-xs text-slate-500">
                      {event.date.toLocaleDateString()} 
                      {event.provider && ` • ${event.provider}`}
                      {event.facility && ` • ${event.facility}`}
                    </p>
                  </div>
                  {!isPast && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      Upcoming
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-1">{event.summary}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const CareCoordinationHub: React.FC<{
  patientId: string;
  patientName: string;
}> = ({ patientId, patientName }) => {
  const [activeTab, setActiveTab] = useState<'team' | 'tasks' | 'referrals' | 'transitions' | 'journey' | 'messages'>('team');
  const [careTeam] = useState<CareTeamMember[]>(mockCareTeam);
  const [tasks, setTasks] = useState<CareTask[]>(mockTasks);
  const [referrals, setReferrals] = useState<Referral[]>(mockReferrals);
  const [messages] = useState<CareMessage[]>(mockMessages);
  const [transitions, setTransitions] = useState<TransitionOfCare[]>(mockTransitions);
  const [journeyEvents] = useState<PatientJourneyEvent[]>(mockJourneyEvents);
  const [selectedMember, setSelectedMember] = useState<CareTeamMember | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'overdue').length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
  const actionTransitions = transitions.filter(t => t.status === 'action_required').length;
  const unreadMessages = messages.filter(m => !m.readBy.includes('current_user')).length;

  const handleTaskStatusChange = (id: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status, completedAt: status === 'completed' ? new Date() : undefined } : t));
  };

  const handleReferralStatusChange = (id: string, status: ReferralStatus) => {
    setReferrals(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const handleTransitionReview = (id: string) => {
    setTransitions(prev => prev.map(t => t.id === id ? { ...t, status: 'reviewed' } : t));
  };

  const tabs = [
    { key: 'team', label: 'Care Team', icon: Users, badge: careTeam.length },
    { key: 'tasks', label: 'Tasks', icon: CheckCircle, badge: pendingTasks, badgeColor: 'bg-amber-500' },
    { key: 'referrals', label: 'Referrals', icon: Share2, badge: pendingReferrals },
    { key: 'transitions', label: 'Transitions', icon: RefreshCw, badge: actionTransitions, badgeColor: 'bg-red-500' },
    { key: 'journey', label: 'Patient Journey', icon: MapPin },
    { key: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages, badgeColor: 'bg-purple-500' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Care Coordination Hub</h2>
              <p className="text-teal-100 text-sm">Seamless collaboration across all providers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
              {patientName}
            </span>
            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <Bell size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab.key
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`w-5 h-5 ${tab.badgeColor || 'bg-slate-500'} text-white text-xs rounded-full flex items-center justify-center`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Care Team Tab */}
        {activeTab === 'team' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Care Team Members</h3>
                <button className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700">
                  <UserPlus size={14} />
                  Add Member
                </button>
              </div>
              {careTeam.map(member => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  isSelected={selectedMember?.id === member.id}
                  onClick={() => setSelectedMember(member)}
                />
              ))}
            </div>
            
            {selectedMember && (
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-4">Contact {selectedMember.name}</h3>
                <div className="space-y-3">
                  <button className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-teal-300 transition-colors">
                    <Phone size={18} className="text-teal-600" />
                    <span>Call</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-teal-300 transition-colors">
                    <Video size={18} className="text-teal-600" />
                    <span>Video Call</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-teal-300 transition-colors">
                    <MessageSquare size={18} className="text-teal-600" />
                    <span>Send Message</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-teal-300 transition-colors">
                    <Share2 size={18} className="text-teal-600" />
                    <span>Send Referral</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Care Coordination Tasks</h3>
              <button className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors">
                <Plus size={14} />
                Add Task
              </button>
            </div>
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                teamMembers={careTeam}
                onStatusChange={handleTaskStatusChange}
              />
            ))}
          </div>
        )}

        {/* Referrals Tab */}
        {activeTab === 'referrals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Active Referrals</h3>
              <button className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors">
                <Plus size={14} />
                New Referral
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {referrals.map(referral => (
                <ReferralCard
                  key={referral.id}
                  referral={referral}
                  onStatusChange={handleReferralStatusChange}
                />
              ))}
            </div>
          </div>
        )}

        {/* Transitions Tab */}
        {activeTab === 'transitions' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Transitions of Care</h3>
            {transitions.map(transition => (
              <TransitionCard
                key={transition.id}
                transition={transition}
                onReview={handleTransitionReview}
              />
            ))}
          </div>
        )}

        {/* Patient Journey Tab */}
        {activeTab === 'journey' && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Patient Care Journey</h3>
            <PatientJourney events={journeyEvents} />
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="flex flex-col h-[500px]">
            <h3 className="font-semibold text-slate-900 mb-4">Care Team Messages</h3>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.isUrgent ? 'bg-red-50 border border-red-100' : 'bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{message.senderName}</p>
                      {message.isUrgent && (
                        <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">Urgent</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600">{message.content}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message to the care team..."
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CareCoordinationHub;
