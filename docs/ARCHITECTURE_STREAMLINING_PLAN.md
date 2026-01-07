# ATTENDING AI Platform - Architecture Streamlining Plan

**Date**: January 6, 2026  
**Version**: 1.0  
**Author**: Claude (AI Architecture Review)  
**Status**: Active Development

---

## Executive Summary

This document provides a comprehensive analysis of the ATTENDING AI platform architecture and outlines a streamlined approach to consolidate the codebase, eliminate redundancies, and establish clear migration paths from HTML prototypes to production-ready React components.

---

## Current State Analysis

### ✅ Strengths

| Component | Description | Quality |
|-----------|-------------|---------|
| **Type System** | Comprehensive TypeScript definitions in `apps/shared/types` | Excellent |
| **State Management** | XState machine for assessment flow + Zustand stores | Excellent |
| **BioMistral Service** | Full clinical interview simulation with HPI/ROS/PMH phases | Very Good |
| **Provider Portal** | Functional Next.js app with dashboard, inbox, labs, imaging | Good |
| **Clinical Logic** | Red flag detection, urgency calculation, differential generation | Excellent |
| **Documentation** | README, repository structure, comprehensive review docs | Good |

### ⚠️ Issues Identified

| Issue | Severity | Impact |
|-------|----------|--------|
| Duplicate directory structure (`apps/` vs `attending-medical-ai/apps/`) | High | Confusion, maintenance overhead |
| Patient Portal incomplete | High | Missing core patient functionality |
| HTML prototypes not integrated | Medium | 175KB+ of clinical features to migrate |
| Backend .NET build failures | High | No functional API layer |
| Mixed HTML/TSX in pages directory | Low | Code organization |
| Patient chat in provider portal (misplaced) | Medium | Separation of concerns |

---

## Recommended Architecture

### Directory Structure (Cleaned)

```
ATTENDING/
├── apps/
│   ├── provider-portal/      # Next.js - Provider clinical dashboard
│   │   ├── components/
│   │   │   ├── clinical-hub/
│   │   │   ├── dashboard/
│   │   │   ├── inbox/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   ├── pages/
│   │   ├── services/
│   │   │   └── biomistral/
│   │   ├── store/
│   │   └── types/
│   │
│   ├── patient-portal/       # Next.js - Patient-facing COMPASS interface
│   │   ├── components/
│   │   │   ├── chat/         # COMPASS chat interface
│   │   │   ├── health/       # Health tracking
│   │   │   └── ui/
│   │   ├── pages/
│   │   ├── services/
│   │   └── store/
│   │
│   ├── shared/               # Shared types, services, machines
│   │   ├── machines/         # XState state machines
│   │   ├── services/         # Shared service utilities
│   │   └── types/            # TypeScript definitions
│   │
│   ├── backend/              # .NET 8 API (needs repair)
│   │   └── [Domain-Driven Design structure]
│   │
│   └── [ARCHIVE] frontend/   # Legacy HTML prototypes (reference only)
│
├── docs/                     # Documentation
├── infrastructure/           # Docker, Kubernetes, Terraform
├── scripts/                  # Utility scripts
└── services/                 # Microservices (future)
```

### Component Ownership

| Component | Owner Portal | Responsibility |
|-----------|--------------|----------------|
| Patient Chat (COMPASS) | Patient Portal | Symptom assessment, AI interview |
| Clinical Dashboard | Provider Portal | Provider workflow, patient queue |
| Labs/Imaging/Meds | Provider Portal | Clinical data review |
| Inbox | Provider Portal | Provider messaging |
| Health Records | Patient Portal | Patient health data view |
| Treatment Plans | Provider Portal | Care planning |

---

## Migration Roadmap

### Phase 1: Cleanup (Week 1-2) 🔴 HIGH PRIORITY

**Objective**: Remove redundancies and establish clean foundation

1. **Remove duplicate structure**
   ```bash
   # Archive the duplicate directory
   mv attending-medical-ai/ _archive/attending-medical-ai/
   ```

2. **Clean provider portal pages**
   - Move HTML files out of `pages/` directory
   - Consolidate to TSX-only pages

3. **Archive HTML prototypes**
   - Keep `apps/frontend/` as reference
   - Mark as `[ARCHIVE]` in documentation
   - Extract key clinical logic for migration

### Phase 2: Patient Portal Reconstruction (Week 3-6) 🔴 HIGH PRIORITY

**Objective**: Build functional patient-facing COMPASS interface

**Key Components to Build:**

```typescript
// apps/patient-portal/pages/
├── index.tsx           // Dashboard/home
├── chat.tsx            // COMPASS AI chat
├── health.tsx          // Health summary
├── medications.tsx     // Medication list
├── appointments.tsx    // Scheduling
└── results.tsx         // Lab/imaging results

// apps/patient-portal/components/chat/
├── ChatInterface.tsx   // Main chat UI
├── MessageBubble.tsx   // Message display
├── QuickReplies.tsx    // Suggested responses
├── ProgressTracker.tsx // Assessment progress
├── EmergencyBanner.tsx // Emergency detection
└── ClinicalSummary.tsx // Final summary view

// apps/patient-portal/store/
├── useChatStore.ts     // Chat state (adapt from patientChatStore)
├── usePatientStore.ts  // Patient data
└── useSessionStore.ts  // Session management
```

### Phase 3: Shared Services Extraction (Week 7-8)

**Objective**: Extract common logic to shared package

**Services to Centralize:**

```typescript
// apps/shared/services/
├── clinical/
│   ├── RedFlagDetection.ts    // Emergency symptom detection
│   ├── UrgencyCalculation.ts  // Risk scoring
│   └── DifferentialEngine.ts  // DDx generation
├── assessment/
│   ├── HPIService.ts          // History of present illness
│   ├── ROSService.ts          // Review of systems
│   └── PMHService.ts          // Past medical history
└── api/
    ├── AssessmentAPI.ts       // Assessment submission
    └── ProviderAPI.ts         // Provider notification
```

### Phase 4: Backend Repair (Week 9-12)

**Objective**: Fix .NET backend or migrate to Node.js

**Options:**
1. **Repair .NET** - Fix compilation errors, complete repository pattern
2. **Node.js Migration** - Convert to Express/Fastify with same domain structure

**Recommended**: Start with Node.js API for faster iteration, add .NET for enterprise later.

```typescript
// services/api/
├── src/
│   ├── routes/
│   │   ├── assessment.ts
│   │   ├── patient.ts
│   │   └── provider.ts
│   ├── services/
│   │   ├── AssessmentService.ts
│   │   └── NotificationService.ts
│   └── middleware/
│       ├── auth.ts
│       └── validation.ts
└── package.json
```

### Phase 5: Integration & Testing (Week 13-16)

**Objective**: Connect all components with proper data flow

```
Patient Portal ──► API ──► Provider Portal
      │              │           │
      ▼              ▼           ▼
   COMPASS      Database    Dashboard
   Chat         MongoDB/     Patient
   UI           PostgreSQL   Queue
```

---

## Immediate Actions Checklist

### Today's Priorities

- [x] Document current architecture analysis
- [ ] Remove `attending-medical-ai/` duplicate directory
- [ ] Create `apps/patient-portal/components/chat/` structure
- [ ] Move PatientMessaging.tsx from provider to patient portal
- [ ] Update root package.json workspace configuration

### This Week

- [ ] Build basic COMPASS chat UI in patient portal
- [ ] Integrate existing XState assessment machine
- [ ] Port BioMistral service to shared package
- [ ] Create proper API mock service

---

## Code Migration Guide

### From HTML Prototype to React

The HTML prototypes contain valuable clinical logic. Here's how to migrate:

**HTML (apps/frontend/chat/index.html)**
```javascript
// Extract this logic pattern
function checkRedFlags(symptoms) {
    const flags = [];
    if (symptoms.includes('chest pain')) {
        flags.push({type: 'critical', symptom: 'Chest pain'});
    }
    return flags;
}
```

**React/TypeScript (apps/shared/services/clinical/RedFlagDetection.ts)**
```typescript
import { RedFlag } from '@attending/shared/types';

export interface RedFlagRule {
  id: string;
  pattern: RegExp | string[];
  severity: 'warning' | 'critical';
  flag: RedFlag;
}

export const RED_FLAG_RULES: RedFlagRule[] = [
  {
    id: 'chest_pain',
    pattern: ['chest pain', 'chest pressure', 'heart pain'],
    severity: 'critical',
    flag: {
      id: 'rf_chest_pain',
      name: 'Chest Pain',
      description: 'Potential cardiac emergency',
      severity: 'critical',
      requiresEmergency: true,
      recommendation: 'Immediate cardiac evaluation - ECG, troponins'
    }
  }
];

export function detectRedFlags(input: string): RedFlag[] {
  const detected: RedFlag[] = [];
  const inputLower = input.toLowerCase();
  
  for (const rule of RED_FLAG_RULES) {
    const patterns = Array.isArray(rule.pattern) 
      ? rule.pattern 
      : [rule.pattern.source];
    
    if (patterns.some(p => inputLower.includes(p))) {
      detected.push(rule.flag);
    }
  }
  
  return detected;
}
```

---

## Technology Stack Recommendations

### Current Stack (Keep)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 14, React 18 | Modern, SSR support, good DX |
| State | Zustand + XState | Simple UI state + complex workflows |
| Styling | Tailwind CSS | Rapid development, consistent design |
| Types | TypeScript | Type safety, better IDE support |

### Recommended Additions

| Component | Technology | Rationale |
|-----------|------------|-----------|
| API Layer | tRPC or REST | Type-safe API with Next.js integration |
| Database | PostgreSQL | HIPAA-friendly, relational structure |
| Auth | NextAuth.js | Built-in OAuth, session management |
| Testing | Vitest + Playwright | Fast unit tests + E2E |
| Monitoring | Sentry | Error tracking, performance monitoring |

---

## Risk Mitigation

### Clinical Safety

1. **Red flag detection must be robust** - Unit test all emergency patterns
2. **Never auto-dismiss emergencies** - Always route to human review
3. **Audit trail required** - Log all clinical decisions

### Technical Risks

1. **State persistence** - Use local storage backup for chat sessions
2. **API failures** - Graceful degradation, offline support
3. **PHI security** - Encrypt at rest and in transit

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Patient Portal pages functional | 6 | 1 |
| Provider Portal pages functional | 7 | 7 |
| Shared types coverage | 100% | ~90% |
| XState machine completeness | Full workflow | ✅ |
| BioMistral service phases | 6 phases | ✅ |
| Build time | < 60s | TBD |
| Test coverage | > 80% | 0% |

---

## Next Steps

1. **Immediate**: Execute cleanup phase (remove duplicates)
2. **This week**: Begin patient portal chat component build
3. **Next week**: Extract shared services, integrate XState
4. **End of month**: Working COMPASS prototype in React

---

*Document maintained by development team. Last updated: January 6, 2026*
