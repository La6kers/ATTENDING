// =============================================================================
// ATTENDING AI - Predictive Alerts Dashboard Component
// apps/provider-portal/components/clinical-services/PredictiveAlerts.tsx
// =============================================================================

import React, { useState, useEffect } from 'react';

interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  alertType: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  riskScore: number;
  triggeringFactors: string[];
  recommendations: string[];
  createdAt: Date;
  status: 'active' | 'acknowledged' | 'resolved';
}

export const PredictiveAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'moderate'>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?severity=${filter}` : '';
      const response = await fetch(`/api/alerts/deterioration${params}`);
      const data = await response.json();
      setAlerts(data.alerts.map((a: any) => ({ ...a, createdAt: new Date(a.createdAt) })));
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch('/api/alerts/deterioration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, acknowledgedBy: 'current-user', action: 'acknowledged' }),
      });
      fetchAlerts();
      setSelectedAlert(null);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'critical' || severity === 'high') {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    );
  };

  const alertTypeLabels: Record<string, string> = {
    'sepsis': 'Sepsis Risk',
    'heart-failure': 'Heart Failure Exacerbation',
    'copd': 'COPD Exacerbation',
    'dka': 'DKA Risk',
    'aki': 'Acute Kidney Injury',
    'respiratory': 'Respiratory Failure',
    'cardiac-arrest': 'Cardiac Arrest Risk',
    'readmission': 'Readmission Risk',
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Predictive Deterioration Alerts</h2>
            <p className="text-gray-600">AI-powered early warning system</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Filter:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="all">All Alerts</option>
              <option value="critical">Critical Only</option>
              <option value="high">High Priority</option>
              <option value="moderate">Moderate</option>
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">
              {alerts.filter(a => a.severity === 'critical').length}
            </div>
            <div className="text-sm text-red-700">Critical</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {alerts.filter(a => a.severity === 'high').length}
            </div>
            <div className="text-sm text-orange-700">High</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {alerts.filter(a => a.severity === 'moderate').length}
            </div>
            <div className="text-sm text-yellow-700">Moderate</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {alerts.filter(a => a.status === 'resolved').length}
            </div>
            <div className="text-sm text-green-700">Resolved Today</div>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 mt-2">No active alerts</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition ${getSeverityColor(alert.severity)}`}
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`mt-1 ${alert.severity === 'critical' ? 'text-red-600' : alert.severity === 'high' ? 'text-orange-600' : 'text-yellow-600'}`}>
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div>
                      <div className="font-semibold">{alert.patientName || `Patient ${alert.patientId}`}</div>
                      <div className="text-sm">{alertTypeLabels[alert.alertType] || alert.alertType}</div>
                      <div className="text-xs mt-1">
                        {alert.createdAt.toLocaleTimeString()} • Risk Score: {alert.riskScore}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      alert.severity === 'critical' ? 'bg-red-200' :
                      alert.severity === 'high' ? 'bg-orange-200' : 'bg-yellow-200'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Triggering Factors */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {alert.triggeringFactors.slice(0, 3).map((factor, i) => (
                    <span key={i} className="px-2 py-1 bg-white/50 rounded text-xs">
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className={`p-4 ${getSeverityColor(selectedAlert.severity)} rounded-t-lg`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {alertTypeLabels[selectedAlert.alertType] || selectedAlert.alertType}
                </h3>
                <button onClick={() => setSelectedAlert(null)} className="text-gray-600 hover:text-gray-800">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <div className="text-sm text-gray-500">Patient</div>
                <div className="font-semibold">{selectedAlert.patientName || selectedAlert.patientId}</div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-500">Risk Score</div>
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-4 mr-2">
                    <div
                      className={`h-4 rounded-full ${
                        selectedAlert.riskScore >= 70 ? 'bg-red-500' :
                        selectedAlert.riskScore >= 50 ? 'bg-orange-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${selectedAlert.riskScore}%` }}
                    />
                  </div>
                  <span className="font-bold">{selectedAlert.riskScore}%</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-2">Triggering Factors</div>
                <ul className="list-disc list-inside space-y-1">
                  {selectedAlert.triggeringFactors.map((factor, i) => (
                    <li key={i}>{factor}</li>
                  ))}
                </ul>
              </div>

              <div className="mb-6">
                <div className="text-sm text-gray-500 mb-2">Recommendations</div>
                <ul className="space-y-2">
                  {selectedAlert.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start">
                      <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => acknowledgeAlert(selectedAlert.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Acknowledge & Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictiveAlerts;
