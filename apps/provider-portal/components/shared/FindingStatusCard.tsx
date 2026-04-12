// FindingStatusCard.tsx
// Clinical finding card with tri-state status toggles - HTML Prototype Feature
// apps/provider-portal/components/shared/FindingStatusCard.tsx

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Brain, AlertTriangle } from 'lucide-react';

export type FindingStatus = 'present' | 'absent' | 'unknown';

export interface Finding {
  id: string;
  text: string;
  category?: string;
  status: FindingStatus;
  rationale?: string;
  aiSuggested?: boolean;
  critical?: boolean;
  source?: 'patient-reported' | 'ai-detected' | 'provider-added';
}

export interface FindingStatusCardProps {
  finding: Finding;
  onStatusChange: (findingId: string, status: FindingStatus) => void;
  showRationale?: boolean;
  className?: string;
}

const statusConfig = {
  present: { label: '✓', class: 'active-present', ariaLabel: 'Present' },
  absent: { label: '✗', class: 'active-absent', ariaLabel: 'Absent' },
  unknown: { label: '?', class: 'active-unknown', ariaLabel: 'Unknown' },
};

const FindingStatusCard: React.FC<FindingStatusCardProps> = ({
  finding,
  onStatusChange,
  showRationale = true,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(finding.rationale ? true : false);

  const handleStatusClick = useCallback((newStatus: FindingStatus) => {
    onStatusChange(finding.id, newStatus);
  }, [finding.id, onStatusChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, statuses: FindingStatus[]) => {
    const currentIndex = statuses.indexOf(finding.status);
    let nextIndex: number | undefined;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % statuses.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + statuses.length) % statuses.length;
    }

    if (nextIndex !== undefined) {
      e.preventDefault();
      handleStatusClick(statuses[nextIndex]);
    }
  }, [finding.status, handleStatusClick]);

  const statuses: FindingStatus[] = ['present', 'absent', 'unknown'];

  return (
    <div 
      className={`finding-card ${finding.critical ? 'critical' : ''} ${className}`}
    >
      {/* Header */}
      <div className="finding-header">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {finding.aiSuggested && (
            <span title="AI Suggested">
              <Brain className="w-4 h-4 text-teal-500 flex-shrink-0" aria-hidden="true" />
            </span>
          )}
          {finding.critical && (
            <span title="Critical Finding">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" aria-hidden="true" />
            </span>
          )}
          <span className="finding-text truncate">{finding.text}</span>
          {finding.source && (
            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
              finding.source === 'ai-detected' 
                ? 'bg-teal-100 text-teal-700' 
                : finding.source === 'patient-reported'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {finding.source === 'ai-detected' ? 'AI' : 
               finding.source === 'patient-reported' ? 'Patient' : 'Provider'}
            </span>
          )}
        </div>

        {/* Status Button Group - HTML Prototype Style */}
        <div 
          className="status-btn-group" 
          role="radiogroup" 
          aria-label={`Status for ${finding.text}`}
        >
          {statuses.map((status) => {
            const config = statusConfig[status];
            const isActive = finding.status === status;
            return (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={isActive}
                aria-label={config.ariaLabel}
                onClick={() => handleStatusClick(status)}
                onKeyDown={(e) => handleKeyDown(e, statuses)}
                className={`status-btn ${isActive ? config.class : ''}`}
              >
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Expand/Collapse for rationale */}
        {finding.rationale && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors ml-2"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Rationale - HTML Prototype Style */}
      {showRationale && finding.rationale && expanded && (
        <div className="finding-rationale">
          <span className="text-teal-600 font-medium">AI Rationale:</span>{' '}
          {finding.rationale}
        </div>
      )}
    </div>
  );
};

// Finding List component for managing multiple findings
export interface FindingListProps {
  findings: Finding[];
  onStatusChange: (findingId: string, status: FindingStatus) => void;
  onAddFinding?: () => void;
  title?: string;
  showAddButton?: boolean;
  className?: string;
}

export const FindingList: React.FC<FindingListProps> = ({
  findings,
  onStatusChange,
  onAddFinding,
  title = 'Clinical Findings',
  showAddButton = true,
  className = '',
}) => {
  const presentCount = findings.filter(f => f.status === 'present').length;
  const absentCount = findings.filter(f => f.status === 'absent').length;
  const unknownCount = findings.filter(f => f.status === 'unknown').length;

  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
            {presentCount} Present
          </span>
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">
            {absentCount} Absent
          </span>
          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
            {unknownCount} Unknown
          </span>
        </div>
      </div>

      {/* Finding Cards */}
      <div className="space-y-2">
        {findings.map((finding) => (
          <FindingStatusCard
            key={finding.id}
            finding={finding}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      {/* Add Finding Button */}
      {showAddButton && onAddFinding && (
        <button
          onClick={onAddFinding}
          className="add-finding-btn mt-4"
        >
          <span className="text-lg">+</span>
          Add Custom Finding
        </button>
      )}
    </div>
  );
};

export default FindingStatusCard;
