// =============================================================================
// ATTENDING AI - Assessment Machine Hook
// apps/patient-portal/hooks/useAssessmentMachine.ts
//
// React hook for using the XState assessment machine.
// Provides a clean interface for managing the COMPASS assessment flow.
// =============================================================================

import { useCallback, useMemo } from 'react';
import { useMachine } from '@xstate/react';
import { assessmentMachine, type AssessmentContext, type AssessmentPhase } from '@/machines/assessmentMachine';
import { type QuickReply, QUICK_REPLY_PRESETS } from '@/components/assessment/QuickReplies';
import { type Message } from '@/components/assessment/MessageBubble';

// ============================================================================
// Phase Messages
// ============================================================================

const PHASE_MESSAGES: Record<AssessmentPhase, {
  question: string;
  followUp?: string;
  quickReplies?: QuickReply[];
}> = {
  welcome: {
    question: "Hello! I'm COMPASS, your AI health assistant. I'll help gather information about your symptoms to share with your healthcare provider. What brings you in today?",
    quickReplies: QUICK_REPLY_PRESETS.chiefComplaint
  },
  demographics: {
    question: "First, I need to confirm a few details. What is your date of birth?",
    followUp: "And what is your gender?"
  },
  chiefComplaint: {
    question: "Please describe your main concern or symptom in your own words.",
    quickReplies: QUICK_REPLY_PRESETS.chiefComplaint
  },
  hpiOnset: {
    question: "**When did this symptom first start?** Please be as specific as possible.",
    quickReplies: QUICK_REPLY_PRESETS.timing
  },
  hpiLocation: {
    question: "**Where exactly is the symptom located?** Can you point to or describe the area?",
  },
  hpiDuration: {
    question: "**How long have you been experiencing this?** Is it constant or does it come and go?",
    quickReplies: QUICK_REPLY_PRESETS.frequency
  },
  hpiCharacter: {
    question: "**How would you describe the symptom?** For example: sharp, dull, burning, throbbing, aching.",
    quickReplies: QUICK_REPLY_PRESETS.painCharacter
  },
  hpiSeverity: {
    question: "**On a scale of 0-10, how severe is your symptom right now?**\n(0 = no symptom, 10 = worst imaginable)",
    quickReplies: QUICK_REPLY_PRESETS.painScale
  },
  hpiTiming: {
    question: "**Is the symptom constant or does it come and go?** When does it tend to be worse?",
    quickReplies: QUICK_REPLY_PRESETS.frequency
  },
  hpiContext: {
    question: "**What were you doing when this started?** Were there any triggering events?",
  },
  hpiModifying: {
    question: "**What makes it better or worse?** (movement, rest, medications, heat/cold, etc.)",
  },
  reviewOfSystems: {
    question: "I'm going to ask about other symptoms you may be experiencing. Have you had any of the following?\n\n**Fever, chills, night sweats, or unexplained weight changes?**",
    quickReplies: QUICK_REPLY_PRESETS.yesNoUnsure
  },
  medicalHistory: {
    question: "**Do you have any chronic medical conditions?** (diabetes, high blood pressure, heart disease, asthma, etc.)",
    quickReplies: [
      { id: 'none', text: 'None', value: 'none' },
      { id: 'diabetes', text: 'Diabetes', value: 'diabetes' },
      { id: 'htn', text: 'High blood pressure', value: 'hypertension' },
      { id: 'heart', text: 'Heart disease', value: 'heart disease' },
      { id: 'asthma', text: 'Asthma/COPD', value: 'asthma' },
      { id: 'other', text: 'Other conditions', value: 'other' }
    ]
  },
  medications: {
    question: "**What medications are you currently taking?** Include prescription, over-the-counter, and supplements.",
    quickReplies: [
      { id: 'none', text: 'No medications', value: 'none' },
      { id: 'list', text: 'I have a list', value: 'has list' }
    ]
  },
  allergies: {
    question: "**Do you have any allergies to medications, foods, or other substances?**",
    quickReplies: QUICK_REPLY_PRESETS.yesNo
  },
  socialHistory: {
    question: "A few questions about lifestyle. **Do you currently smoke or use tobacco products?**",
    quickReplies: QUICK_REPLY_PRESETS.smokingStatus
  },
  riskAssessment: {
    question: "**Is there anything else important about your health that I should know?** Any recent travel, exposures, or concerns?",
    quickReplies: [
      { id: 'no', text: 'Nothing else', value: 'no' },
      { id: 'yes', text: 'Yes, I want to add something', value: 'yes' }
    ]
  },
  summary: {
    question: "Thank you for providing this information. I've prepared a summary of your assessment. Would you like to review it before we share it with your provider?",
    quickReplies: QUICK_REPLY_PRESETS.confirmation
  },
  providerHandoff: {
    question: "Your assessment is now ready for provider review. A healthcare provider will review your information and connect with you shortly. Is there anything urgent you need to add?",
    quickReplies: [
      { id: 'wait', text: 'I\'ll wait for the provider', value: 'wait' },
      { id: 'urgent', text: 'This is urgent', value: 'urgent', variant: 'danger' as const }
    ]
  },
  emergency: {
    question: "**⚠️ Based on your symptoms, this may be a medical emergency.** Please call 911 immediately if you are experiencing severe symptoms.",
    quickReplies: [
      { id: 'call', text: 'Call 911', value: '911', variant: 'danger' as const },
      { id: 'notEmergency', text: 'Symptoms not severe', value: 'continue' }
    ]
  },
  completed: {
    question: "Your assessment has been submitted and a provider will review your information. Thank you for using COMPASS!"
  }
};

// ============================================================================
// Hook
// ============================================================================

export function useAssessmentMachine() {
  const [state, send] = useMachine(assessmentMachine);
  
  const context = state.context as AssessmentContext;
  const currentPhase = context.currentPhase;
  const isEmergency = context.isEmergency;
  
  // Get current phase message configuration
  const phaseConfig = PHASE_MESSAGES[currentPhase] || PHASE_MESSAGES.chiefComplaint;
  
  // Convert context messages to Message format
  const messages = useMemo((): Message[] => {
    const msgs: Message[] = [];
    
    // Add welcome message
    if (context.phaseHistory.length > 0) {
      msgs.push({
        id: 'welcome-msg',
        role: 'assistant',
        content: PHASE_MESSAGES.welcome.question,
        timestamp: context.startTime || new Date().toISOString(),
        metadata: { phase: 'welcome' }
      });
    }
    
    // Add current phase question if not at welcome
    // Note: 'idle' is a machine state, not a phase value - currentPhase starts at 'welcome'
    if (currentPhase !== 'welcome') {
      msgs.push({
        id: `phase-${currentPhase}`,
        role: 'assistant',
        content: phaseConfig.question,
        timestamp: new Date().toISOString(),
        metadata: { 
          phase: currentPhase,
          isEmergency: isEmergency
        }
      });
    }
    
    // Add user's last input if exists
    if (context.lastUserInput) {
      msgs.push({
        id: `user-${Date.now()}`,
        role: 'user',
        content: context.lastUserInput,
        timestamp: new Date().toISOString()
      });
    }
    
    return msgs;
  }, [context, currentPhase, phaseConfig, isEmergency]);
  
  // Actions
  const startAssessment = useCallback((patientName: string, patientId?: string) => {
    send({ type: 'START', patientName, patientId });
  }, [send]);
  
  const submitChiefComplaint = useCallback((complaint: string) => {
    send({ type: 'SUBMIT_CHIEF_COMPLAINT', complaint });
  }, [send]);
  
  const submitHPIOnset = useCallback((onset: string) => {
    send({ type: 'SUBMIT_HPI_ONSET', onset });
  }, [send]);
  
  const submitHPILocation = useCallback((location: string) => {
    send({ type: 'SUBMIT_HPI_LOCATION', location });
  }, [send]);
  
  const submitHPIDuration = useCallback((duration: string) => {
    send({ type: 'SUBMIT_HPI_DURATION', duration });
  }, [send]);
  
  const submitHPICharacter = useCallback((character: string) => {
    send({ type: 'SUBMIT_HPI_CHARACTER', character });
  }, [send]);
  
  const submitHPISeverity = useCallback((severity: number) => {
    send({ type: 'SUBMIT_HPI_SEVERITY', severity });
  }, [send]);
  
  const submitHPITiming = useCallback((timing: string) => {
    send({ type: 'SUBMIT_HPI_TIMING', timing });
  }, [send]);
  
  const submitHPIContext = useCallback((context: string) => {
    send({ type: 'SUBMIT_HPI_CONTEXT', context });
  }, [send]);
  
  const submitHPIModifying = useCallback((aggravating: string[], relieving: string[]) => {
    send({ type: 'SUBMIT_HPI_MODIFYING', aggravating, relieving });
  }, [send]);
  
  const submitROS = useCallback((system: string, symptoms: string[]) => {
    send({ type: 'SUBMIT_ROS', system, symptoms });
  }, [send]);
  
  const completeROS = useCallback(() => {
    send({ type: 'COMPLETE_ROS' });
  }, [send]);
  
  const submitMedicalHistory = useCallback((conditions: string[]) => {
    send({ type: 'SUBMIT_MEDICAL_HISTORY', conditions });
  }, [send]);
  
  const submitMedications = useCallback((medications: { name: string; dose?: string; frequency?: string }[]) => {
    send({ type: 'SUBMIT_MEDICATIONS', medications });
  }, [send]);
  
  const submitAllergies = useCallback((allergies: { allergen: string; reaction?: string; severity?: 'mild' | 'moderate' | 'severe' }[]) => {
    send({ type: 'SUBMIT_ALLERGIES', allergies });
  }, [send]);
  
  const submitSocialHistory = useCallback((data: AssessmentContext['socialHistory']) => {
    send({ type: 'SUBMIT_SOCIAL_HISTORY', data });
  }, [send]);
  
  const next = useCallback(() => {
    send({ type: 'NEXT' });
  }, [send]);
  
  const back = useCallback(() => {
    send({ type: 'BACK' });
  }, [send]);
  
  const skip = useCallback(() => {
    send({ type: 'SKIP' });
  }, [send]);
  
  const acknowledgeEmergency = useCallback(() => {
    send({ type: 'EMERGENCY_ACKNOWLEDGED' });
  }, [send]);
  
  const call911 = useCallback(() => {
    send({ type: 'EMERGENCY_CALL_911' });
  }, [send]);
  
  const reset = useCallback(() => {
    send({ type: 'RESET' });
  }, [send]);
  
  // Submit based on current phase
  const submitCurrentPhase = useCallback((value: string) => {
    switch (currentPhase) {
      case 'chiefComplaint':
        submitChiefComplaint(value);
        break;
      case 'hpiOnset':
        submitHPIOnset(value);
        break;
      case 'hpiLocation':
        submitHPILocation(value);
        break;
      case 'hpiDuration':
        submitHPIDuration(value);
        break;
      case 'hpiCharacter':
        submitHPICharacter(value);
        break;
      case 'hpiSeverity':
        submitHPISeverity(parseInt(value, 10) || 0);
        break;
      case 'hpiTiming':
        submitHPITiming(value);
        break;
      case 'hpiContext':
        submitHPIContext(value);
        break;
      default:
        next();
    }
  }, [currentPhase, submitChiefComplaint, submitHPIOnset, submitHPILocation, submitHPIDuration, submitHPICharacter, submitHPISeverity, submitHPITiming, submitHPIContext, next]);
  
  return {
    // State
    state,
    context,
    currentPhase,
    isEmergency,
    progress: context.progressPercent,
    redFlags: context.redFlags,
    urgencyLevel: context.urgencyLevel,
    isCompleted: state.matches('completed'),
    
    // Messages
    messages,
    currentQuestion: phaseConfig.question,
    quickReplies: phaseConfig.quickReplies || [],
    
    // Clinical Data
    clinicalData: {
      chiefComplaint: context.chiefComplaint,
      hpi: context.hpiData,
      reviewOfSystems: context.reviewOfSystems,
      medicalHistory: context.medicalHistory,
      medications: context.medications,
      allergies: context.allergies,
      socialHistory: context.socialHistory,
      vitalSigns: context.vitalSigns
    },
    
    // Actions
    startAssessment,
    submitChiefComplaint,
    submitHPIOnset,
    submitHPILocation,
    submitHPIDuration,
    submitHPICharacter,
    submitHPISeverity,
    submitHPITiming,
    submitHPIContext,
    submitHPIModifying,
    submitROS,
    completeROS,
    submitMedicalHistory,
    submitMedications,
    submitAllergies,
    submitSocialHistory,
    submitCurrentPhase,
    next,
    back,
    skip,
    acknowledgeEmergency,
    call911,
    reset,
    send
  };
}

export default useAssessmentMachine;
