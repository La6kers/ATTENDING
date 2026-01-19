// =============================================================================
// ATTENDING AI - Provider Inbox Page
// apps/provider-portal/pages/inbox/index.tsx
// =============================================================================

import type { NextPage } from 'next';
import { ProviderInbox } from '@/components/inbox/ProviderInbox';

const InboxPage: NextPage = () => {
  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
      <ProviderInbox />
    </div>
  );
};

export default InboxPage;
