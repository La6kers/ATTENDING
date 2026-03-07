// ============================================================
// ATTENDING AI — Messages Tab
// apps/patient-portal/pages/messages/index.tsx
//
// Smart Message Composer:
// Patients tap through guided flows to compose complete
// messages — no typing required for common requests.
// The system builds a structured message with all the
// context a provider needs to respond without follow-up.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  MessageCircle,
  Search,
  PenSquare,
  CheckCheck,
  Paperclip,
  X,
  ChevronRight,
  ChevronLeft,
  Stethoscope,
  Building2,
  FlaskConical,
  Send,
  Pill,
  Calendar,
  Beaker,
  HelpCircle,
  Thermometer,
  RefreshCw,
  FileQuestion,
  Check,
  Star,
  CircleDot,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  PackageCheck,
  PackageX,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { useConversations } from '../../hooks/useMessages';

// ============================================================
// Patient Data (would come from hooks/API in production)
// ============================================================

const PREFERRED_PHARMACY = {
  name: 'Walgreens',
  address: '18366 Lincoln Ave, Parker, CO 80134',
  phone: '(303) 840-9640',
};

const PATIENT_MEDS = [
  { id: 'med1', name: 'Lisinopril 10mg', freq: 'Once daily', prescriber: 'Dr. Chen', lastFilled: 'Feb 15', pharmacy: 'Walgreens - Parker', controlled: false, schedule: null as string | null },
  { id: 'med2', name: 'Metformin 500mg', freq: 'Twice daily', prescriber: 'Dr. Chen', lastFilled: 'Feb 15', pharmacy: 'Walgreens - Parker', controlled: false, schedule: null as string | null },
  { id: 'med3', name: 'Atorvastatin 20mg', freq: 'Once daily at bedtime', prescriber: 'Dr. Ruiz', lastFilled: 'Jan 28', pharmacy: 'Walgreens - Parker', controlled: false, schedule: null as string | null },
  { id: 'med4', name: 'Adderall XR 20mg', freq: 'Once daily in AM', prescriber: 'Dr. Chen', lastFilled: 'Feb 20', pharmacy: 'Walgreens - Parker', controlled: true, schedule: 'Schedule II' },
];

// ============================================================
// Pharmacy Inventory Check (mock — production would use
// Surescripts / NCPDP SCRIPT RxFill or pharmacy API)
// ============================================================

type InventoryStatus = 'checking' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'unavailable' | 'error';

interface InventoryResult {
  medId: string;
  pharmacyName: string;
  status: InventoryStatus;
  estimateAvailable?: string;  // e.g. "Available by Mar 10"
  note?: string;
}

/** Simulates an inventory check against the pharmacy.
 *  In production: POST /api/pharmacy/inventory-check
 *  → hits Surescripts RTPB or pharmacy's own API */
async function checkPharmacyInventory(
  medIds: string[],
  pharmacyName: string,
): Promise<InventoryResult[]> {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

  return medIds.map(medId => {
    const med = PATIENT_MEDS.find(m => m.id === medId);
    // Mock: controlled substances sometimes out of stock (realistic for Schedule II)
    if (med?.controlled) {
      const rand = Math.random();
      if (rand < 0.3) return { medId, pharmacyName, status: 'out-of-stock' as const, estimateAvailable: 'Available by Mar 12', note: 'Controlled substance — limited supply. Consider calling pharmacy to confirm.' };
      if (rand < 0.5) return { medId, pharmacyName, status: 'low-stock' as const, note: 'Limited stock — fill soon to guarantee availability.' };
    }
    // Most regular meds in stock
    const rand = Math.random();
    if (rand < 0.85) return { medId, pharmacyName, status: 'in-stock' as const };
    return { medId, pharmacyName, status: 'low-stock' as const, note: 'Stock is limited — should be available for pickup today.' };
  });
}

const PATIENT_APPTS = [
  { id: 'appt1', provider: 'Dr. Sarah Chen', type: 'Annual Physical', date: 'Mar 18, 2026', time: '9:30 AM' },
  { id: 'appt2', provider: 'Dr. Michael Ruiz', type: 'Cardiology Follow-up', date: 'Apr 2, 2026', time: '2:00 PM' },
];

const PATIENT_LABS = [
  { id: 'lab1', name: 'Hemoglobin A1C', value: '5.8%', date: 'Feb 10', flag: 'borderline' as const },
  { id: 'lab2', name: 'Lipid Panel', value: 'Total Cholesterol: 210', date: 'Feb 10', flag: 'high' as const },
  { id: 'lab3', name: 'CBC', value: 'All values normal', date: 'Feb 10', flag: 'normal' as const },
  { id: 'lab4', name: 'Metabolic Panel', value: 'All values normal', date: 'Feb 10', flag: 'normal' as const },
];

// ============================================================
// Providers
// ============================================================

const PROVIDERS = [
  { id: 'dr-chen', name: 'Dr. Sarah Chen', practice: 'Parker Family Medicine', icon: Stethoscope, type: 'Primary Care' },
  { id: 'dr-ruiz', name: 'Dr. Michael Ruiz', practice: 'Colorado Cardiology Associates', icon: Stethoscope, type: 'Cardiology' },
  { id: 'front-desk', name: 'Front Desk', practice: 'Parker Family Medicine', icon: Building2, type: 'Office Staff' },
  { id: 'lab', name: 'Quest Diagnostics', practice: 'Lab Services', icon: FlaskConical, type: 'Lab' },
];

// ============================================================
// Message reasons
// ============================================================

const MESSAGE_REASONS = [
  { id: 'refill', label: 'Medication Refill', icon: Pill, color: 'bg-green-50 text-green-700 border-green-200', iconColor: 'text-green-600' },
  { id: 'appointment', label: 'Appointment', icon: Calendar, color: 'bg-blue-50 text-blue-700 border-blue-200', iconColor: 'text-blue-600' },
  { id: 'symptom', label: 'Report a Symptom', icon: Thermometer, color: 'bg-red-50 text-red-700 border-red-200', iconColor: 'text-red-600' },
  { id: 'lab-question', label: 'Lab Results Question', icon: Beaker, color: 'bg-purple-50 text-purple-700 border-purple-200', iconColor: 'text-purple-600' },
  { id: 'follow-up', label: 'Follow-up Question', icon: RefreshCw, color: 'bg-amber-50 text-amber-700 border-amber-200', iconColor: 'text-amber-600' },
  { id: 'other', label: 'Other', icon: HelpCircle, color: 'bg-gray-50 text-gray-700 border-gray-200', iconColor: 'text-gray-600' },
] as const;

type ReasonId = typeof MESSAGE_REASONS[number]['id'];

// ============================================================
// Guided compose state
// ============================================================

interface ComposeState {
  provider: string | null;
  reason: ReasonId | null;
  // Refill
  selectedMeds: string[];
  refillUrgency: string;
  pharmacyChoice: 'preferred' | 'other';
  otherPharmacy: string;
  inventoryResults: InventoryResult[];
  inventoryChecking: boolean;
  // Appointment
  apptAction: string;
  selectedAppt: string;
  preferredTimes: string[];
  // Symptom
  symptomDesc: string;
  symptomStart: string;
  symptomSeverity: number;
  symptomBetter: string[];
  symptomWorse: string[];
  // Lab
  selectedLabs: string[];
  labQuestion: string;
  // Follow-up / Other
  freeText: string;
  // Completeness
  additionalNote: string;
}

const INITIAL_STATE: ComposeState = {
  provider: null, reason: null,
  selectedMeds: [], refillUrgency: '', pharmacyChoice: 'preferred', otherPharmacy: '', inventoryResults: [], inventoryChecking: false,
  apptAction: '', selectedAppt: '', preferredTimes: [],
  symptomDesc: '', symptomStart: '', symptomSeverity: 5, symptomBetter: [], symptomWorse: [],
  selectedLabs: [], labQuestion: '',
  freeText: '', additionalNote: '',
};

// ============================================================
// Build the message from selections
// ============================================================

function buildMessage(s: ComposeState): string {
  const lines: string[] = [];
  const provider = PROVIDERS.find(p => p.id === s.provider);

  if (s.reason === 'refill') {
    lines.push('REQUEST: Medication Refill\n');
    s.selectedMeds.forEach(id => {
      const med = PATIENT_MEDS.find(m => m.id === id);
      if (!med) return;
      const inv = s.inventoryResults.find(r => r.medId === id);
      let invLabel = '';
      if (inv) {
        if (inv.status === 'in-stock') invLabel = ' ✓ In Stock';
        else if (inv.status === 'low-stock') invLabel = ' ⚠ Low Stock';
        else if (inv.status === 'out-of-stock') invLabel = ' ✗ Out of Stock';
      }
      lines.push(`• ${med.name} — ${med.freq}${med.controlled ? ' [Controlled - ' + med.schedule + ']' : ''} (Last filled: ${med.lastFilled})${invLabel}`);
    });
    if (s.refillUrgency) lines.push(`\nUrgency: ${s.refillUrgency}`);
    const pharmacyName = s.pharmacyChoice === 'preferred' ? PREFERRED_PHARMACY.name : s.otherPharmacy.trim();
    if (s.pharmacyChoice === 'preferred') {
      lines.push(`Pharmacy: ${PREFERRED_PHARMACY.name} — ${PREFERRED_PHARMACY.address} (${PREFERRED_PHARMACY.phone})`);
    } else if (s.otherPharmacy.trim()) {
      lines.push(`Pharmacy: ${s.otherPharmacy.trim()}`);
    }
    // Warn on out-of-stock controlled substances
    const oosControlled = s.selectedMeds.filter(id => {
      const med = PATIENT_MEDS.find(m => m.id === id);
      const inv = s.inventoryResults.find(r => r.medId === id);
      return med?.controlled && inv && inv.status === 'out-of-stock';
    });
    if (oosControlled.length > 0) {
      lines.push(`\n⚠ INVENTORY ALERT: Controlled substance(s) may not be available at ${pharmacyName || 'selected pharmacy'}. Please verify with the pharmacy or consider an alternative location.`);
    }
  }

  if (s.reason === 'appointment') {
    lines.push(`REQUEST: ${s.apptAction || 'Appointment Inquiry'}\n`);
    if (s.selectedAppt) {
      const appt = PATIENT_APPTS.find(a => a.id === s.selectedAppt);
      if (appt) lines.push(`Regarding: ${appt.type} with ${appt.provider} on ${appt.date} at ${appt.time}`);
    }
    if (s.preferredTimes.length > 0) lines.push(`Preferred times: ${s.preferredTimes.join(', ')}`);
  }

  if (s.reason === 'symptom') {
    lines.push('REPORT: New/Changed Symptom\n');
    if (s.symptomDesc) lines.push(`Symptom: ${s.symptomDesc}`);
    if (s.symptomStart) lines.push(`Started: ${s.symptomStart}`);
    lines.push(`Severity: ${s.symptomSeverity}/10`);
    if (s.symptomWorse.length > 0) lines.push(`Worse with: ${s.symptomWorse.join(', ')}`);
    if (s.symptomBetter.length > 0) lines.push(`Better with: ${s.symptomBetter.join(', ')}`);
  }

  if (s.reason === 'lab-question') {
    lines.push('QUESTION: Lab Results\n');
    s.selectedLabs.forEach(id => {
      const lab = PATIENT_LABS.find(l => l.id === id);
      if (lab) lines.push(`• ${lab.name}: ${lab.value} (${lab.date})${lab.flag !== 'normal' ? ` [${lab.flag}]` : ''}`);
    });
    if (s.labQuestion) lines.push(`\nQuestion: ${s.labQuestion}`);
  }

  if (s.reason === 'follow-up' || s.reason === 'other') {
    if (s.reason === 'follow-up') lines.push('FOLLOW-UP QUESTION\n');
    lines.push(s.freeText);
  }

  if (s.additionalNote) lines.push(`\nAdditional note: ${s.additionalNote}`);

  return lines.join('\n');
}

function getCompleteness(s: ComposeState): { score: number; missing: string[] } {
  const missing: string[] = [];
  if (s.reason === 'refill') {
    if (s.selectedMeds.length === 0) missing.push('Select medication(s)');
    if (!s.refillUrgency) missing.push('Set urgency');
  }
  if (s.reason === 'appointment') {
    if (!s.apptAction) missing.push('Select action');
  }
  if (s.reason === 'symptom') {
    if (!s.symptomDesc) missing.push('Describe symptom');
    if (!s.symptomStart) missing.push('When it started');
  }
  if (s.reason === 'lab-question') {
    if (s.selectedLabs.length === 0) missing.push('Select lab result');
  }
  if ((s.reason === 'follow-up' || s.reason === 'other') && !s.freeText.trim()) {
    missing.push('Write your message');
  }
  const total = missing.length === 0 ? 1 : Math.max(0, 1 - missing.length * 0.25);
  return { score: total, missing };
}

// ============================================================
// Chip selector helper
// ============================================================

function ChipSelect({ options, selected, onToggle, multi = true }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; multi?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button key={opt} onClick={() => onToggle(opt)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              active
                ? 'bg-attending-primary text-white border-attending-primary'
                : 'bg-white text-attending-deep-navy border-attending-100 hover:border-attending-primary'
            }`}
          >
            {active && <Check className="w-3 h-3 inline mr-1" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// Guided Compose Component
// ============================================================

function GuidedCompose({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [state, setState] = useState<ComposeState>(INITIAL_STATE);
  const [step, setStep] = useState<'provider' | 'reason' | 'details' | 'preview' | 'sent'>('provider');

  const s = state;
  const set = (partial: Partial<ComposeState>) => setState(prev => ({ ...prev, ...partial }));

  function toggleInArray(arr: string[], val: string) {
    return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
  }

  // Auto-run inventory check when meds + pharmacy are selected
  const runInventoryCheck = useCallback(async () => {
    if (s.reason !== 'refill' || s.selectedMeds.length === 0) return;
    const pharmacyName = s.pharmacyChoice === 'preferred' ? PREFERRED_PHARMACY.name : s.otherPharmacy.trim();
    if (!pharmacyName) return;
    set({ inventoryChecking: true, inventoryResults: [] });
    try {
      const results = await checkPharmacyInventory(s.selectedMeds, pharmacyName);
      setState(prev => ({ ...prev, inventoryResults: results, inventoryChecking: false }));
    } catch {
      setState(prev => ({ ...prev, inventoryChecking: false }));
    }
  }, [s.selectedMeds.join(','), s.pharmacyChoice, s.otherPharmacy, s.reason]);

  useEffect(() => {
    if (s.reason === 'refill' && s.selectedMeds.length > 0) {
      const timer = setTimeout(runInventoryCheck, 600);
      return () => clearTimeout(timer);
    }
  }, [runInventoryCheck]);

  const provider = PROVIDERS.find(p => p.id === s.provider);
  const reason = MESSAGE_REASONS.find(r => r.id === s.reason);
  const { score, missing } = getCompleteness(s);
  const message = buildMessage(s);

  function handleSend() {
    setStep('sent');
    setTimeout(() => onSent(), 2500);
  }

  // ── Sent ──
  if (step === 'sent') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-5 animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
          <CheckCheck className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-base font-bold text-attending-deep-navy">Message Sent</p>
        <p className="text-sm text-attending-600 mt-1 text-center">
          {provider?.name} will be notified and can respond directly.
        </p>
      </div>
    );
  }

  // ── Step 1: Pick provider ──
  if (step === 'provider') {
    return (
      <div className="space-y-3 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={onClose} className="p-1.5 -ml-1.5 rounded-lg hover:bg-attending-100">
            <ChevronLeft className="w-5 h-5 text-attending-600" />
          </button>
          <h2 className="text-base font-bold text-attending-deep-navy">Who do you want to message?</h2>
        </div>
        {PROVIDERS.map((p) => {
          const Icon = p.icon;
          return (
            <button key={p.id}
              onClick={() => { set({ provider: p.id }); setStep('reason'); }}
              className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-attending-100 hover:border-attending-primary hover:shadow-sm transition-all text-left"
            >
              <div className="w-11 h-11 rounded-full bg-attending-gradient flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-attending-deep-navy">{p.name}</p>
                <p className="text-xs text-attending-600 mt-0.5">{p.practice}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-attending-400 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    );
  }

  // ── Step 2: Pick reason ──
  if (step === 'reason') {
    return (
      <div className="space-y-3 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setStep('provider')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-attending-100">
            <ChevronLeft className="w-5 h-5 text-attending-600" />
          </button>
          <div>
            <p className="text-xs text-attending-600">To: {provider?.name}</p>
            <h2 className="text-base font-bold text-attending-deep-navy">What's this about?</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {MESSAGE_REASONS.map((r) => {
            const Icon = r.icon;
            return (
              <button key={r.id}
                onClick={() => { set({ reason: r.id }); setStep('details'); }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:shadow-sm text-center ${r.color}`}
              >
                <Icon className={`w-6 h-6 ${r.iconColor}`} />
                <span className="text-xs font-semibold">{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Step 3: Guided details ──
  if (step === 'details') {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('reason')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-attending-100">
            <ChevronLeft className="w-5 h-5 text-attending-600" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-attending-600">To: {provider?.name}</p>
            <div className="flex items-center gap-2">
              {reason && <reason.icon className={`w-4 h-4 ${reason.iconColor}`} />}
              <h2 className="text-sm font-bold text-attending-deep-navy">{reason?.label}</h2>
            </div>
          </div>
        </div>

        {/* ── Refill flow ── */}
        {s.reason === 'refill' && (
          <>
            <div>
              <p className="text-xs font-semibold text-attending-deep-navy mb-2">Which medication(s) need a refill?</p>
              <div className="space-y-2">
                {PATIENT_MEDS.map(med => {
                  const active = s.selectedMeds.includes(med.id);
                  const inv = s.inventoryResults.find(r => r.medId === med.id);
                  return (
                    <button key={med.id} onClick={() => set({ selectedMeds: toggleInArray(s.selectedMeds, med.id) })}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        active ? 'bg-green-50 border-green-300' : 'bg-white border-attending-100 hover:border-green-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-green-100' : 'bg-gray-50'}`}>
                        {active ? <Check className="w-4 h-4 text-green-700" /> : <Pill className="w-4 h-4 text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-sm font-medium ${active ? 'text-green-800' : 'text-attending-deep-navy'}`}>{med.name}</p>
                          {med.controlled && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              {med.schedule}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-attending-600">{med.freq} · Last filled {med.lastFilled}</p>
                        {/* Inventory status inline */}
                        {active && inv && (
                          <div className={`flex items-center gap-1 mt-1 text-[11px] font-medium ${
                            inv.status === 'in-stock' ? 'text-green-700' :
                            inv.status === 'low-stock' ? 'text-amber-700' :
                            inv.status === 'out-of-stock' ? 'text-red-700' : 'text-gray-500'
                          }`}>
                            {inv.status === 'in-stock' && <><PackageCheck className="w-3 h-3" /> In Stock</>}
                            {inv.status === 'low-stock' && <><AlertTriangle className="w-3 h-3" /> Low Stock</>}
                            {inv.status === 'out-of-stock' && <><PackageX className="w-3 h-3" /> Out of Stock{inv.estimateAvailable ? ` — ${inv.estimateAvailable}` : ''}</>}
                          </div>
                        )}
                        {active && s.inventoryChecking && !inv && (
                          <div className="flex items-center gap-1 mt-1 text-[11px] text-attending-600">
                            <Loader2 className="w-3 h-3 animate-spin" /> Checking inventory…
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Controlled substance out-of-stock warning */}
            {s.inventoryResults.some(r => {
              const med = PATIENT_MEDS.find(m => m.id === r.medId);
              return med?.controlled && (r.status === 'out-of-stock' || r.status === 'low-stock') && s.selectedMeds.includes(r.medId);
            }) && (
              <div className="flex items-start gap-2.5 px-3 py-3 bg-red-50 rounded-xl border border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-800">Controlled Substance Inventory Alert</p>
                  <p className="text-[11px] text-red-700 mt-0.5">
                    One or more controlled medications may not be available at this pharmacy.
                    Controlled substances cannot be transferred between pharmacies — your provider
                    must send a new prescription. Consider selecting a different pharmacy or calling
                    ahead to confirm availability.
                  </p>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-attending-deep-navy mb-2">How soon do you need it?</p>
              <ChipSelect
                options={['Not urgent — within a week', 'Running low — 3-5 days', 'Ran out — need ASAP']}
                selected={s.refillUrgency ? [s.refillUrgency] : []}
                onToggle={(v) => set({ refillUrgency: v })}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-attending-deep-navy mb-2">Send to pharmacy</p>
              <button
                onClick={() => set({ pharmacyChoice: 'preferred', otherPharmacy: '' })}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all mb-2 ${
                  s.pharmacyChoice === 'preferred' ? 'bg-green-50 border-green-300' : 'bg-white border-attending-100 hover:border-green-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.pharmacyChoice === 'preferred' ? 'bg-green-100' : 'bg-gray-50'}`}>
                  {s.pharmacyChoice === 'preferred' ? <Check className="w-4 h-4 text-green-700" /> : <Building2 className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${s.pharmacyChoice === 'preferred' ? 'text-green-800' : 'text-attending-deep-navy'}`}>
                    {PREFERRED_PHARMACY.name}
                    <span className="ml-1.5 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">Preferred</span>
                  </p>
                  <p className="text-[11px] text-attending-600">{PREFERRED_PHARMACY.address}</p>
                </div>
              </button>
              <button
                onClick={() => set({ pharmacyChoice: 'other' })}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  s.pharmacyChoice === 'other' ? 'bg-blue-50 border-blue-300' : 'bg-white border-attending-100 hover:border-blue-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.pharmacyChoice === 'other' ? 'bg-blue-100' : 'bg-gray-50'}`}>
                  <MapPin className={`w-4 h-4 ${s.pharmacyChoice === 'other' ? 'text-blue-700' : 'text-gray-400'}`} />
                </div>
                <p className={`text-sm font-medium ${s.pharmacyChoice === 'other' ? 'text-blue-800' : 'text-attending-deep-navy'}`}>
                  Use a different pharmacy
                </p>
              </button>
              {s.pharmacyChoice === 'other' && (
                <input
                  type="text" placeholder="Pharmacy name and location..."
                  value={s.otherPharmacy} onChange={e => set({ otherPharmacy: e.target.value })}
                  className="w-full mt-2 px-3 py-2.5 bg-white rounded-xl text-sm border border-attending-100 focus:outline-none focus:ring-2 focus:ring-attending-primary/30 placeholder:text-attending-400"
                />
              )}

              {/* Inventory check status summary */}
              {s.selectedMeds.length > 0 && s.inventoryResults.length > 0 && !s.inventoryChecking && (
                <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium ${
                  s.inventoryResults.every(r => r.status === 'in-stock')
                    ? 'bg-green-50 text-green-700 border border-green-100'
                    : s.inventoryResults.some(r => r.status === 'out-of-stock')
                      ? 'bg-red-50 text-red-700 border border-red-100'
                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                }`}>
                  {s.inventoryResults.every(r => r.status === 'in-stock') ? (
                    <><PackageCheck className="w-3.5 h-3.5" /> All medications verified in stock</>
                  ) : s.inventoryResults.some(r => r.status === 'out-of-stock') ? (
                    <><PackageX className="w-3.5 h-3.5" /> Some medications unavailable — consider a different pharmacy</>
                  ) : (
                    <><AlertTriangle className="w-3.5 h-3.5" /> Some medications have limited stock</>
                  )}
                </div>
              )}
              {s.inventoryChecking && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-attending-50 text-[11px] text-attending-600 border border-attending-100">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking pharmacy inventory…
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Appointment flow ── */}
        {s.reason === 'appointment' && (
          <>
            <div>
              <p className="text-xs font-semibold text-attending-deep-navy mb-2">What do you need?</p>
              <ChipSelect
                options={['Schedule new appointment', 'Reschedule existing', 'Cancel appointment', 'Question about visit']}
                selected={s.apptAction ? [s.apptAction] : []}
                onToggle={(v) => set({ apptAction: v })}
              />
            </div>
            {(s.apptAction === 'Reschedule existing' || s.apptAction === 'Cancel appointment' || s.apptAction === 'Question about visit') && (
              <div>
                <p className="text-xs font-semibold text-attending-deep-navy mb-2">Which appointment?</p>
                <div className="space-y-2">
                  {PATIENT_APPTS.map(appt => {
                    const active = s.selectedAppt === appt.id;
                    return (
                      <button key={appt.id} onClick={() => set({ selectedAppt: appt.id })}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          active ? 'bg-blue-50 border-blue-300' : 'bg-white border-attending-100 hover:border-blue-300'
                        }`}
                      >
                        <Calendar className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-700' : 'text-gray-400'}`} />
                        <div>
                          <p className={`text-sm font-medium ${active ? 'text-blue-800' : 'text-attending-deep-navy'}`}>{appt.type}</p>
                          <p className="text-[11px] text-attending-600">{appt.provider} · {appt.date} at {appt.time}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {(s.apptAction === 'Schedule new appointment' || s.apptAction === 'Reschedule existing') && (
              <div>
                <p className="text-xs font-semibold text-attending-deep-navy mb-2">Preferred times?</p>
                <ChipSelect
                  options={['Morning (8-12)', 'Afternoon (12-4)', 'Late afternoon (4-6)', 'Any time', 'Weekdays only', 'ASAP']}
                  selected={s.preferredTimes}
                  onToggle={(v) => set({ preferredTimes: toggleInArray(s.preferredTimes, v) })}
                />
              </div>
            )}
          </>
        )}

        {/* ── Symptom flow ── */}
        {s.reason === 'symptom' && (
          <>
            <div>
              <p className="text-xs font-semibold text-attending-deep-navy mb-2">What are you experiencing?</p>
              <ChipSelect
                options={['Headache', 'Chest pain', 'Dizziness', 'Nausea', 'Fatigue', 'Shortness of breath', 'Joint pain', 'Skin rash', 'Fever', 'Other']}
                selected={s.symptomDesc ? [s.symptomDesc] : []}
                onToggle={(v) => set({ symptomDesc: v })}
              />
              {s.symptomDesc === 'Other' && (
                <input type="text" placeholder="Describe your symptom..."
                  className="w-full mt-2 px-3 py-2.5 bg-white rounded-xl text-sm border border-attending-100 focus:outline-none focus:ring-2 focus:ring-attending-primary/30 placeholder:text-attending-400"
                  onChange={e => set({ symptomDesc: e.target.value || 'Other' })}
                />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-attending-deep-navy mb-2">When did it start?</p>
              <ChipSelect
                options={['Today', 'Yesterday', '2-3 days ago', 'This week', '1-2 weeks ago', 'More than 2 weeks']}
                selected={s.symptomStart ? [s.symptomStart] : []}
                onToggle={(v) => set({ symptomStart: v })}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-attending-deep-navy mb-2">Severity: {s.symptomSeverity}/10</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-attending-600">Mild</span>
                <input type="range" min={1} max={10} value={s.symptomSeverity}
                  onChange={e => set({ symptomSeverity: Number(e.target.value) })}
                  className="flex-1 accent-attending-primary h-2"
                />
                <span className="text-[10px] text-attending-600">Severe</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-attending-deep-navy mb-2">What makes it worse?</p>
              <ChipSelect
                options={['Movement', 'Eating', 'Lying down', 'Standing', 'Stress', 'Exercise', 'Nothing specific']}
                selected={s.symptomWorse}
                onToggle={(v) => set({ symptomWorse: toggleInArray(s.symptomWorse, v) })}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-attending-deep-navy mb-2">What makes it better?</p>
              <ChipSelect
                options={['Rest', 'OTC pain meds', 'Ice/heat', 'Position change', 'Eating', 'Nothing helps']}
                selected={s.symptomBetter}
                onToggle={(v) => set({ symptomBetter: toggleInArray(s.symptomBetter, v) })}
              />
            </div>
          </>
        )}

        {/* ── Lab question flow ── */}
        {s.reason === 'lab-question' && (
          <>
            <div>
              <p className="text-xs font-semibold text-attending-deep-navy mb-2">Which results do you have questions about?</p>
              <div className="space-y-2">
                {PATIENT_LABS.map(lab => {
                  const active = s.selectedLabs.includes(lab.id);
                  const flagColor = lab.flag === 'high' ? 'text-red-600' : lab.flag === 'borderline' ? 'text-amber-600' : 'text-green-600';
                  return (
                    <button key={lab.id} onClick={() => set({ selectedLabs: toggleInArray(s.selectedLabs, lab.id) })}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        active ? 'bg-purple-50 border-purple-300' : 'bg-white border-attending-100 hover:border-purple-300'
                      }`}
                    >
                      <Beaker className={`w-5 h-5 flex-shrink-0 ${active ? 'text-purple-700' : 'text-gray-400'}`} />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${active ? 'text-purple-800' : 'text-attending-deep-navy'}`}>{lab.name}</p>
                        <p className="text-[11px] text-attending-600">
                          {lab.value} · {lab.date}
                          {lab.flag !== 'normal' && <span className={`ml-1 font-semibold ${flagColor}`}>({lab.flag})</span>}
                        </p>
                      </div>
                      {active && <Check className="w-4 h-4 text-purple-700 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-attending-deep-navy mb-2">What would you like to know?</p>
              <ChipSelect
                options={['What does this mean?', 'Is this normal for me?', 'Should I be concerned?', 'Do I need to change anything?', 'When should I retest?']}
                selected={s.labQuestion ? [s.labQuestion] : []}
                onToggle={(v) => set({ labQuestion: v })}
              />
            </div>
          </>
        )}

        {/* ── Follow-up / Other ── */}
        {(s.reason === 'follow-up' || s.reason === 'other') && (
          <div>
            <p className="text-xs font-semibold text-attending-deep-navy mb-2">
              {s.reason === 'follow-up' ? 'What would you like to follow up on?' : 'How can we help?'}
            </p>
            <textarea placeholder="Type your message..."
              value={s.freeText} onChange={e => set({ freeText: e.target.value })}
              rows={5}
              className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-attending-100 focus:outline-none focus:ring-2 focus:ring-attending-primary/30 placeholder:text-attending-400 resize-none"
            />
          </div>
        )}

        {/* Additional note (all types) */}
        {s.reason !== 'follow-up' && s.reason !== 'other' && (
          <div>
            <p className="text-xs font-semibold text-attending-deep-navy mb-2">Anything else? (optional)</p>
            <textarea placeholder="Add any extra details..."
              value={s.additionalNote} onChange={e => set({ additionalNote: e.target.value })}
              rows={2}
              className="w-full px-3 py-2.5 bg-white rounded-xl text-sm border border-attending-100 focus:outline-none focus:ring-2 focus:ring-attending-primary/30 placeholder:text-attending-400 resize-none"
            />
          </div>
        )}

        {/* Completeness indicator */}
        {missing.length > 0 && (
          <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
            <CircleDot className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-amber-800 font-medium">To send, please: {missing.join(' · ')}</p>
            </div>
          </div>
        )}

        {/* Preview & Send */}
        <button onClick={() => setStep('preview')}
          disabled={missing.length > 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-attending-primary text-white text-sm font-semibold rounded-xl hover:bg-attending-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Review & Send
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ── Step 4: Preview ──
  if (step === 'preview') {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('details')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-attending-100">
            <ChevronLeft className="w-5 h-5 text-attending-600" />
          </button>
          <h2 className="text-base font-bold text-attending-deep-navy">Review Your Message</h2>
        </div>

        <div className="bg-white rounded-xl border border-attending-100 p-4">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-attending-50">
            <span className="text-xs text-attending-600">To:</span>
            <span className="text-sm font-semibold text-attending-deep-navy">{provider?.name}</span>
            <span className="text-xs text-attending-600">· {provider?.practice}</span>
          </div>
          <pre className="text-sm text-attending-deep-navy whitespace-pre-wrap font-sans leading-relaxed">{message}</pre>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setStep('details')}
            className="flex-1 px-4 py-3 bg-attending-50 text-attending-deep-navy text-sm font-semibold rounded-xl border border-attending-100 hover:bg-attending-100 transition-colors"
          >
            Edit
          </button>
          <button onClick={handleSend}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-attending-primary text-white text-sm font-semibold rounded-xl hover:bg-attending-primary/90 transition-colors"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>

        <p className="text-[10px] text-attending-600 text-center">
          Messages are not for emergencies. If urgent, call your provider or 911.
        </p>
      </div>
    );
  }

  return null;
}

// ============================================================
// Conversation Row
// ============================================================

interface Conversation {
  id: string; provider: string; practice: string; lastMessage: string;
  timestamp: string; unread: boolean; unreadCount: number; hasAttachment: boolean;
}

function ConversationRow({ convo }: { convo: Conversation }) {
  const initials = convo.provider.split(' ').map(n => n[0]).join('').slice(0, 2);
  return (
    <Link href={`/messages/${convo.id}`}
      className="flex items-center gap-3 px-5 py-4 bg-white hover:bg-attending-50 transition-colors">
      <div className="w-12 h-12 rounded-full bg-attending-gradient flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-sm truncate ${convo.unread ? 'font-bold' : 'font-medium'} text-attending-deep-navy`}>{convo.provider}</p>
          <span className={`text-[10px] flex-shrink-0 ml-2 ${convo.unread ? 'text-attending-primary font-semibold' : 'text-attending-600'}`}>{convo.timestamp}</span>
        </div>
        <p className="text-xs text-attending-600 truncate">{convo.practice}</p>
        <div className="flex items-center gap-1 mt-1">
          {!convo.unread && <CheckCheck className="w-3 h-3 text-attending-primary flex-shrink-0" />}
          {convo.hasAttachment && <Paperclip className="w-3 h-3 text-attending-600 flex-shrink-0" />}
          <p className={`text-xs truncate ${convo.unread ? 'text-attending-deep-navy font-medium' : 'text-attending-600'}`}>{convo.lastMessage}</p>
        </div>
      </div>
      {convo.unread && convo.unreadCount > 0 && (
        <span className="w-5 h-5 bg-attending-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">{convo.unreadCount}</span>
      )}
    </Link>
  );
}

// ============================================================
// Main
// ============================================================

export default function MessagesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [composing, setComposing] = useState(false);

  const { conversations: apiConversations, loading, totalUnread } = useConversations();

  const conversations: Conversation[] = (apiConversations ?? []).map(c => ({
    id: c.id, provider: c.provider.name, practice: c.provider.practice,
    lastMessage: c.lastMessage.content, timestamp: formatConvoTime(c.updatedAt),
    unread: c.unreadCount > 0, unreadCount: c.unreadCount, hasAttachment: c.lastMessage.hasAttachment,
  }));

  if (conversations.length === 0 && !loading) {
    conversations.push(
      { id: 'conv-1', provider: 'Dr. Sarah Chen', practice: 'Parker Family Medicine', lastMessage: 'Your lab results look good overall. Let\'s discuss the A1C at your next visit.', timestamp: '2h ago', unread: true, unreadCount: 1, hasAttachment: false },
      { id: 'conv-2', provider: 'Dr. Michael Ruiz', practice: 'Colorado Cardiology Associates', lastMessage: 'ECG report attached. Everything looks normal.', timestamp: 'Yesterday', unread: false, unreadCount: 0, hasAttachment: true },
      { id: 'conv-3', provider: 'Front Desk', practice: 'Parker Family Medicine', lastMessage: 'Reminder: Your annual physical is scheduled for March 3rd at 9:30 AM.', timestamp: 'Feb 25', unread: false, unreadCount: 0, hasAttachment: false },
      { id: 'conv-4', provider: 'Quest Diagnostics', practice: 'Lab Services', lastMessage: 'Your lab order is ready. Please fast 12 hours before your appointment.', timestamp: 'Feb 22', unread: false, unreadCount: 0, hasAttachment: true },
    );
  }

  const filtered = searchQuery
    ? conversations.filter(c =>
        c.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.practice.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const unreadTotal = totalUnread || conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <>
      <Head><title>Messages | ATTENDING AI</title></Head>
      <AppShell
        header={
          <header className="bg-white border-b border-light safe-area-top">
            <div className="max-w-lg mx-auto px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-attending-deep-navy">
                  Messages
                  {unreadTotal > 0 && <span className="ml-2 text-sm font-semibold text-attending-primary">({unreadTotal} new)</span>}
                </h1>
              </div>
              {!composing && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-attending-600" />
                  <input type="text" placeholder="Search messages..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-attending-50 rounded-xl text-sm text-attending-deep-navy placeholder:text-attending-400 focus:outline-none focus:ring-2 focus:ring-attending-primary/30 border-0"
                  />
                </div>
              )}
            </div>
          </header>
        }
      >
        <div className="bg-attending-800 dashboard-bg pb-8">
          <div className="max-w-lg mx-auto px-4 sm:px-5 py-5 space-y-4">
            {composing ? (
              <div className="bg-attending-50 rounded-xl border border-attending-100 p-4">
                <GuidedCompose onClose={() => setComposing(false)} onSent={() => setComposing(false)} />
              </div>
            ) : (
              <>
                <button onClick={() => setComposing(true)}
                  className="w-full flex items-center justify-center gap-3 p-4 bg-attending-primary rounded-xl hover:bg-attending-primary/90 transition-colors shadow-sm">
                  <PenSquare className="w-5 h-5 text-white" />
                  <span className="text-base font-semibold text-white">Message Your Provider</span>
                </button>
                <div className="bg-attending-50 rounded-xl border border-attending-100 overflow-hidden">
                  {filtered.length > 0 ? (
                    <div className="divide-y divide-attending-100">
                      {filtered.map(convo => <ConversationRow key={convo.id} convo={convo} />)}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-5">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4">
                        <MessageCircle className="w-8 h-8 text-attending-600" />
                      </div>
                      <p className="text-sm font-medium text-attending-deep-navy">{searchQuery ? 'No messages found' : 'No messages yet'}</p>
                      <p className="text-xs text-attending-600 mt-1">{searchQuery ? 'Try a different search term' : 'Messages from your providers will appear here'}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </AppShell>
    </>
  );
}

function formatConvoTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
