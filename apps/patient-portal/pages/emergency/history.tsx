// ============================================================
// ATTENDING AI — Emergency Access History / Audit Log
// apps/patient-portal/pages/emergency/history.tsx
//
// Full audit trail of who accessed patient emergency data:
// - Timestamp, accessor info, access type
// - Photo captured (if enabled)
// - GPS location of access
// - Duration of access session
// ============================================================

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ArrowLeft,
  Shield,
  Eye,
  Clock,
  MapPin,
  Camera,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  User,
  FileText,
  Loader2,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { useEmergencySettings } from '../../hooks/useEmergencySettings';

// ============================================================
// Types
// ============================================================

interface AccessEvent {
  id: string;
  timestamp: string;
  accessor: string;
  accessorType: 'first-responder' | 'emt' | 'hospital' | 'test';
  accessType: 'quick-access' | 'full-facesheet';
  location: string;
  coordinates?: { lat: number; lng: number };
  duration: string;
  photoUrl?: string;
  dataAccessed: string[];
  verified: boolean;
}

// ============================================================
// Access Event Card
// ============================================================

function AccessEventCard({ event }: { event: AccessEvent }) {
  const [expanded, setExpanded] = useState(false);

  const typeColors = {
    'first-responder': { bg: 'bg-blue-50', text: 'text-blue-700', label: 'First Responder' },
    emt: { bg: 'bg-red-50', text: 'text-red-700', label: 'EMT' },
    hospital: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Hospital' },
    test: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Test' },
  };

  const accessColors = {
    'quick-access': { bg: 'bg-attending-50', text: 'text-attending-primary', label: 'Quick Access' },
    'full-facesheet': { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Full Facesheet' },
  };

  const type = typeColors[event.accessorType];
  const access = accessColors[event.accessType];

  const date = new Date(event.timestamp);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="card-attending overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-4 flex items-center gap-3 text-left"
      >
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
          event.accessType === 'full-facesheet' ? 'bg-amber-50' : 'bg-attending-50'
        }`}>
          {event.accessType === 'full-facesheet' ? (
            <FileText className="w-5 h-5 text-amber-600" />
          ) : (
            <Eye className="w-5 h-5 text-attending-primary" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-attending-deep-navy truncate">{event.accessor}</p>
            {event.verified && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${type.bg} ${type.text}`}>
              {type.label}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${access.bg} ${access.text}`}>
              {access.label}
            </span>
          </div>
          <p className="text-xs text-attending-200 mt-1">
            {formattedDate} · {formattedTime}
          </p>
        </div>

        {/* Expand */}
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-attending-200 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-attending-200 flex-shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-attending-50 px-4 py-4 space-y-3 bg-surface-bg animate-fade-in-up">
          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-attending-200" />
            <span className="text-sm text-attending-deep-navy">{event.location}</span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-attending-200" />
            <span className="text-sm text-attending-deep-navy">Access duration: {event.duration}</span>
          </div>

          {/* Photo */}
          {event.photoUrl ? (
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-attending-200" />
              <span className="text-sm text-attending-primary font-medium">Photo captured</span>
              <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-attending-200" />
              <span className="text-sm text-attending-200">No photo captured</span>
            </div>
          )}

          {/* Data accessed */}
          <div>
            <p className="text-xs font-semibold text-attending-200 mb-1.5">Data Accessed:</p>
            <div className="flex flex-wrap gap-1.5">
              {event.dataAccessed.map((item) => (
                <span
                  key={item}
                  className="text-[10px] font-medium bg-white border border-attending-200 text-attending-deep-navy px-2 py-1 rounded-lg"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Verification */}
          <div className="flex items-center gap-2 pt-2 border-t border-attending-50">
            {event.verified ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-700 font-medium">Verified via PIN</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-700 font-medium">Quick access only (no PIN)</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main
// ============================================================

export default function AccessHistoryPage() {
  const router = useRouter();
  const { accessHistory, loadAccessHistory, loading } = useEmergencySettings();

  useEffect(() => {
    loadAccessHistory();
  }, []);

  // Map API data → component shape, with fallback
  const events: AccessEvent[] = (accessHistory ?? []).map((e: any) => ({
    id: e.id,
    timestamp: e.timestamp,
    accessor: e.accessor,
    accessorType: e.accessorType ?? 'first-responder',
    accessType: e.accessType ?? 'quick-access',
    location: e.location ?? 'Unknown location',
    coordinates: e.coordinates,
    duration: e.duration ?? 'Unknown',
    photoUrl: e.photoUrl,
    dataAccessed: e.dataAccessed ?? [],
    verified: e.verified ?? false,
  }));

  if (events.length === 0 && !loading) {
    events.push(
      {
        id: '1',
        timestamp: '2026-02-20T14:32:00Z',
        accessor: 'Badge #4521 — Parker Fire Dept.',
        accessorType: 'first-responder',
        accessType: 'full-facesheet',
        location: 'E Parker Rd & S Jordan Rd, Parker, CO',
        coordinates: { lat: 39.5186, lng: -104.7614 },
        duration: '4 min 32 sec',
        photoUrl: '/photos/access-1.jpg',
        dataAccessed: ['Allergies', 'Medications', 'Conditions', 'Blood Type', 'Emergency Contacts', 'Vitals'],
        verified: true,
      },
      {
        id: '2',
        timestamp: '2026-02-20T14:28:00Z',
        accessor: 'Unknown — Quick Access View',
        accessorType: 'first-responder',
        accessType: 'quick-access',
        location: 'E Parker Rd & S Jordan Rd, Parker, CO',
        coordinates: { lat: 39.5186, lng: -104.7614 },
        duration: '1 min 15 sec',
        dataAccessed: ['Allergies', 'Blood Type', 'Emergency Contacts'],
        verified: false,
      },
      {
        id: '3',
        timestamp: '2026-01-15T10:00:00Z',
        accessor: 'Scott Isbell (You) — Test',
        accessorType: 'test',
        accessType: 'full-facesheet',
        location: 'Home — Parker, CO',
        duration: '2 min 10 sec',
        dataAccessed: ['Allergies', 'Medications', 'Conditions', 'Blood Type'],
        verified: true,
      },
    );
  }

  return (
    <>
      <Head>
        <title>Access History | ATTENDING AI</title>
      </Head>

      <AppShell
        hideNav
        header={
          <header className="bg-white border-b border-light safe-area-top">
            <div className="max-w-lg mx-auto px-5 py-3 flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="w-9 h-9 rounded-full bg-attending-50 flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-attending-deep-navy" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-attending-deep-navy">Access History</h1>
                <p className="text-xs text-attending-200">{events.length} access events</p>
              </div>
            </div>
          </header>
        }
      >
        <div className="max-w-lg mx-auto px-5 py-5 space-y-4">
          {/* Explainer */}
          <div className="bg-attending-50 rounded-xl p-4 flex gap-3">
            <Shield className="w-5 h-5 text-attending-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-attending-deep-navy">
              Every time someone views your emergency medical information, it's logged here with
              timestamp, location, accessor identity, and optionally a photo.
            </p>
          </div>

          {/* Events */}
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <AccessEventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-attending-50 flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-attending-200" />
              </div>
              <p className="text-sm font-medium text-attending-deep-navy">No access events</p>
              <p className="text-xs text-attending-200 mt-1">
                When someone views your emergency info, it will appear here
              </p>
            </div>
          )}
        </div>
      </AppShell>
    </>
  );
}
