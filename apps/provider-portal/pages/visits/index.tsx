// =============================================================================
// ATTENDING AI - Visits Index
// apps/provider-portal/pages/visits/index.tsx
//
// Redirects to completed visits by default
// =============================================================================

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function VisitsIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/visits/completed');
  }, [router]);

  return null;
}
