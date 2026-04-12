// ============================================================
// COMPASS — Symptom-Specific Follow-Up Questions
// Complaint-aware question modules that fire after the standard
// HPI (OLDCARTS) phases to gather clinically relevant detail
// ============================================================

import type { QuickReply } from '@attending/shared/types/chat.types';

// ============================================================
// Types
// ============================================================

export interface SymptomFollowUp {
  id: string;
  question: string;
  quickReplies: QuickReply[];
  dataKey: string; // stored in symptomSpecificAnswers[dataKey]
}

export interface SymptomModule {
  id: string;
  label: string; // display name, e.g. "Knee Pain Assessment"
  triggerPatterns: RegExp[];
  questions: SymptomFollowUp[];
}

// ============================================================
// Module Registry
// ============================================================

const SYMPTOM_MODULES: SymptomModule[] = [
  // ---- KNEE PAIN ----
  {
    id: 'knee_pain',
    label: 'Knee Assessment',
    triggerPatterns: [/knee/i],
    questions: [
      {
        id: 'knee_mechanism',
        question: 'Was there a specific injury or event? If so, what happened?',
        dataKey: 'knee_mechanism',
        quickReplies: [
          { id: 'km_twist', text: 'Twisting injury', value: 'Twisting injury', multiSelect: false },
          { id: 'km_direct', text: 'Direct blow/impact', value: 'Direct blow or impact', multiSelect: false },
          { id: 'km_fall', text: 'Fall', value: 'Fall', multiSelect: false },
          { id: 'km_none', text: 'No specific injury', value: 'No specific injury — gradual onset', multiSelect: false },
        ],
      },
      {
        id: 'knee_weight_bearing',
        question: 'Can you put weight on it and walk normally?',
        dataKey: 'knee_weight_bearing',
        quickReplies: [
          { id: 'kw_normal', text: 'Yes, normal walking', value: 'Normal weight-bearing' },
          { id: 'kw_limp', text: 'Yes, but with a limp', value: 'Weight-bearing with limp' },
          { id: 'kw_difficult', text: 'Very difficult', value: 'Difficulty weight-bearing' },
          { id: 'kw_unable', text: 'Cannot bear weight', value: 'Unable to bear weight', variant: 'warning' },
        ],
      },
      {
        id: 'knee_locking',
        question: 'Does your knee lock, catch, or give way (buckle)?',
        dataKey: 'knee_locking',
        quickReplies: [
          { id: 'kl_lock', text: 'Locks/catches', value: 'Locking or catching', multiSelect: true },
          { id: 'kl_gives', text: 'Gives way/buckles', value: 'Giving way or buckling', multiSelect: true },
          { id: 'kl_click', text: 'Clicking/popping', value: 'Clicking or popping', multiSelect: true },
          { id: 'kl_none', text: 'None of these', value: 'No mechanical symptoms' },
        ],
      },
      {
        id: 'knee_location',
        question: 'Where on the knee is the pain worst?',
        dataKey: 'knee_pain_location',
        quickReplies: [
          { id: 'kp_medial', text: 'Inside (medial)', value: 'Medial knee' },
          { id: 'kp_lateral', text: 'Outside (lateral)', value: 'Lateral knee' },
          { id: 'kp_anterior', text: 'Front/kneecap', value: 'Anterior/patellofemoral' },
          { id: 'kp_posterior', text: 'Behind the knee', value: 'Posterior knee' },
        ],
      },
    ],
  },

  // ---- CHEST PAIN ----
  {
    id: 'chest_pain',
    label: 'Chest Pain Assessment',
    triggerPatterns: [/chest\s*(pain|pressure|tightness|heaviness|discomfort)/i],
    questions: [
      {
        id: 'chest_radiation',
        question: 'Does the pain spread (radiate) anywhere else?',
        dataKey: 'chest_radiation',
        quickReplies: [
          { id: 'cr_arm', text: 'Left arm', value: 'Radiates to left arm', variant: 'warning', multiSelect: true },
          { id: 'cr_jaw', text: 'Jaw/neck', value: 'Radiates to jaw or neck', variant: 'warning', multiSelect: true },
          { id: 'cr_back', text: 'Back', value: 'Radiates to back', variant: 'warning', multiSelect: true },
          { id: 'cr_none', text: 'Stays in one place', value: 'No radiation' },
        ],
      },
      {
        id: 'chest_exertional',
        question: 'Does it come on with physical activity or exertion?',
        dataKey: 'chest_exertional',
        quickReplies: [
          { id: 'ce_yes', text: 'Yes, with exertion', value: 'Exertional — occurs with activity', variant: 'warning' },
          { id: 'ce_rest', text: 'Happens at rest too', value: 'Occurs at rest', variant: 'danger' },
          { id: 'ce_position', text: 'Related to position', value: 'Positional — changes with body position' },
          { id: 'ce_no', text: 'No clear trigger', value: 'No exertional component' },
        ],
      },
      {
        id: 'chest_associated',
        question: 'Are you experiencing any of these right now?',
        dataKey: 'chest_associated_sx',
        quickReplies: [
          { id: 'ca_sweat', text: 'Sweating', value: 'Diaphoresis', variant: 'warning', multiSelect: true },
          { id: 'ca_nausea', text: 'Nausea/vomiting', value: 'Nausea or vomiting', multiSelect: true },
          { id: 'ca_sob', text: 'Short of breath', value: 'Shortness of breath', variant: 'warning', multiSelect: true },
          { id: 'ca_none', text: 'None of these', value: 'No acute associated symptoms' },
        ],
      },
    ],
  },

  // ---- ABDOMINAL PAIN ----
  {
    id: 'abdominal_pain',
    label: 'Abdominal Assessment',
    triggerPatterns: [/abdomen|abdominal|stomach\s*pain|belly\s*pain|tummy/i],
    questions: [
      {
        id: 'abd_quadrant',
        question: 'Where in your abdomen is the pain?',
        dataKey: 'abd_quadrant',
        quickReplies: [
          { id: 'aq_ruq', text: 'Upper right', value: 'Right upper quadrant' },
          { id: 'aq_luq', text: 'Upper left', value: 'Left upper quadrant' },
          { id: 'aq_rlq', text: 'Lower right', value: 'Right lower quadrant' },
          { id: 'aq_llq', text: 'Lower left', value: 'Left lower quadrant' },
        ],
      },
      {
        id: 'abd_meals',
        question: 'Is the pain related to eating?',
        dataKey: 'abd_meal_relation',
        quickReplies: [
          { id: 'am_worse', text: 'Worse after eating', value: 'Worse after meals' },
          { id: 'am_better', text: 'Better after eating', value: 'Improves with eating' },
          { id: 'am_empty', text: 'Worse on empty stomach', value: 'Worse when fasting' },
          { id: 'am_none', text: 'Not related to food', value: 'No relation to meals' },
        ],
      },
      {
        id: 'abd_bowel',
        question: 'Any changes in bowel habits?',
        dataKey: 'abd_bowel_changes',
        quickReplies: [
          { id: 'ab_diarrhea', text: 'Diarrhea', value: 'Diarrhea', multiSelect: true },
          { id: 'ab_constip', text: 'Constipation', value: 'Constipation', multiSelect: true },
          { id: 'ab_blood', text: 'Blood in stool', value: 'Blood in stool', variant: 'warning', multiSelect: true },
          { id: 'ab_normal', text: 'Normal bowel habits', value: 'No bowel changes' },
        ],
      },
      {
        id: 'abd_lmp',
        question: 'For those who menstruate: when was your last menstrual period?',
        dataKey: 'abd_lmp',
        quickReplies: [
          { id: 'al_current', text: 'Currently on period', value: 'Currently menstruating' },
          { id: 'al_recent', text: 'Within last month', value: 'Last period within 30 days' },
          { id: 'al_late', text: 'Period is late', value: 'Period is late or missed', variant: 'warning' },
          { id: 'al_na', text: 'Not applicable', value: 'N/A' },
        ],
      },
    ],
  },

  // ---- HEADACHE ----
  {
    id: 'headache',
    label: 'Headache Assessment',
    triggerPatterns: [/headache|head\s*pain|migraine|cephalgia/i],
    questions: [
      {
        id: 'ha_worst_ever',
        question: 'Is this the worst headache of your life?',
        dataKey: 'headache_worst_ever',
        quickReplies: [
          { id: 'hw_yes', text: 'Yes, worst ever', value: 'Worst headache of life', variant: 'danger' },
          { id: 'hw_bad', text: 'Very bad, but not worst', value: 'Severe but not worst ever' },
          { id: 'hw_typical', text: 'Similar to past headaches', value: 'Typical pattern for this patient' },
        ],
      },
      {
        id: 'ha_aura',
        question: 'Any visual changes, flashing lights, or blind spots before or during the headache?',
        dataKey: 'headache_aura',
        quickReplies: [
          { id: 'hau_visual', text: 'Visual changes', value: 'Visual aura present', multiSelect: true },
          { id: 'hau_numb', text: 'Numbness/tingling', value: 'Sensory aura', multiSelect: true },
          { id: 'hau_speech', text: 'Speech difficulty', value: 'Speech disturbance', variant: 'warning', multiSelect: true },
          { id: 'hau_none', text: 'No aura symptoms', value: 'No aura' },
        ],
      },
      {
        id: 'ha_neck',
        question: 'Any neck stiffness, fever, or sensitivity to light?',
        dataKey: 'headache_meningeal',
        quickReplies: [
          { id: 'hn_neck', text: 'Stiff neck', value: 'Neck stiffness', variant: 'warning', multiSelect: true },
          { id: 'hn_fever', text: 'Fever', value: 'Fever present', variant: 'warning', multiSelect: true },
          { id: 'hn_light', text: 'Light sensitivity', value: 'Photophobia', multiSelect: true },
          { id: 'hn_none', text: 'None of these', value: 'No meningeal signs' },
        ],
      },
    ],
  },

  // ---- BACK PAIN ----
  {
    id: 'back_pain',
    label: 'Back Pain Assessment',
    triggerPatterns: [/back\s*pain|lower\s*back|lumbar|lumbago|sciatica/i],
    questions: [
      {
        id: 'bp_radiation',
        question: 'Does the pain shoot down into your leg(s)?',
        dataKey: 'back_leg_radiation',
        quickReplies: [
          { id: 'br_left', text: 'Yes, left leg', value: 'Radiates to left leg' },
          { id: 'br_right', text: 'Yes, right leg', value: 'Radiates to right leg' },
          { id: 'br_both', text: 'Both legs', value: 'Bilateral leg radiation', variant: 'warning' },
          { id: 'br_no', text: 'No leg symptoms', value: 'No radiculopathy' },
        ],
      },
      {
        id: 'bp_neuro',
        question: 'Any numbness, tingling, or weakness in your legs?',
        dataKey: 'back_neuro',
        quickReplies: [
          { id: 'bn_numb', text: 'Numbness/tingling', value: 'Numbness or tingling present', multiSelect: true },
          { id: 'bn_weak', text: 'Leg weakness', value: 'Weakness present', variant: 'warning', multiSelect: true },
          { id: 'bn_foot', text: 'Foot drop', value: 'Foot drop', variant: 'danger', multiSelect: true },
          { id: 'bn_none', text: 'No neurological symptoms', value: 'No neurological deficits' },
        ],
      },
      {
        id: 'bp_bladder',
        question: 'Any difficulty with bladder or bowel control?',
        dataKey: 'back_bladder_bowel',
        quickReplies: [
          { id: 'bb_yes', text: 'Yes, having difficulty', value: 'Bladder or bowel dysfunction', variant: 'danger' },
          { id: 'bb_saddle', text: 'Numbness in groin/saddle area', value: 'Saddle anesthesia', variant: 'danger' },
          { id: 'bb_no', text: 'No — all normal', value: 'Normal bladder and bowel function' },
        ],
      },
    ],
  },

  // ---- SHORTNESS OF BREATH ----
  {
    id: 'sob',
    label: 'Respiratory Assessment',
    triggerPatterns: [/shortness\s*of\s*breath|can'?t\s*breathe|difficulty\s*breathing|dyspnea|breathless|SOB|winded/i],
    questions: [
      {
        id: 'sob_onset',
        question: 'Is the shortness of breath at rest or only with activity?',
        dataKey: 'sob_exertional',
        quickReplies: [
          { id: 'so_rest', text: 'At rest', value: 'Dyspnea at rest', variant: 'danger' },
          { id: 'so_mild', text: 'With mild activity', value: 'Dyspnea with mild exertion', variant: 'warning' },
          { id: 'so_moderate', text: 'With moderate activity', value: 'Dyspnea with moderate exertion' },
          { id: 'so_heavy', text: 'Only with heavy exertion', value: 'Dyspnea with strenuous exertion only' },
        ],
      },
      {
        id: 'sob_orthopnea',
        question: 'Do you need to prop up on pillows to breathe at night, or wake up gasping?',
        dataKey: 'sob_orthopnea',
        quickReplies: [
          { id: 'sop_pillows', text: 'Need extra pillows', value: 'Orthopnea present', variant: 'warning' },
          { id: 'sop_pnd', text: 'Wake up gasping', value: 'Paroxysmal nocturnal dyspnea', variant: 'warning' },
          { id: 'sop_no', text: 'No — sleep flat fine', value: 'No orthopnea or PND' },
        ],
      },
      {
        id: 'sob_legs',
        question: 'Any leg swelling or calf pain?',
        dataKey: 'sob_leg_symptoms',
        quickReplies: [
          { id: 'sl_swelling', text: 'Leg swelling', value: 'Leg edema present', variant: 'warning' },
          { id: 'sl_calf', text: 'Calf pain/tenderness', value: 'Calf pain — consider DVT/PE', variant: 'warning' },
          { id: 'sl_no', text: 'No leg symptoms', value: 'No lower extremity symptoms' },
        ],
      },
    ],
  },

  // ---- COUGH ----
  {
    id: 'cough',
    label: 'Cough Assessment',
    triggerPatterns: [/cough|coughing/i],
    questions: [
      {
        id: 'cough_productive',
        question: 'Are you coughing anything up?',
        dataKey: 'cough_productive',
        quickReplies: [
          { id: 'cp_dry', text: 'Dry cough', value: 'Non-productive dry cough' },
          { id: 'cp_clear', text: 'Clear mucus', value: 'Productive with clear sputum' },
          { id: 'cp_yellow', text: 'Yellow/green mucus', value: 'Productive with purulent sputum', variant: 'warning' },
          { id: 'cp_blood', text: 'Blood in mucus', value: 'Hemoptysis', variant: 'danger' },
        ],
      },
      {
        id: 'cough_duration',
        question: 'How long have you had the cough?',
        dataKey: 'cough_duration_detail',
        quickReplies: [
          { id: 'cd_days', text: 'A few days', value: 'Acute — days' },
          { id: 'cd_weeks', text: '1-3 weeks', value: 'Subacute — 1 to 3 weeks' },
          { id: 'cd_chronic', text: 'More than 3 weeks', value: 'Chronic — greater than 3 weeks' },
          { id: 'cd_months', text: 'Months', value: 'Chronic — months duration' },
        ],
      },
    ],
  },

  // ---- SORE THROAT ----
  {
    id: 'sore_throat',
    label: 'Sore Throat Assessment',
    triggerPatterns: [/sore\s*throat|throat\s*pain|pharyngitis|tonsilitis|difficulty\s*swallowing|odynophagia/i],
    questions: [
      {
        id: 'st_swallowing',
        question: 'How is your swallowing?',
        dataKey: 'throat_swallowing',
        quickReplies: [
          { id: 'ts_painful', text: 'Painful but possible', value: 'Odynophagia — painful swallowing' },
          { id: 'ts_difficult', text: 'Very difficult to swallow', value: 'Dysphagia — difficulty swallowing', variant: 'warning' },
          { id: 'ts_drool', text: 'Drooling/cannot swallow', value: 'Unable to swallow — drooling', variant: 'danger' },
          { id: 'ts_ok', text: 'Swallowing is fine', value: 'No dysphagia' },
        ],
      },
      {
        id: 'st_voice',
        question: 'Any voice changes or muffled/"hot potato" voice?',
        dataKey: 'throat_voice',
        quickReplies: [
          { id: 'tv_muffled', text: 'Muffled/hot potato', value: 'Muffled voice — consider peritonsillar abscess', variant: 'warning' },
          { id: 'tv_hoarse', text: 'Hoarse', value: 'Hoarseness' },
          { id: 'tv_normal', text: 'Voice is normal', value: 'No voice changes' },
        ],
      },
    ],
  },

  // ---- UTI SYMPTOMS ----
  {
    id: 'uti',
    label: 'Urinary Assessment',
    triggerPatterns: [/urin|burn.*pee|painful.*urinat|uti|bladder|dysuria|frequency|urgency.*urin/i],
    questions: [
      {
        id: 'uti_symptoms',
        question: 'Which urinary symptoms are you experiencing?',
        dataKey: 'uti_symptoms',
        quickReplies: [
          { id: 'us_burn', text: 'Burning with urination', value: 'Dysuria', multiSelect: true },
          { id: 'us_freq', text: 'Going very often', value: 'Urinary frequency', multiSelect: true },
          { id: 'us_urg', text: 'Sudden strong urges', value: 'Urinary urgency', multiSelect: true },
          { id: 'us_blood', text: 'Blood in urine', value: 'Hematuria', variant: 'warning', multiSelect: true },
        ],
      },
      {
        id: 'uti_flank',
        question: 'Any back/flank pain or fever?',
        dataKey: 'uti_upper_tract',
        quickReplies: [
          { id: 'uf_flank', text: 'Flank/back pain', value: 'Flank pain — consider pyelonephritis', variant: 'warning' },
          { id: 'uf_fever', text: 'Fever/chills', value: 'Fever present — consider upper tract infection', variant: 'warning' },
          { id: 'uf_no', text: 'No — just lower symptoms', value: 'No upper tract symptoms' },
        ],
      },
    ],
  },

  // ---- DEPRESSION / ANXIETY ----
  {
    id: 'mental_health',
    label: 'Mental Health Assessment',
    triggerPatterns: [/depress|anxiety|anxious|panic|mood|sad|hopeless|worried|nervous|stress|mental\s*health/i],
    questions: [
      {
        id: 'mh_duration',
        question: 'How long have you been feeling this way?',
        dataKey: 'mh_duration',
        quickReplies: [
          { id: 'md_days', text: 'Days', value: 'Days' },
          { id: 'md_weeks', text: 'Weeks', value: 'Weeks' },
          { id: 'md_months', text: 'Months', value: 'Months' },
          { id: 'md_ongoing', text: 'Long-standing', value: 'Chronic — long-standing' },
        ],
      },
      {
        id: 'mh_sleep',
        question: 'How is your sleep and appetite?',
        dataKey: 'mh_neurovegetative',
        quickReplies: [
          { id: 'mn_insomnia', text: 'Trouble sleeping', value: 'Insomnia', multiSelect: true },
          { id: 'mn_hypersomnia', text: 'Sleeping too much', value: 'Hypersomnia', multiSelect: true },
          { id: 'mn_appetite_down', text: 'Low appetite', value: 'Decreased appetite', multiSelect: true },
          { id: 'mn_ok', text: 'Sleep and appetite are OK', value: 'No neurovegetative changes' },
        ],
      },
      {
        id: 'mh_safety',
        question: 'Have you had any thoughts of harming yourself or not wanting to be alive?',
        dataKey: 'mh_safety',
        quickReplies: [
          { id: 'ms_no', text: 'No', value: 'Denies suicidal ideation' },
          { id: 'ms_passive', text: 'Passive thoughts ("wish I wasn\'t here")', value: 'Passive suicidal ideation — no plan', variant: 'warning' },
          { id: 'ms_active', text: 'Active thoughts or plan', value: 'Active suicidal ideation', variant: 'danger' },
        ],
      },
    ],
  },
];

// ============================================================
// Lookup
// ============================================================

export function getSymptomModule(chiefComplaint: string): SymptomModule | null {
  if (!chiefComplaint) return null;
  const cc = chiefComplaint.toLowerCase();
  return SYMPTOM_MODULES.find(module =>
    module.triggerPatterns.some(pattern => pattern.test(cc))
  ) || null;
}

export function getAllModuleIds(): string[] {
  return SYMPTOM_MODULES.map(m => m.id);
}
