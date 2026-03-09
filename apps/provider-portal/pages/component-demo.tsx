// ============================================================
// Component Demo Page - Provider Portal
// apps/provider-portal/pages/component-demo.tsx
//
// Interactive demo of all enhanced UI components
// ============================================================

import React, { useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';

// Import from shared components
import {
  Button,
  QuickActionButton,
  FloatingActionButton,
  StatusToggle,
  Badge,
  UrgencyBadge,
  TriageBadge,
  StatusBadge,
  NotificationBadge,
  ProviderBadge,
  SecurityBadge,
  AvatarStack,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  FindingCard,
  DiagnosisCard,
  type StatusValue,
  type FindingStatus,
} from '../../shared/components/ui';

import {
  Header,
  PatientBanner,
  QuickActionsBar,
  ClinicalAlertBanner,
  type QuickAction,
} from '../../shared/components/layout';

// Icons for demo
const BeakerIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const CameraIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const MicIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

export default function ComponentDemoPage() {
  // State for demos — hooks must be called unconditionally (Rules of Hooks)
  const [activeAction, setActiveAction] = useState('labs');
  const [statusValue, setStatusValue] = useState<StatusValue>('unknown');
  const [isRecording, setIsRecording] = useState(false);
  const [showAlert, setShowAlert] = useState(true);

  const [findings, setFindings] = useState<Array<{ name: string; status: FindingStatus; isRedFlag?: boolean }>>([
    { name: 'Photophobia', status: 'present', isRedFlag: false },
    { name: 'Nausea/Vomiting', status: 'present', isRedFlag: false },
    { name: 'Neck Stiffness', status: 'unknown', isRedFlag: true },
    { name: 'Fever', status: 'absent', isRedFlag: true },
  ]);


  const quickActions: QuickAction[] = [
    { id: 'labs', label: 'Order Labs', icon: <BeakerIcon />, onClick: () => setActiveAction('labs'), active: activeAction === 'labs' },
    { id: 'imaging', label: 'Order Imaging', icon: <CameraIcon />, onClick: () => setActiveAction('imaging'), active: activeAction === 'imaging' },
    { id: 'referral', label: 'Refer Specialist', icon: <UsersIcon />, onClick: () => setActiveAction('referral'), active: activeAction === 'referral' },
    { id: 'followup', label: 'Schedule Follow-up', icon: <CalendarIcon />, onClick: () => setActiveAction('followup'), active: activeAction === 'followup' },
  ];

  const teamViewers = [
    { id: '1', name: 'Dr. Johnson', initials: 'DJ', color: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    { id: '2', name: 'Nurse Smith', initials: 'NS', color: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
  ];

  const updateFinding = (idx: number, status: FindingStatus) => {
    const updated = [...findings];
    updated[idx].status = status;
    setFindings(updated);
  };

  return (
    <>
      <Head>
        <title>Component Demo - ATTENDING AI</title>
      </Head>

      <div className="min-h-screen bg-brand-gradient">
        {/* Header */}
        <Header
          portalType="provider"
          notificationCount={5}
          teamViewers={teamViewers}
          userName="Dr. Smith"
          onNotificationClick={() => alert('Notifications clicked!')}
          onUserClick={() => alert('User menu clicked!')}
        />

        {/* Clinical Alert */}
        {showAlert && (
          <ClinicalAlertBanner
            type="warning"
            title="Red Flag Detected"
            message="Patient reports neck stiffness with severe headache - consider meningitis workup"
            onDismiss={() => setShowAlert(false)}
            actions={
              <Button variant="outline" size="sm" className="bg-white/20 border-white/50 text-yellow-900">
                View Protocol
              </Button>
            }
          />
        )}

        {/* Patient Banner */}
        <PatientBanner
          patient={{
            name: 'Sarah Johnson',
            mrn: '12345678',
            dob: '03/15/1985',
            age: '38F',
          }}
          vitals={{
            bp: '142/88 ↑',
            hr: '92 ↑',
            temp: '98.6°F',
            rr: '16',
            spo2: '98%',
          }}
          chiefComplaint="Severe headache × 3 days"
          urgency="moderate"
          waitTime="12 min"
        />

        {/* Quick Actions Bar */}
        <QuickActionsBar actions={quickActions} />

        {/* Main Content */}
        <main className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Button Variants Card */}
            <Card variant="glass">
              <CardHeader title="Button Variants" subtitle="Enhanced buttons with gradients and hover effects" />
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="danger">Danger</Button>
                    <Button variant="success">Success</Button>
                    <Button variant="warning">Warning</Button>
                    <Button variant="stat">STAT</Button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary" leftIcon={<PlusIcon />}>Add Order</Button>
                    <Button variant="primary" loading>Loading...</Button>
                    <Button variant="emergency">Emergency Protocol</Button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button size="sm">Small</Button>
                    <Button size="md">Medium</Button>
                    <Button size="lg">Large</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Badge Variants Card */}
            <Card variant="glass">
              <CardHeader title="Badge Variants" subtitle="Clinical status and urgency indicators" />
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Standard Badges</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="default">Default</Badge>
                      <Badge variant="primary">Primary</Badge>
                      <Badge variant="primary">Primary</Badge>
                      <Badge variant="success">Success</Badge>
                      <Badge variant="warning">Warning</Badge>
                      <Badge variant="danger">Danger</Badge>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Urgency Badges</h4>
                    <div className="flex flex-wrap gap-2">
                      <UrgencyBadge urgency="low" />
                      <UrgencyBadge urgency="moderate" />
                      <UrgencyBadge urgency="high" />
                      <UrgencyBadge urgency="critical" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Triage Levels (ESI)</h4>
                    <div className="flex flex-wrap gap-2">
                      <TriageBadge level={1} showLabel={false} />
                      <TriageBadge level={2} showLabel={false} />
                      <TriageBadge level={3} showLabel={false} />
                      <TriageBadge level={4} showLabel={false} />
                      <TriageBadge level={5} showLabel={false} />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Status Badges</h4>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status="pending" />
                      <StatusBadge status="active" />
                      <StatusBadge status="completed" />
                      <StatusBadge status="cancelled" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Toggle Card */}
            <Card variant="glass">
              <CardHeader title="Status Toggle" subtitle="Clinical finding confirmation pattern (✓/✗/?)" />
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm font-medium">Finding Status:</span>
                    <StatusToggle value={statusValue} onChange={setStatusValue} />
                  </div>
                  <div className="text-sm text-gray-600">
                    Current value: <code className="px-2 py-1 bg-gray-100 rounded">{statusValue}</code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card Urgency Variants */}
            <Card variant="glass">
              <CardHeader title="Card Urgency Borders" subtitle="Visual priority indicators" />
              <CardContent>
                <div className="space-y-3">
                  <Card urgency="routine" className="p-4">
                    <span className="text-sm font-medium">Routine Priority</span>
                  </Card>
                  <Card urgency="moderate" className="p-4">
                    <span className="text-sm font-medium">Moderate Priority</span>
                  </Card>
                  <Card urgency="urgent" className="p-4">
                    <span className="text-sm font-medium">Urgent Priority</span>
                  </Card>
                  <Card urgency="critical" className="p-4 animate-pulse-urgent">
                    <span className="text-sm font-medium">Critical Priority (Pulsing)</span>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Clinical Findings Card */}
            <Card variant="glass" className="lg:col-span-2">
              <CardHeader 
                title="Clinical Findings Demo" 
                subtitle="Interactive finding status with red flag detection"
                actions={<Badge variant="primary">Migraine Workup</Badge>}
              />
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {findings.map((finding, idx) => (
                    <FindingCard
                      key={idx}
                      finding={finding.name}
                      status={finding.status}
                      isRedFlag={finding.isRedFlag}
                      onStatusChange={(status) => updateFinding(idx, status)}
                    />
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm">Add Finding</Button>
                <Button variant="primary" size="sm">Save Changes</Button>
              </CardFooter>
            </Card>

            {/* Diagnosis Card Demo */}
            <Card variant="glass" className="lg:col-span-2">
              <CardHeader title="Differential Diagnosis Card" subtitle="Collapsible diagnosis with confidence scoring" />
              <CardContent>
                <div className="space-y-4">
                  <DiagnosisCard
                    name="Migraine with Aura"
                    confidence={85}
                    rank={1}
                    findings={findings}
                    onFindingStatusChange={updateFinding}
                  />
                  <DiagnosisCard
                    name="Tension-Type Headache"
                    confidence={62}
                    rank={2}
                    findings={[
                      { name: 'Bilateral location', status: 'present' },
                      { name: 'Pressing quality', status: 'unknown' },
                    ]}
                    collapsed
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Action Buttons */}
            <Card variant="glass">
              <CardHeader title="Quick Action Buttons" subtitle="Standalone action buttons with icons" />
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <QuickActionButton icon={<BeakerIcon />} label="Order Labs" active />
                  <QuickActionButton icon={<CameraIcon />} label="Order Imaging" />
                  <QuickActionButton icon={<UsersIcon />} label="Refer Specialist" />
                  <QuickActionButton icon={<CalendarIcon />} label="Follow-up" />
                </div>
              </CardContent>
            </Card>

            {/* Header Components */}
            <Card variant="glass">
              <CardHeader title="Header Components" subtitle="Portal badges, security, avatars" />
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <ProviderBadge role="physician" name="Dr. Smith" />
                    <ProviderBadge role="nurse" name="RN Williams" />
                    <ProviderBadge role="resident" />
                  </div>
                  <div>
                    <SecurityBadge type="hipaa" />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Team viewing:</span>
                    <AvatarStack avatars={teamViewers} />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Notification badge:</span>
                    <div className="relative w-10 h-10 bg-teal-100 rounded-full">
                      <NotificationBadge count={7} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </main>

        {/* Floating Action Button */}
        <FloatingActionButton
          icon={<MicIcon />}
          pulsing={isRecording}
          onClick={() => setIsRecording(!isRecording)}
        />
      </div>
    </>
  );
}

// Block this page entirely in production at the server level
export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === 'production') {
    return { notFound: true };
  }
  return { props: {} };
};
