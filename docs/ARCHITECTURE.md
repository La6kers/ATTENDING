# ATTENDING AI - Complete Architecture Overview

## Executive Summary

ATTENDING AI is a comprehensive healthcare platform designed to support rural healthcare providers. The system consists of two integrated portals:

1. **ATTENDING** - Provider-facing clinical decision support portal
2. **COMPASS** - Patient-facing AI-powered symptom assessment chatbot

This document provides a complete overview of the production-ready architecture.

---

## System Architecture

```
                                    ┌──────────────────────┐
                                    │    Load Balancer     │
                                    │   (Azure/NGINX)      │
                                    └──────────┬───────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
        ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
        │  Provider Portal  │    │  Patient Portal   │    │   Mobile App      │
        │    (Next.js)      │    │    (Next.js)      │    │  (React Native)   │
        │  app.attending.ai │    │patient.attending.ai│   │                   │
        └─────────┬─────────┘    └─────────┬─────────┘    └─────────┬─────────┘
                  │                        │                        │
                  └────────────────────────┼────────────────────────┘
                                           │
                                    ┌──────┴──────┐
                                    │   API GW    │
                                    └──────┬──────┘
                                           │
                    ┌──────────────────────┼──────────────────────────┐
                    │                      │                          │
                    ▼                      ▼                          ▼
        ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
        │    REST API       │    │   SignalR Hub     │    │   Health Checks   │
        │   /api/v1/*       │    │ /hubs/notifications│   │    /health/*      │
        └─────────┬─────────┘    └─────────┬─────────┘    └───────────────────┘
                  │                        │
                  └────────────┬───────────┘
                               │
                    ┌──────────▼──────────┐
                    │   .NET 8 Backend    │
                    │                     │
                    │  ┌───────────────┐  │
                    │  │  Controllers  │  │
                    │  └───────┬───────┘  │
                    │          │          │
                    │  ┌───────▼───────┐  │
                    │  │   MediatR     │  │
                    │  │   (CQRS)      │  │
                    │  └───────┬───────┘  │
                    │          │          │
                    │  ┌───────▼───────┐  │
                    │  │   Domain      │  │
                    │  │   Services    │  │
                    │  └───────────────┘  │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   SQL Server  │    │     Redis     │    │  External     │
│   (Database)  │    │   (Cache)     │    │  Services     │
│               │    │               │    │  - Epic FHIR  │
│  - Patients   │    │  - Sessions   │    │  - BioMistral │
│  - Orders     │    │  - SignalR    │    │  - Azure AD   │
│  - Assessments│    │    Backplane  │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## Component Details

### 1. Frontend Applications

| Application | Technology | Purpose |
|-------------|------------|---------|
| Provider Portal | Next.js 14 | Clinical decision support for providers |
| Patient Portal | Next.js 14 | Patient symptom assessment (COMPASS) |
| Mobile App | React Native | Mobile access for both portals |

**Key Frontend Files:**
```
apps/provider-portal/lib/api/
├── backendClient.ts      # REST API client with typed methods
├── notificationClient.ts # SignalR real-time notifications
├── hooks.ts              # React hooks for all API operations
├── NotificationContext.tsx # Global notification state
└── backend.ts            # Central exports
```

### 2. Backend API

**Architecture:** Clean Architecture with CQRS

```
backend/src/
├── ATTENDING.Domain/           # Core business logic (no dependencies)
│   ├── Entities/               # Patient, LabOrder, Assessment, etc.
│   ├── Services/               # RedFlagEvaluator, DrugInteractionService
│   └── Events/                 # Domain events
│
├── ATTENDING.Infrastructure/   # External concerns
│   ├── Data/                   # EF Core DbContext
│   ├── Repositories/           # Data access
│   └── External/
│       ├── FHIR/              # Epic/Oracle Health integration
│       └── AI/                # BioMistral clinical AI
│
├── ATTENDING.Application/      # Use cases
│   ├── Commands/              # Write operations
│   ├── Queries/               # Read operations
│   └── Validators/            # Input validation
│
└── ATTENDING.Orders.Api/       # HTTP layer
    ├── Controllers/           # REST endpoints
    ├── Hubs/                  # SignalR
    └── Middleware/            # Auth, Audit, Error handling
```

### 3. Database Schema

**Core Tables:**
- `clinical.Patients` - Patient demographics
- `clinical.LabOrders` / `clinical.LabResults` - Lab workflow
- `clinical.ImagingOrders` / `clinical.ImagingResults` - Imaging workflow
- `clinical.MedicationOrders` - Prescriptions
- `clinical.Referrals` - Specialist referrals
- `clinical.PatientAssessments` - COMPASS assessments
- `audit.AuditLogs` - HIPAA compliance logging

**Catalogs:**
- `clinical.LabTestCatalog` - 50+ lab tests
- `clinical.ImagingStudyCatalog` - 30+ imaging studies
- `clinical.MedicationCatalog` - 40+ medications

---

## Key Features

### Clinical Safety Features

| Feature | Implementation | Location |
|---------|----------------|----------|
| Red Flag Detection | 14 emergency categories | `RedFlagEvaluator.cs` |
| Drug Interactions | 30+ known interactions | `DrugInteractionService.cs` |
| Critical Value Alerts | Real-time SignalR | `ClinicalNotificationHub.cs` |
| STAT Upgrade | Automatic priority elevation | `CreateLabOrderHandler.cs` |
| Radiation Tracking | Cumulative dose monitoring | `ImagingOrdersController.cs` |

### Real-time Notifications

| Event | Trigger | Alert Level |
|-------|---------|-------------|
| CriticalResult | Critical lab value | Play 3x |
| EmergencyAssessment | Red flags detected | Play 5x |
| OrderStatusChange | Status update | None |
| NewAssessment | Patient starts COMPASS | Play 2x if red flags |

### AI-Powered Features

| Feature | Model | Capability |
|---------|-------|------------|
| Differential Diagnosis | BioMistral | ICD-10 codes with probability |
| Lab Recommendations | BioMistral | Based on symptoms |
| Imaging Recommendations | BioMistral | Modality selection |
| Treatment Recommendations | BioMistral | Drug-drug interaction checking |
| Triage Assessment | BioMistral | ESI levels 1-5 |

---

## API Reference

### Lab Orders API

```
GET    /api/v1/laborders/{id}
GET    /api/v1/laborders/patient/{patientId}
GET    /api/v1/laborders/pending
GET    /api/v1/laborders/critical
POST   /api/v1/laborders
PATCH  /api/v1/laborders/{id}/priority
POST   /api/v1/laborders/{id}/cancel
POST   /api/v1/laborders/{id}/collect
POST   /api/v1/laborders/{id}/result
```

### Assessments API (COMPASS)

```
GET    /api/v1/assessments/{id}
GET    /api/v1/assessments/patient/{patientId}
GET    /api/v1/assessments/pending-review
GET    /api/v1/assessments/red-flags
POST   /api/v1/assessments
POST   /api/v1/assessments/{id}/responses
POST   /api/v1/assessments/{id}/advance
POST   /api/v1/assessments/{id}/complete
POST   /api/v1/assessments/{id}/review
```

---

## Deployment Architecture

### Kubernetes Cluster

```yaml
Namespace: attending
├── Deployments
│   └── attending-api (3 replicas, HPA 3-10)
├── Services
│   └── attending-api (ClusterIP)
├── Ingress
│   ├── api.attendingai.com (REST)
│   └── api.attendingai.com/hubs (SignalR with sticky sessions)
├── ConfigMaps
│   ├── attending-config
│   └── fhir-config
├── Secrets
│   └── attending-secrets (from Azure Key Vault)
└── Monitoring
    ├── ServiceMonitor
    └── PrometheusRules
```

### CI/CD Pipeline

```
Push to develop → Build → Test → Security Scan → Deploy to Staging
Push to main    → Build → Test → Security Scan → Deploy to Production
```

---

## Security & Compliance

### HIPAA Compliance

- **Audit Logging**: All PHI access logged with user, patient, action, timestamp
- **Encryption**: TLS in transit, AES-256 at rest
- **Access Control**: Azure AD B2C with role-based permissions
- **Session Management**: 8-hour timeout (clinical shift alignment)

### Security Measures

- Non-root container execution
- Read-only root filesystem
- Network policies restricting traffic
- Secrets in Azure Key Vault
- Regular security scanning (Trivy, CodeQL, Snyk)

---

## Getting Started

### Prerequisites

1. **.NET 8 SDK** - https://dotnet.microsoft.com/download
2. **Docker Desktop** - https://docker.com
3. **Node.js 20+** - https://nodejs.org
4. **SQL Server** - Local or Azure SQL

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/attending-ai/attending.git
cd attending

# 2. Start backend (Docker)
cd backend
docker-compose up -d

# 3. Load BioMistral model
docker exec attending-ollama ollama pull biomistral

# 4. Run database migrations
# Execute SQL scripts in backend/sql/

# 5. Start frontend
cd ../apps/provider-portal
npm install
npm run dev

# 6. Access application
# Provider Portal: http://localhost:3000
# API Swagger: http://localhost:5000
# Seq Logs: http://localhost:5341
```

---

## Team Contacts

| Role | Name | Responsibility |
|------|------|----------------|
| CEO/Founder | Dr. Scott Isbell | Clinical design, physician oversight |
| CTO | Bill LaPierre | Technical architecture, enterprise |
| AI Specialist | Mark (Stanford) | AI/ML integration |
| NLP Expert | Gabriel | Natural language processing |
| Azure Specialist | Peter | Cloud infrastructure, DevOps |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-22 | Initial complete architecture |

---

*ATTENDING AI - Empowering Rural Healthcare Providers*
