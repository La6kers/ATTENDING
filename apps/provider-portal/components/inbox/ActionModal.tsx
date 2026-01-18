// =============================================================================
// ATTENDING AI - Provider Inbox Action Modal
// apps/provider-portal/components/inbox/ActionModal.tsx
// =============================================================================

import React, { useState } from 'react';
import { Forward, UserPlus, X, CheckCircle, Search } from 'lucide-react';
import type { Provider } from './types';
import { theme, getPurpleGradientStyle } from './theme';

interface ActionModalProps {
  isOpen: boolean;
  type: 'forward' | 'reassign';
  providers: Provider[];
  onClose: () => void;
  onSubmit: (providerId: string, note: string) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  type,
  providers,
  onClose,
  onSubmit,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredProviders = providers.filter((provider) =>
    provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = () => {
    if (selectedProvider) {
      onSubmit(selectedProvider, note);
      setSelectedProvider('');
      setNote('');
      setSearchQuery('');
    }
  };

  const handleClose = () => {
    setSelectedProvider('');
    setNote('');
    setSearchQuery('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{
          animation: 'slideIn 0.2s ease-out',
          boxShadow: theme.shadow.lg,
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 text-white flex items-center justify-between"
          style={getPurpleGradientStyle()}
        >
          <div className="flex items-center gap-3">
            {type === 'forward' ? (
              <Forward className="w-5 h-5" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
            <span className="font-semibold text-lg">
              {type === 'forward' ? 'Forward Item' : 'Reassign Item'}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: theme.purple[400] }}
            />
            <input
              type="text"
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all"
              style={{
                border: `2px solid ${theme.purple[200]}`,
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.purple[500];
                e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.purple[500]}20`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.purple[200];
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Provider List */}
          <div
            className="max-h-56 overflow-y-auto rounded-xl mb-4"
            style={{ border: `2px solid ${theme.purple[200]}` }}
          >
            {filteredProviders.length === 0 ? (
              <div className="p-4 text-center" style={{ color: theme.text.secondary }}>
                No providers found
              </div>
            ) : (
              filteredProviders.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  className="w-full px-4 py-3 text-left flex items-center gap-3 text-sm transition-colors"
                  style={{
                    background: selectedProvider === provider.id ? theme.purple[100] : 'white',
                    borderBottom: `1px solid ${theme.purple[100]}`,
                  }}
                  onMouseEnter={(e) => {
                    if (selectedProvider !== provider.id) {
                      e.currentTarget.style.background = theme.purple[50];
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedProvider !== provider.id) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: theme.gradient.primary }}
                  >
                    {provider.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate" style={{ color: theme.text.primary }}>
                      {provider.name}
                    </div>
                    <div className="text-xs truncate" style={{ color: theme.text.secondary }}>
                      {provider.role} • {provider.department}
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {selectedProvider === provider.id && (
                    <CheckCircle
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: theme.purple[600] }}
                    />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Note Input */}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl text-sm resize-none transition-all"
            style={{
              border: `2px solid ${theme.purple[200]}`,
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.purple[500];
              e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.purple[500]}20`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.purple[200];
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 flex justify-end gap-3"
          style={{ background: theme.purple[50] }}
        >
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ color: theme.text.secondary }}
            onMouseEnter={(e) => (e.currentTarget.style.background = theme.purple[100])}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={!selectedProvider}
            className="px-5 py-2 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
            style={{
              background: selectedProvider ? theme.gradient.primary : '#d1d5db',
              opacity: selectedProvider ? 1 : 0.5,
              cursor: selectedProvider ? 'pointer' : 'not-allowed',
              boxShadow: selectedProvider ? theme.shadow.md : 'none',
            }}
          >
            {type === 'forward' ? (
              <>
                <Forward className="w-4 h-4" />
                Forward
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Reassign
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ActionModal;
