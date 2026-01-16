import React from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { Stethoscope, Brain, MessageSquare, Activity, AlertCircle } from 'lucide-react';

export default function PatientAssessment() {
  return (
    <DashboardLayout>
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Stethoscope className="w-8 h-8 text-indigo-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Patient Assessment</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    AI-powered clinical assessment and patient intake
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  BioMistral AI Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Assessment Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <Brain className="w-10 h-10 text-indigo-600" />
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">AI Powered</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">New Patient Assessment</h3>
              <p className="text-sm text-gray-600 mb-4">
                Start a comprehensive AI-guided clinical interview for new patients
              </p>
              <button className="w-full bg-indigo-600 text-white rounded-md py-2 text-sm font-medium hover:bg-indigo-700 transition-colors">
                Start Assessment
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <MessageSquare className="w-10 h-10 text-green-600" />
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">Quick</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Follow-up Assessment</h3>
              <p className="text-sm text-gray-600 mb-4">
                Quick assessment for existing patients with known conditions
              </p>
              <button className="w-full bg-green-600 text-white rounded-md py-2 text-sm font-medium hover:bg-green-700 transition-colors">
                Quick Assessment
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <AlertCircle className="w-10 h-10 text-red-600" />
                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">Urgent</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Emergency Triage</h3>
              <p className="text-sm text-gray-600 mb-4">
                Rapid triage assessment for urgent or emergency cases
              </p>
              <button className="w-full bg-red-600 text-white rounded-md py-2 text-sm font-medium hover:bg-red-700 transition-colors">
                Emergency Triage
              </button>
            </div>
          </div>

          {/* Recent Assessments */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Recent AI Assessments</h2>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="p-6 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">John Doe</h3>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        High Risk
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Chief Complaint: Chest pain with radiation to left arm
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>10 minutes ago</span>
                      <span>•</span>
                      <span>AI Confidence: 92%</span>
                      <span>•</span>
                      <span className="text-red-600 font-medium">Requires immediate attention</span>
                    </div>
                  </div>
                  <Activity className="w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div className="p-6 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">Sarah Wilson</h3>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Moderate
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Chief Complaint: Severe headache with visual disturbances
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>25 minutes ago</span>
                      <span>•</span>
                      <span>AI Confidence: 88%</span>
                      <span>•</span>
                      <span className="text-yellow-600 font-medium">Schedule within 2 hours</span>
                    </div>
                  </div>
                  <Activity className="w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div className="p-6 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">Mike Johnson</h3>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Standard
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Chief Complaint: Lower back pain after physical activity
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>1 hour ago</span>
                      <span>•</span>
                      <span>AI Confidence: 95%</span>
                      <span>•</span>
                      <span className="text-green-600 font-medium">Routine appointment</span>
                    </div>
                  </div>
                  <Activity className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* AI Status */}
          <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Brain className="w-8 h-8 text-indigo-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">BioMistral AI Status</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    AI model performing optimally • 98.5% accuracy rate • 247 assessments today
                  </p>
                </div>
              </div>
              <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                View AI Analytics →
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
