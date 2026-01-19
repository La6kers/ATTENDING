// =============================================================================
// ATTENDING AI - Clinical Components
// =============================================================================
// Domain-specific clinical components used across Provider and Patient portals.
// These components consolidate patterns from HTML prototypes.
// =============================================================================

import React, { useState } from 'react';

// =============================================================================
// UTILITY FUNCTION (local to avoid circular deps)
// =============================================================================

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// =============================================================================
// TYPES
// =============================================================================

export type OrderPriority = 'STAT' | 'URGENT' | 'ASAP' | 'ROUTINE';
export type RecommendationCategory = 'critical' | 'recommended' | 'consider' | 'not-indicated' | 'avoid';

export interface PatientInfo {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  mrn: string;
  allergies?: string[];
  primaryPhysician?: string;
  insurancePlan?: string;
}

export interface PatientVitals {
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  bmi?: number;
  painLevel?: number;
}

export interface OrderItem {
  id: string;
  name: string;
  code?: string;
  category?: string;
  priority?: OrderPriority;
  indication?: string;
  aiRecommended?: boolean;
  aiConfidence?: number;
  aiRationale?: string;
  status?: 'pending' | 'ordered' | 'completed' | 'cancelled';
}

export interface AIRecommendation {
  id: string;
  name: string;
  code?: string;
  category: RecommendationCategory;
  confidence: number;
  rationale: string;
  evidenceLevel?: 'A' | 'B' | 'C';
  sources?: string[];
}

export interface ClinicalFinding {
  id: string;
  text: string;
  status: 'present' | 'absent' | 'unknown';
  severity?: 'low' | 'moderate' | 'high' | 'critical';
  source?: string;
  timestamp?: string;
  rationale?: string;
}

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

export const PRIORITY_CONFIG: Record<OrderPriority, {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
}> = {
  STAT: {
    label: 'STAT',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    dotColor: 'bg-red-500',
  },
  URGENT: {
    label: 'Urgent',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    dotColor: 'bg-orange-500',
  },
  ASAP: {
    label: 'ASAP',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    dotColor: 'bg-yellow-500',
  },
  ROUTINE: {
    label: 'Routine',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    dotColor: 'bg-gray-400',
  },
};

export const RECOMMENDATION_CONFIG: Record<RecommendationCategory, {
  title: string;
  description: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
}> = {
  critical: {
    title: 'Critical - Order Immediately',
    description: 'Essential based on red flag symptoms',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
  },
  recommended: {
    title: 'Strongly Recommended',
    description: 'High clinical value based on presentation',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
  },
  consider: {
    title: 'Consider Ordering',
    description: 'May provide additional clinical insight',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-600',
  },
  'not-indicated': {
    title: 'Not Indicated',
    description: 'Not clinically indicated for this presentation',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-500',
  },
  avoid: {
    title: 'Avoid',
    description: 'May cause harm or is contraindicated',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    iconColor: 'text-red-700',
  },
};

// =============================================================================
// PATIENT BANNER COMPONENT
// =============================================================================

export interface PatientBannerProps {
  patient: PatientInfo;
  vitals?: PatientVitals;
  chiefComplaint?: string;
  urgency?: 'routine' | 'urgent' | 'critical';
  showAllergies?: boolean;
  showVitals?: boolean;
  onViewFullChart?: () => void;
  className?: string;
}

export const PatientBanner: React.FC<PatientBannerProps> = ({
  patient,
  vitals,
  chiefComplaint,
  urgency = 'routine',
  showAllergies = true,
  showVitals = true,
  onViewFullChart,
  className,
}) => {
  const initials = `${patient.firstName[0]}${patient.lastName[0]}`;
  
  const urgencyColors = {
    routine: 'border-green-500',
    urgent: 'border-amber-500',
    critical: 'border-red-500',
  };
  
  return (
    <div className={cn(
      'bg-white rounded-2xl shadow-md p-5 border-l-4',
      urgencyColors[urgency],
      urgency === 'critical' && 'animate-pulse',
      className
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* Patient Identity */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 
                          flex items-center justify-content text-white font-bold text-xl shadow-lg">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {patient.lastName}, {patient.firstName}
            </h2>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
              <span>{patient.age}yo {patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'O'}</span>
              <span>•</span>
              <span>DOB: {patient.dateOfBirth}</span>
              <span>•</span>
              <span className="font-mono">MRN: {patient.mrn}</span>
            </div>
            {chiefComplaint && (
              <div className="mt-2">
                <span className="text-sm font-medium text-gray-700">CC: </span>
                <span className="text-sm text-gray-900">{chiefComplaint}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Info */}
        <div className="flex items-start gap-6">
          {/* Vitals Summary */}
          {showVitals && vitals && (
            <div className="flex gap-4">
              {vitals.bloodPressure && (
                <VitalDisplay label="BP" value={vitals.bloodPressure} unit="mmHg" />
              )}
              {vitals.heartRate && (
                <VitalDisplay label="HR" value={vitals.heartRate.toString()} unit="bpm" />
              )}
              {vitals.oxygenSaturation && (
                <VitalDisplay 
                  label="SpO2" 
                  value={`${vitals.oxygenSaturation}%`} 
                  status={vitals.oxygenSaturation < 94 ? 'warning' : 'normal'}
                />
              )}
            </div>
          )}
          
          {/* Allergies */}
          {showAllergies && patient.allergies && patient.allergies.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-red-500">⚠️</span>
              <div className="flex gap-1 flex-wrap">
                {patient.allergies.map((allergy, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                    {allergy}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* View Chart Button */}
          {onViewFullChart && (
            <button
              onClick={onViewFullChart}
              className="px-3 py-1.5 text-sm font-medium text-purple-600 border-2 border-purple-200 
                         rounded-lg hover:bg-purple-50 transition-colors"
            >
              View Full Chart
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Vital Display Sub-component
const VitalDisplay: React.FC<{
  label: string;
  value: string;
  unit?: string;
  status?: 'normal' | 'warning' | 'critical';
}> = ({ label, value, unit, status = 'normal' }) => {
  const statusColors = {
    normal: 'text-gray-900',
    warning: 'text-amber-600',
    critical: 'text-red-600 font-bold',
  };
  
  return (
    <div className="text-center">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={cn('text-lg font-semibold', statusColors[status])}>
        {value}
        {unit && <span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span>}
      </div>
    </div>
  );
};

// =============================================================================
// PRIORITY BADGE COMPONENT
// =============================================================================

export interface PriorityBadgeProps {
  priority: OrderPriority;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'md',
  showDot = true,
  className,
}) => {
  const config = PRIORITY_CONFIG[priority];
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-semibold rounded-md border',
      config.bgColor,
      config.textColor,
      config.borderColor,
      sizeClasses[size],
      className
    )}>
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />}
      {config.label}
    </span>
  );
};

// =============================================================================
// AI BADGE COMPONENT
// =============================================================================

export interface AIBadgeProps {
  confidence?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export const AIBadge: React.FC<AIBadgeProps> = ({
  confidence,
  size = 'sm',
  className,
}) => {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 bg-gradient-to-r from-purple-100 to-indigo-100',
      'text-purple-700 rounded-full font-medium',
      sizeClasses,
      className
    )}>
      ⭐ AI{confidence !== undefined && ` ${Math.round(confidence * 100)}%`}
    </span>
  );
};

// =============================================================================
// ORDER CARD COMPONENT
// =============================================================================

export interface OrderCardProps {
  order: OrderItem;
  selected?: boolean;
  onSelect?: (order: OrderItem) => void;
  onRemove?: (order: OrderItem) => void;
  showAIBadge?: boolean;
  showPriority?: boolean;
  showCode?: boolean;
  className?: string;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  selected = false,
  onSelect,
  onRemove,
  showAIBadge = true,
  showPriority = true,
  showCode = true,
  className,
}) => {
  return (
    <div
      onClick={() => onSelect?.(order)}
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-4 transition-all duration-200',
        'hover:shadow-md hover:border-purple-200',
        selected && 'ring-2 ring-purple-500 border-purple-300',
        onSelect && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900">{order.name}</h4>
            {showCode && order.code && (
              <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {order.code}
              </span>
            )}
            {showAIBadge && order.aiRecommended && (
              <AIBadge confidence={order.aiConfidence} />
            )}
          </div>
          
          {order.category && (
            <div className="text-sm text-gray-500 mt-1">{order.category}</div>
          )}
          
          {order.indication && (
            <div className="text-sm text-gray-600 mt-2">
              <span className="font-medium">Indication:</span> {order.indication}
            </div>
          )}
          
          {order.aiRationale && (
            <div className="mt-2 p-2 bg-purple-50 rounded-lg border-l-3 border-purple-400">
              <p className="text-sm text-purple-800">{order.aiRationale}</p>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {showPriority && order.priority && (
            <PriorityBadge priority={order.priority} size="sm" />
          )}
          
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(order);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// AI RECOMMENDATIONS PANEL
// =============================================================================

export interface AIRecommendationsPanelProps {
  recommendations: AIRecommendation[];
  title?: string;
  subtitle?: string;
  onAddRecommendation?: (rec: AIRecommendation) => void;
  onAddAll?: (recs: AIRecommendation[]) => void;
  isLoading?: boolean;
  className?: string;
}

export const AIRecommendationsPanel: React.FC<AIRecommendationsPanelProps> = ({
  recommendations,
  title = 'AI Recommendations',
  subtitle,
  onAddRecommendation,
  onAddAll,
  isLoading = false,
  className,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Group recommendations by category
  const grouped = recommendations.reduce((acc, rec) => {
    if (!acc[rec.category]) acc[rec.category] = [];
    acc[rec.category].push(rec);
    return acc;
  }, {} as Record<RecommendationCategory, AIRecommendation[]>);
  
  const categoryOrder: RecommendationCategory[] = ['critical', 'recommended', 'consider', 'not-indicated', 'avoid'];
  
  return (
    <div className={cn('bg-white rounded-xl shadow-md overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white">
              ⭐
            </div>
            <div>
              <h3 className="font-semibold text-white">{title}</h3>
              {subtitle && <p className="text-sm text-white/80">{subtitle}</p>}
            </div>
          </div>
          {onAddAll && recommendations.length > 0 && (
            <button
              onClick={() => onAddAll(recommendations.filter(r => r.category !== 'avoid' && r.category !== 'not-indicated'))}
              className="px-3 py-1.5 bg-white text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-50 transition-colors"
            >
              Add All Recommended
            </button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <span className="ml-3 text-gray-500">Analyzing clinical data...</span>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No recommendations available for current clinical context.
          </div>
        ) : (
          <div className="space-y-4">
            {categoryOrder.map((category) => {
              const items = grouped[category];
              if (!items || items.length === 0) return null;
              
              const config = RECOMMENDATION_CONFIG[category];
              
              return (
                <div key={category} className={cn('rounded-xl border', config.borderColor, config.bgColor)}>
                  <div className="px-4 py-3 border-b border-current/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className={cn('font-semibold', config.iconColor)}>{config.title}</h4>
                        <p className="text-xs text-gray-500">{config.description}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-white/80 rounded-full text-xs font-medium text-gray-600">
                        {items.length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-3 space-y-2">
                    {items.map((rec) => (
                      <RecommendationItem
                        key={rec.id}
                        recommendation={rec}
                        isExpanded={expandedId === rec.id}
                        onToggleExpand={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                        onAdd={onAddRecommendation}
                        canAdd={category !== 'avoid' && category !== 'not-indicated'}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Recommendation Item Sub-component
const RecommendationItem: React.FC<{
  recommendation: AIRecommendation;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAdd?: (rec: AIRecommendation) => void;
  canAdd: boolean;
}> = ({ recommendation, isExpanded, onToggleExpand, onAdd, canAdd }) => {
  const percentage = Math.round(recommendation.confidence * 100);
  const confidenceColor = percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-orange-500';
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onToggleExpand}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <span className={cn('inline-block transition-transform', isExpanded && 'rotate-90')}>▶</span>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate">{recommendation.name}</span>
              {recommendation.code && (
                <span className="text-xs font-mono text-gray-400">{recommendation.code}</span>
              )}
            </div>
          </div>
          {/* Confidence indicator */}
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={cn('h-full', confidenceColor)} style={{ width: `${percentage}%` }} />
            </div>
            <span className="text-xs text-gray-500">{percentage}%</span>
          </div>
        </div>
        {canAdd && onAdd && (
          <button
            onClick={() => onAdd(recommendation)}
            className="ml-2 px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded transition-colors"
          >
            + Add
          </button>
        )}
      </div>
      
      {isExpanded && (
        <div className="px-3 pb-3 pt-0">
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <p className="text-gray-700">{recommendation.rationale}</p>
            {recommendation.evidenceLevel && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">Evidence Level:</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  Level {recommendation.evidenceLevel}
                </span>
              </div>
            )}
            {recommendation.sources && recommendation.sources.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-gray-500">Sources: </span>
                <span className="text-xs text-gray-600">{recommendation.sources.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// CLINICAL FINDING CARD
// =============================================================================

export interface ClinicalFindingCardProps {
  finding: ClinicalFinding;
  onStatusChange?: (finding: ClinicalFinding, status: 'present' | 'absent' | 'unknown') => void;
  showRationale?: boolean;
  className?: string;
}

export const ClinicalFindingCard: React.FC<ClinicalFindingCardProps> = ({
  finding,
  onStatusChange,
  showRationale = true,
  className,
}) => {
  const severityColors = {
    low: '',
    moderate: 'border-l-4 border-l-amber-400',
    high: 'border-l-4 border-l-orange-500',
    critical: 'border-l-4 border-l-red-500',
  };
  
  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-200 p-4',
      finding.severity && severityColors[finding.severity],
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-medium text-gray-900">{finding.text}</p>
          {showRationale && finding.rationale && (
            <div className="mt-2 p-2 bg-gray-50 rounded-lg border-l-3 border-purple-400">
              <p className="text-sm text-gray-600">{finding.rationale}</p>
            </div>
          )}
          {finding.source && (
            <p className="text-xs text-gray-400 mt-2">Source: {finding.source}</p>
          )}
        </div>
        
        {onStatusChange && (
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => onStatusChange(finding, 'present')}
              className={cn(
                'w-7 h-7 rounded-md text-sm font-bold transition-all',
                finding.status === 'present' ? 'bg-green-500 text-white' : 'text-gray-400 hover:bg-gray-200'
              )}
            >
              ✓
            </button>
            <button
              onClick={() => onStatusChange(finding, 'absent')}
              className={cn(
                'w-7 h-7 rounded-md text-sm font-bold transition-all',
                finding.status === 'absent' ? 'bg-red-500 text-white' : 'text-gray-400 hover:bg-gray-200'
              )}
            >
              ✗
            </button>
            <button
              onClick={() => onStatusChange(finding, 'unknown')}
              className={cn(
                'w-7 h-7 rounded-md text-sm font-bold transition-all',
                finding.status === 'unknown' ? 'bg-amber-500 text-white' : 'text-gray-400 hover:bg-gray-200'
              )}
            >
              ?
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// ORDER SUMMARY SIDEBAR
// =============================================================================

export interface OrderSummaryProps {
  orders: {
    labs?: OrderItem[];
    imaging?: OrderItem[];
    medications?: OrderItem[];
    referrals?: OrderItem[];
  };
  onRemoveOrder?: (type: string, order: OrderItem) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  isSubmitting?: boolean;
  className?: string;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  orders,
  onRemoveOrder,
  onSubmit,
  onClear,
  isSubmitting = false,
  className,
}) => {
  const totalOrders = 
    (orders.labs?.length || 0) + 
    (orders.imaging?.length || 0) + 
    (orders.medications?.length || 0) + 
    (orders.referrals?.length || 0);
  
  const sections = [
    { key: 'labs', label: 'Lab Orders', items: orders.labs, icon: '🧪' },
    { key: 'imaging', label: 'Imaging', items: orders.imaging, icon: '📷' },
    { key: 'medications', label: 'Medications', items: orders.medications, icon: '💊' },
    { key: 'referrals', label: 'Referrals', items: orders.referrals, icon: '📋' },
  ];
  
  return (
    <div className={cn('bg-white rounded-xl shadow-md sticky top-4', className)}>
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Order Summary</h3>
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
            {totalOrders} items
          </span>
        </div>
      </div>
      
      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {totalOrders === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm">No orders added yet</p>
          </div>
        ) : (
          sections.map(({ key, label, items, icon }) => {
            if (!items || items.length === 0) return null;
            
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{icon}</span>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        {item.priority && (
                          <PriorityBadge priority={item.priority} size="sm" showDot={false} />
                        )}
                      </div>
                      {onRemoveOrder && (
                        <button
                          onClick={() => onRemoveOrder(key, item)}
                          className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {totalOrders > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl space-y-2">
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className={cn(
              'w-full px-4 py-2 font-medium text-white rounded-lg transition-all',
              'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              `Submit Orders (${totalOrders})`
            )}
          </button>
          {onClear && (
            <button
              onClick={onClear}
              className="w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// COLLAPSIBLE SECTION COMPONENT
// =============================================================================

export interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'stat' | 'urgent' | 'routine';
  children: React.ReactNode;
  className?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  icon,
  badge,
  defaultOpen = true,
  variant = 'default',
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const headerColors = {
    default: 'bg-gray-50 hover:bg-gray-100 text-gray-900',
    stat: 'bg-gradient-to-r from-red-500 to-red-600 text-white',
    urgent: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
    routine: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
  };
  
  return (
    <div className={cn('rounded-xl overflow-hidden border border-gray-200 shadow-sm', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full px-4 py-3 flex items-center justify-between transition-colors',
          headerColors[variant]
        )}
      >
        <div className="flex items-center gap-3">
          {icon}
          <div className="text-left">
            <div className="font-semibold">{title}</div>
            {subtitle && (
              <div className={cn('text-sm', variant === 'default' ? 'text-gray-500' : 'opacity-80')}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          <span className={cn('transition-transform', isOpen && 'rotate-180')}>▼</span>
        </div>
      </button>
      <div className={cn(
        'overflow-hidden transition-all duration-300',
        isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="p-4 bg-white">{children}</div>
      </div>
    </div>
  );
};
