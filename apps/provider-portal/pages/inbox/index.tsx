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
      <div className="px-4 pt-3 pb-3" style={{ height: 'calc(100vh - 100px)' }}>
        <ProviderInbox />
      </div>
    </ProviderShell>
  );
};

export default InboxPage;
