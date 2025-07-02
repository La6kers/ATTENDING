# ATTENDING AI Repository Structure

This repository has been restructured to have all development under a unified structure. The main project root now contains all the necessary components for the ATTENDING AI medical system.

## Current Structure

```
/workspaces/ATTENDING/ (Main Repository Root)
├── .git/                    # Git repository
├── .github/                 # GitHub workflows and configurations
├── .gitignore              # Git ignore file
├── package.json            # Root package configuration
├── package-lock.json       # Package lock file
├── apps/                   # All applications
│   ├── provider-portal/    # Active Next.js provider portal (recently moved)
│   ├── patient-portal/     # Patient portal application
│   ├── ai-service/         # AI service components
│   ├── backend/            # Backend services (.NET)
│   ├── frontend/           # HTML prototypes and static files
│   └── mobile/             # Mobile application
├── docs/                   # Documentation
│   ├── api/                # API documentation
│   ├── deployment/         # Deployment guides
│   ├── development/        # Development guides
│   ├── medical/            # Medical protocols
│   ├── scripts/            # Documentation scripts
│   └── tools/              # Tool documentation
├── infrastructure/         # Infrastructure as Code
│   ├── docker/             # Docker configurations
│   ├── kubernetes/         # Kubernetes manifests
│   └── terraform/          # Terraform configurations
├── scripts/                # Utility scripts
│   ├── deploy/             # Deployment scripts
│   ├── setup/              # Setup scripts
│   └── test-medical/       # Medical testing scripts
└── services/               # Microservices
    ├── ai-service/         # AI service
    ├── backend/            # Backend service
    └── notification-service/ # Notification service
```

## Key Changes Made

1. **Renamed** `attending-medical-ai` to serve as the main repository root
2. **Moved** the active `provider-portal` from `/apps/provider-portal/` to the main structure
3. **Consolidated** HTML prototypes from `/src/` into `/apps/frontend/`
4. **Moved** root configuration files (package.json, .gitignore) into the main structure
5. **Removed** duplicate and empty directories

## Active Development

The main active development is in:
- `/apps/provider-portal/` - The Next.js based provider portal with recent patient chat improvements

## Running the Provider Portal

```bash
cd apps/provider-portal
npm install
npm run dev
```

The application will be available at http://localhost:3000

## Notes

- All file paths and imports remain functional
- The provider portal continues to work without any code changes
- The structure now follows a proper monorepo organization
