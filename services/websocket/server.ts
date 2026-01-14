// =============================================================================
// ATTENDING AI - WebSocket Server
// services/websocket/server.ts
//
// Real-time communication server for provider-patient messaging,
// emergency alerts, and presence management.
// =============================================================================

import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';

// Types
interface User {
  id: string;
  socketId: string;
  type: 'provider' | 'patient';
  name: string;
  role?: string;
  connectedAt: Date;
  lastSeen: Date;
  currentPatientId?: string; // For providers: which patient they're viewing
  sessionId?: string; // For patients: their assessment session
}

interface Message {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  type: 'text' | 'system' | 'alert' | 'clinical';
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface EmergencyAlert {
  id: string;
  patientId: string;
  patientName: string;
  sessionId: string;
  type: string;
  urgencyLevel: 'critical' | 'emergent' | 'urgent';
  symptoms: string[];
  redFlags: string[];
  location?: { lat: number; lng: number };
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

interface AssessmentUpdate {
  sessionId: string;
  patientId: string;
  phase: string;
  progressPercent: number;
  urgencyLevel: string;
  redFlagCount: number;
  timestamp: Date;
}

// In-memory stores (in production, use Redis)
const users = new Map<string, User>();
const activeEmergencies = new Map<string, EmergencyAlert>();
const messageHistory = new Map<string, Message[]>();

// Event types
type ServerEvents = {
  // Provider events
  'provider:join': (data: { providerId: string; name: string; role: string }) => void;
  'provider:view-patient': (data: { patientId: string }) => void;
  'provider:message': (data: { patientId: string; content: string }) => void;
  'provider:acknowledge-emergency': (data: { emergencyId: string }) => void;
  
  // Patient events
  'patient:join': (data: { patientId: string; name: string; sessionId: string }) => void;
  'patient:message': (data: { content: string }) => void;
  'patient:emergency': (data: Omit<EmergencyAlert, 'id' | 'timestamp' | 'acknowledged'>) => void;
  'patient:assessment-update': (data: Omit<AssessmentUpdate, 'timestamp'>) => void;
  'patient:request-provider': () => void;
  
  // Common events
  'disconnect': () => void;
  'ping': () => void;
};

type ClientEvents = {
  // To providers
  'patient:connected': (user: User) => void;
  'patient:disconnected': (data: { patientId: string }) => void;
  'patient:message-received': (message: Message) => void;
  'patient:assessment-updated': (update: AssessmentUpdate) => void;
  'emergency:new': (alert: EmergencyAlert) => void;
  'emergency:acknowledged': (data: { emergencyId: string; acknowledgedBy: string }) => void;
  
  // To patients
  'provider:connected': (data: { providerId: string; name: string }) => void;
  'provider:disconnected': () => void;
  'provider:message-received': (message: Message) => void;
  'provider:typing': (data: { isTyping: boolean }) => void;
  'queue-position': (position: number) => void;
  
  // Common
  'error': (error: { code: string; message: string }) => void;
  'pong': () => void;
  'presence-update': (users: User[]) => void;
};

// WebSocket Server Class
export class WebSocketServer {
  private io: SocketIOServer;
  private httpServer: HTTPServer;
  
  constructor(port: number = 3001) {
    this.httpServer = createServer();
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:3002',
          process.env.PROVIDER_PORTAL_URL || '',
          process.env.PATIENT_PORTAL_URL || '',
        ].filter(Boolean),
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingInterval: 25000,
      pingTimeout: 60000,
    });
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[WS] New connection: ${socket.id}`);
      
      // ================================
      // Provider Events
      // ================================
      
      socket.on('provider:join', (data) => {
        const user: User = {
          id: data.providerId,
          socketId: socket.id,
          type: 'provider',
          name: data.name,
          role: data.role,
          connectedAt: new Date(),
          lastSeen: new Date(),
        };
        
        users.set(data.providerId, user);
        socket.join('providers');
        socket.join(`provider:${data.providerId}`);
        
        console.log(`[WS] Provider joined: ${data.name} (${data.providerId})`);
        
        // Send current patient list
        const patients = Array.from(users.values())
          .filter(u => u.type === 'patient');
        socket.emit('presence-update', patients);
        
        // Send active emergencies
        activeEmergencies.forEach(emergency => {
          if (!emergency.acknowledged) {
            socket.emit('emergency:new', emergency);
          }
        });
      });
      
      socket.on('provider:view-patient', (data) => {
        const user = this.getUserBySocketId(socket.id);
        if (user) {
          user.currentPatientId = data.patientId;
          socket.join(`session:${data.patientId}`);
          
          // Get message history
          const history = messageHistory.get(data.patientId) || [];
          history.forEach(msg => {
            socket.emit('patient:message-received', msg);
          });
        }
      });
      
      socket.on('provider:message', (data) => {
        const user = this.getUserBySocketId(socket.id);
        if (!user) return;
        
        const message: Message = {
          id: this.generateId(),
          fromId: user.id,
          toId: data.patientId,
          content: data.content,
          type: 'text',
          timestamp: new Date(),
        };
        
        // Store message
        this.storeMessage(data.patientId, message);
        
        // Send to patient
        const patient = users.get(data.patientId);
        if (patient) {
          this.io.to(patient.socketId).emit('provider:message-received', message);
        }
        
        // Echo to provider
        socket.emit('patient:message-received', message);
      });
      
      socket.on('provider:acknowledge-emergency', (data) => {
        const user = this.getUserBySocketId(socket.id);
        if (!user) return;
        
        const emergency = activeEmergencies.get(data.emergencyId);
        if (emergency && !emergency.acknowledged) {
          emergency.acknowledged = true;
          emergency.acknowledgedBy = user.id;
          emergency.acknowledgedAt = new Date();
          
          // Notify all providers
          this.io.to('providers').emit('emergency:acknowledged', {
            emergencyId: data.emergencyId,
            acknowledgedBy: user.name,
          });
          
          // Notify patient
          const patient = users.get(emergency.patientId);
          if (patient) {
            this.io.to(patient.socketId).emit('provider:connected', {
              providerId: user.id,
              name: user.name,
            });
          }
          
          console.log(`[WS] Emergency ${data.emergencyId} acknowledged by ${user.name}`);
        }
      });
      
      // ================================
      // Patient Events
      // ================================
      
      socket.on('patient:join', (data) => {
        const user: User = {
          id: data.patientId,
          socketId: socket.id,
          type: 'patient',
          name: data.name,
          sessionId: data.sessionId,
          connectedAt: new Date(),
          lastSeen: new Date(),
        };
        
        users.set(data.patientId, user);
        socket.join('patients');
        socket.join(`patient:${data.patientId}`);
        socket.join(`session:${data.sessionId}`);
        
        console.log(`[WS] Patient joined: ${data.name} (${data.patientId})`);
        
        // Notify providers
        this.io.to('providers').emit('patient:connected', user);
        
        // Calculate queue position
        const queuePosition = this.calculateQueuePosition(data.patientId);
        socket.emit('queue-position', queuePosition);
      });
      
      socket.on('patient:message', (data) => {
        const user = this.getUserBySocketId(socket.id);
        if (!user) return;
        
        const message: Message = {
          id: this.generateId(),
          fromId: user.id,
          toId: 'provider', // Will be routed to assigned provider
          content: data.content,
          type: 'text',
          timestamp: new Date(),
        };
        
        // Store message
        this.storeMessage(user.id, message);
        
        // Send to providers viewing this patient
        this.io.to(`session:${user.id}`).emit('patient:message-received', message);
      });
      
      socket.on('patient:emergency', (data) => {
        const user = this.getUserBySocketId(socket.id);
        if (!user) return;
        
        const emergency: EmergencyAlert = {
          ...data,
          id: this.generateId(),
          patientId: user.id,
          patientName: user.name,
          sessionId: user.sessionId || '',
          timestamp: new Date(),
          acknowledged: false,
        };
        
        activeEmergencies.set(emergency.id, emergency);
        
        // CRITICAL: Broadcast to ALL providers immediately
        this.io.to('providers').emit('emergency:new', emergency);
        
        console.log(`[WS] EMERGENCY ALERT: ${emergency.type} from ${user.name}`);
        console.log(`[WS] Red flags: ${emergency.redFlags.join(', ')}`);
      });
      
      socket.on('patient:assessment-update', (data) => {
        const user = this.getUserBySocketId(socket.id);
        if (!user) return;
        
        const update: AssessmentUpdate = {
          ...data,
          patientId: user.id,
          timestamp: new Date(),
        };
        
        // Notify providers viewing this session
        this.io.to(`session:${user.sessionId}`).emit('patient:assessment-updated', update);
        this.io.to('providers').emit('patient:assessment-updated', update);
      });
      
      socket.on('patient:request-provider', () => {
        const user = this.getUserBySocketId(socket.id);
        if (!user) return;
        
        // Find available provider
        const providers = Array.from(users.values())
          .filter(u => u.type === 'provider' && !u.currentPatientId);
        
        if (providers.length > 0) {
          // Notify first available provider
          const provider = providers[0];
          this.io.to(provider.socketId).emit('patient:connected', user);
        } else {
          // Calculate queue position
          const position = this.calculateQueuePosition(user.id);
          socket.emit('queue-position', position);
        }
      });
      
      // ================================
      // Common Events
      // ================================
      
      socket.on('ping', () => {
        socket.emit('pong');
        const user = this.getUserBySocketId(socket.id);
        if (user) {
          user.lastSeen = new Date();
        }
      });
      
      socket.on('disconnect', () => {
        const user = this.getUserBySocketId(socket.id);
        if (user) {
          users.delete(user.id);
          
          if (user.type === 'patient') {
            this.io.to('providers').emit('patient:disconnected', { patientId: user.id });
          }
          
          console.log(`[WS] User disconnected: ${user.name} (${user.type})`);
        }
      });
    });
  }
  
  // Helper methods
  private getUserBySocketId(socketId: string): User | undefined {
    return Array.from(users.values()).find(u => u.socketId === socketId);
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private storeMessage(patientId: string, message: Message) {
    if (!messageHistory.has(patientId)) {
      messageHistory.set(patientId, []);
    }
    const history = messageHistory.get(patientId)!;
    history.push(message);
    
    // Keep last 100 messages per patient
    if (history.length > 100) {
      history.shift();
    }
  }
  
  private calculateQueuePosition(patientId: string): number {
    const patients = Array.from(users.values())
      .filter(u => u.type === 'patient')
      .sort((a, b) => a.connectedAt.getTime() - b.connectedAt.getTime());
    
    return patients.findIndex(p => p.id === patientId) + 1;
  }
  
  // Public methods
  public start() {
    const port = parseInt(process.env.WS_PORT || '3001', 10);
    this.httpServer.listen(port, () => {
      console.log(`[WS] WebSocket server running on port ${port}`);
    });
  }
  
  public stop() {
    this.io.close();
    this.httpServer.close();
  }
  
  public broadcastEmergency(alert: EmergencyAlert) {
    activeEmergencies.set(alert.id, alert);
    this.io.to('providers').emit('emergency:new', alert);
  }
  
  public getActiveUsers() {
    return Array.from(users.values());
  }
  
  public getActiveEmergencies() {
    return Array.from(activeEmergencies.values()).filter(e => !e.acknowledged);
  }
}

// Export singleton instance
export const wsServer = new WebSocketServer();

// Start server if run directly
if (require.main === module) {
  wsServer.start();
}

export default wsServer;
