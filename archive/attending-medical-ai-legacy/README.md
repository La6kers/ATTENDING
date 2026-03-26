# ATTENDING — Medical AI Platform

ATTENDING is an AI-powered medical platform that streamlines the clinical workflow from patient intake to post-visit analysis. Built to contrast the complexity of traditional EHR systems like Epic with a clean, intuitive experience.

## The Vision

**Compass** — Patient-facing intake that guides patients through check-in with AI-powered follow-up questions.

**ATTENDING** — Clinician interface with AI clinical decision support, automated SOAP note generation, and quality/coding review.

## Demo Flow

```
Patient → Compass Intake → Waiting Room → Doctor Encounter → Charting → AI Review → Dashboard
```

1. Patient opens **Compass** (`/compass`) and completes guided check-in
2. AI asks smart follow-up questions based on symptoms and history
3. Clinician sees patient in **Waiting Room** with AI-generated triage summary
4. Doctor opens **Encounter** view — single-pane layout with AI clinical decision support
5. Doctor completes **Charting** — AI generates SOAP note from encounter data
6. **Visit Review** — AI reviews note for completeness, suggests ICD-10/CPT codes
7. **Dashboard** — Overview of all patients and encounters

## Quick Start

```bash
# 1. Clone and install
cd attending-medical-ai
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Run
npm run dev
```

- **Clinician UI**: http://localhost:5173
- **Compass (Patient Intake)**: http://localhost:5173/compass
- **API**: http://localhost:3001

The database auto-initializes with 8 seed patients at various stages of the workflow.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| AI | Claude API (Anthropic) |
| Database | SQLite |

## Project Structure

```
attending-medical-ai/
├── apps/
│   ├── frontend/          ← React app (Compass + Clinician UI)
│   ├── backend/           ← Express API + Claude integration
│   ├── ai-service/        ← ML models (enterprise)
│   └── mobile/            ← Mobile app (enterprise)
├── docs/                  ← Documentation (enterprise)
├── infrastructure/        ← Docker, K8s, Terraform (enterprise)
├── scripts/               ← Setup and deployment scripts
└── .github/               ← CI/CD workflows (enterprise)
```

Directories marked **(enterprise)** represent planned capabilities in the full platform architecture.

## AI Integration Points

| Endpoint | Purpose |
|----------|---------|
| `POST /api/ai/intake-followup` | Smart intake questions based on patient symptoms |
| `POST /api/ai/intake-summary` | Pre-encounter clinical summary for clinician |
| `POST /api/ai/encounter-assist` | Differential diagnoses, recommended workup |
| `POST /api/ai/generate-note` | Auto-generate SOAP note from encounter data |
| `POST /api/ai/review` | Quality review with ICD-10/CPT code suggestions |

## License

Proprietary — All rights reserved.
