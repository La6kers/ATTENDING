import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Adaptive time estimation for COMPASS patient intake flow.
 *
 * Base estimates (seconds) are calibrated from typical patient intake times.
 * The hook tracks actual time spent on each step and adjusts future estimates
 * using a rolling pace factor: if a patient completes demographics in half the
 * expected time, remaining estimates are scaled down proportionally.
 *
 * The AI follow-up step (step 3) is variable -- its estimate scales with the
 * number of follow-up questions generated.
 */

// Step indices: 0=welcome, 1=demographics, 2=symptoms, 3=followup, 4=vitals, 5=complete
const BASE_ESTIMATES_SECONDS = {
  0: 10,   // Welcome -- just a button click
  1: 90,   // Demographics -- filling personal info
  2: 45,   // Symptoms -- typing or selecting chief complaint
  3: 60,   // Follow-up questions -- variable, adjusted by question count
  4: 40,   // Vitals -- nurse-assisted, quick entry
  5: 0,    // Complete -- no time needed
};

const SECONDS_PER_FOLLOWUP_QUESTION = 15;

export default function useIntakeTimer(totalSteps = 6) {
  // Actual time spent (in seconds) on each completed step
  const [actualTimes, setActualTimes] = useState({});
  // The timestamp when the current step was entered
  const stepStartRef = useRef(Date.now());
  // Current step index
  const [currentStep, setCurrentStep] = useState(0);
  // Number of AI follow-up questions (updated when known)
  const [followupQuestionCount, setFollowupQuestionCount] = useState(3);

  // Compute pace factor from completed steps.
  // Ratio of actual time to estimated time. Values < 1 mean the patient is fast.
  const paceFactor = useCallback(() => {
    const completedSteps = Object.keys(actualTimes);
    if (completedSteps.length === 0) return 1;

    let totalActual = 0;
    let totalEstimated = 0;
    for (const stepIdx of completedSteps) {
      totalActual += actualTimes[stepIdx];
      totalEstimated += getBaseEstimate(Number(stepIdx), followupQuestionCount);
    }
    if (totalEstimated === 0) return 1;

    // Clamp between 0.5 and 2.0 so estimates don't become absurd
    return Math.min(2.0, Math.max(0.5, totalActual / totalEstimated));
  }, [actualTimes, followupQuestionCount]);

  // Mark a step as entered (start its timer)
  const enterStep = useCallback((stepIndex) => {
    // Record time for the step we're leaving
    const now = Date.now();
    const elapsed = (now - stepStartRef.current) / 1000;

    setActualTimes((prev) => {
      // Only record if we actually spent time (more than 0.5s) and the step isn't already recorded
      if (elapsed > 0.5 && currentStep < totalSteps - 1) {
        return { ...prev, [currentStep]: elapsed };
      }
      return prev;
    });

    stepStartRef.current = now;
    setCurrentStep(stepIndex);
  }, [currentStep, totalSteps]);

  // Estimated seconds remaining from the given step onward (exclusive of that step's past time)
  const getEstimatedSecondsRemaining = useCallback(() => {
    const factor = paceFactor();
    let remaining = 0;

    // Time left on the current step: estimate minus what we've already spent
    const elapsedOnCurrent = (Date.now() - stepStartRef.current) / 1000;
    const currentEstimate = getBaseEstimate(currentStep, followupQuestionCount) * factor;
    const currentRemaining = Math.max(0, currentEstimate - elapsedOnCurrent);
    remaining += currentRemaining;

    // Future steps
    for (let i = currentStep + 1; i < totalSteps - 1; i++) {
      remaining += getBaseEstimate(i, followupQuestionCount) * factor;
    }

    return Math.round(remaining);
  }, [currentStep, paceFactor, followupQuestionCount, totalSteps]);

  // Human-readable time remaining string
  const getTimeRemainingLabel = useCallback(() => {
    const seconds = getEstimatedSecondsRemaining();
    if (seconds <= 0) return 'Almost done';
    if (seconds < 30) return 'Less than a minute left';
    if (seconds < 60) return 'About 1 minute left';
    const minutes = Math.ceil(seconds / 60);
    return `About ${minutes} minute${minutes !== 1 ? 's' : ''} left`;
  }, [getEstimatedSecondsRemaining]);

  // Percentage complete (0-100) based on steps, not time
  const getPercentComplete = useCallback(() => {
    // Exclude welcome (0) and complete (5) from the progress calculation
    const activeSteps = totalSteps - 2; // steps 1-4
    const completedActive = Math.max(0, currentStep - 1);
    if (currentStep === 0) return 0;
    if (currentStep >= totalSteps - 1) return 100;
    return Math.round((completedActive / activeSteps) * 100);
  }, [currentStep, totalSteps]);

  return {
    currentStep,
    enterStep,
    setFollowupQuestionCount,
    getEstimatedSecondsRemaining,
    getTimeRemainingLabel,
    getPercentComplete,
    actualTimes,
  };
}

function getBaseEstimate(stepIndex, followupCount) {
  if (stepIndex === 3) {
    // Follow-up step scales with question count
    return Math.max(15, followupCount * SECONDS_PER_FOLLOWUP_QUESTION);
  }
  return BASE_ESTIMATES_SECONDS[stepIndex] || 30;
}
