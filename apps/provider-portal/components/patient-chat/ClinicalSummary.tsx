// Clinical Summary Component

import React, { useState, useEffect } from 'react';
import { usePatientChatStore } from '@/store/patientChatStore';
import { 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Send,
  Download,
  Edit,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const ClinicalSummary: React.FC = () => {
  const { 
    clinicalData, 
    differentialDiagnosis,
    urgencyLevel,
    generateSummary,
    submitToProvider,
    setClinicalSummaryView,
    isAIProcessing
  } = usePatientChatStore();
  
  const [summary, setSummary] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setIsGenerating(true);
    try {
      const generatedSummary = await generateSummary();
      setSummary(generatedSummary);
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitToProvider();
      // Show success state
      setTimeout(() => {
        setClinicalSummaryView(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to submit:', error);
      alert('Failed to submit summary. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setClinicalSummaryView(false);
    // In production, this would allow editing the summary
    alert('Edit functionality would allow you to modify the summary before submission.');
  };

  const handleDownload = () => {
    // In production, this would generate a PDF
    const summaryText = JSON.stringify(summary, null, 2);
    const blob = new Blob([summaryText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical-summary-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isGenerating) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Generating Clinical Summary
          </h3>
          <p className="text-sm text-gray-600">
            BioMistral AI is compiling your assessment data...
          </p>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Clinical Assessment Summary</h2>
                <p className="text-sm opacity-90 mt-1">
                  Ready for provider review
                </p>
              </div>
            </div>
            <button
              onClick={() => setClinicalSummaryView(false)}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Summary Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Urgency Banner */}
            {urgencyLevel !== 'standard' && (
              <div className={cn(
                "p-4 rounded-lg flex items-center gap-3",
                urgencyLevel === 'high' 
                  ? "bg-red-50 border border-red-200" 
                  : "bg-yellow-50 border border-yellow-200"
              )}>
                <AlertCircle className={cn(
                  "w-5 h-5",
                  urgencyLevel === 'high' ? "text-red-600" : "text-yellow-600"
                )} />
                <div>
                  <p className={cn(
                    "font-semibold",
                    urgencyLevel === 'high' ? "text-red-900" : "text-yellow-900"
                  )}>
                    {urgencyLevel === 'high' 
                      ? "High Priority - Immediate Review Recommended" 
                      : "Moderate Priority - Timely Review Recommended"}
                  </p>
                  {summary.redFlags && summary.redFlags.length > 0 && (
                    <p className={cn(
                      "text-sm mt-1",
                      urgencyLevel === 'high' ? "text-red-700" : "text-yellow-700"
                    )}>
                      Red flags: {summary.redFlags.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Chief Complaint */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                Chief Complaint
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{summary.chiefComplaint || clinicalData.chiefComplaint}</p>
              </div>
            </section>

            {/* History of Present Illness */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                History of Present Illness
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{summary.hpi || 'Clinical interview conducted via AI assessment'}</p>
              </div>
            </section>

            {/* Assessment */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                Clinical Assessment
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{summary.assessment}</p>
              </div>
            </section>

            {/* Differential Diagnosis */}
            {differentialDiagnosis.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  Differential Diagnosis Considerations
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="space-y-2">
                    {differentialDiagnosis.map((dx, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5" />
                        <span className="text-gray-700">{dx.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Recommendations */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                Clinical Recommendations
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <ul className="space-y-2">
                  {(summary.clinicalRecommendations || []).map((rec: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Metadata */}
            <section className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Assessment Date:</span>
                  <span className="ml-2 text-gray-700">
                    {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">AI Model:</span>
                  <span className="ml-2 text-gray-700">BioMistral-7B Medical AI</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t bg-gray-50 p-6">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex gap-3">
              <button
                onClick={handleEdit}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Summary
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                "px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2",
                isSubmitting
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg hover:-translate-y-0.5"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit to Provider
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
