# Future Services

These services are **complete implementations** staged for future integration. They are fully typed and contain working business logic but are not yet wired into the main application.

## Services

| Service | Description | Status |
|---------|-------------|--------|
| `end-of-life/` | Advance care planning, goals of care, hospice eligibility | Complete, not integrated |
| `interpreter/` | Medical interpreter matching and session management | Complete, not integrated |
| `mental-health/` | Mental health screening, crisis detection, therapy coordination | Complete, not integrated |
| `patient-engagement/` | Family health hub, health coaching, medication buddy, post-discharge | Complete, not integrated |
| `peer-consult/` | Specialist peer consultation matching and tracking | Complete, not integrated |
| `population-health/` | Population-level analytics and quality measures | Complete, not integrated |
| `smart-scheduling/` | AI-powered appointment optimization | Complete, not integrated |
| `social-support/` | Social determinants of health, community resources | Complete, not integrated |
| `wearables/` | Wearable device data integration and monitoring | Complete, not integrated |

## Integration Checklist

Before moving any service out of `_future/`:

1. Register in the ServiceRegistry with appropriate tier-gating (free/pro/enterprise)
2. Add API routes in the provider-portal
3. Add database models to Prisma schema if needed
4. Write integration tests
5. Add to the clinical services barrel export
