// Assessment Submission Service
// Used by COMPASS (Patient Portal) to submit completed assessments to Provider Portal

import {
  SubmitAssessmentRequest,
  SubmitAssessmentResponse,
  PatientAssessment,
  ClinicalData,
  ClinicalSummary,
  UrgencyLevel,
  Diagnosis,
} from '../types';

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const SUBMIT_ENDPOINT = '/api/assessments/submit';

// Service class
export class AssessmentSubmissionService {
  private apiBaseUrl: string;
  
  constructor(apiBaseUrl?: string) {
    this.apiBaseUrl = apiBaseUrl || API_BASE_URL;
  }

  /**
   * Submit a completed COMPASS assessment to the Provider Portal
   */
  async submitAssessment(
    assessmentData: SubmitAssessmentRequest
  ): Promise<SubmitAssessmentResponse> {
    try {
      // Validate required fields
      this.validateSubmission(assessmentData);

      // Submit to API
      const response = await fetch(`${this.apiBaseUrl}${SUBMIT_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers in production
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(assessmentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Submission failed with status ${response.status}`);
      }

      const result: SubmitAssessmentResponse = await response.json();
      
      // Log for debugging
      console.log('Assessment submitted successfully:', result.assessmentId);
      
      return result;
    } catch (error) {
      console.error('Assessment submission failed:', error);
      throw error;
    }
  }

  /**
   * Build submission payload from COMPASS clinical data
   */
  buildSubmissionPayload(
    patientInfo: {
      id: string;
      name: string;
      age: number;
      gender: string;
    },
    clinicalData: ClinicalData,
    differentialDiagnosis: Diagnosis[],
    sessionId?: string
  ): SubmitAssessmentRequest {
    // Calculate urgency level based on clinical data
    const urgencyLevel = this.calculateUrgencyLevel(clinicalData);

    return {
      patientId: patientInfo.id,
      patientName: patientInfo.name,
      patientAge: patientInfo.age,
      patientGender: patientInfo.gender,
      chiefComplaint: clinicalData.chiefComplaint,
      urgencyLevel,
      redFlags: clinicalData.redFlags,
      riskFactors: clinicalData.riskFactors,
      differentialDiagnosis,
      clinicalData,
      hpiData: clinicalData.hpi,
      medicalHistory: {
        conditions: clinicalData.pmh.conditions,
        medications: clinicalData.medications.map(m => 
          m.dose ? `${m.name} ${m.dose}` : m.name
        ),
        allergies: clinicalData.allergies.map(a => 
          a.reaction ? `${a.allergen} (${a.reaction})` : a.allergen
        ),
        surgeries: clinicalData.pmh.surgeries,
      },
      sessionId,
      compassVersion: '2.0.0',
    };
  }

  /**
   * Build clinical summary from assessment data
   */
  buildClinicalSummary(
    patientId: string,
    clinicalData: ClinicalData,
    differentialDiagnosis: Diagnosis[]
  ): ClinicalSummary {
    const urgencyLevel = this.calculateUrgencyLevel(clinicalData);

    return {
      patientId,
      timestamp: new Date().toISOString(),
      chiefComplaint: clinicalData.chiefComplaint,
      hpiNarrative: this.buildHPINarrative(clinicalData.hpi),
      rosFindings: this.buildROSFindings(clinicalData.ros),
      pmhSummary: this.buildPMHSummary(clinicalData),
      medicationList: clinicalData.medications.map(m => 
        `${m.name}${m.dose ? ` ${m.dose}` : ''}${m.frequency ? ` ${m.frequency}` : ''}`
      ).join('; ') || 'None reported',
      allergiesList: clinicalData.allergies.map(a => 
        `${a.allergen}${a.reaction ? ` - ${a.reaction}` : ''}`
      ).join('; ') || 'NKDA',
      riskFactors: clinicalData.riskFactors,
      redFlags: clinicalData.redFlags,
      urgencyLevel,
      differentialDiagnosis,
      clinicalRecommendations: this.generateRecommendations(clinicalData, differentialDiagnosis),
    };
  }

  /**
   * Calculate urgency level based on clinical data
   */
  private calculateUrgencyLevel(clinicalData: ClinicalData): UrgencyLevel {
    // High urgency conditions
    if (clinicalData.redFlags.length >= 2) return 'high';
    
    const criticalRedFlags = [
      'chest pain', 'difficulty breathing', 'severe headache',
      'loss of consciousness', 'stroke symptoms', 'suicidal ideation'
    ];
    
    const hasCriticalRedFlag = clinicalData.redFlags.some(flag =>
      criticalRedFlags.some(critical => flag.toLowerCase().includes(critical))
    );
    
    if (hasCriticalRedFlag) return 'high';
    
    // Check severity
    const severity = clinicalData.hpi.severity || 0;
    if (severity >= 8) return 'high';
    if (severity >= 6) return 'moderate';
    
    // Check risk factors
    if (clinicalData.riskFactors.length >= 3) return 'moderate';
    if (clinicalData.redFlags.length >= 1) return 'moderate';
    
    return 'standard';
  }

  /**
   * Build HPI narrative from structured data
   */
  private buildHPINarrative(hpi: ClinicalData['hpi']): string {
    const parts: string[] = [];

    if (hpi.onset) {
      parts.push(`Patient reports symptom onset ${hpi.onset}.`);
    }
    if (hpi.location) {
      parts.push(`Localized to ${hpi.location}.`);
    }
    if (hpi.character) {
      parts.push(`Character described as ${hpi.character}.`);
    }
    if (hpi.severity !== undefined) {
      parts.push(`Severity rated ${hpi.severity}/10.`);
    }
    if (hpi.duration) {
      parts.push(`Duration: ${hpi.duration}.`);
    }
    if (hpi.timing) {
      parts.push(`Timing: ${hpi.timing}.`);
    }
    if (hpi.aggravatingFactors?.length) {
      parts.push(`Aggravated by: ${hpi.aggravatingFactors.join(', ')}.`);
    }
    if (hpi.relievingFactors?.length) {
      parts.push(`Relieved by: ${hpi.relievingFactors.join(', ')}.`);
    }
    if (hpi.associatedSymptoms?.length) {
      parts.push(`Associated symptoms: ${hpi.associatedSymptoms.join(', ')}.`);
    }

    return parts.join(' ') || 'HPI details not available.';
  }

  /**
   * Build ROS findings summary
   */
  private buildROSFindings(ros: ClinicalData['ros']): string {
    const findings: string[] = [];
    const negatives: string[] = [];

    Object.entries(ros).forEach(([system, symptoms]) => {
      if (symptoms && Array.isArray(symptoms) && symptoms.length > 0) {
        const positive = symptoms.filter(s => s !== 'Negative' && !s.toLowerCase().includes('negative'));
        if (positive.length > 0) {
          findings.push(`${system}: ${positive.join(', ')}`);
        } else {
          negatives.push(system);
        }
      }
    });

    let result = '';
    if (findings.length > 0) {
      result = `Positive findings: ${findings.join('; ')}. `;
    }
    if (negatives.length > 0) {
      result += `Negative: ${negatives.join(', ')}.`;
    }

    return result || 'ROS not completed.';
  }

  /**
   * Build PMH summary
   */
  private buildPMHSummary(clinicalData: ClinicalData): string {
    const parts: string[] = [];

    if (clinicalData.pmh.conditions?.length) {
      parts.push(`Medical conditions: ${clinicalData.pmh.conditions.join(', ')}`);
    }
    if (clinicalData.pmh.surgeries?.length) {
      parts.push(`Surgical history: ${clinicalData.pmh.surgeries.join(', ')}`);
    }
    if (clinicalData.socialHistory?.smoking) {
      parts.push(`Social history: ${clinicalData.socialHistory.smoking}`);
    }
    if (clinicalData.familyHistory?.conditions?.length) {
      parts.push(`Family history: ${clinicalData.familyHistory.conditions.join(', ')}`);
    }

    return parts.join('. ') || 'PMH not provided.';
  }

  /**
   * Generate clinical recommendations
   */
  private generateRecommendations(
    clinicalData: ClinicalData,
    differentialDiagnosis: Diagnosis[]
  ): string[] {
    const recommendations: string[] = [];

    // Always recommend physical exam
    recommendations.push('Complete physical examination');
    recommendations.push('Vital signs assessment');

    // Based on severity
    if (clinicalData.hpi.severity && clinicalData.hpi.severity >= 7) {
      recommendations.push('Pain management assessment');
    }

    // Based on red flags
    if (clinicalData.redFlags.length > 0) {
      recommendations.push('Urgent clinical evaluation recommended');
    }

    // Based on chief complaint patterns
    const cc = clinicalData.chiefComplaint.toLowerCase();
    if (cc.includes('chest') || cc.includes('heart')) {
      recommendations.push('Consider ECG');
      recommendations.push('Cardiac biomarkers if indicated');
    }
    if (cc.includes('head') || cc.includes('neuro')) {
      recommendations.push('Neurological examination');
    }
    if (cc.includes('abdom')) {
      recommendations.push('Abdominal examination');
      recommendations.push('Consider basic metabolic panel');
    }

    // Based on top differentials
    const topDx = differentialDiagnosis[0];
    if (topDx) {
      recommendations.push(`Evaluate for ${topDx.name}`);
    }

    return recommendations;
  }

  /**
   * Validate submission data
   */
  private validateSubmission(data: SubmitAssessmentRequest): void {
    if (!data.patientId) {
      throw new Error('Patient ID is required');
    }
    if (!data.patientName) {
      throw new Error('Patient name is required');
    }
    if (!data.chiefComplaint) {
      throw new Error('Chief complaint is required');
    }
    if (!data.urgencyLevel) {
      throw new Error('Urgency level is required');
    }
  }
}

// Export singleton instance
export const assessmentSubmissionService = new AssessmentSubmissionService();

// Export convenience function
export async function submitCompassAssessment(
  assessmentData: SubmitAssessmentRequest
): Promise<SubmitAssessmentResponse> {
  return assessmentSubmissionService.submitAssessment(assessmentData);
}
