// ============================================================
// ATTENDING AI — Patient App Root
// Redirects to /home (the main patient app screen)
// ============================================================

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/home');
  }, [router]);

  return (
    <div className="min-h-screen bg-surface-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-attending-gradient flex items-center justify-center mx-auto mb-3">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <p className="text-sm text-attending-200">Loading...</p>
      </div>
    </div>
  );
}
