import React, { useState, useCallback, useEffect } from 'react';

// --- Types ---

export interface ConsentRecord {
  patientInformed: boolean;
  patientVerbalConsent: boolean;
  providerAttested: boolean;
  timestamp: string;
  consentType: 'verbal' | 'written';
  jurisdiction?: string;
}

export interface AmbientConsentModalProps {
  patientName: string;
  isOpen: boolean;
  onConsent: (consentData: ConsentRecord) => void;
  onDecline: () => void;
}

// --- Constants ---

const CONSENT_SESSION_KEY = 'ambient_consent_record';

// --- Hook ---

export function useAmbientConsent() {
  const [consentRecord, setConsentRecord] = useState<ConsentRecord | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem(CONSENT_SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const needsConsent = consentRecord === null;

  const saveConsent = useCallback((record: ConsentRecord) => {
    sessionStorage.setItem(CONSENT_SESSION_KEY, JSON.stringify(record));
    setConsentRecord(record);
  }, []);

  const clearConsent = useCallback(() => {
    sessionStorage.removeItem(CONSENT_SESSION_KEY);
    setConsentRecord(null);
  }, []);

  return { needsConsent, consentRecord, saveConsent, clearConsent };
}

// --- Component ---

export default function AmbientConsentModal({
  patientName,
  isOpen,
  onConsent,
  onDecline,
}: AmbientConsentModalProps) {
  const [patientInformed, setPatientInformed] = useState(false);
  const [patientVerbalConsent, setPatientVerbalConsent] = useState(false);
  const [providerAttested, setProviderAttested] = useState(false);

  const allChecked = patientInformed && patientVerbalConsent && providerAttested;

  // Reset checkboxes when modal opens
  useEffect(() => {
    if (isOpen) {
      setPatientInformed(false);
      setPatientVerbalConsent(false);
      setProviderAttested(false);
    }
  }, [isOpen]);

  const handleConsent = () => {
    if (!allChecked) return;
    const record: ConsentRecord = {
      patientInformed,
      patientVerbalConsent,
      providerAttested,
      timestamp: new Date().toISOString(),
      consentType: 'verbal',
    };
    onConsent(record);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}>
            <ShieldIcon />
          </div>
          <h2 style={styles.headerTitle}>Ambient Recording Consent</h2>
        </div>

        {/* Patient banner */}
        <div style={styles.patientBanner}>
          <span style={styles.patientLabel}>Patient:</span>{' '}
          <span style={styles.patientName}>{patientName}</span>
        </div>

        {/* Body text */}
        <div style={styles.body}>
          <p style={styles.bodyText}>
            This encounter will use ambient clinical intelligence to assist with
            documentation.
          </p>
          <div style={styles.infoCard}>
            <div style={styles.infoRow}>
              <InfoDot />
              <span style={styles.infoText}>
                Audio is processed in real-time and is <strong>NOT</strong> stored
                after the encounter.
              </span>
            </div>
            <div style={styles.infoRow}>
              <InfoDot />
              <span style={styles.infoText}>
                Only the generated clinical note is retained.
              </span>
            </div>
          </div>
        </div>

        {/* Checkboxes */}
        <div style={styles.checkboxGroup}>
          <CheckboxRow
            checked={patientInformed}
            onChange={setPatientInformed}
            label="Patient has been informed about ambient recording"
          />
          <CheckboxRow
            checked={patientVerbalConsent}
            onChange={setPatientVerbalConsent}
            label="Patient has provided verbal consent"
          />
          <div style={styles.attestDivider} />
          <CheckboxRow
            checked={providerAttested}
            onChange={setProviderAttested}
            label="I attest that informed consent has been obtained"
            bold
          />
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.declineButton} onClick={onDecline} type="button">
            Decline
          </button>
          <button
            style={{
              ...styles.consentButton,
              ...(allChecked ? {} : styles.consentButtonDisabled),
            }}
            onClick={handleConsent}
            disabled={!allChecked}
            type="button"
          >
            Begin Recording
          </button>
        </div>

        {/* Footer note */}
        <p style={styles.footerNote}>
          Consent record will be added to the encounter audit trail.
        </p>
      </div>
    </div>
  );
}

// --- Sub-components ---

function CheckboxRow({
  checked,
  onChange,
  label,
  bold,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  bold?: boolean;
}) {
  return (
    <label style={styles.checkboxLabel}>
      <div
        style={{
          ...styles.checkbox,
          ...(checked ? styles.checkboxChecked : {}),
        }}
        onClick={() => onChange(!checked)}
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onChange(!checked);
          }
        }}
      >
        {checked && <CheckIcon />}
      </div>
      <span style={{ ...(bold ? { fontWeight: 600 } : {}) }}>{label}</span>
    </label>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1A8FA8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="#fff"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 7.5l3 3 6-6" />
    </svg>
  );
}

function InfoDot() {
  return (
    <div
      style={{
        minWidth: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: '#1A8FA8',
        marginTop: 6,
      }}
    />
  );
}

// --- Styles ---

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12, 53, 71, 0.5)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 520,
    padding: '32px',
    boxShadow: '0 20px 60px rgba(12, 53, 71, 0.25)',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#0C3547',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E6F7F5',
  },
  headerTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: '#0C3547',
  },
  patientBanner: {
    backgroundColor: '#E6F7F5',
    borderRadius: 8,
    padding: '10px 16px',
    marginBottom: 20,
    fontSize: 14,
  },
  patientLabel: {
    color: '#1A8FA8',
    fontWeight: 600,
  },
  patientName: {
    fontWeight: 700,
    color: '#0C3547',
  },
  body: {
    marginBottom: 24,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 1.6,
    margin: '0 0 16px 0',
    color: '#334155',
  },
  infoCard: {
    backgroundColor: '#f8fafa',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  infoRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 1.5,
    color: '#475569',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    marginBottom: 28,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 14,
    lineHeight: 1.4,
    color: '#0C3547',
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
    height: 22,
    borderRadius: 6,
    border: '2px solid #cbd5e1',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  checkboxChecked: {
    backgroundColor: '#1A8FA8',
    borderColor: '#1A8FA8',
  },
  attestDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    margin: '2px 0',
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  declineButton: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  consentButton: {
    padding: '10px 28px',
    fontSize: 14,
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#1A8FA8',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  consentButtonDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  footerNote: {
    margin: 0,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
};
