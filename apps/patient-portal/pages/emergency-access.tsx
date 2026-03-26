// =============================================================================
// ATTENDING AI - Emergency Access Page
// apps/patient-portal/pages/emergency-access.tsx
//
// Three-stage flow:
//   1. Countdown (crash-triggered) → cancelable
//   2. Quick Vital Info — immediate access, no ID required
//      Shows: blood type, allergies, critical meds, implants, code status
//      + button to unlock full chart
//   3. Full Chart Access — requires name + badge + auto photo capture
// =============================================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  AlertTriangle,
  Heart,
  Pill,
  Shield,
  Phone,
  User,
  AlertCircle,
  Droplets,
  Syringe,
  FileText,
  Camera,
  Lock,
  ChevronRight,
  Activity,
} from 'lucide-react';

// Brand coral color
const CORAL = '#E87461';
const CORAL_DARK = '#D4604F';
const CORAL_LIGHT = '#F2998E';

// =============================================================================
// Types
// =============================================================================

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

interface MedicalInfo {
  patientName: string;
  dateOfBirth: string;
  age: number;
  bloodType: string;
  allergies: string[];
  conditions: string[];
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    critical?: boolean;
  }>;
  implants: string[];
  emergencyContacts: EmergencyContact[];
  organDonor: boolean;
  advanceDirective: boolean;
  dnr: boolean;
  physicianName: string;
  physicianPhone: string;
  insuranceProvider?: string;
  insuranceId?: string;
  notes?: string;
}

// =============================================================================
// Mock Patient Data
// =============================================================================

const mockMedicalInfo: MedicalInfo = {
  patientName: 'Robert Anderson',
  dateOfBirth: '1957-03-15',
  age: 68,
  bloodType: 'A+',
  allergies: ['Penicillin', 'Sulfa drugs', 'Shellfish'],
  conditions: [
    'Type 2 Diabetes',
    'Hypertension',
    'Atrial Fibrillation',
    'Chronic Kidney Disease Stage 3',
  ],
  medications: [
    { name: 'Metformin', dosage: '1000mg', frequency: 'Twice daily', critical: false },
    { name: 'Lisinopril', dosage: '20mg', frequency: 'Once daily', critical: false },
    { name: 'Eliquis (Apixaban)', dosage: '5mg', frequency: 'Twice daily', critical: true },
    { name: 'Carvedilol', dosage: '12.5mg', frequency: 'Twice daily', critical: false },
    { name: 'Furosemide', dosage: '40mg', frequency: 'Once daily', critical: false },
  ],
  implants: ['Pacemaker (Medtronic Azure XT DR, implanted March 2022)'],
  emergencyContacts: [
    { name: 'Rachel Anderson', relationship: 'Fiancée', phone: '(555) 123-4567', isPrimary: true },
    { name: 'Michael Anderson', relationship: 'Brother', phone: '(555) 234-5678', isPrimary: false },
  ],
  organDonor: true,
  advanceDirective: true,
  dnr: false,
  physicianName: 'Dr. Sarah Chen',
  physicianPhone: '(555) 345-6789',
  insuranceProvider: 'Blue Cross Blue Shield',
  insuranceId: 'XYZ123456789',
  notes: 'Patient on anticoagulation (Eliquis) - INCREASED BLEEDING RISK. Has pacemaker - AVOID MRI without cardiology clearance.',
};

// =============================================================================
// Stage 0: Countdown Screen (crash-triggered)
// =============================================================================

const CountdownScreen: React.FC<{
  seconds: number;
  onCancel: () => void;
  onExpire: () => void;
}> = ({ seconds, onCancel, onExpire }) => {
  const [countdown, setCountdown] = useState(seconds);

  useEffect(() => {
    if (countdown <= 0) { onExpire(); return; }
    const timer = setInterval(() => setCountdown((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown, onExpire]);

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${CORAL_DARK}, ${CORAL})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, color: 'white' }}>
      <div style={{ position: 'relative', marginBottom: 32 }}>
        <div style={{ width: 128, height: 128, background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={64} color={CORAL} />
        </div>
      </div>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: 8 }}>CRASH DETECTED</h1>
      <p style={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 32, maxWidth: 280 }}>
        Emergency Medical Access will activate in:
      </p>
      <div style={{ fontSize: '5rem', fontWeight: 700, marginBottom: 32, fontVariantNumeric: 'tabular-nums' }}>
        {countdown}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 32 }}>
        Tap below if you're okay to cancel
      </p>
      <button
        onClick={onCancel}
        style={{ width: '100%', maxWidth: 320, padding: '16px 0', background: 'white', color: CORAL, borderRadius: 12, fontWeight: 700, fontSize: '1.125rem', border: 'none', cursor: 'pointer' }}
      >
        I'M OKAY - CANCEL
      </button>
      <div style={{ marginTop: 32, textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
        <p>Your emergency contacts will be notified</p>
        <p>Location will be shared with emergency services</p>
      </div>
    </div>
  );
};

// =============================================================================
// Stage 1: Quick Vital Info (NO identification required)
// =============================================================================

const QuickVitalInfo: React.FC<{
  info: MedicalInfo;
  onRequestFullAccess: () => void;
}> = ({ info, onRequestFullAccess }) => {
  const criticalMeds = info.medications.filter((m) => m.critical);

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, #0C3547, #0C4C5E)`, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header bar */}
      <div style={{ background: CORAL, padding: '16px 20px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Heart size={22} color={CORAL} />
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>EMERGENCY VITAL INFO</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', margin: 0 }}>
              {info.patientName} • {info.age}yo • DOB: {info.dateOfBirth}
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', paddingBottom: 120 }}>
        {/* Blood Type — huge and prominent */}
        <div style={{ background: 'rgba(232,116,97,0.15)', border: '2px solid rgba(232,116,97,0.4)', borderRadius: 16, padding: '16px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Droplets size={32} color={CORAL} />
          <div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Blood Type</div>
            <div style={{ color: 'white', fontSize: '2rem', fontWeight: 700 }}>{info.bloodType}</div>
          </div>
        </div>

        {/* Code Status */}
        <div style={{ background: info.dnr ? 'rgba(232,116,97,0.2)' : 'rgba(79,209,197,0.15)', border: `2px solid ${info.dnr ? 'rgba(232,116,97,0.5)' : 'rgba(79,209,197,0.4)'}`, borderRadius: 16, padding: '16px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Shield size={28} color={info.dnr ? CORAL : '#4FD1C5'} />
          <div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Code Status</div>
            <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700 }}>
              {info.dnr ? '⚠️ DNR' : 'FULL CODE'}
            </div>
          </div>
        </div>

        {/* Critical Alerts */}
        {info.notes && (
          <div style={{ background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={18} color="#FBBF24" />
              <span style={{ color: '#FBBF24', fontWeight: 700, fontSize: '0.875rem' }}>CRITICAL ALERTS</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>{info.notes}</p>
          </div>
        )}

        {/* Allergies */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={18} color={CORAL_LIGHT} />
            <span style={{ color: CORAL_LIGHT, fontWeight: 700, fontSize: '0.875rem' }}>ALLERGIES</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
            {info.allergies.map((allergy, idx) => (
              <span key={idx} style={{ padding: '8px 16px', background: 'rgba(232,116,97,0.2)', border: '1px solid rgba(232,116,97,0.3)', borderRadius: 24, color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>
                ⚠️ {allergy}
              </span>
            ))}
          </div>
        </div>

        {/* Critical Medications */}
        {criticalMeds.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Pill size={18} color="#FBBF24" />
              <span style={{ color: '#FBBF24', fontWeight: 700, fontSize: '0.875rem' }}>HIGH-RISK MEDICATIONS</span>
            </div>
            {criticalMeds.map((med, idx) => (
              <div key={idx} style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 12, marginBottom: idx < criticalMeds.length - 1 ? 8 : 0 }}>
                <div style={{ color: 'white', fontWeight: 600 }}>{med.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>{med.dosage} • {med.frequency}</div>
              </div>
            ))}
          </div>
        )}

        {/* Implants */}
        {info.implants.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Syringe size={18} color="#FBBF24" />
              <span style={{ color: '#FBBF24', fontWeight: 700, fontSize: '0.875rem' }}>IMPLANTS / DEVICES</span>
            </div>
            {info.implants.map((implant, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'rgba(255,255,255,0.85)' }}>
                <AlertCircle size={16} style={{ marginTop: 3, flexShrink: 0, color: '#FBBF24' }} />
                <span style={{ fontWeight: 500 }}>{implant}</span>
              </div>
            ))}
          </div>
        )}

        {/* Emergency Contacts — quick-dial */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Phone size={18} color="#4FD1C5" />
            <span style={{ color: '#4FD1C5', fontWeight: 700, fontSize: '0.875rem' }}>EMERGENCY CONTACTS</span>
          </div>
          {info.emergencyContacts.map((contact, idx) => (
            <a key={idx} href={`tel:${contact.phone.replace(/\D/g, '')}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(79,209,197,0.1)', borderRadius: 12, padding: 12, marginBottom: idx < info.emergencyContacts.length - 1 ? 8 : 0, textDecoration: 'none' }}>
              <div>
                <div style={{ color: 'white', fontWeight: 600 }}>
                  {contact.name}
                  {contact.isPrimary && <span style={{ marginLeft: 8, padding: '2px 8px', background: 'rgba(79,209,197,0.2)', color: '#4FD1C5', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 }}>PRIMARY</span>}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{contact.relationship}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4FD1C5', fontWeight: 700, fontSize: '0.9rem' }}>
                <Phone size={16} />
                {contact.phone}
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Fixed bottom: Unlock Full Chart */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', paddingBottom: 24, background: 'linear-gradient(transparent, #0C3547 30%)' }}>
        <button
          onClick={onRequestFullAccess}
          style={{ width: '100%', padding: '16px 0', background: CORAL, color: 'white', borderRadius: 16, fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 20px rgba(232,116,97,0.4)' }}
        >
          <Lock size={18} />
          Unlock Full Medical Chart
          <ChevronRight size={18} />
        </button>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', marginTop: 8 }}>
          Requires first responder identification + photo
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// Stage 2: Responder Identification (Name + Badge + Photo)
// =============================================================================

const ResponderIdentification: React.FC<{
  onSuccess: () => void;
  onCaptureFace: () => Promise<void>;
}> = ({ onSuccess, onCaptureFace }) => {
  const [responderName, setResponderName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [agency, setAgency] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = responderName.trim().length > 1 && badgeNumber.trim().length > 1;

  const handleAccess = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try { await onCaptureFace(); } catch { /* continue */ }
    console.log('🔐 Emergency access by first responder:', {
      name: responderName, badgeNumber, agency,
      timestamp: new Date().toISOString(),
    });
    setTimeout(onSuccess, 800);
  };

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, #0C3547, #0C4C5E)`, fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', padding: 24 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', paddingTop: 32, marginBottom: 32 }}>
        <div style={{ width: 72, height: 72, background: CORAL, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Lock size={32} color="white" />
        </div>
        <h1 style={{ color: 'white', fontSize: '1.375rem', fontWeight: 700, margin: '0 0 4px 0' }}>FULL CHART ACCESS</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0 }}>First responder identification required</p>
      </div>

      {/* Form */}
      <div style={{ maxWidth: 380, margin: '0 auto', width: '100%', flex: 1 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Full Name *</label>
          <input type="text" value={responderName} onChange={(e) => setResponderName(e.target.value)} placeholder="Enter your full name" autoFocus
            style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: 'white', fontSize: '1rem', fontWeight: 500, outline: 'none', boxSizing: 'border-box' as const }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Badge / ID Number *</label>
          <input type="text" value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} placeholder="Enter badge or ID number"
            style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: 'white', fontSize: '1rem', fontWeight: 500, outline: 'none', boxSizing: 'border-box' as const }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Agency / Department</label>
          <input type="text" value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="Fire dept, EMS, Police, etc."
            style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: 'white', fontSize: '1rem', fontWeight: 500, outline: 'none', boxSizing: 'border-box' as const }} />
        </div>

        <button onClick={handleAccess} disabled={!canSubmit || submitting}
          style={{ width: '100%', padding: '16px 0', background: canSubmit && !submitting ? CORAL : 'rgba(255,255,255,0.1)', color: 'white', borderRadius: 14, fontWeight: 700, fontSize: '1rem', border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: canSubmit ? '0 4px 20px rgba(232,116,97,0.3)' : 'none' }}>
          {submitting ? (
            <><Camera size={18} /> Capturing photo & granting access...</>
          ) : (
            <><Shield size={18} /> ACCESS FULL MEDICAL CHART</>
          )}
        </button>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginBottom: 4 }}>
          <Camera size={13} /> A photo is automatically captured for security
        </div>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', margin: 0 }}>
          All access is logged with timestamp, location, and responder ID
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// Stage 3: Full Medical Chart Display
// =============================================================================

const FullMedicalChart: React.FC<{
  info: MedicalInfo;
  accessTime: Date;
}> = ({ info, accessTime }) => {
  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, #0C3547, #0C4C5E)`, fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: CORAL, padding: '16px 20px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={22} color={CORAL} />
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>FULL MEDICAL CHART</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', margin: 0 }}>
              {info.patientName} • {info.age}yo • DOB: {info.dateOfBirth}
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Quick stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div style={{ background: 'rgba(232,116,97,0.15)', border: '1px solid rgba(232,116,97,0.3)', borderRadius: 14, padding: '12px 0', textAlign: 'center' }}>
            <Droplets size={20} color={CORAL_LIGHT} style={{ margin: '0 auto 4px' }} />
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase' as const }}>Blood Type</div>
            <div style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700 }}>{info.bloodType}</div>
          </div>
          <div style={{ background: info.dnr ? 'rgba(232,116,97,0.15)' : 'rgba(79,209,197,0.12)', border: `1px solid ${info.dnr ? 'rgba(232,116,97,0.3)' : 'rgba(79,209,197,0.3)'}`, borderRadius: 14, padding: '12px 0', textAlign: 'center' }}>
            <Shield size={20} color={info.dnr ? CORAL_LIGHT : '#4FD1C5'} style={{ margin: '0 auto 4px' }} />
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase' as const }}>Status</div>
            <div style={{ color: 'white', fontSize: '1rem', fontWeight: 700 }}>{info.dnr ? 'DNR' : 'Full Code'}</div>
          </div>
          <div style={{ background: 'rgba(79,209,197,0.12)', border: '1px solid rgba(79,209,197,0.3)', borderRadius: 14, padding: '12px 0', textAlign: 'center' }}>
            <Activity size={20} color="#4FD1C5" style={{ margin: '0 auto 4px' }} />
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase' as const }}>Meds</div>
            <div style={{ color: 'white', fontSize: '1rem', fontWeight: 700 }}>{info.medications.length} active</div>
          </div>
        </div>

        {/* Critical Notes */}
        {info.notes && (
          <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, padding: 14, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <AlertTriangle size={16} color="#FBBF24" />
              <span style={{ color: '#FBBF24', fontWeight: 700, fontSize: '0.8rem' }}>CRITICAL NOTES</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>{info.notes}</p>
          </div>
        )}

        {/* Allergies */}
        <SectionCard title="ALLERGIES" icon={<AlertTriangle size={16} color={CORAL_LIGHT} />} titleColor={CORAL_LIGHT}>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {info.allergies.map((a, i) => (
              <span key={i} style={{ padding: '6px 14px', background: 'rgba(232,116,97,0.15)', border: '1px solid rgba(232,116,97,0.25)', borderRadius: 20, color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>⚠️ {a}</span>
            ))}
          </div>
        </SectionCard>

        {/* Medical Conditions */}
        <SectionCard title="MEDICAL CONDITIONS" icon={<FileText size={16} color="#93C5FD" />} titleColor="#93C5FD">
          {info.conditions.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: '#93C5FD', flexShrink: 0 }} />
              {c}
            </div>
          ))}
        </SectionCard>

        {/* All Medications */}
        <SectionCard title="CURRENT MEDICATIONS" icon={<Pill size={16} color="#4FD1C5" />} titleColor="#4FD1C5">
          {info.medications.map((med, i) => (
            <div key={i} style={{ background: med.critical ? 'rgba(232,116,97,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${med.critical ? 'rgba(232,116,97,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: 10, marginBottom: i < info.medications.length - 1 ? 6 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {med.critical && <AlertTriangle size={14} color={CORAL} />}
                <span style={{ color: 'white', fontWeight: 600 }}>{med.name}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: 2 }}>{med.dosage} • {med.frequency}</div>
            </div>
          ))}
        </SectionCard>

        {/* Implants */}
        {info.implants.length > 0 && (
          <SectionCard title="IMPLANTS / DEVICES" icon={<Syringe size={16} color="#FBBF24" />} titleColor="#FBBF24">
            {info.implants.map((imp, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'rgba(255,255,255,0.85)' }}>
                <AlertCircle size={16} color="#FBBF24" style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontWeight: 500 }}>{imp}</span>
              </div>
            ))}
          </SectionCard>
        )}

        {/* Emergency Contacts */}
        <SectionCard title="EMERGENCY CONTACTS" icon={<Phone size={16} color="#4FD1C5" />} titleColor="#4FD1C5">
          {info.emergencyContacts.map((contact, i) => (
            <a key={i} href={`tel:${contact.phone.replace(/\D/g, '')}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(79,209,197,0.08)', borderRadius: 10, padding: 12, marginBottom: i < info.emergencyContacts.length - 1 ? 6 : 0, textDecoration: 'none' }}>
              <div>
                <div style={{ color: 'white', fontWeight: 600 }}>
                  {contact.name}
                  {contact.isPrimary && <span style={{ marginLeft: 6, fontSize: '0.65rem', padding: '1px 6px', background: 'rgba(79,209,197,0.2)', color: '#4FD1C5', borderRadius: 4, fontWeight: 700 }}>PRIMARY</span>}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>{contact.relationship}</div>
              </div>
              <div style={{ color: '#4FD1C5', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone size={14} /> {contact.phone}
              </div>
            </a>
          ))}
        </SectionCard>

        {/* Physician */}
        <SectionCard title="PRIMARY PHYSICIAN" icon={<User size={16} color="#93C5FD" />} titleColor="#93C5FD">
          <a href={`tel:${info.physicianPhone.replace(/\D/g, '')}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(147,197,253,0.08)', borderRadius: 10, padding: 12, textDecoration: 'none' }}>
            <div>
              <div style={{ color: 'white', fontWeight: 600 }}>{info.physicianName}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>Primary Care Physician</div>
            </div>
            <div style={{ color: '#93C5FD', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Phone size={14} /> {info.physicianPhone}
            </div>
          </a>
        </SectionCard>

        {/* Directives */}
        <SectionCard title="MEDICAL DIRECTIVES" icon={<Shield size={16} color="#C4B5FD" />} titleColor="#C4B5FD">
          {[
            { label: 'Organ Donor', value: info.organDonor },
            { label: 'Advance Directive on File', value: info.advanceDirective },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{item.label}</span>
              <span style={{ color: item.value ? '#4FD1C5' : 'rgba(255,255,255,0.3)', fontWeight: 700 }}>{item.value ? '✓ YES' : 'No'}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>DNR Order</span>
            <span style={{ color: info.dnr ? CORAL : 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: info.dnr ? '1rem' : undefined }}>
              {info.dnr ? '⚠️ YES - DNR' : 'No - Full Code'}
            </span>
          </div>
        </SectionCard>

        {/* Insurance */}
        {info.insuranceProvider && (
          <SectionCard title="INSURANCE" icon={<FileText size={16} color="rgba(255,255,255,0.5)" />} titleColor="rgba(255,255,255,0.6)">
            <div style={{ color: 'white', fontWeight: 600 }}>{info.insuranceProvider}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>ID: {info.insuranceId}</div>
          </SectionCard>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginBottom: 4 }}>
            <Camera size={13} /> Access photo captured for security
          </div>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', margin: 0 }}>
            ATTENDING AI Emergency Medical Access • {accessTime.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Section Card Helper
// =============================================================================

const SectionCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  titleColor: string;
  children: React.ReactNode;
}> = ({ title, icon, titleColor, children }) => (
  <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, marginBottom: 10 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      {icon}
      <span style={{ color: titleColor, fontWeight: 700, fontSize: '0.8rem', letterSpacing: 0.5 }}>{title}</span>
    </div>
    {children}
  </div>
);

// =============================================================================
// Main Emergency Access Page
// =============================================================================

export default function EmergencyAccessPage() {
  const router = useRouter();
  const { mode } = router.query;

  // Stages: countdown → vitals → identify → fullchart
  const [stage, setStage] = useState<'countdown' | 'vitals' | 'identify' | 'fullchart'>('vitals');
  const [accessTime, setAccessTime] = useState<Date>(new Date());

  useEffect(() => {
    if (mode === 'crash') setStage('countdown');
    else if (mode === 'preview') { setStage('fullchart'); setAccessTime(new Date()); }
  }, [mode]);

  const captureFacePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      stream.getTracks().forEach((t) => t.stop());

      let location;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch { /* location not available */ }

      console.log('🔐 Emergency access logged:', {
        timestamp: new Date().toISOString(),
        imageData: `[CAPTURED - ${(imageData.length / 1024).toFixed(1)}KB]`,
        location, userAgent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Failed to capture photo:', error);
    }
  };

  return (
    <>
      <Head>
        <title>Emergency Medical Access | ATTENDING AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content={CORAL} />
      </Head>

      {stage === 'countdown' && (
        <CountdownScreen seconds={30} onCancel={() => router.push('/home')} onExpire={() => setStage('vitals')} />
      )}

      {stage === 'vitals' && (
        <QuickVitalInfo info={mockMedicalInfo} onRequestFullAccess={() => setStage('identify')} />
      )}

      {stage === 'identify' && (
        <ResponderIdentification
          onSuccess={() => { setAccessTime(new Date()); setStage('fullchart'); }}
          onCaptureFace={captureFacePhoto}
        />
      )}

      {stage === 'fullchart' && (
        <FullMedicalChart info={mockMedicalInfo} accessTime={accessTime} />
      )}
    </>
  );
}
