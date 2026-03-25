import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Clock, Brain, ChevronRight, ExternalLink, AlertTriangle } from 'lucide-react';

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
      chiefComplaint: 'Severe chest pain with radiation to left arm',
      urgencyLevel: 'high',
      aiAssessment: 'Possible ACS - Immediate evaluation',
      riskScore: 8.5,
      redFlags: 3,
      waitTime: '5 min'
    },
    {
      id: 'patient-002',
      name: 'Sarah Johnson',
      age: 32,
      chiefComplaint: 'Thunderclap headache with photophobia',
      urgencyLevel: 'high',
      aiAssessment: 'URGENT SAH evaluation required',
      riskScore: 8.2,
      redFlags: 4,
      waitTime: '10 min'
    },
    {
      id: 'patient-003',
      name: 'Mike Johnson',
      age: 28,
      chiefComplaint: 'Lower back pain after lifting',
      urgencyLevel: 'standard',
      aiAssessment: 'Mechanical back pain - Conservative tx',
      riskScore: 2.1,
      redFlags: 0,
      waitTime: '30 min'
    },
    {
      id: 'patient-004',
      name: 'Emma Davis',
      age: 67,
      chiefComplaint: 'SOB on exertion, ankle swelling x2 weeks',
      urgencyLevel: 'high',
      aiAssessment: 'Possible CHF exacerbation',
      riskScore: 7.8,
      redFlags: 2,
      waitTime: '15 min'
    },
    {
      id: 'patient-005',
      name: 'Robert Brown',
      age: 55,
      chiefComplaint: 'Persistent cough with hemoptysis',
      urgencyLevel: 'moderate',
      aiAssessment: 'Concerning for malignancy - Imaging needed',
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
        if (filter === 'completed') return false;
        return true;
      });

  const getUrgencyStyles = (level: string) => {
    switch (level) {
      case 'high': return { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600' };
      case 'moderate': return { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600' };
      default: return { bg: 'bg-green-500', text: 'text-white', border: 'border-green-600' };
    }
  };

  const handlePatientClick = (patientId: string) => {
    router.push(`/previsit/${patientId}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
      {/* Header - Compact */}
      <div className="px-4 py-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-gray-900">Patient Queue</h2>
          <span className="text-xs text-gray-500">{filteredPatients.length} patients</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'high-risk', 'ai-flagged'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filter === f 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'high-risk' ? 'High Risk' : 'AI Flagged'}
            </button>
          ))}
        </div>
      </div>

      {/* Patient List - Compact Cards */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {filteredPatients.map((patient) => {
          const urgencyStyles = getUrgencyStyles(patient.urgencyLevel);
          
          return (
            <div
              key={patient.id}
              className="px-4 py-3 hover:bg-indigo-50 cursor-pointer transition-colors group"
              onClick={() => handlePatientClick(patient.id)}
            >
              {/* Row 1: Name, Age, Urgency, Wait Time */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Urgency indicator dot */}
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${urgencyStyles.bg}`} />
                  
                  {/* Name and Age */}
                  <span className="font-medium text-gray-900 truncate text-sm group-hover:text-indigo-700">
                    {patient.name}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {patient.age}y
                  </span>
                </div>
                
                {/* Right side: Risk Score & Wait Time */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {patient.redFlags > 0 && (
                    <span className="flex items-center text-xs text-red-600 font-medium">
                      <AlertTriangle className="w-3 h-3 mr-0.5" />
                      {patient.redFlags}
                    </span>
                  )}
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    patient.riskScore >= 7 ? 'bg-red-100 text-red-700' : 
                    patient.riskScore >= 5 ? 'bg-amber-100 text-amber-700' : 
                    'bg-green-100 text-green-700'
                  }`}>
                    {patient.riskScore.toFixed(1)}
                  </span>
                  <span className="flex items-center text-xs text-gray-400">
                    <Clock className="w-3 h-3 mr-0.5" />
                    {patient.waitTime}
                  </span>
                </div>
              </div>

              {/* Row 2: Chief Complaint */}
              <p className="text-xs text-gray-600 mb-1.5 line-clamp-1">
                {patient.chiefComplaint}
              </p>

              {/* Row 3: AI Assessment */}
              <div className="flex items-center gap-1.5 text-xs">
                <Brain className="w-3 h-3 text-green-600 flex-shrink-0" />
                <span className="text-green-700 font-medium truncate">
                  {patient.aiAssessment}
                </span>
                <ChevronRight className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-auto" />
              </div>
            </div>
          );
        })}
      </div>

      {filteredPatients.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          No patients found
        </div>
      )}
    </div>
  );
};

export default PatientQueue;
