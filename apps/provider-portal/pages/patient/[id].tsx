// ============================================================
// ATTENDING AI - Patient Chart Page
// apps/provider-portal/pages/patient/[id].tsx
//
// Deep-dive patient chart page showing the full patient record.
// Accessed from the encounter page via "Review Full Chart".
//
// Created: March 7, 2026
// ============================================================

import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ProviderShell from '../../components/layout/ProviderShell';
import {
  ArrowLeft,
  Printer,
  Edit3,
  User,
  Phone,
  Mail,
  MapPin,
  Shield,
  Heart,
  AlertTriangle,
  Calendar,
  FileText,
  Activity,
  Pill,
  TestTube,
  Eye,
  Clock,
  ChevronDown,
  ChevronRight,
  Droplets,
  Thermometer,
  Wind,
  Scale,
  Image as ImageIcon,
  FolderOpen,
} from 'lucide-react';

// ============================================================
// Brand colors
// ============================================================
const COLORS = {
  deepNavy: '#0C3547',
  primaryTeal: '#1A8FA8',
  lightTeal: '#25B8A9',
  paleMint: '#E6F7F5',
  gold: '#c8a44e',
  coral: '#e07a5f',
};

// ============================================================
// Mock patient data — Sarah Chen
// ============================================================
const patient = {
  name: 'Sarah Chen',
  initials: 'SC',
  dob: '06/15/1991',
  age: 34,
  gender: 'Female',
  bloodType: 'O+',
  insurance: 'Blue Cross',
  phone: '(503) 555-0192',
  email: 'sarah.chen@email.com',
  address: '4521 NE Maple Ave, Portland, OR 97213',
  emergencyContact: { name: 'James Chen', relation: 'Spouse', phone: '(503) 555-0193' },
  primaryCare: 'Dr. Thomas Reed',
  insuranceFull: { carrier: 'Blue Cross Blue Shield', plan: 'PPO', memberId: 'BCB-2024-8847' },
};

const activeProblems = [
  { name: 'Migraine with aura', code: 'G43.109', since: '2019' },
  { name: 'Hypertension, Stage 1', code: 'I10', since: '2023' },
  { name: 'Seasonal allergic rhinitis', code: 'J30.2', since: '2015' },
];

const currentMedications = [
  { name: 'Sumatriptan 100mg', route: 'PO', frequency: 'PRN', purpose: 'For migraine', dose: '100mg', prescriber: 'Dr. Reed', startDate: '03/2019', status: 'Active' },
  { name: 'Lisinopril 10mg', route: 'PO', frequency: 'Daily', purpose: 'For hypertension', dose: '10mg', prescriber: 'Dr. Reed', startDate: '06/2023', status: 'Active' },
  { name: 'Loratadine 10mg', route: 'PO', frequency: 'Daily', purpose: 'For allergies', dose: '10mg', prescriber: 'Dr. Reed', startDate: '04/2015', status: 'Active' },
  { name: 'Oral Contraceptive', route: 'PO', frequency: 'Daily', purpose: 'Contraception', dose: 'N/A', prescriber: 'Dr. Patel', startDate: '01/2018', status: 'Active' },
];

const discontinuedMedications = [
  { name: 'Amoxicillin 500mg', route: 'PO', frequency: 'TID x 10 days', purpose: 'Sinusitis', dose: '500mg', prescriber: 'Dr. Reed', startDate: '09/2024', status: 'Discontinued' },
  { name: 'Ibuprofen 400mg', route: 'PO', frequency: 'PRN', purpose: 'Pain', dose: '400mg', prescriber: 'Dr. Reed', startDate: '01/2020', status: 'Discontinued' },
];

const allergies = [
  { substance: 'Sulfa drugs', reaction: 'Rash', severity: 'Moderate' },
  { substance: 'Codeine', reaction: 'Nausea', severity: 'Mild' },
];

const recentVisits = [
  { date: '03/07/2026', complaint: 'Worst headache of life', provider: 'Dr. Reed', status: 'In Progress', diagnosis: 'Migraine with aura, severe' },
  { date: '01/15/2026', complaint: 'Annual physical', provider: 'Dr. Reed', status: 'Completed', diagnosis: 'Routine exam - no acute findings' },
  { date: '11/02/2025', complaint: 'Migraine follow-up', provider: 'Dr. Reed', status: 'Completed', diagnosis: 'Migraine stable on current regimen' },
  { date: '08/20/2025', complaint: 'BP check', provider: 'NP Wilson', status: 'Completed', diagnosis: 'Hypertension - controlled' },
  { date: '05/10/2025', complaint: 'Allergy consult', provider: 'Dr. Kim', status: 'Completed', diagnosis: 'Seasonal allergic rhinitis' },
];

const recentLabs = [
  { date: '01/15/2026', test: 'CBC', result: 'Normal', flag: '' },
  { date: '01/15/2026', test: 'BMP', result: 'Normal', flag: '' },
  { date: '01/15/2026', test: 'Lipid Panel', result: 'LDL 142', flag: 'High' },
];

const upcomingAppointments = [
  { date: '03/21/2026', description: 'Follow-up with Dr. Reed' },
  { date: '04/15/2026', description: 'Annual eye exam' },
];

const vitalsHistory = [
  { date: '03/07/2026', bp: '148/92', hr: 88, temp: 98.6, rr: 18, spo2: 98, weight: 142, bmi: 23.6, bpHigh: true, hrHigh: false },
  { date: '01/15/2026', bp: '132/84', hr: 74, temp: 98.4, rr: 16, spo2: 99, weight: 140, bmi: 23.3, bpHigh: true, hrHigh: false },
  { date: '11/02/2025', bp: '128/82', hr: 72, temp: 98.2, rr: 16, spo2: 98, weight: 141, bmi: 23.4, bpHigh: false, hrHigh: false },
  { date: '08/20/2025', bp: '124/78', hr: 70, temp: 98.6, rr: 14, spo2: 99, weight: 139, bmi: 23.1, bpHigh: false, hrHigh: false },
  { date: '05/10/2025', bp: '126/80', hr: 76, temp: 98.8, rr: 16, spo2: 97, weight: 138, bmi: 22.9, bpHigh: false, hrHigh: false },
];

// ============================================================
// Tab definitions
// ============================================================
const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'vitals', label: 'Vitals History', icon: Activity },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'allergies', label: 'Allergies', icon: AlertTriangle },
  { id: 'labs', label: 'Lab Results', icon: TestTube },
  { id: 'imaging', label: 'Imaging', icon: ImageIcon },
  { id: 'visits', label: 'Visit History', icon: Clock },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
];

// ============================================================
// Shared style helpers
// ============================================================
const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  overflow: 'hidden',
};

const cardHeaderStyle: React.CSSProperties = {
  padding: '14px 20px',
  borderBottom: '1px solid #e2e8f0',
  fontWeight: 700,
  fontSize: 14,
  color: COLORS.deepNavy,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const cardBodyStyle: React.CSSProperties = {
  padding: '16px 20px',
};

// ============================================================
// Component
// ============================================================
const PatientChartPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState('overview');
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState<number | null>(null);

  // --------------------------------------------------------
  // Render helpers
  // --------------------------------------------------------

  const renderStatPill = (label: string, value: string) => (
    <span
      key={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: 20,
        background: COLORS.paleMint,
        color: COLORS.deepNavy,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <span style={{ color: COLORS.primaryTeal, fontSize: 11, fontWeight: 500 }}>{label}</span>
      {value}
    </span>
  );

  const severityColor = (severity: string) => {
    if (severity === 'Moderate') return COLORS.coral;
    if (severity === 'Severe') return '#dc2626';
    return COLORS.primaryTeal;
  };

  const statusBadge = (status: string) => {
    const isActive = status === 'In Progress';
    return (
      <span
        style={{
          padding: '3px 10px',
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
          background: isActive ? '#fef3c7' : COLORS.paleMint,
          color: isActive ? '#92400e' : COLORS.primaryTeal,
        }}
      >
        {status}
      </span>
    );
  };

  // --------------------------------------------------------
  // Overview Tab
  // --------------------------------------------------------
  const renderOverview = () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20,
      }}
      className="patient-chart-grid"
    >
      {/* Column 1 — Demographics & Contact */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <User style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
            Patient Information
          </div>
          <div style={cardBodyStyle}>
            {[
              ['Full Name', patient.name],
              ['Date of Birth', patient.dob],
              ['Age', `${patient.age}`],
              ['Gender', patient.gender],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>{label}</span>
                <span style={{ color: COLORS.deepNavy, fontSize: 13, fontWeight: 600 }}>{value}</span>
              </div>
            ))}

            <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 700, fontSize: 13, color: COLORS.deepNavy, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone style={{ width: 14, height: 14, color: COLORS.primaryTeal }} /> Contact
            </div>
            {[
              ['Phone', patient.phone],
              ['Email', patient.email],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>{label}</span>
                <span style={{ color: COLORS.deepNavy, fontSize: 13, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b', fontSize: 13 }}>Address</span>
              <span style={{ color: COLORS.deepNavy, fontSize: 13, fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{patient.address}</span>
            </div>

            <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 700, fontSize: 13, color: COLORS.deepNavy, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Heart style={{ width: 14, height: 14, color: COLORS.coral }} /> Emergency Contact
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b', fontSize: 13 }}>{patient.emergencyContact.relation}</span>
              <span style={{ color: COLORS.deepNavy, fontSize: 13, fontWeight: 600 }}>{patient.emergencyContact.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b', fontSize: 13 }}>Phone</span>
              <span style={{ color: COLORS.deepNavy, fontSize: 13, fontWeight: 600 }}>{patient.emergencyContact.phone}</span>
            </div>

            <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 700, fontSize: 13, color: COLORS.deepNavy, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield style={{ width: 14, height: 14, color: COLORS.gold }} /> Insurance & Provider
            </div>
            {[
              ['Primary Care', patient.primaryCare],
              ['Carrier', patient.insuranceFull.carrier],
              ['Plan', patient.insuranceFull.plan],
              ['Member ID', patient.insuranceFull.memberId],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>{label}</span>
                <span style={{ color: COLORS.deepNavy, fontSize: 13, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Column 2 — Medical Summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Active Problems */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Activity style={{ width: 16, height: 16, color: COLORS.coral }} />
            Active Problems
          </div>
          <div style={cardBodyStyle}>
            {activeProblems.map((p, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < activeProblems.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.deepNavy }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{p.code}</div>
                  </div>
                  <span style={{ fontSize: 11, color: COLORS.primaryTeal, fontWeight: 500 }}>Since {p.since}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Medications */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Pill style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
            Current Medications
          </div>
          <div style={cardBodyStyle}>
            {currentMedications.map((m, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < currentMedications.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.deepNavy }}>
                  {m.name} {m.route} {m.frequency}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{m.purpose}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <AlertTriangle style={{ width: 16, height: 16, color: COLORS.coral }} />
            Allergies
          </div>
          <div style={cardBodyStyle}>
            {allergies.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < allergies.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.deepNavy }}>{a.substance}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{a.reaction}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: severityColor(a.severity), background: a.severity === 'Moderate' ? '#fef2e8' : COLORS.paleMint, padding: '3px 10px', borderRadius: 12 }}>
                  {a.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Column 3 — Recent Activity */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Recent Visits */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Clock style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
            Recent Visits
          </div>
          <div style={cardBodyStyle}>
            {recentVisits.map((v, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < recentVisits.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{v.date}</span>
                  {statusBadge(v.status)}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.deepNavy, marginTop: 4 }}>{v.complaint}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{v.provider}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Labs */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <TestTube style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
            Recent Lab Results
          </div>
          <div style={cardBodyStyle}>
            {recentLabs.map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < recentLabs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.deepNavy }}>{l.test}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{l.date}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: l.flag === 'High' ? COLORS.coral : '#16a34a' }}>
                  {l.result} {l.flag && <span style={{ fontSize: 10, fontWeight: 700 }}>({l.flag})</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <Calendar style={{ width: 16, height: 16, color: COLORS.gold }} />
            Upcoming Appointments
          </div>
          <div style={cardBodyStyle}>
            {upcomingAppointments.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < upcomingAppointments.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: COLORS.paleMint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.deepNavy }}>{a.description}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{a.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // --------------------------------------------------------
  // Vitals History Tab
  // --------------------------------------------------------
  const renderVitals = () => (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <Activity style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
        Vitals History
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: COLORS.paleMint }}>
              {['Date', 'BP', 'HR (bpm)', 'Temp (\u00B0F)', 'RR', 'SpO2 (%)', 'Weight (lbs)', 'BMI'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: COLORS.deepNavy, fontSize: 12, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vitalsHistory.map((v, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: COLORS.deepNavy }}>{v.date}</td>
                <td style={{ padding: '12px 16px', color: v.bpHigh ? COLORS.coral : COLORS.deepNavy, fontWeight: v.bpHigh ? 700 : 400 }}>
                  {v.bp} {v.bpHigh && <span style={{ fontSize: 10, color: COLORS.coral }}>(High)</span>}
                </td>
                <td style={{ padding: '12px 16px', color: v.hrHigh ? COLORS.coral : COLORS.deepNavy }}>{v.hr}</td>
                <td style={{ padding: '12px 16px', color: COLORS.deepNavy }}>{v.temp}</td>
                <td style={{ padding: '12px 16px', color: v.rr > 20 ? COLORS.coral : COLORS.deepNavy }}>{v.rr}</td>
                <td style={{ padding: '12px 16px', color: v.spo2 < 95 ? '#2563eb' : COLORS.deepNavy }}>{v.spo2}</td>
                <td style={{ padding: '12px 16px', color: COLORS.deepNavy }}>{v.weight}</td>
                <td style={{ padding: '12px 16px', color: COLORS.deepNavy }}>{v.bmi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --------------------------------------------------------
  // Medications Tab
  // --------------------------------------------------------
  const renderMedications = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Active Medications */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <Pill style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
          Active Medications
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.paleMint }}>
                {['Name', 'Dose', 'Route', 'Frequency', 'Prescriber', 'Start Date', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: COLORS.deepNavy, fontSize: 12, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentMedications.map((m, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: COLORS.deepNavy }}>{m.name}</td>
                  <td style={{ padding: '12px 16px', color: COLORS.deepNavy }}>{m.dose}</td>
                  <td style={{ padding: '12px 16px', color: COLORS.deepNavy }}>{m.route}</td>
                  <td style={{ padding: '12px 16px', color: COLORS.deepNavy }}>{m.frequency}</td>
                  <td style={{ padding: '12px 16px', color: COLORS.deepNavy }}>{m.prescriber}</td>
                  <td style={{ padding: '12px 16px', color: COLORS.deepNavy }}>{m.startDate}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: COLORS.paleMint, color: COLORS.primaryTeal }}>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discontinued Medications */}
      <div style={cardStyle}>
        <div
          style={{ ...cardHeaderStyle, cursor: 'pointer' }}
          onClick={() => setShowDiscontinued(!showDiscontinued)}
        >
          {showDiscontinued ? (
            <ChevronDown style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
          ) : (
            <ChevronRight style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
          )}
          Discontinued Medications ({discontinuedMedications.length})
        </div>
        {showDiscontinued && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Name', 'Dose', 'Route', 'Frequency', 'Prescriber', 'Start Date', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 12, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {discontinuedMedications.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', opacity: 0.7 }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: COLORS.deepNavy }}>{m.name}</td>
                    <td style={{ padding: '12px 16px', color: COLORS.deepNavy }}>{m.dose}</td>
                    <td style={{ padding: '12px 16px', color: COLORS.deepNavy }}>{m.route}</td>
                    <td style={{ padding: '12px 16px', color: COLORS.deepNavy }}>{m.frequency}</td>
                    <td style={{ padding: '12px 16px', color: COLORS.deepNavy }}>{m.prescriber}</td>
                    <td style={{ padding: '12px 16px', color: COLORS.deepNavy }}>{m.startDate}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#fee2e2', color: '#dc2626' }}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reconciliation Notes */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <FileText style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
          Medication Reconciliation Notes
        </div>
        <div style={cardBodyStyle}>
          <textarea
            placeholder="Add medication reconciliation notes..."
            style={{
              width: '100%',
              minHeight: 100,
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 12,
              fontSize: 13,
              color: COLORS.deepNavy,
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>
    </div>
  );

  // --------------------------------------------------------
  // Visit History Tab
  // --------------------------------------------------------
  const renderVisitHistory = () => (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <Clock style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
        Visit History
      </div>
      <div>
        {recentVisits.map((v, i) => (
          <div key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', cursor: 'pointer' }}
              onClick={() => setExpandedVisit(expandedVisit === i ? null : i)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b', minWidth: 90 }}>{v.date}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.deepNavy }}>{v.complaint}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{v.provider}</span>
                {statusBadge(v.status)}
                {expandedVisit === i ? (
                  <ChevronDown style={{ width: 14, height: 14, color: '#94a3b8' }} />
                ) : (
                  <ChevronRight style={{ width: 14, height: 14, color: '#94a3b8' }} />
                )}
              </div>
            </div>
            {expandedVisit === i && (
              <div style={{ padding: '0 20px 16px 20px', background: '#f8fafc' }}>
                <div style={{ padding: 16, borderRadius: 8, background: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.deepNavy, marginBottom: 6 }}>Visit Summary</div>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                    <strong>Chief Complaint:</strong> {v.complaint}<br />
                    <strong>Provider:</strong> {v.provider}<br />
                    <strong>Diagnosis:</strong> {v.diagnosis}<br />
                    <strong>Status:</strong> {v.status}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // --------------------------------------------------------
  // Placeholder tabs
  // --------------------------------------------------------
  const renderPlaceholder = (title: string, icon: React.ReactNode) => (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        {icon}
        {title}
      </div>
      <div style={{ ...cardBodyStyle, textAlign: 'center', padding: '48px 20px' }}>
        <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>
          {title} content will be populated from EHR integration.
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
          Data syncs automatically when connected to your EHR system.
        </div>
      </div>
    </div>
  );

  const renderAllergiesTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <AlertTriangle style={{ width: 16, height: 16, color: COLORS.coral }} />
          Known Allergies
        </div>
        <div style={cardBodyStyle}>
          {allergies.map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < allergies.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.deepNavy }}>{a.substance}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Reaction: {a.reaction}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: severityColor(a.severity), background: a.severity === 'Moderate' ? '#fef2e8' : COLORS.paleMint, padding: '4px 14px', borderRadius: 12 }}>
                {a.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
      {renderPlaceholder('Detailed Allergy History', <AlertTriangle style={{ width: 16, height: 16, color: COLORS.coral }} />)}
    </div>
  );

  // --------------------------------------------------------
  // Tab content router
  // --------------------------------------------------------
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'vitals': return renderVitals();
      case 'medications': return renderMedications();
      case 'allergies': return renderAllergiesTab();
      case 'labs': return renderPlaceholder('Lab Results', <TestTube style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />);
      case 'imaging': return renderPlaceholder('Imaging', <ImageIcon style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />);
      case 'visits': return renderVisitHistory();
      case 'documents': return renderPlaceholder('Documents', <FolderOpen style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />);
      default: return renderOverview();
    }
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <ProviderShell contextBadge="Patient Chart" activePatient={{ name: patient.name, id: id as string }}>
      <Head>
        <title>Patient Chart - Sarah Chen | ATTENDING AI</title>
      </Head>

      <style>{`
        .patient-chart-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        @media (max-width: 1024px) {
          .patient-chart-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 768px) {
          .patient-chart-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 24px 48px' }}>
        {/* ═══════════════════════════════════════════════
            PATIENT HEADER BANNER
            ═══════════════════════════════════════════════ */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            padding: '20px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          {/* Left — Avatar & Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${COLORS.lightTeal} 0%, ${COLORS.primaryTeal} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: 22,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {patient.initials}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.deepNavy }}>{patient.name}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                DOB: {patient.dob} &middot; {patient.gender} &middot; MRN: 2024-SC-0847
              </div>
            </div>
          </div>

          {/* Center — Stat pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {renderStatPill('Age', `${patient.age}`)}
            {renderStatPill('Gender', patient.gender)}
            {renderStatPill('Blood Type', patient.bloodType)}
            {renderStatPill('Insurance', patient.insurance)}
          </div>

          {/* Right — Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push(`/encounter/${id || 'enc-001'}`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft style={{ width: 14, height: 14 }} />
              Back to Encounter
            </button>
            <button
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Printer style={{ width: 14, height: 14 }} />
              Print Chart
            </button>
            <button
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: COLORS.primaryTeal,
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Edit3 style={{ width: 14, height: 14 }} />
              Edit Patient
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            NAVIGATION TABS
            ═══════════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            borderBottom: '2px solid rgba(255,255,255,0.15)',
            marginBottom: 24,
            overflowX: 'auto',
          }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 18px',
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? '#ffffff' : 'rgba(255,255,255,0.55)',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? `3px solid ${COLORS.gold}` : '3px solid transparent',
                  marginBottom: -2,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon style={{ width: 15, height: 15, color: active ? COLORS.gold : 'rgba(255,255,255,0.4)' }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════
            TAB CONTENT
            ═══════════════════════════════════════════════ */}
        {renderTabContent()}
      </div>
    </ProviderShell>
  );
};

export default PatientChartPage;
