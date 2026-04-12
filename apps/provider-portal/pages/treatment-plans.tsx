// ============================================================
// Redirect: /treatment-plans → /treatment-plan
// apps/provider-portal/pages/treatment-plans.tsx
//
// Consolidated to single treatment plan page with purple gradient
// theme matching all other order pages. This redirect ensures
// old links still work.
// ============================================================

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TreatmentPlansRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Preserve any query parameters during redirect
    const query = router.query;
    router.replace({ pathname: '/treatment-plan', query });
  }, [router]);

  return null;
}
