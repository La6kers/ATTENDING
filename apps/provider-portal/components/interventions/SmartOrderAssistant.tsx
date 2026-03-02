// =============================================================================
// ATTENDING AI - Smart Order Assistant Component
// apps/provider-portal/components/interventions/SmartOrderAssistant.tsx
//
// Natural language order processing with safety checks
// =============================================================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  AlertTriangle,
  CheckCircle,
  X,
  Pill,
  TestTube,
  FileImage,
  Stethoscope,
  ShieldAlert,
  Zap,
  Clock,
  DollarSign,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Info,
  Mic,
  MicOff,
  Loader2,
  Package,
  Sparkles,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type OrderType = 'lab' | 'imaging' | 'medication' | 'referral';
type AlertSeverity = 'info' | 'warning' | 'critical';

interface OrderAlert {
  severity: AlertSeverity;
  type: string;
  message: string;
  details?: string;
  overridable: boolean;
}

interface SmartOrder {
  id: string;
  type: OrderType;
  name: string;
  code?: string;
  dose?: string;
  frequency?: string;
  instructions?: string;
  priority: 'routine' | 'urgent' | 'stat';
  alerts: OrderAlert[];
  estimatedCost?: number;
  priorAuthRequired?: boolean;
  confidence: number;
}

interface OrderSuggestion {
  order: SmartOrder;
  reason: string;
  guidelineSource?: string;
}

interface OrderSet {
  id: string;
  name: string;
  description: string;
  orders: SmartOrder[];
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockOrderSets: OrderSet[] = [
  {
    id: 'chest_pain',
    name: 'Chest Pain Workup',
    description: 'Standard workup for acute chest pain',
    orders: [
      { id: 'o1', type: 'lab', name: 'Troponin I', code: '10839-9', priority: 'stat', alerts: [], confidence: 1 },
      { id: 'o2', type: 'lab', name: 'BNP', code: '30934-4', priority: 'stat', alerts: [], confidence: 1 },
      { id: 'o3', type: 'lab', name: 'Basic Metabolic Panel', code: '24320-4', priority: 'stat', alerts: [], confidence: 1 },
      { id: 'o4', type: 'imaging', name: 'Chest X-Ray (PA/Lateral)', code: '71046', priority: 'stat', alerts: [], confidence: 1 },
      { id: 'o5', type: 'imaging', name: 'ECG 12-Lead', code: '93000', priority: 'stat', alerts: [], confidence: 1 },
    ],
  },
  {
    id: 'dm_annual',
    name: 'Diabetes Annual Assessment',
    description: 'Annual monitoring for diabetes mellitus',
    orders: [
      { id: 'd1', type: 'lab', name: 'Hemoglobin A1c', code: '4548-4', priority: 'routine', alerts: [], confidence: 1 },
      { id: 'd2', type: 'lab', name: 'Lipid Panel', code: '24331-1', priority: 'routine', alerts: [], confidence: 1 },
      { id: 'd3', type: 'lab', name: 'Comprehensive Metabolic Panel', code: '24323-8', priority: 'routine', alerts: [], confidence: 1 },
      { id: 'd4', type: 'lab', name: 'Urine Albumin/Creatinine Ratio', code: '14959-1', priority: 'routine', alerts: [], confidence: 1 },
      { id: 'd5', type: 'referral', name: 'Ophthalmology Referral', priority: 'routine', alerts: [], confidence: 1 },
    ],
  },
  {
    id: 'sepsis',
    name: 'Sepsis Bundle (SEP-1)',
    description: 'CMS SEP-1 compliant sepsis bundle',
    orders: [
      { id: 's1', type: 'lab', name: 'Lactate', code: '2524-7', priority: 'stat', alerts: [], confidence: 1 },
      { id: 's2', type: 'lab', name: 'Blood Cultures x2', code: '600-7', priority: 'stat', alerts: [], confidence: 1 },
      { id: 's3', type: 'lab', name: 'Procalcitonin', code: '75241-0', priority: 'stat', alerts: [], confidence: 1 },
      { id: 's4', type: 'medication', name: 'Normal Saline 30 mL/kg', dose: '30 mL/kg', priority: 'stat', alerts: [], confidence: 1 },
    ],
  },
];

const examplePhrases = [
  "Order stat troponin and BNP for chest pain",
  "Start lisinopril 10mg daily for hypertension",
  "CT head without contrast for headache",
  "CBC, BMP, and urinalysis",
  "Refer to cardiology for heart failure evaluation",
  "Prescribe metformin 500mg twice daily",
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const OrderTypeIcon: React.FC<{ type: OrderType; size?: number }> = ({ type, size = 18 }) => {
  const icons: Record<OrderType, React.ReactNode> = {
    lab: <TestTube size={size} />,
    imaging: <FileImage size={size} />,
    medication: <Pill size={size} />,
    referral: <Stethoscope size={size} />,
  };
  return <>{icons[type]}</>;
};

const typeColors: Record<OrderType, string> = {
  lab: 'bg-teal-100 text-teal-700',
  imaging: 'bg-blue-100 text-blue-700',
  medication: 'bg-emerald-100 text-emerald-700',
  referral: 'bg-amber-100 text-amber-700',
};

const priorityColors: Record<string, string> = {
  stat: 'bg-red-100 text-red-700',
  urgent: 'bg-orange-100 text-orange-700',
  routine: 'bg-slate-100 text-slate-600',
};

const AlertBanner: React.FC<{ alert: OrderAlert; onOverride?: () => void }> = ({ alert, onOverride }) => {
  const config = {
    info: { bg: 'bg-blue-50 border-blue-200', icon: Info, color: 'text-blue-700' },
    warning: { bg: 'bg-amber-50 border-amber-200', icon: AlertCircle, color: 'text-amber-700' },
    critical: { bg: 'bg-red-50 border-red-200', icon: ShieldAlert, color: 'text-red-700' },
  };
  
  const { bg, icon: Icon, color } = config[alert.severity];

  return (
    <div className={`${bg} border rounded-lg p-3 flex items-start gap-3`}>
      <Icon size={18} className={color} />
      <div className="flex-1">
        <p className={`text-sm font-medium ${color}`}>{alert.message}</p>
        {alert.details && <p className="text-xs text-slate-600 mt-1">{alert.details}</p>}
      </div>
      {alert.overridable && onOverride && (
        <button
          onClick={onOverride}
          className="px-3 py-1 text-xs font-medium bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Override
        </button>
      )}
    </div>
  );
};

const OrderCard: React.FC<{
  order: SmartOrder;
  selected: boolean;
  onToggle: () => void;
  onRemove: () => void;
}> = ({ order, selected, onToggle, onRemove }) => {
  const [showAlerts, setShowAlerts] = useState(order.alerts.some(a => a.severity === 'critical'));

  const hasAlerts = order.alerts.length > 0;
  const hasCritical = order.alerts.some(a => a.severity === 'critical');

  return (
    <div className={`rounded-lg border-2 transition-all ${
      selected
        ? hasCritical
          ? 'border-red-300 bg-red-50/50'
          : 'border-blue-300 bg-blue-50/50'
        : 'border-slate-200 bg-white hover:border-slate-300'
    }`}>
      <div className="p-3">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              selected
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-slate-300 hover:border-blue-400'
            }`}
          >
            {selected && <CheckCircle size={12} />}
          </button>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`p-1 rounded ${typeColors[order.type]}`}>
                <OrderTypeIcon type={order.type} size={14} />
              </span>
              <span className="font-medium text-slate-900">{order.name}</span>
              {hasAlerts && (
                <button
                  onClick={() => setShowAlerts(!showAlerts)}
                  className={`p-1 rounded ${hasCritical ? 'text-red-500' : 'text-amber-500'}`}
                >
                  <AlertTriangle size={14} />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              {order.dose && <span className="text-slate-600">{order.dose}</span>}
              {order.frequency && <span className="text-slate-600">{order.frequency}</span>}
              <span className={`px-2 py-0.5 rounded-full ${priorityColors[order.priority]}`}>
                {order.priority.toUpperCase()}
              </span>
              {order.priorAuthRequired && (
                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  PA Required
                </span>
              )}
              {order.estimatedCost && (
                <span className="flex items-center gap-1 text-slate-500">
                  <DollarSign size={12} />
                  ~${order.estimatedCost}
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={onRemove}
            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {showAlerts && hasAlerts && (
          <div className="mt-3 space-y-2">
            {order.alerts.map((alert, idx) => (
              <AlertBanner key={idx} alert={alert} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const OrderSetCard: React.FC<{
  orderSet: OrderSet;
  onApply: (orders: SmartOrder[]) => void;
}> = ({ orderSet, onApply }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Package size={18} className="text-teal-600" />
          <div className="text-left">
            <p className="font-medium text-slate-900">{orderSet.name}</p>
            <p className="text-xs text-slate-500">{orderSet.orders.length} orders</p>
          </div>
        </div>
        <ChevronRight size={18} className={`text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      
      {expanded && (
        <div className="p-3 border-t border-slate-200">
          <p className="text-sm text-slate-600 mb-3">{orderSet.description}</p>
          <div className="space-y-2 mb-3">
            {orderSet.orders.map((order) => (
              <div key={order.id} className="flex items-center gap-2 text-sm">
                <span className={`p-1 rounded ${typeColors[order.type]}`}>
                  <OrderTypeIcon type={order.type} size={12} />
                </span>
                <span className="text-slate-700">{order.name}</span>
                <span className={`px-1.5 py-0.5 text-xs rounded ${priorityColors[order.priority]}`}>
                  {order.priority}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onApply(orderSet.orders)}
            className="w-full py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            Apply Order Set
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const SmartOrderAssistant: React.FC<{
  patientId?: string;
  patientName?: string;
  patientAllergies?: string[];
  patientMedications?: string[];
}> = ({ patientId, patientName, patientAllergies = ['Penicillin'], patientMedications = ['Warfarin', 'Metformin'] }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orders, setOrders] = useState<SmartOrder[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isListening, setIsListening] = useState(false);
  const [showOrderSets, setShowOrderSets] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simulate order processing
  const processNaturalLanguage = async (text: string) => {
    setIsProcessing(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate mock orders based on input
    const newOrders: SmartOrder[] = [];
    const textLower = text.toLowerCase();

    if (textLower.includes('troponin') || textLower.includes('chest pain')) {
      newOrders.push({
        id: `order_${Date.now()}_1`,
        type: 'lab',
        name: 'Troponin I',
        code: '10839-9',
        priority: textLower.includes('stat') ? 'stat' : 'urgent',
        alerts: [],
        estimatedCost: 45,
        confidence: 0.95,
      });
    }

    if (textLower.includes('bnp')) {
      newOrders.push({
        id: `order_${Date.now()}_2`,
        type: 'lab',
        name: 'BNP',
        code: '30934-4',
        priority: textLower.includes('stat') ? 'stat' : 'urgent',
        alerts: [],
        estimatedCost: 65,
        confidence: 0.92,
      });
    }

    if (textLower.includes('ct') && textLower.includes('head')) {
      newOrders.push({
        id: `order_${Date.now()}_3`,
        type: 'imaging',
        name: 'CT Head without Contrast',
        code: '70450',
        priority: 'urgent',
        alerts: [],
        estimatedCost: 450,
        priorAuthRequired: true,
        confidence: 0.88,
      });
    }

    if (textLower.includes('lisinopril')) {
      newOrders.push({
        id: `order_${Date.now()}_4`,
        type: 'medication',
        name: 'Lisinopril',
        dose: '10mg',
        frequency: 'Daily',
        priority: 'routine',
        alerts: [
          {
            severity: 'warning',
            type: 'interaction',
            message: 'Patient on Metformin - Monitor renal function',
            details: 'ACE inhibitors can affect renal function. Consider checking BMP in 1-2 weeks.',
            overridable: true,
          },
        ],
        estimatedCost: 12,
        confidence: 0.9,
      });
    }

    if (textLower.includes('amoxicillin')) {
      newOrders.push({
        id: `order_${Date.now()}_5`,
        type: 'medication',
        name: 'Amoxicillin',
        dose: '500mg',
        frequency: 'TID',
        priority: 'routine',
        alerts: [
          {
            severity: 'critical',
            type: 'allergy',
            message: 'ALLERGY: Patient has documented Penicillin allergy',
            details: 'Amoxicillin is a penicillin-class antibiotic. Cross-reactivity possible.',
            overridable: true,
          },
        ],
        estimatedCost: 15,
        confidence: 0.85,
      });
    }

    if (textLower.includes('ibuprofen') || textLower.includes('nsaid')) {
      newOrders.push({
        id: `order_${Date.now()}_6`,
        type: 'medication',
        name: 'Ibuprofen',
        dose: '400mg',
        frequency: 'Q6H PRN',
        priority: 'routine',
        alerts: [
          {
            severity: 'critical',
            type: 'interaction',
            message: 'HIGH BLEEDING RISK: Patient on Warfarin',
            details: 'NSAIDs + anticoagulants increase GI bleeding risk 2-4x. Consider Acetaminophen instead.',
            overridable: true,
          },
        ],
        estimatedCost: 8,
        confidence: 0.88,
      });
    }

    if (textLower.includes('cbc')) {
      newOrders.push({
        id: `order_${Date.now()}_7`,
        type: 'lab',
        name: 'Complete Blood Count (CBC)',
        code: '58410-2',
        priority: 'routine',
        alerts: [],
        estimatedCost: 25,
        confidence: 0.95,
      });
    }

    if (textLower.includes('bmp') || textLower.includes('metabolic')) {
      newOrders.push({
        id: `order_${Date.now()}_8`,
        type: 'lab',
        name: 'Basic Metabolic Panel',
        code: '24320-4',
        priority: 'routine',
        alerts: [],
        estimatedCost: 35,
        confidence: 0.93,
      });
    }

    if (textLower.includes('cardiology') || textLower.includes('refer')) {
      newOrders.push({
        id: `order_${Date.now()}_9`,
        type: 'referral',
        name: 'Cardiology Consultation',
        instructions: 'Evaluation and management of heart failure',
        priority: 'urgent',
        alerts: [],
        confidence: 0.87,
      });
    }

    // If no orders matched, add some defaults
    if (newOrders.length === 0 && text.trim()) {
      newOrders.push({
        id: `order_${Date.now()}_default`,
        type: 'lab',
        name: 'Complete Blood Count (CBC)',
        code: '58410-2',
        priority: 'routine',
        alerts: [],
        estimatedCost: 25,
        confidence: 0.7,
      });
    }

    setOrders(prev => [...prev, ...newOrders]);
    setSelectedOrders(prev => {
      const updated = new Set(prev);
      newOrders.forEach(o => updated.add(o.id));
      return updated;
    });
    
    setIsProcessing(false);
    setInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      processNaturalLanguage(input);
    }
  };

  const handleExampleClick = (phrase: string) => {
    setInput(phrase);
    inputRef.current?.focus();
  };

  const toggleOrder = (orderId: string) => {
    setSelectedOrders(prev => {
      const updated = new Set(prev);
      if (updated.has(orderId)) {
        updated.delete(orderId);
      } else {
        updated.add(orderId);
      }
      return updated;
    });
  };

  const removeOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    setSelectedOrders(prev => {
      const updated = new Set(prev);
      updated.delete(orderId);
      return updated;
    });
  };

  const applyOrderSet = (orderSetOrders: SmartOrder[]) => {
    const newOrders = orderSetOrders.map(o => ({
      ...o,
      id: `${o.id}_${Date.now()}`,
    }));
    setOrders(prev => [...prev, ...newOrders]);
    setSelectedOrders(prev => {
      const updated = new Set(prev);
      newOrders.forEach(o => updated.add(o.id));
      return updated;
    });
    setShowOrderSets(false);
  };

  const submitOrders = () => {
    const selectedOrdersList = orders.filter(o => selectedOrders.has(o.id));
    console.log('Submitting orders:', selectedOrdersList);
    // In production, this would submit to the EHR
    alert(`${selectedOrdersList.length} orders submitted successfully!`);
    setOrders([]);
    setSelectedOrders(new Set());
  };

  const selectedCount = selectedOrders.size;
  const totalCost = orders
    .filter(o => selectedOrders.has(o.id))
    .reduce((sum, o) => sum + (o.estimatedCost || 0), 0);
  const hasAlerts = orders.some(o => selectedOrders.has(o.id) && o.alerts.length > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Smart Order Assistant</h2>
              <p className="text-emerald-100 text-sm">Natural language ordering with safety checks</p>
            </div>
          </div>
          {patientName && (
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{patientName}</span>
          )}
        </div>
      </div>

      {/* Patient Context */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className="text-red-500" />
            <span className="text-slate-600">Allergies:</span>
            <div className="flex gap-1">
              {patientAllergies.map((a, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                  {a}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Pill size={14} className="text-blue-500" />
            <span className="text-slate-600">Active Meds:</span>
            <div className="flex gap-1">
              {patientMedications.slice(0, 3).map((m, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 border-b border-slate-200">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <MessageSquare size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Type orders in plain English... e.g., "Order stat troponin for chest pain"'
                className="w-full pl-12 pr-12 py-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg"
                disabled={isProcessing}
              />
              <button
                type="button"
                onClick={() => setIsListening(!isListening)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                  isListening ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="px-6 py-4 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              {isProcessing ? 'Processing...' : 'Add Orders'}
            </button>
          </div>
        </form>

        {/* Example Phrases */}
        {orders.length === 0 && (
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-2">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {examplePhrases.map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExampleClick(phrase)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 text-sm rounded-full hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Order Sets Toggle */}
        <div className="mt-4">
          <button
            onClick={() => setShowOrderSets(!showOrderSets)}
            className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
          >
            <Package size={16} />
            {showOrderSets ? 'Hide Order Sets' : 'View Order Sets'}
            <ChevronRight size={14} className={`transition-transform ${showOrderSets ? 'rotate-90' : ''}`} />
          </button>
          
          {showOrderSets && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {mockOrderSets.map((set) => (
                <OrderSetCard key={set.id} orderSet={set} onApply={applyOrderSet} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Orders List */}
      {orders.length > 0 && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">
              Orders ({orders.length})
            </h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (selectedCount === orders.length) {
                    setSelectedOrders(new Set());
                  } else {
                    setSelectedOrders(new Set(orders.map(o => o.id)));
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {selectedCount === orders.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                selected={selectedOrders.has(order.id)}
                onToggle={() => toggleOrder(order.id)}
                onRemove={() => removeOrder(order.id)}
              />
            ))}
          </div>

          {/* Summary & Submit */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-slate-500">Selected Orders</p>
                  <p className="text-2xl font-bold text-slate-900">{selectedCount}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Estimated Cost</p>
                  <p className="text-2xl font-bold text-slate-900">${totalCost}</p>
                </div>
                {hasAlerts && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle size={20} />
                    <span className="text-sm font-medium">Review alerts before signing</span>
                  </div>
                )}
              </div>
              <button
                onClick={submitOrders}
                disabled={selectedCount === 0}
                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <CheckCircle size={20} />
                Sign & Submit Orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {orders.length === 0 && !showOrderSets && (
        <div className="p-12 text-center text-slate-400">
          <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
          <p className="font-medium">Type or speak your orders above</p>
          <p className="text-sm mt-1">Orders will appear here for review</p>
        </div>
      )}
    </div>
  );
};

export default SmartOrderAssistant;
