// AI Status Indicator Component

import React from 'react';
import { AIStatus } from '@/types/chat';
import { UrgencyLevel } from '@/types/medical';
import { Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIStatusIndicatorProps {
  status: AIStatus;
  urgencyLevel: UrgencyLevel;
  className?: string;
}

export const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({ 
  status, 
  urgencyLevel,
  className 
}) => {
  const getStatusColor = () => {
    if (status.error) return 'bg-red-50 border-red-200 text-red-700';
    if (urgencyLevel === 'high') return 'bg-red-50 border-red-200 text-red-700';
    if (urgencyLevel === 'moderate') return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    return 'bg-green-50 border-green-200 text-green-700';
  };

  const getStatusIcon = () => {
    if (status.error) return <AlertCircle className="w-4 h-4" />;
    if (status.isProcessing) return <Activity className="w-4 h-4 animate-pulse" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (status.error) return status.error;
    if (status.currentAction) return status.currentAction;
    
    switch (urgencyLevel) {
      case 'high':
        return '🚨 High Risk Patient - Urgent Review Needed';
      case 'moderate':
        return '⚠️ Moderate Risk - Timely Assessment Recommended';
      default:
        return '✅ Medical AI Ready';
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-300",
      getStatusColor(),
      className
    )}>
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>
      {status.isProcessing && (
        <div className="ml-auto flex gap-0.5">
          <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  );
};
