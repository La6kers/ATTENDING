// =============================================================================
// ATTENDING AI - Care Coordination Hub Component
// apps/provider-portal/components/interventions/CareCoordinationHub.tsx
//
// Task management, handoffs, and team communication
// =============================================================================

'use client';

import React, { useState } from 'react';
import {
  Users,
  ClipboardList,
  MessageSquare,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  Plus,
  Filter,
  Search,
  ChevronRight,
  ChevronDown,
  UserCircle,
  Calendar,
  Bell,
  FileText,
  Stethoscope,
  Phone,
  Pill,
  TestTube,
  Activity,
  X,
  MoreVertical,
  Flag,
  ArrowUp,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type TaskCategory = 
  | 'follow_up'
  | 'lab_review'
  | 'imaging_review'
  | 'referral'
  | 'prior_auth'
  | 'phone_call'
  | 'medication'
  | 'care_gap'
  | 'documentation';

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deferred';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

interface CareTask {
  id: string;
  patientId: string;
  patientName: string;
  category: TaskCategory;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: TeamMember;
  assignedBy: TeamMember;
  dueDate?: Date;
  createdAt: Date;
  notes?: string[];
}

interface PatientHandoff {
  id: string;
  patientId: string;
  patientName: string;
  fromProvider: TeamMember;
  toProvider: TeamMember;
  status: 'pending' | 'acknowledged' | 'completed';
  illness: string;
  patientSummary: string;
  actionList: Array<{ description: string; timing: string; owner: string }>;
  situationAwareness: string;
  activeDiagnoses: string[];
  medications: string[];
  allergies: string[];
  codeStatus: string;
  pendingResults: Array<{ type: string; name: string; actionIfAbnormal?: string }>;
  createdAt: Date;
}

interface SecureMessage {
  id: string;
  threadId: string;
  from: TeamMember;
  to: TeamMember[];
  subject: string;
  body: string;
  priority: 'normal' | 'high' | 'urgent';
  sentAt: Date;
  read: boolean;
  patientId?: string;
  patientName?: string;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockTeamMembers: TeamMember[] = [
  { id: 'tm1', name: 'Dr. Sarah Chen', role: 'Physician' },
  { id: 'tm2', name: 'Jessica Williams', role: 'RN Care Coordinator' },
  { id: 'tm3', name: 'Michael Brown', role: 'Medical Assistant' },
  { id: 'tm4', name: 'Dr. James Wilson', role: 'Physician' },
  { id: 'tm5', name: 'Emily Davis', role: 'Social Worker' },
];

const mockTasks: CareTask[] = [
  {
    id: 't1',
    patientId: 'p1',
    patientName: 'John Smith',
    category: 'lab_review',
    title: 'Review Troponin Results',
    description: 'Serial troponins resulted - review and determine disposition',
    priority: 'urgent',
    status: 'pending',
    assignedTo: mockTeamMembers[0],
    assignedBy: mockTeamMembers[1],
    dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: 't2',
    patientId: 'p2',
    patientName: 'Mary Johnson',
    category: 'follow_up',
    title: 'Schedule Post-Discharge Follow-up',
    description: 'Patient discharged yesterday - schedule 7-day follow-up appointment',
    priority: 'high',
    status: 'pending',
    assignedTo: mockTeamMembers[2],
    assignedBy: mockTeamMembers[0],
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: 't3',
    patientId: 'p3',
    patientName: 'Robert Davis',
    category: 'prior_auth',
    title: 'Submit PA for MRI Lumbar Spine',
    description: 'Insurance requires prior auth - clinical notes attached',
    priority: 'medium',
    status: 'in_progress',
    assignedTo: mockTeamMembers[1],
    assignedBy: mockTeamMembers[0],
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: 't4',
    patientId: 'p4',
    patientName: 'Linda Wilson',
    category: 'phone_call',
    title: 'Call Patient - Abnormal Lab Result',
    description: 'Potassium 5.8 - need to notify patient and adjust medication',
    priority: 'urgent',
    status: 'pending',
    assignedTo: mockTeamMembers[0],
    assignedBy: mockTeamMembers[1],
    dueDate: new Date(Date.now() + 1 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: 't5',
    patientId: 'p5',
    patientName: 'James Brown',
    category: 'care_gap',
    title: 'Close A1c Care Gap',
    description: 'A1c overdue - patient needs lab order and scheduling',
    priority: 'medium',
    status: 'pending',
    assignedTo: mockTeamMembers[2],
    assignedBy: mockTeamMembers[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
  },
  {
    id: 't6',
    patientId: 'p6',
    patientName: 'Patricia Martinez',
    category: 'referral',
    title: 'Coordinate Cardiology Referral',
    description: 'Patient needs urgent cardiology evaluation for new murmur',
    priority: 'high',
    status: 'pending',
    assignedTo: mockTeamMembers[1],
    assignedBy: mockTeamMembers[0],
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
];

const mockHandoffs: PatientHandoff[] = [
  {
    id: 'h1',
    patientId: 'p1',
    patientName: 'John Smith',
    fromProvider: mockTeamMembers[3],
    toProvider: mockTeamMembers[0],
    status: 'pending',
    illness: 'HIGH - Possible ACS',
    patientSummary: '62M with chest pain, elevated troponins, awaiting cardiology evaluation',
    actionList: [
      { description: 'Serial troponins q6h', timing: 'Next due 2pm', owner: 'RN' },
      { description: 'Cardiology consult', timing: 'Pending', owner: 'Attending' },
      { description: 'Heparin drip titration', timing: 'Ongoing', owner: 'RN' },
    ],
    situationAwareness: 'Family at bedside, patient anxious about possible cath. DNR discussion pending.',
    activeDiagnoses: ['NSTEMI', 'Type 2 Diabetes', 'Hypertension'],
    medications: ['Heparin drip', 'Aspirin 325mg', 'Atorvastatin 80mg', 'Metoprolol 25mg'],
    allergies: ['Penicillin'],
    codeStatus: 'Full Code',
    pendingResults: [
      { type: 'lab', name: 'Troponin (serial)', actionIfAbnormal: 'Notify cardiology' },
      { type: 'imaging', name: 'Echo', actionIfAbnormal: 'Call if EF <40%' },
    ],
    createdAt: new Date(Date.now() - 10 * 60 * 1000),
  },
];

const mockMessages: SecureMessage[] = [
  {
    id: 'm1',
    threadId: 'thread1',
    from: mockTeamMembers[1],
    to: [mockTeamMembers[0]],
    subject: 'Re: John Smith - Abnormal K+',
    body: 'Dr. Chen, I tried calling the patient but no answer. Left voicemail. Should I try again in an hour or send MyChart message?',
    priority: 'high',
    sentAt: new Date(Date.now() - 20 * 60 * 1000),
    read: false,
    patientId: 'p4',
    patientName: 'Linda Wilson',
  },
  {
    id: 'm2',
    threadId: 'thread2',
    from: mockTeamMembers[4],
    to: [mockTeamMembers[0]],
    subject: 'SDOH Screening - Maria Garcia',
    body: 'Completed SDOH screening for Maria Garcia. She has significant food insecurity and housing concerns. I\'ve connected her with local food bank and housing assistance. Would like to discuss in our next team huddle.',
    priority: 'normal',
    sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: true,
    patientId: 'p7',
    patientName: 'Maria Garcia',
  },
  {
    id: 'm3',
    threadId: 'thread3',
    from: mockTeamMembers[3],
    to: [mockTeamMembers[0]],
    subject: 'Coverage Request - Friday PM',
    body: 'Hi Sarah, would you be able to cover my afternoon clinic on Friday? I have a family obligation. Happy to return the favor anytime.',
    priority: 'normal',
    sentAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    read: true,
  },
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const categoryConfig: Record<TaskCategory, { icon: any; label: string; color: string }> = {
  follow_up: { icon: Calendar, label: 'Follow-up', color: 'bg-blue-100 text-blue-700' },
  lab_review: { icon: TestTube, label: 'Lab Review', color: 'bg-purple-100 text-purple-700' },
  imaging_review: { icon: Activity, label: 'Imaging', color: 'bg-indigo-100 text-indigo-700' },
  referral: { icon: Stethoscope, label: 'Referral', color: 'bg-teal-100 text-teal-700' },
  prior_auth: { icon: FileText, label: 'Prior Auth', color: 'bg-orange-100 text-orange-700' },
  phone_call: { icon: Phone, label: 'Phone Call', color: 'bg-green-100 text-green-700' },
  medication: { icon: Pill, label: 'Medication', color: 'bg-rose-100 text-rose-700' },
  care_gap: { icon: Flag, label: 'Care Gap', color: 'bg-amber-100 text-amber-700' },
  documentation: { icon: FileText, label: 'Documentation', color: 'bg-slate-100 text-slate-700' },
};

const priorityConfig: Record<TaskPriority, { color: string; bgColor: string; label: string }> = {
  critical: { color: 'text-red-700', bgColor: 'bg-red-100', label: 'CRITICAL' },
  urgent: { color: 'text-orange-700', bgColor: 'bg-orange-100', label: 'Urgent' },
  high: { color: 'text-amber-700', bgColor: 'bg-amber-100', label: 'High' },
  medium: { color: 'text-blue-700', bgColor: 'bg-blue-100', label: 'Medium' },
  low: { color: 'text-slate-600', bgColor: 'bg-slate-100', label: 'Low' },
};

const TaskCard: React.FC<{
  task: CareTask;
  onComplete: (id: string) => void;
  onEscalate: (id: string) => void;
}> = ({ task, onComplete, onEscalate }) => {
  const { icon: CategoryIcon, label, color } = categoryConfig[task.category];
  const priority = priorityConfig[task.priority];
  
  const isOverdue = task.dueDate && task.dueDate < new Date();
  const timeUntilDue = task.dueDate 
    ? Math.round((task.dueDate.getTime() - Date.now()) / (1000 * 60))
    : null;

  return (
    <div className={`p-4 rounded-lg border-2 ${
      isOverdue ? 'border-red-300 bg-red-50/50' :
      task.priority === 'urgent' || task.priority === 'critical' ? 'border-orange-200 bg-orange-50/50' :
      'border-slate-200 bg-white'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <CategoryIcon size={18} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priority.bgColor} ${priority.color}`}>
              {priority.label}
            </span>
            {isOverdue && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                OVERDUE
              </span>
            )}
            {task.status === 'in_progress' && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                In Progress
              </span>
            )}
          </div>
          
          <h4 className="font-medium text-slate-900">{task.title}</h4>
          <p className="text-sm text-slate-600 mb-2">{task.description}</p>
          
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <UserCircle size={14} />
              {task.patientName}
            </span>
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <Clock size={14} />
                {isOverdue 
                  ? `Overdue by ${Math.abs(timeUntilDue!)} min`
                  : timeUntilDue! < 60 
                    ? `Due in ${timeUntilDue} min`
                    : `Due ${task.dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                }
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onComplete(task.id)}
            className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
            title="Mark Complete"
          >
            <CheckCircle size={18} />
          </button>
          <button
            onClick={() => onEscalate(task.id)}
            className="p-2 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors"
            title="Escalate"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const HandoffCard: React.FC<{
  handoff: PatientHandoff;
  onAcknowledge: (id: string) => void;
}> = ({ handoff, onAcknowledge }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <ArrowRightLeft size={20} />
            <div>
              <h3 className="font-semibold">I-PASS Handoff</h3>
              <p className="text-blue-100 text-sm">
                From {handoff.fromProvider.name} → {handoff.toProvider.name}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            handoff.status === 'pending' 
              ? 'bg-amber-400 text-amber-900' 
              : 'bg-emerald-400 text-emerald-900'
          }`}>
            {handoff.status === 'pending' ? 'Needs Acknowledgment' : 'Acknowledged'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-white/20 rounded-full text-sm">
            {handoff.patientName}
          </span>
          <span className="px-2 py-1 bg-red-400 text-red-900 rounded-full text-sm font-medium">
            {handoff.illness}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Patient Summary */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Patient Summary</h4>
          <p className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
            {handoff.patientSummary}
          </p>
        </div>

        {/* Action List */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Action List</h4>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-slate-600">Action</th>
                  <th className="px-3 py-2 text-left text-slate-600">Timing</th>
                  <th className="px-3 py-2 text-left text-slate-600">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {handoff.actionList.map((action, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-slate-900">{action.description}</td>
                    <td className="px-3 py-2 text-slate-600">{action.timing}</td>
                    <td className="px-3 py-2 text-slate-600">{action.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Toggle Details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>

        {expanded && (
          <div className="space-y-4">
            {/* Situation Awareness */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-amber-700 mb-1 flex items-center gap-2">
                <AlertTriangle size={14} />
                Situation Awareness
              </h4>
              <p className="text-sm text-amber-700">{handoff.situationAwareness}</p>
            </div>

            {/* Clinical Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 mb-2">DIAGNOSES</h4>
                <div className="flex flex-wrap gap-1">
                  {handoff.activeDiagnoses.map((dx, idx) => (
                    <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      {dx}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 mb-2">ALLERGIES</h4>
                <div className="flex flex-wrap gap-1">
                  {handoff.allergies.map((allergy, idx) => (
                    <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-2">MEDICATIONS</h4>
              <div className="flex flex-wrap gap-1">
                {handoff.medications.map((med, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {med}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">CODE STATUS:</span>
                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full font-medium">
                  {handoff.codeStatus}
                </span>
              </div>
            </div>

            {/* Pending Results */}
            {handoff.pendingResults.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 mb-2">PENDING RESULTS</h4>
                <div className="space-y-2">
                  {handoff.pendingResults.map((result, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2">
                        {result.type === 'lab' ? <TestTube size={14} className="text-purple-500" /> : <Activity size={14} className="text-blue-500" />}
                        <span className="text-sm text-slate-700">{result.name}</span>
                      </div>
                      {result.actionIfAbnormal && (
                        <span className="text-xs text-amber-600">If abnormal: {result.actionIfAbnormal}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Acknowledge Button */}
        {handoff.status === 'pending' && (
          <button
            onClick={() => onAcknowledge(handoff.id)}
            className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} />
            Acknowledge Handoff
          </button>
        )}
      </div>
    </div>
  );
};

const MessageCard: React.FC<{
  message: SecureMessage;
  onRead: (id: string) => void;
  onReply: (id: string) => void;
}> = ({ message, onRead, onReply }) => {
  const priorityColor = {
    normal: 'border-l-slate-300',
    high: 'border-l-amber-400',
    urgent: 'border-l-red-400',
  };

  return (
    <div 
      className={`p-4 rounded-lg border-l-4 ${priorityColor[message.priority]} ${
        message.read ? 'bg-white border border-slate-200' : 'bg-blue-50 border border-blue-200'
      }`}
      onClick={() => !message.read && onRead(message.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
            <UserCircle size={24} className="text-slate-500" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{message.from.name}</p>
            <p className="text-xs text-slate-500">{message.from.role}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">
            {message.sentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          {message.priority !== 'normal' && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              message.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {message.priority.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <h4 className="font-medium text-slate-900 mb-1">{message.subject}</h4>
      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{message.body}</p>

      {message.patientName && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-slate-500">Patient:</span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full">
            {message.patientName}
          </span>
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onReply(message.id); }}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
      >
        <Send size={14} />
        Reply
      </button>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CareCoordinationHub: React.FC<{
  providerId?: string;
  providerName?: string;
}> = ({ providerId, providerName }) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'handoffs' | 'messages'>('tasks');
  const [tasks, setTasks] = useState<CareTask[]>(mockTasks);
  const [handoffs, setHandoffs] = useState<PatientHandoff[]>(mockHandoffs);
  const [messages, setMessages] = useState<SecureMessage[]>(mockMessages);
  const [taskFilter, setTaskFilter] = useState<'all' | 'urgent' | 'overdue'>('all');

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const overdueTasks = pendingTasks.filter(t => t.dueDate && t.dueDate < new Date());
  const urgentTasks = pendingTasks.filter(t => t.priority === 'urgent' || t.priority === 'critical');
  const unreadMessages = messages.filter(m => !m.read);
  const pendingHandoffs = handoffs.filter(h => h.status === 'pending');

  const filteredTasks = pendingTasks.filter(t => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'urgent') return t.priority === 'urgent' || t.priority === 'critical';
    if (taskFilter === 'overdue') return t.dueDate && t.dueDate < new Date();
    return true;
  });

  const handleCompleteTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'completed' as TaskStatus } : t));
  };

  const handleEscalateTask = (id: string) => {
    console.log('Escalating task:', id);
    alert('Task escalated to supervisor');
  };

  const handleAcknowledgeHandoff = (id: string) => {
    setHandoffs(prev => prev.map(h => h.id === id ? { ...h, status: 'acknowledged' as const } : h));
  };

  const handleReadMessage = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  };

  const handleReplyMessage = (id: string) => {
    console.log('Replying to message:', id);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Care Coordination Hub</h2>
              <p className="text-cyan-100 text-sm">Tasks, handoffs, and team communication</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
              <Plus size={20} />
            </button>
            <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors relative">
              <Bell size={20} />
              {(unreadMessages.length + pendingHandoffs.length) > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {unreadMessages.length + pendingHandoffs.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50">
        <div className="p-3 text-center">
          <p className="text-xl font-bold text-slate-900">{pendingTasks.length}</p>
          <p className="text-xs text-slate-500">Pending Tasks</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xl font-bold text-red-600">{overdueTasks.length}</p>
          <p className="text-xs text-slate-500">Overdue</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xl font-bold text-amber-600">{pendingHandoffs.length}</p>
          <p className="text-xs text-slate-500">Pending Handoffs</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xl font-bold text-blue-600">{unreadMessages.length}</p>
          <p className="text-xs text-slate-500">Unread Messages</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { key: 'tasks', label: 'My Tasks', icon: ClipboardList, count: pendingTasks.length },
          { key: 'handoffs', label: 'Handoffs', icon: ArrowRightLeft, count: pendingHandoffs.length },
          { key: 'messages', label: 'Messages', icon: MessageSquare, count: unreadMessages.length },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-cyan-600 border-b-2 border-cyan-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === tab.key ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-6 max-h-[600px] overflow-y-auto">
        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'urgent', label: 'Urgent' },
                  { key: 'overdue', label: 'Overdue' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setTaskFilter(f.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      taskFilter === f.key
                        ? 'bg-cyan-100 text-cyan-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 transition-colors">
                <Plus size={16} />
                New Task
              </button>
            </div>

            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">All caught up!</p>
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleCompleteTask}
                    onEscalate={handleEscalateTask}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Handoffs Tab */}
        {activeTab === 'handoffs' && (
          <div className="space-y-4">
            {handoffs.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ArrowRightLeft size={48} className="mx-auto mb-3 opacity-50" />
                <p className="font-medium">No pending handoffs</p>
              </div>
            ) : (
              handoffs.map((handoff) => (
                <HandoffCard
                  key={handoff.id}
                  handoff={handoff}
                  onAcknowledge={handleAcknowledgeHandoff}
                />
              ))
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
                <p className="font-medium">No messages</p>
              </div>
            ) : (
              messages.map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  onRead={handleReadMessage}
                  onReply={handleReplyMessage}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CareCoordinationHub;
