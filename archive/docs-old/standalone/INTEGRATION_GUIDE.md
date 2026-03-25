# ATTENDING AI - Full Stack Integration Guide

## Overview

This document describes the complete integration between the .NET backend and the React/Next.js frontend for the ATTENDING AI healthcare platform.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Pages     │  │ Components  │  │   Hooks     │  │  Contexts   │    │
│  │  /patients  │  │ LabOrders   │  │ useLabOrder │  │ Notification│    │
│  │  /orders    │  │ Imaging     │  │ useAssess   │  │ Patient     │    │
│  │  /assess    │  │ Meds        │  │ useMeds     │  │ Auth        │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                              │                                           │
│  ┌───────────────────────────┴───────────────────────────┐              │
│  │                    lib/api/                            │              │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │              │
│  │  │backendClient│  │notifyClient │  │   hooks     │   │              │
│  │  │  (REST)     │  │  (SignalR)  │  │  (React)    │   │              │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │              │
│  └───────────────────────────────────────────────────────┘              │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ HTTPS / WSS
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       BACKEND (.NET 8)                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    ATTENDING.Orders.Api                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │  │
│  │  │ REST APIs   │  │ SignalR Hub │  │ Middleware  │               │  │
│  │  │ Controllers │  │ Notifications│  │ Auth/Audit │               │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                           │
│  ┌───────────────────────────┴───────────────────────────┐              │
│  │                ATTENDING.Application                   │              │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │              │
│  │  │  Commands   │  │   Queries   │  │ Validators  │   │              │
│  │  │  (MediatR)  │  │  (MediatR)  │  │ (Fluent)    │   │              │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │              │
│  └───────────────────────────────────────────────────────┘              │
│                              │                                           │
│  ┌───────────────────────────┴───────────────────────────┐              │
│  │               ATTENDING.Infrastructure                 │              │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │              │
│  │  │Repositories │  │ FHIR Client │  │  AI Service │   │              │
│  │  │  (EF Core)  │  │ (Epic/Oracle)│ │ (BioMistral)│   │              │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │              │
│  └───────────────────────────────────────────────────────┘              │
│                              │                                           │
│  ┌───────────────────────────┴───────────────────────────┐              │
│  │                  ATTENDING.Domain                      │              │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │              │
│  │  │  Entities   │  │  Services   │  │   Events    │   │              │
│  │  │ LabOrder    │  │ RedFlagEval │  │ DomainEvent │   │              │
│  │  │ Assessment  │  │ DrugInteract│  │             │   │              │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │              │
│  └───────────────────────────────────────────────────────┘              │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   SQL Server    │
                        │   (Database)    │
                        └─────────────────┘
```

---

## File Structure Summary

### Backend (.NET)

```
backend/
├── src/
│   ├── ATTENDING.Domain/                    # Core domain logic
│   │   ├── Entities/                        # Domain entities
│   │   ├── Services/                        # Domain services
│   │   │   ├── RedFlagEvaluator.cs         # Emergency detection
│   │   │   └── DrugInteractionService.cs   # Drug checks
│   │   ├── Events/                          # Domain events
│   │   ├── Interfaces/                      # Repository interfaces
│   │   └── ValueObjects/                    # Value objects
│   │
│   ├── ATTENDING.Infrastructure/            # External concerns
│   │   ├── Data/                            # EF Core
│   │   ├── Repositories/                    # Repository implementations
│   │   ├── External/
│   │   │   ├── FHIR/FhirClient.cs          # EHR integration
│   │   │   └── AI/ClinicalAiService.cs     # AI recommendations
│   │   └── Services/AuditService.cs        # HIPAA audit
│   │
│   ├── ATTENDING.Application/               # Use cases
│   │   ├── Commands/                        # Write operations
│   │   ├── Queries/                         # Read operations
│   │   ├── DTOs/                            # Data transfer objects
│   │   └── Validators/                      # Input validation
│   │
│   ├── ATTENDING.Orders.Api/                # HTTP API
│   │   ├── Controllers/                     # REST endpoints
│   │   ├── Hubs/ClinicalNotificationHub.cs # SignalR
│   │   └── Middleware/                      # Auth, audit
│   │
│   └── ATTENDING.Contracts/                 # Shared DTOs
│       ├── Requests/                        # API request models
│       └── Responses/                       # API response models
│
├── sql/                                     # Database scripts
│   ├── 001-CreateSchema.sql                # Table creation
│   ├── 002-SeedData.sql                    # Reference data
│   └── 003-SampleData.sql                  # Test data
│
├── tests/                                   # Unit tests
├── Dockerfile                               # Container build
└── docker-compose.yml                       # Dev stack
```

### Frontend (Next.js)

```
apps/provider-portal/
├── lib/api/                                 # Backend integration
│   ├── backendClient.ts                    # REST API client
│   ├── notificationClient.ts               # SignalR client
│   ├── hooks.ts                            # React hooks
│   ├── NotificationContext.tsx             # Notification state
│   └── backend.ts                          # Module exports
│
├── components/                              # UI components
├── pages/                                   # Next.js routes
├── contexts/                                # React contexts
└── store/                                   # Zustand stores
```

---

## API Endpoints

### Lab Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/laborders/{id}` | Get order by ID |
| GET | `/api/v1/laborders/patient/{patientId}` | Get patient's orders |
| GET | `/api/v1/laborders/pending` | Get pending orders |
| GET | `/api/v1/laborders/critical` | Get critical results |
| POST | `/api/v1/laborders` | Create new order |
| PATCH | `/api/v1/laborders/{id}/priority` | Update priority |
| POST | `/api/v1/laborders/{id}/cancel` | Cancel order |
| POST | `/api/v1/laborders/{id}/collect` | Mark collected |
| POST | `/api/v1/laborders/{id}/result` | Add result |

### Imaging Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/imagingorders/{id}` | Get order by ID |
| GET | `/api/v1/imagingorders/patient/{patientId}` | Get patient's orders |
| GET | `/api/v1/imagingorders/patient/{patientId}/radiation-dose` | Get cumulative radiation |
| POST | `/api/v1/imagingorders` | Create new order |
| POST | `/api/v1/imagingorders/{id}/schedule` | Schedule imaging |

### Medications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/medications/{id}` | Get order by ID |
| GET | `/api/v1/medications/patient/{patientId}/active` | Get active meds |
| POST | `/api/v1/medications/patient/{patientId}/check-interactions` | Check interactions |
| POST | `/api/v1/medications` | Create prescription |
| POST | `/api/v1/medications/{id}/discontinue` | Discontinue |

### Referrals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/referrals/specialties` | Get specialties list |
| GET | `/api/v1/referrals/{id}` | Get referral by ID |
| POST | `/api/v1/referrals` | Create referral |
| POST | `/api/v1/referrals/{id}/complete` | Complete with notes |

### Assessments (COMPASS)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/assessments/pending-review` | Get review queue |
| GET | `/api/v1/assessments/red-flags` | Get emergency queue |
| POST | `/api/v1/assessments` | Start assessment |
| POST | `/api/v1/assessments/{id}/responses` | Submit response |
| POST | `/api/v1/assessments/{id}/complete` | Complete assessment |

---

## SignalR Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `CriticalResult` | Server → Client | Critical lab result notification |
| `EmergencyAssessment` | Server → Client | Emergency detected in assessment |
| `OrderStatusChange` | Server → Client | Order status updated |
| `NewAssessment` | Server → Client | New assessment started |
| `RedFlagDetected` | Server → Client | Red flag detected |
| `PlayAlert` | Server → Client | Trigger audio alert |
| `WatchPatient` | Client → Server | Subscribe to patient updates |
| `UnwatchPatient` | Client → Server | Unsubscribe from patient |
| `JoinEmergencyAlerts` | Client → Server | Join emergency group |

---

## Usage Examples

### React Component Example

```tsx
import { 
  usePatientLabOrders, 
  useCreateLabOrder,
  usePatientNotifications,
  NotificationProvider 
} from '@/lib/api/backend';

function PatientLabOrders({ patientId }: { patientId: string }) {
  // Fetch lab orders
  const { data: labOrders, isLoading, error, refetch } = usePatientLabOrders(patientId);
  
  // Create lab order mutation
  const { mutate: createOrder, isLoading: isCreating } = useCreateLabOrder();
  
  // Real-time updates for this patient
  const { patientOrderUpdates } = usePatientNotifications(patientId);
  
  // Refetch when we receive an update
  useEffect(() => {
    if (patientOrderUpdates.length > 0) {
      refetch();
    }
  }, [patientOrderUpdates, refetch]);
  
  const handleCreateOrder = async () => {
    try {
      const result = await createOrder({
        patientId,
        encounterId: '...',
        testCode: 'CBC',
        testName: 'Complete Blood Count',
        // ... other fields
      });
      
      if (result.wasUpgradedToStat) {
        alert(`Order upgraded to STAT: ${result.redFlagReason}`);
      }
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };
  
  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.detail} />;
  
  return (
    <div>
      <h2>Lab Orders</h2>
      {labOrders?.map(order => (
        <LabOrderCard key={order.id} order={order} />
      ))}
      <Button onClick={handleCreateOrder} disabled={isCreating}>
        Order New Lab
      </Button>
    </div>
  );
}

// Wrap app with provider
function App() {
  return (
    <NotificationProvider accessToken={authToken}>
      <PatientLabOrders patientId="..." />
    </NotificationProvider>
  );
}
```

---

## Environment Configuration

### Frontend (.env.local)

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SIGNALR_URL=http://localhost:5000/hubs/notifications

# Auth
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your-client-id
NEXT_PUBLIC_AZURE_AD_TENANT_ID=your-tenant-id
```

### Backend (appsettings.json)

```json
{
  "ConnectionStrings": {
    "AttendingDb": "Server=localhost;Database=ATTENDING;Trusted_Connection=True;"
  },
  "AzureAdB2C": {
    "Instance": "https://yourtenantname.b2clogin.com",
    "ClientId": "your-client-id"
  },
  "Cors": {
    "AllowedOrigins": ["http://localhost:3000"]
  }
}
```

---

## Getting Started

### 1. Database Setup

```bash
# Using SQL Server Management Studio, run:
# 1. backend/sql/001-CreateSchema.sql
# 2. backend/sql/002-SeedData.sql
# 3. backend/sql/003-SampleData.sql (development only)
```

### 2. Backend (when .NET SDK installed)

```bash
cd backend
dotnet restore
dotnet build
cd src/ATTENDING.Orders.Api
dotnet run
# API at http://localhost:5000
```

### 3. Frontend

```bash
cd apps/provider-portal
npm install
npm run dev
# App at http://localhost:3000
```

---

## Key Features

| Feature | Backend | Frontend |
|---------|---------|----------|
| Red Flag Detection | `RedFlagEvaluator` | `useRedFlagAssessments` |
| Drug Interactions | `DrugInteractionService` | `useCheckDrugInteractions` |
| Critical Results | `CriticalResultNotification` | `useCriticalLabResults` |
| Real-time Updates | SignalR Hub | `NotificationProvider` |
| HIPAA Audit | `AuditMiddleware` | Automatic |
| EHR Integration | `FhirClient` | API calls |
| AI Recommendations | `ClinicalAiService` | API calls |

---

## Next Steps

1. **Install Prerequisites**
   - .NET 8 SDK: https://dotnet.microsoft.com/download
   - Docker Desktop: https://www.docker.com/products/docker-desktop
   - Node.js 18+: https://nodejs.org

2. **Run Database Scripts**
   - Execute SQL scripts in SQL Server

3. **Start Backend**
   - `dotnet run` or `docker-compose up`

4. **Start Frontend**
   - `npm run dev`

5. **Test Integration**
   - Open http://localhost:3000
   - Log in and test workflows

---

*Document generated: January 22, 2026*
