# ATTENDING AI — Component Directory Map

**Last Updated:** February 19, 2026  
**Purpose:** Quick reference for where each feature lives in the provider portal.

## Provider Portal Components (`apps/provider-portal/components/`)

### Core Clinical Workflow (Pilot-Critical)
| Directory | Purpose | Status |
|-----------|---------|--------|
| `clinical/` | Lab ordering, medication ordering, assessment queue, clinical guidelines | Active |
| `previsit/` | Pre-visit summary (COMPASS → Provider handoff) | Active |
| `inbox/` | Provider inbox with AI prioritization | Active |
| `lab-ordering/` | Lab test catalog, AI recommendations, order summary | Active |
| `imaging-ordering/` | Imaging catalog, AI recommendations, order summary | Active |
| `medication-ordering/` | Medication catalog, drug interactions, allergy alerts | Active |
| `referral-ordering/` | Referral workflow, provider search, status tracking | Active |
| `treatment-plan/` | Treatment plan creation and management | Active |
| `dashboard/` | Provider dashboard with grid layout, stat cards, patient queue | Active |
| `layout/` | Main layout, navigation sidebar, provider shell | Active |
| `shared/` | Reusable components: banners, alerts, modals, toast, buttons | Active |
| `ui/` | Base UI primitives: button, checkbox, input, select | Active |
| `emergency/` | Emergency alert banner | Active |
| `auth/` | Login page, user profile menu | Active |

### AI & Intelligence Features
| Directory | Purpose | Status |
|-----------|---------|--------|
| `decision-support/` | Clinical decision support panel | Active |
| `intelligence/` | Risk scores, audit trail, care journey, data reconciliation | Active |
| `analytics/` | Analytics dashboard, billing/coding, executive analytics | Active |
| `ai-feedback/` | AI feedback collection system | Active |
| `clinical-services/` | AI Scribe, predictive alerts, smart inbox | Active |

### Extended Features (Post-Pilot)
| Directory | Purpose | Status |
|-----------|---------|--------|
| `ambient/` | Ambient documentation (needs speech API) | Partial |
| `chat/` | Provider-patient messaging | Active |
| `clinical-hub/` | Clinical decision hub, message cards, summary panel | Active |
| `copilot/` | Clinical copilot assistant | Partial |
| `coordination/` | Care coordination hub | Partial |
| `documentation/` | Clinical documentation generator/viewer | Active |
| `interventions/` | Clinical recommendations, trial matcher, medication optimizer | Partial |
| `multimodal/` | Clinical image analysis | Stub |
| `outcomes/` | AI feedback, clinical outcomes dashboard | Partial |
| `pathways/` | Clinical pathway panel | Partial |
| `performance/` | Provider performance dashboard | Partial |
| `population-health/` | Population health dashboard | Stub |
| `predictive/` | Predictive risk dashboard | Partial |
| `scheduling/` | Smart scheduling | Stub |
| `sdoh/` | Social determinants of health dashboard | Stub |
| `telehealth/` | Telehealth video panel | Stub |
| `integrations/` | EHR integration hub | Partial |
| `admin/` | IT admin portal | Active |

### Removed (Phase 1 Cleanup)
| Directory | Reason |
|-----------|--------|
| `command-center/` | Empty directory |
| `voice/` | Empty directory |
| `inbox/_archived/` | 12 superseded files |
| `layout/_archived/` | 6 superseded files |

## Patient Portal Components (`apps/patient-portal/components/`)

| Directory | Purpose | Status |
|-----------|---------|--------|
| `assessment/` | COMPASS assessment chat (canonical) | Active |
| `chat/` | Duplicate of assessment — **to be removed** | Duplicate |
| `companion/` | Health companion feature | Partial |
| `emergency/` | Emergency medical access | Active |
| `engagement/` | Medication buddy | Stub |
| `media/` | Camera capture, voice input | Active |

## Shared Components (`apps/shared/components/`)

| Directory | Purpose |
|-----------|---------|
| `accessibility/` | AccessibilityProvider |
| `chat/` | Canonical chat components (ChatInput, EmergencyModal, MessageBubble, QuickReplies) |
| `clinical/` | Clinical components, QuickActionsBar |
| `errors/` | ErrorBoundary, ClinicalErrorBoundary |
| `layout/` | Header |
| `ui/` | Badge, Button, Card, Collapsible, Input, Modal, Spinner, Toast |
