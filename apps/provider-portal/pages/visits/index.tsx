// DEPRECATED: This file is scheduled for deletion.
// Links should point directly to /visits/completed instead.
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DeprecatedVisitsIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/visits/completed');
  }, [router]);

  return null;
}
