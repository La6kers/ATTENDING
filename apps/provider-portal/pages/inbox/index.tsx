// =============================================================================
// ATTENDING AI - Provider Inbox Page
// apps/provider-portal/pages/inbox/index.tsx
//
// UPDATED: Uses ProviderShell for consistent layout
// =============================================================================

import type { NextPage } from 'next';
import { ProviderInbox } from '@/components/inbox/ProviderInbox';
import ProviderShell from '@/components/layout/ProviderShell';

const InboxPage: NextPage = () => {
  return (
    <ProviderShell
      currentPage="inbox"
      contextBadge="Provider Inbox"
      fullWidth
    >
      <div className="flex-1" style={{ height: 'calc(100vh - 112px)' }}>
        <ProviderInbox />
      </div>
    </ProviderShell>
  );
};

export default InboxPage;
