/**
 * Pre-recorded EMS transcript for demo mode.
 * Simulates a cardiac emergency call with realistic timing.
 * Each entry plays back at its delay (ms) from start.
 */
export const DEMO_EMS_TRANSCRIPT = [
  {
    delay: 0,
    timestamp: '14:02',
    text: 'Dispatch, Medic-7 responding to 425 Oak Street apartment 3B for a 45-year-old female, possible cardiac event.'
  },
  {
    delay: 3000,
    timestamp: '14:02',
    text: 'Copy that Medic-7, caller reports patient is conscious, complaining of chest pain, diaphoretic.'
  },
  {
    delay: 8000,
    timestamp: '14:05',
    text: 'On scene. Patient is Maria Santos, 45 years old, sitting upright on the couch, alert and oriented times three.'
  },
  {
    delay: 12000,
    timestamp: '14:05',
    text: 'She reports crushing substernal chest pain radiating to her left arm, started about 40 minutes ago while watching TV. She looks diaphoretic.'
  },
  {
    delay: 17000,
    timestamp: '14:06',
    text: 'History of hypertension and type 2 diabetes. Takes metformin and lisinopril daily. No known drug allergies.'
  },
  {
    delay: 22000,
    timestamp: '14:08',
    text: 'Initial vitals blood pressure 182 over 98, heart rate 102, respiratory rate 22, SpO2 94 percent on room air, GCS 15. Pain is 8 out of 10.'
  },
  {
    delay: 28000,
    timestamp: '14:10',
    text: 'Starting IV access right antecubital 18 gauge, good flow. Applying 4 liters nasal cannula. Cardiac monitor on, sinus tach no ST changes visible on the monitor.'
  },
  {
    delay: 35000,
    timestamp: '14:11',
    text: 'Getting a 12-lead now. Administering aspirin 324 milligrams chewed and nitroglycerin 0.4 milligrams sublingual.'
  },
  {
    delay: 42000,
    timestamp: '14:14',
    text: 'Patient tolerating nitro well. ECG shows some ST depression in leads V4 through V6. Will transmit to receiving facility.'
  },
  {
    delay: 50000,
    timestamp: '14:18',
    text: 'Second set of vitals blood pressure 168 over 92, heart rate 94, respiratory rate 20, SpO2 97 on 4 liters. Patient reports pain decreasing from 8 to 5 out of 10 after nitro.'
  },
  {
    delay: 58000,
    timestamp: '14:20',
    text: 'Loading patient for transport to Demo General Hospital. ETA approximately 8 minutes. Patient hemodynamically stable and improving.'
  },
];

/**
 * Respiratory distress demo transcript.
 */
export const DEMO_RESPIRATORY_TRANSCRIPT = [
  {
    delay: 0,
    timestamp: '13:35',
    text: 'Dispatch, Medic-3 responding to 789 Elm Drive for a 30-year-old male with breathing problems.'
  },
  {
    delay: 5000,
    timestamp: '13:38',
    text: 'On scene, patient is James Chen, found sitting upright in tripod position on living room floor. Audible wheezing from the doorway.'
  },
  {
    delay: 10000,
    timestamp: '13:38',
    text: 'He says he cannot catch his breath, started about 20 minutes ago. Known asthmatic, has been using his rescue inhaler but no relief.'
  },
  {
    delay: 16000,
    timestamp: '13:39',
    text: 'Vitals blood pressure 148 over 88, heart rate 118, respiratory rate 32, SpO2 88 percent on room air.'
  },
  {
    delay: 22000,
    timestamp: '13:40',
    text: 'Applying high flow oxygen 15 liters non-rebreather. Setting up nebulizer with albuterol 2.5 milligrams and ipratropium 0.5 milligrams.'
  },
  {
    delay: 30000,
    timestamp: '13:42',
    text: 'IV access established 20 gauge left hand. Neb treatment running. After neb, air movement improving. Still diffuse wheezing but less accessory muscle use.'
  },
  {
    delay: 38000,
    timestamp: '13:50',
    text: 'Administering methylprednisolone 125 milligrams IV push. Second vitals BP 138 over 82, heart rate 108, respiratory rate 26, SpO2 improving to 93 percent on high flow.'
  },
  {
    delay: 45000,
    timestamp: '13:52',
    text: 'Transporting to Demo General. Patient condition improving but still in moderate respiratory distress.'
  },
];
