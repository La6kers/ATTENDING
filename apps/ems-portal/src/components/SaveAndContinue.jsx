import { useState, useCallback } from 'react';

/**
 * SaveAndContinue -- persists partial intake state to localStorage so patients
 * can resume an interrupted check-in from any device (same browser) or after
 * navigating away.
 *
 * Props:
 *   intakeState   - the full form/vitals/step state to serialize
 *   onRestore     - callback receiving the restored state when patient resumes
 *
 * Renders a small "Save and continue later" link and, when a saved session
 * exists, a dismissible banner offering to resume.
 */

const STORAGE_KEY = 'compass_intake_draft';

export function saveIntakeDraft(state) {
  try {
    const payload = {
      ...state,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadIntakeDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // Expire drafts older than 24 hours
    const savedAt = new Date(parsed.savedAt);
    const hoursSinceSave = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceSave > 24) {
      clearIntakeDraft();
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearIntakeDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}

export default function SaveAndContinue({ intakeState, onRestore }) {
  const [saved, setSaved] = useState(false);
  const [showResume, setShowResume] = useState(() => !!loadIntakeDraft());

  const handleSave = useCallback(() => {
    const success = saveIntakeDraft(intakeState);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }, [intakeState]);

  const handleResume = useCallback(() => {
    const draft = loadIntakeDraft();
    if (draft && onRestore) {
      onRestore(draft);
      clearIntakeDraft();
    }
    setShowResume(false);
  }, [onRestore]);

  const handleDismiss = useCallback(() => {
    clearIntakeDraft();
    setShowResume(false);
  }, []);

  return (
    <>
      {/* Resume banner */}
      {showResume && (
        <div
          className="mb-4 p-3 sm:p-4 bg-compass-50 border border-compass-200 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 intake-fade-in"
          role="alert"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <svg className="w-5 h-5 text-compass-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            <p className="text-sm text-compass-800 font-medium truncate">
              You have an unfinished check-in. Would you like to continue where you left off?
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleResume}
              className="btn-compass text-sm px-3 py-1.5"
            >
              Resume
            </button>
            <button
              onClick={handleDismiss}
              className="btn-secondary text-sm px-3 py-1.5"
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {/* Save link */}
      <button
        onClick={handleSave}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-compass-600 transition-colors focus:outline-none focus:underline"
        aria-label="Save your progress and continue later"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
        </svg>
        {saved ? (
          <span className="text-compass-600 font-medium">Saved! You can close this page.</span>
        ) : (
          <span>Save and continue later</span>
        )}
      </button>
    </>
  );
}
