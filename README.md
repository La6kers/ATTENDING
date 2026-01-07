# ATTENDING AI Medical Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/La6kers/ATTENDING)
[![License](https://img.shields.io/badge/license-proprietary-blue)](LICENSE)

> AI-powered healthcare platform combining clinical decision support (ATTENDING AI) with patient symptom assessment (COMPASS).

## 🏥 Overview

ATTENDING AI is a comprehensive healthcare platform with two complementary products:

- **ATTENDING AI** - Provider-facing clinical decision support platform
- **COMPASS** - Patient-facing symptom assessment chatbot (Clinical Optimized Multi-symptom Processing AI Support System)

## 🏗️ Architecture

```
ATTENDING/
├── apps/
│   ├── provider-portal/     # Next.js provider dashboard (Port 3002)
│   ├── patient-portal/      # Next.js patient interface (Port 3001)
│   ├── shared/              # Shared types, services, XState machines
│   ├── frontend/            # HTML prototypes (COMPASS chat)
│   ├── backend/             # .NET 8 API services
│   ├── ai-service/          # AI/ML service integration
│   └── mobile/              # Mobile application (planned)
├── docs/                    # Documentation
├── infrastructure/          # Docker, Kubernetes, Terraform
├── scripts/                 # Utility and deployment scripts
└── services/                # Microservices
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+
- .NET 8 SDK (for backend)

### Running the Provider Portal

```bash
cd apps/provider-portal
npm install
npm run dev
# Open http://localhost:3000
```

### Running the Patient Portal

```bash
cd apps/patient-portal
npm install
npm run dev
# Open http://localhost:3001
```

### Running COMPASS Chat (HTML Prototype)

```bash
cd apps/frontend
npx serve .
# Open http://localhost:3000/chat/index.html
```

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript |
| State Management | Zustand (UI), XState (workflows) |
| Styling | Tailwind CSS |
| Backend | .NET 8, C# |
| AI/ML | BioMistral-7B integration |
| Infrastructure | Azure, Docker, Kubernetes |

## 📦 Applications

### Provider Portal (`apps/provider-portal`)

Clinical dashboard for healthcare providers:
- Patient queue management
- AI-powered clinical insights
- Lab results review
- Medication management
- Treatment planning
- Imaging review

### Patient Portal (`apps/patient-portal`)

Patient-facing interface:
- COMPASS health assistant chat
- Vitals tracking
- Medication adherence
- Appointment scheduling
- Health records access

### COMPASS Chat (`apps/frontend/chat`)

AI-powered symptom assessment:
- Multi-symptom processing
- Urgency detection
- Clinical summary generation
- Provider handoff integration

## 👥 Team

- **Scott Isbell, MD** - Founder & CEO, Lead Developer
- **Bill LaPierre** - CTO
- **Mark Holmstrom** - Principal Data Scientist
- **Gabriel Colón** - AI/NLP Engineer
- **Peter Almanzar** - Healthcare IT Developer

## 📄 License

Proprietary - All Rights Reserved

## 🔐 Security & Compliance

This platform is designed with HIPAA compliance in mind. See `docs/security/` for security documentation.

---

*Built with ❤️ for better healthcare*
