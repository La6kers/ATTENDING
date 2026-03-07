// ============================================================
// ATTENDING AI — Get Emergency Services
// apps/patient-portal/pages/emergency/index.tsx
//
// Single button expands into a modal-style panel with
// emergency service options — mirrors the COMPASS emergency
// modal pattern. Includes geolocation for nearby facilities.
// ============================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Shield,
  Phone,
  AlertTriangle,
  User,
  Car,
  ChevronRight,
  Heart,
  Droplets,
  Pill,
  FileText,
  Clock,
  Eye,
  Lock,
  MapPin,
  Navigation,
  Building2,
  Stethoscope,
  PhoneCall,
  Loader2,
  X,
  ChevronDown,
  Activity,
  Send,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { useEmergencySettings } from '../../hooks/useEmergencySettings';
import { usePatientData } from '../../hooks/usePatientData';

// ============================================================
// Emergency Triage — Red Flag Symptom Routing
// ============================================================
//
// IMPORTANT DISCLAIMER: This routing logic is a DECISION SUPPORT
// tool, NOT a substitute for professional medical evaluation.
// It helps patients make more informed decisions about where to
// seek care, but ALWAYS errs on the side of caution.
//
// - "call-911": Life-threatening, time-critical → Call 911 NOW
// - "er-only":  Needs ER capabilities (imaging, surgery, ICU, blood bank)
// - "er-preferred": Should go ER, but stable urgent care may help
//
// When in doubt, the system ALWAYS recommends the higher level of care.

// ── CALL 911 — Immediately life-threatening ──────────────────
// These conditions are time-critical. Every minute matters.
const CALL_911_FLAGS = [
  // Cardiac
  'cardiac arrest', 'not breathing', 'no pulse', 'heart stopped',
  // Airway
  'choking', 'unable to breathe', 'airway obstruction',
  // Consciousness
  'unresponsive', 'unconscious', 'not waking up',
  // Active stroke (time = brain)
  'facial drooping', 'arm weakness with speech difficulty',
  'sudden inability to speak', 'stroke in progress',
  // Severe trauma
  'gunshot wound', 'stab wound', 'impaled object',
  'severe crush injury', 'amputation',
  // Drowning / environmental
  'near drowning', 'submersion', 'electrocution', 'lightning strike',
  // Childbirth
  'baby coming', 'active labor emergency', 'umbilical cord visible',
];

// ── ER ONLY — Requires emergency department capabilities ─────
// Urgent care cannot handle these. ER has CT/MRI, surgery,
// trauma teams, blood bank, cardiac cath lab, ICU.
const ER_ONLY_RED_FLAGS = [
  // ── Cardiac / Vascular ──
  'chest pain', 'chest pressure', 'chest tightness',
  'heart attack', 'crushing chest pain',
  'pain radiating to jaw or arm',
  'sudden rapid heartbeat with dizziness',
  'aortic dissection', 'tearing chest pain radiating to back',

  // ── Neurological ──
  'stroke symptoms', 'facial drooping', 'slurred speech',
  'sudden numbness on one side', 'sudden confusion',
  'sudden severe headache',       // thunderclap — possible aneurysm/SAH
  'worst headache of my life',
  'seizure', 'first-time seizure', 'status epilepticus',
  'sudden vision loss', 'double vision with headache',
  'loss of consciousness', 'fainting with injury',
  'severe head injury', 'head trauma',
  'inability to move limbs', 'sudden paralysis',
  'spinal cord injury', 'neck injury with numbness',

  // ── Respiratory ──
  'difficulty breathing', 'shortness of breath at rest',
  'severe asthma attack not responding to inhaler',
  'cyanosis', 'turning blue', 'blue lips',
  'pulmonary embolism', 'sudden chest pain with leg swelling',

  // ── Bleeding / Hemorrhage ──
  'severe bleeding', 'uncontrolled bleeding',
  'coughing blood', 'vomiting blood',
  'blood in stool with dizziness',   // GI bleed with hemodynamic compromise
  'rectal bleeding with lightheadedness',
  'postpartum hemorrhage',

  // ── Abdominal Emergencies ──
  'sudden severe abdominal pain',    // appendicitis, perforation, ectopic, AAA
  'rigid abdomen', 'abdominal guarding',
  'ectopic pregnancy', 'abdominal pain with positive pregnancy test',
  'testicular torsion', 'sudden severe testicular pain',

  // ── Allergic / Immune ──
  'severe allergic reaction', 'anaphylaxis',
  'throat swelling', 'tongue swelling',
  'allergic reaction with difficulty breathing',

  // ── Toxicology ──
  'poisoning', 'overdose', 'toxic ingestion',
  'carbon monoxide exposure',
  'chemical exposure to eyes',

  // ── Trauma ──
  'severe burns', 'burns to face or airway',
  'compound fracture', 'open fracture', 'bone protruding',
  'crush injury', 'degloved',
  'fall from significant height',
  'high-speed motor vehicle accident',
  'pedestrian struck by vehicle',

  // ── Infection / Sepsis ──
  'high fever with stiff neck',      // meningitis
  'fever with confusion',            // sepsis / encephalitis
  'fever with rapid heart rate and low blood pressure', // septic shock
  'high fever with rash that doesn\'t blanch', // meningococcal
  'necrotizing fasciitis', 'rapidly spreading redness with fever',

  // ── Metabolic / Endocrine ──
  'diabetic ketoacidosis', 'fruity breath with vomiting',
  'severe hypoglycemia', 'blood sugar below 40',
  'severe dehydration with confusion',
  'heat stroke', 'body temperature above 104',
  'hypothermia', 'body temperature below 95',

  // ── Pregnancy ──
  'pregnancy emergency',
  'vaginal bleeding while pregnant',
  'severe preeclampsia', 'seizure while pregnant',
  'decreased fetal movement after 28 weeks',
  'water broke before 37 weeks',

  // ── Mental Health Crisis ──
  'suicidal ideation', 'suicide attempt',
  'self-harm', 'active self-injury',
  'homicidal ideation',
  'acute psychosis', 'severe psychiatric emergency',

  // ── Pediatric (if applicable) ──
  'infant not breathing', 'infant fever under 3 months',
  'infant inconsolable crying with vomiting',
  'child with petechial rash and fever',
  'newborn jaundice with lethargy',

  // ── Eye ──
  'chemical burn to eye',
  'sudden painless vision loss',
  'globe rupture', 'eye penetrating injury',

  // ── Vascular ──
  'cold pulseless limb',            // acute limb ischemia
  'sudden severe leg pain with color change',
  'deep vein thrombosis with chest pain',
];

// ── ER PREFERRED — ER is better, but stable urgent care may manage ──
// If all ERs are far/full and patient is stable, urgent care can
// stabilize and transfer. But ER is the recommended destination.
const ER_PREFERRED_FLAGS = [
  'moderate head injury', 'concussion',
  'possible fracture',
  'deep laceration needing stitches over 6 hours old',
  'abdominal pain with fever',
  'kidney stone with uncontrolled pain',
  'severe dehydration',
  'high fever above 103',
  'chest pain that resolved', // still needs cardiac workup
  'new onset irregular heartbeat',
  'blood in urine with pain',
  'severe back pain with leg numbness', // possible cauda equina
  'animal bite to face or hand',
  'allergic reaction without breathing difficulty',
  'asthma attack responding poorly to home treatment',
  'moderate burns',
  'foreign body ingestion',
  'acute urinary retention',
];

interface CompassAlert {
  urgencyLevel: 'low' | 'moderate' | 'high' | 'critical';
  redFlags: string[];
  chiefComplaint: string;
}

type TriageLevel = 'call-911' | 'er-only' | 'er-preferred' | 'all';

function triageAlert(alert: CompassAlert | null): TriageLevel {
  if (!alert) return 'all';
  if (alert.urgencyLevel === 'critical') return 'call-911';

  const flags = [...alert.redFlags, alert.chiefComplaint].map(s => s.toLowerCase());

  const matchesAny = (list: string[]) =>
    flags.some(flag => list.some(item => flag.includes(item) || item.includes(flag)));

  if (matchesAny(CALL_911_FLAGS)) return 'call-911';
  if (matchesAny(ER_ONLY_RED_FLAGS)) return 'er-only';
  if (alert.urgencyLevel === 'high' || matchesAny(ER_PREFERRED_FLAGS)) return 'er-preferred';
  return 'all';
}

// For backward compat — used in filter logic
function isErOnly(alert: CompassAlert | null): boolean {
  const level = triageAlert(alert);
  return level === 'call-911' || level === 'er-only';
}

// ============================================================
// Geolocation Hook
// ============================================================

function useGeolocation() {
  const [geo, setGeo] = useState<{ lat: number | null; lng: number | null; city: string; loading: boolean }>({
    lat: null, lng: null, city: '', loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo({ lat: 39.5186, lng: -104.7614, city: 'Parker, CO', loading: false });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.county || 'your area';
          const state = data.address?.state ? `, ${data.address.state}` : '';
          setGeo({ lat: latitude, lng: longitude, city: `${city}${state}`, loading: false });
        } catch {
          setGeo({ lat: latitude, lng: longitude, city: 'your area', loading: false });
        }
      },
      () => setGeo({ lat: 39.5186, lng: -104.7614, city: 'Parker, CO', loading: false }),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  return geo;
}

// ============================================================
// Wait Times Hook — polls API
// ============================================================

interface Facility {
  facilityId: string;
  name: string;
  type: 'er' | 'urgent-care' | 'clinic';
  address: string;
  phone: string;
  lat: number;
  lng: number;
  waitMinutes: number | null;
  lastUpdated: string;
  updatedBy: string;
  patientsSeen24h?: number;
  status: 'open' | 'closed' | 'diverting';
  hours: string;
  capacityLevel?: 'low' | 'moderate' | 'high' | 'critical';
}

function useWaitTimes(pollMs = 30000) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTimes = useCallback(async () => {
    try {
      const res = await fetch('/api/emergency/wait-times');
      const data = await res.json();
      if (data.facilities) setFacilities(data.facilities);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTimes();
    const interval = setInterval(fetchTimes, pollMs);
    return () => clearInterval(interval);
  }, [fetchTimes, pollMs]);

  return { facilities, loading, refresh: fetchTimes };
}

const CARE_CONTACTS = [
  { id: 'hp1', label: '24/7 Nurse Advice Line', sub: 'Blue Cross Blue Shield', phone: '(800) 224-6678', icon: PhoneCall, available: 'Available 24/7' },
  { id: 'hp2', label: "Dr. Chen's Office", sub: 'Parker Family Medicine', phone: '(303) 555-0142', icon: Stethoscope, available: 'Mon-Fri 8 AM - 5 PM' },
  { id: 'hp3', label: 'Dr. Ruiz - Cardiology', sub: 'Colorado Cardiology Associates', phone: '(303) 555-0198', icon: Heart, available: 'Mon-Fri 9 AM - 4 PM' },
  { id: 'hp4', label: 'BCBS Member Services', sub: 'Claims, coverage & referrals', phone: '(800) 443-5136', icon: Shield, available: 'Mon-Fri 7 AM - 7 PM' },
];

// ============================================================
// Emergency Services Panel (expands from button)
// ============================================================

// ============================================================
// Wait Time Badge
// ============================================================

function WaitBadge({ minutes, lastUpdated }: { minutes: number | null; lastUpdated: string }) {
  if (minutes === null) {
    return (
      <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0">
        <Clock className="w-4 h-4 text-gray-400 mb-0.5" />
        <span className="text-[10px] text-gray-400 font-medium">No data</span>
      </div>
    );
  }

  const color =
    minutes <= 15 ? 'bg-green-500' :
    minutes <= 30 ? 'bg-amber-500' :
    minutes <= 60 ? 'bg-orange-500' :
    'bg-red-500';

  const ago = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 60000);
  const agoLabel = ago < 1 ? 'just now' : ago < 60 ? `${ago}m ago` : `${Math.floor(ago / 60)}h ago`;

  return (
    <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl ${color} flex-shrink-0`}>
      <span className="text-white font-bold text-lg leading-none">{minutes}</span>
      <span className="text-white/90 text-[10px] font-medium">min</span>
      <span className="text-white/60 text-[8px] mt-0.5">{agoLabel}</span>
    </div>
  );
}

function CapacityBar({ level }: { level?: string }) {
  if (!level) return null;
  const config: Record<string, { width: string; color: string; label: string }> = {
    low:      { width: 'w-1/4', color: 'bg-green-500', label: 'Low volume' },
    moderate: { width: 'w-2/4', color: 'bg-amber-500', label: 'Moderate' },
    high:     { width: 'w-3/4', color: 'bg-orange-500', label: 'Busy' },
    critical: { width: 'w-full', color: 'bg-red-500', label: 'Very busy' },
  };
  const c = config[level] ?? config.moderate;
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${c.color} ${c.width}`} />
      </div>
      <span className="text-[10px] text-attending-600 flex-shrink-0">{c.label}</span>
    </div>
  );
}

// ============================================================
// Facility Map (iframe-based — no SSR issues)
// ============================================================

import FacilityMap from '../../components/emergency/FacilityMap';

// ============================================================
// Facility Detail Card (shows when marker clicked)
// ============================================================

function FacilityDetail({
  facility,
  onClose,
  onSendInfo,
  sendStatus,
}: {
  facility: Facility;
  onClose: () => void;
  onSendInfo: (facilityId: string) => void;
  sendStatus: 'idle' | 'sending' | 'sent';
}) {
  const style = {
    er: { bg: 'bg-red-50', text: 'text-red-700', label: 'ER' },
    'urgent-care': { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Urgent Care' },
    clinic: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Clinic' },
  }[facility.type] ?? { bg: 'bg-gray-50', text: 'text-gray-700', label: facility.type };

  return (
    <div className="bg-white rounded-xl border border-attending-100 p-4 animate-fade-in-up">
      <div className="flex items-start justify-between mb-3">
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-attending-50 -ml-1">
          <ArrowLeft className="w-4 h-4 text-attending-600" />
        </button>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </div>

      <div className="flex gap-3 mb-3">
        <WaitBadge minutes={facility.waitMinutes} lastUpdated={facility.lastUpdated} />
        <div className="flex-1">
          <p className="text-sm font-bold text-attending-deep-navy">{facility.name}</p>
          <p className="text-xs text-attending-600 mt-1">{facility.address}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-semibold ${facility.status === 'open' ? 'text-green-600' : 'text-red-500'}`}>
              {facility.status === 'open' ? facility.hours : facility.status === 'diverting' ? 'On Diversion' : 'Closed'}
            </span>
            {facility.patientsSeen24h && (
              <span className="text-[10px] text-attending-600">{facility.patientsSeen24h} seen today</span>
            )}
          </div>
          <CapacityBar level={facility.capacityLevel} />
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <a
          href={`tel:${facility.phone.replace(/\D/g, '')}`}
          className="flex flex-col items-center gap-1 p-2.5 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
        >
          <Phone className="w-4 h-4 text-green-600" />
          <span className="text-[10px] font-semibold text-green-700">Call</span>
        </a>
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(facility.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 p-2.5 bg-attending-50 rounded-xl hover:bg-attending-100 transition-colors"
        >
          <Navigation className="w-4 h-4 text-attending-primary" />
          <span className="text-[10px] font-semibold text-attending-primary">Directions</span>
        </a>
        <button
          onClick={() => onSendInfo(facility.facilityId)}
          disabled={sendStatus !== 'idle'}
          className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-colors ${
            sendStatus === 'sent' ? 'bg-green-50' :
            sendStatus === 'sending' ? 'bg-blue-50' :
            'bg-blue-50 hover:bg-blue-100'
          }`}
        >
          {sendStatus === 'sending' ? (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          ) : sendStatus === 'sent' ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <Send className="w-4 h-4 text-blue-600" />
          )}
          <span className={`text-[10px] font-semibold ${
            sendStatus === 'sent' ? 'text-green-700' : 'text-blue-700'
          }`}>
            {sendStatus === 'sent' ? 'Sent' : sendStatus === 'sending' ? 'Sending...' : 'Send My Info'}
          </span>
        </button>
      </div>

      <p className="text-[10px] text-attending-600 text-center">
        {sendStatus === 'sent'
          ? 'Your COMPASS summary and medical ID have been sent. They will be prepared for your arrival.'
          : 'Send your COMPASS assessment and medical ID so the care team can prepare.'}
      </p>
    </div>
  );
}

// ============================================================
// Emergency Services Panel (map + sidebar)
// ============================================================

function EmergencyServicesPanel({ open, onClose, city, lat, lng, compassAlert }: {
  open: boolean; onClose: () => void; city: string; lat: number | null; lng: number | null;
  compassAlert: CompassAlert | null;
}) {
  const triage = triageAlert(compassAlert);
  const erOnly = triage === 'call-911' || triage === 'er-only';
  const erPreferred = triage === 'er-preferred';
  const [activeTab, setActiveTab] = useState<'all' | 'er' | 'urgent-care'>(erOnly ? 'er' : 'all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const { facilities, loading: facilitiesLoading, refresh } = useWaitTimes(30000);

  // Force ER-only when red flags detected
  useEffect(() => {
    if (erOnly) setActiveTab('er');
  }, [erOnly]);

  // For er-preferred, show all but sort ERs first
  const filtered = erOnly
    ? facilities.filter(f => f.type === 'er')
    : (() => {
        let list = activeTab === 'all' ? facilities : facilities.filter(f => f.type === activeTab);
        if (erPreferred && activeTab === 'all') {
          list = [...list].sort((a, b) => {
            if (a.type === 'er' && b.type !== 'er') return -1;
            if (a.type !== 'er' && b.type === 'er') return 1;
            return 0;
          });
        }
        return list;
      })();
  const selected = facilities.find(f => f.facilityId === selectedId) ?? null;

  // Reset send status when selecting different facility
  useEffect(() => { setSendStatus('idle'); }, [selectedId]);

  const handleSendInfo = useCallback(async (facilityId: string) => {
    setSendStatus('sending');
    try {
      await fetch('/api/emergency/facility-handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'self-refer',
          facilityId,
          facilityName: selected?.name,
          patient: {
            name: 'Alex Morgan',
            age: 41,
            sex: 'Male',
            allergies: ['Penicillin', 'Sulfa drugs'],
            conditions: ['Hypertension', 'Pre-diabetes'],
            medications: ['Lisinopril 10mg', 'Metformin 500mg'],
            bloodType: 'O+',
          },
          compassSummary: compassAlert ? {
            chiefComplaint: compassAlert.chiefComplaint,
            urgencyLevel: compassAlert.urgencyLevel,
            redFlags: compassAlert.redFlags,
            symptomTimeline: 'See full COMPASS report',
          } : {
            chiefComplaint: 'No active COMPASS assessment',
            urgencyLevel: 'moderate' as const,
            redFlags: [],
            symptomTimeline: 'Patient self-referred without COMPASS',
          },
        }),
      });
      setSendStatus('sent');
    } catch {
      setSendStatus('idle');
    }
  }, [selected]);

  if (!open) return null;

  const mapCenter = lat && lng ? { lat, lng } : { lat: 39.5186, lng: -104.7614 };

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:flex-row">
      {/* Backdrop — only visible as close area on mobile */}
      <div className="absolute inset-0 bg-black/50 sm:hidden" onClick={onClose} />

      {/* Panel container — full screen on desktop, bottom sheet on mobile */}
      <div className="relative flex flex-col sm:flex-row w-full h-full bg-white animate-slide-in-bottom sm:animate-none overflow-hidden">

        {/* Header (mobile only — on desktop it's in sidebar) */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 px-5 py-3 flex items-center justify-between sm:hidden flex-shrink-0">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-white" />
            <h2 className="text-white font-bold">Emergency Services</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/20">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Map area */}
        <div className="h-[55vh] sm:h-auto sm:flex-1 relative">
          <FacilityMap
            facilities={filtered}
            center={mapCenter}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
          />

          {/* Mobile: selected facility overlay at bottom of map */}
          {selected && (
            <div className="absolute bottom-2 left-2 right-2 sm:hidden z-[1000]">
              <FacilityDetail
                facility={selected}
                onClose={() => setSelectedId(null)}
                onSendInfo={handleSendInfo}
                sendStatus={sendStatus}
              />
            </div>
          )}
        </div>

        {/* Sidebar (desktop) / bottom drawer (mobile) */}
        <div className="w-full sm:w-[380px] bg-white sm:border-l border-attending-100 flex flex-col overflow-hidden flex-shrink-0 max-h-[45vh] sm:max-h-full">

          {/* Desktop header */}
          <div className="hidden sm:flex bg-gradient-to-r from-red-600 to-red-500 px-5 py-4 items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-white" />
              <div>
                <h2 className="text-white font-bold text-lg">Emergency Services</h2>
                {city && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-white/70" />
                    <span className="text-white/70 text-xs">{city}</span>
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Sidebar content */}
          <div className="overflow-y-auto flex-1 p-4 space-y-4">

            {/* 911 + Nurse line compact */}
            <div className="flex gap-2">
              <a href="tel:911" className="flex-1 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
                <Phone className="w-4 h-4 text-red-600" />
                <div>
                  <p className="text-xs font-bold text-red-800">Call 911</p>
                  <p className="text-[10px] text-red-600">Emergency</p>
                </div>
              </a>
              <a href="tel:8002246678" className="flex-1 flex items-center gap-2 p-3 bg-attending-50 border border-attending-100 rounded-xl hover:bg-attending-100 transition-colors">
                <PhoneCall className="w-4 h-4 text-attending-primary" />
                <div>
                  <p className="text-xs font-bold text-attending-deep-navy">Nurse Line</p>
                  <p className="text-[10px] text-attending-600">24/7</p>
                </div>
              </a>
            </div>

            {/* Care team — open by default, collapsible */}
            <details className="group" open>
              <summary className="flex items-center justify-between cursor-pointer text-sm font-semibold text-attending-deep-navy py-1 list-none">
                Your Care Team
                <ChevronDown className="w-4 h-4 text-attending-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-2 space-y-1.5">
                {CARE_CONTACTS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <a key={c.id} href={`tel:${c.phone.replace(/\D/g, '')}`}
                      className="flex items-center gap-2 p-2 bg-attending-50 rounded-lg hover:bg-attending-100 transition-colors">
                      <Icon className="w-4 h-4 text-attending-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-attending-deep-navy truncate">{c.label}</p>
                        <p className="text-[10px] text-attending-600">{c.available}</p>
                      </div>
                      <Phone className="w-3 h-3 text-green-600 flex-shrink-0" />
                    </a>
                  );
                })}
              </div>
            </details>

            {/* Triage warning banners */}
            {compassAlert && (() => {
              const triage = triageAlert(compassAlert);
              const symptomText = compassAlert.redFlags.length > 0
                ? compassAlert.redFlags.join(', ')
                : compassAlert.chiefComplaint;

              if (triage === 'call-911') return (
                <div className="bg-red-100 border-2 border-red-400 rounded-xl p-3 flex gap-2.5 animate-fade-in-up">
                  <Phone className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-900">Call 911 Immediately</p>
                    <p className="text-[11px] text-red-800 mt-1">
                      Your symptoms ({symptomText}) indicate a potentially life-threatening
                      emergency. Call 911 — every minute matters.
                    </p>
                    <a href="tel:911" className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg">
                      <Phone className="w-3.5 h-3.5" /> Call 911 Now
                    </a>
                  </div>
                </div>
              );

              if (triage === 'er-only') return (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2.5 animate-fade-in-up">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-800">ER Required — Do Not Go to Urgent Care</p>
                    <p className="text-[11px] text-red-700 mt-1">
                      Based on your symptoms ({symptomText}), you need emergency room care.
                      Urgent care facilities are not equipped to handle this condition.
                    </p>
                  </div>
                </div>
              );

              if (triage === 'er-preferred') return (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5 animate-fade-in-up">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-800">ER Recommended</p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      Based on your symptoms ({symptomText}), an emergency room is recommended.
                      ERs are highlighted below. Urgent care may stabilize but will likely transfer you.
                    </p>
                  </div>
                </div>
              );

              return null;
            })()}

            {/* Disclaimer — always visible when COMPASS alert active */}
            {compassAlert && (
              <p className="text-[9px] text-attending-600 text-center italic px-2 -mt-2">
                This is decision support only — not medical advice. When in doubt, call 911 or go to the nearest ER.
              </p>
            )}

            {/* Filter + facility list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-attending-deep-navy">
                  {erOnly ? 'Emergency Rooms' : 'Facilities'}
                </p>
                <button onClick={refresh} className="text-[10px] text-attending-primary font-medium">Refresh</button>
              </div>
              {!erOnly && (
              <div className="flex gap-1.5 mb-2">
                {([['all', 'All'], ['er', 'ER'], ['urgent-care', 'Urgent']] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                      activeTab === key ? 'bg-attending-primary text-white' : 'bg-attending-50 text-attending-600'
                    }`}>{label}</button>
                ))}
              </div>
              )}

              {facilitiesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 text-attending-primary animate-spin" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filtered.map((f) => {
                    const isSelected = f.facilityId === selectedId;
                    const waitColor =
                      f.waitMinutes === null ? 'text-gray-400' :
                      f.waitMinutes <= 15 ? 'text-green-600' :
                      f.waitMinutes <= 30 ? 'text-amber-600' :
                      'text-red-600';

                    return (
                      <button
                        key={f.facilityId}
                        onClick={() => setSelectedId(f.facilityId)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-attending-primary bg-attending-50 shadow-sm'
                            : 'border-attending-100 bg-white hover:border-attending-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center flex-shrink-0 w-12">
                            <span className={`text-lg font-bold leading-none ${waitColor}`}>
                              {f.waitMinutes ?? '—'}
                            </span>
                            <span className={`text-[9px] font-medium ${waitColor}`}>
                              {f.waitMinutes !== null ? 'min' : 'n/a'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-attending-deep-navy truncate">{f.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                                f.type === 'er' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                              }`}>{f.type === 'er' ? 'ER' : 'Urgent'}</span>
                              <span className={`text-[9px] ${f.status === 'open' ? 'text-green-600' : 'text-red-500'}`}>
                                {f.status === 'open' ? f.hours : 'Closed'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop: selected facility detail */}
            {selected && (
              <div className="hidden sm:block">
                <FacilityDetail
                  facility={selected}
                  onClose={() => setSelectedId(null)}
                  onSendInfo={handleSendInfo}
                  sendStatus={sendStatus}
                />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Medical ID Card (compact)
// ============================================================

function MedicalIDCard({ health }: { health: any }) {
  const allergies = health?.allergies ?? [{ allergen: 'Penicillin' }, { allergen: 'Sulfa drugs' }];
  const conditions = health?.conditions ?? [{ name: 'Hypertension' }, { name: 'Pre-diabetes' }];
  const medications = health?.medications ?? [{ name: 'Lisinopril 10mg' }, { name: 'Metformin 500mg' }];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0C4C5E 0%, #1A8FA8 60%, #25B8A9 100%)' }}
    >
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-white" />
          <span className="text-white font-bold text-sm tracking-wide">MEDICAL ID</span>
        </div>
        <span className="text-white/60 text-[10px] font-mono">ATTENDING AI</span>
      </div>
      <div className="px-5 pb-4">
        <h2 className="text-white text-2xl font-bold">Alex Morgan</h2>
        <p className="text-white/70 text-sm mt-0.5">DOB: 1984-07-22 · Male · 41 yr</p>
      </div>
      <div className="bg-white/10 backdrop-blur mx-3 rounded-xl p-4 mb-3 grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Droplets className="w-3 h-3 text-red-300" />
            <span className="text-[10px] text-white/60 font-semibold uppercase">Blood Type</span>
          </div>
          <p className="text-white font-bold text-lg">O+</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3 h-3 text-yellow-300" />
            <span className="text-[10px] text-white/60 font-semibold uppercase">Allergies</span>
          </div>
          <p className="text-white font-bold text-sm">{allergies[0]?.allergen ?? allergies[0]?.name ?? 'None'}</p>
          {allergies[1] && <p className="text-white/70 text-xs">{allergies[1]?.allergen ?? allergies[1]?.name}</p>}
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Heart className="w-3 h-3 text-pink-300" />
            <span className="text-[10px] text-white/60 font-semibold uppercase">Conditions</span>
          </div>
          <p className="text-white font-bold text-sm">{conditions[0]?.name ?? 'None'}</p>
          {conditions[1] && <p className="text-white/70 text-xs">{conditions[1]?.name}</p>}
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Pill className="w-3 h-3 text-green-300" />
            <span className="text-[10px] text-white/60 font-semibold uppercase">Medications</span>
          </div>
          <p className="text-white font-bold text-sm">{medications[0]?.name ?? 'None'}</p>
          {medications[1] && <p className="text-white/70 text-xs">{medications[1]?.name}</p>}
        </div>
      </div>
      <div className="px-5 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-white/50" />
          <span className="text-white/50 text-xs">No advanced directive on file</span>
        </div>
        <Link href="/emergency/medical-id" className="text-white/70 text-xs font-medium underline underline-offset-2 hover:text-white">
          Edit
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Emergency Contacts
// ============================================================

function EmergencyContacts({ contactsData }: { contactsData: any[] | null }) {
  const contacts = (contactsData ?? []).map((c: any) => ({
    id: c.id, name: c.name, relationship: c.relationship, phone: c.phone, isPrimary: c.isPrimary ?? false,
  }));
  if (contacts.length === 0) {
    contacts.push(
      { id: '1', name: 'Jamie Morgan', relationship: 'Spouse', phone: '(555) 123-4567', isPrimary: true },
      { id: '2', name: 'Robert Morgan', relationship: 'Father', phone: '(555) 987-6543', isPrimary: false },
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-attending-deep-navy">Emergency Contacts</h3>
        <Link href="/emergency/contacts" className="text-xs text-attending-primary font-medium">Edit</Link>
      </div>
      <div className="card-attending divide-y divide-attending-50">
        {contacts.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-attending-50 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-attending-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-attending-deep-navy">{c.name}</p>
                {c.isPrimary && (
                  <span className="text-[10px] font-semibold bg-attending-50 text-attending-primary px-2 py-0.5 rounded-full">Primary</span>
                )}
              </div>
              <p className="text-xs text-attending-600">{c.relationship} · {c.phone}</p>
            </div>
            <a href={`tel:${c.phone.replace(/\D/g, '')}`} className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-green-600" />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// Crash Detection
// ============================================================

function CrashDetection() {
  const [enabled, setEnabled] = useState(true);

  return (
    <section>
      <h3 className="text-sm font-semibold text-attending-deep-navy mb-3 flex items-center gap-2">
        <Car className="w-4 h-4 text-attending-coral" />
        Crash Detection
      </h3>
      <div className="card-attending overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-attending-deep-navy">Impact Detection</p>
            <p className="text-xs text-attending-600 mt-0.5">Accelerometer monitors for severe impacts</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
              enabled ? 'bg-attending-primary' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transition-transform ${
              enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
            }`} />
          </button>
        </div>
        {enabled && (
          <div className="border-t border-attending-50 px-4 py-3 space-y-2">
            {[
              { label: 'Auto-dial 911 after countdown', on: true },
              { label: 'Alert sound to help locate you', on: true },
              { label: 'Notify emergency contacts via SMS', on: true },
              { label: 'Share GPS with first responders', on: true },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between py-1">
                <span className="text-xs text-attending-deep-navy">{s.label}</span>
                <div className={`inline-flex items-center w-9 h-5 rounded-full flex-shrink-0 ${s.on ? 'bg-attending-primary' : 'bg-gray-300'}`}>
                  <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    s.on ? 'translate-x-[18px]' : 'translate-x-[2px]'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/emergency/crash-settings"
          className="block border-t border-attending-50 px-4 py-3 text-xs text-attending-primary font-medium hover:bg-attending-50 transition-colors"
        >
          Advanced Settings
        </Link>
      </div>
    </section>
  );
}

// ============================================================
// Settings Links
// ============================================================

function SettingsLinks() {
  const links = [
    { href: '/emergency/access-settings', icon: Lock, label: 'First Responder Access', sub: 'PIN, countdown, access duration' },
    { href: '/emergency/history', icon: Eye, label: 'Access History', sub: 'View who accessed your info' },
    { href: '/emergency/medical-id', icon: FileText, label: 'Edit Medical ID', sub: 'Conditions, allergies, medications' },
    { href: '/emergency/directive', icon: Heart, label: 'Advanced Directive', sub: 'DNR, living will, healthcare proxy' },
  ];

  return (
    <section>
      <h3 className="text-sm font-semibold text-attending-deep-navy mb-3">Settings</h3>
      <div className="card-attending divide-y divide-attending-50">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-attending-50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-attending-50 flex items-center justify-center flex-shrink-0">
              <link.icon className="w-4 h-4 text-attending-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-attending-deep-navy">{link.label}</p>
              <p className="text-xs text-attending-600">{link.sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-attending-600 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// Main
// ============================================================

export default function EmergencyPage() {
  const { contacts, crashSettings, loading } = useEmergencySettings();
  const { health } = usePatientData();
  const geo = useGeolocation();
  const [panelOpen, setPanelOpen] = useState(false);

  // COMPASS alert — populated when COMPASS triggers emergency routing.
  // In production this comes from the COMPASS assessment store/context.
  // For demo: read from sessionStorage so COMPASS can set it.
  const [compassAlert, setCompassAlert] = useState<CompassAlert | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('compass-emergency-alert');
      if (stored) setCompassAlert(JSON.parse(stored));
    } catch { /* ignore */ }

    // Listen for COMPASS pushing an alert during this session
    function handleCompassAlert(e: StorageEvent) {
      if (e.key === 'compass-emergency-alert' && e.newValue) {
        try { setCompassAlert(JSON.parse(e.newValue)); } catch { /* ignore */ }
      }
    }
    window.addEventListener('storage', handleCompassAlert);
    return () => window.removeEventListener('storage', handleCompassAlert);
  }, []);

  return (
    <>
      <Head>
        <title>Emergency Services | ATTENDING AI</title>
      </Head>

      <AppShell
        header={
          <header className="bg-white border-b border-light safe-area-top">
            <div className="max-w-lg mx-auto px-5 pt-5 pb-4">
              <h1 className="text-xl font-bold text-attending-deep-navy flex items-center gap-2">
                <Shield className="w-6 h-6 text-attending-primary" />
                Emergency Services
              </h1>
            </div>
          </header>
        }
      >
        <div className="bg-attending-800 dashboard-bg pb-8">
          <div className="max-w-lg mx-auto px-4 sm:px-5 py-5 space-y-5">

            {/* THE button */}
            <button
              onClick={() => setPanelOpen(true)}
              className="w-full group"
            >
              <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-2xl p-6 text-white text-left shadow-lg hover:from-red-700 hover:to-red-600 transition-all relative overflow-hidden">
                {/* Subtle pulse ring */}
                <div className="absolute inset-0 rounded-2xl pulse-emergency pointer-events-none" />

                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xl font-bold">Get Emergency Services</p>
                    <p className="text-sm text-white/80 mt-1">
                      911, urgent care, nurse line, ER near you
                    </p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-white/60 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            {/* Medical ID */}
            <MedicalIDCard health={health} />

            {/* Contacts, Crash, Settings */}
            <div className="bg-attending-50 rounded-xl border border-attending-100 p-4 space-y-6">
              <EmergencyContacts contactsData={contacts} />
              <CrashDetection />
              <SettingsLinks />
            </div>

          </div>
        </div>
      </AppShell>

      {/* Emergency Services Panel */}
      <EmergencyServicesPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        city={geo.city}
        lat={geo.lat}
        lng={geo.lng}
        compassAlert={compassAlert}
      />
    </>
  );
}
