/**
 * ATTENDING AI - Lab Order Panel
 * 
 * Component for viewing and managing lab orders for a patient.
 */

import React, { useState, useCallback } from 'react';
import { 
  usePatientLabOrders, 
  useCreateLabOrder,
  useCancelLabOrder,
  LabOrderSummary,
  CreateLabOrderRequest 
} from '../../lib/api/backend';

// Priority badge colors
const priorityColors: Record<string, string> = {
  Routine: 'bg-gray-100 text-gray-800',
  Urgent: 'bg-yellow-100 text-yellow-800',
  Asap: 'bg-orange-100 text-orange-800',
  Stat: 'bg-red-100 text-red-800',
};

// Status badge colors
const statusColors: Record<string, string> = {
  Pending: 'bg-blue-100 text-blue-800',
  Collected: 'bg-indigo-100 text-indigo-800',
  InProcess: 'bg-teal-100 text-teal-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-gray-100 text-gray-500',
};

interface LabOrderPanelProps {
  patientId: string;
  encounterId: string;
  onOrderCreated?: (orderNumber: string) => void;
  onViewResult?: (orderId: string) => void;
}

export function LabOrderPanel({
  patientId,
  encounterId,
  onOrderCreated,
  onViewResult,
}: LabOrderPanelProps) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showOrderForm, setShowOrderForm] = useState(false);

  // Fetch lab orders
  const { data: orders, isLoading, error, refetch } = usePatientLabOrders(patientId, statusFilter || undefined);

  // Create mutation
  const { mutate: createOrder, isLoading: isCreating } = useCreateLabOrder();

  // Cancel mutation
  const { mutate: cancelOrder, isLoading: isCancelling } = useCancelLabOrder();

  // Handle create order
  const handleCreateOrder = useCallback(async (request: CreateLabOrderRequest) => {
    try {
      const result = await createOrder(request);
      setShowOrderForm(false);
      refetch();
      
      if (result.wasUpgradedToStat) {
        // Show alert for STAT upgrade
        alert(`⚠️ Order upgraded to STAT priority\n\nReason: ${result.redFlagReason}`);
      }
      
      onOrderCreated?.(result.orderNumber);
    } catch (err) {
      console.error('Failed to create lab order:', err);
    }
  }, [createOrder, refetch, onOrderCreated]);

  // Handle cancel order
  const handleCancelOrder = useCallback(async (orderId: string, reason: string) => {
    try {
      await cancelOrder({ id: orderId, reason });
      refetch();
    } catch (err) {
      console.error('Failed to cancel order:', err);
    }
  }, [cancelOrder, refetch]);

  if (isLoading) {
    return (
      <div className="animate-pulse p-4">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Failed to load lab orders: {error.detail}</p>
        <button 
          onClick={() => refetch()} 
          className="mt-2 text-sm text-red-600 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Lab Orders</h3>
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Collected">Collected</option>
            <option value="InProcess">In Process</option>
            <option value="Completed">Completed</option>
          </select>

          {/* New Order Button */}
          <button
            onClick={() => setShowOrderForm(true)}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded transition-colors"
          >
            + New Lab Order
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="divide-y divide-gray-100">
        {orders?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No lab orders found</p>
          </div>
        ) : (
          orders?.map((order) => (
            <LabOrderRow
              key={order.id}
              order={order}
              onViewResult={onViewResult}
              onCancel={handleCancelOrder}
              isCancelling={isCancelling}
            />
          ))
        )}
      </div>

      {/* Order Form Modal */}
      {showOrderForm && (
        <LabOrderForm
          patientId={patientId}
          encounterId={encounterId}
          onSubmit={handleCreateOrder}
          onClose={() => setShowOrderForm(false)}
          isSubmitting={isCreating}
        />
      )}
    </div>
  );
}

// =============================================================================
// Lab Order Row Component
// =============================================================================

interface LabOrderRowProps {
  order: LabOrderSummary;
  onViewResult?: (orderId: string) => void;
  onCancel: (orderId: string, reason: string) => void;
  isCancelling: boolean;
}

function LabOrderRow({ order, onViewResult, onCancel, isCancelling }: LabOrderRowProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const handleCancel = () => {
    if (cancelReason.trim()) {
      onCancel(order.id, cancelReason);
      setShowCancelDialog(false);
      setCancelReason('');
    }
  };

  return (
    <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{order.testName}</span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${priorityColors[order.priority]}`}>
              {order.priority}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[order.status]}`}>
              {order.status}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            <span>{order.orderNumber}</span>
            <span className="mx-2">•</span>
            <span>{new Date(order.orderedAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {order.hasResult && (
            <button
              onClick={() => onViewResult?.(order.id)}
              className="px-3 py-1 text-sm text-teal-600 hover:text-teal-800 font-medium"
            >
              View Result
            </button>
          )}
          {order.status === 'Pending' && (
            <button
              onClick={() => setShowCancelDialog(true)}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
              disabled={isCancelling}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
          <p className="text-sm text-red-800 mb-2">Cancel this order?</p>
          <input
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation"
            className="w-full px-3 py-2 text-sm border border-red-300 rounded mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={!cancelReason.trim() || isCancelling}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded disabled:opacity-50"
            >
              Confirm Cancel
            </button>
            <button
              onClick={() => setShowCancelDialog(false)}
              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded"
            >
              Keep Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Lab Order Form Component
// =============================================================================

interface LabOrderFormProps {
  patientId: string;
  encounterId: string;
  onSubmit: (request: CreateLabOrderRequest) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

// Common lab tests for quick selection
const commonLabTests = [
  { code: 'CBC', name: 'Complete Blood Count with Diff', cpt: '85025', loinc: '57021-8', category: 'Hematology' },
  { code: 'CMP', name: 'Comprehensive Metabolic Panel', cpt: '80053', loinc: '24323-8', category: 'Chemistry' },
  { code: 'BMP', name: 'Basic Metabolic Panel', cpt: '80048', loinc: '51990-0', category: 'Chemistry' },
  { code: 'LIPID', name: 'Lipid Panel', cpt: '80061', loinc: '57698-3', category: 'Chemistry' },
  { code: 'TSH', name: 'Thyroid Stimulating Hormone', cpt: '84443', loinc: '3016-3', category: 'Thyroid' },
  { code: 'HBA1C', name: 'Hemoglobin A1c', cpt: '83036', loinc: '4548-4', category: 'Chemistry' },
  { code: 'UA', name: 'Urinalysis, Complete', cpt: '81003', loinc: '24356-8', category: 'Urinalysis' },
  { code: 'PT-INR', name: 'Prothrombin Time / INR', cpt: '85610', loinc: '5902-2', category: 'Coagulation' },
  { code: 'TROPONIN', name: 'Troponin I, High Sensitivity', cpt: '84484', loinc: '89579-7', category: 'Cardiac' },
  { code: 'BNP', name: 'BNP (Brain Natriuretic Peptide)', cpt: '83880', loinc: '30934-4', category: 'Cardiac' },
];

function LabOrderForm({ patientId, encounterId, onSubmit, onClose, isSubmitting }: LabOrderFormProps) {
  const [selectedTest, setSelectedTest] = useState<typeof commonLabTests[0] | null>(null);
  const [priority, setPriority] = useState('Routine');
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [diagnosisCode, setDiagnosisCode] = useState('');
  const [diagnosisDescription, setDiagnosisDescription] = useState('');
  const [requiresFasting, setRequiresFasting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest || !clinicalIndication || !diagnosisCode) return;

    onSubmit({
      patientId,
      encounterId,
      testCode: selectedTest.code,
      testName: selectedTest.name,
      cptCode: selectedTest.cpt,
      loincCode: selectedTest.loinc,
      category: selectedTest.category,
      priority,
      clinicalIndication,
      diagnosisCode,
      diagnosisDescription,
      requiresFasting,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">New Lab Order</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Test Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Test *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {commonLabTests.map((test) => (
                <button
                  key={test.code}
                  type="button"
                  onClick={() => setSelectedTest(test)}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    selectedTest?.code === test.code
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-sm">{test.name}</p>
                  <p className="text-xs text-gray-500">{test.code} • {test.category}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority *
            </label>
            <div className="flex gap-2">
              {['Routine', 'Urgent', 'Asap', 'Stat'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    priority === p
                      ? priorityColors[p] + ' border-current'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Clinical Indication */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clinical Indication *
            </label>
            <textarea
              value={clinicalIndication}
              onChange={(e) => setClinicalIndication(e.target.value)}
              placeholder="Reason for ordering this test..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={2}
              required
            />
          </div>

          {/* Diagnosis */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ICD-10 Code *
              </label>
              <input
                type="text"
                value={diagnosisCode}
                onChange={(e) => setDiagnosisCode(e.target.value.toUpperCase())}
                placeholder="E11.9"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diagnosis Description
              </label>
              <input
                type="text"
                value={diagnosisDescription}
                onChange={(e) => setDiagnosisDescription(e.target.value)}
                placeholder="Type 2 Diabetes"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Fasting */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="fasting"
              checked={requiresFasting}
              onChange={(e) => setRequiresFasting(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded"
            />
            <label htmlFor="fasting" className="text-sm text-gray-700">
              Requires fasting
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedTest || !clinicalIndication || !diagnosisCode || isSubmitting}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LabOrderPanel;
