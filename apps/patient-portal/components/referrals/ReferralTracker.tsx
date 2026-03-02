// ============================================================
// ATTENDING AI — Patient Referral Tracker
// apps/patient-portal/components/referrals/ReferralTracker.tsx
//
// Patient-facing referral tracking with:
// - Package-tracking style timeline (real-time status)
// - Specialist contact info prominently displayed
// - Prior authorization status with appeal flow
// - Simple, no-jargon language
// - Satisfying completion states
// ============================================================

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Calendar,
  FileText,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Navigation,
  Shield,
  X,
  Copy,
  Star,
  Sparkles,
  Info,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

export type ReferralStepStatus = 'completed' | 'current' | 'upcoming' | 'denied';

export interface ReferralStep {
  id: string;
  label: string;
  description: string;
  status: ReferralStepStatus;
  timestamp?: string;
  detail?: string;
}

export interface SpecialistInfo {
  name: string;
  specialty: string;
  practice: string;
  phone: string;
  fax?: string;
  address: string;
  distance?: string;
  rating?: number;
  nextAvailable?: string;
  acceptingNewPatients: boolean;
  languages?: string[];
  photo?: string;
}

export interface ReferralData {
  id: string;
  specialty: string;
  reason: string;
  urgency: 'routine' | 'urgent' | 'stat';
  status: 'submitted' | 'auth-pending' | 'auth-approved' | 'auth-denied' | 'scheduled' | 'completed' | 'cancelled';
  referredBy: string;
  referralDate: string;
  appointmentDate?: string;
  appointmentTime?: string;
  specialist: SpecialistInfo;
  steps: ReferralStep[];
  authRequired: boolean;
  authStatus?: 'pending' | 'approved' | 'denied';
  authDenialReason?: string;
  insuranceInfo?: string;
  notes?: string;
}

// ============================================================
// Mock Data
// ============================================================

export const MOCK_REFERRALS: ReferralData[] = [
  {
    id: 'ref-001',
    specialty: 'Cardiology',
    reason: 'Follow-up for elevated blood pressure and abnormal ECG findings',
    urgency: 'routine',
    status: 'scheduled',
    referredBy: 'Dr. Sarah Chen',
    referralDate: '2026-02-15',
    appointmentDate: '2026-03-18',
    appointmentTime: '10:30 AM',
    authRequired: true,
    authStatus: 'approved',
    insuranceInfo: 'Medicare Part B — No copay for this visit',
    specialist: {
      name: 'Dr. James Mitchell',
      specialty: 'Cardiology',
      practice: 'Mountain Heart Associates',
      phone: '(555) 234-8901',
      fax: '(555) 234-8902',
      address: '450 Valley Medical Pkwy, Suite 200, Elk Creek, CO 80432',
      distance: '12 miles',
      rating: 4.8,
      nextAvailable: 'March 18, 2026',
      acceptingNewPatients: true,
      languages: ['English', 'Spanish'],
    },
    steps: [
      { id: 's1', label: 'Referral Submitted', description: 'Your provider sent the referral', status: 'completed', timestamp: 'Feb 15, 2026', detail: 'Sent by Dr. Sarah Chen' },
      { id: 's2', label: 'Insurance Review', description: 'Your insurance approved this visit', status: 'completed', timestamp: 'Feb 18, 2026', detail: 'Prior authorization approved' },
      { id: 's3', label: 'Specialist Received', description: 'The specialist has your information', status: 'completed', timestamp: 'Feb 19, 2026' },
      { id: 's4', label: 'Appointment Scheduled', description: 'Your visit is confirmed', status: 'current', timestamp: 'Mar 18, 2026 at 10:30 AM' },
      { id: 's5', label: 'Visit Complete', description: 'Results sent to your provider', status: 'upcoming' },
    ],
  },
  {
    id: 'ref-002',
    specialty: 'Endocrinology',
    reason: 'Diabetes management — A1C trending up',
    urgency: 'routine',
    status: 'auth-pending',
    referredBy: 'Dr. Sarah Chen',
    referralDate: '2026-02-28',
    authRequired: true,
    authStatus: 'pending',
    insuranceInfo: 'Medicare Part B',
    specialist: {
      name: 'Dr. Priya Patel',
      specialty: 'Endocrinology',
      practice: 'Valley Diabetes & Thyroid Center',
      phone: '(555) 345-6789',
      address: '780 Health Center Dr, Pine Ridge, CO 80451',
      distance: '28 miles',
      rating: 4.9,
      nextAvailable: 'Pending authorization',
      acceptingNewPatients: true,
      languages: ['English', 'Hindi'],
    },
    steps: [
      { id: 's1', label: 'Referral Submitted', description: 'Your provider sent the referral', status: 'completed', timestamp: 'Feb 28, 2026' },
      { id: 's2', label: 'Insurance Review', description: 'Waiting for your insurance to approve', status: 'current', detail: 'Usually takes 3-5 business days' },
      { id: 's3', label: 'Specialist Received', description: 'Specialist will receive your info', status: 'upcoming' },
      { id: 's4', label: 'Appointment Scheduled', description: 'You\'ll pick a date and time', status: 'upcoming' },
      { id: 's5', label: 'Visit Complete', description: 'Results sent to your provider', status: 'upcoming' },
    ],
  },
  {
    id: 'ref-003',
    specialty: 'Orthopedics',
    reason: 'MRI follow-up for right knee pain',
    urgency: 'routine',
    status: 'auth-denied',
    referredBy: 'Dr. Sarah Chen',
    referralDate: '2026-02-10',
    authRequired: true,
    authStatus: 'denied',
    authDenialReason: 'Insurance requires 6 weeks of physical therapy before specialist referral.',
    insuranceInfo: 'Medicare Advantage — Aetna',
    specialist: {
      name: 'Dr. Robert Alvarez',
      specialty: 'Orthopedic Surgery',
      practice: 'Rocky Mountain Orthopedics',
      phone: '(555) 456-7890',
      address: '1200 Summit Blvd, Suite 310, Eagle, CO 80631',
      distance: '45 miles',
      rating: 4.7,
      nextAvailable: 'Pending authorization',
      acceptingNewPatients: true,
    },
    steps: [
      { id: 's1', label: 'Referral Submitted', description: 'Your provider sent the referral', status: 'completed', timestamp: 'Feb 10, 2026' },
      { id: 's2', label: 'Insurance Review', description: 'Your insurance did not approve this visit', status: 'denied', timestamp: 'Feb 14, 2026', detail: 'See details below' },
      { id: 's3', label: 'Specialist Received', description: 'On hold until insurance approves', status: 'upcoming' },
      { id: 's4', label: 'Appointment Scheduled', description: 'On hold', status: 'upcoming' },
      { id: 's5', label: 'Visit Complete', description: 'On hold', status: 'upcoming' },
    ],
  },
  {
    id: 'ref-004',
    specialty: 'Dermatology',
    reason: 'Skin check — suspicious mole on left shoulder',
    urgency: 'urgent',
    status: 'completed',
    referredBy: 'Dr. Sarah Chen',
    referralDate: '2026-01-20',
    appointmentDate: '2026-02-03',
    appointmentTime: '2:00 PM',
    authRequired: false,
    specialist: {
      name: 'Dr. Lisa Chang',
      specialty: 'Dermatology',
      practice: 'Clear Skin Dermatology',
      phone: '(555) 567-8901',
      address: '320 Main St, Elk Creek, CO 80432',
      distance: '3 miles',
      rating: 4.6,
      nextAvailable: 'N/A',
      acceptingNewPatients: true,
    },
    steps: [
      { id: 's1', label: 'Referral Submitted', description: 'Your provider sent the referral', status: 'completed', timestamp: 'Jan 20, 2026' },
      { id: 's2', label: 'Specialist Received', description: 'Specialist received your info', status: 'completed', timestamp: 'Jan 21, 2026' },
      { id: 's3', label: 'Appointment Scheduled', description: 'Your visit was confirmed', status: 'completed', timestamp: 'Feb 3, 2026 at 2:00 PM' },
      { id: 's4', label: 'Visit Complete', description: 'All clear — results sent to Dr. Chen', status: 'completed', timestamp: 'Feb 3, 2026', detail: 'Benign. Follow up in 12 months.' },
    ],
  },
];

// ============================================================
// Sub-Components
// ============================================================

function StatusBadge({ status }: { status: ReferralData['status'] }) {
  const config: Record<ReferralData['status'], { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    submitted: { label: 'Submitted', bg: 'bg-blue-50', text: 'text-blue-700', icon: <Clock className="w-3.5 h-3.5" /> },
    'auth-pending': { label: 'Insurance Review', bg: 'bg-amber-50', text: 'text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
    'auth-approved': { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    'auth-denied': { label: 'Action Needed', bg: 'bg-red-50', text: 'text-red-700', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    scheduled: { label: 'Scheduled', bg: 'bg-teal-50', text: 'text-teal-700', icon: <Calendar className="w-3.5 h-3.5" /> },
    completed: { label: 'Completed', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    cancelled: { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-500', icon: <X className="w-3.5 h-3.5" /> },
  };

  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function TimelineStep({ step, isLast }: { step: ReferralStep; isLast: boolean }) {
  const dotColor = {
    completed: 'bg-emerald-500',
    current: 'bg-teal-500 ring-4 ring-teal-100',
    upcoming: 'bg-gray-200',
    denied: 'bg-red-500',
  }[step.status];

  const lineColor = step.status === 'completed' ? 'bg-emerald-300' : 'bg-gray-200';
  const textColor = step.status === 'upcoming' ? 'text-gray-400' : 'text-gray-900';

  return (
    <div className="flex gap-4">
      {/* Timeline column */}
      <div className="flex flex-col items-center">
        <div className={`w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 ${dotColor}`}>
          {step.status === 'completed' && (
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          )}
        </div>
        {!isLast && <div className={`w-0.5 flex-1 mt-1.5 mb-1.5 rounded-full ${lineColor}`} />}
      </div>

      {/* Content */}
      <div className={`pb-6 flex-1 ${isLast ? 'pb-0' : ''}`}>
        <div className={`text-sm font-semibold ${textColor}`}>{step.label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{step.description}</div>
        {step.timestamp && step.status !== 'upcoming' && (
          <div className="text-xs text-gray-400 mt-1">{step.timestamp}</div>
        )}
        {step.detail && step.status !== 'upcoming' && (
          <div className={`mt-1.5 text-xs px-2.5 py-1.5 rounded-lg ${
            step.status === 'denied' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'
          }`}>
            {step.detail}
          </div>
        )}
      </div>
    </div>
  );
}

function SpecialistCard({ specialist }: { specialist: SpecialistInfo }) {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
            {specialist.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-gray-900">{specialist.name}</div>
            <div className="text-xs text-gray-500">{specialist.specialty}</div>
            <div className="text-xs text-gray-400">{specialist.practice}</div>
          </div>
          {specialist.rating && (
            <div className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {specialist.rating}
            </div>
          )}
        </div>

        {specialist.languages && specialist.languages.length > 1 && (
          <div className="flex items-center gap-1.5 mb-3">
            <MessageCircle className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">Speaks: {specialist.languages.join(', ')}</span>
          </div>
        )}

        {specialist.acceptingNewPatients && (
          <div className="flex items-center gap-1.5 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-medium">Accepting new patients</span>
          </div>
        )}
      </div>

      {/* Action buttons — big, easy to tap */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => handleCopy(specialist.phone, 'phone')}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-teal-600" />
            <div className="text-left">
              <div className="text-sm font-semibold text-gray-900">{specialist.phone}</div>
              <div className="text-xs text-gray-400">Tap to copy</div>
            </div>
          </div>
          {copied === 'phone' ? (
            <span className="text-xs text-emerald-600 font-medium">Copied!</span>
          ) : (
            <Copy className="w-4 h-4 text-gray-300" />
          )}
        </button>

        <div className="border-t border-gray-50" />

        <button
          onClick={() => handleCopy(specialist.address, 'address')}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-teal-600" />
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900 leading-snug">{specialist.address}</div>
              {specialist.distance && (
                <div className="text-xs text-gray-400 mt-0.5">{specialist.distance} from you</div>
              )}
            </div>
          </div>
          {copied === 'address' ? (
            <span className="text-xs text-emerald-600 font-medium">Copied!</span>
          ) : (
            <Navigation className="w-4 h-4 text-gray-300" />
          )}
        </button>
      </div>
    </div>
  );
}

function DenialAppealSection({
  reason,
  referralId,
}: {
  reason: string;
  referralId: string;
}) {
  const [showingAppealInfo, setShowingAppealInfo] = useState(false);

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-bold text-red-800">Insurance Did Not Approve</div>
          <p className="text-sm text-red-700 mt-1 leading-relaxed">{reason}</p>
        </div>
      </div>

      <div className="text-sm font-semibold text-gray-900 mb-2 mt-4">What you can do:</div>

      <div className="space-y-2">
        <button className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-red-100 hover:border-red-200 active:bg-red-50 transition-colors text-left">
          <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
            <Phone className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">Call Your Insurance</div>
            <div className="text-xs text-gray-500">Ask about their requirements</div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>

        <button className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-red-100 hover:border-red-200 active:bg-red-50 transition-colors text-left">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">File an Appeal</div>
            <div className="text-xs text-gray-500">Your provider can help with this</div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>

        <button className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-red-100 hover:border-red-200 active:bg-red-50 transition-colors text-left">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-900">Message Your Provider</div>
            <div className="text-xs text-gray-500">Dr. Chen can discuss next steps</div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>
      </div>

      <button
        onClick={() => setShowingAppealInfo(!showingAppealInfo)}
        className="mt-3 flex items-center gap-1.5 text-xs text-red-600 font-medium"
      >
        <Info className="w-3.5 h-3.5" />
        {showingAppealInfo ? 'Hide' : 'Learn about'} the appeal process
      </button>

      {showingAppealInfo && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-red-100 text-xs text-gray-600 leading-relaxed space-y-2">
          <p>
            <span className="font-semibold text-gray-900">You have the right to appeal.</span> Your
            insurance must review their decision if you or your provider asks them to.
          </p>
          <p>
            <span className="font-semibold text-gray-900">How it works:</span> Your provider writes a
            letter explaining why this referral is medically necessary. The insurance company then has
            30 days to respond (72 hours for urgent cases).
          </p>
          <p>
            <span className="font-semibold text-gray-900">Need help?</span> Message your provider
            through this app or call the clinic at (555) 234-5678. We handle the paperwork.
          </p>
        </div>
      )}
    </div>
  );
}

function CompletedBanner() {
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-200">
        <CheckCircle2 className="w-7 h-7 text-white" />
      </div>
      <div className="text-base font-bold text-gray-900">Visit Complete</div>
      <p className="text-sm text-gray-500 mt-1">
        Results have been sent to your primary care provider.
      </p>
    </div>
  );
}

// ============================================================
// Referral Detail View
// ============================================================

export function ReferralDetail({ referral, onBack }: { referral: ReferralData; onBack: () => void }) {
  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
      >
        <ArrowLeft className="w-4 h-4" />
        All Referrals
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{referral.specialty}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{referral.reason}</p>
          </div>
          <StatusBadge status={referral.status} />
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span>Referred by {referral.referredBy}</span>
          <span>&bull;</span>
          <span>{referral.referralDate}</span>
        </div>

        {referral.insuranceInfo && (
          <div className="mt-3 flex items-center gap-2 text-xs px-3 py-2 bg-blue-50 rounded-lg text-blue-700">
            <Shield className="w-3.5 h-3.5" />
            {referral.insuranceInfo}
          </div>
        )}

        {/* Appointment banner if scheduled */}
        {referral.appointmentDate && referral.status !== 'completed' && (
          <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-teal-800">
                  {new Date(referral.appointmentDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-xs text-teal-600">{referral.appointmentTime}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Completed banner */}
      {referral.status === 'completed' && <CompletedBanner />}

      {/* Denial + Appeal section */}
      {referral.authStatus === 'denied' && referral.authDenialReason && (
        <DenialAppealSection reason={referral.authDenialReason} referralId={referral.id} />
      )}

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Referral Progress</h3>
        {referral.steps.map((step, i) => (
          <TimelineStep key={step.id} step={step} isLast={i === referral.steps.length - 1} />
        ))}
      </div>

      {/* Specialist info */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-2">Your Specialist</h3>
        <SpecialistCard specialist={referral.specialist} />
      </div>

      {/* Help section */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Need help?</div>
        <div className="space-y-2">
          <Link
            href="/messages?to=provider"
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-teal-200 active:bg-gray-50 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-medium text-gray-900">Message your care team</span>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
          </Link>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
            <Phone className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-medium text-gray-900">Call clinic: (555) 234-5678</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Referral List Card
// ============================================================

function ReferralListCard({
  referral,
  onSelect,
}: {
  referral: ReferralData;
  onSelect: () => void;
}) {
  const needsAction = referral.status === 'auth-denied';
  const isActive = !['completed', 'cancelled'].includes(referral.status);

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left bg-white rounded-xl border p-4 transition-all hover:shadow-sm active:bg-gray-50 ${
        needsAction ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900">{referral.specialty}</div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">{referral.specialist.name} — {referral.specialist.practice}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
      </div>

      <div className="flex items-center justify-between">
        <StatusBadge status={referral.status} />
        {referral.appointmentDate && isActive && (
          <span className="text-xs text-gray-400">
            {new Date(referral.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Progress dots */}
      {isActive && (
        <div className="flex gap-1 mt-3">
          {referral.steps.map(step => (
            <div
              key={step.id}
              className={`h-1 flex-1 rounded-full ${
                step.status === 'completed'
                  ? 'bg-emerald-400'
                  : step.status === 'current'
                    ? 'bg-teal-400'
                    : step.status === 'denied'
                      ? 'bg-red-400'
                      : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      )}
    </button>
  );
}

// ============================================================
// Main Export — ReferralTracker
// ============================================================

export function ReferralTracker() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedReferral = MOCK_REFERRALS.find(r => r.id === selectedId);

  const activeReferrals = MOCK_REFERRALS.filter(r => !['completed', 'cancelled'].includes(r.status));
  const pastReferrals = MOCK_REFERRALS.filter(r => ['completed', 'cancelled'].includes(r.status));
  const actionNeeded = MOCK_REFERRALS.filter(r => r.status === 'auth-denied');

  if (selectedReferral) {
    return <ReferralDetail referral={selectedReferral} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-5">
      {/* Action needed banner */}
      {actionNeeded.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-bold text-red-800">Action Needed</span>
          </div>
          <p className="text-xs text-red-600">
            {actionNeeded.length} referral{actionNeeded.length > 1 ? 's' : ''} need{actionNeeded.length === 1 ? 's' : ''} your attention.
            Tap to see details and your options.
          </p>
        </div>
      )}

      {/* Active referrals */}
      {activeReferrals.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-3">Active Referrals</h2>
          <div className="space-y-3">
            {activeReferrals.map(r => (
              <ReferralListCard key={r.id} referral={r} onSelect={() => setSelectedId(r.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Past referrals */}
      {pastReferrals.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 mb-3">Past Referrals</h2>
          <div className="space-y-3">
            {pastReferrals.map(r => (
              <ReferralListCard key={r.id} referral={r} onSelect={() => setSelectedId(r.id)} />
            ))}
          </div>
        </div>
      )}

      {MOCK_REFERRALS.length === 0 && (
        <div className="text-center py-12">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-gray-300" />
          </div>
          <div className="text-sm font-semibold text-gray-400">No referrals yet</div>
          <p className="text-xs text-gray-400 mt-1">When your provider refers you to a specialist, you&apos;ll track it here.</p>
        </div>
      )}
    </div>
  );
}

export default ReferralTracker;
