// ============================================================
// ATTENDING AI - Home Page Redirect
// apps/provider-portal/pages/index.tsx
//
// Redirects to the dashboard. When connected to a real backend,
// this can check auth state and route accordingly.
// ============================================================

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
