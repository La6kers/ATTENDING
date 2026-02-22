# ATTENDING AI - Comprehensive Project State Document

**Last Updated:** January 19, 2026  
**Project Location:** `C:\Users\Scott\source\repos\La6kers\ATTENDING`  
**Status:** Production-Ready Core Components with Active Development

---

## 1. EXECUTIVE SUMMARY

ATTENDING AI is a comprehensive healthcare platform with two integrated portals:
- **ATTENDING** (Provider Portal): Clinical decision support for healthcare providers
- **COMPASS** (Patient Portal): AI-powered symptom assessment chatbot

The project is substantially complete with production-ready Zustand stores, React components, XState machines, Prisma database schema, and API routes. The HTML prototypes in `/mnt/project/` serve as design specifications, while the actual implementation exists in the monorepo.

---

## 2. TECHNOLOGY STACK

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2 | React framework |
| React | 18.2 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| Zustand | 5.0 | State management |
| XState | 5.x | Complex workflow orchestration |
| Immer | Middleware | Immutable state updates |
| Lucide React | - | Icons |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Prisma ORM | Latest | Database operations |
| PostgreSQL | - | Primary database |
| NextAuth.js | - | Authentication |
| Socket.io | - | Real-time communication |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Turborepo | Monorepo management |
| Vitest | Unit testing |
| Playwright | E2E testing |
| Azure AD B2C | Enterprise authentication (planned) |

---

## 3. PROJECT STRUCTURE

```
ATTENDING/
├── apps/
│   ├── provider-portal/          # Main clinical interface
│   │   ├── components/
│   │   │   ├── chat/            # Provider chat components
│   │   │   ├── clinical/        # Clinical components
│   │   │   ├── clinical-hub/    # Hub components
│   │   │   ├── dashboard/       # Dashboard layout
│   │   │   ├── imaging-ordering/# ✅ Complete (5 components)
│   │   │   ├── lab-ordering/    # ✅ Complete (5 components)
│   │   │   ├── medication-ordering/ # ✅ Complete (7 components)
│   │   │   ├── referral-ordering/   # ✅ Complete (11 components)
│   │   │   ├── shared/          # ✅ Complete (15+ components)
│   │   │   ├── treatment-plan/  # Treatment planning
│   │   │   └── ui/              # Base UI components
│   │   ├── pages/
│   │   │   ├── api/             # API routes (12 directories)
│   │   │   ├── labs.tsx         # ✅ Complete
│   │   │   ├── imaging.tsx      # ✅ Complete
│   │   │   ├── medications.tsx  # ✅ Complete
│   │   │   ├── referrals.tsx    # ✅ Complete
│   │   │   ├── clinical-hub.tsx # ✅ Exists
│   │   │   ├── treatment-plan.tsx
│   │   │   └── index.tsx        # Dashboard
│   │   ├── store/               # Zustand stores (10 stores)
│   │   └── hooks/               # Custom hooks
│   │
│   ├── patient-portal/          # COMPASS chatbot
│   │   ├── components/
│   │   │   ├── assessment/      # Assessment UI (6 components)
│   │   │   └── chat/            # Chat UI (6 components)
│   │   ├── machines/
│   │   │   └── assessmentMachine.ts  # ✅ Complete XState machine
│   │   └── pages/
│   │
│   ├── shared/                  # Shared code between apps
│   │   ├── catalogs/            # Lab, imaging, medication catalogs
│   │   ├── services/            # Clinical services (7 services)
│   │   ├── schemas/             # Zod validation schemas
│   │   └── types/               # TypeScript types
│   │
│   └── mobile/                  # Mobile app (planned)
│
├── packages/
│   ├── design-tokens/           # ✅ Complete
│   │   ├── src/colors.ts
│   │   └── tailwind-preset.js
│   ├── ui-primitives/           # ✅ Complete (17+ components)
│   ├── clinical-types/          # TypeScript interfaces
│   ├── clinical-services/       # Business logic
│   ├── api-client/              # API client
│   └── fhir/                    # FHIR R4 integration
│
├── prisma/
│   ├── schema.prisma            # ✅ Complete (30+ models)
│   └── seed.ts                  # Database seeding
│
└── infrastructure/              # Deployment configs
```

---

## 4. IMPLEMENTED FEATURES

### 4.1 Provider Portal - Clinical Ordering Modules

#### Lab Ordering (✅ COMPLETE)
**Store:** `labOrderingStore.ts` (~400 lines)
**Page:** `pages/labs.tsx` (~500 lines)
**Components:** 5 components

| Feature | Status | Notes |
|---------|--------|-------|
| Lab catalog with search/filter | ✅ | Full-text search, category filter |
| AI recommendations | ✅ | Context-aware suggestions |
| Lab panels (BMP, CMP, CBC, etc.) | ✅ | Pre-defined panel groups |
| Priority selection (STAT/Urgent/Routine) | ✅ | Per-test priority |
| Clinical indication | ✅ | Required field |
| Cost display toggle | ✅ | Optional cost visibility |
| Fasting requirement detection | ✅ | Automatic detection |
| Order submission | ✅ | API integration |
| Results view | ✅ | Table with status badges |
| Red flag auto-STAT | ✅ | Emergency protocol integration |

#### Imaging Ordering (✅ COMPLETE)
**Store:** `imagingOrderingStore.ts` (~280 lines)
**Page:** `pages/imaging.tsx` (~600 lines)
**Components:** 5 components

| Feature | Status | Notes |
|---------|--------|-------|
| Imaging catalog (CT, MRI, X-Ray, US) | ✅ | Modality-based filtering |
| AI recommendations | ✅ | Clinical context-aware |
| Contrast toggle | ✅ | Per-study contrast selection |
| Radiation dose tracking | ✅ | Cumulative dose display |
| Laterality selection | ✅ | Left/Right/Bilateral |
| Contrast allergy check | ✅ | Auto-suggests alternatives |
| Order submission | ✅ | API integration |
| Results view | ✅ | With critical findings highlight |

#### Medication Ordering (✅ COMPLETE)
**Store:** `medicationOrderingStore.ts`
**Page:** `pages/medications.tsx` (~450 lines)
**Components:** 7 components

| Feature | Status | Notes |
|---------|--------|-------|
| Medication catalog | ✅ | Searchable with categories |
| AI recommendations | ✅ | Based on chief complaint |
| Drug interaction checking | ✅ | Real-time alerts |
| Allergy cross-reactivity | ✅ | Automatic detection |
| Dosing calculator | ✅ | Weight-based |
| Pharmacy selection | ✅ | E-prescribe support |
| Black box warning display | ✅ | Visual alerts |
| Controlled substance flagging | ✅ | DEA schedule display |
| Print medication list | ✅ | Patient-friendly format |

#### Referral Ordering (✅ COMPLETE)
**Store:** `referralOrderingStore.ts`
**Page:** `pages/referrals.tsx` (~350 lines)
**Components:** 11 components

| Feature | Status | Notes |
|---------|--------|-------|
| Specialty catalog | ✅ | Common specialties |
| AI recommendations | ✅ | Clinical context-aware |
| Provider search | ✅ | Network provider lookup |
| Insurance verification | ✅ | Plan display |
| Urgency selection | ✅ | STAT/Urgent/Routine |
| Clinical question field | ✅ | Required for referral |
| Referral preview | ✅ | Before submission |
| Pending referrals view | ✅ | Status tracking |
| History view | ✅ | Past referrals |

### 4.2 Patient Portal - COMPASS Assessment

#### XState Machine (✅ COMPLETE)
**File:** `machines/assessmentMachine.ts` (~700 lines)

**18+ Phase Assessment Flow:**
```
idle → welcome → demographics → chiefComplaint →
hpiOnset → hpiLocation → hpiDuration → hpiCharacter →
hpiSeverity → hpiTiming → hpiContext → hpiModifying →
reviewOfSystems → medicalHistory → medications → allergies →
socialHistory → riskAssessment → summary → providerHandoff →
emergency (special state) → completed
```

**Red Flag Detection Patterns (14 categories):**
| Category | Keywords | Severity |
|----------|----------|----------|
| Cardiovascular | chest pain, crushing chest | Critical |
| Respiratory | can't breathe, difficulty breathing | Critical |
| Neurological | sudden weakness, facial droop, worst headache | Critical |
| Psychiatric | suicidal ideation | Critical |
| Trauma | severe bleeding | Critical |
| Allergy | anaphylaxis, throat swelling | Critical |
| Infectious | high fever with confusion | Emergent |
| Abdominal | severe pain, rigid abdomen | Emergent |
| GI Bleeding | vomiting blood | Emergent |
| Toxicology | overdose, poisoning | Critical |
| Obstetric | pregnancy bleeding | Emergent |

**Chat Components:**
- `ChatContainer.tsx` - Main chat wrapper
- `ChatInput.tsx` - Text input with voice button placeholder
- `MessageBubble.tsx` - Message display
- `QuickReplies.tsx` - Suggested responses
- `ProgressTracker.tsx` - Assessment progress
- `EmergencyModal.tsx` - Emergency protocol UI

### 4.3 Shared Components

#### Toast/Notification System (✅ COMPLETE)
**File:** `components/shared/Toast.tsx`

```typescript
// Usage
const toast = useToast();
toast.success('Lab orders submitted');
toast.error('Failed to submit', 'Please try again');
toast.warning('Emergency Protocol', 'STAT labs auto-selected');
toast.loading('Submitting...');
toast.promise(asyncFn, { loading, success, error });
```

#### Other Shared Components
| Component | Purpose |
|-----------|---------|
| `PatientBanner` | Patient context display with red flags |
| `QuickActionsBar` | Cross-page navigation |
| `ClinicalAlertBanner` | Red flag alerts |
| `SimpleCriticalAlert` | Dismissible critical alerts |
| `CollapsibleOrderCategory` | Collapsible sections |
| `EmergencyProtocolModal` | Emergency handling |
| `TabNavigation` | Tab switching |
| `NotificationCenter` | Notifications |
| `KeyboardShortcutsHelp` | Keyboard shortcuts |
| `FloatingActionButton` | FAB component |

### 4.4 UI Primitives Package

**Location:** `packages/ui-primitives/src/components/`

| Component | Variants/Features |
|-----------|-------------------|
| `Button` | primary, secondary, ghost, danger, success, warning, link, outline + loading state |
| `Card` | default, bordered, elevated + hoverable |
| `Badge` | primary, secondary, success, warning, danger, info |
| `Input` | text, password, search + error states |
| `Select` | standard dropdown |
| `Checkbox` | with custom styling |
| `Avatar` | with initials fallback |
| `CollapsibleSection` | controlled/uncontrolled |
| `PriorityBadge` | STAT, Urgent, Routine |
| `AIBadge` | AI recommendation indicator |
| `WarningBanner` | Alert banners |
| `EmptyState` | No data displays |
| `LoadingState` | Loading indicators |
| `GradientHeader` | Page headers |
| `StatsGrid` | Dashboard stats |
| `FilterTabs` | Tab filtering |
| `ConfidenceIndicator` | AI confidence display |
| `DashboardCard` | Dashboard widgets |
| `SearchInput` | Search with icon |
| `SubmitButton` | Form submission |

### 4.5 Design Tokens

**Location:** `packages/design-tokens/src/colors.ts`

```typescript
// Brand Colors
brandColors.gradient.start: '#667eea'  // Indigo
brandColors.gradient.end: '#764ba2'    // Purple
brandColors.gradient.css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'

// Clinical Colors
clinicalColors.urgent.main: '#ef4444'
clinicalColors.warning.main: '#f59e0b'
clinicalColors.success.main: '#10b981'
clinicalColors.info.main: '#3b82f6'

// Triage Colors (Medical Standard)
clinicalColors.triage.resuscitation: '#dc2626'
clinicalColors.triage.emergent: '#f97316'
clinicalColors.triage.urgent: '#fbbf24'
clinicalColors.triage.lessUrgent: '#22c55e'
clinicalColors.triage.nonUrgent: '#3b82f6'

// AI Confidence
clinicalColors.ai.high: '#8b5cf6'
clinicalColors.ai.medium: '#6366f1'
clinicalColors.ai.low: '#a1a1aa'
```

---

## 5. DATABASE SCHEMA

### Prisma Models (30+ models)

**Core Entities:**
- `User` - Authentication & roles (ADMIN, PROVIDER, NURSE, STAFF, PATIENT)
- `Patient` - Demographics, contact, insurance
- `Encounter` - Clinical visits with status workflow
- `PatientAssessment` - COMPASS assessment data

**Clinical Orders:**
- `LabOrder` - Lab test orders with results
- `LabResult` - Lab test results with reference ranges
- `ImagingOrder` - Imaging study orders
- `MedicationOrder` - Prescription orders
- `Referral` - Specialty referrals

**Supporting:**
- `Allergy` - Patient allergies (drug, food, environmental)
- `MedicalCondition` - Medical history
- `PatientMedication` - Current medications
- `VitalSigns` - Vital sign measurements
- `EncounterDiagnosis` - ICD-coded diagnoses
- `Notification` - System notifications
- `AuditLog` - HIPAA audit trail

**Enums:**
```prisma
enum UserRole { ADMIN, PROVIDER, NURSE, STAFF, PATIENT }
enum EncounterStatus { SCHEDULED, CHECKED_IN, ROOMED, IN_PROGRESS, PENDING_RESULTS, PENDING_REVIEW, COMPLETED, CANCELLED, NO_SHOW }
enum UrgencyLevel { STANDARD, MODERATE, HIGH, EMERGENCY }
enum AllergySeverity { MILD, MODERATE, SEVERE, LIFE_THREATENING }
enum OrderPriority { STAT, ASAP, URGENT, ROUTINE }
```

---

## 6. API ROUTES

**Location:** `apps/provider-portal/pages/api/`

| Endpoint | Methods | Features |
|----------|---------|----------|
| `/api/labs` | GET, POST | List orders, create with AI recommendations |
| `/api/labs/[id]` | GET, PUT, DELETE | Single order operations |
| `/api/imaging` | GET, POST | Imaging orders |
| `/api/prescriptions` | GET, POST | Medication orders |
| `/api/referrals` | GET, POST | Specialty referrals |
| `/api/assessments` | GET, POST | COMPASS assessments |
| `/api/patients` | GET, POST | Patient management |
| `/api/clinical` | POST | AI recommendations |
| `/api/chat` | WebSocket | Real-time chat |
| `/api/notifications` | GET, POST | Notifications |
| `/api/auth` | NextAuth | Authentication |
| `/api/health` | GET | Health check |

**Lab Order API Features:**
- Zod schema validation
- Clinical safety checks (red flag evaluation)
- Auto-upgrade to STAT for emergencies
- AI-powered recommendations
- HIPAA audit logging
- Notification creation for STAT orders

---

## 7. SHARED SERVICES

**Location:** `apps/shared/services/`

| Service | Purpose |
|---------|---------|
| `ClinicalRecommendationService` | AI-powered lab/imaging/medication recommendations |
| `ClinicalAIService` | AI model integration |
| `CompassBridge` | Patient-provider communication |
| `GeolocationService` | GPS facility finder |
| `NotificationService` | Push notifications |
| `assessmentSubmission` | Assessment submission handling |

---

## 8. CLINICAL CATALOGS

**Location:** `apps/shared/catalogs/`

### Labs Catalog (`labs.ts`)
- CBC, BMP, CMP, Lipid Panel
- Cardiac markers (Troponin, BNP, D-Dimer)
- Coagulation (PT/INR, PTT)
- Thyroid (TSH, T3, T4)
- Infectious (Procalcitonin, Blood Culture)
- Search and filter functions

### Imaging Catalog (`imaging.ts`)
- CT (Head, Chest, Abdomen, PE Protocol)
- MRI (Brain, Spine, Joints)
- X-Ray (Chest, Abdomen, Extremities)
- Ultrasound (Abdominal, Pelvic, Vascular)
- Modality-based filtering
- Radiation dose tracking
- Non-contrast alternatives

### Medications Catalog (`medications.ts`)
- Common medications by category
- Dosing information
- Interactions database
- Black box warnings
- Controlled substance schedules

### Referrals Catalog (`referrals.ts`)
- Specialty definitions
- Common referral reasons
- Urgency guidelines

---

## 9. TESTING INFRASTRUCTURE

### Unit Tests (Vitest)
**Location:** `apps/provider-portal/__tests__/`

- Store tests (`labOrderingStore.test.ts`)
- Component tests
- API route tests
- Service tests

### E2E Tests (Playwright)
**Location:** `apps/provider-portal/e2e/`

- Lab ordering workflow
- Assessment completion
- Emergency protocol triggers

---

## 10. GAPS & FUTURE WORK

### High Priority
| Gap | Status | Notes |
|-----|--------|-------|
| Voice input | 🔲 Placeholder | MediaRecorder API needed |
| Camera/photo capture | 🔲 Placeholder | Visual symptom documentation |
| GPS facility finder | 🔲 Service exists | UI integration needed |
| WebSocket real-time | 🔲 Partial | Provider-patient sync |

### Medium Priority
| Gap | Status | Notes |
|-----|--------|-------|
| Azure AD B2C | 🔲 Planned | Enterprise SSO |
| FHIR R4 integration | 🔲 Package exists | Epic/Oracle Health adapters |
| BioMistral AI | 🔲 Planned | Differential diagnosis |
| Mobile app | 🔲 Scaffold exists | React Native |

### Low Priority
| Gap | Status | Notes |
|-----|--------|-------|
| Dark mode | 🔲 Tokens ready | Theme toggle |
| Print optimization | 🔲 Partial | PDF generation |
| Offline support | 🔲 Planned | Service worker |

---

## 11. HTML PROTOTYPE COMPARISON

The HTML files in `/mnt/project/` serve as **design specifications**. Feature comparison:

| HTML Prototype | React Implementation | Parity |
|----------------|---------------------|--------|
| `lab_interface` | `pages/labs.tsx` | ✅ 95% |
| `Imaging` | `pages/imaging.tsx` | ✅ 95% |
| `Medication_tab` | `pages/medications.tsx` | ✅ 90% |
| `Referrals_tab` | `pages/referrals.tsx` | ✅ 90% |
| `PT_CHATBOT_With_emergency` | XState + components | ✅ 85% |
| `Treatment_UI` | `pages/treatment-plan.tsx` | ⚠️ Verify |
| `Previsit_for_Provider` | `pages/previsit/` | ⚠️ Verify |

**Missing from React (present in HTML):**
- Particle effects on completion
- Voice input button (functional)
- Camera capture button (functional)
- GPS facility finder UI

---

## 12. ENVIRONMENT VARIABLES

```env
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Azure (planned)
AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...
AZURE_AD_TENANT_ID=...

# AI Services
OPENAI_API_KEY=...
BIOMISTRAL_API_KEY=...
```

---

## 13. COMMANDS REFERENCE

```bash
# Development
npm run dev                    # Start all apps
npm run dev --filter=provider  # Start provider portal only
npm run dev --filter=patient   # Start patient portal only

# Build
npm run build                  # Build all apps
npm run build --filter=provider

# Database
npx prisma migrate dev         # Run migrations
npx prisma generate            # Generate client
npx prisma db seed             # Seed database
npx prisma studio              # Open Prisma Studio

# Testing
npm run test                   # Run unit tests
npm run test:e2e               # Run E2E tests
npm run test:coverage          # Coverage report

# Linting
npm run lint                   # ESLint
npm run type-check             # TypeScript check
```

---

## 14. KEY FILES FOR REFERENCE

| Purpose | File Path |
|---------|-----------|
| Lab Store | `apps/provider-portal/store/labOrderingStore.ts` |
| Imaging Store | `apps/provider-portal/store/imagingOrderingStore.ts` |
| XState Machine | `apps/patient-portal/machines/assessmentMachine.ts` |
| Toast System | `apps/provider-portal/components/shared/Toast.tsx` |
| Design Tokens | `packages/design-tokens/src/colors.ts` |
| Prisma Schema | `prisma/schema.prisma` |
| Lab API | `apps/provider-portal/pages/api/labs/index.ts` |
| Clinical Service | `apps/shared/services/ClinicalRecommendationService.ts` |

---

## 15. TEAM & STAKEHOLDERS

| Role | Person | Focus |
|------|--------|-------|
| CEO/Founder | Dr. Scott Isbell | Clinical design, business |
| CTO | Bill LaPierre | Enterprise architecture |
| AI Consultant | Mark (Stanford) | AI/ML strategy |
| NLP Consultant | Gabriel | LLM integration |
| Azure Consultant | Peter | Healthcare IT infrastructure |

---

**Document Version:** 1.0  
**Maintainer:** Development Team  
**Next Review:** After Phase 2 completion
