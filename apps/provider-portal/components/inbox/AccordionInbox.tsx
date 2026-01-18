// =============================================================================
// ATTENDING AI - Accordion-Style Inbox
// apps/provider-portal/components/inbox/AccordionInbox.tsx
//
// Messages listed in main panel, expand to show AI recommendations
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Beaker,
  Phone,
  Pill,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  User,
  Sparkles,
  Check,
  Send,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Filter,
  Search,
  Inbox,
  Brain,
  X,
  Zap,
  CheckCircle,
  Activity,
} from 'lucide-react';
import { Message, useInbox } from '@/store/useInbox';

// =============================================================================
// Types
// =============================================================================

interface ResponseTemplate {
  id: string;
  title: string;
  category: 'approve' | 'deny' | 'followup' | 'info';
  content: string;
  confidence: number;
  reasoning: string;
}

interface LabResult {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low' | 'critical';
  date: string;
  trend?: 'up' | 'down' | 'stable';
  previousValue?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

const generateTemplates = (message: Message): ResponseTemplate[] => {
  const patientName = message.patientDetails.name.split(' ')[0];
  const content = message.content.toLowerCase();
  const templates: ResponseTemplate[] = [];

  const isLabRequest = /lab|blood work|a1c|cholesterol|thyroid|vitamin/i.test(content);
  const isRefillRequest = message.type === 'refill' || /refill|prescription|medication/i.test(content);

  if (isLabRequest) {
    templates.push({
      id: 'approve-labs',
      title: '✓ Approve Lab Order',
      category: 'approve',
      confidence: 0.94,
      reasoning: 'Patient is due for routine labs based on care schedule',
      content: `Dear ${patientName},\n\nI've ordered your labs:\n• HbA1c\n• Comprehensive Metabolic Panel\n• Lipid Panel\n\nPlease fast 12 hours before your blood draw. Order valid for 30 days.\n\nBest regards,\nDr. Reed`,
    });
    templates.push({
      id: 'approve-followup',
      title: '✓ Approve with Follow-up',
      category: 'followup',
      confidence: 0.85,
      reasoning: 'Labs approved, follow-up recommended',
      content: `Dear ${patientName},\n\nI've ordered your labs. Please schedule a follow-up appointment after results are back so we can review together.\n\nBest regards,\nDr. Reed`,
    });
  }

  if (isRefillRequest) {
    templates.push({
      id: 'approve-refill',
      title: '✓ Approve Refill',
      category: 'approve',
      confidence: 0.91,
      reasoning: 'Patient has active prescription, compliant',
      content: `Dear ${patientName},\n\nI've approved your refill. It's been sent to your pharmacy and should be ready in 2-4 hours.\n\nBest regards,\nDr. Reed`,
    });
    templates.push({
      id: 'partial-refill',
      title: '⚠ 30-Day Supply (Need Appointment)',
      category: 'followup',
      confidence: 0.78,
      reasoning: 'Last visit over 6 months ago',
      content: `Dear ${patientName},\n\nI've approved a 30-day supply. Please schedule a follow-up appointment for continued refills.\n\nBest regards,\nDr. Reed`,
    });
  }

  templates.push({
    id: 'general',
    title: '📝 Custom Response',
    category: 'info',
    confidence: 0.60,
    reasoning: 'Write your own response',
    content: `Dear ${patientName},\n\nThank you for reaching out.\n\n[Your response here]\n\nBest regards,\nDr. Reed`,
  });

  return templates;
};

const getPreviousLabs = (): LabResult[] => [
  { testName: 'HbA1c', value: '7.2', unit: '%', referenceRange: '< 5.7%', status: 'high', date: 'Oct 15, 2024', trend: 'down', previousValue: '7.8' },
  { testName: 'Fasting Glucose', value: '142', unit: 'mg/dL', referenceRange: '70-100', status: 'high', date: 'Oct 15, 2024', trend: 'stable', previousValue: '145' },
  { testName: 'Total Cholesterol', value: '198', unit: 'mg/dL', referenceRange: '< 200', status: 'normal', date: 'Oct 15, 2024', trend: 'down', previousValue: '215' },
  { testName: 'LDL', value: '118', unit: 'mg/dL', referenceRange: '< 100', status: 'high', date: 'Oct 15, 2024', trend: 'up', previousValue: '105' },
  { testName: 'Creatinine', value: '1.1', unit: 'mg/dL', referenceRange: '0.7-1.3', status: 'normal', date: 'Oct 15, 2024', trend: 'stable', previousValue: '1.0' },
];

const detectIntent = (content: string): string[] => {
  const intents: string[] = [];
  if (/lab|blood work|a1c|cholesterol|thyroid/i.test(content)) intents.push('Lab Request');
  if (/refill|prescription|medication/i.test(content)) intents.push('Refill');
  if (/pain|symptom|feeling|tired|dizzy/i.test(content)) intents.push('Symptoms');
  if (/appointment|schedule|visit/i.test(content)) intents.push('Appointment');
  return intents;
};

// =============================================================================
// Message Row Component (Collapsed State)
// =============================================================================

interface MessageRowProps {
  message: Message;
  isExpanded: boolean;
  onToggle: () => void;
}

const MessageRow: React.FC<MessageRowProps> = ({ message, isExpanded, onToggle }) => {
  const getTypeIcon = () => {
    switch (message.type) {
      case 'lab': return <Beaker className="w-4 h-4 text-blue-600" />;
      case 'phone': return <Phone className="w-4 h-4 text-green-600" />;
      case 'refill': return <Pill className="w-4 h-4 text-purple-600" />;
      default: return <Mail className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityColor = () => {
    switch (message.priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      default: return 'bg-transparent';
    }
  };

  const intents = detectIntent(message.content);
  const timeAgo = getTimeAgo(message.createdAt);

  return (
    <div
      className={`border-b border-gray-100 transition-colors cursor-pointer ${
        isExpanded ? 'bg-purple-50' : message.status === 'unread' ? 'bg-blue-50/50 hover:bg-gray-50' : 'hover:bg-gray-50'
      }`}
      onClick={onToggle}
    >
      <div className="px-6 py-4">
        <div className="flex items-start gap-4">
          {/* Priority Indicator */}
          <div className={`w-1 h-12 rounded-full ${getPriorityColor()}`} />

          {/* Avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
            {message.patientDetails.name.split(' ').map(n => n[0]).join('')}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getTypeIcon()}
              <span className={`font-medium text-gray-900 ${message.status === 'unread' ? 'font-semibold' : ''}`}>
                {message.patientDetails.name}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">{message.patientDetails.age}</span>
              {message.status === 'unread' && (
                <span className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
            <p className={`text-sm ${message.status === 'unread' ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
              {message.subject}
            </p>
            <p className="text-xs text-gray-500 truncate mt-1">
              {message.content.substring(0, 100)}...
            </p>
          </div>

          {/* Right Side */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">{timeAgo}</span>
            <div className="flex gap-1">
              {intents.slice(0, 2).map((intent, i) => (
                <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                  {intent}
                </span>
              ))}
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Expanded Message Panel (AI Recommendations)
// =============================================================================

interface ExpandedPanelProps {
  message: Message;
  onClose: () => void;
  onSend: (response: string) => void;
}

const ExpandedPanel: React.FC<ExpandedPanelProps> = ({ message, onClose, onSend }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [showLabs, setShowLabs] = useState(true);
  const templates = generateTemplates(message);
  const previousLabs = getPreviousLabs();
  const intents = detectIntent(message.content);
  const isLabRequest = intents.includes('Lab Request');

  const handleUseTemplate = (template: ResponseTemplate) => {
    setResponse(template.content);
    setSelectedTemplate(template.id);
  };

  const handleSend = () => {
    if (response.trim()) {
      onSend(response);
      setResponse('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-amber-100 text-amber-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-red-500" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-green-500" />;
      default: return <Minus className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white border-b-2 border-purple-200 shadow-lg">
      {/* Patient Info Bar */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900">{message.patientDetails.name}</span>
            </div>
            <span className="text-sm text-gray-500">MRN: {message.patientDetails.mrn}</span>
            <span className="text-sm text-gray-500">Last visit: {message.patientDetails.lastVisit}</span>
            {message.patientDetails.allergies[0] !== 'None' && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Allergies: {message.patientDetails.allergies.join(', ')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {intents.map((intent, i) => (
              <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex items-center gap-1">
                {intent === 'Lab Request' && <Beaker className="w-3 h-3" />}
                {intent === 'Refill' && <Pill className="w-3 h-3" />}
                {intent === 'Symptoms' && <Activity className="w-3 h-3" />}
                {intent === 'Appointment' && <Calendar className="w-3 h-3" />}
                {intent}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-gray-200">
        {/* Left: Message + Labs */}
        <div className="p-6">
          {/* Message Content */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Patient Message
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
              {message.content}
            </div>
          </div>

          {/* Previous Labs (if lab request detected) */}
          {isLabRequest && (
            <div>
              <button
                onClick={() => setShowLabs(!showLabs)}
                className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 mb-2"
              >
                <span className="flex items-center gap-2">
                  <Beaker className="w-4 h-4 text-blue-600" />
                  Previous Lab Results
                </span>
                {showLabs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showLabs && (
                <div className="bg-blue-50 rounded-lg overflow-hidden border border-blue-100">
                  <table className="w-full text-xs">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-blue-800">Test</th>
                        <th className="px-3 py-2 text-left font-medium text-blue-800">Result</th>
                        <th className="px-3 py-2 text-left font-medium text-blue-800">Ref</th>
                        <th className="px-3 py-2 text-left font-medium text-blue-800">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                      {previousLabs.map((lab, i) => (
                        <tr key={i} className="bg-white">
                          <td className="px-3 py-2 font-medium text-gray-900">{lab.testName}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded ${getStatusColor(lab.status)}`}>
                              {lab.value} {lab.unit}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-500">{lab.referenceRange}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              {getTrendIcon(lab.trend)}
                              <span className="text-gray-400">{lab.previousValue}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: AI Recommendations + Response */}
        <div className="p-6">
          {/* AI Suggestions */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              AI Response Suggestions
            </h4>
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleUseTemplate(template)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 text-sm">{template.title}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      {Math.round(template.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{template.reasoning}</p>
                  {selectedTemplate === template.id && (
                    <div className="mt-2 pt-2 border-t border-purple-200">
                      <p className="text-xs text-purple-600">Click "Use Template" below to edit</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Response Composer */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Send className="w-4 h-4" />
              Your Response
            </h4>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Select a template above or type your response..."
              className="w-full h-32 p-3 text-sm border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!response.trim()}
                className="px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Response
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Time Ago Helper
// =============================================================================

const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// =============================================================================
// Main Accordion Inbox Component
// =============================================================================

export const AccordionInbox: React.FC = () => {
  const { messages, fetchMessages, isLoading, markAsRead } = useInbox();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleToggle = (messageId: number) => {
    if (expandedId === messageId) {
      setExpandedId(null);
    } else {
      setExpandedId(messageId);
      // Mark as read when expanded
      const msg = messages.find(m => m.id === messageId);
      if (msg && msg.status === 'unread') {
        markAsRead([messageId]);
      }
    }
  };

  const handleSend = (response: string) => {
    console.log('Sending response:', response);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setExpandedId(null);
    }, 2000);
  };

  const filteredMessages = messages.filter(m => {
    if (filter === 'unread' && m.status !== 'unread') return false;
    if (filter === 'urgent' && m.priority !== 'urgent') return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        m.patientDetails.name.toLowerCase().includes(query) ||
        m.subject.toLowerCase().includes(query) ||
        m.content.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const stats = {
    total: messages.length,
    unread: messages.filter(m => m.status === 'unread').length,
    urgent: messages.filter(m => m.priority === 'urgent').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Inbox className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Provider Inbox</h1>
                  <p className="text-sm text-gray-500">AI-Enhanced Patient Communication</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-gray-600">{stats.urgent} Urgent</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-gray-600">{stats.unread} Unread</span>
                  </span>
                </div>
                <button
                  onClick={() => fetchMessages()}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(['all', 'unread', 'urgent'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      filter === f
                        ? 'bg-white text-purple-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f === 'unread' && stats.unread > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {stats.unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed top-4 right-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg z-50 animate-slide-in">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Response Sent!</p>
              <p className="text-sm text-green-600">Message has been delivered</p>
            </div>
          </div>
        )}

        {/* Message List */}
        <div className="bg-white rounded-b-2xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading messages...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No messages found</p>
            </div>
          ) : (
            <div>
              {filteredMessages.map((message) => (
                <div key={message.id}>
                  <MessageRow
                    message={message}
                    isExpanded={expandedId === message.id}
                    onToggle={() => handleToggle(message.id)}
                  />
                  {expandedId === message.id && (
                    <ExpandedPanel
                      message={message}
                      onClose={() => setExpandedId(null)}
                      onSend={handleSend}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default AccordionInbox;
