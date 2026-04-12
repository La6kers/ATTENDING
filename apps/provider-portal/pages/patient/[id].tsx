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

const labResults = [
  { test: 'WBC', value: '7.2', unit: 'x10^3/uL', range: '4.5-11.0', status: 'Normal', panel: 'CBC' },
  { test: 'Hemoglobin', value: '13.8', unit: 'g/dL', range: '12.0-16.0', status: 'Normal', panel: 'CBC' },
  { test: 'Platelets', value: '245', unit: 'x10^3/uL', range: '150-400', status: 'Normal', panel: 'CBC' },
  { test: 'Glucose', value: '104', unit: 'mg/dL', range: '70-100', status: 'Abnormal', panel: 'CMP' },
  { test: 'BUN', value: '14', unit: 'mg/dL', range: '7-20', status: 'Normal', panel: 'CMP' },
  { test: 'Creatinine', value: '0.9', unit: 'mg/dL', range: '0.6-1.2', status: 'Normal', panel: 'CMP' },
  { test: 'Total Cholesterol', value: '218', unit: 'mg/dL', range: '<200', status: 'Abnormal', panel: 'Lipid Panel' },
  { test: 'LDL', value: '142', unit: 'mg/dL', range: '<100', status: 'Abnormal', panel: 'Lipid Panel' },
  { test: 'HDL', value: '52', unit: 'mg/dL', range: '>40', status: 'Normal', panel: 'Lipid Panel' },
  { test: 'Triglycerides', value: '168', unit: 'mg/dL', range: '<150', status: 'Abnormal', panel: 'Lipid Panel' },
  { test: 'HbA1c', value: '5.8', unit: '%', range: '<5.7', status: 'Abnormal', panel: 'Diabetes' },
  { test: 'TSH', value: '2.4', unit: 'mIU/L', range: '0.4-4.0', status: 'Normal', panel: 'Thyroid' },
  { test: 'Potassium', value: '5.3', unit: 'mEq/L', range: '3.5-5.0', status: 'Critical', panel: 'CMP' },
  { test: 'Sodium', value: '140', unit: 'mEq/L', range: '136-145', status: 'Normal', panel: 'CMP' },
];

const imagingStudies = [
  { date: '03/07/2026', study: 'CT Head without Contrast', ordered: 'Dr. Reed', status: 'Completed', priority: 'STAT', findings: 'No acute intracranial abnormality. No hemorrhage, mass effect, or midline shift. Mild mucosal thickening in bilateral maxillary sinuses.', critical: false },
  { date: '01/15/2026', study: 'Chest X-Ray PA/Lateral', ordered: 'Dr. Reed', status: 'Completed', priority: 'Routine', findings: 'Heart size normal. Lungs are clear bilaterally. No pleural effusion or pneumothorax. No acute cardiopulmonary process.', critical: false },
  { date: '11/02/2025', study: 'MRI Brain with and without Contrast', ordered: 'Dr. Reed', status: 'Completed', priority: 'Urgent', findings: 'CRITICAL: 4mm enhancing lesion in left temporal lobe requires follow-up. No evidence of acute infarction. Scattered T2/FLAIR white matter hyperintensities, nonspecific.', critical: true },
  { date: '08/20/2025', study: 'MRI Lumbar Spine without Contrast', ordered: 'Dr. Kim', status: 'Completed', priority: 'Routine', findings: 'Mild disc desiccation at L4-L5. Small central disc protrusion at L5-S1 without significant canal stenosis. No nerve root compression.', critical: false },
  { date: '05/10/2025', study: 'CT Sinuses without Contrast', ordered: 'Dr. Kim', status: 'Completed', priority: 'Routine', findings: 'Mucosal thickening in bilateral maxillary sinuses and anterior ethmoid air cells consistent with sinusitis. No bony erosion. Ostiomeatal complexes partially opacified bilaterally.', critical: false },
];

const detailedAllergies = [
  { substance: 'Sulfa drugs (Sulfonamides)', type: 'Medication', reaction: 'Maculopapular rash, urticaria', severity: 'Moderate', reported: '03/2018', verified: true, crossReactivity: 'Thiazide diuretics, sulfonylureas, celecoxib — use with caution' },
  { substance: 'Codeine', type: 'Medication', reaction: 'Nausea, vomiting, dizziness', severity: 'Mild', reported: '06/2020', verified: true, crossReactivity: 'Other opioids (morphine, hydrocodone) — possible cross-sensitivity' },
  { substance: 'Latex', type: 'Environmental', reaction: 'Contact dermatitis, skin irritation', severity: 'Mild', reported: '01/2019', verified: true, crossReactivity: 'Bananas, avocados, chestnuts, kiwi — latex-fruit syndrome' },
  { substance: 'Bee venom', type: 'Environmental', reaction: 'Local swelling, erythema extending >10cm', severity: 'Moderate', reported: '08/2017', verified: false, crossReactivity: 'Wasp, hornet stings — potential cross-reactivity' },
  { substance: 'Iodinated contrast dye', type: 'Medication', reaction: 'Flushing, mild bronchospasm', severity: 'Severe', reported: '11/2021', verified: true, crossReactivity: 'Premedication required for future contrast studies (prednisone + diphenhydramine protocol)' },
];

const documents = [
  { date: '03/07/2026', title: 'Emergency Visit Note', type: 'Visit Summary', provider: 'Dr. Reed', status: 'Draft', pages: 3 },
  { date: '01/15/2026', title: 'Annual Physical Exam Summary', type: 'Visit Summary', provider: 'Dr. Reed', status: 'Signed', pages: 5 },
  { date: '01/15/2026', title: 'Lab Order — CBC, CMP, Lipid Panel', type: 'Lab Order', provider: 'Dr. Reed', status: 'Signed', pages: 1 },
  { date: '12/20/2025', title: 'Referral to Neurology — Dr. Patel', type: 'Referral Letter', provider: 'Dr. Reed', status: 'Signed', pages: 2 },
  { date: '11/02/2025', title: 'MRI Brain Authorization', type: 'Insurance Auth', provider: 'BCBS', status: 'Approved', pages: 1 },
  { date: '11/02/2025', title: 'Migraine Follow-up Note', type: 'Visit Summary', provider: 'Dr. Reed', status: 'Signed', pages: 2 },
  { date: '08/20/2025', title: 'Hypertension Management Plan', type: 'Care Plan', provider: 'NP Wilson', status: 'Signed', pages: 3 },
  { date: '06/01/2025', title: 'Informed Consent — MRI with Contrast', type: 'Consent Form', provider: 'Dr. Reed', status: 'Signed', pages: 2 },
  { date: '05/10/2025', title: 'Allergy Consultation Report', type: 'Consult Note', provider: 'Dr. Kim', status: 'Signed', pages: 4 },
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
  // Labs Tab
  // --------------------------------------------------------
  const labStatusColor = (status: string) => {
    if (status === 'Critical') return '#dc2626';
    if (status === 'Abnormal') return COLORS.coral;
    return '#16a34a';
  };

  const labStatusBg = (status: string) => {
    if (status === 'Critical') return '#fee2e2';
    if (status === 'Abnormal') return '#fef2e8';
    return COLORS.paleMint;
  };

  const renderLabs = () => {
    const panels = Array.from(new Set(labResults.map((l) => l.panel)));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Summary banner */}
        <div style={{ ...cardStyle, background: COLORS.paleMint, border: `1px solid ${COLORS.lightTeal}` }}>
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <TestTube style={{ width: 18, height: 18, color: COLORS.primaryTeal }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.deepNavy }}>Lab Collection: 01/15/2026</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>Ordered by Dr. Reed &middot; Fasting specimen</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>{labResults.filter((l) => l.status === 'Normal').length} Normal</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.coral }}>{labResults.filter((l) => l.status === 'Abnormal').length} Abnormal</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>{labResults.filter((l) => l.status === 'Critical').length} Critical</span>
            </div>
          </div>
        </div>

        {/* Results table */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <TestTube style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
            Lab Results — Complete Panel
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: COLORS.paleMint }}>
                  {['Test', 'Result', 'Units', 'Reference Range', 'Panel', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: COLORS.deepNavy, fontSize: 12, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {labResults.map((l, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: l.status === 'Critical' ? '#fef2f2' : 'transparent' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: COLORS.deepNavy }}>{l.test}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: labStatusColor(l.status) }}>{l.value}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{l.unit}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{l.range}</td>
                    <td style={{ padding: '12px 16px', color: COLORS.deepNavy }}>{l.panel}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: labStatusBg(l.status), color: labStatusColor(l.status) }}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // --------------------------------------------------------
  // Imaging Tab
  // --------------------------------------------------------
  const renderImaging = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {imagingStudies.map((s, i) => (
        <div key={i} style={{ ...cardStyle, border: s.critical ? '1px solid #fca5a5' : '1px solid #e2e8f0' }}>
          <div style={{ ...cardHeaderStyle, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ImageIcon style={{ width: 16, height: 16, color: s.critical ? '#dc2626' : COLORS.primaryTeal }} />
              {s.study}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                background: s.priority === 'STAT' ? '#fee2e2' : s.priority === 'Urgent' ? '#fef3c7' : COLORS.paleMint,
                color: s.priority === 'STAT' ? '#dc2626' : s.priority === 'Urgent' ? '#92400e' : COLORS.primaryTeal,
              }}>
                {s.priority}
              </span>
              <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: COLORS.paleMint, color: COLORS.primaryTeal }}>
                {s.status}
              </span>
            </div>
          </div>
          <div style={cardBodyStyle}>
            <div style={{ display: 'flex', gap: 24, marginBottom: 12, fontSize: 12, color: '#64748b' }}>
              <span><strong style={{ color: COLORS.deepNavy }}>Date:</strong> {s.date}</span>
              <span><strong style={{ color: COLORS.deepNavy }}>Ordered by:</strong> {s.ordered}</span>
            </div>
            <div style={{
              padding: 14, borderRadius: 8, fontSize: 13, lineHeight: 1.6,
              background: s.critical ? '#fef2f2' : '#f8fafc',
              border: s.critical ? '1px solid #fca5a5' : '1px solid #e2e8f0',
              color: s.critical ? '#991b1b' : '#475569',
            }}>
              <strong style={{ color: s.critical ? '#dc2626' : COLORS.deepNavy }}>Findings: </strong>
              {s.findings}
            </div>
            {s.critical && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 14px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 600 }}>
                <AlertTriangle style={{ width: 14, height: 14 }} />
                Critical finding — follow-up required. Attending notified on {s.date}.
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // --------------------------------------------------------
  // Documents Tab
  // --------------------------------------------------------
  const docTypeColor = (type: string) => {
    switch (type) {
      case 'Visit Summary': return { bg: COLORS.paleMint, color: COLORS.primaryTeal };
      case 'Lab Order': return { bg: '#eff6ff', color: '#2563eb' };
      case 'Referral Letter': return { bg: '#fef3c7', color: '#92400e' };
      case 'Insurance Auth': return { bg: '#f3e8ff', color: '#7c3aed' };
      case 'Care Plan': return { bg: '#ecfdf5', color: '#059669' };
      case 'Consent Form': return { bg: '#fff7ed', color: '#c2410c' };
      case 'Consult Note': return { bg: '#f0f9ff', color: '#0369a1' };
      default: return { bg: '#f1f5f9', color: '#64748b' };
    }
  };

  const docStatusStyle = (status: string) => {
    if (status === 'Draft') return { bg: '#fef3c7', color: '#92400e' };
    if (status === 'Approved') return { bg: COLORS.paleMint, color: COLORS.primaryTeal };
    return { bg: COLORS.paleMint, color: COLORS.primaryTeal };
  };

  const renderDocuments = () => (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <FolderOpen style={{ width: 16, height: 16, color: COLORS.primaryTeal }} />
        Patient Documents ({documents.length})
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: COLORS.paleMint }}>
              {['Date', 'Document Title', 'Type', 'Provider/Source', 'Pages', 'Status'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: COLORS.deepNavy, fontSize: 12, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {documents.map((d, i) => {
              const tc = docTypeColor(d.type);
              const sc = docStatusStyle(d.status);
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>{d.date}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: COLORS.deepNavy }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText style={{ width: 14, height: 14, color: COLORS.primaryTeal, flexShrink: 0 }} />
                      {d.title}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: tc.bg, color: tc.color, whiteSpace: 'nowrap' }}>
                      {d.type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: COLORS.deepNavy }}>{d.provider}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b', textAlign: 'center' }}>{d.pages}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --------------------------------------------------------
  // Allergies Tab
  // --------------------------------------------------------
  const renderAllergiesTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary banner */}
      <div style={{ ...cardStyle, background: '#fef2f2', border: '1px solid #fca5a5' }}>
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle style={{ width: 18, height: 18, color: '#dc2626' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>{detailedAllergies.length} documented allergies</span>
          <span style={{ fontSize: 12, color: '#991b1b' }}>
            &mdash; {detailedAllergies.filter((a) => a.severity === 'Severe').length} severe, {detailedAllergies.filter((a) => a.severity === 'Moderate').length} moderate, {detailedAllergies.filter((a) => a.severity === 'Mild').length} mild
          </span>
        </div>
      </div>

      {/* Detailed allergy cards */}
      {detailedAllergies.map((a, i) => {
        const sevBg = a.severity === 'Severe' ? '#fee2e2' : a.severity === 'Moderate' ? '#fef2e8' : COLORS.paleMint;
        const sevColor = severityColor(a.severity);
        return (
          <div key={i} style={{ ...cardStyle, border: a.severity === 'Severe' ? '1px solid #fca5a5' : '1px solid #e2e8f0' }}>
            <div style={{ ...cardHeaderStyle, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle style={{ width: 16, height: 16, color: sevColor }} />
                {a.substance}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#f1f5f9', color: '#64748b' }}>
                  {a.type}
                </span>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: sevBg, color: sevColor }}>
                  {a.severity}
                </span>
                {a.verified && (
                  <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: COLORS.paleMint, color: COLORS.primaryTeal }}>
                    Verified
                  </span>
                )}
              </div>
            </div>
            <div style={cardBodyStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>REACTION</div>
                  <div style={{ fontSize: 13, color: COLORS.deepNavy, fontWeight: 500 }}>{a.reaction}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>DATE REPORTED</div>
                  <div style={{ fontSize: 13, color: COLORS.deepNavy, fontWeight: 500 }}>{a.reported}</div>
                </div>
              </div>
              <div style={{ padding: 12, borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a', fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                <strong>Cross-Reactivity Warning:</strong> {a.crossReactivity}
              </div>
            </div>
          </div>
        );
      })}
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
      case 'labs': return renderLabs();
      case 'imaging': return renderImaging();
      case 'visits': return renderVisitHistory();
      case 'documents': return renderDocuments();
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
