// WebSocket Notification Helper - Server Side
// apps/provider-portal/lib/websocket/notify.ts

interface NotifyPayload {
  type: string;
  title?: string;
  message?: string;
  priority?: 'ROUTINE' | 'URGENT' | 'STAT' | 'CRITICAL';
  assessmentId?: string;
  patientId?: string;
  orderId?: string;
  data?: any;
  timestamp?: string;
}

class WSNotify {
  private wsUrl: string;

  constructor() {
    this.wsUrl = process.env.WS_SERVER_URL || 'http://localhost:4000';
  }

  private async send(endpoint: string, data: any): Promise<void> {
    try {
      await fetch(`${this.wsUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('WebSocket notify error:', error);
    }
  }

  async user(userId: string, payload: NotifyPayload): Promise<void> {
    await this.send('/notify', { 
      type: 'user', 
      userId, 
      payload: {
        ...payload,
        timestamp: payload.timestamp || new Date().toISOString(),
      }
    });
  }

  async providers(payload: NotifyPayload): Promise<void> {
    await this.send('/notify', { 
      type: 'providers', 
      payload: {
        ...payload,
        timestamp: payload.timestamp || new Date().toISOString(),
      }
    });
  }

  async emergency(payload: NotifyPayload): Promise<void> {
    await this.send('/notify', { 
      type: 'emergency', 
      payload: {
        ...payload,
        timestamp: payload.timestamp || new Date().toISOString(),
      }
    });
  }

  // Specific notification helpers
  async newAssessment(assessment: {
    id: string;
    patientName: string;
    chiefComplaint: string;
    urgencyLevel: string;
    redFlags?: string[];
  }): Promise<void> {
    const isUrgent = assessment.urgencyLevel === 'high' || (assessment.redFlags?.length || 0) > 0;
    
    await this.providers({
      type: isUrgent ? 'URGENT_ASSESSMENT' : 'NEW_ASSESSMENT',
      title: isUrgent ? '🚨 Urgent Assessment' : 'New Assessment',
      message: `${assessment.patientName}: ${assessment.chiefComplaint}`,
      priority: isUrgent ? 'URGENT' : 'ROUTINE',
      assessmentId: assessment.id,
      data: {
        ...assessment,
        redFlagCount: assessment.redFlags?.length || 0,
      },
    });
  }

  async redFlagDetected(assessment: {
    id: string;
    patientName: string;
    redFlags: string[];
  }): Promise<void> {
    await this.providers({
      type: 'RED_FLAG_DETECTED',
      title: '⚠️ Red Flags Detected',
      message: `${assessment.patientName}: ${assessment.redFlags.length} red flag(s)`,
      priority: 'CRITICAL',
      assessmentId: assessment.id,
      data: {
        redFlags: assessment.redFlags,
      },
    });
  }

  async criticalLabResult(result: {
    orderId: string;
    patientName: string;
    testName: string;
    value: string;
    providerId: string;
  }): Promise<void> {
    await this.user(result.providerId, {
      type: 'CRITICAL_LAB_RESULT',
      title: '🚨 CRITICAL Lab Result',
      message: `${result.patientName}: ${result.testName} = ${result.value}`,
      priority: 'CRITICAL',
      orderId: result.orderId,
      data: result,
    });
  }

  async labResultReady(result: {
    orderId: string;
    patientName: string;
    testName: string;
    providerId: string;
    isAbnormal?: boolean;
  }): Promise<void> {
    await this.user(result.providerId, {
      type: result.isAbnormal ? 'ABNORMAL_LAB_RESULT' : 'LAB_RESULT_READY',
      title: result.isAbnormal ? '⚠️ Abnormal Lab Result' : '✓ Lab Result Ready',
      message: `${result.patientName}: ${result.testName}`,
      priority: result.isAbnormal ? 'URGENT' : 'ROUTINE',
      orderId: result.orderId,
      data: result,
    });
  }

  async orderUpdate(order: {
    orderId: string;
    orderType: 'LAB' | 'IMAGING' | 'REFERRAL';
    status: string;
    providerId: string;
    patientName?: string;
  }): Promise<void> {
    await this.user(order.providerId, {
      type: 'ORDER_UPDATE',
      title: `${order.orderType} Order Update`,
      message: `Status: ${order.status}${order.patientName ? ` - ${order.patientName}` : ''}`,
      priority: 'ROUTINE',
      orderId: order.orderId,
      data: order,
    });
  }

  async emergencyProtocol(event: {
    assessmentId: string;
    patientName: string;
    protocol: string;
    severity: string;
    autoOrders?: string[];
  }): Promise<void> {
    await this.emergency({
      type: 'EMERGENCY_PROTOCOL_ACTIVATED',
      title: `🆘 EMERGENCY: ${event.protocol}`,
      message: `${event.patientName} - ${event.severity}`,
      priority: 'CRITICAL',
      assessmentId: event.assessmentId,
      data: event,
    });
  }

  async patientMessage(message: {
    patientId: string;
    patientName: string;
    providerId: string;
    preview: string;
  }): Promise<void> {
    await this.user(message.providerId, {
      type: 'PATIENT_MESSAGE',
      title: 'New Patient Message',
      message: `${message.patientName}: ${message.preview}`,
      priority: 'ROUTINE',
      patientId: message.patientId,
      data: message,
    });
  }
}

export const wsNotify = new WSNotify();
export default wsNotify;
