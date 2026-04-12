// =============================================================================
// ATTENDING AI - Provider Inbox Toast Notification
// apps/provider-portal/components/inbox/Toast.tsx
// =============================================================================

import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { theme } from './theme';

interface ToastProps {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ show, message, type, onClose }) => {
  if (!show) return null;

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  };

  const colors = {
    success: {
      bg: '#d1fae5',
      border: '#10b981',
      icon: '#059669',
      text: '#065f46',
    },
    error: {
      bg: '#fee2e2',
      border: '#ef4444',
      icon: '#dc2626',
      text: '#991b1b',
    },
    info: {
      bg: theme.purple[100],
      border: theme.purple[500],
      icon: theme.purple[600],
      text: theme.purple[900],
    },
  };

  const Icon = icons[type];
  const colorSet = colors[type];

  return (
    <div
      className="fixed top-6 right-6 z-50"
      style={{
        animation: 'toastSlideIn 0.3s ease-out',
      }}
    >
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg"
        style={{
          background: colorSet.bg,
          border: `2px solid ${colorSet.border}`,
          boxShadow: `0 4px 20px ${colorSet.border}30`,
        }}
      >
        <Icon className="w-5 h-5 flex-shrink-0" style={{ color: colorSet.icon }} />
        
        <span className="text-sm font-medium" style={{ color: colorSet.text }}>
          {message}
        </span>
        
        <button
          onClick={onClose}
          className="ml-2 p-1 rounded-lg transition-colors flex-shrink-0"
          style={{ color: colorSet.icon }}
          onMouseEnter={(e) => (e.currentTarget.style.background = `${colorSet.border}20`)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default Toast;
