// =============================================================================
// ATTENDING AI - Provider Inbox Patient Row
// apps/provider-portal/components/inbox/PatientRow.tsx
// =============================================================================

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { InboxItem } from './types';
import { theme, categoryConfig, priorityColors } from './theme';

function getTimeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}d ago`;
  
  return new Date(date).toLocaleDateString();
}

interface PatientRowProps {
  item: InboxItem;
  isExpanded: boolean;
  onToggle: () => void;
}

export const PatientRow: React.FC<PatientRowProps> = ({
  item,
  isExpanded,
  onToggle,
}) => {
  const categoryAccent = categoryConfig[item.category];
  const priorityStyle = priorityColors[item.priority];

  const getBgColor = (): string => {
    if (isExpanded) return theme.purple[200];
    if (item.status === 'unread') return theme.purple[100];
    return theme.purple[50];
  };

  return (
    <div
      className="cursor-pointer transition-all duration-200"
      style={{
        background: getBgColor(),
        borderBottom: `1px solid ${theme.purple[200]}`,
        borderLeft: `4px solid ${categoryAccent.accent}`,
      }}
      onClick={onToggle}
      onMouseEnter={(e) => {
        if (!isExpanded) {
          e.currentTarget.style.background = theme.purple[200];
        }
      }}
      onMouseLeave={(e) => {
        if (!isExpanded) {
          e.currentTarget.style.background = getBgColor();
        }
      }}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Priority Indicator */}
        <div
          className="w-1.5 h-12 rounded-full flex-shrink-0"
          style={{ background: priorityStyle.dot }}
          title={`${item.priority} priority`}
        />

        {/* Expand/Collapse Chevron */}
        <div
          className="flex-shrink-0 transition-colors"
          style={{ color: isExpanded ? theme.purple[700] : theme.purple[400] }}
        >
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </div>

        {/* Patient Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-semibold text-sm"
              style={{
                color: item.status === 'unread' ? theme.text.primary : theme.text.secondary,
              }}
            >
              {item.patientName}
            </span>

            <span className="text-xs" style={{ color: theme.purple[600] }}>
              {item.patientAge}y • {item.mrn}
            </span>

            {item.status === 'unread' && (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: theme.purple[500] }}
              />
            )}

            {item.roomNumber && (
              <span
                className="px-2 py-0.5 text-xs rounded font-medium flex-shrink-0"
                style={{
                  background: categoryAccent.accentLight,
                  color: categoryAccent.accentDark,
                  border: `1px solid ${categoryAccent.accent}40`,
                }}
              >
                {item.roomNumber}
              </span>
            )}

            {item.daysOpen !== undefined && item.daysOpen >= 3 && (
              <span
                className="px-2 py-0.5 text-xs rounded font-medium flex-shrink-0"
                style={{
                  background: item.daysOpen >= 5 ? '#fee2e2' : '#fef3c7',
                  color: item.daysOpen >= 5 ? '#dc2626' : '#d97706',
                }}
              >
                {item.daysOpen}d open
              </span>
            )}

            {item.labType && (
              <span
                className="px-2 py-0.5 text-xs rounded font-medium flex-shrink-0"
                style={{
                  background:
                    item.labType === 'critical'
                      ? '#fee2e2'
                      : item.labType === 'abnormal'
                      ? '#fef3c7'
                      : '#d1fae5',
                  color:
                    item.labType === 'critical'
                      ? '#dc2626'
                      : item.labType === 'abnormal'
                      ? '#d97706'
                      : '#065f46',
                }}
              >
                {item.labType.charAt(0).toUpperCase() + item.labType.slice(1)}
              </span>
            )}
          </div>

          <p
            className="text-xs truncate mt-0.5"
            style={{ color: theme.text.secondary }}
          >
            {item.chiefComplaint || item.subject}
          </p>
        </div>

        {/* Right Side - Priority & Time */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {item.priority === 'urgent' && (
            <span
              className="px-2 py-1 text-xs font-bold rounded animate-pulse"
              style={{
                background: priorityStyle.bg,
                color: priorityStyle.text,
              }}
            >
              URGENT
            </span>
          )}

          {item.waitTime && (
            <span
              className="text-xs font-medium"
              style={{ color: theme.purple[600] }}
            >
              ⏱ {item.waitTime}
            </span>
          )}

          {!item.waitTime && (
            <span className="text-xs" style={{ color: theme.text.muted }}>
              {getTimeAgo(item.timestamp)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientRow;
