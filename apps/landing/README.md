# ATTENDING AI — Landing Hub

Central entry point for the ATTENDING AI Clinical Intelligence Platform. Routes to all four portals based on environment detection.

## Portals

| Portal | Description | Dev URL |
|--------|-------------|---------|
| **COMPASS** | AI-guided patient symptom assessment | `localhost:3001/compass` |
| **ATTENDING** | Provider clinical decision support | `localhost:3000` |
| **Patient Portal** | Patient health records & messaging | `localhost:3001` |
| **IT Admin** | System monitoring & administration | `localhost:3000/admin` |

## Quick Start

```bash
# Serve the landing page locally
npm run dev
# Opens at http://localhost:3002
```

## Environment Detection

The landing page auto-detects where it's running:

- **Production** (`attendingai.health`): Routes to subdomains
- **Development** (`localhost`): Routes to port-based URLs
- **Demo** (`file://`): Routes to local HTML files in `./demos/`

## Demo Files

Place standalone HTML prototypes in `public/demos/` for offline demo mode:

```
public/demos/
├── compass-chatbot.html      # COMPASS assessment demo
├── provider-portal.html      # Provider portal demo
├── patient-portal.html       # Patient portal demo
└── admin-console.html        # IT admin console demo
```

## Running All Portals Together

From the monorepo root:

```bash
npm run dev:all    # Starts landing (3002) + provider (3000) + patient (3001)
```
