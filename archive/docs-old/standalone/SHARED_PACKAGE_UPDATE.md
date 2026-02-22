# Shared Package Implementation - January 2026

## Summary

The `@attending/shared` package has been significantly expanded to reduce code duplication across the Provider Portal and Patient Portal (COMPASS). This document outlines the changes made and how to use the new shared utilities.

---

## New Shared Utilities

### 1. `@attending/shared/lib/utils`

Common utility functions for use across all applications.

```typescript
import { 
  cn,                   // Tailwind class merging
  calculateAge,         // Age from DOB
  formatDate,           // Date formatting
  getRelativeTime,      // "2 hours ago"
  generateId,           // Unique IDs
  generateSessionId,    // COMPASS session IDs
  generateMessageId,    // Chat message IDs
  capitalize,           // String capitalization
  truncate,             // String truncation
  debounce,             // Function debouncing
  throttle,             // Function throttling
  safeJsonParse,        // Safe JSON parsing
  deepClone,            // Deep object cloning
  isEmpty,              // Empty value checking
  groupBy,              // Array grouping
  formatPatientName,    // "Last, First M."
  formatMRN,            // MRN padding
  calculateBMI,         // BMI calculation
  getBMICategory,       // BMI interpretation
  formatPhone,          // Phone formatting
  getUrgencyColor,      // Urgency badge colors
  getStatusColor,       // Status badge colors
} from '@attending/shared/lib/utils';
```

### 2. `@attending/shared/hooks`

Shared React hooks for common functionality.

```typescript
// WebSocket connection management
import { useWebSocket, WebSocketConfig } from '@attending/shared/hooks';

const { isConnected, emit, on, disconnect } = useWebSocket({
  role: 'provider',
  userId: 'dr-smith',
  userName: 'Dr. Smith',
});

// Local storage persistence
import { useLocalStorage } from '@attending/shared/hooks';

const [theme, setTheme] = useLocalStorage('theme', 'light');

// Value debouncing
import { useDebounce } from '@attending/shared/hooks';

const debouncedSearch = useDebounce(searchTerm, 300);

// Browser notifications
import { useNotifications } from '@attending/shared/hooks';

const { permission, requestPermission, showNotification } = useNotifications();
```

### 3. `@attending/shared/stores`

Store utilities and factories.

```typescript
// Create stores with Immer + DevTools
import { createStore, StoreConfig } from '@attending/shared/stores';

interface CounterState {
  count: number;
  increment: () => void;
}

const useCounter = createStore<CounterState>(
  (set) => ({
    count: 0,
    increment: () => set(state => { state.count += 1 }),
  }),
  { name: 'counter', persist: true }
);

// API helpers
import { apiFetch, apiPost, apiPatch, apiDelete } from '@attending/shared/stores';

const { data, error } = await apiFetch<Assessment[]>('/api/assessments');
const result = await apiPost('/api/assessments', newAssessment);
```

### 4. `@attending/shared/components/ui`

Shared UI components with consistent styling.

```typescript
import {
  Button,           // Primary, secondary, outline, ghost, danger variants
  Card,             // Card container
  CardHeader,       // Card header with title/actions
  CardContent,      // Card body
  CardFooter,       // Card footer
  Badge,            // Status indicators
  UrgencyBadge,     // standard/moderate/high/emergency
  StatusBadge,      // pending/in_review/completed/etc
  Input,            // Text input with labels/errors
  Textarea,         // Multiline input
  Spinner,          // Loading spinner
  LoadingOverlay,   // Overlay with spinner
  PageLoader,       // Full-page loading
} from '@attending/shared/components/ui';
```

---

## Migration Guide

### Updating Imports

Replace local imports with shared package imports:

```typescript
// BEFORE (provider-portal)
import { cn } from '@/lib/utils';

// AFTER
import { cn } from '@attending/shared/lib/utils';
// OR (backward compatible)
import { cn } from '@/lib/utils';  // Re-exports from shared
```

### Using New Hooks

Replace custom WebSocket code with the shared hook:

```typescript
// BEFORE
import { connectWebSocket, disconnectWebSocket } from '@/lib/websocket';

useEffect(() => {
  connectWebSocket(userId, userName);
  return () => disconnectWebSocket();
}, []);

// AFTER
import { useWebSocket } from '@attending/shared/hooks';

const { isConnected, emit, on } = useWebSocket({
  role: 'provider',
  userId,
  userName,
});

useEffect(() => {
  const unsubscribe = on('assessment:new', handleNewAssessment);
  return unsubscribe;
}, []);
```

### Using Shared Components

```typescript
// BEFORE
<button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
  Submit
</button>

// AFTER
import { Button } from '@attending/shared/components/ui';

<Button variant="primary" loading={isSubmitting}>
  Submit
</Button>
```

---

## File Structure

```
apps/shared/
├── index.ts                 # Main entry point
├── package.json             # Updated with new exports
├── components/
│   └── ui/
│       ├── index.ts         # UI exports
│       ├── Button.tsx       # Button component
│       ├── Card.tsx         # Card components
│       ├── Badge.tsx        # Badge components
│       ├── Input.tsx        # Input/Textarea components
│       └── Spinner.tsx      # Loading components
├── hooks/
│   ├── index.ts             # Hook exports
│   ├── useWebSocket.ts      # WebSocket hook
│   ├── useLocalStorage.ts   # Local storage hook
│   ├── useDebounce.ts       # Debounce hook
│   └── useNotifications.ts  # Browser notifications
├── lib/
│   ├── prisma.ts            # Prisma client (existing)
│   └── utils.ts             # Utility functions (NEW)
├── stores/
│   ├── index.ts             # Store exports
│   └── createStore.ts       # Store factory + API helpers
├── types/
│   └── index.ts             # Shared types (existing)
├── services/
│   └── index.ts             # Shared services (existing)
└── machines/
    └── index.ts             # XState machines (existing)
```

---

## Package Exports

The `@attending/shared` package now exports:

| Import Path | Contents |
|-------------|----------|
| `@attending/shared` | All types, services, machines, utilities |
| `@attending/shared/types` | TypeScript type definitions |
| `@attending/shared/services` | Service classes |
| `@attending/shared/machines` | XState machines |
| `@attending/shared/lib/prisma` | Prisma client |
| `@attending/shared/lib/utils` | Utility functions |
| `@attending/shared/hooks` | React hooks |
| `@attending/shared/stores` | Store utilities |
| `@attending/shared/components/ui` | UI components |

---

## Next Steps

1. **Install dependencies** - Run `npm install` from repo root
2. **Verify builds** - Run `npm run build` to check TypeScript compilation
3. **Gradual migration** - Update imports incrementally, testing as you go
4. **Remove duplicates** - Once verified, remove duplicate code from portals

---

## Questions?

Refer to the component files for detailed JSDoc documentation and usage examples.
