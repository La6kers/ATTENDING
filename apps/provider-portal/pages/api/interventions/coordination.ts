// =============================================================================
// ATTENDING AI - Care Coordination API
// apps/provider-portal/pages/api/interventions/coordination.ts
//
// Task management, handoffs, and team communication
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  careCoordinationHub,
  type CareTask,
  type PatientHandoff,
  type SecureMessage,
  type TeamMember,
  type CareCoordinationMetrics,
} from '@attending/shared/services/interventions';

type CoordinationAction = 
  | 'create_task' | 'update_task' | 'get_tasks' | 'reassign_task' | 'escalate_task'
  | 'create_handoff' | 'acknowledge_handoff' | 'get_handoffs'
  | 'send_message' | 'get_messages' | 'mark_read'
  | 'get_metrics' | 'get_templates';

interface CoordinationRequest {
  action: CoordinationAction;
  
  // Task operations
  taskData?: Partial<CareTask>;
  taskId?: string;
  newAssignee?: TeamMember;
  escalateTo?: TeamMember;
  reason?: string;
  
  // Handoff operations
  handoffData?: Partial<PatientHandoff>;
  handoffId?: string;
  synthesis?: string;
  
  // Message operations
  messageData?: Partial<SecureMessage>;
  messageId?: string;
  
  // Filters
  filters?: {
    status?: string[];
    priority?: string[];
    category?: string[];
    patientId?: string;
  };
  
  // Metrics
  startDate?: string;
  endDate?: string;
}

interface CoordinationResponse {
  success: boolean;
  task?: CareTask;
  tasks?: CareTask[];
  handoff?: PatientHandoff;
  handoffs?: PatientHandoff[];
  message?: SecureMessage;
  messages?: SecureMessage[];
  metrics?: CareCoordinationMetrics;
  templates?: any[];
  unreadCount?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CoordinationResponse>
) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const providerId = session.user.id;

    if (req.method === 'GET') {
      // Quick access endpoints
      const { view } = req.query;
      
      switch (view) {
        case 'tasks': {
          const tasks = careCoordinationHub.getTasksForProvider(providerId);
          return res.status(200).json({ success: true, tasks });
        }
        case 'overdue': {
          const overdueTasks = careCoordinationHub.getOverdueTasks(providerId);
          return res.status(200).json({ success: true, tasks: overdueTasks });
        }
        case 'handoffs': {
          const handoffs = careCoordinationHub.getPendingHandoffs(providerId);
          return res.status(200).json({ success: true, handoffs });
        }
        case 'messages': {
          const messages = careCoordinationHub.getMessagesForProvider(providerId);
          const unreadCount = careCoordinationHub.getUnreadCount(providerId);
          return res.status(200).json({ success: true, messages, unreadCount });
        }
        case 'templates': {
          const templates = careCoordinationHub.getTaskTemplates();
          return res.status(200).json({ success: true, templates });
        }
        default:
          return res.status(400).json({ success: false, error: 'Invalid view parameter' });
      }
    }

    const body = req.body as CoordinationRequest;
    const { action } = body;

    switch (action) {
      // Task operations
      case 'create_task': {
        if (!body.taskData) {
          return res.status(400).json({ success: false, error: 'taskData is required' });
        }
        const task = await careCoordinationHub.createTask(body.taskData as any);
        return res.status(201).json({ success: true, task });
      }

      case 'update_task': {
        if (!body.taskId || !body.taskData?.status) {
          return res.status(400).json({ success: false, error: 'taskId and status are required' });
        }
        const task = await careCoordinationHub.updateTaskStatus(
          body.taskId, 
          body.taskData.status as any,
          body.reason
        );
        return res.status(200).json({ success: true, task });
      }

      case 'get_tasks': {
        const tasks = careCoordinationHub.getTasksForProvider(providerId, body.filters as any);
        return res.status(200).json({ success: true, tasks });
      }

      case 'reassign_task': {
        if (!body.taskId || !body.newAssignee) {
          return res.status(400).json({ success: false, error: 'taskId and newAssignee are required' });
        }
        const task = await careCoordinationHub.reassignTask(body.taskId, body.newAssignee, body.reason);
        return res.status(200).json({ success: true, task });
      }

      case 'escalate_task': {
        if (!body.taskId || !body.escalateTo || !body.reason) {
          return res.status(400).json({ success: false, error: 'taskId, escalateTo, and reason are required' });
        }
        const task = await careCoordinationHub.escalateTask(body.taskId, body.escalateTo, body.reason);
        return res.status(200).json({ success: true, task });
      }

      // Handoff operations
      case 'create_handoff': {
        if (!body.handoffData) {
          return res.status(400).json({ success: false, error: 'handoffData is required' });
        }
        const handoff = await careCoordinationHub.createHandoff(body.handoffData as any);
        return res.status(201).json({ success: true, handoff });
      }

      case 'acknowledge_handoff': {
        if (!body.handoffId) {
          return res.status(400).json({ success: false, error: 'handoffId is required' });
        }
        const handoff = await careCoordinationHub.acknowledgeHandoff(body.handoffId, body.synthesis);
        return res.status(200).json({ success: true, handoff });
      }

      case 'get_handoffs': {
        const handoffs = careCoordinationHub.getPendingHandoffs(providerId);
        return res.status(200).json({ success: true, handoffs });
      }

      // Message operations
      case 'send_message': {
        if (!body.messageData) {
          return res.status(400).json({ success: false, error: 'messageData is required' });
        }
        const message = await careCoordinationHub.sendMessage(body.messageData as any);
        return res.status(201).json({ success: true, message });
      }

      case 'get_messages': {
        const messages = careCoordinationHub.getMessagesForProvider(providerId);
        return res.status(200).json({ success: true, messages });
      }

      case 'mark_read': {
        if (!body.messageId) {
          return res.status(400).json({ success: false, error: 'messageId is required' });
        }
        await careCoordinationHub.markMessageRead(body.messageId, providerId);
        return res.status(200).json({ success: true });
      }

      // Metrics
      case 'get_metrics': {
        const startDate = body.startDate ? new Date(body.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = body.endDate ? new Date(body.endDate) : new Date();
        const metrics = careCoordinationHub.getCoordinationMetrics(providerId, startDate, endDate);
        return res.status(200).json({ success: true, metrics });
      }

      case 'get_templates': {
        const templates = careCoordinationHub.getTaskTemplates();
        return res.status(200).json({ success: true, templates });
      }

      default:
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } catch (error) {
    console.error('[Coordination API] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
