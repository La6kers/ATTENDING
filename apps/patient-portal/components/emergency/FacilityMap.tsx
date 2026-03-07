// ============================================================
// ATTENDING AI — Facility Map (iframe-based Leaflet)
// components/emergency/FacilityMap.tsx
//
// Renders an iframe loading a self-contained Leaflet map from
// /facility-map.html. Uses iframe onLoad + postMessage.
// ============================================================

import React, { useEffect, useRef } from 'react';

interface Facility {
  facilityId: string;
  name: string;
  type: 'er' | 'urgent-care' | 'clinic';
  address: string;
  phone: string;
  lat: number;
  lng: number;
  waitMinutes: number | null;
  status: 'open' | 'closed' | 'diverting';
  hours: string;
}

interface FacilityMapProps {
  facilities: Facility[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function FacilityMap({ facilities, center, selectedId, onSelect }: FacilityMapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  // Store latest props in refs so the onLoad callback always has current data
  const facilitiesRef = useRef(facilities);
  const centerRef = useRef(center);
  const selectedIdRef = useRef(selectedId);

  facilitiesRef.current = facilities;
  centerRef.current = center;
  selectedIdRef.current = selectedId;

  function send(msg: any) {
    try {
      iframeRef.current?.contentWindow?.postMessage(msg, '*');
    } catch { /* ignore */ }
  }

  // When iframe loads, send init with latest data
  function handleLoad() {
    readyRef.current = true;
    setTimeout(() => {
      send({
        type: 'init',
        center: centerRef.current,
        facilities: facilitiesRef.current,
        selectedId: selectedIdRef.current,
      });
    }, 150);
  }

  // Listen for click events from iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'facility-select') {
        onSelect(e.data.facilityId);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSelect]);

  // Send updates whenever facilities or selection changes
  useEffect(() => {
    if (!readyRef.current) return;
    send({ type: 'update', facilities, selectedId });
  }, [facilities, selectedId]);

  return (
    <iframe
      ref={iframeRef}
      src="/facility-map.html"
      onLoad={handleLoad}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
      }}
      title="Facility Map"
      allow="geolocation"
    />
  );
}
