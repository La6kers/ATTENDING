// =============================================================================
// ATTENDING AI - Care Coordination Hub
// apps/shared/services/interventions/CareCoordinationHub.ts
//
// Team collaboration platform for care coordination including task management,
// secure messaging, handoffs, and care team communication. Ensures nothing
// falls through the cracks in complex patient care.
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';
export type TaskCategory = 
  | 'follow_up'
  | 'referral'
  | 'lab_review'
  | 'imaging_review'
  | 'medication'
  | 'patient_education'
  | 'care_gap'
  | 'prior_auth'
  | 'phone_call'
  | 'documentation'
  | 'coordination'
  | 'discharge_planning'
  | 'other';

export interface CareTask {
  id: string;
  patientId: string;
  patientName: string;
  
  // Task details
  category: TaskCategory;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  
  // Assignment
  assignedTo: TeamMember;
  assignedBy: TeamMember;
  delegatedFrom?: TeamMember;
  
  // Timing
  createdAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  
  // Context
  encounterId?: string;
  relatedOrderId?: string;
  relatedResultId?: string;
  
  // Communication
  notes: TaskNote[];
  attachments?: string[];
  
  // Escalation
  escalationLevel: number;
  escalatedTo?: TeamMember;
  
  // Tracking
  reminderSent?: boolean;
  overdueNotificationSent?: boolean;
}

export interface TaskNote {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  timestamp: Date;
  isSystemNote: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: 'physician' | 'np' | 'pa' | 'rn' | 'ma' | 'care_coordinator' | 'social_worker' | 'pharmacist' | 'other';
  specialty?: string;
  email?: string;
  phone?: string;
  npi?: string;
  active: boolean;
}

export interface CareTeam {
  id: string;
  patientId: string;
  members: CareTeamMember[];
  primaryProvider: TeamMember;
  createdAt: Date;
  updatedAt: Date;
}

export interface CareTeamMember {
  member: TeamMember;
  role: string;
  isPrimary: boolean;
  startDate: Date;
  endDate?: Date;
  responsibilities: string[];
}

export interface PatientHandoff {
  id: string;
  patientId: string;
  patientName: string;
  
  // Handoff details
  fromProvider: TeamMember;
  toProvider: TeamMember;
  handoffType: 'shift_change' | 'transfer' | 'discharge' | 'referral' | 'coverage';
  
  // Status
  status: 'pending' | 'acknowledged' | 'completed';
  
  // Content (I-PASS format)
  illness: string;           // Illness severity
  patientSummary: string;    // Patient summary
  actionList: HandoffAction[];
  situationAwareness: string; // Situation awareness items
  synthesis: string;          // Synthesis by receiver
  
  // Clinical details
  activeDiagnoses: string[];
  activeProblems: string[];
  pendingTasks: CareTask[];
  pendingResults: PendingResult[];
  medications: string[];
  allergies: string[];
  codeStatus: string;
  
  // Timing
  createdAt: Date;
  acknowledgedAt?: Date;
  
  // Notes
  additionalNotes?: string;
  questions?: string[];
}

export interface HandoffAction {
  description: string;
  timing: string;
  owner: string;
  contingency?: string;
}

export interface PendingResult {
  type: 'lab' | 'imaging' | 'pathology' | 'consult' | 'other';
  name: string;
  orderedAt: Date;
  expectedBy?: Date;
  actionIfAbnormal?: string;
}

export interface SecureMessage {
  id: string;
  threadId: string;
  patientId?: string;
  
  // Participants
  from: TeamMember;
  to: TeamMember[];
  cc?: TeamMember[];
  
  // Content
  subject: string;
  body: string;
  priority: 'normal' | 'high' | 'urgent';
  
  // Status
  sentAt: Date;
  readBy: Array<{ memberId: string; readAt: Date }>;
  
  // Attachments
  attachments?: MessageAttachment[];
  
  // Task link
  linkedTaskId?: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
}

export interface CareCoordinationMetrics {
  providerId: string;
  period: { start: Date; end: Date };
  
  // Task metrics
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  averageCompletionTime: number; // hours
  
  // Handoff metrics
  handoffsGiven: number;
  handoffsReceived: number;
  handoffAcknowledgmentRate: number;
  
  // Communication
  messagesSent: number;
  messagesReceived: number;
  averageResponseTime: number; // minutes
  
  // Care gaps
  careGapsClosed: number;
  pendingCareGaps: number;
}

// =============================================================================
// CARE COORDINATION HUB SERVICE
// =============================================================================

export class CareCoordinationHub extends EventEmitter {
  private tasks: Map<string, CareTask> = new Map();
  private careTeams: Map<string, CareTeam> = new Map();
  private handoffs: Map<string, PatientHandoff> = new Map();
  private messages: Map<string, SecureMessage> = new Map();

  constructor() {
    super();
  }

  // =========================================================================
  // TASK MANAGEMENT
  // =========================================================================

  async createTask(taskData: Omit<CareTask, 'id' | 'createdAt' | 'notes' | 'escalationLevel'>): Promise<CareTask> {
    const task: CareTask = {
      ...taskData,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      notes: [],
      escalationLevel: 0,
    };

    this.tasks.set(task.id, task);
    this.emit('taskCreated', task);

    // Schedule reminder if due date set
    if (task.dueDate) {
      this.scheduleTaskReminder(task);
    }

    return task;
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, note?: string): Promise<CareTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');

    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date();
    }

    if (note) {
      task.notes.push({
        id: `note_${Date.now()}`,
        authorId: 'system',
        authorName: 'System',
        authorRole: 'system',
        content: `Status changed to ${status}${note ? `: ${note}` : ''}`,
        timestamp: new Date(),
        isSystemNote: true,
      });
    }

    this.emit('taskUpdated', task);
    return task;
  }

  async addTaskNote(taskId: string, author: TeamMember, content: string): Promise<CareTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');

    task.notes.push({
      id: `note_${Date.now()}`,
      authorId: author.id,
      authorName: author.name,
      authorRole: author.role,
      content,
      timestamp: new Date(),
      isSystemNote: false,
    });

    this.emit('taskNoteAdded', { task, note: content });
    return task;
  }

  async reassignTask(taskId: string, newAssignee: TeamMember, reason?: string): Promise<CareTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');

    const previousAssignee = task.assignedTo;
    task.delegatedFrom = previousAssignee;
    task.assignedTo = newAssignee;

    task.notes.push({
      id: `note_${Date.now()}`,
      authorId: 'system',
      authorName: 'System',
      authorRole: 'system',
      content: `Task reassigned from ${previousAssignee.name} to ${newAssignee.name}${reason ? `. Reason: ${reason}` : ''}`,
      timestamp: new Date(),
      isSystemNote: true,
    });

    this.emit('taskReassigned', { task, from: previousAssignee, to: newAssignee });
    return task;
  }

  async escalateTask(taskId: string, escalateTo: TeamMember, reason: string): Promise<CareTask> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');

    task.escalationLevel += 1;
    task.escalatedTo = escalateTo;
    task.priority = 'urgent';

    task.notes.push({
      id: `note_${Date.now()}`,
      authorId: 'system',
      authorName: 'System',
      authorRole: 'system',
      content: `Task escalated (Level ${task.escalationLevel}) to ${escalateTo.name}. Reason: ${reason}`,
      timestamp: new Date(),
      isSystemNote: true,
    });

    this.emit('taskEscalated', { task, escalateTo, reason });
    return task;
  }

  getTasksForProvider(providerId: string, filters?: {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    category?: TaskCategory[];
    patientId?: string;
    includeOverdue?: boolean;
  }): CareTask[] {
    let tasks = Array.from(this.tasks.values()).filter(t => 
      t.assignedTo.id === providerId
    );

    if (filters?.status) {
      tasks = tasks.filter(t => filters.status!.includes(t.status));
    }
    if (filters?.priority) {
      tasks = tasks.filter(t => filters.priority!.includes(t.priority));
    }
    if (filters?.category) {
      tasks = tasks.filter(t => filters.category!.includes(t.category));
    }
    if (filters?.patientId) {
      tasks = tasks.filter(t => t.patientId === filters.patientId);
    }
    if (filters?.includeOverdue) {
      const now = new Date();
      tasks = tasks.filter(t => !t.dueDate || t.dueDate > now || filters.includeOverdue);
    }

    // Sort by priority and due date
    const priorityOrder: Record<TaskPriority, number> = { critical: 0, urgent: 1, high: 2, medium: 3, low: 4 };
    tasks.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
      return 0;
    });

    return tasks;
  }

  getOverdueTasks(providerId?: string): CareTask[] {
    const now = new Date();
    let tasks = Array.from(this.tasks.values()).filter(t => 
      t.status !== 'completed' && 
      t.status !== 'cancelled' &&
      t.dueDate && 
      t.dueDate < now
    );

    if (providerId) {
      tasks = tasks.filter(t => t.assignedTo.id === providerId);
    }

    return tasks;
  }

  private scheduleTaskReminder(task: CareTask): void {
    // In production, this would schedule actual notifications
    // For now, emit event when due date approaches
    if (!task.dueDate) return;

    const msUntilDue = task.dueDate.getTime() - Date.now();
    const reminderTime = msUntilDue - (24 * 60 * 60 * 1000); // 24 hours before

    if (reminderTime > 0) {
      setTimeout(() => {
        if (task.status !== 'completed' && task.status !== 'cancelled') {
          task.reminderSent = true;
          this.emit('taskReminder', task);
        }
      }, reminderTime);
    }
  }

  // =========================================================================
  // CARE TEAM MANAGEMENT
  // =========================================================================

  async createCareTeam(patientId: string, primaryProvider: TeamMember): Promise<CareTeam> {
    const careTeam: CareTeam = {
      id: `team_${Date.now()}`,
      patientId,
      members: [{
        member: primaryProvider,
        role: 'Primary Care Provider',
        isPrimary: true,
        startDate: new Date(),
        responsibilities: ['Overall care coordination', 'Treatment decisions'],
      }],
      primaryProvider,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.careTeams.set(patientId, careTeam);
    this.emit('careTeamCreated', careTeam);
    return careTeam;
  }

  async addCareTeamMember(
    patientId: string, 
    member: TeamMember, 
    role: string, 
    responsibilities: string[]
  ): Promise<CareTeam> {
    let careTeam = this.careTeams.get(patientId);
    if (!careTeam) {
      throw new Error('Care team not found');
    }

    careTeam.members.push({
      member,
      role,
      isPrimary: false,
      startDate: new Date(),
      responsibilities,
    });
    careTeam.updatedAt = new Date();

    this.emit('careTeamMemberAdded', { careTeam, member });
    return careTeam;
  }

  getCareTeam(patientId: string): CareTeam | undefined {
    return this.careTeams.get(patientId);
  }

  // =========================================================================
  // HANDOFFS (I-PASS FORMAT)
  // =========================================================================

  async createHandoff(handoffData: Omit<PatientHandoff, 'id' | 'createdAt' | 'status'>): Promise<PatientHandoff> {
    const handoff: PatientHandoff = {
      ...handoffData,
      id: `handoff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      status: 'pending',
    };

    this.handoffs.set(handoff.id, handoff);
    this.emit('handoffCreated', handoff);

    // Notify receiving provider
    this.notifyHandoffRecipient(handoff);

    return handoff;
  }

  async acknowledgeHandoff(handoffId: string, synthesis?: string): Promise<PatientHandoff> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) throw new Error('Handoff not found');

    handoff.status = 'acknowledged';
    handoff.acknowledgedAt = new Date();
    if (synthesis) {
      handoff.synthesis = synthesis;
    }

    this.emit('handoffAcknowledged', handoff);
    return handoff;
  }

  async completeHandoff(handoffId: string): Promise<PatientHandoff> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) throw new Error('Handoff not found');

    handoff.status = 'completed';
    this.emit('handoffCompleted', handoff);
    return handoff;
  }

  generateHandoffTemplate(patientData: {
    patientId: string;
    patientName: string;
    diagnoses: string[];
    medications: string[];
    allergies: string[];
    recentEvents?: string;
    pendingItems?: string[];
    codeStatus?: string;
  }): Partial<PatientHandoff> {
    return {
      patientId: patientData.patientId,
      patientName: patientData.patientName,
      illness: '', // To be filled
      patientSummary: `${patientData.patientName} is a patient with ${patientData.diagnoses.join(', ')}.`,
      actionList: [],
      situationAwareness: patientData.recentEvents || '',
      synthesis: '',
      activeDiagnoses: patientData.diagnoses,
      activeProblems: [],
      pendingTasks: [],
      pendingResults: [],
      medications: patientData.medications,
      allergies: patientData.allergies,
      codeStatus: patientData.codeStatus || 'Full Code',
    };
  }

  private notifyHandoffRecipient(handoff: PatientHandoff): void {
    // In production, send notification to receiving provider
    this.emit('handoffNotification', {
      to: handoff.toProvider,
      handoff,
      message: `You have a new patient handoff from ${handoff.fromProvider.name} for ${handoff.patientName}`,
    });
  }

  getPendingHandoffs(providerId: string): PatientHandoff[] {
    return Array.from(this.handoffs.values()).filter(h => 
      h.toProvider.id === providerId && h.status === 'pending'
    );
  }

  // =========================================================================
  // SECURE MESSAGING
  // =========================================================================

  async sendMessage(messageData: Omit<SecureMessage, 'id' | 'sentAt' | 'readBy'>): Promise<SecureMessage> {
    const message: SecureMessage = {
      ...messageData,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sentAt: new Date(),
      readBy: [],
    };

    this.messages.set(message.id, message);
    this.emit('messageSent', message);

    // Notify recipients
    for (const recipient of message.to) {
      this.emit('messageNotification', {
        to: recipient,
        message,
      });
    }

    return message;
  }

  async markMessageRead(messageId: string, memberId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) throw new Error('Message not found');

    if (!message.readBy.some(r => r.memberId === memberId)) {
      message.readBy.push({ memberId, readAt: new Date() });
      this.emit('messageRead', { messageId, memberId });
    }
  }

  getMessagesForProvider(providerId: string): SecureMessage[] {
    return Array.from(this.messages.values()).filter(m => 
      m.to.some(t => t.id === providerId) || m.from.id === providerId
    ).sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }

  getUnreadCount(providerId: string): number {
    return Array.from(this.messages.values()).filter(m => 
      m.to.some(t => t.id === providerId) &&
      !m.readBy.some(r => r.memberId === providerId)
    ).length;
  }

  // =========================================================================
  // QUICK TASK TEMPLATES
  // =========================================================================

  getTaskTemplates(): Array<{ category: TaskCategory; title: string; description: string }> {
    return [
      { category: 'follow_up', title: 'Schedule Follow-up Appointment', description: 'Schedule patient for follow-up visit' },
      { category: 'lab_review', title: 'Review Lab Results', description: 'Review and act on pending lab results' },
      { category: 'imaging_review', title: 'Review Imaging Results', description: 'Review and act on pending imaging' },
      { category: 'referral', title: 'Arrange Specialist Referral', description: 'Coordinate specialist referral' },
      { category: 'prior_auth', title: 'Submit Prior Authorization', description: 'Submit PA for medication/procedure' },
      { category: 'phone_call', title: 'Call Patient', description: 'Contact patient by phone' },
      { category: 'medication', title: 'Medication Reconciliation', description: 'Review and reconcile medications' },
      { category: 'patient_education', title: 'Patient Education', description: 'Provide patient education materials' },
      { category: 'care_gap', title: 'Close Care Gap', description: 'Address identified care gap' },
      { category: 'discharge_planning', title: 'Discharge Planning', description: 'Coordinate discharge planning' },
      { category: 'documentation', title: 'Complete Documentation', description: 'Complete required documentation' },
    ];
  }

  // =========================================================================
  // METRICS
  // =========================================================================

  getCoordinationMetrics(providerId: string, startDate: Date, endDate: Date): CareCoordinationMetrics {
    const providerTasks = Array.from(this.tasks.values()).filter(t => 
      t.assignedTo.id === providerId &&
      t.createdAt >= startDate &&
      t.createdAt <= endDate
    );

    const completedTasks = providerTasks.filter(t => t.status === 'completed');
    const overdueTasks = providerTasks.filter(t => 
      t.status !== 'completed' && 
      t.dueDate && 
      t.dueDate < new Date()
    );

    const handoffsGiven = Array.from(this.handoffs.values()).filter(h => 
      h.fromProvider.id === providerId &&
      h.createdAt >= startDate &&
      h.createdAt <= endDate
    );

    const handoffsReceived = Array.from(this.handoffs.values()).filter(h => 
      h.toProvider.id === providerId &&
      h.createdAt >= startDate &&
      h.createdAt <= endDate
    );

    const acknowledgedHandoffs = handoffsReceived.filter(h => h.status !== 'pending');

    const messages = Array.from(this.messages.values()).filter(m => 
      (m.from.id === providerId || m.to.some(t => t.id === providerId)) &&
      m.sentAt >= startDate &&
      m.sentAt <= endDate
    );

    // Calculate average completion time
    let totalCompletionTime = 0;
    for (const task of completedTasks) {
      if (task.completedAt) {
        totalCompletionTime += task.completedAt.getTime() - task.createdAt.getTime();
      }
    }
    const avgCompletionTimeHours = completedTasks.length > 0 
      ? (totalCompletionTime / completedTasks.length) / (1000 * 60 * 60)
      : 0;

    return {
      providerId,
      period: { start: startDate, end: endDate },
      totalTasks: providerTasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      averageCompletionTime: Math.round(avgCompletionTimeHours * 10) / 10,
      handoffsGiven: handoffsGiven.length,
      handoffsReceived: handoffsReceived.length,
      handoffAcknowledgmentRate: handoffsReceived.length > 0 
        ? (acknowledgedHandoffs.length / handoffsReceived.length) * 100 
        : 100,
      messagesSent: messages.filter(m => m.from.id === providerId).length,
      messagesReceived: messages.filter(m => m.to.some(t => t.id === providerId)).length,
      averageResponseTime: 30, // Would calculate from actual response times
      careGapsClosed: completedTasks.filter(t => t.category === 'care_gap').length,
      pendingCareGaps: providerTasks.filter(t => t.category === 'care_gap' && t.status !== 'completed').length,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const careCoordinationHub = new CareCoordinationHub();
