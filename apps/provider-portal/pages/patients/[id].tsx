// DEPRECATED: This file is scheduled for deletion.
// All patient chart functionality lives at /patient/[id].tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DeprecatedPatientChart() {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      router.replace(`/patient/${id}`);
    }
  }, [id, router]);

  return null;
}
