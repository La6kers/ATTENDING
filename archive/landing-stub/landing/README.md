# ⚠️ DEPRECATED — apps/landing

**This directory contains static HTML prototypes that are no longer the canonical source of truth.**

The real applications are:
- **Provider Portal**: `apps/provider-portal` (Next.js, port 3000)
- **Patient Portal**: `apps/patient-portal` (Next.js, port 3001)

## Cleanup

This directory has been removed from the workspace config in `package.json` and will not be built or deployed. To fully remove:

```bash
rm -rf apps/landing
```

The HTML demos (admin-console, compass-chatbot, patient-portal, provider-portal) were early prototypes. If you need them for historical reference, archive them separately before deletion.
