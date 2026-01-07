# ATTENDING AI - Technical Onboarding Guide

> For new team members, particularly CTO Bill LaPierre

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/La6kers/ATTENDING.git
cd ATTENDING
```

### 2. Run Provider Portal

```bash
cd apps/provider-portal
npm install
npm run dev
# Open http://localhost:3000
```

### 3. Run Patient Portal

```bash
cd apps/patient-portal
npm install
npm run dev
# Open http://localhost:3001
```

### 4. View COMPASS Chat Prototype

```bash
cd apps/frontend
npx serve .
# Open http://localhost:3000/chat/index.html
```

---

## Architecture Overview

### Application Structure

```
ATTENDING/
├── apps/
│   ├── provider-portal/     # Clinical dashboard (Next.js)
│   ├── patient-portal/      # Patient interface (Next.js)
│   ├── shared/              # Shared code
│   ├── frontend/            # HTML prototypes
│   └── backend/             # .NET API (WIP)
├── docs/                    # Documentation
├── infrastructure/          # DevOps configs
├── scripts/                 # Utility scripts
└── services/                # Microservices
```

### Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend Framework | Next.js 14 | App router not used yet |
| UI Library | React 18 | Functional components |
| Language | TypeScript | Strict mode |
| State (UI) | Zustand | Simple, fast |
| State (Workflows) | XState | For complex flows |
| Styling | Tailwind CSS | Utility-first |
| Backend | .NET 8 | Needs fixing |
| AI Model | BioMistral-7B | Medical LLM |

---

## Key Components

### Provider Portal (`apps/provider-portal`)

**Entry Point:** `pages/index.tsx`

Key files:
- `components/dashboard/` - Dashboard widgets
- `store/` - Zustand stores
- `services/` - API service layer

**Pages:**
- `/` - Dashboard
- `/labs` - Lab results
- `/imaging` - Medical imaging
- `/medications` - Prescription management
- `/treatment-plans` - Care planning
- `/inbox` - Provider messaging

### Patient Portal (`apps/patient-portal`)

**Entry Point:** `pages/index.tsx`

Key files:
- `components/ImprovedPatientPortal.tsx` - Main component (500+ lines)

**Features:**
- Health score dashboard
- COMPASS chat integration
- Vitals tracking
- Medication adherence
- Emergency handling

### COMPASS Chat (`apps/frontend/chat/index.html`)

This is the **most sophisticated clinical prototype** - 175KB of refined clinical workflows.

**Key Features:**
- Multi-symptom processing
- Urgency detection
- Clinical summary generation
- Provider handoff

**IMPORTANT:** This HTML prototype contains months of clinical workflow refinement. Migration to React should preserve all clinical logic.

---

## State Management Strategy

### Zustand (UI State)
Used for simple UI state in Provider Portal:
- Patient queue
- Inbox messages
- Assessment queue

Example store: `apps/provider-portal/store/assessmentQueueStore.ts`

### XState (Complex Workflows)
Used for multi-step workflows in Patient Portal:
- Symptom assessment flow
- Appointment booking
- Chat conversation state

Location: `apps/shared/machines/`

---

## Development Workflow

### Adding a New Feature

1. Check if similar exists in HTML prototypes
2. Extract clinical logic first
3. Create TypeScript types in `apps/shared/types`
4. Build React component
5. Add to appropriate portal

### Code Style

- Functional components only
- TypeScript strict mode
- Tailwind for styling
- Zustand for simple state
- XState for workflows

### Testing (Future)

Testing infrastructure not yet set up. Planned:
- Jest for unit tests
- Playwright for E2E
- React Testing Library

---

## Known Issues

### Backend (.NET)
- Compilation errors in repository pattern
- Needs abstract method implementations
- Not blocking frontend development

### GitHub Workflows
- Were broken (directories instead of files)
- Fixed with proper YAML files

### Deprecated Structure
- `attending-medical-ai/` was removed
- Was abandoned monorepo scaffolding

---

## Roadmap

### Phase 1: Consolidation (Current)
- [x] Fix structural issues
- [ ] Complete shared package
- [ ] Establish testing

### Phase 2: Migration
- [ ] Port COMPASS logic to React
- [ ] Implement XState machines
- [ ] Unified notification system

### Phase 3: Backend
- [ ] Fix .NET compilation
- [ ] Implement auth
- [ ] Create API endpoints

### Phase 4: Production
- [ ] Azure deployment
- [ ] CI/CD activation
- [ ] Security audit

---

## Contact

- **Scott Isbell** - Primary developer, clinical domain
- **Bill LaPierre** - CTO, architecture oversight
- **Mark Holmstrom** - Data science
- **Gabriel Colón** - AI/NLP
- **Peter Almanzar** - Healthcare IT

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Zustand](https://github.com/pmndrs/zustand)
- [XState](https://xstate.js.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [BioMistral Paper](https://arxiv.org/abs/2402.10373)
