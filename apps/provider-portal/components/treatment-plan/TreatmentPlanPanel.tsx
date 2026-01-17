// Treatment Plan Panel Component
// apps/provider-portal/components/treatment-plan/TreatmentPlanPanel.tsx

import { useState, useEffect } from 'react';
import {
  ClipboardList,
  FlaskConical,
  Scan,
  Pill,
  UserPlus,
  Calendar,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Plus,
  X,
  Save,
  Send,
  FileText,
  Printer,
  Clock
} from 'lucide-react';
import { useTreatmentPlanStore } from '@/store/treatmentPlanStore';
import type { 
  PatientContext, 
  Diagnosis, 
  FollowUp, 
  ReturnPrecaution,
  OrderSummary 
} from '@/store/treatmentPlanStore';

interface TreatmentPlanPanelProps {
  patientContext: PatientContext;
  encounterId: string;
  labOrders?: OrderSummary[];
  imagingOrders?: OrderSummary[];
  prescriptions?: OrderSummary[];
  referrals?: OrderSummary[];
  onSave?: (planId: string) => void;
  onSubmit?: () => void;
}

export function TreatmentPlanPanel({
  patientContext,
  encounterId,
  labOrders = [],
  imagingOrders = [],
  prescriptions = [],
  referrals = [],
  onSave,
  onSubmit,
}: TreatmentPlanPanelProps) {
  const [activeSection, setActiveSection] = useState<string>('diagnoses');
  const [_showProtocolModal, setShowProtocolModal] = useState(false);
  const [showAddDiagnosis, setShowAddDiagnosis] = useState(false);
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);

  const {
    currentPlan,
    suggestedProtocols,
    selectedProtocol,
    // loadingProtocols, // Available for loading state UI
    saving,
    // validationErrors, // Available for validation display
    initializePlan,
    loadProtocols,
    applyProtocol,
    addDiagnosis,
    removeDiagnosis,
    setClinicalSummary,
    addFollowUp,
    removeFollowUp,
    // addReturnPrecaution, // Available when implementing return precautions
    removeReturnPrecaution,
    setAdditionalInstructions,
    savePlan,
    submitPlan,
    validatePlan,
    getTotalOrderCount,
    getStatOrderCount,
    getCostEstimate,
    getOrdersByPriority,
  } = useTreatmentPlanStore();

  // Initialize plan on mount
  useEffect(() => {
    initializePlan(patientContext.id, encounterId, patientContext);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientContext.id, encounterId]); // patientContext and initializePlan are stable

  // Sync orders from props
  useEffect(() => {
    if (currentPlan) {
      labOrders.forEach(order => {
        if (!currentPlan.labOrders.some(o => o.id === order.id)) {
          useTreatmentPlanStore.getState().addLabOrder(order);
        }
      });
      imagingOrders.forEach(order => {
        if (!currentPlan.imagingOrders.some(o => o.id === order.id)) {
          useTreatmentPlanStore.getState().addImagingOrder(order);
        }
      });
      prescriptions.forEach(order => {
        if (!currentPlan.prescriptions.some(o => o.id === order.id)) {
          useTreatmentPlanStore.getState().addPrescription(order);
        }
      });
      referrals.forEach(order => {
        if (!currentPlan.referrals.some(o => o.id === order.id)) {
          useTreatmentPlanStore.getState().addReferral(order);
        }
      });
    }
  }, [labOrders, imagingOrders, prescriptions, referrals, currentPlan]);

  const totalOrders = getTotalOrderCount();
  const statOrders = getStatOrderCount();
  const costEstimate = getCostEstimate();
  const ordersByPriority = getOrdersByPriority();
  const errors = validatePlan();

  const handleSave = async () => {
    const planId = await savePlan();
    onSave?.(planId);
  };

  const handleSubmit = async () => {
    try {
      await submitPlan();
      onSubmit?.();
    } catch (_err) {
      // Validation errors are shown in UI
    }
  };

  const sections = [
    { id: 'diagnoses', label: 'Diagnoses', icon: FileText },
    { id: 'orders', label: 'Orders Summary', icon: ClipboardList },
    { id: 'followup', label: 'Follow-up', icon: Calendar },
    { id: 'education', label: 'Education', icon: BookOpen },
    { id: 'precautions', label: 'Return Precautions', icon: AlertTriangle },
  ];

  if (!currentPlan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Initializing treatment plan...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          icon={ClipboardList}
          label="Total Orders"
          value={totalOrders}
          color="purple"
        />
        <StatCard
          icon={AlertTriangle}
          label="STAT Orders"
          value={statOrders}
          color="red"
          highlight={statOrders > 0}
        />
        <StatCard
          icon={FileText}
          label="Diagnoses"
          value={currentPlan.diagnoses.length}
          color="blue"
        />
        <StatCard
          icon={Calendar}
          label="Follow-ups"
          value={currentPlan.followUpSchedule.length}
          color="green"
        />
        <StatCard
          icon={Sparkles}
          label="Est. Cost"
          value={`$${costEstimate.total}`}
          color="indigo"
        />
      </div>

      {/* AI Protocol Suggestions */}
      {suggestedProtocols.length > 0 && !selectedProtocol && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="font-medium text-indigo-900">Evidence-Based Protocols Available</h3>
            </div>
            <button
              onClick={() => setShowProtocolModal(true)}
              className="text-sm text-indigo-600 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {suggestedProtocols.slice(0, 3).map(proto => (
              <button
                key={proto.id}
                onClick={() => applyProtocol(proto)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-indigo-200 text-sm hover:border-indigo-400 transition-colors"
              >
                <span className="font-medium text-gray-900">{proto.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  proto.evidenceLevel === 'A' ? 'bg-green-100 text-green-700' :
                  proto.evidenceLevel === 'B' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  Level {proto.evidenceLevel}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Applied Protocol Banner */}
      {selectedProtocol && (
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Protocol Applied: {selectedProtocol.name}</p>
                <p className="text-sm text-green-700">
                  Evidence Level {selectedProtocol.evidenceLevel} • {selectedProtocol.source}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Navigation */}
      <div className="flex gap-2 border-b">
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeSection === section.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <div className="min-h-[400px]">
        {activeSection === 'diagnoses' && (
          <DiagnosesSection
            diagnoses={currentPlan.diagnoses}
            clinicalSummary={currentPlan.clinicalSummary}
            onAddDiagnosis={() => setShowAddDiagnosis(true)}
            onRemoveDiagnosis={removeDiagnosis}
            onSummaryChange={setClinicalSummary}
            onLoadProtocols={() => loadProtocols(currentPlan.diagnoses)}
          />
        )}

        {activeSection === 'orders' && (
          <OrdersSummarySection
            labOrders={currentPlan.labOrders}
            imagingOrders={currentPlan.imagingOrders}
            prescriptions={currentPlan.prescriptions}
            referrals={currentPlan.referrals}
            ordersByPriority={ordersByPriority}
          />
        )}

        {activeSection === 'followup' && (
          <FollowUpSection
            followUps={currentPlan.followUpSchedule}
            onAdd={() => setShowAddFollowUp(true)}
            onRemove={removeFollowUp}
          />
        )}

        {activeSection === 'education' && (
          <EducationSection
            education={currentPlan.patientEducation}
          />
        )}

        {activeSection === 'precautions' && (
          <PrecautionsSection
            precautions={currentPlan.returnPrecautions}
            onRemove={removeReturnPrecaution}
            additionalInstructions={currentPlan.additionalInstructions}
            onInstructionsChange={setAdditionalInstructions}
          />
        )}
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h4 className="font-medium text-red-900">Please address the following:</h4>
          </div>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {errors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900">
            <Printer className="w-4 h-4" />
            Print Summary
          </button>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={errors.length > 0 || totalOrders === 0}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
            Finalize Plan
          </button>
        </div>
      </div>

      {/* Add Diagnosis Modal */}
      {showAddDiagnosis && (
        <AddDiagnosisModal
          onAdd={(diagnosis) => {
            addDiagnosis(diagnosis);
            setShowAddDiagnosis(false);
          }}
          onClose={() => setShowAddDiagnosis(false)}
        />
      )}

      {/* Add Follow-up Modal */}
      {showAddFollowUp && (
        <AddFollowUpModal
          onAdd={(followUp) => {
            addFollowUp(followUp);
            setShowAddFollowUp(false);
          }}
          onClose={() => setShowAddFollowUp(false)}
        />
      )}
    </div>
  );
}

// Sub-components

function StatCard({ icon: Icon, label, value, color, highlight }: {
  icon: any;
  label: string;
  value: number | string;
  color: string;
  highlight?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  return (
    <div className={`p-4 rounded-xl border ${highlight ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function DiagnosesSection({ diagnoses, clinicalSummary, onAddDiagnosis, onRemoveDiagnosis, onSummaryChange, onLoadProtocols }: {
  diagnoses: Diagnosis[];
  clinicalSummary: string;
  onAddDiagnosis: () => void;
  onRemoveDiagnosis: (code: string) => void;
  onSummaryChange: (summary: string) => void;
  onLoadProtocols: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Diagnoses</h3>
          <button
            onClick={onAddDiagnosis}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
          >
            <Plus className="w-4 h-4" />
            Add Diagnosis
          </button>
        </div>
        {diagnoses.length === 0 ? (
          <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-xl">
            No diagnoses added. Click "Add Diagnosis" to begin.
          </div>
        ) : (
          <div className="space-y-2">
            {diagnoses.map(dx => (
              <div
                key={dx.code}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  dx.type === 'primary' ? 'bg-purple-50 border-purple-200' :
                  dx.type === 'rule-out' ? 'bg-orange-50 border-orange-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{dx.description}</span>
                    <span className="text-xs bg-white px-2 py-0.5 rounded border">
                      {dx.icd10 || dx.code}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      dx.type === 'primary' ? 'bg-purple-200 text-purple-700' :
                      dx.type === 'rule-out' ? 'bg-orange-200 text-orange-700' :
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {dx.type}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveDiagnosis(dx.code)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {diagnoses.length > 0 && (
          <button
            onClick={onLoadProtocols}
            className="mt-3 text-sm text-purple-600 hover:underline flex items-center gap-1"
          >
            <Sparkles className="w-4 h-4" />
            Find matching protocols
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Clinical Summary
        </label>
        <textarea
          value={clinicalSummary}
          onChange={(e) => onSummaryChange(e.target.value)}
          placeholder="Document the clinical assessment, key findings, and rationale for the treatment plan..."
          className="w-full p-4 border rounded-xl text-sm min-h-[150px] focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          {clinicalSummary.length} characters (minimum 20 required)
        </p>
      </div>
    </div>
  );
}

function OrdersSummarySection({ labOrders, imagingOrders, prescriptions, referrals, ordersByPriority }: {
  labOrders: OrderSummary[];
  imagingOrders: OrderSummary[];
  prescriptions: OrderSummary[];
  referrals: OrderSummary[];
  ordersByPriority: { stat: OrderSummary[]; urgent: OrderSummary[]; routine: OrderSummary[] };
}) {
  const orderCategories = [
    { label: 'Labs', orders: labOrders, icon: FlaskConical, color: 'blue' },
    { label: 'Imaging', orders: imagingOrders, icon: Scan, color: 'purple' },
    { label: 'Medications', orders: prescriptions, icon: Pill, color: 'green' },
    { label: 'Referrals', orders: referrals, icon: UserPlus, color: 'orange' },
  ];

  return (
    <div className="space-y-6">
      {/* Priority Summary */}
      {ordersByPriority.stat.length > 0 && (
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            STAT Orders ({ordersByPriority.stat.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {ordersByPriority.stat.map(order => (
              <span key={order.id} className="px-3 py-1 bg-white rounded-lg text-sm border border-red-200">
                {order.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Orders by Category */}
      <div className="grid grid-cols-2 gap-4">
        {orderCategories.map(cat => {
          const Icon = cat.icon;
          return (
            <div key={cat.label} className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-5 h-5 text-${cat.color}-600`} />
                <h4 className="font-medium text-gray-900">{cat.label}</h4>
                <span className="ml-auto text-sm text-gray-500">{cat.orders.length}</span>
              </div>
              {cat.orders.length === 0 ? (
                <p className="text-sm text-gray-400">No {cat.label.toLowerCase()} ordered</p>
              ) : (
                <ul className="space-y-2">
                  {cat.orders.map(order => (
                    <li key={order.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{order.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        order.priority === 'STAT' ? 'bg-red-100 text-red-700' :
                        order.priority === 'URGENT' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.priority}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FollowUpSection({ followUps, onAdd, onRemove }: {
  followUps: FollowUp[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const typeIcons: Record<string, any> = {
    appointment: Calendar,
    phone: Clock,
    portal: FileText,
    lab_check: FlaskConical,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Follow-up Schedule</h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
        >
          <Plus className="w-4 h-4" />
          Add Follow-up
        </button>
      </div>

      {followUps.length === 0 ? (
        <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-xl">
          No follow-ups scheduled. Click "Add Follow-up" to add one.
        </div>
      ) : (
        <div className="space-y-3">
          {followUps.map(fu => {
            const Icon = typeIcons[fu.type] || Calendar;
            return (
              <div key={fu.id} className="flex items-center justify-between p-4 bg-white rounded-xl border">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{fu.description}</p>
                    <p className="text-sm text-gray-500">{fu.timeframe}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {fu.scheduled ? (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Scheduled
                    </span>
                  ) : (
                    <button className="text-sm text-purple-600 hover:underline">
                      Schedule
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(fu.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EducationSection({ education }: { education: any[] }) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-900">Patient Education Materials</h3>
      {education.length === 0 ? (
        <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-xl">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>Education materials will be auto-generated based on diagnoses and treatments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {education.map((edu: any) => (
            <div key={edu.id} className="p-4 bg-white rounded-xl border">
              <h4 className="font-medium text-gray-900">{edu.title}</h4>
              <p className="text-sm text-gray-500 mt-1">{edu.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrecautionsSection({ precautions, onRemove, additionalInstructions, onInstructionsChange }: {
  precautions: ReturnPrecaution[];
  onRemove: (id: string) => void;
  additionalInstructions: string;
  onInstructionsChange: (instructions: string) => void;
}) {
  const urgencyColors: Record<string, string> = {
    emergent: 'bg-red-50 border-l-red-500',
    urgent: 'bg-orange-50 border-l-orange-500',
    soon: 'bg-yellow-50 border-l-yellow-500',
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-gray-900 mb-3">Return Precautions</h3>
        <div className="space-y-2">
          {precautions.map(rp => (
            <div
              key={rp.id}
              className={`flex items-start justify-between p-3 rounded-lg border-l-4 ${urgencyColors[rp.urgency]}`}
            >
              <div>
                <p className="font-medium text-gray-900">{rp.condition}</p>
                <p className="text-sm text-gray-600">{rp.instruction}</p>
              </div>
              <button
                onClick={() => onRemove(rp.id)}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Instructions
        </label>
        <textarea
          value={additionalInstructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          placeholder="Any additional instructions or notes for the patient..."
          className="w-full p-4 border rounded-xl text-sm min-h-[100px] focus:ring-2 focus:ring-purple-500"
        />
      </div>
    </div>
  );
}

// Modals

function AddDiagnosisModal({ onAdd, onClose }: {
  onAdd: (diagnosis: Diagnosis) => void;
  onClose: () => void;
}) {
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'primary' | 'secondary' | 'rule-out'>('primary');

  const handleSubmit = () => {
    if (description) {
      onAdd({
        code: code || `DX-${Date.now()}`,
        description,
        type,
        icd10: code,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Add Diagnosis</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Migraine without aura"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ICD-10 Code (optional)</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., G43.009"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="flex gap-2">
              {(['primary', 'secondary', 'rule-out'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                    type === t
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!description}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
          >
            Add Diagnosis
          </button>
        </div>
      </div>
    </div>
  );
}

function AddFollowUpModal({ onAdd, onClose }: {
  onAdd: (followUp: FollowUp) => void;
  onClose: () => void;
}) {
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'appointment' | 'phone' | 'portal' | 'lab_check'>('appointment');
  const [timeframe, setTimeframe] = useState('2 weeks');

  const timeframeDays: Record<string, number> = {
    '3 days': 3,
    '1 week': 7,
    '2 weeks': 14,
    '4 weeks': 28,
    '6 weeks': 42,
    '3 months': 90,
  };

  const handleSubmit = () => {
    if (description) {
      onAdd({
        id: `fu-${Date.now()}`,
        type,
        description,
        timeframe,
        timeframeDays: timeframeDays[timeframe] || 14,
        scheduled: false,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Add Follow-up</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Follow-up visit to assess treatment response"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="flex gap-2 flex-wrap">
              {([
                { value: 'appointment', label: 'Appointment' },
                { value: 'phone', label: 'Phone Call' },
                { value: 'portal', label: 'Portal Message' },
                { value: 'lab_check', label: 'Lab Check' },
              ] as const).map(t => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                    type === t.value
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {Object.keys(timeframeDays).map(tf => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-600">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!description}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
          >
            Add Follow-up
          </button>
        </div>
      </div>
    </div>
  );
}

export default TreatmentPlanPanel;
