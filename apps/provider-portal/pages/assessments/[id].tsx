// Assessment Detail Page - View and review individual patient assessments
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAssessmentQueueStore } from '@/store/assessmentQueueStore';
import type { Diagnosis } from '@/types/medical';
import { 
  ArrowLeft, 
  AlertTriangle, 
  User, 
  Heart, 
  Activity, 
  Pill, 
  FileText, 
  CheckCircle, 
  Edit,
  Stethoscope,
  ClipboardList,
  MessageSquare,
  Calendar,
  Send,
  Save,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  X
} from 'lucide-react';
import Link from 'next/link';

// Urgency badge colors
const urgencyStyles: Record<string, string> = {
  high: 'bg-red-100 text-red-800 border-red-300',
  moderate: 'bg-amber-100 text-amber-800 border-amber-300',
  standard: 'bg-green-100 text-green-800 border-green-300',
};

// Status badge colors
const statusStyles: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_review: 'bg-blue-100 text-blue-800',
  urgent: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
};

export default function AssessmentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const { 
    assessments, 
    selectedAssessment,
    selectAssessment,
    updateAssessmentStatus,
    addProviderNotes,
    confirmDiagnosis,
    addIcdCode,
    setTreatmentPlan,
    completeReview,
    fetchAssessments
  } = useAssessmentQueueStore();

  // Local state for form inputs
  const [notes, setNotes] = useState('');
  const [treatmentPlanInput, setTreatmentPlanInput] = useState('');
  const [newIcdCode, setNewIcdCode] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['hpi', 'differential', 'redflags'])
  );

  // Fetch assessments if not loaded
  useEffect(() => {
    if (assessments.length === 0) {
      fetchAssessments();
    }
  }, [assessments.length, fetchAssessments]);

  // Select assessment when ID changes
  useEffect(() => {
    if (id && typeof id === 'string') {
      selectAssessment(id);
    }
    return () => selectAssessment(null);
  }, [id, selectAssessment, assessments]);

  // Load existing notes when assessment changes
  useEffect(() => {
    if (selectedAssessment) {
      setNotes(selectedAssessment.providerNotes || '');
      setTreatmentPlanInput(selectedAssessment.treatmentPlan || '');
    }
  }, [selectedAssessment]);

  const assessment = selectedAssessment || assessments.find(a => a.id === id);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Handle starting review
  const handleStartReview = () => {
    if (assessment) {
      updateAssessmentStatus(assessment.id, 'in_review');
    }
  };

  // Handle saving notes
  const handleSaveNotes = () => {
    if (assessment && notes) {
      addProviderNotes(assessment.id, notes);
    }
  };

  // Handle confirming a diagnosis
  const handleConfirmDiagnosis = (dx: Diagnosis) => {
    if (assessment) {
      confirmDiagnosis(assessment.id, { ...dx, probability: 1 });
    }
  };

  // Handle adding ICD code
  const handleAddIcdCode = () => {
    if (assessment && newIcdCode.trim()) {
      addIcdCode(assessment.id, newIcdCode.trim());
      setNewIcdCode('');
    }
  };

  // Handle saving treatment plan
  const handleSaveTreatmentPlan = () => {
    if (assessment && treatmentPlanInput) {
      setTreatmentPlan(assessment.id, treatmentPlanInput);
    }
  };

  // Handle completing the review
  const handleCompleteReview = () => {
    if (assessment) {
      completeReview(assessment.id, {
        providerNotes: notes,
        treatmentPlan: treatmentPlanInput,
        status: 'completed',
      });
      setShowCompleteModal(false);
      router.push('/assessments');
    }
  };

  // Loading state
  if (!assessment && assessments.length === 0) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Not found state
  if (!assessment) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Assessment not found</p>
            <Link 
              href="/assessments" 
              className="text-indigo-600 hover:underline mt-4 inline-flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Queue
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isCompleted = assessment.status === 'completed';
  const canEdit = !isCompleted;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <Link 
            href="/assessments" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessment Queue
          </Link>

          {/* Header Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{assessment.patientName}</h1>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${urgencyStyles[assessment.urgencyLevel]}`}>
                    {assessment.urgencyLevel.toUpperCase()} PRIORITY
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles[assessment.status]}`}>
                    {assessment.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-500">
                  {assessment.patientAge} years old • {assessment.patientGender} • 
                  Patient ID: {assessment.patientId}
                </p>
                <p className="text-gray-500 mt-1">
                  Submitted: {new Date(assessment.submittedAt).toLocaleString()}
                </p>
              </div>
              
              {/* AI Insight Badge */}
              <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg">
                <Activity className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700">
                  COMPASS AI Assessment
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Chief Complaint */}
              <Section 
                title="Chief Complaint" 
                icon={FileText}
                defaultExpanded
              >
                <p className="text-lg text-gray-800 font-medium">
                  {assessment.chiefComplaint}
                </p>
              </Section>

              {/* Red Flags */}
              {assessment.redFlags.length > 0 && (
                <Section 
                  title="Red Flag Symptoms" 
                  icon={AlertTriangle}
                  variant="danger"
                  expanded={expandedSections.has('redflags')}
                  onToggle={() => toggleSection('redflags')}
                >
                  <div className="flex flex-wrap gap-2">
                    {assessment.redFlags.map((flag, i) => (
                      <span 
                        key={i} 
                        className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-800 rounded-full text-sm font-medium border border-red-200"
                      >
                        <AlertTriangle className="h-4 w-4 mr-1.5" />
                        {flag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800">
                      <strong>Clinical Alert:</strong> These symptoms require immediate attention and may indicate serious underlying conditions.
                    </p>
                  </div>
                </Section>
              )}

              {/* History of Present Illness */}
              {assessment.hpiData && (
                <Section 
                  title="History of Present Illness (HPI)" 
                  icon={ClipboardList}
                  expanded={expandedSections.has('hpi')}
                  onToggle={() => toggleSection('hpi')}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <HPIField label="Onset" value={assessment.hpiData.onset} />
                    <HPIField label="Location" value={assessment.hpiData.location} />
                    <HPIField label="Duration" value={assessment.hpiData.duration} />
                    <HPIField label="Character" value={assessment.hpiData.character} />
                    <HPIField 
                      label="Severity" 
                      value={assessment.hpiData.severity ? `${assessment.hpiData.severity}/10` : undefined}
                      highlight={Boolean(assessment.hpiData.severity && assessment.hpiData.severity >= 7)}
                    />
                  </div>
                  
                  {assessment.hpiData.aggravatingFactors && assessment.hpiData.aggravatingFactors.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Aggravating Factors:</p>
                      <div className="flex flex-wrap gap-2">
                        {assessment.hpiData.aggravatingFactors.map((factor, i) => (
                          <span key={i} className="px-2 py-1 bg-red-50 text-red-700 rounded text-sm">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {assessment.hpiData.relievingFactors && assessment.hpiData.relievingFactors.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Relieving Factors:</p>
                      <div className="flex flex-wrap gap-2">
                        {assessment.hpiData.relievingFactors.map((factor, i) => (
                          <span key={i} className="px-2 py-1 bg-green-50 text-green-700 rounded text-sm">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {assessment.hpiData.associatedSymptoms && assessment.hpiData.associatedSymptoms.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Associated Symptoms:</p>
                      <div className="flex flex-wrap gap-2">
                        {assessment.hpiData.associatedSymptoms.map((symptom, i) => (
                          <span key={i} className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-sm">
                            {symptom}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {/* AI Differential Diagnosis */}
              <Section 
                title="AI Differential Diagnosis" 
                icon={Activity}
                badge={`${assessment.differentialDiagnosis.length} possibilities`}
                expanded={expandedSections.has('differential')}
                onToggle={() => toggleSection('differential')}
              >
                <div className="space-y-3">
                  {assessment.differentialDiagnosis.map((dx, i) => (
                    <div 
                      key={i} 
                      className={`flex items-start justify-between p-4 rounded-lg border ${
                        assessment.confirmedDiagnoses?.find(d => d.name === dx.name)
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{dx.name}</p>
                          {assessment.confirmedDiagnoses?.find(d => d.name === dx.name) && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                              Confirmed
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {dx.supportingEvidence.map((evidence, j) => (
                            <span key={j} className="text-xs px-2 py-0.5 bg-white border rounded text-gray-600">
                              {evidence}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-indigo-600">
                          {Math.round(dx.probability * 100)}%
                        </div>
                        <p className="text-xs text-gray-500">AI confidence</p>
                        {canEdit && !assessment.confirmedDiagnoses?.find(d => d.name === dx.name) && (
                          <button
                            onClick={() => handleConfirmDiagnosis(dx)}
                            className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Confirm Dx
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Medical History */}
              {assessment.medicalHistory && (
                <Section 
                  title="Medical History" 
                  icon={Heart}
                  expanded={expandedSections.has('history')}
                  onToggle={() => toggleSection('history')}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {assessment.medicalHistory.conditions && assessment.medicalHistory.conditions.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Medical Conditions:</p>
                        <ul className="space-y-1">
                          {assessment.medicalHistory.conditions.map((condition, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-center">
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mr-2"></span>
                              {condition}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {assessment.medicalHistory.medications && assessment.medicalHistory.medications.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Current Medications:</p>
                        <ul className="space-y-1">
                          {assessment.medicalHistory.medications.map((med, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-center">
                              <Pill className="h-3 w-3 text-gray-400 mr-2" />
                              {med}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {assessment.medicalHistory.allergies && assessment.medicalHistory.allergies.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Allergies:</p>
                        <div className="flex flex-wrap gap-2">
                          {assessment.medicalHistory.allergies.map((allergy, i) => (
                            <span key={i} className="px-2 py-1 bg-red-50 text-red-700 rounded text-sm border border-red-200">
                              {allergy}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {assessment.medicalHistory.surgeries && assessment.medicalHistory.surgeries.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Surgical History:</p>
                        <ul className="space-y-1">
                          {assessment.medicalHistory.surgeries.map((surgery, i) => (
                            <li key={i} className="text-sm text-gray-600">• {surgery}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* Risk Factors */}
              {assessment.riskFactors.length > 0 && (
                <Section 
                  title="Risk Factors" 
                  icon={Heart}
                  variant="warning"
                  expanded={expandedSections.has('risk')}
                  onToggle={() => toggleSection('risk')}
                >
                  <div className="flex flex-wrap gap-2">
                    {assessment.riskFactors.map((factor, i) => (
                      <span 
                        key={i} 
                        className="inline-flex items-center px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium"
                      >
                        <Heart className="h-3 w-3 mr-1.5" />
                        {factor}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Provider Notes */}
              <Section title="Provider Notes" icon={Edit}>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add clinical notes, observations, or additional assessment..."
                  disabled={isCompleted}
                  className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {canEdit && (
                  <button
                    onClick={handleSaveNotes}
                    className="mt-3 inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Notes
                  </button>
                )}
              </Section>

              {/* ICD Codes */}
              <Section title="ICD-10 Codes" icon={FileText}>
                <div className="flex flex-wrap gap-2 mb-4">
                  {assessment.icdCodes?.map((code, i) => (
                    <span 
                      key={i}
                      className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded font-mono text-sm"
                    >
                      {code}
                    </span>
                  ))}
                  {(!assessment.icdCodes || assessment.icdCodes.length === 0) && (
                    <span className="text-gray-500 text-sm">No ICD codes added yet</span>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newIcdCode}
                      onChange={(e) => setNewIcdCode(e.target.value.toUpperCase())}
                      placeholder="Enter ICD-10 code (e.g., J02.9)"
                      className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      onClick={handleAddIcdCode}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </Section>

              {/* Treatment Plan */}
              <Section title="Treatment Plan" icon={Stethoscope}>
                <textarea
                  value={treatmentPlanInput}
                  onChange={(e) => setTreatmentPlanInput(e.target.value)}
                  placeholder="Document treatment plan, orders, prescriptions, follow-up instructions..."
                  disabled={isCompleted}
                  className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {canEdit && (
                  <button
                    onClick={handleSaveTreatmentPlan}
                    className="mt-3 inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Treatment Plan
                  </button>
                )}
              </Section>
            </div>

            {/* Sidebar - 1 column */}
            <div className="space-y-6">
              {/* Actions Card */}
              <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-24">
                <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
                
                {assessment.status === 'pending' && (
                  <button
                    onClick={handleStartReview}
                    className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium mb-3 flex items-center justify-center"
                  >
                    <User className="h-5 w-5 mr-2" />
                    Start Review
                  </button>
                )}
                
                {assessment.status === 'in_review' && (
                  <button
                    onClick={() => setShowCompleteModal(true)}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium mb-3 flex items-center justify-center"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Complete Review
                  </button>
                )}

                {isCompleted && (
                  <div className="w-full bg-green-100 text-green-800 py-3 px-4 rounded-lg font-medium mb-3 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Review Completed
                  </div>
                )}
                
                <button className="w-full border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors mb-3 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message Patient
                </button>
                
                <button className="w-full border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Follow-up
                </button>
              </div>

              {/* Confirmed Diagnoses */}
              {assessment.confirmedDiagnoses && assessment.confirmedDiagnoses.length > 0 && (
                <div className="bg-green-50 rounded-lg border border-green-200 p-6">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Confirmed Diagnoses
                  </h3>
                  <ul className="space-y-2">
                    {assessment.confirmedDiagnoses.map((dx, i) => (
                      <li key={i} className="text-green-800 font-medium">
                        • {dx.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Patient Summary Card */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Patient Summary</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Patient ID</dt>
                    <dd className="text-gray-900 font-medium">{assessment.patientId}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Age</dt>
                    <dd className="text-gray-900 font-medium">{assessment.patientAge} years</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Gender</dt>
                    <dd className="text-gray-900 font-medium">{assessment.patientGender}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Priority</dt>
                    <dd className={`font-medium ${
                      assessment.urgencyLevel === 'high' ? 'text-red-600' :
                      assessment.urgencyLevel === 'moderate' ? 'text-amber-600' :
                      'text-green-600'
                    }`}>
                      {assessment.urgencyLevel.charAt(0).toUpperCase() + assessment.urgencyLevel.slice(1)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Timeline</h3>
                <div className="space-y-4">
                  <TimelineItem 
                    label="Assessment submitted" 
                    time={assessment.submittedAt} 
                    done 
                    icon={Send}
                  />
                  <TimelineItem 
                    label="Review started" 
                    time={assessment.reviewedAt} 
                    done={!!assessment.reviewedAt}
                    icon={User}
                  />
                  <TimelineItem 
                    label="Review completed" 
                    time={assessment.completedAt} 
                    done={!!assessment.completedAt}
                    icon={CheckCircle}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Review Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Complete Review</h3>
              <button 
                onClick={() => setShowCompleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to complete this assessment review? This will finalize the assessment and notify the patient.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                <strong>Patient:</strong> {assessment.patientName}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Confirmed Diagnoses:</strong> {assessment.confirmedDiagnoses?.length || 0}
              </p>
              <p className="text-sm text-gray-700">
                <strong>ICD Codes:</strong> {assessment.icdCodes?.join(', ') || 'None'}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteReview}
                className="flex-1 bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Complete Review
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// Section Component
interface SectionProps {
  title: string;
  icon: any;
  children: React.ReactNode;
  variant?: 'default' | 'danger' | 'warning';
  badge?: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}

function Section({ 
  title, 
  icon: Icon, 
  children, 
  variant = 'default',
  badge,
  defaultExpanded = true,
  expanded,
  onToggle
}: SectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const actualExpanded = expanded !== undefined ? expanded : isExpanded;
  
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const variantStyles = {
    default: 'bg-white border-gray-200',
    danger: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
  };

  const iconStyles = {
    default: 'text-gray-500',
    danger: 'text-red-600',
    warning: 'text-amber-600',
  };
  
  return (
    <div className={`rounded-lg shadow-sm border ${variantStyles[variant]}`}>
      <button
        onClick={handleToggle}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <h3 className="font-semibold text-gray-900 flex items-center">
          <Icon className={`h-5 w-5 mr-2 ${iconStyles[variant]}`} />
          {title}
          {badge && (
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {badge}
            </span>
          )}
        </h3>
        {actualExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {actualExpanded && (
        <div className="px-6 pb-6">
          {children}
        </div>
      )}
    </div>
  );
}

// HPI Field Component
function HPIField({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  if (!value) return null;
  
  return (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

// Timeline Item Component
function TimelineItem({ 
  label, 
  time, 
  done,
  icon: Icon 
}: { 
  label: string; 
  time?: string; 
  done: boolean;
  icon: any;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        done ? 'bg-green-100' : 'bg-gray-100'
      }`}>
        <Icon className={`h-4 w-4 ${done ? 'text-green-600' : 'text-gray-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? 'text-gray-900' : 'text-gray-400'}`}>
          {label}
        </p>
        {time && (
          <p className="text-xs text-gray-500">
            {new Date(time).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
