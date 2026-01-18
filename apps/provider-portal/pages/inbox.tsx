// =============================================================================
// ATTENDING AI - Provider Inbox Page
// apps/provider-portal/pages/inbox.tsx
// =============================================================================

import { ProviderInbox } from '../components/inbox';

export default function InboxPage() {
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
}
