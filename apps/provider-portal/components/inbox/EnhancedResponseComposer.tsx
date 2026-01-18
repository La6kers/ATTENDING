// =============================================================================
// ATTENDING AI - Enhanced Response Composer
// apps/provider-portal/components/inbox/EnhancedResponseComposer.tsx
//
// AI-powered response composition with templates and quick actions
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Paperclip,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
  Beaker,
  Pill,
  Calendar,
  RefreshCw,
  Zap,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import { Message } from '@/store/useInbox';

// Types
interface ResponseTemplate {
  id: string;
  title: string;
  category: 'approve' | 'deny' | 'followup' | 'info' | 'custom';
  content: string;
  confidence: number;
  reasoning: string;
  actions?: QuickAction[];
}

interface QuickAction {
  type: 'order_lab' | 'order_refill' | 'schedule_appointment' | 'send_education';
  label: string;
  details: string;
}

interface LabOrderOption {
  id: string;
  name: string;
  cptCode: string;
  selected: boolean;
  reason?: string;
}

interface EnhancedResponseComposerProps {
  message: Message;
  onSend: (content: string, actions: QuickAction[]) => void;
}

// Template Generation
const generateResponseTemplates = (message: Message): ResponseTemplate[] => {
  const templates: ResponseTemplate[] = [];
  const patientName = message.patientDetails.name.split(' ')[0];
  const content = message.content.toLowerCase();

  const isLabRequest = /lab|blood work|blood test|a1c|cholesterol|thyroid|check/i.test(content);
  const isRefillRequest = message.type === 'refill' || /refill|prescription|medication|running out/i.test(content);

  if (isLabRequest) {
    templates.push({
      id: 'approve-labs-1',
      title: '✓ Approve Lab Order',
      category: 'approve',
      confidence: 0.94,
      reasoning: 'Patient is due for routine labs based on care schedule',
      content: `Dear ${patientName},

I've reviewed your request and ordered the following labs for you:

• HbA1c (diabetes monitoring)
• Comprehensive Metabolic Panel
• Lipid Panel

You can go to any Quest Diagnostics or Labcorp location at your convenience. The order is valid for 30 days.

**Preparation:** Please fast for 12 hours before your blood draw (water is okay).

I'll review your results as soon as they're available and follow up with you.

Best regards,
Dr. Reed`,
      actions: [
        { type: 'order_lab', label: 'Order HbA1c', details: 'CPT: 83036' },
        { type: 'order_lab', label: 'Order CMP', details: 'CPT: 80053' },
        { type: 'order_lab', label: 'Order Lipid Panel', details: 'CPT: 80061' },
      ],
    });

    templates.push({
      id: 'approve-labs-2',
      title: '✓ Approve with Follow-up',
      category: 'approve',
      confidence: 0.88,
      reasoning: 'Labs approved with recommendation for follow-up visit',
      content: `Dear ${patientName},

I've ordered your labs. Based on your last A1c of 7.2%, I'd also like to schedule a follow-up visit to discuss your diabetes management.

**Labs Ordered:**
• HbA1c
• Comprehensive Metabolic Panel  
• Lipid Panel

Please fast for 12 hours before your blood draw.

After we receive your results, please schedule a follow-up appointment.

Best regards,
Dr. Reed`,
      actions: [
        { type: 'order_lab', label: 'Order Labs', details: 'Full panel' },
        { type: 'schedule_appointment', label: 'Recommend Follow-up', details: '2-3 weeks' },
      ],
    });
  }

  if (isRefillRequest) {
    templates.push({
      id: 'approve-refill',
      title: '✓ Approve Refill',
      category: 'approve',
      confidence: 0.91,
      reasoning: 'Patient has active prescription, compliant with appointments',
      content: `Dear ${patientName},

I've approved your medication refill. The prescription has been sent to your pharmacy and should be ready for pickup within 2-4 hours.

If you have any questions about your medication, please let us know.

Best regards,
Dr. Reed`,
      actions: [
        { type: 'order_refill', label: 'Send to Pharmacy', details: 'CVS' },
      ],
    });

    templates.push({
      id: 'partial-refill',
      title: '⚠ 30-Day Supply (Appointment Needed)',
      category: 'followup',
      confidence: 0.82,
      reasoning: 'Last visit was 8 months ago - follow-up recommended',
      content: `Dear ${patientName},

I've approved a 30-day supply of your medication. Since it's been over 6 months since your last visit, we need to schedule a follow-up appointment before authorizing additional refills.

Please call (303) 555-0100 or use our online portal to schedule.

Best regards,
Dr. Reed`,
      actions: [
        { type: 'order_refill', label: 'Send 30-day Supply', details: 'Partial' },
        { type: 'schedule_appointment', label: 'Request Appointment', details: 'Within 30 days' },
      ],
    });
  }

  templates.push({
    id: 'generic-response',
    title: '📝 General Response',
    category: 'info',
    confidence: 0.60,
    reasoning: 'Generic response template for customization',
    content: `Dear ${patientName},

Thank you for reaching out. I've reviewed your message.

[Your response here]

If you have any questions, please don't hesitate to contact us.

Best regards,
Dr. Reed`,
    actions: [],
  });

  return templates.sort((a, b) => b.confidence - a.confidence);
};

const detectLabOptions = (message: Message): LabOrderOption[] => {
  const content = message.content.toLowerCase();
  const options: LabOrderOption[] = [];

  const labTests = [
    { pattern: /a1c|hemoglobin a1c|diabetes/i, name: 'HbA1c', cptCode: '83036', reason: 'Diabetes monitoring' },
    { pattern: /cholesterol|lipid/i, name: 'Lipid Panel', cptCode: '80061', reason: 'Cardiovascular risk' },
    { pattern: /thyroid|tsh/i, name: 'TSH', cptCode: '84443', reason: 'Thyroid function' },
    { pattern: /cbc|blood count/i, name: 'CBC with Diff', cptCode: '85025', reason: 'General health' },
    { pattern: /metabolic|cmp|kidney|liver/i, name: 'CMP', cptCode: '80053', reason: 'Metabolic function' },
    { pattern: /vitamin d/i, name: 'Vitamin D', cptCode: '82306', reason: 'Vitamin D level' },
    { pattern: /b12/i, name: 'Vitamin B12', cptCode: '82607', reason: 'B12 deficiency' },
  ];

  labTests.forEach(({ pattern, name, cptCode, reason }) => {
    if (pattern.test(content)) {
      options.push({ id: cptCode, name, cptCode, selected: true, reason });
    }
  });

  if (options.length === 0 && /lab|blood work|blood test|routine/i.test(content)) {
    options.push(
      { id: '80053', name: 'CMP', cptCode: '80053', selected: true, reason: 'Metabolic function' },
      { id: '85025', name: 'CBC with Diff', cptCode: '85025', selected: true, reason: 'General health' },
      { id: '80061', name: 'Lipid Panel', cptCode: '80061', selected: false, reason: 'Cardiovascular risk' }
    );
  }

  return options;
};

// Sub-Components
const ResponseTemplateCard: React.FC<{
  template: ResponseTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onUse: () => void;
}> = ({ template, isSelected, onSelect, onUse }) => {
  const categoryColors: Record<string, string> = {
    approve: 'border-green-200 bg-green-50',
    deny: 'border-red-200 bg-red-50',
    followup: 'border-blue-200 bg-blue-50',
    info: 'border-purple-200 bg-purple-50',
    custom: 'border-gray-200 bg-gray-50',
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    approve: <CheckCircle className="w-4 h-4 text-green-600" />,
    deny: <X className="w-4 h-4 text-red-600" />,
    followup: <Calendar className="w-4 h-4 text-blue-600" />,
    info: <AlertCircle className="w-4 h-4 text-purple-600" />,
    custom: <Sparkles className="w-4 h-4 text-gray-600" />,
  };

  return (
    <div
      className={`rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-purple-500 border-purple-300' : categoryColors[template.category]
      }`}
      onClick={onSelect}
    >
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {categoryIcons[template.category]}
          <span className="font-medium text-gray-900">{template.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            {Math.round(template.confidence * 100)}%
          </span>
        </div>
      </div>

      {isSelected && (
        <div className="border-t border-gray-200">
          <div className="px-4 py-3 bg-white max-h-40 overflow-y-auto">
            <p className="text-xs text-gray-500 mb-2">{template.reasoning}</p>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{template.content}</pre>
          </div>

          {template.actions && template.actions.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Quick Actions:</p>
              <div className="flex flex-wrap gap-2">
                {template.actions.map((action, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs">
                    {action.type === 'order_lab' && <Beaker className="w-3 h-3 text-blue-500" />}
                    {action.type === 'order_refill' && <Pill className="w-3 h-3 text-purple-500" />}
                    {action.type === 'schedule_appointment' && <Calendar className="w-3 h-3 text-green-500" />}
                    {action.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onUse(); }}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-md transition-all"
            >
              <Check className="w-4 h-4" />
              Use This Response
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LabOrderPanel: React.FC<{
  options: LabOrderOption[];
  onChange: (options: LabOrderOption[]) => void;
}> = ({ options, onChange }) => {
  const [expanded, setExpanded] = useState(true);

  const toggleLab = (id: string) => {
    onChange(options.map(opt => opt.id === id ? { ...opt, selected: !opt.selected } : opt));
  };

  if (options.length === 0) return null;

  return (
    <div className="bg-blue-50 rounded-xl border border-blue-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Beaker className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-800">Quick Lab Orders</span>
          <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
            {options.filter(o => o.selected).length} selected
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="space-y-2">
            {options.map((option) => (
              <label
                key={option.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  option.selected ? 'bg-blue-100 border-2 border-blue-300' : 'bg-white border border-blue-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={option.selected}
                    onChange={() => toggleLab(option.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <span className="font-medium text-gray-900">{option.name}</span>
                    <span className="text-xs text-gray-500 ml-2">CPT: {option.cptCode}</span>
                  </div>
                </div>
                {option.reason && <span className="text-xs text-gray-500">{option.reason}</span>}
              </label>
            ))}
          </div>
          <p className="text-xs text-blue-600 mt-3">Selected labs will be ordered when you send the response.</p>
        </div>
      )}
    </div>
  );
};

// Main Component
export const EnhancedResponseComposer: React.FC<EnhancedResponseComposerProps> = ({ message, onSend }) => {
  const [response, setResponse] = useState('');
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [labOptions, setLabOptions] = useState<LabOrderOption[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [pendingActions, setPendingActions] = useState<QuickAction[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsGenerating(true);
    setTimeout(() => {
      const generatedTemplates = generateResponseTemplates(message);
      const detectedLabs = detectLabOptions(message);
      setTemplates(generatedTemplates);
      setLabOptions(detectedLabs);
      setIsGenerating(false);
      if (generatedTemplates.length > 0) {
        setSelectedTemplateId(generatedTemplates[0].id);
      }
    }, 600);
  }, [message]);

  const handleUseTemplate = (template: ResponseTemplate) => {
    setResponse(template.content);
    setPendingActions(template.actions || []);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  const handleSend = () => {
    if (!response.trim()) return;

    const labActions: QuickAction[] = labOptions
      .filter(opt => opt.selected)
      .map(opt => ({ type: 'order_lab' as const, label: `Order ${opt.name}`, details: `CPT: ${opt.cptCode}` }));

    onSend(response, [...pendingActions, ...labActions]);
    setResponse('');
    setPendingActions([]);
  };

  const handleRegenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const generatedTemplates = generateResponseTemplates(message);
      setTemplates(generatedTemplates);
      setIsGenerating(false);
    }, 600);
  };

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Response Suggestions</h3>
              <p className="text-xs text-gray-500">Select a template or write your own</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {showTemplates ? 'Hide' : 'Show'} Templates
              {showTemplates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Templates */}
      {showTemplates && (
        <div className="px-6 py-4 border-b border-gray-200 max-h-96 overflow-y-auto">
          {isGenerating ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <ResponseTemplateCard
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplateId === template.id}
                  onSelect={() => setSelectedTemplateId(template.id)}
                  onUse={() => handleUseTemplate(template)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Lab Orders */}
      {labOptions.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-200">
          <LabOrderPanel options={labOptions} onChange={setLabOptions} />
        </div>
      )}

      {/* Composer */}
      <div className="p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Response
            {pendingActions.length > 0 && (
              <span className="ml-2 text-xs text-purple-600">({pendingActions.length} actions pending)</span>
            )}
          </label>
          <textarea
            ref={textareaRef}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your response or select a template above..."
            className="w-full rounded-xl border border-gray-300 p-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
            rows={8}
          />
        </div>

        {pendingActions.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-medium text-amber-700 mb-2">Actions that will be executed:</p>
            <div className="flex flex-wrap gap-2">
              {pendingActions.map((action, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-amber-200 rounded text-xs">
                  {action.type === 'order_lab' && <Beaker className="w-3 h-3 text-blue-500" />}
                  {action.type === 'order_refill' && <Pill className="w-3 h-3 text-purple-500" />}
                  {action.type === 'schedule_appointment' && <Calendar className="w-3 h-3 text-green-500" />}
                  {action.label}
                  <button onClick={() => setPendingActions(pendingActions.filter((_, idx) => idx !== i))} className="ml-1 text-gray-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
              <Paperclip className="w-4 h-4" />
              Attach
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
              <Clock className="w-4 h-4" />
              Schedule
            </button>
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
              Save Draft
            </button>
            <button
              onClick={handleSend}
              disabled={!response.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Send Response
              {(pendingActions.length > 0 || labOptions.some(o => o.selected)) && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  +{pendingActions.length + labOptions.filter(o => o.selected).length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedResponseComposer;
