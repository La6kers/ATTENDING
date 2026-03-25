// ============================================================
// ATTENDING AI - WebSocket Notification Server
// services/notification-service/src/index.ts
//
// Real-time notification server for:
// - COMPASS → Provider assessment notifications
// - Urgent alert broadcasting
// - Provider presence management
// - Status updates
//
// Run: npm run dev:ws (from root) or node src/index.ts
// ============================================================

import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

// ============================================================
// CONFIGURATION
// ============================================================

const PORT = process.env.PORT || 3003;
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || [
  'http://localhost:3000',  // Provider portal
  'http://localhost:3001',  // Patient portal
  'http://localhost:3002',  // Alternative provider port
];

// ============================================================
// EXPRESS APP SETUP
// ============================================================

const app = express();
app.use(cors({ origin: CORS_ORIGINS }));
app.use(express.json());

const httpServer = createServer(app);

// ============================================================
// SOCKET.IO SETUP
// ============================================================

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ============================================================
// IN-MEMORY STATE
// ============================================================

interface ConnectedUser {
  id: string;
  socketId: string;
  role: 'provider' | 'patient';
  name: string;
  status: 'online' | 'busy' | 'away';
  currentAssessment?: string;
  connectedAt: Date;
}

interface ActiveAssessment {
  id: string;
  sessionId: string;
  patientName: string;
  urgencyLevel: string;
  status: string;
  viewedBy: string[];
  submittedAt: Date;
}

const connectedUsers = new Map<string, ConnectedUser>();
const activeAssessments = new Map<string, ActiveAssessment>();

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getConnectedProviders(): ConnectedUser[] {
  return Array.from(connectedUsers.values()).filter(u => u.role === 'provider');
}

function getConnectedPatients(): ConnectedUser[] {
  return Array.from(connectedUsers.values()).filter(u => u.role === 'patient');
}

function broadcastToProviders(event: string, data: any) {
  const providers = getConnectedProviders();
  providers.forEach(provider => {
    io.to(provider.socketId).emit(event, data);
  });
  console.log(`[WS] Broadcast "${event}" to ${providers.length} providers`);
}

function broadcastToAll(event: string, data: any) {
  io.emit(event, data);
}

// ============================================================
// SOCKET.IO EVENT HANDLERS
// ============================================================

io.on('connection', (socket: Socket) => {
  const { role, providerId, providerName, patientId, patientName } = socket.handshake.query;
  
  const userId = (role === 'provider' ? providerId : patientId) as string;
  const userName = (role === 'provider' ? providerName : patientName) as string;
  
  console.log(`[WS] New connection: ${role} - ${userName || 'Anonymous'} (${socket.id})`);

  // Register connected user
  if (userId) {
    connectedUsers.set(socket.id, {
      id: userId,
      socketId: socket.id,
      role: role as 'provider' | 'patient',
      name: userName || 'Anonymous',
      status: 'online',
      connectedAt: new Date(),
    });
  }

  // =====================================================
  // PROVIDER EVENTS
  // =====================================================

  // Provider joins/registers
  socket.on('provider:join', (data: { providerId: string; providerName: string }) => {
    console.log(`[WS] Provider joined: ${data.providerName}`);
    
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.id = data.providerId;
      user.name = data.providerName;
      user.role = 'provider';
    }

    // Notify other providers
    socket.broadcast.emit('provider:online', {
      providerId: data.providerId,
      providerName: data.providerName,
      status: 'online',
    });

    // Send current queue status
    socket.emit('queue:status', {
      assessments: Array.from(activeAssessments.values()),
      providers: getConnectedProviders().length,
    });
  });

  // Provider leaves
  socket.on('provider:leave', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`[WS] Provider left: ${user.name}`);
      socket.broadcast.emit('provider:offline', { providerId: user.id });
    }
  });

  // Provider status update
  socket.on('provider:status', (data: { status: 'online' | 'busy' | 'away' }) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.status = data.status;
      socket.broadcast.emit('provider:status-changed', {
        providerId: user.id,
        providerName: user.name,
        status: data.status,
      });
    }
  });

  // =====================================================
  // ASSESSMENT EVENTS
  // =====================================================

  // New assessment from COMPASS (patient portal)
  socket.on('assessment:submit', (data: {
    assessment: any;
    sessionId: string;
  }) => {
    console.log(`[WS] New assessment submitted: ${data.sessionId}`);
    
    const assessment: ActiveAssessment = {
      id: data.assessment.id || data.sessionId,
      sessionId: data.sessionId,
      patientName: data.assessment.patientName || 'Unknown Patient',
      urgencyLevel: data.assessment.urgencyLevel || 'standard',
      status: 'pending',
      viewedBy: [],
      submittedAt: new Date(),
    };

    activeAssessments.set(assessment.id, assessment);

    // Notify all providers
    broadcastToProviders('assessment:new', {
      assessment: data.assessment,
      timestamp: new Date().toISOString(),
      source: 'compass',
    });

    // If urgent, send special alert
    if (data.assessment.urgencyLevel === 'high' || data.assessment.urgencyLevel === 'emergency') {
      broadcastToProviders('assessment:urgent', {
        assessmentId: assessment.id,
        patientName: assessment.patientName,
        chiefComplaint: data.assessment.chiefComplaint,
        redFlags: data.assessment.redFlags || [],
        urgencyScore: data.assessment.urgencyScore || 80,
        timestamp: new Date().toISOString(),
      });
    }

    // Acknowledge to patient
    socket.emit('assessment:submitted', {
      success: true,
      assessmentId: assessment.id,
      queuePosition: activeAssessments.size,
    });
  });

  // Provider viewing assessment
  socket.on('assessment:viewing', (data: { assessmentId: string }) => {
    const user = connectedUsers.get(socket.id);
    const assessment = activeAssessments.get(data.assessmentId);
    
    if (user && assessment && !assessment.viewedBy.includes(user.id)) {
      assessment.viewedBy.push(user.id);
      user.currentAssessment = data.assessmentId;
      
      // Notify other providers
      socket.broadcast.emit('assessment:being-viewed', {
        assessmentId: data.assessmentId,
        viewerId: user.id,
        viewerName: user.name,
      });
    }
  });

  // Provider status change on assessment
  socket.on('assessment:status-change', (data: {
    assessmentId: string;
    newStatus: string;
  }) => {
    const user = connectedUsers.get(socket.id);
    const assessment = activeAssessments.get(data.assessmentId);
    
    if (assessment) {
      assessment.status = data.newStatus;
      
      // Notify all providers
      broadcastToProviders('assessment:status-updated', {
        assessmentId: data.assessmentId,
        newStatus: data.newStatus,
        updatedBy: user?.name || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      // If completed, remove from active
      if (data.newStatus === 'completed') {
        setTimeout(() => {
          activeAssessments.delete(data.assessmentId);
        }, 5000);
      }
    }
  });

  // =====================================================
  // PATIENT EVENTS
  // =====================================================

  socket.on('patient:join', (data: { patientId: string; sessionId: string }) => {
    console.log(`[WS] Patient session started: ${data.sessionId}`);
    
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.role = 'patient';
      user.id = data.patientId;
    }
  });

  socket.on('patient:typing', (data: { sessionId: string }) => {
    // Could notify provider that patient is typing
  });

  // =====================================================
  // DISCONNECT
  // =====================================================

  socket.on('disconnect', (reason: string) => {
    const user = connectedUsers.get(socket.id);
    
    if (user) {
      console.log(`[WS] Disconnected: ${user.name} (${reason})`);
      
      if (user.role === 'provider') {
        socket.broadcast.emit('provider:offline', { providerId: user.id });
      }
      
      connectedUsers.delete(socket.id);
    }
  });

  // =====================================================
  // PING/PONG FOR KEEP-ALIVE
  // =====================================================

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
});

// ============================================================
// HTTP ENDPOINTS
// ============================================================

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    connections: {
      providers: getConnectedProviders().length,
      patients: getConnectedPatients().length,
      total: connectedUsers.size,
    },
    pendingAssessments: activeAssessments.size,
    timestamp: new Date().toISOString(),
  });
});

// Get current queue status
app.get('/queue', (_req: Request, res: Response) => {
  res.json({
    assessments: Array.from(activeAssessments.values()),
    count: activeAssessments.size,
  });
});

// Webhook endpoint for external notifications (from API routes)
app.post('/webhook/assessment', (req: Request, res: Response) => {
  const { assessment } = req.body;
  
  if (assessment) {
    console.log(`[WS] Webhook: New assessment ${assessment.id}`);
    
    activeAssessments.set(assessment.id || assessment.sessionId, {
      id: assessment.id || assessment.sessionId,
      sessionId: assessment.sessionId,
      patientName: assessment.patientName || 'Unknown',
      urgencyLevel: assessment.urgencyLevel || 'standard',
      status: 'pending',
      viewedBy: [],
      submittedAt: new Date(),
    });

    broadcastToProviders('assessment:new', {
      assessment,
      timestamp: new Date().toISOString(),
      source: 'webhook',
    });

    // Urgent alert
    if (assessment.urgencyLevel === 'high' || assessment.urgencyLevel === 'emergency') {
      broadcastToProviders('assessment:urgent', {
        assessmentId: assessment.id,
        patientName: assessment.patientName,
        chiefComplaint: assessment.chiefComplaint,
        redFlags: assessment.redFlags || [],
        urgencyScore: assessment.urgencyScore || 80,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid assessment data' });
  }
});

// Manual broadcast for testing
app.post('/broadcast/test', (req: Request, res: Response) => {
  const { event, data } = req.body;
  
  if (event && data) {
    broadcastToProviders(event, {
      ...data,
      timestamp: new Date().toISOString(),
      source: 'test',
    });
    res.json({ success: true, recipients: getConnectedProviders().length });
  } else {
    res.status(400).json({ error: 'Missing event or data' });
  }
});

// ============================================================
// START SERVER
// ============================================================

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🏥 ATTENDING AI WebSocket Server                      ║
║                                                           ║
║     Port: ${PORT}                                            ║
║     Health: http://localhost:${PORT}/health                  ║
║     Queue:  http://localhost:${PORT}/queue                   ║
║                                                           ║
║     Waiting for connections...                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[WS] SIGTERM received, shutting down gracefully...');
  
  io.emit('server:shutdown', { message: 'Server is shutting down' });
  
  httpServer.close(() => {
    console.log('[WS] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[WS] SIGINT received, shutting down...');
  io.emit('server:shutdown', { message: 'Server is shutting down' });
  process.exit(0);
});

export { io, httpServer };
