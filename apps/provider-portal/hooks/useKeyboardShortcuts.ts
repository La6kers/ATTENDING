// useKeyboardShortcuts.ts
// Global keyboard shortcuts hook for clinical workflows
// apps/provider-portal/hooks/useKeyboardShortcuts.ts

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
  scope?: 'global' | 'modal' | 'form';
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  scope?: 'global' | 'modal' | 'form';
}

// Check if user is typing in an input field
const isTypingInInput = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  const isEditable = target.isContentEditable;
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || isEditable;
};

export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
  scope = 'global',
}: UseKeyboardShortcutsOptions) => {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Skip if typing in input (except for escape and specific shortcuts)
    const isEscape = event.key === 'Escape';
    if (isTypingInInput(event.target) && !isEscape && !event.ctrlKey && !event.metaKey) {
      return;
    }

    for (const shortcut of shortcutsRef.current) {
      // Check if scope matches
      if (shortcut.scope && shortcut.scope !== scope) continue;

      // Check if key matches
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
      const shiftMatch = !!shortcut.shift === event.shiftKey;
      const altMatch = !!shortcut.alt === event.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.action();
        return;
      }
    }
  }, [enabled, scope]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown]);
};

// Pre-defined clinical workflow shortcuts
export const createClinicalShortcuts = (handlers: {
  onSave?: () => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  onCloseModal?: () => void;
  onNewOrder?: () => void;
  onSearch?: () => void;
  onToggleAI?: () => void;
  onEmergency?: () => void;
  onPrint?: () => void;
}): KeyboardShortcut[] => {
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.onSave) {
    shortcuts.push({
      key: 's',
      ctrl: true,
      description: 'Save draft',
      action: handlers.onSave,
    });
  }

  if (handlers.onSubmit) {
    shortcuts.push({
      key: 'Enter',
      ctrl: true,
      description: 'Submit order',
      action: handlers.onSubmit,
    });
  }

  if (handlers.onCancel) {
    shortcuts.push({
      key: 'Escape',
      description: 'Cancel / Close',
      action: handlers.onCancel,
    });
  }

  if (handlers.onCloseModal) {
    shortcuts.push({
      key: 'Escape',
      description: 'Close modal',
      action: handlers.onCloseModal,
      scope: 'modal',
    });
  }

  if (handlers.onNewOrder) {
    shortcuts.push({
      key: 'n',
      ctrl: true,
      description: 'New order',
      action: handlers.onNewOrder,
    });
  }

  if (handlers.onSearch) {
    shortcuts.push({
      key: 'k',
      ctrl: true,
      description: 'Open search',
      action: handlers.onSearch,
    });
    shortcuts.push({
      key: '/',
      description: 'Focus search',
      action: handlers.onSearch,
    });
  }

  if (handlers.onToggleAI) {
    shortcuts.push({
      key: 'a',
      ctrl: true,
      shift: true,
      description: 'Toggle AI recommendations',
      action: handlers.onToggleAI,
    });
  }

  if (handlers.onEmergency) {
    shortcuts.push({
      key: 'e',
      ctrl: true,
      shift: true,
      description: 'Emergency protocol',
      action: handlers.onEmergency,
    });
  }

  if (handlers.onPrint) {
    shortcuts.push({
      key: 'p',
      ctrl: true,
      description: 'Print',
      action: handlers.onPrint,
    });
  }

  return shortcuts;
};

// Shortcut help panel data
export const getShortcutHelpItems = (shortcuts: KeyboardShortcut[]) => {
  return shortcuts.map(s => ({
    keys: [
      s.ctrl && 'Ctrl',
      s.shift && 'Shift',
      s.alt && 'Alt',
      s.key,
    ].filter(Boolean).join(' + '),
    description: s.description,
  }));
};

// Default clinical shortcuts list for help panel
export const defaultClinicalShortcuts = [
  { keys: 'Ctrl + S', description: 'Save draft' },
  { keys: 'Ctrl + Enter', description: 'Submit order' },
  { keys: 'Escape', description: 'Cancel / Close modal' },
  { keys: 'Ctrl + N', description: 'New order' },
  { keys: 'Ctrl + K', description: 'Open search' },
  { keys: '/', description: 'Focus search' },
  { keys: 'Ctrl + Shift + A', description: 'Toggle AI recommendations' },
  { keys: 'Ctrl + Shift + E', description: 'Emergency protocol' },
  { keys: 'Ctrl + P', description: 'Print' },
];

export default useKeyboardShortcuts;
