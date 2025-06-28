/**
 * API-related types for the provider portal
 */

// Base API response structure
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: Date;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;
  errors: ApiError[];
  message: string;
  timestamp: Date;
  requestId?: string;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Search and filter types
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  pagination?: PaginationParams;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface SearchResponse<T> extends PaginatedResponse<T> {
  searchQuery: string;
  filters: Record<string, FilterOption[]>;
  suggestions?: string[];
  totalResults: number;
}

// Request types
export interface CreateRequest<T> {
  data: T;
  options?: {
    validateOnly?: boolean;
    dryRun?: boolean;
  };
}

export interface UpdateRequest<T> {
  id: string;
  data: Partial<T>;
  options?: {
    validateOnly?: boolean;
    merge?: boolean;
  };
}

export interface BulkRequest<T> {
  operations: Array<{
    operation: 'create' | 'update' | 'delete';
    id?: string;
    data?: T;
  }>;
  options?: {
    continueOnError?: boolean;
    validateOnly?: boolean;
  };
}

export interface BulkResponse<T> {
  results: Array<{
    operation: 'create' | 'update' | 'delete';
    id?: string;
    success: boolean;
    data?: T;
    error?: ApiError;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Authentication and authorization
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: 'Bearer';
  scope: string[];
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  facilities: string[];
  lastActivity: Date;
  sessionId: string;
}

export interface AuthResponse extends ApiResponse<UserSession> {
  token: AuthToken;
}

// File upload types
export interface FileUploadRequest {
  file: File;
  metadata?: Record<string, any>;
  options?: {
    encrypt?: boolean;
    compress?: boolean;
    generateThumbnail?: boolean;
  };
}

export interface FileUploadResponse extends ApiResponse<{
  fileId: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
}> {
  uploadId: string;
}

// WebSocket types
export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: Date;
  messageId: string;
  userId?: string;
  sessionId?: string;
}

export interface WebSocketResponse<T = any> extends WebSocketMessage<T> {
  success: boolean;
  error?: ApiError;
}

// Rate limiting and throttling
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface ThrottledResponse<T> extends ApiResponse<T> {
  rateLimit: RateLimitInfo;
}

// Caching types
export interface CacheInfo {
  key: string;
  ttl: number;
  createdAt: Date;
  lastAccessed: Date;
  hitCount: number;
}

export interface CachedResponse<T> extends ApiResponse<T> {
  cache: CacheInfo;
  fromCache: boolean;
}

// Health check and monitoring
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: Date;
  services: {
    database: 'up' | 'down' | 'degraded';
    cache: 'up' | 'down' | 'degraded';
    external: 'up' | 'down' | 'degraded';
  };
  metrics?: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
}

// Audit and logging
export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  result: 'success' | 'failure' | 'partial';
}

export interface AuditLogResponse extends PaginatedResponse<AuditLogEntry> {
  filters: {
    users: FilterOption[];
    actions: FilterOption[];
    resources: FilterOption[];
    dateRange: {
      start: Date;
      end: Date;
    };
  };
}

// Configuration and settings
export interface ApiConfiguration {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  headers: Record<string, string>;
  interceptors?: {
    request?: Array<(config: any) => any>;
    response?: Array<(response: any) => any>;
    error?: Array<(error: any) => any>;
  };
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ConfigurationResponse extends ApiResponse<{
  features: FeatureFlag[];
  settings: Record<string, any>;
  version: string;
}> {
  environment: 'development' | 'staging' | 'production';
}

// Notification types
export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  categories: {
    medication: boolean;
    appointment: boolean;
    lab: boolean;
    emergency: boolean;
    system: boolean;
  };
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'medication' | 'appointment' | 'lab' | 'emergency' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
  actions?: Array<{
    label: string;
    action: string;
    style: 'primary' | 'secondary' | 'danger';
  }>;
}

export interface NotificationResponse extends PaginatedResponse<Notification> {
  unreadCount: number;
  categories: Record<string, number>;
}

// Export and import types
export interface ExportRequest {
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  filters?: Record<string, any>;
  fields?: string[];
  options?: {
    includeHeaders?: boolean;
    dateFormat?: string;
    timezone?: string;
  };
}

export interface ExportResponse extends ApiResponse<{
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
}> {
  estimatedCompletionTime?: Date;
}

export interface ImportRequest {
  file: File;
  format: 'csv' | 'xlsx' | 'json';
  mapping?: Record<string, string>;
  options?: {
    skipHeaders?: boolean;
    validateOnly?: boolean;
    continueOnError?: boolean;
  };
}

export interface ImportResponse extends ApiResponse<{
  importId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  summary?: {
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
    warnings: number;
  };
}> {
  errors?: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

// Analytics and reporting
export interface AnalyticsQuery {
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  dateRange: {
    start: Date;
    end: Date;
  };
  granularity?: 'hour' | 'day' | 'week' | 'month';
  limit?: number;
}

export interface AnalyticsResponse extends ApiResponse<{
  data: Array<Record<string, any>>;
  summary: Record<string, number>;
  metadata: {
    query: AnalyticsQuery;
    executionTime: number;
    dataPoints: number;
  };
}> {
  visualization?: {
    type: 'line' | 'bar' | 'pie' | 'table';
    config: Record<string, any>;
  };
}

// Generic utility types for API operations
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiEndpoint {
  method: ApiMethod;
  path: string;
  params?: Record<string, any>;
  query?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
}

export interface ApiRequestConfig extends ApiEndpoint {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTtl?: number;
  validateResponse?: boolean;
}

// Type guards and utilities
export const isApiError = (response: any): response is ApiErrorResponse => {
  return response && !response.success && Array.isArray(response.errors);
};

export const isApiSuccess = <T>(response: any): response is ApiResponse<T> => {
  return response && response.success === true;
};

export const isPaginatedResponse = <T>(response: any): response is PaginatedResponse<T> => {
  return isApiSuccess(response) && 'pagination' in response && response.pagination !== undefined;
};
