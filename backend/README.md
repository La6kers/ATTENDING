# ATTENDING AI - .NET Backend

Enterprise-grade clinical decision support API for the ATTENDING AI healthcare platform.

## 🏥 Overview

ATTENDING AI is a comprehensive healthcare platform designed to support rural healthcare providers with clinical decision support, patient assessments, and EHR integration. This .NET 8 backend provides the core API services.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ATTENDING.Orders.Api                         │
│  REST Controllers • SignalR Hub • Middleware • Health Checks    │
├─────────────────────────────────────────────────────────────────┤
│                   ATTENDING.Application                          │
│  CQRS Commands/Queries • MediatR • FluentValidation • DTOs      │
├─────────────────────────────────────────────────────────────────┤
│                  ATTENDING.Infrastructure                        │
│  EF Core • Repositories • FHIR Client • AI Service • Audit      │
├─────────────────────────────────────────────────────────────────┤
│                     ATTENDING.Domain                             │
│  Entities • Value Objects • Domain Events • Domain Services     │
├─────────────────────────────────────────────────────────────────┤
│                    ATTENDING.Contracts                           │
│  Request/Response DTOs (shared with frontend)                   │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- .NET 8.0 SDK
- SQL Server 2019+ (or Docker)
- Optional: Docker Desktop

### Local Development

```bash
# Clone and navigate to backend
cd backend

# Restore packages
dotnet restore

# Build
dotnet build

# Run tests
dotnet test

# Run API
cd src/ATTENDING.Orders.Api
dotnet run
```

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f orders-api

# Stop services
docker-compose down
```

### API Access

- **Swagger UI**: http://localhost:5000
- **Health Check**: http://localhost:5000/health
- **SignalR Hub**: http://localhost:5000/hubs/notifications

## 📋 API Endpoints

### Lab Orders (`/api/v1/laborders`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/{id}` | Get order by ID |
| GET | `/patient/{patientId}` | Get patient's orders |
| GET | `/pending` | Get pending orders |
| GET | `/critical` | Get critical results |
| POST | `/` | Create new order |
| POST | `/{id}/result` | Add result |

### Imaging Orders (`/api/v1/imagingorders`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/{id}` | Get order by ID |
| GET | `/patient/{patientId}/radiation-dose` | Get cumulative radiation |
| POST | `/` | Create new order |

### Medications (`/api/v1/medications`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patient/{patientId}/active` | Get active medications |
| POST | `/patient/{patientId}/check-interactions` | Check drug interactions |
| POST | `/` | Create prescription |

### Referrals (`/api/v1/referrals`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/specialties` | Get available specialties |
| GET | `/pending/specialty/{specialty}` | Get pending by specialty |
| POST | `/` | Create referral |

### Assessments (`/api/v1/assessments`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pending-review` | Get pending review queue |
| GET | `/red-flags` | Get emergency queue |
| POST | `/` | Start assessment |
| POST | `/{id}/responses` | Submit response |

## 🔒 Key Features

### Clinical Safety
- **Red Flag Detection**: 14 emergency categories with automatic STAT escalation
- **Drug Interaction Checking**: 30+ known interactions with contraindication blocking
- **Critical Result Notifications**: Real-time alerts via SignalR

### HIPAA Compliance
- Comprehensive audit logging
- PHI access tracking
- Encrypted connections
- Role-based access control

### EHR Integration
- FHIR R4 client for Epic
- Oracle Health (Cerner) support planned
- Bidirectional data exchange

### AI-Powered
- BioMistral integration for differential diagnosis
- Lab and imaging recommendations
- Triage assessment support

## 🛠️ Configuration

### Environment Variables

```bash
# Database
ConnectionStrings__AttendingDb=Server=localhost;Database=ATTENDING;...

# Azure AD B2C
AzureAdB2C__Instance=https://yourtenantname.b2clogin.com
AzureAdB2C__ClientId=your-client-id

# CORS
Cors__AllowedOrigins__0=http://localhost:3000

# AI Service
ClinicalAi__BaseUrl=http://localhost:11434/api
ClinicalAi__Model=biomistral
```

### appsettings.json

```json
{
  "ConnectionStrings": {
    "AttendingDb": "Server=localhost;Database=ATTENDING;Trusted_Connection=True;"
  },
  "AzureAdB2C": {
    "Instance": "https://attendingai.b2clogin.com",
    "ClientId": "your-client-id"
  }
}
```

## 🧪 Testing

```bash
# Run all tests
dotnet test

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"

# Run specific test project
dotnet test tests/ATTENDING.Domain.Tests
```

### Test Categories
- **Unit Tests**: Domain services, entities, validators
- **Integration Tests**: Repository, API endpoints (planned)
- **Clinical Scenario Tests**: Red flag detection, drug interactions

## 📊 Database

### Initial Setup

```bash
# Create migration
cd src/ATTENDING.Infrastructure
dotnet ef migrations add InitialCreate --startup-project ../ATTENDING.Orders.Api

# Apply migration
dotnet ef database update --startup-project ../ATTENDING.Orders.Api
```

### Schema

- `clinical.*` - Clinical orders, results, assessments
- `identity.*` - Users, roles, providers
- `audit.*` - HIPAA audit logs

## 📡 Real-time Notifications

### SignalR Events

| Event | Description |
|-------|-------------|
| `CriticalResult` | Critical lab result notification |
| `EmergencyAssessment` | Emergency detected in assessment |
| `OrderStatusChange` | Order status updated |
| `RedFlagDetected` | Red flag detected during assessment |
| `PlayAlert` | Client should play audio alert |

### Client Connection

```javascript
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/hubs/notifications")
    .withAutomaticReconnect()
    .build();

connection.on("CriticalResult", (notification) => {
    console.log("Critical result:", notification);
});

await connection.start();
await connection.invoke("JoinEmergencyAlerts");
```

## 🔐 Authentication

Azure AD B2C is used for authentication:

1. Configure tenant in Azure portal
2. Create user flows (sign-up/sign-in)
3. Update `appsettings.json` with tenant details
4. Include JWT token in `Authorization` header

## 📈 Monitoring

### Health Checks

- `/health` - Full health check
- `/health/ready` - Readiness (includes DB)
- `/health/live` - Liveness (app running)

### Logging

Structured logging with Serilog:
- Console output in development
- Seq for local development (`http://localhost:5341`)
- Application Insights for production

## 📁 Project Structure

```
backend/
├── src/
│   ├── ATTENDING.Domain/           # Domain entities, services
│   ├── ATTENDING.Application/      # CQRS, DTOs, validators
│   ├── ATTENDING.Infrastructure/   # EF Core, repositories, external services
│   ├── ATTENDING.Orders.Api/       # REST API, SignalR hub
│   └── ATTENDING.Contracts/        # Shared DTOs
├── tests/
│   └── ATTENDING.Domain.Tests/     # Unit tests
├── docker-compose.yml              # Docker development stack
├── Dockerfile                      # API container image
└── ATTENDING.Backend.sln           # Solution file
```

## 🤝 Contributing

1. Follow Clean Architecture principles
2. Write unit tests for domain services
3. Use FluentValidation for input validation
4. Document API endpoints with XML comments
5. Follow HIPAA guidelines for PHI handling

## 📝 License

Proprietary - ATTENDING AI Healthcare Technology

## 👥 Team

- **Dr. Scott Isbell** - CEO/Founder, Clinical Requirements
- **Bill LaPierre** - CTO, Architecture Oversight
- **Peter** - Azure & Infrastructure
- **Mark** - AI Integration
- **Gabriel** - NLP & Clinical AI
