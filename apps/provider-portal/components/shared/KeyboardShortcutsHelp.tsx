// KeyboardShortcutsHelp.tsx
// Help panel showing available keyboard shortcuts
// apps/provider-portal/components/shared/KeyboardShortcutsHelp.tsx

import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { defaultClinicalShortcuts } from '../../hooks/useKeyboardShortcuts';

export interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts?: Array<{ keys: string; description: string }>;
  className?: string;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  shortcuts = defaultClinicalShortcuts,
  className = '',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className={`bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-slide-up ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
              <p className="text-sm text-gray-500">Speed up your workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-sm text-gray-700">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.split(' + ').map((key, keyIndex) => (
                    <React.Fragment key={keyIndex}>
                      {keyIndex > 0 && <span className="text-gray-400 mx-1">+</span>}
                      <kbd className="kbd">{key}</kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="kbd">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
};

// Keyboard shortcut badge for inline use
export const ShortcutBadge: React.FC<{
  keys: string;
  className?: string;
}> = ({ keys, className = '' }) => {
  return (
    <span className={`shortcut-hint ${className}`}>
      {keys.split(' + ').map((key, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-gray-400">+</span>}
          <kbd className="kbd">{key}</kbd>
        </React.Fragment>
      ))}
    </span>
  );
};

export default KeyboardShortcutsHelp;
