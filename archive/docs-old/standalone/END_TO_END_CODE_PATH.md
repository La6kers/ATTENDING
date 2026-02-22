# ATTENDING AI - End-to-End Code Path Verification

## Patient Assessment Flow - Complete Data Journey

This document traces the complete code path from patient symptom input to provider review.

---

## 🔄 Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           PATIENT PORTAL                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │  /compass/      │───▶│  /chat/index    │───▶│  ChatContainer  │          │
│  │  Landing Page   │    │  Chat Page      │    │  Component      │          │
│  └─────────────────┘    └────────┬────────┘    └────────┬────────┘          │
│                                  │                       │                   │
│                                  ▼                       ▼                   │
│                         ┌─────────────────────────────────────────┐          │
│                         │         useChatStore (Zustand)          │          │
│                         │  - Messages state                       │          │
│                         │  - Assessment phases (18 phases)        │          │
│                         │  - Red flag detection                   │          │
│                         │  - Urgency scoring                      │          │
│                         └───────────────┬─────────────────────────┘          │
│                                         │                                    │
│                    ┌────────────────────┴────────────────────┐               │
│                    │                                          │               │
│                    ▼                                          ▼               │
│         ┌──────────────────┐                      ┌──────────────────┐       │
│         │  submitAssessment │                      │   useWebSocket   │       │
│         │  (Store Action)   │                      │   (Real-time)    │       │
│         └────────┬─────────┘                      └────────┬─────────┘       │
│                  │                                          │                │
└──────────────────┼──────────────────────────────────────────┼────────────────┘
                   │                                          │
                   ▼                                          ▼
┌──────────────────────────────────┐          ┌──────────────────────────────┐
│      API LAYER                   │          │     WEBSOCKET SERVER         │
├──────────────────────────────────┤          ├──────────────────────────────┤
│                                  │          │                              │
│  /api/assessments/submit.ts      │          │  services/websocket/         │
│  - Validates request             │          │  server.ts                   │
│  - Generates assessment ID       │◀────────▶│  - Socket.IO server          │
│  - Determines urgency            │          │  - Emergency broadcasting    │
│  - Returns queue position        │          │  - Provider notifications    │
│                                  │          │  - Presence management       │
└────────────┬─────────────────────┘          └─────────────┬────────────────┘
             │                                              │
             │  [TODO: Database Write]                      │
             ▼                                              │
┌──────────────────────────────────┐                        │
│      DATABASE (Prisma/SQLite)    │                        │
├──────────────────────────────────┤                        │
│                                  │                        │
│  PatientAssessment model:        │                        │
│  - sessionId                     │                        │
│  - chiefComplaint                │                        │
│  - hpiOnset, hpiLocation, etc.   │                        │
│  - urgencyLevel, urgencyScore    │                        │
│  - redFlags (JSON)               │                        │
│  - status                        │                        │
│                                  │                        │
└──────────────────────────────────┘                        │
                                                            │
                   ┌────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           PROVIDER PORTAL                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│         ┌──────────────────┐                      ┌──────────────────┐       │
│         │   useWebSocket   │◀─────WebSocket──────│   Emergency      │       │
│         │   (Provider)     │     Notifications   │   Alert Modal    │       │
│         └────────┬─────────┘                      └──────────────────┘       │
│                  │                                                           │
│                  ▼                                                           │
│         ┌──────────────────────────────────────────────────────────┐         │
│         │              useProviderStore (Zustand)                  │         │
│         │  - assessments[]                                         │         │
│         │  - notifications[]                                       │         │
│         │  - connectionStatus                                      │         │
│         │  - audioAlertsEnabled                                    │         │
│         └───────────────────────────┬──────────────────────────────┘         │
│                                     │                                        │
│                                     ▼                                        │
│         ┌──────────────────────────────────────────────────────────┐         │
│         │              /inbox (ProviderInbox)                       │         │
│         │  - Categories: encounters, phone, messages, labs, etc.   │         │
│         │  - Priority sorting                                      │         │
│         │  - Real-time updates                                     │         │
│         │  - Audio alerts for critical items                       │         │
│         └──────────────────────────────────────────────────────────┘         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 File Path Mapping

### Patient Portal Flow

| Step | File | Purpose |
|------|------|---------|
| 1 | `pages/compass/index.tsx` | Landing page - verify identity |
| 2 | `pages/chat/index.tsx` | Main chat interface |
| 3 | `components/chat/ChatContainer.tsx` | Chat UI components |
| 4 | `store/useChatStore.ts` | State management (Zustand + Immer) |
| 5 | `shared/types/chat.types.ts` | Unified type definitions |
| 6 | `pages/api/assessments/submit.ts` | API endpoint for submission |
| 7 | `hooks/useWebSocket.ts` | Real-time connection |

### Provider Portal Flow

| Step | File | Purpose |
|------|------|---------|
| 1 | `hooks/useWebSocket.ts` | Real-time connection (provider) |
| 2 | `store/useProviderStore.ts` | Provider state management |
| 3 | `pages/inbox/index.tsx` | Inbox page wrapper |
| 4 | `components/inbox/ProviderInbox.tsx` | Main inbox component |
| 5 | `components/inbox/inbox-store.ts` | Inbox-specific state |

### Shared Services

| File | Purpose |
|------|---------|
| `services/websocket/server.ts` | WebSocket server (Socket.IO) |
| `prisma/schema.prisma` | Database schema |
| `apps/shared/catalogs/*` | Clinical catalogs |
| `apps/shared/types/*` | Shared type definitions |

---

## 🔍 Detailed Code Path Analysis

### Phase 1: Patient Opens Chat

```typescript
// pages/chat/index.tsx
const { initializeSession } = useChatStore();

useEffect(() => {
  if (!isInitialized) {
    initializeSession();  // Creates session, shows welcome message
  }
}, [isInitialized, initializeSession]);
```

### Phase 2: Patient Sends Message

```typescript
// store/useChatStore.ts
sendMessage: async (content: string) => {
  // 1. Add user message
  const userMessage = createMessage('user', content, { phase: currentPhase });
  set((state) => { state.messages.push(userMessage); });

  // 2. Check for red flags
  const newRedFlags = detectRedFlags(content);
  if (newRedFlags.length > 0) {
    set((state) => {
      state.redFlags.push(...newRedFlags);
      state.urgencyScore = calculateUrgencyScore(state.redFlags, state.assessmentData.hpi.severity);
    });
    
    // Show emergency modal for critical flags
    if (newRedFlags.some((f) => f.severity === 'critical')) {
      set({ showEmergencyModal: true });
    }
  }

  // 3. Update assessment data based on phase
  // 4. Move to next phase
  // 5. Add assistant response
}
```

### Phase 3: Red Flag Detection

```typescript
// store/useChatStore.ts
const RED_FLAG_PATTERNS = [
  { pattern: /chest pain|chest tightness/i, severity: 'critical', flag: 'Cardiac symptoms' },
  { pattern: /can'?t breathe|shortness of breath/i, severity: 'critical', flag: 'Respiratory distress' },
  { pattern: /suicid|kill myself|want to die/i, severity: 'critical', flag: 'Suicidal ideation' },
  // ... 14+ patterns
];

function detectRedFlags(text: string): RedFlag[] {
  const flags: RedFlag[] = [];
  RED_FLAG_PATTERNS.forEach(({ pattern, severity, flag, category }) => {
    if (pattern.test(text)) {
      flags.push(createRedFlag(flag, severity, text, category));
    }
  });
  return flags;
}
```

### Phase 4: Assessment Submission

```typescript
// store/useChatStore.ts
submitAssessment: async () => {
  const payload = {
    ...assessmentData,
    redFlags: redFlags.map((rf) => rf.symptom),
    urgencyLevel,
    urgencyScore,
    conversationHistory: messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    })),
    submittedAt: new Date().toISOString(),
  };

  // Submit to API
  const response = await fetch('/api/assessments/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Notify via WebSocket
  if (window.socket) {
    window.socket.emit('assessment:submit', { assessment: payload, sessionId });
  }
}
```

### Phase 5: WebSocket Notification to Provider

```typescript
// services/websocket/server.ts
socket.on('patient:emergency', (data) => {
  const emergency: EmergencyAlert = {
    ...data,
    id: this.generateId(),
    timestamp: new Date(),
    acknowledged: false,
  };

  activeEmergencies.set(emergency.id, emergency);

  // CRITICAL: Broadcast to ALL providers immediately
  this.io.to('providers').emit('emergency:new', emergency);
});
```

### Phase 6: Provider Receives Alert

```typescript
// apps/provider-portal/hooks/useWebSocket.ts
const handleEmergencyAlert = useCallback((alert: EmergencyAlert) => {
  // 1. Add to pending emergencies
  setState(prev => ({
    ...prev,
    pendingEmergencies: [...prev.pendingEmergencies, alert],
  }));

  // 2. Play audio alert
  if (alert.audioAlert) {
    audioManagerRef.current?.playEmergency(alert.urgencyLevel);
  }

  // 3. Add notification to store
  addNotification({
    type: 'escalation',
    title: `🚨 ${alert.urgencyLevel.toUpperCase()} EMERGENCY`,
    message: `${alert.patientName}: ${alert.type}`,
    urgency: 'critical',
  });

  // 4. Browser notification
  new Notification(`🚨 EMERGENCY: ${alert.patientName}`, {
    body: `${alert.type}: ${alert.redFlags.join(', ')}`,
    requireInteraction: true,
  });
});
```

---

## ⚠️ Gap Analysis - Issues Found

### 1. Database Integration NOT COMPLETE

**Location:** `pages/api/assessments/submit.ts`

```typescript
// TODO: Save to database
// const assessment = await prisma.assessment.create({
//   data: { ... },
// });
```

**Impact:** Assessments are not persisted to database.

**Fix Required:** Uncomment and implement Prisma database write.

### 2. Provider Notification NOT COMPLETE

**Location:** `pages/api/assessments/submit.ts`

```typescript
// TODO: Notify providers if urgent
// if (isUrgent || hasRedFlags) {
//   await notifyProviders({ ... });
// }
```

**Impact:** Providers may not receive urgent notifications via API route.

**Mitigation:** WebSocket notification is implemented separately.

### 3. Provider Inbox Uses Mock Data

**Location:** `components/inbox/ProviderInbox.tsx`

```typescript
useEffect(() => {
  setLoading(true);
  setTimeout(() => {
    setItems(generateMockItems());  // MOCK DATA!
    setLoading(false);
  }, 500);
}, [setItems, setLoading]);
```

**Impact:** Real assessments from patients don't appear in inbox.

**Fix Required:** Connect to real assessment queue via API/WebSocket.

### 4. No API Route for Fetching Assessments

**Missing:** `/api/assessments` GET endpoint to fetch pending assessments.

**Impact:** Provider portal cannot load real assessments from database.

---

## ✅ What IS Working

| Component | Status | Notes |
|-----------|--------|-------|
| Patient chat UI | ✅ Working | 18-phase assessment flow |
| Red flag detection | ✅ Working | 14+ patterns |
| Urgency scoring | ✅ Working | 0-100 scale |
| WebSocket client (patient) | ✅ Working | Real-time connection |
| WebSocket client (provider) | ✅ Working | Audio alerts |
| WebSocket server | ✅ Working | Emergency broadcasting |
| Assessment submission (API) | ⚠️ Partial | Returns success, no DB |
| Provider inbox UI | ✅ Working | Categories, filtering |
| Audio alerts | ✅ Working | Critical/emergency/urgent |
| Prisma schema | ✅ Defined | PatientAssessment model |
| Database connection | ⚠️ Not verified | Need to test |

---

## 🔧 Recommended Fixes

### Priority 1: Complete Database Integration

```typescript
// pages/api/assessments/submit.ts
import { prisma } from '@/lib/prisma';

// Inside handler:
const assessment = await prisma.patientAssessment.create({
  data: {
    sessionId: data.sessionId,
    patientId: data.patientId || 'anonymous',
    chiefComplaint: data.chiefComplaint,
    hpiOnset: data.hpi.onset,
    hpiLocation: data.hpi.location,
    hpiDuration: data.hpi.duration,
    hpiCharacter: data.hpi.character,
    hpiSeverity: data.hpi.severity,
    hpiAggravating: JSON.stringify(data.hpi.aggravating || []),
    hpiRelieving: JSON.stringify(data.hpi.relieving || []),
    hpiAssociated: JSON.stringify(data.hpi.associated || []),
    medications: JSON.stringify(data.medications),
    allergies: JSON.stringify(data.allergies),
    medicalHistory: JSON.stringify(data.medicalHistory),
    urgencyLevel: data.urgencyLevel.toUpperCase(),
    urgencyScore: data.urgencyScore,
    redFlags: JSON.stringify(data.redFlags),
    status: 'PENDING',
    submittedAt: new Date(data.submittedAt),
  },
});
```

### Priority 2: Create Assessment Fetch API

```typescript
// pages/api/assessments/index.ts (NEW FILE)
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const assessments = await prisma.patientAssessment.findMany({
      where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      orderBy: [
        { urgencyLevel: 'desc' },
        { submittedAt: 'asc' },
      ],
    });
    return res.json(assessments);
  }
}
```

### Priority 3: Connect Provider Inbox to Real Data

```typescript
// components/inbox/ProviderInbox.tsx
useEffect(() => {
  async function fetchAssessments() {
    const response = await fetch('/api/assessments');
    const data = await response.json();
    setItems(transformToInboxItems(data));
  }
  fetchAssessments();
}, []);
```

---

## 📊 Assessment Phases (18 Total)

1. `welcome` - Greeting
2. `demographics` - DOB confirmation
3. `chiefComplaint` - Main concern
4. `hpiOnset` - When did it start
5. `hpiLocation` - Where is the problem
6. `hpiDuration` - How long does it last
7. `hpiCharacter` - Describe the feeling
8. `hpiSeverity` - 0-10 scale
9. `hpiTiming` - Constant or intermittent
10. `hpiContext` - Triggering events
11. `hpiModifying` - What affects it
12. `hpiAggravating` - What makes it worse
13. `hpiRelieving` - What makes it better
14. `hpiAssociated` - Other symptoms
15. `medications` - Current meds
16. `allergies` - Known allergies
17. `medicalHistory` - Past conditions
18. `socialHistory` - Lifestyle
19. `familyHistory` - Family conditions
20. `riskAssessment` - Additional info
21. `summary` - Review before submit
22. `providerHandoff` - Waiting for review
23. `emergency` - 911 redirect
24. `complete` - Done

---

## Summary

The ATTENDING AI codebase has a **well-designed architecture** with clear separation between patient and provider portals, shared services, and real-time communication. However, **critical database integration is incomplete**, preventing the full end-to-end flow from working in production.

**Next Steps:**
1. Implement database writes in assessment submission
2. Create API endpoint to fetch assessments
3. Connect provider inbox to real data
4. Test complete flow end-to-end
