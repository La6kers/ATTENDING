// ============================================================
// Shared Utilities - @attending/shared
// apps/shared/lib/utils.ts
//
// Common utility functions used across all ATTENDING AI apps
// ============================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ============================================================
// STYLING UTILITIES
// ============================================================

/** Merges Tailwind classes with conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// DATE & TIME UTILITIES
// ============================================================

/** Calculate age from date of birth */
export function calculateAge(dateOfBirth: Date | string): number {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/** Format date to readable string */
export function formatDate(
  date: Date | string | null | undefined, 
  format: 'short' | 'long' | 'time' | 'datetime' | 'iso' = 'short'
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '';
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    case 'long':
      return d.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    case 'time':
      return d.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      });
    case 'datetime':
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    case 'iso':
      return d.toISOString();
    default:
      return d.toISOString();
  }
}

/** Get relative time string (e.g., "2 hours ago") */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  
  return formatDate(d, 'short');
}

// ============================================================
// ID GENERATION
// ============================================================

/** Generate unique ID with optional prefix */
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Generate session ID for COMPASS */
export function generateSessionId(): string {
  return `COMPASS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/** Generate message ID */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================
// STRING UTILITIES
// ============================================================

/** Capitalize first letter of string */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** Truncate string with ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/** Alias for truncate - for backward compatibility */
export const truncateText = truncate;

/** Convert snake_case or kebab-case to Title Case */
export function toTitleCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

/** Slugify a string */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================
// FUNCTION UTILITIES
// ============================================================

/** Debounce function */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/** Throttle function */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

// ============================================================
// DATA UTILITIES
// ============================================================

/** Safe JSON parse with fallback */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/** Deep clone an object */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Check if object is empty */
export function isEmptyObject(obj: object): boolean {
  return obj !== null && typeof obj === 'object' && Object.keys(obj).length === 0;
}

/** Format currency */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/** Sleep for specified milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Retry a function with exponential backoff */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; delayMs?: number; backoff?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, backoff = 2 } = options;
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts) {
        await sleep(delayMs * Math.pow(backoff, attempt - 1));
      }
    }
  }
  
  throw lastError;
}

/** Check if value is empty (null, undefined, empty string, empty array, empty object) */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/** Group array by key */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

// ============================================================
// CLINICAL UTILITIES
// ============================================================

/** Format patient name (Last, First) */
export function formatPatientName(firstName: string, lastName: string, middleName?: string): string {
  const middle = middleName ? ` ${middleName.charAt(0)}.` : '';
  return `${lastName}, ${firstName}${middle}`;
}

/** Format MRN with leading zeros */
export function formatMRN(mrn: string | number): string {
  return String(mrn).padStart(8, '0');
}

/** Calculate BMI */
export function calculateBMI(weightLbs: number, heightIn: number): number {
  if (!weightLbs || !heightIn) return 0;
  return Math.round((weightLbs / (heightIn * heightIn)) * 703 * 10) / 10;
}

/** Get BMI category */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

/** Format phone number */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// ============================================================
// URGENCY UTILITIES
// ============================================================

/** Get urgency badge color */
export function getUrgencyColor(level: 'standard' | 'moderate' | 'high' | 'emergency'): string {
  const colors = {
    standard: 'bg-green-100 text-green-800',
    moderate: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    emergency: 'bg-red-100 text-red-800',
  };
  return colors[level] || colors.standard;
}

/** Get status badge color */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-800',
    urgent: 'bg-red-100 text-red-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    in_review: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    follow_up: 'bg-indigo-100 text-indigo-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
