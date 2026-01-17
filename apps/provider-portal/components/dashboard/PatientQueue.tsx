import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Clock, Brain, ChevronRight, ExternalLink } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  age: number;
  chiefComplaint: string;
  urgencyLevel: 'high' | 'moderate' | 'standard';
  aiAssessment: string;
  riskScore: number;
  redFlags: number;
  waitTime: string;
}

const PatientQueue = () => {
  const router = useRouter();
  const [filter, setFilter] = useState('all');

  const patients: Patient[] = [
    {
      id: 'patient-001',
      name: 'John Doe',
      age: 45,
      chiefComplaint: 'Severe chest pain with radiation to left arm, started 3 hours ago, associated with diaphoresis',
      urgencyLevel: 'high',
      aiAssessment: 'Possible acute coronary syndrome - Immediate evaluation recommended',
      riskScore: 8.5,
      redFlags: 3,
      waitTime: '5 min'
    },
    {
      id: 'patient-002',
      name: 'Sarah Johnson',
      age: 32,
      chiefComplaint: 'Severe unilateral headache - "worst headache of my life" - with photophobia, nausea, confusion',
      urgencyLevel: 'high',
      aiAssessment: 'Thunderclap headache - URGENT SAH evaluation required',
      riskScore: 8.2,
      redFlags: 4,
      waitTime: '10 min'
    },
    {
      id: 'patient-003',
      name: 'Mike Johnson',
      age: 28,
      chiefComplaint: 'Lower back pain after lifting heavy objects, no neurological deficits',
      urgencyLevel: 'standard',
      aiAssessment: 'Mechanical back pain - Conservative management, red flag screening negative',
      riskScore: 2.1,
      redFlags: 0,
      waitTime: '30 min'
    },
    {
      id: 'patient-004',
      name: 'Emma Davis',
      age: 67,
      chiefComplaint: 'Shortness of breath, worse on exertion, ankle swelling for 2 weeks',
      urgencyLevel: 'high',
      aiAssessment: 'Possible heart failure exacerbation - Urgent evaluation needed',
      riskScore: 7.8,
      redFlags: 2,
      waitTime: '15 min'
    },
    {
      id: 'patient-005',
      name: 'Robert Brown',
      age: 55,
      chiefComplaint: 'Persistent cough with blood-tinged sputum, weight loss',
      urgencyLevel: 'moderate',
      aiAssessment: 'Concerning for malignancy vs TB - Imaging and workup indicated',
      riskScore: 6.5,
      redFlags: 2,
      waitTime: '20 min'
    }
  ];

  const filteredPatients = filter === 'all' 
    ? patients 
    : patients.filter(p => {
        if (filter === 'high-risk') return p.urgencyLevel === 'high';
        if (filter === 'ai-flagged') return p.redFlags > 0;
        if (filter === 'completed') return false; // No completed patients in this mock
        return true;
      });

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getUrgencyIcon = (level: string) => {
    switch (level) {
      case 'high': return '🚨';
      case 'moderate': return '⚠️';
      default: return '✅';
    }
  };

  // Navigate to pre-visit summary when clicking a patient
  const handlePatientClick = (patientId: string) => {
    router.push(`/previsit/${patientId}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient Queue - AI Enhanced</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('high-risk')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'high-risk' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            High Risk
          </button>
          <button
            onClick={() => setFilter('ai-flagged')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'ai-flagged' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            AI Flagged
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === 'completed' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {filteredPatients.map((patient) => (
          <div
            key={patient.id}
            className="p-6 hover:bg-indigo-50 cursor-pointer transition-colors group"
            onClick={() => handlePatientClick(patient.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {patient.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700 flex items-center gap-2">
                    {patient.name}
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
                  </h3>
                  <p className="text-sm text-gray-500">Age: {patient.age}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(patient.urgencyLevel)}`}>
                  {getUrgencyIcon(patient.urgencyLevel)} {patient.urgencyLevel.toUpperCase()}
                </span>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {patient.waitTime}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
              <div>
                <span className="text-gray-500">AI Assessment:</span>
                <span className="ml-2 font-medium text-gray-900">Complete</span>
              </div>
              <div>
                <span className="text-gray-500">Risk Score:</span>
                <span className={`ml-2 font-medium ${patient.riskScore >= 7 ? 'text-red-600' : patient.riskScore >= 5 ? 'text-amber-600' : 'text-green-600'}`}>
                  {patient.riskScore}/10
                </span>
              </div>
              <div>
                <span className="text-gray-500">Red Flags:</span>
                <span className={`ml-2 font-medium ${patient.redFlags > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {patient.redFlags}
                </span>
              </div>
              <div>
                <span className="text-gray-500">DDx Generated:</span>
                <span className="ml-2 font-medium text-gray-900">Yes</span>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Chief Complaint:</p>
              <p className="text-sm text-gray-600">{patient.chiefComplaint}</p>
            </div>

            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
              <Brain className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700 font-medium">
                BioMistral AI: {patient.aiAssessment}
              </p>
            </div>

            {/* Click to view hint */}
            <div className="mt-3 flex items-center justify-end text-xs text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-3 h-3 mr-1" />
              Click to view Pre-Visit Summary
            </div>
          </div>
        ))}
      </div>

      {filteredPatients.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          No patients found for the selected filter.
        </div>
      )}
    </div>
  );
};

export default PatientQueue;
