// =============================================================================
// ATTENDING AI - Provider Inbox Expanded Panel
// apps/provider-portal/components/inbox/ExpandedPanel.tsx
// =============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  ChevronDown,
  ChevronRight,
  Forward,
  UserPlus,
  ExternalLink,
  AlertTriangle,
  Activity,
  ClipboardList,
  Sparkles,
  Check,
  GripVertical,
  GripHorizontal,
  Stethoscope,
  AlertOctagon,
  Phone,
  FileText,
} from 'lucide-react';
import type { InboxItem, ResponseTemplate } from './types';
import { theme, categoryConfig, getPurpleGradientStyle } from './theme';

function generateAITemplates(item: InboxItem): ResponseTemplate[] {
  const templates: ResponseTemplate[] = [];
  const firstName = item.patientName.split(' ')[0];

  switch (item.category) {
    case 'phone':
      templates.push({
        id: 'call',
        title: '📞 Call Patient',
        category: 'action',
        confidence: 0.95,
        reasoning: 'Callback requested - patient awaiting response',
        content: `Call ${firstName} at ${item.callbackNumber}`,
      });
      break;
    case 'messages':
      templates.push({
        id: 'reply',
        title: '✉️ Send Reply',
        category: 'communication',
        confidence: 0.9,
        reasoning: 'Patient message requires response',
        content: `Dear ${firstName},\n\nThank you for reaching out.\n\nBest regards,\nDr. Reed`,
      });
      break;
    case 'refills':
      templates.push({
        id: 'approve',
        title: '✓ Approve Refill',
        category: 'approval',
        confidence: 0.95,
        reasoning: 'Patient compliant, no contraindications',
        content: `Approve ${item.medication} - send to ${item.pharmacy}`,
      });
      break;
    case 'labs':
      templates.push({
        id: 'review',
        title: '✓ Results Reviewed',
        category: 'documentation',
        confidence: 0.92,
        reasoning: 'Standard lab review protocol',
        content: 'Lab results reviewed and filed in chart.',
      });
      break;
    case 'imaging':
      templates.push({
        id: 'review',
        title: '✓ Imaging Reviewed',
        category: 'documentation',
        confidence: 0.9,
        reasoning: 'Radiology report available',
        content: 'Imaging reviewed. Will discuss with patient at next visit.',
      });
      break;
    case 'charts':
      templates.push({
        id: 'acknowledge',
        title: '✓ Acknowledge',
        category: 'documentation',
        confidence: 0.9,
        reasoning: 'Consultant note requires acknowledgment',
        content: `Reviewed ${item.fromProvider} note. Recommendations noted.`,
      });
      break;
    case 'incomplete':
      templates.push({
        id: 'sign',
        title: '✓ Sign & Close',
        category: 'completion',
        confidence: 0.95,
        reasoning: 'Documentation complete, ready for signature',
        content: 'Chart reviewed and signed.',
      });
      break;
    case 'encounters':
      templates.push({
        id: 'start',
        title: '▶️ Start Visit',
        category: 'action',
        confidence: 0.95,
        reasoning: 'Patient ready in room',
        content: `Starting visit - ${item.roomNumber}`,
      });
      break;
  }

  return templates;
}

interface ResizableSectionProps {
  title: string;
  icon: React.ReactNode;
  badge?: string | number;
  isOpen: boolean;
  onToggle: () => void;
  height: number;
  onHeightChange: (height: number) => void;
  accentColor: string;
  children: React.ReactNode;
}

const ResizableSection: React.FC<ResizableSectionProps> = ({
  title,
  icon,
  badge,
  isOpen,
  onToggle,
  height,
  onHeightChange,
  accentColor,
  children,
}) => {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newHeight = Math.max(60, Math.min(400, startHeight.current + (e.clientY - startY.current)));
      onHeightChange(newHeight);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onHeightChange]);

  return (
    <div
      style={{
        background: theme.purple[100],
        borderBottom: `1px solid ${theme.purple[200]}`,
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-center justify-between transition-colors"
        style={{ background: 'transparent' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = theme.purple[200])}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: isOpen ? theme.purple[700] : theme.purple[400] }}>
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
          <span style={{ color: theme.purple[700] }}>{icon}</span>
          <span className="font-semibold text-sm" style={{ color: theme.text.primary }}>
            {title}
          </span>
          {badge !== undefined && (
            <span
              className="px-2 py-0.5 text-xs rounded-full font-medium"
              style={{ background: theme.purple[200], color: theme.purple[700] }}
            >
              {badge}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="px-3 pb-3 overflow-y-auto"
            style={{ height: `${height}px`, background: theme.purple[100] }}
          >
            {children}
          </div>

          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              isDragging.current = true;
              startY.current = e.clientY;
              startHeight.current = height;
              document.body.style.cursor = 'row-resize';
              document.body.style.userSelect = 'none';
            }}
            className="h-2 cursor-row-resize flex items-center justify-center transition-colors"
            style={{ background: theme.purple[200] }}
            onMouseEnter={(e) => (e.currentTarget.style.background = theme.purple[300])}
            onMouseLeave={(e) => (e.currentTarget.style.background = theme.purple[200])}
          >
            <GripHorizontal className="w-4 h-4" style={{ color: theme.purple[500] }} />
          </div>
        </>
      )}
    </div>
  );
};

interface ExpandedPanelProps {
  item: InboxItem;
  onClose: () => void;
  onComplete: (response: string) => void;
  onForward: () => void;
  onReassign: () => void;
}

export const ExpandedPanel: React.FC<ExpandedPanelProps> = ({
  item,
  onClose,
  onComplete,
  onForward,
  onReassign,
}) => {
  const router = useRouter();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['symptoms']));
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [panelWidth, setPanelWidth] = useState(50);
  const [totalHeight, setTotalHeight] = useState(400);
  const [sectionHeights, setSectionHeights] = useState({
    symptoms: 140,
    chart: 140,
    ai: 120,
  });

  const templates = generateAITemplates(item);
  const chart = item.chartData;
  const categoryAccent = categoryConfig[item.category];

  const isDraggingH = useRef(false);
  const isDraggingTotal = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startH = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingH.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
        setPanelWidth(Math.min(70, Math.max(30, newWidth)));
      }
      if (isDraggingTotal.current) {
        const newHeight = startH.current + (e.clientY - startY.current);
        setTotalHeight(Math.max(250, Math.min(700, newHeight)));
      }
    };

    const handleMouseUp = () => {
      isDraggingH.current = false;
      isDraggingTotal.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleTemplateSelect = (template: ResponseTemplate) => {
    setResponse(template.content);
    setSelectedTemplate(template.id);
  };

  const getSectionTitle = (): string => {
    switch (item.category) {
      case 'incomplete':
        return 'Missing Elements';
      case 'encounters':
        return 'Visit Information';
      default:
        return 'Presenting Symptoms';
    }
  };

  const getSectionIcon = (): React.ReactNode => {
    switch (item.category) {
      case 'incomplete':
        return <AlertOctagon className="w-4 h-4" />;
      case 'encounters':
        return <Stethoscope className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div
      style={{
        background: 'white',
        borderBottom: `4px solid ${categoryAccent.accent}`,
        boxShadow: theme.shadow.lg,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between text-white"
        style={getPurpleGradientStyle()}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-8 rounded-full"
            style={{ background: categoryAccent.accent }}
          />

          <span className="font-semibold text-base">{item.patientName}</span>
          <span style={{ color: theme.purple[200] }} className="text-sm">
            {item.patientAge}y • {item.mrn}
          </span>

          {item.roomNumber && (
            <span
              className="px-2 py-1 text-xs rounded font-medium"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {item.roomNumber}
            </span>
          )}

          {item.daysOpen !== undefined && (
            <span
              className="px-2 py-1 text-xs rounded font-medium"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {item.daysOpen}d open
            </span>
          )}

          {chart.allergies[0] !== 'NKDA' && (
            <span
              className="px-2 py-1 text-xs rounded font-medium flex items-center gap-1"
              style={{ background: 'rgba(239, 68, 68, 0.5)' }}
            >
              <AlertTriangle className="w-3 h-3" />
              {chart.allergies.join(', ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/previsit/${item.patientId || item.id}`)}
            className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 transition-colors font-semibold"
            style={{ background: 'rgba(255,255,255,0.9)', color: theme.purple[700] }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'white')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.9)')}
          >
            <FileText className="w-3.5 h-3.5" />
            Open Pre-Visit
          </button>
          <button
            onClick={onForward}
            className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 transition-colors"
            style={{ background: 'rgba(255,255,255,0.2)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
          >
            <Forward className="w-3.5 h-3.5" />
            Forward
          </button>
          <button
            onClick={onReassign}
            className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 transition-colors"
            style={{ background: 'rgba(255,255,255,0.2)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Reassign
          </button>
          <button
            className="px-2 py-1.5 transition-colors"
            style={{ color: theme.purple[200] }}
            title="Open in new window"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div ref={containerRef} className="flex" style={{ height: `${totalHeight}px` }}>
        {/* Left Panel */}
        <div
          style={{
            width: `${panelWidth}%`,
            borderRight: `1px solid ${theme.purple[200]}`,
            overflow: 'auto',
            background: theme.purple[50],
          }}
        >
          {/* Symptoms/Info Section */}
          <ResizableSection
            title={getSectionTitle()}
            icon={getSectionIcon()}
            badge={item.symptoms?.length || item.missingElements?.length}
            isOpen={openSections.has('symptoms')}
            onToggle={() => toggleSection('symptoms')}
            height={sectionHeights.symptoms}
            onHeightChange={(h) => setSectionHeights((prev) => ({ ...prev, symptoms: h }))}
            accentColor={categoryAccent.accent}
          >
            {item.missingElements && (
              <ul className="space-y-1.5">
                {item.missingElements.map((element, index) => (
                  <li
                    key={index}
                    className="text-xs flex items-start gap-2"
                    style={{ color: theme.text.primary }}
                  >
                    <span style={{ color: theme.purple[600] }}>□</span>
                    {element}
                  </li>
                ))}
              </ul>
            )}

            {item.category === 'encounters' && (
              <div
                className="grid grid-cols-2 gap-3 text-xs mb-3 p-2.5 rounded-lg"
                style={{ background: 'white', border: `1px solid ${theme.purple[200]}` }}
              >
                <div>
                  <span style={{ color: theme.text.secondary }}>Room:</span>{' '}
                  <span className="font-semibold" style={{ color: theme.purple[700] }}>
                    {item.roomNumber}
                  </span>
                </div>
                <div>
                  <span style={{ color: theme.text.secondary }}>Wait:</span>{' '}
                  <span className="font-semibold" style={{ color: theme.purple[700] }}>
                    {item.waitTime}
                  </span>
                </div>
                <div>
                  <span style={{ color: theme.text.secondary }}>Type:</span>{' '}
                  <span className="font-semibold" style={{ color: theme.purple[700] }}>
                    {item.encounterType}
                  </span>
                </div>
                <div>
                  <span style={{ color: theme.text.secondary }}>Status:</span>{' '}
                  <span className="font-semibold" style={{ color: theme.purple[700] }}>
                    {item.encounterStatus}
                  </span>
                </div>
              </div>
            )}

            {item.symptoms && (
              <ul className="space-y-1.5 mt-2">
                {item.symptoms.map((symptom, index) => (
                  <li
                    key={index}
                    className="text-xs flex items-start gap-2"
                    style={{ color: theme.text.primary }}
                  >
                    <span style={{ color: theme.purple[600] }}>•</span>
                    {symptom}
                  </li>
                ))}
              </ul>
            )}

            {item.callbackNumber && (
              <div
                className="mt-3 p-2.5 rounded-lg flex items-center justify-between"
                style={{ background: 'white', border: `1px solid ${theme.purple[200]}` }}
              >
                <span
                  className="text-sm font-medium flex items-center gap-2"
                  style={{ color: theme.purple[700] }}
                >
                  <Phone className="w-4 h-4" />
                  {item.callbackNumber}
                </span>
                <button
                  className="px-3 py-1.5 text-white text-xs rounded-lg font-medium"
                  style={{ background: theme.gradient.primary }}
                >
                  Call
                </button>
              </div>
            )}

            {item.content && (
              <div
                className="mt-3 p-2.5 rounded-lg text-xs"
                style={{
                  background: 'white',
                  color: theme.text.secondary,
                  border: `1px solid ${theme.purple[200]}`,
                }}
              >
                {item.content}
              </div>
            )}
          </ResizableSection>

          {/* Chart Summary Section */}
          <ResizableSection
            title="Chart Summary"
            icon={<ClipboardList className="w-4 h-4" />}
            badge={chart.conditions.length}
            isOpen={openSections.has('chart')}
            onToggle={() => toggleSection('chart')}
            height={sectionHeights.chart}
            onHeightChange={(h) => setSectionHeights((prev) => ({ ...prev, chart: h }))}
            accentColor={theme.purple[500]}
          >
            <div className="space-y-3">
              <div>
                <div
                  className="text-xs font-semibold mb-1.5"
                  style={{ color: theme.purple[700] }}
                >
                  Active Problems
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {chart.conditions.map((condition, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs rounded-lg"
                      style={{
                        background: theme.purple[100],
                        color: theme.purple[700],
                        border: `1px solid ${theme.purple[200]}`,
                      }}
                    >
                      {condition}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div
                  className="text-xs font-semibold mb-1.5"
                  style={{ color: theme.purple[700] }}
                >
                  Current Medications
                </div>
                {chart.medications.map((med, index) => (
                  <div
                    key={index}
                    className="text-xs py-0.5"
                    style={{ color: theme.text.secondary }}
                  >
                    {med.name} {med.dose} {med.frequency}
                  </div>
                ))}
              </div>

              <div>
                <div
                  className="text-xs font-semibold mb-1.5"
                  style={{ color: theme.purple[700] }}
                >
                  Recent Vitals
                </div>
                <div
                  className="grid grid-cols-4 gap-2 text-xs p-2 rounded-lg"
                  style={{ background: 'white', border: `1px solid ${theme.purple[200]}` }}
                >
                  <span>
                    BP: <b style={{ color: theme.purple[700] }}>{chart.recentVitals.bp}</b>
                  </span>
                  <span>
                    HR: <b style={{ color: theme.purple[700] }}>{chart.recentVitals.hr}</b>
                  </span>
                  <span>
                    T: <b style={{ color: theme.purple[700] }}>{chart.recentVitals.temp}</b>
                  </span>
                  <span>
                    Wt: <b style={{ color: theme.purple[700] }}>{chart.recentVitals.weight}</b>
                  </span>
                </div>
              </div>
            </div>
          </ResizableSection>

          {/* AI Recommendations Section */}
          <ResizableSection
            title="AI Recommendations"
            icon={<Sparkles className="w-4 h-4" />}
            badge={templates.length}
            isOpen={openSections.has('ai')}
            onToggle={() => toggleSection('ai')}
            height={sectionHeights.ai}
            onHeightChange={(h) => setSectionHeights((prev) => ({ ...prev, ai: h }))}
            accentColor="#8b5cf6"
          >
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="p-2.5 rounded-lg cursor-pointer text-xs transition-all"
                  style={{
                    background: selectedTemplate === template.id ? theme.purple[100] : 'white',
                    border:
                      selectedTemplate === template.id
                        ? `2px solid ${theme.purple[500]}`
                        : `1px solid ${theme.purple[200]}`,
                    boxShadow:
                      selectedTemplate === template.id
                        ? `0 0 0 2px ${theme.purple[500]}30`
                        : 'none',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold" style={{ color: theme.text.primary }}>
                      {template.title}
                    </span>
                    <span className="font-medium" style={{ color: theme.purple[600] }}>
                      {Math.round(template.confidence * 100)}%
                    </span>
                  </div>
                  <p className="mt-1" style={{ color: theme.text.secondary }}>
                    {template.reasoning}
                  </p>
                </div>
              ))}
            </div>
          </ResizableSection>
        </div>

        {/* Horizontal Resize Handle */}
        <div
          onMouseDown={() => {
            isDraggingH.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
          className="w-2 cursor-col-resize flex items-center justify-center transition-colors"
          style={{ background: theme.purple[100] }}
          onMouseEnter={(e) => (e.currentTarget.style.background = theme.purple[200])}
          onMouseLeave={(e) => (e.currentTarget.style.background = theme.purple[100])}
        >
          <GripVertical className="w-3 h-3" style={{ color: theme.purple[500] }} />
        </div>

        {/* Right Panel - Response Area */}
        <div
          style={{
            width: `${100 - panelWidth}%`,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            background: theme.purple[50],
          }}
        >
          <label
            className="text-sm font-semibold mb-2"
            style={{ color: theme.purple[700] }}
          >
            {item.category === 'incomplete'
              ? 'Action / Notes'
              : item.category === 'encounters'
              ? 'Visit Notes'
              : 'Response'}
          </label>

          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            className="flex-1 w-full p-3 rounded-xl text-sm resize-none transition-all"
            style={{
              border: `2px solid ${theme.purple[200]}`,
              background: 'white',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.purple[500];
              e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.purple[500]}20`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.purple[200];
              e.currentTarget.style.boxShadow = 'none';
            }}
            placeholder="Select an AI recommendation or type your response..."
          />

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: theme.text.secondary }}
              onMouseEnter={(e) => (e.currentTarget.style.background = theme.purple[100])}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Cancel
            </button>

            <button
              onClick={() => onComplete(response)}
              disabled={!response.trim()}
              className="px-5 py-2 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"
              style={{
                background: response.trim() ? theme.gradient.primary : '#d1d5db',
                opacity: response.trim() ? 1 : 0.5,
                cursor: response.trim() ? 'pointer' : 'not-allowed',
                boxShadow: response.trim() ? theme.shadow.md : 'none',
              }}
            >
              <Check className="w-4 h-4" />
              {item.category === 'incomplete'
                ? 'Sign & Close'
                : item.category === 'encounters'
                ? 'Start Visit'
                : 'Complete'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Resize Handle */}
      <div
        onMouseDown={(e) => {
          isDraggingTotal.current = true;
          startY.current = e.clientY;
          startH.current = totalHeight;
          document.body.style.cursor = 'row-resize';
          document.body.style.userSelect = 'none';
        }}
        className="h-2 cursor-row-resize flex items-center justify-center transition-colors"
        style={{ background: theme.purple[200] }}
        onMouseEnter={(e) => (e.currentTarget.style.background = theme.purple[300])}
        onMouseLeave={(e) => (e.currentTarget.style.background = theme.purple[200])}
      >
        <GripHorizontal className="w-4 h-4" style={{ color: theme.purple[500] }} />
      </div>
    </div>
  );
};

export default ExpandedPanel;
