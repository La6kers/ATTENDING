// =============================================================================
// ATTENDING AI - AI-Enhanced Message Detail Panel
// apps/provider-portal/components/inbox/ExpandedPanel.tsx
//
// Features:
//   - Intent detection: parses patient messages for actionable requests
//   - Auto-pended actions: labs, referrals, refills auto-staged for approval
//   - AI-drafted responses with 3 alternatives (provider editable)
//   - Regenerate alternatives using same clinical data
//   - Two-column layout: [Message + Context | AI Actions + Response]
//
// Redesigned March 2026
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Forward, UserPlus, FileText, AlertTriangle, Activity, Sparkles, Check, Send, Edit3,
  Phone, Pill, Heart, FlaskConical, X, Brain, Shield, Clock, ChevronDown, ChevronUp,
  Stethoscope, Copy, RotateCcw, ClipboardList, ArrowRightLeft, MapPin, Beaker,
  Plus, Minus, RefreshCw, Zap, CheckCircle, Calendar, FileSearch, Users,
} from 'lucide-react';
import type { InboxItem, ResponseTemplate } from './types';
import { categoryConfig } from './theme';
import {
  prescanMessage,
  gatherChartContext,
  mockLLMCall,
  runInboxAgent,
  type InboxAIResponse,
  type PendedAction as AgentPendedAction,
  type AIDraft as AgentAIDraft,
  type StaffInstruction,
  type SeverityLevel,
} from '../../lib/services/inboxAIAgent';

// =============================================================================
// Intent Detection — Parses patient messages for actionable requests
// =============================================================================

type MessageIntent =
  | 'refill'
  | 'med-adjustment'
  | 'lab-request'
  | 'referral'
  | 'symptom-report'
  | 'lab-question'
  | 'appointment'
  | 'general';

interface PendedAction {
  id: string;
  type: 'lab' | 'referral' | 'refill' | 'appointment' | 'follow-up' | 'imaging' | 'medication-change';
  title: string;
  detail: string;
  enabled: boolean;
  confidence: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

function detectIntent(item: InboxItem): MessageIntent {
  const text = (item.content + ' ' + (item.subject || '') + ' ' + (item.chiefComplaint || '')).toLowerCase();

  if (item.category === 'refills') return 'refill';
  if (item.category === 'labs') return 'lab-question';

  if (text.includes('request: medication refill') || text.includes('refill')) return 'refill';
  if (text.includes('thyroid') || text.includes('levothyroxine') || text.includes('tsh') || text.includes('synthroid')) return 'med-adjustment';
  if (text.includes('dose') && (text.includes('increase') || text.includes('adjust') || text.includes('change'))) return 'med-adjustment';
  if (text.includes('side effect') || text.includes('cough') || text.includes('switch')) return 'med-adjustment';
  if (text.includes('referral') || text.includes('specialist') || text.includes('orthopedic')) return 'referral';
  if (text.includes('report: new') || text.includes('symptom') || text.includes('fatigue') || text.includes('pain')) return 'symptom-report';
  if (text.includes('question: lab') || text.includes('lab result') || text.includes('a1c')) return 'lab-question';
  if (text.includes('schedule') || text.includes('appointment') || text.includes('book')) return 'appointment';
  if (text.includes('request: lab') || text.includes('lab work') || text.includes('blood work')) return 'lab-request';

  return 'general';
}

function generatePendedActions(item: InboxItem, intent: MessageIntent): PendedAction[] {
  const actions: PendedAction[] = [];
  const text = item.content.toLowerCase();
  const chart = item.chartData;

  switch (intent) {
    case 'refill': {
      const meds: string[] = [];
      const medRegex = /[•\-]\s*(.+?)\s*[—\-]/gm;
      let match;
      while ((match = medRegex.exec(item.content)) !== null) {
        meds.push(match[1].trim());
      }
      if (meds.length === 0 && item.medication) meds.push(item.medication);
      if (meds.length === 0) {
        chart.medications.forEach(m => { if (text.includes(m.name.toLowerCase())) meds.push(`${m.name} ${m.dose}`); });
      }

      meds.forEach((med, i) => {
        actions.push({
          id: `refill-${i}`, type: 'refill', title: `Approve Refill: ${med}`,
          detail: item.pharmacy ? `Send to ${item.pharmacy}` : 'Send to patient pharmacy on file',
          enabled: true, confidence: 0.95, icon: Pill,
        });
      });

      if (chart.conditions.some(c => c.includes('Diabetes'))) {
        actions.push({
          id: 'lab-a1c', type: 'lab', title: 'Order: HbA1c',
          detail: 'Diabetes monitoring — consider if >3 months since last',
          enabled: false, confidence: 0.75, icon: Beaker,
        });
      }
      break;
    }

    case 'med-adjustment': {
      const hasThyroid = text.includes('thyroid') || text.includes('levothyroxine') || text.includes('tsh') || text.includes('synthroid');
      const hasCough = text.includes('cough') || text.includes('side effect');
      const hasACEi = chart.medications.some(m => m.name.toLowerCase().includes('lisinopril') || m.name.toLowerCase().includes('enalapril'));

      if (hasThyroid) {
        const tshLabs = chart.recentLabs.filter(l => l.name === 'TSH');
        const lastTSH = tshLabs[0];
        const isElevated = lastTSH && parseFloat(lastTSH.value) > 4.0;
        const currentLevo = chart.medications.find(m => m.name.toLowerCase().includes('levothyroxine'));

        if (isElevated && currentLevo) {
          const currentDose = parseInt(currentLevo.dose) || 50;
          const newDose = currentDose + 25;
          actions.push(
            { id: 'rx-levo-increase', type: 'refill', title: `Adjust: Levothyroxine ${currentDose}mcg \u2192 ${newDose}mcg`, detail: `TSH ${lastTSH.value} mIU/L (elevated). Increase by 25mcg. Recheck TSH in 6-8 weeks.`, enabled: true, confidence: 0.93, icon: Pill },
            { id: 'lab-tsh-recheck', type: 'lab', title: 'Order: TSH + Free T4 (6-8 weeks)', detail: 'Recheck thyroid function after dose adjustment', enabled: true, confidence: 0.95, icon: Beaker },
            { id: 'fu-thyroid', type: 'follow-up', title: 'Follow-up: 8 weeks', detail: 'Review TSH after dose change, assess symptoms', enabled: true, confidence: 0.88, icon: Calendar },
          );
        } else {
          actions.push(
            { id: 'lab-thyroid-full', type: 'lab', title: 'Order: TSH, Free T4, Free T3', detail: 'Full thyroid panel to guide adjustment', enabled: true, confidence: 0.92, icon: Beaker },
            { id: 'fu-thyroid', type: 'follow-up', title: 'Schedule Follow-up', detail: 'Review labs and reassess dose', enabled: true, confidence: 0.85, icon: Calendar },
          );
        }
      } else if (hasCough && hasACEi) {
        actions.push(
          { id: 'rx-switch-arb', type: 'refill', title: 'Switch: Lisinopril \u2192 Losartan 50mg', detail: 'ACE inhibitor cough. ARB (losartan) equally effective without cough side effect.', enabled: true, confidence: 0.92, icon: Pill },
          { id: 'rx-dc-acei', type: 'refill', title: 'Discontinue: Lisinopril', detail: 'Stop current ACE inhibitor due to side effect', enabled: true, confidence: 0.95, icon: Pill },
          { id: 'lab-bmp', type: 'lab', title: 'Order: BMP (2 weeks)', detail: 'Recheck renal function/K+ after med change', enabled: true, confidence: 0.88, icon: Beaker },
          { id: 'fu-bp', type: 'follow-up', title: 'Follow-up: 4 weeks', detail: 'BP check after medication switch', enabled: true, confidence: 0.85, icon: Calendar },
        );
      } else {
        actions.push(
          { id: 'fu-med-review', type: 'follow-up', title: 'Schedule Medication Review', detail: 'In-person visit to evaluate medication adjustment', enabled: true, confidence: 0.80, icon: Calendar },
        );
      }
      break;
    }

    case 'symptom-report': {
      if (text.includes('fatigue') || text.includes('tired') || text.includes('hair loss') || text.includes('cold')) {
        actions.push(
          { id: 'lab-thyroid', type: 'lab', title: 'Order: Thyroid Panel (TSH, Free T4)', detail: 'Symptoms consistent with hypothyroidism workup', enabled: true, confidence: 0.92, icon: Beaker },
          { id: 'lab-cbc', type: 'lab', title: 'Order: CBC with Differential', detail: 'Rule out anemia as cause of fatigue', enabled: true, confidence: 0.90, icon: Beaker },
          { id: 'lab-iron', type: 'lab', title: 'Order: Iron Studies + Ferritin', detail: 'Evaluate for iron deficiency', enabled: true, confidence: 0.85, icon: Beaker },
          { id: 'lab-vitd', type: 'lab', title: 'Order: Vitamin D, 25-OH', detail: 'Common deficiency contributing to fatigue', enabled: false, confidence: 0.70, icon: Beaker },
          { id: 'fu-appt', type: 'follow-up', title: 'Schedule Follow-up', detail: '2-3 weeks to review lab results', enabled: true, confidence: 0.88, icon: Calendar },
        );
      } else if (text.includes('chest') || text.includes('heart')) {
        actions.push(
          { id: 'lab-troponin', type: 'lab', title: 'Order: Troponin', detail: 'Rule out acute cardiac injury', enabled: true, confidence: 0.90, icon: Beaker },
          { id: 'lab-bnp', type: 'lab', title: 'Order: BNP', detail: 'Evaluate for heart failure', enabled: true, confidence: 0.85, icon: Beaker },
          { id: 'img-ekg', type: 'imaging', title: 'Order: 12-Lead ECG', detail: 'Cardiac rhythm evaluation', enabled: true, confidence: 0.93, icon: Activity },
          { id: 'ref-cards', type: 'referral', title: 'Referral: Cardiology', detail: 'Urgent cardiology evaluation', enabled: false, confidence: 0.75, icon: Heart },
        );
      } else if (text.includes('knee') || text.includes('joint') || text.includes('back')) {
        actions.push(
          { id: 'img-xray', type: 'imaging', title: 'Order: X-Ray', detail: 'Evaluate for structural changes', enabled: true, confidence: 0.85, icon: FileSearch },
          { id: 'fu-appt', type: 'follow-up', title: 'Schedule Follow-up', detail: 'Review imaging and discuss plan', enabled: true, confidence: 0.88, icon: Calendar },
        );
      } else {
        actions.push(
          { id: 'fu-appt', type: 'follow-up', title: 'Schedule Follow-up', detail: 'Evaluate symptoms in person', enabled: true, confidence: 0.80, icon: Calendar },
        );
      }
      break;
    }

    case 'referral': {
      let specialty = 'Specialist';
      let reason = item.chiefComplaint || 'Patient-requested referral';
      if (text.includes('orthopedic') || text.includes('knee') || text.includes('joint')) {
        specialty = 'Orthopedic Surgery';
        reason = 'Joint pain evaluation and management';
      } else if (text.includes('cardio') || text.includes('heart')) {
        specialty = 'Cardiology';
        reason = 'Cardiac evaluation';
      } else if (text.includes('dermat') || text.includes('skin') || text.includes('rash')) {
        specialty = 'Dermatology';
        reason = 'Skin condition evaluation';
      } else if (text.includes('neuro') || text.includes('headache') || text.includes('migraine')) {
        specialty = 'Neurology';
        reason = 'Neurological evaluation';
      } else if (text.includes('gastro') || text.includes('stomach') || text.includes('gi')) {
        specialty = 'Gastroenterology';
        reason = 'GI evaluation';
      }

      actions.push(
        { id: 'ref-1', type: 'referral', title: `Referral: ${specialty}`, detail: reason, enabled: true, confidence: 0.90, icon: ArrowRightLeft },
      );

      if (text.includes('knee') || text.includes('shoulder') || text.includes('hip')) {
        actions.push(
          { id: 'img-preref', type: 'imaging', title: 'Order: X-Ray (pre-referral)', detail: `${specialty} may require imaging — order now to expedite`, enabled: true, confidence: 0.82, icon: FileSearch },
        );
      }
      break;
    }

    case 'lab-request': {
      actions.push(
        { id: 'lab-cmp', type: 'lab', title: 'Order: Comprehensive Metabolic Panel', detail: 'Basic metabolic evaluation', enabled: true, confidence: 0.90, icon: Beaker },
        { id: 'lab-cbc', type: 'lab', title: 'Order: CBC with Differential', detail: 'Complete blood count', enabled: true, confidence: 0.88, icon: Beaker },
      );
      if (chart.conditions.some(c => c.includes('Diabetes') || c.includes('Prediabetes'))) {
        actions.push({ id: 'lab-a1c', type: 'lab', title: 'Order: HbA1c', detail: 'Diabetes monitoring', enabled: true, confidence: 0.95, icon: Beaker });
      }
      if (chart.conditions.some(c => c.includes('Hyperlipidemia'))) {
        actions.push({ id: 'lab-lipid', type: 'lab', title: 'Order: Lipid Panel', detail: 'Cholesterol monitoring', enabled: true, confidence: 0.92, icon: Beaker });
      }
      break;
    }

    case 'lab-question': {
      if (item.labType === 'critical') {
        actions.push(
          { id: 'lab-repeat', type: 'lab', title: 'Order: Repeat Stat Labs', detail: 'Confirm critical value', enabled: true, confidence: 0.95, icon: Beaker },
          { id: 'fu-urgent', type: 'follow-up', title: 'Urgent Follow-up Call', detail: 'Contact patient to discuss critical result', enabled: true, confidence: 0.98, icon: Phone },
        );
      } else if (item.labType === 'abnormal') {
        actions.push(
          { id: 'fu-appt', type: 'follow-up', title: 'Schedule Follow-up', detail: 'Discuss abnormal results and treatment options', enabled: true, confidence: 0.85, icon: Calendar },
        );
      }
      if (text.includes('should i be concerned') || text.includes('what does this mean')) {
        actions.push(
          { id: 'fu-appt', type: 'follow-up', title: 'Schedule Follow-up', detail: 'Patient education and counseling visit', enabled: false, confidence: 0.70, icon: Calendar },
        );
      }
      break;
    }

    case 'appointment': {
      actions.push(
        { id: 'appt-1', type: 'appointment', title: 'Schedule Appointment', detail: 'Per patient request', enabled: true, confidence: 0.90, icon: Calendar },
      );
      break;
    }
  }

  return actions;
}

// =============================================================================
// AI Response Generator — Multiple alternatives
// =============================================================================

interface AIDraft {
  id: string;
  label: string;
  tone: string;
  content: string;
  confidence: number;
}

function generateAIDrafts(item: InboxItem, intent: MessageIntent, pendedActions: PendedAction[]): AIDraft[] {
  const firstName = item.patientName.split(' ')[0];
  const chart = item.chartData;
  const enabledActions = pendedActions.filter(a => a.enabled);
  const labs = enabledActions.filter(a => a.type === 'lab');
  const refs = enabledActions.filter(a => a.type === 'referral');
  const refills = enabledActions.filter(a => a.type === 'refill');
  const followups = enabledActions.filter(a => a.type === 'follow-up' || a.type === 'appointment');
  const imaging = enabledActions.filter(a => a.type === 'imaging');

  let actionSummary = '';
  if (labs.length > 0) actionSummary += `\nI'm ordering the following lab work:\n${labs.map(l => `  - ${l.title.replace('Order: ', '')}`).join('\n')}\n\nYou can complete these at any Quest or LabCorp location with the attached order. ${chart.conditions.some(c => c.includes('Diabetes')) ? 'Please fast for 8-12 hours before your blood draw.' : 'No special preparation is needed.'}\n`;
  if (refs.length > 0) actionSummary += `\nI'm placing a referral to ${refs.map(r => r.title.replace('Referral: ', '')).join(' and ')}. Our referral coordinator will contact you with available appointment times.\n`;
  if (refills.length > 0) actionSummary += `\nYour medication refill${refills.length > 1 ? 's have' : ' has'} been approved and sent to your pharmacy. ${refills.length > 1 ? 'They' : 'It'} should be ready for pickup within 24-48 hours.\n`;
  if (imaging.length > 0) actionSummary += `\nI'm ordering ${imaging.map(im => im.title.replace('Order: ', '')).join(' and ')}. Our scheduling team will contact you to arrange this.\n`;
  if (followups.length > 0) actionSummary += `\nPlease schedule a follow-up appointment ${followups[0].detail.toLowerCase().includes('2-3 weeks') ? 'in 2-3 weeks' : 'at your earliest convenience'} so we can review everything together.\n`;

  const drafts: AIDraft[] = [];

  if (item.category === 'phone') {
    drafts.push({
      id: 'call-prep', label: 'Callback Prep Notes', tone: 'Clinical',
      confidence: 0.95,
      content: `CALLBACK: ${item.patientName} at ${item.callbackNumber}\n\nReason: ${item.chiefComplaint || item.subject}\n\nKey Discussion Points:\n${item.symptoms ? item.symptoms.map(s => `  - ${s}`).join('\n') : '  - Review concerns'}\n\nChart Review:\n  - Conditions: ${chart.conditions.join(', ') || 'None'}\n  - Medications: ${chart.medications.map(m => `${m.name} ${m.dose}`).join(', ') || 'None'}\n  - Allergies: ${chart.allergies.join(', ')}\n  - Last visit: ${chart.lastVisit.date} (${chart.lastVisit.reason})${actionSummary ? `\n\nPlanned Actions:${actionSummary}` : ''}`,
    });
    return drafts;
  }

  if (intent === 'med-adjustment') {
    const text = item.content.toLowerCase();
    const hasThyroid = text.includes('thyroid') || text.includes('levothyroxine') || text.includes('tsh');
    const hasCough = text.includes('cough') || text.includes('side effect');

    if (hasThyroid) {
      const tshLabs = chart.recentLabs.filter(l => l.name === 'TSH');
      const lastTSH = tshLabs[0];
      const currentLevo = chart.medications.find(m => m.name.toLowerCase().includes('levothyroxine'));
      const currentDose = currentLevo ? parseInt(currentLevo.dose) || 50 : 50;
      const newDose = currentDose + 25;

      drafts.push({
        id: 'thyroid-adjust', label: 'Dose Adjustment', tone: 'Clinical',
        confidence: 0.95,
        content: `Dear ${firstName},\n\nThank you for reaching out about your thyroid medication. I've reviewed your recent lab results:\n\n${lastTSH ? `  \u2022 Thyroid level (TSH): ${lastTSH.value} (normal range: ${lastTSH.referenceRange}) \u2014 elevated` : '  \u2022 Thyroid level: pending'}\n${chart.recentLabs.filter(l => l.name.includes('T4')).map(l => `  \u2022 Thyroid hormone level (Free T4): ${l.value} ${l.unit} (normal range: ${l.referenceRange})`).join('\n') || ''}\n\n${tshLabs.length > 1 ? `Your thyroid level trend: ${tshLabs.map(l => `${l.value} (${new Date(l.collectedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })})`).join(' \u2192 ')}\n\n` : ''}Your thyroid level remains above the target range, which explains your continued fatigue and weight gain. I'm increasing your levothyroxine from ${currentDose} micrograms to ${newDose} micrograms daily.\n\nPlease continue taking it on an empty stomach, 30-60 minutes before eating. I'll order follow-up thyroid blood work in 6-8 weeks to see how you're responding to the new dose.\n\nBest regards,\nDr. Thomas Reed`,
      });
      drafts.push({
        id: 'thyroid-brief', label: 'Brief Response', tone: 'Concise',
        confidence: 0.88,
        content: `Dear ${firstName},\n\nYour thyroid level is still elevated at ${lastTSH?.value || 'above normal'}. I'm increasing your levothyroxine to ${newDose} micrograms. Continue same dosing instructions. We'll recheck your thyroid blood work in 6-8 weeks.\n\nIf symptoms worsen before then, please let us know.\n\nDr. Reed`,
      });
      drafts.push({
        id: 'thyroid-edu', label: 'Educational', tone: 'Detailed',
        confidence: 0.82,
        content: `Dear ${firstName},\n\nI appreciate you keeping me updated on how you're feeling. Let me explain what's happening:\n\nYour thyroid gland isn't producing enough hormone, so we supplement it with levothyroxine. Your thyroid level of ${lastTSH?.value || '(elevated)'} tells us your body needs more thyroid hormone than you're currently getting. A normal thyroid level is between 0.4 and 4.0.\n\nI'm increasing your dose from ${currentDose} micrograms to ${newDose} micrograms. It takes about 6-8 weeks for your body to fully adjust to a new dose, so please be patient. You should start feeling more energetic within a few weeks.\n\nImportant reminders:\n  \u2022 Take on empty stomach, 30-60 minutes before breakfast\n  \u2022 Avoid calcium or iron supplements within 4 hours\n  \u2022 Don't skip doses\n\nWe'll recheck your thyroid levels in 6-8 weeks.\n\nBest regards,\nDr. Thomas Reed`,
      });
    } else if (hasCough) {
      drafts.push({
        id: 'switch-arb', label: 'Switch to ARB', tone: 'Clinical',
        confidence: 0.93,
        content: `Dear ${firstName},\n\nThe dry cough you're experiencing is a well-known side effect of lisinopril, your current blood pressure medication. It occurs in about 10-15% of patients and unfortunately doesn't go away with continued use.\n\nThe good news is that there's an excellent alternative. I'm switching you from lisinopril to losartan 50mg, which works similarly for blood pressure but doesn't cause the cough. Your home blood pressure readings of 128/82 look well-controlled, so we'll start losartan at an equivalent dose.\n\nPlease:\n  1. Stop the lisinopril today\n  2. Start losartan 50mg tomorrow morning\n  3. Continue monitoring your blood pressure at home\n\nThe cough should resolve within 1-4 weeks after stopping lisinopril. I'll order blood work in 2 weeks to check your kidney function on the new medication.\n\nBest regards,\nDr. Thomas Reed`,
      });
      drafts.push({
        id: 'switch-brief', label: 'Brief Switch', tone: 'Concise',
        confidence: 0.88,
        content: `Dear ${firstName},\n\nThe cough is a common side effect of lisinopril. I'm switching you to losartan 50mg \u2014 same blood pressure benefit without the cough. Stop lisinopril, start losartan tomorrow. Blood work to recheck in 2 weeks.\n\nCough should resolve within 1-4 weeks.\n\nDr. Reed`,
      });
    }
    return drafts;
  }

  if (intent === 'refill' || item.category === 'refills') {
    drafts.push({
      id: 'approve-notify', label: 'Approve + Notify', tone: 'Friendly',
      confidence: 0.95,
      content: `Dear ${firstName},\n\nYour medication refill${refills.length > 1 ? 's have' : ' has'} been reviewed and approved.\n${actionSummary}\nPlease continue taking your medication${refills.length > 1 ? 's' : ''} as prescribed. If you experience any side effects or have questions about your medication, don't hesitate to reach out.\n\nBest regards,\nDr. Thomas Reed\nFamily Medicine`,
    });
    drafts.push({
      id: 'approve-labs', label: 'Approve + Order Labs', tone: 'Clinical',
      confidence: 0.88,
      content: `Dear ${firstName},\n\nYour refill has been approved and sent to your pharmacy.\n\nSince it's been a while since your last check-up blood work, I'd also like to order some routine tests to make sure everything is on track. I'm ordering a comprehensive blood chemistry panel and ${chart.conditions.some(c => c.includes('Diabetes')) ? 'a diabetes blood sugar test' : 'a cholesterol panel'}.\n\nPlease schedule your blood work at your convenience. ${chart.conditions.some(c => c.includes('Diabetes')) ? 'Remember to fast for 8-12 hours.' : ''}\n\nBest regards,\nDr. Thomas Reed`,
    });
    drafts.push({
      id: 'hold-appt', label: 'Hold + Schedule Visit', tone: 'Cautious',
      confidence: 0.72,
      content: `Dear ${firstName},\n\nThank you for your refill request. Before I can approve this refill, I'd like to see you for a follow-up visit to review your current medications and check how you're doing.\n\nPlease contact our office to schedule an appointment at your earliest convenience. In the meantime, if you are completely out of medication, please let us know and we can provide a short bridge supply.\n\nBest regards,\nDr. Thomas Reed`,
    });
    return drafts;
  }

  if (intent === 'lab-question' || item.category === 'labs') {
    if (item.labType === 'critical') {
      drafts.push({
        id: 'critical-ack', label: 'Critical Value Response', tone: 'Urgent',
        confidence: 0.95,
        content: `CRITICAL RESULT ACKNOWLEDGED\n\nPatient: ${item.patientName}\nResult: ${item.subject}\n\nImmediate Actions:\n  - Repeat stat labs ordered\n  - Patient contact initiated\n  - Medication review: ${chart.medications.map(m => `${m.name} ${m.dose}`).join(', ')}\n\nClinical Decision:\n[Document your clinical response here]`,
      });
    } else {
      drafts.push({
        id: 'results-explain', label: 'Detailed Explanation', tone: 'Educational',
        confidence: 0.92,
        content: `Dear ${firstName},\n\nThank you for your question about your recent lab results. I'm happy to explain what they mean.\n\n${item.content}\n\nOverall, ${item.labType === 'abnormal' ? "there are some values I'd like to address" : 'your results look reassuring'}. ${item.labType === 'abnormal' ? "While these numbers aren't in the critical range, they do suggest we should take some steps to improve them." : 'Everything is tracking well with your current treatment plan.'}\n${actionSummary}\nI appreciate you staying engaged with your health. Keep up the great work with diet and exercise.\n\nBest regards,\nDr. Thomas Reed`,
      });
      drafts.push({
        id: 'results-brief', label: 'Brief Reassurance', tone: 'Concise',
        confidence: 0.85,
        content: `Dear ${firstName},\n\nI've reviewed your recent lab results. ${item.labType === 'normal' ? 'Everything looks good — all values are within normal range.' : "There are some values slightly outside the normal range that we should discuss at your next visit."}\n${actionSummary}\nIf you have any other questions, don't hesitate to reach out.\n\nBest regards,\nDr. Reed`,
      });
      drafts.push({
        id: 'results-action', label: 'Action-Oriented', tone: 'Direct',
        confidence: 0.80,
        content: `Dear ${firstName},\n\nLab results reviewed. Here's what I recommend:\n\n${item.labType === 'abnormal' ? '1. Continue lifestyle modifications (diet, exercise)\n2. Consider medication adjustment at next visit\n3. Recheck labs in 3 months' : '1. Continue current plan\n2. Recheck at routine interval'}\n${actionSummary}\nPlease reach out with any questions.\n\nDr. Reed`,
      });
    }
    return drafts;
  }

  if (item.category === 'imaging') {
    drafts.push({
      id: 'img-review', label: 'Results Review', tone: 'Detailed',
      confidence: 0.90,
      content: `Dear ${firstName},\n\nYour ${item.imagingType} results are available. Here's a summary:\n\n${item.content}\n\n${item.radiologistNote ? `Radiologist recommendation: ${item.radiologistNote}\n\n` : ''}I've reviewed these results and ${item.imagingStatus === 'completed' ? 'everything looks as expected given your medical history' : 'would like to discuss the findings with you'}.\n${actionSummary}\nBest regards,\nDr. Thomas Reed`,
    });
    return drafts;
  }

  if (item.category === 'charts') {
    drafts.push({
      id: 'ack-note', label: 'Acknowledge + Plan', tone: 'Clinical',
      confidence: 0.92,
      content: `Reviewed ${item.fromProvider}'s note regarding ${item.patientName}.\n\nKey findings: ${item.symptoms?.join(', ') || item.chiefComplaint}\n\nPlan:\n  - Recommendations noted and incorporated into care plan\n  - ${chart.medications.length > 0 ? 'Current medications reviewed — no changes needed at this time' : 'Will evaluate medication needs at next visit'}\n  - Follow-up with patient at next scheduled visit`,
    });
    return drafts;
  }

  if (item.category === 'incomplete') {
    drafts.push({
      id: 'complete-chart', label: 'Sign & Close', tone: 'Documentation',
      confidence: 0.95,
      content: `Chart reviewed and completed.\n\nAddressed elements:\n${(item.missingElements || []).map(e => `  [x] ${e}`).join('\n')}\n\nAssessment and plan confirmed. Chart signed.`,
    });
    return drafts;
  }

  drafts.push({
    id: 'comprehensive', label: 'Comprehensive Response', tone: 'Detailed',
    confidence: 0.92,
    content: `Dear ${firstName},\n\nThank you for reaching out. I've carefully reviewed your message regarding ${item.chiefComplaint || item.subject?.replace(/^(REQUEST|REPORT|QUESTION): /, '') || 'your concern'}.\n\n${item.symptoms && item.symptoms.length > 0 ? `Based on what you've described (${item.symptoms.slice(0, 3).join(', ')}), I'd like to take the following steps to evaluate this thoroughly:\n` : 'I want to make sure we address this properly.\n'}${actionSummary || '\nI would like to discuss this further. Please schedule a follow-up appointment at your convenience.\n'}\nIn the meantime, if your symptoms worsen or you develop any new concerns, please don't hesitate to contact us or visit your nearest urgent care.\n\nBest regards,\nDr. Thomas Reed\nFamily Medicine`,
  });

  drafts.push({
    id: 'brief', label: 'Brief Response', tone: 'Concise',
    confidence: 0.85,
    content: `Dear ${firstName},\n\nThank you for your message. I've reviewed your concern and taken the following steps:\n${actionSummary || '\nPlease schedule a follow-up to discuss in detail.\n'}\nReach out anytime if you have questions.\n\nBest regards,\nDr. Reed`,
  });

  drafts.push({
    id: 'clinical', label: 'Clinical Action Focus', tone: 'Direct',
    confidence: 0.80,
    content: `Dear ${firstName},\n\nMessage reviewed. Actions taken:\n${enabledActions.map(a => `  - ${a.title}`).join('\n') || '  - Follow-up recommended'}\n\nNext steps: ${followups.length > 0 ? 'Schedule follow-up as indicated above.' : 'Continue current care plan. Contact us with any changes.'}\n\nDr. Reed`,
  });

  return drafts;
}

// =============================================================================
// Sub-Components
// =============================================================================

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 90 ? '#059669' : pct >= 75 ? '#d97706' : '#9ca3af';
  return <span className="text-[10px] font-bold" style={{ color }}>{pct}%</span>;
}

function IntentBadge({ intent }: { intent: MessageIntent }) {
  const config: Record<MessageIntent, { label: string; bg: string; text: string }> = {
    'refill': { label: 'Refill Request', bg: '#dcfce7', text: '#166534' },
    'med-adjustment': { label: 'Medication Adjustment', bg: '#fef3c7', text: '#92400e' },
    'lab-request': { label: 'Lab Request', bg: '#fef3c7', text: '#92400e' },
    'referral': { label: 'Referral Request', bg: '#dbeafe', text: '#1e40af' },
    'symptom-report': { label: 'Symptom Report', bg: '#fce8e2', text: '#b85a42' },
    'lab-question': { label: 'Lab Question', bg: '#fef3c7', text: '#92400e' },
    'appointment': { label: 'Appointment Request', bg: '#e0f2fe', text: '#075985' },
    'general': { label: 'General Message', bg: '#f3f4f6', text: '#374151' },
  };
  const c = config[intent];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: c.bg, color: c.text }}>
      <Zap className="w-2.5 h-2.5" /> AI: {c.label}
    </span>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface ExpandedPanelProps {
  item: InboxItem;
  onClose: () => void;
  onComplete: (response: string) => void;
  onForward: () => void;
  onReassign: () => void;
}

export const ExpandedPanel: React.FC<ExpandedPanelProps> = ({
  item, onClose, onComplete, onForward, onReassign,
}) => {
  const router = useRouter();
  const chart = item.chartData;
  const intent = detectIntent(item);

  const [pendedActions, setPendedActions] = useState<PendedAction[]>([]);
  const [drafts, setDrafts] = useState<AIDraft[]>([]);
  const [staffDraft, setStaffDraft] = useState<AIDraft | null>(null);
  const [staffInstruction, setStaffInstruction] = useState<StaffInstruction | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [response, setResponse] = useState('');
  const [responseAudience, setResponseAudience] = useState<'patient' | 'staff'>('patient');
  const [isEditing, setIsEditing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const [aiSeverity, setAiSeverity] = useState<SeverityLevel>('routine');
  const [aiReasoning, setAiReasoning] = useState('');

  useEffect(() => {
    // Use the AI agent pipeline
    const runAgent = async () => {
      const agentResult = await runInboxAgent(
        {
          patientId: item.patientId,
          from: item.patientName,
          subject: item.subject,
          content: item.content,
          category: item.category,
          chiefComplaint: item.chiefComplaint,
          symptoms: item.symptoms,
        },
        {
          conditions: chart.conditions,
          medications: chart.medications,
          recentLabs: chart.recentLabs,
          allergies: chart.allergies,
          recentVitals: chart.recentVitals,
          lastVisit: chart.lastVisit,
        },
        {
          providerName: 'Dr. Thomas Reed',
          llmCall: mockLLMCall, // Swap with real Claude API call in production
        },
      );

      // Map agent actions to component format (add icons)
      const iconForType: Record<string, React.ComponentType<{ className?: string }>> = {
        'lab': Beaker, 'referral': ArrowRightLeft, 'refill': Pill,
        'appointment': Calendar, 'follow-up': Calendar, 'imaging': FileSearch,
        'medication-change': Pill,
      };
      const mappedActions: PendedAction[] = agentResult.pendedActions.map((a, i) => ({
        ...a,
        id: a.id || `action-${i}`,
        icon: iconForType[a.type] || ClipboardList,
      }));
      setPendedActions(mappedActions);

      // Map patient drafts
      const mappedDrafts: AIDraft[] = agentResult.patientDrafts.map((d, i) => ({
        id: d.id || `draft-${i}`,
        label: d.label,
        tone: d.tone,
        content: d.content,
        confidence: d.confidence,
      }));
      setDrafts(mappedDrafts);

      // Staff draft
      setStaffDraft({
        id: agentResult.staffDraft.id,
        label: agentResult.staffDraft.label,
        tone: agentResult.staffDraft.tone,
        content: agentResult.staffDraft.content,
        confidence: agentResult.staffDraft.confidence,
      });
      setStaffInstruction(agentResult.staffInstruction);
      setAiSeverity(agentResult.severity);
      setAiReasoning(agentResult.reasoning);

      // Default to first patient draft
      if (mappedDrafts.length > 0) {
        setSelectedDraftId(mappedDrafts[0].id);
        setResponse(mappedDrafts[0].content);
      }
      setResponseAudience('patient');
      setIsEditing(false);
      setIsCopied(false);
    };

    runAgent();
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const regenerateDrafts = useCallback(() => {
    setIsRegenerating(true);
    // Re-run agent
    runInboxAgent(
      {
        patientId: item.patientId,
        from: item.patientName,
        subject: item.subject,
        content: item.content,
        category: item.category,
        chiefComplaint: item.chiefComplaint,
        symptoms: item.symptoms,
      },
      {
        conditions: chart.conditions,
        medications: chart.medications,
        recentLabs: chart.recentLabs,
        allergies: chart.allergies,
        recentVitals: chart.recentVitals,
        lastVisit: chart.lastVisit,
      },
      {
        providerName: 'Dr. Thomas Reed',
        llmCall: mockLLMCall,
      },
    ).then(agentResult => {
      const iconForType: Record<string, React.ComponentType<{ className?: string }>> = {
        'lab': Beaker, 'referral': ArrowRightLeft, 'refill': Pill,
        'appointment': Calendar, 'follow-up': Calendar, 'imaging': FileSearch,
        'medication-change': Pill,
      };
      const mappedDrafts: AIDraft[] = agentResult.patientDrafts.map((d, i) => ({
        id: d.id || `draft-${i}`,
        label: d.label,
        tone: d.tone,
        content: d.content,
        confidence: d.confidence,
      }));
      setDrafts(mappedDrafts);
      setStaffDraft({
        id: agentResult.staffDraft.id,
        label: agentResult.staffDraft.label,
        tone: agentResult.staffDraft.tone,
        content: agentResult.staffDraft.content,
        confidence: agentResult.staffDraft.confidence,
      });
      setStaffInstruction(agentResult.staffInstruction);
      if (responseAudience === 'patient' && mappedDrafts.length > 0) {
        setSelectedDraftId(mappedDrafts[0].id);
        setResponse(mappedDrafts[0].content);
      } else if (responseAudience === 'staff' && agentResult.staffDraft) {
        setSelectedDraftId(agentResult.staffDraft.id);
        setResponse(agentResult.staffDraft.content);
      }
      setIsEditing(false);
      setIsRegenerating(false);
    });
  }, [item, responseAudience]);

  const toggleAction = (actionId: string) => {
    setPendedActions(prev => prev.map(a =>
      a.id === actionId ? { ...a, enabled: !a.enabled } : a
    ));
  };

  const selectDraft = (draft: AIDraft) => {
    setSelectedDraftId(draft.id);
    setResponse(draft.content);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch { /* noop */ }
  };

  const handleSend = () => {
    onComplete(response);
  };

  const messageTimestamp = new Date(item.timestamp).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const enabledActions = pendedActions.filter(a => a.enabled);
  const disabledActions = pendedActions.filter(a => !a.enabled);
  const visibleDisabled = showAllActions ? disabledActions : disabledActions.slice(0, 2);

  // Light teal theme colors
  const colors = {
    cardBg: '#FFFFFF',
    sectionBg: '#F0FAF9',
    text: '#0C3547',
    textSecondary: '#3d6b7a',
    textMuted: '#7faaab',
    border: 'rgba(26, 143, 168, 0.15)',
    accent: '#1A8FA8',
    accentLight: '#E6F7F5',
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'transparent' }}>
      {/* Top Bar: Patient Identity + Actions */}
      <div className="px-6 py-3 flex items-center justify-between flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #145566 0%, #1A8FA8 100%)' }}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
            {item.patientName.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white">{item.patientName}</span>
              <span className="text-teal-200 text-sm">{item.patientAge}y {'\u00b7'} {item.mrn}</span>
              {item.priority === 'urgent' && (
                <span className="px-2 py-0.5 bg-red-500/80 text-white text-xs font-bold rounded animate-pulse">URGENT</span>
              )}
              <IntentBadge intent={intent} />
            </div>
            <div className="flex items-center gap-3 text-teal-200 text-xs mt-0.5">
              {chart.allergies[0] !== 'NKDA' && (
                <span className="flex items-center gap-1 text-red-300">
                  <AlertTriangle className="w-3 h-3" /> {chart.allergies.join(', ')}
                </span>
              )}
              {chart.conditions.length > 0 && <span>{chart.conditions.slice(0, 3).join(' \u00b7 ')}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push(`/previsit/${item.patientId || item.id}`)}
            className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 font-semibold transition-all hover:scale-105"
            style={{ background: 'rgba(255,255,255,0.95)', color: '#0C4C5E' }}>
            <FileText className="w-3.5 h-3.5" /> Full Chart
          </button>
          <button onClick={onForward} className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 text-white/90 hover:bg-white/20 transition-colors" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <Forward className="w-3.5 h-3.5" /> Forward
          </button>
          <button onClick={onReassign} className="px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 text-white/90 hover:bg-white/20 transition-colors" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <UserPlus className="w-3.5 h-3.5" /> Reassign
          </button>
        </div>
      </div>

      {/* Risk Flags */}
      {(chart.allergies[0] !== 'NKDA' || item.labType === 'critical' || item.priority === 'urgent') && (
        <div className="px-6 py-2 flex items-center gap-3 text-xs flex-shrink-0" style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
          <Shield className="w-4 h-4 text-red-500 flex-shrink-0" />
          <div className="flex flex-wrap gap-2">
            {chart.allergies[0] !== 'NKDA' && <span className="text-red-700 font-medium">Allergies: {chart.allergies.join(', ')}</span>}
            {item.labType === 'critical' && <span className="text-red-700 font-bold">CRITICAL LAB VALUE</span>}
            {chart.recentVitals.bp && chart.recentVitals.bp !== '-' && parseInt(chart.recentVitals.bp.split('/')[0]) > 140 && (
              <span className="text-red-700 font-medium">Elevated BP: {chart.recentVitals.bp}</span>
            )}
          </div>
        </div>
      )}

      {/* Two-Column Content */}
      <div className="flex-1 flex overflow-hidden" style={{ background: '#1A5C6B' }}>
        {/* LEFT: Patient Message + Chart Context */}
        <div className="w-[42%] p-5 overflow-y-auto" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Message Card */}
          <div className="rounded-2xl p-5 mb-4" style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, boxShadow: '0 1px 4px rgba(12, 53, 71, 0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: categoryConfig[item.category].accent }}>
                  {item.patientName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: '#25B8A9' }}>{item.patientName}</div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>{item.subject?.replace(/^(REQUEST|REPORT|QUESTION): /, '')}</div>
                </div>
              </div>
              <span className="text-xs" style={{ color: colors.textMuted }}>{messageTimestamp}</span>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: colors.textSecondary }}>
              {item.content}
            </div>
            {item.symptoms && item.symptoms.length > 0 && (
              <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
                <div className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: colors.accent }}>
                  <Activity className="w-3.5 h-3.5" /> Key Details
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.symptoms.map((s, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{ color: '#0C4C5E', background: colors.accentLight }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Callback */}
          {item.callbackNumber && (
            <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <Phone className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-blue-900">{item.callbackNumber}</div>
                <div className="text-xs text-blue-600">Callback requested</div>
              </div>
              <button className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                Call Now
              </button>
            </div>
          )}

          {/* Missing Elements */}
          {item.missingElements && item.missingElements.length > 0 && (
            <div className="p-3 rounded-xl mb-4" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
              <div className="text-xs font-semibold text-orange-700 mb-2">Missing Elements</div>
              {item.missingElements.map((el, i) => (
                <div key={i} className="text-xs text-orange-800 flex items-center gap-2 py-0.5">
                  <span className="text-orange-400">&#9744;</span> {el}
                </div>
              ))}
            </div>
          )}

          {/* Chart Snapshot */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.6)' }}>Chart Snapshot</div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'BP', value: chart.recentVitals.bp },
                { label: 'HR', value: chart.recentVitals.hr },
                { label: 'Temp', value: chart.recentVitals.temp },
                { label: 'Wt', value: chart.recentVitals.weight },
              ].map((v, i) => (
                <div key={i} className="text-center p-2 rounded-lg" style={{ background: colors.sectionBg }}>
                  <div className="text-[10px]" style={{ color: colors.textMuted }}>{v.label}</div>
                  <div className="text-sm font-bold" style={{ color: colors.text }}>{v.value || '\u2014'}</div>
                </div>
              ))}
            </div>

            {/* Relevant Lab History */}
            {chart.recentLabs.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <Beaker className="w-3 h-3" /> Relevant Lab History
                </div>
                <div className="space-y-1">
                  {(() => {
                    const labGroups: Record<string, typeof chart.recentLabs> = {};
                    chart.recentLabs.forEach(lab => {
                      if (!labGroups[lab.name]) labGroups[lab.name] = [];
                      labGroups[lab.name].push(lab);
                    });
                    return Object.entries(labGroups).map(([name, labs]) => {
                      const latest = labs[0];
                      const hasTrend = labs.length > 1;
                      const isAbnormal = latest.status === 'abnormal' || latest.status === 'critical';
                      return (
                        <div key={name} className={`p-2 rounded-lg text-xs ${
                          latest.status === 'critical' ? 'bg-red-50 border border-red-200' :
                          isAbnormal ? 'bg-amber-50 border border-amber-200' :
                          ''
                        }`} style={!isAbnormal && latest.status !== 'critical' ? { background: colors.sectionBg, border: `1px solid ${colors.border}` } : undefined}>
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold ${
                              latest.status === 'critical' ? 'text-red-700' :
                              isAbnormal ? 'text-amber-700' : ''
                            }`} style={!isAbnormal && latest.status !== 'critical' ? { color: colors.textSecondary } : undefined}>{name}</span>
                            <span className={`font-bold ${
                              latest.status === 'critical' ? 'text-red-700' :
                              isAbnormal ? 'text-amber-700' : ''
                            }`} style={!isAbnormal && latest.status !== 'critical' ? { color: colors.text } : undefined}>
                              {latest.value} {latest.unit}
                              {isAbnormal && latest.status === 'critical' ? ' !!!' : isAbnormal ? ' *' : ''}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span style={{ color: colors.textMuted }}>Ref: {latest.referenceRange}</span>
                            <span style={{ color: colors.textMuted }}>{new Date(latest.collectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          {hasTrend && (
                            <div className="mt-1 pt-1" style={{ borderTop: `1px solid ${colors.border}` }}>
                              <div className="flex items-center gap-1 text-[10px]" style={{ color: colors.textMuted }}>
                                <Clock className="w-2.5 h-2.5" />
                                Trend: {labs.map((l, i) => (
                                  <span key={l.id}>
                                    {i > 0 && ' \u2192 '}
                                    <span className={l.status === 'abnormal' ? 'font-semibold text-amber-600' : ''}>
                                      {l.value} ({new Date(l.collectedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })})
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {chart.medications.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <Pill className="w-3 h-3" /> Medications
                </div>
                {chart.medications.slice(0, 6).map((med, i) => (
                  <div key={i} className="text-xs py-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span className="font-medium text-white">{med.name}</span> {med.dose} {med.frequency}
                  </div>
                ))}
              </div>
            )}
            <div className="text-xs flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <Clock className="w-3 h-3" />
              Last visit: {chart.lastVisit.date} &mdash; {chart.lastVisit.reason}
            </div>
          </div>
        </div>

        {/* RIGHT: AI Actions + Response Composer */}
        <div className="w-[58%] flex flex-col overflow-hidden">
          {/* AI-Pended Actions */}
          {pendedActions.length > 0 && (
            <div className="p-4 flex-shrink-0 overflow-y-auto" style={{ maxHeight: '40%', borderBottom: '2px solid #c8a44e' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" style={{ color: '#c8a44e' }} />
                  <span className="text-sm font-bold text-white">AI-Pended Actions</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(200, 164, 78, 0.2)', color: '#c8a44e' }}>
                    {enabledActions.length} active
                  </span>
                </div>
                <button onClick={regenerateDrafts}
                  className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: '#7dd3c8' }}
                  disabled={isRegenerating}>
                  <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Enabled actions */}
              <div className="space-y-1.5 mb-2">
                {enabledActions.map(action => {
                  const Icon = action.icon;
                  return (
                    <div key={action.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
                      style={{ background: colors.accentLight, border: '1px solid rgba(26, 143, 168, 0.2)' }}>
                      <button onClick={() => toggleAction(action.id)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-colors"
                        style={{ background: colors.accent }}>
                        <Check className="w-3.5 h-3.5 text-white" />
                      </button>
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: colors.accent }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold" style={{ color: colors.text }}>{action.title}</div>
                        <div className="text-[10px]" style={{ color: colors.textMuted }}>{action.detail}</div>
                      </div>
                      <ConfidenceBadge confidence={action.confidence} />
                    </div>
                  );
                })}
              </div>

              {/* Disabled (suggested but not enabled) */}
              {disabledActions.length > 0 && (
                <>
                  <div className="text-[10px] font-medium uppercase tracking-wider mb-1.5 mt-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Also Available
                  </div>
                  <div className="space-y-1.5">
                    {visibleDisabled.map(action => {
                      const Icon = action.icon;
                      return (
                        <div key={action.id}
                          className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <button onClick={() => toggleAction(action.id)}
                            className="w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                            style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                            <Plus className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.4)' }} />
                          </button>
                          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{action.title}</div>
                            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{action.detail}</div>
                          </div>
                          <ConfidenceBadge confidence={action.confidence} />
                        </div>
                      );
                    })}
                  </div>
                  {disabledActions.length > 2 && (
                    <button onClick={() => setShowAllActions(!showAllActions)}
                      className="flex items-center gap-1 text-[11px] font-medium mt-2"
                      style={{ color: '#7dd3c8' }}>
                      {showAllActions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showAllActions ? 'Show less' : `+${disabledActions.length - 2} more suggestions`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Response Composer */}
          <div className="flex-1 flex flex-col p-4 overflow-y-auto" style={{ borderTop: pendedActions.length === 0 ? 'none' : undefined }}>
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <Edit3 className="w-4 h-4" style={{ color: '#c8a44e' }} />
              <span className="text-sm font-bold text-white">
                {responseAudience === 'staff' ? 'Staff Instructions' :
                 item.category === 'messages' ? 'Reply to Patient' :
                 item.category === 'phone' ? 'Call Notes' :
                 item.category === 'refills' ? 'Refill Decision' :
                 item.category === 'incomplete' ? 'Complete Chart' :
                 'Response'}
              </span>

              {/* Severity badge from AI */}
              {aiSeverity !== 'routine' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: aiSeverity === 'emergent' ? '#fecaca' : aiSeverity === 'urgent' ? '#fed7aa' : '#fef3c7',
                    color: aiSeverity === 'emergent' ? '#991b1b' : aiSeverity === 'urgent' ? '#9a3412' : '#92400e',
                  }}>
                  {aiSeverity.toUpperCase()}
                </span>
              )}

              <div className="flex-1" />
              <button onClick={() => { setResponse(drafts.find(d => d.id === selectedDraftId)?.content || ''); setIsEditing(false); }}
                className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }} title="Reset">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleCopy}
                className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }} title="Copy">
                {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Audience Toggle: Patient vs Staff */}
            <div className="flex gap-1 mb-3 flex-shrink-0 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => {
                  setResponseAudience('patient');
                  if (drafts.length > 0) {
                    const first = drafts[0];
                    setSelectedDraftId(first.id);
                    setResponse(first.content);
                    setIsEditing(false);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={responseAudience === 'patient'
                  ? { background: colors.accent, color: 'white' }
                  : { color: 'rgba(255,255,255,0.5)' }
                }>
                <Send className="w-3 h-3" />
                Patient Response
              </button>
              <button
                onClick={() => {
                  setResponseAudience('staff');
                  if (staffDraft) {
                    setSelectedDraftId(staffDraft.id);
                    setResponse(staffDraft.content);
                    setIsEditing(false);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={responseAudience === 'staff'
                  ? { background: '#e07a5f', color: 'white' }
                  : { color: 'rgba(255,255,255,0.5)' }
                }>
                <Users className="w-3 h-3" />
                Staff / Triage
                {staffInstruction && staffInstruction.priority !== 'routine' && (
                  <span className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: staffInstruction.priority === 'emergent' ? '#ef4444' : staffInstruction.priority === 'urgent' ? '#f97316' : '#eab308' }} />
                )}
              </button>
            </div>

            {/* Alternative response tabs (patient drafts) */}
            {responseAudience === 'patient' && drafts.length > 1 && (
              <div className="flex gap-1.5 mb-3 flex-shrink-0 overflow-x-auto pb-1">
                {drafts.map(draft => (
                  <button key={draft.id} onClick={() => selectDraft(draft)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                    style={selectedDraftId === draft.id
                      ? { background: colors.accent, color: 'white' }
                      : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }
                    }>
                    {selectedDraftId === draft.id && <CheckCircle className="w-3 h-3" />}
                    {draft.label}
                    <span className="text-[9px]" style={{ color: selectedDraftId === draft.id ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)' }}>
                      {draft.tone}
                    </span>
                  </button>
                ))}
                <button onClick={regenerateDrafts}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                  style={{ background: 'rgba(200,164,78,0.15)', color: '#c8a44e' }}
                  disabled={isRegenerating}>
                  <Sparkles className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
              </div>
            )}

            {/* Staff instruction summary card (shown when staff tab active) */}
            {responseAudience === 'staff' && staffInstruction && (
              <div className="flex items-center gap-3 mb-3 p-2.5 rounded-xl flex-shrink-0"
                style={{ background: 'rgba(224, 122, 95, 0.1)', border: '1px solid rgba(224, 122, 95, 0.25)' }}>
                <div className="flex items-center gap-2 flex-1 text-xs">
                  <span className="px-2 py-0.5 rounded-full font-bold text-white"
                    style={{ background: staffInstruction.assignTo === 'RN' ? '#e07a5f' : staffInstruction.assignTo === 'MA' ? '#c8a44e' : '#1A8FA8' }}>
                    {staffInstruction.assignTo}
                  </span>
                  <span className="font-medium text-white">{staffInstruction.action}</span>
                </div>
                {staffInstruction.schedulingGuidance && (
                  <div className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <Calendar className="w-3 h-3" />
                    {staffInstruction.schedulingGuidance.length > 60
                      ? staffInstruction.schedulingGuidance.slice(0, 57) + '...'
                      : staffInstruction.schedulingGuidance}
                  </div>
                )}
              </div>
            )}

            {/* AI draft label */}
            {!isEditing && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg flex-shrink-0"
                style={{ background: 'rgba(200, 164, 78, 0.1)' }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#c8a44e' }} />
                <span className="text-xs font-medium" style={{ color: '#c8a44e' }}>AI-generated draft &mdash; click to edit</span>
              </div>
            )}

            {/* Response Textarea */}
            <div className="relative">
              <textarea
                ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                value={response}
                onChange={(e) => { setResponse(e.target.value); setIsEditing(true); }}
                onFocus={() => setIsEditing(true)}
                className="w-full p-4 rounded-xl text-sm leading-relaxed resize-none transition-all"
                style={{
                  border: isEditing ? '2px solid #25B8A9' : '2px solid rgba(255,255,255,0.1)',
                  background: isEditing ? '#FFFFFF' : '#F0FAF9',
                  outline: 'none', color: '#0C3547',
                }}
                placeholder="Your response will appear here..."
              />
            </div>

            {/* Edited notice */}
            {isEditing && response !== (drafts.find(d => d.id === selectedDraftId)?.content || '') && (
              <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: 'rgba(200,164,78,0.1)' }}>
                <Edit3 className="w-3.5 h-3.5" style={{ color: '#c8a44e' }} />
                <span className="text-xs font-medium" style={{ color: '#c8a44e' }}>Modified from AI draft</span>
              </div>
            )}

            {/* Action summary + Send */}
            <div className="flex items-center justify-between mt-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                {enabledActions.length > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                    style={{ background: 'rgba(37,184,169,0.15)', color: '#7dd3c8' }}>
                    <ClipboardList className="w-3 h-3" />
                    {enabledActions.length} action{enabledActions.length > 1 ? 's' : ''} will be pended
                  </span>
                )}
                {aiReasoning && (
                  <span className="text-[10px] italic" style={{ color: 'rgba(255,255,255,0.35)' }} title={aiReasoning}>
                    AI: {aiReasoning.length > 50 ? aiReasoning.slice(0, 47) + '...' : aiReasoning}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {responseAudience === 'patient' && item.category === 'messages' && (
                  <button className="px-3 py-2 text-xs rounded-xl font-medium transition-colors flex items-center gap-1.5"
                    style={{ color: '#7dd3c8', border: '1px solid rgba(125,211,200,0.3)' }}>
                    <Stethoscope className="w-3.5 h-3.5" /> Schedule Visit
                  </button>
                )}
                {responseAudience === 'staff' ? (
                  <button onClick={handleSend} disabled={!response.trim()}
                    className="px-5 py-2 text-sm text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:shadow-lg hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ background: response.trim() ? 'linear-gradient(135deg, #e07a5f 0%, #c97a5f 100%)' : 'rgba(255,255,255,0.1)' }}>
                    <Users className="w-4 h-4" />
                    Send to {staffInstruction?.assignTo || 'Staff'}
                  </button>
                ) : (
                  <button onClick={handleSend} disabled={!response.trim()}
                    className="px-5 py-2 text-sm text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:shadow-lg hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ background: response.trim() ? 'linear-gradient(135deg, #1A8FA8 0%, #25B8A9 100%)' : 'rgba(255,255,255,0.1)' }}>
                    {item.category === 'messages' ? <Send className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    {item.category === 'messages' ? 'Send Reply' :
                     item.category === 'refills' ? 'Approve & Send' :
                     item.category === 'incomplete' ? 'Sign & Close' :
                     item.category === 'encounters' ? 'Start Visit' :
                     'Complete'}
                    {enabledActions.length > 0 && ` + ${enabledActions.length} Orders`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpandedPanel;
