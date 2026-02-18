// ============================================================
// Dashboard Grid with Snap-to-Edge Resizing
// apps/provider-portal/components/dashboard/DashboardGridSnap.tsx
//
// Alternative to DashboardGrid.tsx (which uses react-grid-layout).
// This version uses CSS Grid with edge-based resize bars that snap
// to preset sizes. No edit mode required — controls appear on hover.
//
// Width snap points: 1/4, 1/3, 1/2, Full
// Height snap points: Title Only, Compact, Medium, Large, X-Large
//
// Created: February 2, 2026
// Integrated into git: February 18, 2026
// ============================================================

import React, { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { Minimize2, Maximize2, AlertTriangle, Activity, FileText, Pill, FlaskConical, Brain } from 'lucide-react';

// ============================================================
// Configuration
// ============================================================

/** Width snap points in grid columns (out of 12) */
const WIDTH_SNAPS = [3, 4, 6, 12] as const;
const WIDTH_LABELS: Record<number, string> = { 3: '1/4', 4: '1/3', 6: '1/2', 12: 'Full' };

/** Height snap points in row units */
const HEIGHT_SNAPS = [1, 2, 3, 4, 5] as const;
const HEIGHT_LABELS: Record<number, string> = { 1: 'Title', 2: 'Compact', 3: 'Medium', 4: 'Large', 5: 'X-Large' };

const GRID_COLS = 12;
const ROW_HEIGHT = 70;
const GAP = 12;

// ============================================================
// Types
// ============================================================

interface CardLayout {
  colSpan: number;
  rowSpan: number;
}

interface CardConfig {
  id: string;
  title: string;
  icon: React.ElementType;
  priority?: 'critical' | 'warning' | 'normal';
  content: ReactNode;
}

// ============================================================
// Snap Utility
// ============================================================

const snapToNearest = (value: number, snapPoints: readonly number[]): number => {
  return snapPoints.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
};

// ============================================================
// Dashboard Card with Edge Resize
// ============================================================

interface DashboardCardProps {
  card: CardConfig;
  colSpan: number;
  rowSpan: number;
  onResize: (id: string, layout: CardLayout) => void;
  gridCellWidth: number;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  card, colSpan, rowSpan, onResize, gridCellWidth,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [isDraggingBottom, setIsDraggingBottom] = useState(false);
  const [previewLabel, setPreviewLabel] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);

  const isMinimized = rowSpan === 1;
  const IconComponent = card.icon;

  const priorityColors: Record<string, string> = {
    critical: '#ef4444',
    warning: '#f59e0b',
    normal: '#e5e7eb',
  };

  // --- Right edge drag (width) ---
  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingRight(true);
    startX.current = e.clientX;
  }, []);

  // --- Bottom edge drag (height) ---
  const handleBottomMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingBottom(true);
    startY.current = e.clientY;
  }, []);

  useEffect(() => {
    if (!isDraggingRight && !isDraggingBottom) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRight) {
        const deltaX = e.clientX - startX.current;
        const cellWidth = gridCellWidth + GAP;
        const rawCols = colSpan + Math.round(deltaX / cellWidth);
        const snapped = snapToNearest(Math.max(3, Math.min(12, rawCols)), WIDTH_SNAPS);
        setPreviewLabel(WIDTH_LABELS[snapped] || '');
        onResize(card.id, { colSpan: snapped, rowSpan });
      }
      if (isDraggingBottom) {
        const deltaY = e.clientY - startY.current;
        const rawRows = rowSpan + Math.round(deltaY / ROW_HEIGHT);
        const snapped = snapToNearest(Math.max(1, Math.min(5, rawRows)), HEIGHT_SNAPS);
        setPreviewLabel(HEIGHT_LABELS[snapped] || '');
        onResize(card.id, { colSpan, rowSpan: snapped });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingRight(false);
      setIsDraggingBottom(false);
      setPreviewLabel('');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingRight, isDraggingBottom, colSpan, rowSpan, gridCellWidth, card.id, onResize]);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        background: 'white',
        border: `1px solid ${card.priority ? priorityColors[card.priority] : '#e5e7eb'}`,
        borderRadius: 10,
        position: 'relative',
        overflow: 'hidden',
        transition: isDraggingRight || isDraggingBottom ? 'none' : 'all 0.2s ease',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Card Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        borderBottom: isMinimized ? 'none' : '1px solid #f3f4f6',
        background: card.priority === 'critical' ? '#fef2f2' : card.priority === 'warning' ? '#fffbeb' : 'transparent',
      }}>
        <IconComponent size={15} color={card.priority ? priorityColors[card.priority] : '#6b7280'} />
        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: '#111827' }}>{card.title}</span>

        {/* Size indicator on hover */}
        {isHovered && (
          <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>
            {WIDTH_LABELS[colSpan]} · {HEIGHT_LABELS[rowSpan]}
          </span>
        )}

        {/* Minimize / Maximize */}
        {isHovered && (
          <button
            onClick={() => onResize(card.id, { colSpan, rowSpan: isMinimized ? 3 : 1 })}
            style={{
              padding: 4, background: '#f3f4f6', borderRadius: 4, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
        )}
      </div>

      {/* Card Content */}
      {!isMinimized && (
        <div style={{ padding: '10px 14px', overflow: 'auto', height: `calc(100% - 44px)`, fontSize: 13, color: '#374151' }}>
          {card.content}
        </div>
      )}

      {/* Right Edge Resize Bar */}
      {isHovered && !isMinimized && (
        <div
          onMouseDown={handleRightMouseDown}
          style={{
            position: 'absolute', top: 8, right: 0, bottom: 8, width: 6,
            background: isDraggingRight ? '#3b82f6' : 'transparent',
            cursor: 'ew-resize', borderRadius: 3,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#93c5fd')}
          onMouseLeave={(e) => { if (!isDraggingRight) e.currentTarget.style.background = 'transparent'; }}
        />
      )}

      {/* Bottom Edge Resize Bar */}
      {isHovered && !isMinimized && (
        <div
          onMouseDown={handleBottomMouseDown}
          style={{
            position: 'absolute', left: 8, right: 8, bottom: 0, height: 6,
            background: isDraggingBottom ? '#3b82f6' : 'transparent',
            cursor: 'ns-resize', borderRadius: 3,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#93c5fd')}
          onMouseLeave={(e) => { if (!isDraggingBottom) e.currentTarget.style.background = 'transparent'; }}
        />
      )}

      {/* Snap Preview Label */}
      {previewLabel && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: '#1e293b', color: 'white', padding: '6px 14px', borderRadius: 8,
          fontSize: 13, fontWeight: 700, pointerEvents: 'none', zIndex: 10,
        }}>
          {previewLabel}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Default Card Content (Clinical Mock Data)
// ============================================================

const VitalsContent = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
    {[
      { label: 'BP', value: '128/82', unit: 'mmHg' },
      { label: 'HR', value: '76', unit: 'bpm' },
      { label: 'Temp', value: '98.4', unit: '°F' },
      { label: 'SpO2', value: '98', unit: '%' },
      { label: 'RR', value: '16', unit: '/min' },
      { label: 'BMI', value: '24.3', unit: '' },
    ].map(v => (
      <div key={v.label} style={{ padding: 8, background: '#f9fafb', borderRadius: 6 }}>
        <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{v.label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>{v.value} <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>{v.unit}</span></div>
      </div>
    ))}
  </div>
);

const LabResultsContent = () => (
  <div>
    {[
      { test: 'CBC - WBC', value: '7.2', range: '4.5-11.0', status: 'normal' },
      { test: 'BMP - Glucose', value: '142', range: '70-100', status: 'high' },
      { test: 'HbA1c', value: '7.1', range: '<5.7', status: 'high' },
      { test: 'TSH', value: '2.4', range: '0.5-5.0', status: 'normal' },
      { test: 'Creatinine', value: '0.9', range: '0.7-1.3', status: 'normal' },
    ].map(l => (
      <div key={l.test} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
        <span style={{ fontWeight: 500 }}>{l.test}</span>
        <span style={{ color: l.status === 'high' ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{l.value}</span>
        <span style={{ color: '#9ca3af' }}>{l.range}</span>
      </div>
    ))}
  </div>
);

const MedicationsContent = () => (
  <div>
    {[
      { name: 'Metformin 1000mg', freq: 'BID', status: 'Active' },
      { name: 'Lisinopril 20mg', freq: 'Daily', status: 'Active' },
      { name: 'Atorvastatin 40mg', freq: 'Daily', status: 'Active' },
      { name: 'Aspirin 81mg', freq: 'Daily', status: 'Active' },
    ].map(m => (
      <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12 }}>
        <span style={{ fontWeight: 500 }}>{m.name}</span>
        <span style={{ color: '#6b7280' }}>{m.freq}</span>
      </div>
    ))}
  </div>
);

const AIRecommendationsContent = () => (
  <div>
    <div style={{ padding: 10, background: '#fef3c7', borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 4 }}>⚠️ HbA1c Trending Up</div>
      <div style={{ color: '#a16207' }}>Consider adjusting Metformin dose or adding GLP-1 agonist. Last 3 values: 6.4 → 6.8 → 7.1</div>
    </div>
    <div style={{ padding: 10, background: '#dbeafe', borderRadius: 8, fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: 4 }}>💡 Screening Due</div>
      <div style={{ color: '#1d4ed8' }}>Annual diabetic retinopathy screening overdue by 3 months.</div>
    </div>
  </div>
);

const ClinicalAlertsContent = () => (
  <div>
    <div style={{ padding: 10, background: '#fef2f2', borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>🔴 Drug Interaction Detected</div>
      <div style={{ color: '#b91c1c' }}>Lisinopril + potential NSAID use. Verify with patient.</div>
    </div>
    <div style={{ padding: 10, background: '#fef2f2', borderRadius: 8, fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>🔴 Allergy Alert</div>
      <div style={{ color: '#b91c1c' }}>Penicillin allergy documented. Check cross-reactivity.</div>
    </div>
  </div>
);

// ============================================================
// Default Card Configurations
// ============================================================

const DEFAULT_CARDS: CardConfig[] = [
  { id: 'alerts', title: 'Clinical Alerts', icon: AlertTriangle, priority: 'critical', content: <ClinicalAlertsContent /> },
  { id: 'vitals', title: 'Vital Signs', icon: Activity, priority: 'normal', content: <VitalsContent /> },
  { id: 'labs', title: 'Lab Results', icon: FlaskConical, priority: 'warning', content: <LabResultsContent /> },
  { id: 'meds', title: 'Active Medications', icon: Pill, priority: 'normal', content: <MedicationsContent /> },
  { id: 'ai', title: 'AI Recommendations', icon: Brain, priority: 'normal', content: <AIRecommendationsContent /> },
  { id: 'notes', title: 'Visit Notes', icon: FileText, priority: 'normal', content: <div style={{ fontSize: 12, color: '#6b7280' }}>No notes for this visit yet. Click to start documenting.</div> },
];

const DEFAULT_LAYOUTS: Record<string, CardLayout> = {
  alerts: { colSpan: 6, rowSpan: 2 },
  vitals: { colSpan: 6, rowSpan: 3 },
  labs: { colSpan: 4, rowSpan: 3 },
  meds: { colSpan: 4, rowSpan: 3 },
  ai: { colSpan: 4, rowSpan: 3 },
  notes: { colSpan: 12, rowSpan: 2 },
};

// ============================================================
// Main Snap Grid Component
// ============================================================

interface DashboardGridSnapProps {
  cards?: CardConfig[];
  initialLayouts?: Record<string, CardLayout>;
}

export default function DashboardGridSnap({ cards = DEFAULT_CARDS, initialLayouts = DEFAULT_LAYOUTS }: DashboardGridSnapProps) {
  const [layouts, setLayouts] = useState<Record<string, CardLayout>>(initialLayouts);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridCellWidth, setGridCellWidth] = useState(80);

  // Measure grid cell width
  useEffect(() => {
    const measure = () => {
      if (gridRef.current) {
        const totalWidth = gridRef.current.clientWidth;
        const cellWidth = (totalWidth - GAP * (GRID_COLS - 1)) / GRID_COLS;
        setGridCellWidth(cellWidth);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const handleResize = useCallback((id: string, layout: CardLayout) => {
    setLayouts(prev => ({ ...prev, [id]: layout }));
  }, []);

  return (
    <div>
      {/* Hint Bar */}
      <div style={{
        margin: '0 24px 12px', padding: '8px 16px', background: '#f0f9ff', border: '1px solid #bae6fd',
        borderRadius: 8, fontSize: 11, color: '#0369a1', display: 'flex', gap: 20, alignItems: 'center',
      }}>
        <span><strong>↔ Width:</strong> Drag right edge to snap to 1/4, 1/3, 1/2, Full</span>
        <span><strong>↕ Height:</strong> Drag bottom edge to snap to Title, Compact, Medium, Large, X-Large</span>
        <span><strong>⊟ Minimize:</strong> Hover card → click minimize button</span>
      </div>

      {/* Dashboard Grid */}
      <div
        ref={gridRef}
        style={{
          margin: '0 24px 24px',
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gridAutoRows: `${ROW_HEIGHT}px`,
          gap: `${GAP}px`,
        }}
      >
        {cards.map(card => (
          <DashboardCard
            key={card.id}
            card={card}
            colSpan={layouts[card.id]?.colSpan ?? 6}
            rowSpan={layouts[card.id]?.rowSpan ?? 3}
            onResize={handleResize}
            gridCellWidth={gridCellWidth}
          />
        ))}
      </div>
    </div>
  );
}
