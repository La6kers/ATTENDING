# ATTENDING AI Medical Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/La6kers/ATTENDING)
[![License](https://img.shields.io/badge/license-proprietary-blue)](LICENSE)

> AI-powered healthcare platform combining clinical decision support (ATTENDING AI) with patient symptom assessment (COMPASS).

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up database
npx prisma generate
npx prisma db push
npm run db:seed

# 3. Start development
npm run dev

# Open:
# - Provider Portal: http://localhost:3000
# - Patient Portal:  http://localhost:3001
```

## 🏗️ Architecture

```
ATTENDING/
├── apps/
│   ├── provider-portal/     # Next.js provider dashboard (Port 3000)
│   │   ├── pages/           # Dashboard, Labs, Imaging, Meds, Treatment
│   │   ├── components/      # React components
│   │   ├── store/           # Zustand state management
│   │   ├── lib/             # Utilities, Prisma client, WebSocket
│   │   └── pages/api/       # API routes (Prisma-backed)
│   │
│   ├── patient-portal/      # Next.js patient interface (Port 3001)
│   │   ├── pages/chat/      # COMPASS symptom assessment
│   │   └── pages/api/       # Chat and submission APIs
│   │
│   ├── shared/              # Shared packages
│   │   ├── types/           # TypeScript interfaces
│   │   ├── services/        # Notification, Geolocation
│   │   └── machines/        # XState assessment workflow
│   │
│   └── frontend/            # HTML prototypes (reference)
│
├── services/
│   └── notification-service/ # WebSocket server (Port 3003)
│
├── prisma/
│   ├── schema.prisma        # Database schema (30+ models)
│   └── seed.ts              # Clinical test data
│
└── scripts/
    ├── dev-setup.js         # Automated setup
    └── verify-setup.js      # Configuration check
```

## 🔧 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both portals |
| `npm run dev:provider` | Start provider portal only |
| `npm run dev:patient` | Start patient portal only |
| `npm run dev:ws` | Start WebSocket server |
| `npm run dev:all` | Start all services |
| `npm run dev:setup` | Automated setup wizard |
| `npm run db:seed` | Seed database with test data |
| `npm run db:studio` | Open Prisma Studio |

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript |
| State | Zustand (UI state), XState (workflows) |
| Styling | Tailwind CSS |
| Database | PostgreSQL / SQLite (dev) |
| ORM | Prisma |
| Real-time | Socket.io |
| AI | BioMistral-7B integration (planned) |

## 🏥 Features

### Provider Portal (ATTENDING)
- **Dashboard** - Patient queue with urgency-based sorting
- **COMPASS Assessments** - Review AI-gathered patient data
- **Labs** - Order and review laboratory tests
- **Imaging** - Radiology orders with STAT support
- **Medications** - Prescription management
- **Treatment Plans** - Care planning tools

### Patient Portal (COMPASS)
- **AI Symptom Assessment** - Conversational health interview
- **Red Flag Detection** - Automatic urgency evaluation
- **Emergency Protocols** - 911 guidance with geolocation
- **Provider Handoff** - Seamless clinical data transfer

## 📊 Database Models

Key entities in the Prisma schema:

- `User` - Providers, nurses, staff
- `Patient` - Patient demographics
- `PatientAssessment` - COMPASS submissions
- `Encounter` - Clinical visits
- `LabOrder` / `LabResult` - Laboratory
- `ImagingOrder` - Radiology
- `MedicationOrder` - Prescriptions
- `Notification` - Real-time alerts
- `EmergencyEvent` - Critical situations

## 🔐 Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"  # SQLite for dev
# DATABASE_URL="postgresql://..." # PostgreSQL for prod

# Auth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# WebSocket
NEXT_PUBLIC_WS_URL="http://localhost:3003"

# Inter-service
PROVIDER_API_URL="http://localhost:3000"
```

## 🧪 Test Data

After running `npm run db:seed`, you'll have:

| Patient | Chief Complaint | Urgency |
|---------|-----------------|---------|
| Maria Garcia | Thunderclap headache | 🔴 EMERGENCY |
| Robert Chen | Exertional chest pain | 🟠 HIGH |
| James Wilson | Pleuritic chest pain | 🟠 HIGH |
| Jennifer Williams | RLQ abdominal pain | 🟡 MODERATE |
| Michael Brown | Chronic cough | 🟢 STANDARD |
| Emily Davis | Anxiety/insomnia | 🟢 STANDARD |

## 👥 Team

- **Scott Isbell, MD** - Founder & CEO, Clinical Lead
- **Bill LaPierre** - CTO
- **Mark Holmstrom** - Principal Data Scientist
- **Gabriel Colón** - AI/NLP Engineer
- **Peter Almanzar** - Healthcare IT Developer

## 📄 License

Proprietary - All Rights Reserved

## 🔒 Security & Compliance

This platform is designed with HIPAA compliance in mind:
- PHI encryption at rest and in transit
- Audit logging for all data access
- Role-based access control
- Session management with secure tokens

---

*Built with ❤️ for better healthcare*
