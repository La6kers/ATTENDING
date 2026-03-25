# ATTENDING AI - Consolidated Component Library

**Version**: 1.0  
**Last Updated**: January 6, 2026

This document defines the standardized component library used across both portals.

---

## Component Hierarchy

```
@attending/
├── shared/                   # Shared across all apps
│   ├── types/               # TypeScript definitions
│   ├── services/            # Business logic services
│   ├── machines/            # XState machines
│   └── utils/               # Helper functions
│
├── ui/                      # Base UI components
│   ├── Button
│   ├── Card
│   ├── Input
│   ├── Modal
│   ├── Badge
│   └── ...
│
├── clinical/                # Medical-specific components
│   ├── RedFlagAlert
│   ├── UrgencyBadge
│   ├── DiagnosisList
│   ├── MedicationCard
│   └── VitalSigns
│
├── chat/                    # COMPASS chat components
│   ├── ChatContainer
│   ├── MessageBubble
│   ├── QuickReplies
│   ├── ProgressTracker
│   └── ClinicalSummary
│
└── dashboard/               # Dashboard components
    ├── PatientQueue
    ├── StatCards
    ├── AIInsights
    └── RecentAssessments
```

---

## Base UI Components

### Button

```typescript
// apps/shared/components/ui/Button.tsx
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ 
  variant = 'primary', 
  size = 'md',
  loading,
  className,
  children,
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'bg-transparent hover:bg-gray-100'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={cn(
        'rounded-lg font-medium transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={loading}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}
```

### Card

```typescript
// apps/shared/components/ui/Card.tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: boolean;
}

export function Card({ 
  children, 
  className, 
  padding = 'md',
  shadow = true 
}: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-100',
      shadow && 'shadow-sm',
      paddingStyles[padding],
      className
    )}>
      {children}
    </div>
  );
}
```

---

## Clinical Components

### UrgencyBadge

```typescript
// apps/shared/components/clinical/UrgencyBadge.tsx
import { UrgencyLevel } from '@attending/shared/types';

interface UrgencyBadgeProps {
  level: UrgencyLevel;
  showIcon?: boolean;
}

export function UrgencyBadge({ level, showIcon = true }: UrgencyBadgeProps) {
  const config = {
    standard: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      icon: '✓',
      label: 'Standard'
    },
    moderate: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      icon: '⚠',
      label: 'Moderate'
    },
    high: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: '🚨',
      label: 'High Priority'
    }
  };

  const { bg, text, icon, label } = config[level];

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      bg, text
    )}>
      {showIcon && <span>{icon}</span>}
      {label}
    </span>
  );
}
```

### RedFlagAlert

```typescript
// apps/shared/components/clinical/RedFlagAlert.tsx
import { RedFlag } from '@attending/shared/types';

interface RedFlagAlertProps {
  redFlags: RedFlag[];
  onDismiss?: (flagId: string) => void;
  onEmergency?: () => void;
}

export function RedFlagAlert({ redFlags, onDismiss, onEmergency }: RedFlagAlertProps) {
  if (redFlags.length === 0) return null;

  const criticalFlags = redFlags.filter(f => f.severity === 'critical');
  const warningFlags = redFlags.filter(f => f.severity === 'warning');

  return (
    <div className="space-y-2">
      {criticalFlags.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex items-start">
            <span className="text-2xl mr-3">🚨</span>
            <div className="flex-1">
              <h4 className="text-red-800 font-semibold">Critical Symptoms Detected</h4>
              <ul className="mt-2 space-y-1">
                {criticalFlags.map(flag => (
                  <li key={flag.id} className="text-red-700 text-sm">
                    <strong>{flag.name}</strong>: {flag.description}
                    {flag.recommendation && (
                      <p className="text-red-600 text-xs mt-0.5">
                        → {flag.recommendation}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {onEmergency && (
                <button
                  onClick={onEmergency}
                  className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  Activate Emergency Protocol
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {warningFlags.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
          <div className="flex items-start">
            <span className="text-xl mr-3">⚠️</span>
            <div className="flex-1">
              <h4 className="text-yellow-800 font-semibold">Warning Signs</h4>
              <ul className="mt-2 space-y-1">
                {warningFlags.map(flag => (
                  <li key={flag.id} className="text-yellow-700 text-sm">
                    {flag.name}: {flag.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### DiagnosisList

```typescript
// apps/shared/components/clinical/DiagnosisList.tsx
import { Diagnosis } from '@attending/shared/types';

interface DiagnosisListProps {
  diagnoses: Diagnosis[];
  title?: string;
  showProbability?: boolean;
  maxItems?: number;
}

export function DiagnosisList({ 
  diagnoses, 
  title = 'Differential Diagnosis',
  showProbability = true,
  maxItems = 5
}: DiagnosisListProps) {
  const sorted = [...diagnoses]
    .sort((a, b) => b.probability - a.probability)
    .slice(0, maxItems);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      <ul className="space-y-2">
        {sorted.map((dx, index) => (
          <li key={dx.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">{index + 1}.</span>
              <span className="text-gray-900">{dx.name}</span>
              {dx.icd10Code && (
                <span className="text-xs text-gray-400">({dx.icd10Code})</span>
              )}
            </div>
            {showProbability && dx.probability > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${dx.probability * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {Math.round(dx.probability * 100)}%
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
      {diagnoses.length > maxItems && (
        <p className="text-xs text-gray-400 mt-2">
          +{diagnoses.length - maxItems} more
        </p>
      )}
    </div>
  );
}
```

---

## Chat Components (COMPASS)

### ChatContainer

```typescript
// apps/patient-portal/components/chat/ChatContainer.tsx
import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { MessageBubble } from './MessageBubble';
import { QuickReplies } from './QuickReplies';
import { ChatInput } from './ChatInput';
import { ProgressTracker } from './ProgressTracker';

export function ChatContainer() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, currentPhase, isAIProcessing, sendMessage } = useChatStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const lastMessage = messages[messages.length - 1];
  const quickReplies = lastMessage?.metadata?.quickReplies || [];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-50 border-r border-gray-200 p-4">
        <ProgressTracker currentPhase={currentPhase} />
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isAIProcessing && (
            <div className="flex items-center gap-2 text-gray-500">
              <span className="animate-pulse">●</span>
              <span className="text-sm">COMPASS is thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        {quickReplies.length > 0 && !isAIProcessing && (
          <QuickReplies 
            options={quickReplies} 
            onSelect={sendMessage}
          />
        )}

        {/* Input */}
        <ChatInput 
          onSend={sendMessage}
          disabled={isAIProcessing}
          placeholder="Type your response..."
        />
      </main>
    </div>
  );
}
```

### MessageBubble

```typescript
// apps/patient-portal/components/chat/MessageBubble.tsx
import { ChatMessage } from '@attending/shared/types';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'max-w-[70%] rounded-2xl px-4 py-3',
        isUser 
          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-sm'
          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
      )}>
        {/* AI Avatar */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
            <span className="text-lg">🩺</span>
            <span className="text-xs font-medium text-gray-500">COMPASS AI</span>
          </div>
        )}

        {/* Message Content */}
        <div 
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: message.content }}
        />

        {/* AI Thinking (debug) */}
        {!isUser && message.metadata?.aiThinking && (
          <details className="mt-2 text-xs text-gray-400">
            <summary className="cursor-pointer">AI Reasoning</summary>
            <p className="mt-1 italic">{message.metadata.aiThinking}</p>
          </details>
        )}

        {/* Timestamp */}
        <div className={cn(
          'text-xs mt-2',
          isUser ? 'text-indigo-200' : 'text-gray-400'
        )}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
```

### QuickReplies

```typescript
// apps/patient-portal/components/chat/QuickReplies.tsx
interface QuickRepliesProps {
  options: string[];
  onSelect: (option: string) => void;
}

export function QuickReplies({ options, onSelect }: QuickRepliesProps) {
  return (
    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
      <p className="text-xs text-gray-500 mb-2">Quick responses:</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => onSelect(option)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### ProgressTracker

```typescript
// apps/patient-portal/components/chat/ProgressTracker.tsx
import { AssessmentPhase } from '@attending/shared/types';
import { cn } from '@/lib/utils';

interface ProgressTrackerProps {
  currentPhase: AssessmentPhase;
}

const PHASES: { id: AssessmentPhase; label: string; icon: string }[] = [
  { id: 'chief-complaint', label: 'Chief Complaint', icon: '💬' },
  { id: 'hpi-development', label: 'History of Present Illness', icon: '📋' },
  { id: 'review-of-systems', label: 'Review of Systems', icon: '🔍' },
  { id: 'medical-history', label: 'Medical History', icon: '📚' },
  { id: 'risk-stratification', label: 'Risk Assessment', icon: '⚖️' },
  { id: 'clinical-summary', label: 'Summary', icon: '✅' }
];

export function ProgressTracker({ currentPhase }: ProgressTrackerProps) {
  const currentIndex = PHASES.findIndex(p => p.id === currentPhase);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Assessment Progress</h3>
      <div className="space-y-3">
        {PHASES.map((phase, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={phase.id} className="flex items-center gap-3">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors',
                isCompleted && 'bg-green-100 text-green-600',
                isCurrent && 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500 ring-offset-2',
                isPending && 'bg-gray-100 text-gray-400'
              )}>
                {isCompleted ? '✓' : phase.icon}
              </div>
              <span className={cn(
                'text-sm',
                isCompleted && 'text-green-600',
                isCurrent && 'text-indigo-600 font-medium',
                isPending && 'text-gray-400'
              )}>
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{Math.round((currentIndex / (PHASES.length - 1)) * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
            style={{ width: `${(currentIndex / (PHASES.length - 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## Dashboard Components

### PatientQueue

```typescript
// apps/provider-portal/components/dashboard/PatientQueue.tsx
import { PatientAssessment, UrgencyLevel } from '@attending/shared/types';
import { UrgencyBadge } from '@attending/shared/components/clinical/UrgencyBadge';
import { formatDistanceToNow } from 'date-fns';

interface PatientQueueProps {
  assessments: PatientAssessment[];
  onSelectPatient: (id: string) => void;
  selectedId?: string;
}

export function PatientQueue({ assessments, onSelectPatient, selectedId }: PatientQueueProps) {
  // Sort by urgency then time
  const sorted = [...assessments].sort((a, b) => {
    const urgencyOrder: Record<UrgencyLevel, number> = { high: 0, moderate: 1, standard: 2 };
    const urgencyDiff = urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
    if (urgencyDiff !== 0) return urgencyDiff;
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Patient Queue</h3>
        <p className="text-sm text-gray-500">{assessments.length} waiting</p>
      </div>

      <div className="divide-y divide-gray-50">
        {sorted.map(assessment => (
          <button
            key={assessment.id}
            onClick={() => onSelectPatient(assessment.id)}
            className={cn(
              'w-full p-4 text-left hover:bg-gray-50 transition-colors',
              selectedId === assessment.id && 'bg-indigo-50'
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{assessment.patientName}</p>
                <p className="text-sm text-gray-500 truncate max-w-[200px]">
                  {assessment.chiefComplaint}
                </p>
              </div>
              <UrgencyBadge level={assessment.urgencyLevel} />
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span>{assessment.patientAge}y {assessment.patientGender}</span>
              <span>{formatDistanceToNow(new Date(assessment.submittedAt))} ago</span>
            </div>
            {assessment.redFlags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {assessment.redFlags.slice(0, 2).map((flag, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs">
                    {flag}
                  </span>
                ))}
                {assessment.redFlags.length > 2 && (
                  <span className="text-xs text-red-500">+{assessment.redFlags.length - 2}</span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Utility Functions

### cn (Class Name Merger)

```typescript
// apps/shared/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### formatClinicalDate

```typescript
// apps/shared/lib/clinical-utils.ts
export function formatClinicalDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDuration(startDate: string, endDate?: string): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}
```

---

## Usage Examples

### Provider Dashboard Page

```typescript
// apps/provider-portal/pages/index.tsx
import { useAssessmentQueue } from '@/hooks/useAssessmentQueue';
import { PatientQueue } from '@/components/dashboard/PatientQueue';
import { StatCards } from '@/components/dashboard/StatCards';
import { AIInsights } from '@/components/dashboard/AIInsights';

export default function ProviderDashboard() {
  const { assessments, loading, selectedId, selectPatient } = useAssessmentQueue();

  return (
    <div className="grid grid-cols-12 gap-6 p-6">
      {/* Stats Row */}
      <div className="col-span-12">
        <StatCards assessments={assessments} />
      </div>

      {/* Main Content */}
      <div className="col-span-4">
        <PatientQueue 
          assessments={assessments}
          onSelectPatient={selectPatient}
          selectedId={selectedId}
        />
      </div>

      <div className="col-span-8">
        {selectedId ? (
          <PatientDetail assessmentId={selectedId} />
        ) : (
          <EmptyState message="Select a patient to view details" />
        )}
      </div>
    </div>
  );
}
```

### Patient Chat Page

```typescript
// apps/patient-portal/pages/chat.tsx
import { useEffect } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { EmergencyBanner } from '@/components/chat/EmergencyBanner';

export default function CompassChat() {
  const { startNewSession, urgencyLevel, redFlags } = useChatStore();

  useEffect(() => {
    startNewSession('demo-patient-001');
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {urgencyLevel === 'high' && (
        <EmergencyBanner redFlags={redFlags} />
      )}
      <ChatContainer />
    </div>
  );
}
```

---

*Component library maintained by ATTENDING AI development team*
