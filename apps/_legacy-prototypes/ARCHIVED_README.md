# Archived Prototypes - ATTENDING AI

This directory contains legacy HTML prototypes that were used during initial development.
**These files are archived and should not be used for active development.**

## Migration Status

| Prototype | Status | Migrated To |
|-----------|--------|-------------|
| `chat/` | ✅ Migrated | `apps/patient-portal/` - COMPASS chat interface |
| `imaging/` | ✅ Migrated | `apps/provider-portal/components/imaging-ordering/` |
| `labs/` | ✅ Migrated | `apps/provider-portal/components/lab-ordering/` |
| `meds/` | ✅ Migrated | `apps/provider-portal/pages/medications.tsx` |
| `referrals/` | ✅ Migrated | `apps/provider-portal/components/referral-ordering/` |
| `treatment/` | ✅ Migrated | `apps/provider-portal/components/treatment-plan/` |
| `previsit/` | 🔄 Partial | Some logic extracted to shared types |
| `Pre visit Dashboard.html` | 🔄 Partial | Dashboard concepts in provider portal |
| `attending_ai_portal.html` | 📦 Archived | Reference only |
| `index.html` | 📦 Archived | Reference only |

## Why Keep These?

1. **Reference**: Contains clinical workflows and business logic that may be useful
2. **Fallback**: Can be used to verify feature parity during migration
3. **Documentation**: Shows original design intent

## Clinical Logic Extracted

The following clinical logic from prototypes has been consolidated into `@attending/shared`:

### Red Flag Detection (`apps/shared/services/`)
- Cardiac symptoms (chest pain, shortness of breath)
- Neurological symptoms (stroke signs, seizures)
- Emergency conditions (anaphylaxis, GI bleeding)

### Assessment Workflows (`apps/shared/machines/`)
- HPI collection flow (OPQRST format)
- Review of systems
- Medical history gathering
- Risk stratification

### Data Types (`apps/shared/types/`)
- `HistoryOfPresentIllness`
- `ReviewOfSystems`
- `ClinicalSummary`
- `PatientAssessment`
- `Diagnosis` with ICD-10 support

## Cleanup Instructions

Once all features are verified in the React applications, this directory can be safely deleted:

```bash
# From repository root
rm -rf apps/_archived-prototypes
```

---

*Archived: January 2026*
*Last Active Development: 2024*
