// =============================================================================
// ATTENDING AI - Patient List Page
// apps/provider-portal/pages/patients/index.tsx
//
// Redirects to inbox which contains the patient list
// =============================================================================

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function PatientsIndex() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to inbox which contains the patient list
    router.replace('/inbox');
  }, [router]);

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Redirecting to inbox...</p>
      </div>
    </div>
  );
}
