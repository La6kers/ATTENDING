// Enhanced Clinical Data Model with Comprehensive Mock Data
const clinicalMessages = [
    // Critical Messages
    {
        id: 1,
        priority: 10,
        type: 'phone',
        patient: 'Maria Rodriguez',
        patientId: 'MR-2024-001',
        age: 45,
        gender: 'F',
        avatar: 'MR',
        time: '2 min ago',
        absoluteTime: '2025-01-07 09:43 AM',
        unread: true,
        preview: 'Severe chest pain radiating to left arm, SOB, diaphoresis. Started 30 min ago.',
        fullMessage: `Dr. Chen, I'm experiencing severe chest pain that started about 30 minutes ago. It feels like crushing pressure in the center of my chest and it's radiating down my left arm. I'm also feeling very short of breath and I'm sweating profusely. The pain is 9/10 and getting worse. I took an aspirin like you told me to keep on hand, but it hasn't helped. I'm really scared - should I call 911 or can you see me right away? My husband is here and can drive me.`,
        criticalFactors: ['Chest pain', 'Radiation to arm', 'SOB', 'Diaphoresis', 'Pain 9/10'],
        vitals: { 
            bp: '168/95', 
            hr: '118', 
            o2: '91%', 
            temp: '98.6°F',
            rr: '24'
        },
        pmh: ['HTN', 'T2DM', 'Hyperlipidemia', 'Family Hx CAD', 'Former smoker'],
        medications: [
            'Metformin 1000mg BID',
            'Lisinopril 20mg daily',
            'Atorvastatin 40mg HS',
            'Aspirin 81mg daily'
        ],
        allergies: ['Penicillin - rash'],
        lastVisit: '2 weeks ago - BP check',
        clinicalGuidelines: [
            'ACC/AHA: Immediate ED evaluation for suspected ACS',
            'TIMI Risk Score: 5/7 - High risk features present',
            'Door-to-balloon time critical if STEMI',
            'Activate STEMI protocol if ECG shows elevation'
        ],
        recommendedActions: [
            { action: 'Call 911 immediately', priority: 'immediate', selected: false },
            { action: 'Chew aspirin 325mg if not already taken', priority: 'immediate', selected: false },
            { action: 'Alert ED - possible incoming STEMI', priority: 'immediate', selected: false },
            { action: 'Remain calm, unlock door for EMS', priority: 'urgent', selected: false },
            { action: 'Document time of symptom onset', priority: 'urgent', selected: false }
        ],
        riskScore: 95
    },
    {
        id: 2,
        priority: 9,
        type: 'lab',
        patient: 'James Wilson',
        patientId: 'JW-2024-002',
        age: 72,
        gender: 'M',
        avatar: 'JW',
        time: '15 min ago',
        absoluteTime: '2025-01-07 09:30 AM',
        unread: true,
        preview: 'CRITICAL: K+ 6.8, Creatinine 3.2 (baseline 1.4), ECG changes noted',
        results: [
            { test: 'Potassium', value: '6.8', normal: '3.5-5.0', status: 'critical', trend: '↑↑' },
            { test: 'Creatinine', value: '3.2', normal: '0.7-1.3', status: 'critical', trend: '↑' },
            { test: 'BUN', value: '68', normal: '7-20', status: 'critical', trend: '↑' },
            { test: 'eGFR', value: '18', normal: '>60', status: 'critical', trend: '↓' },
            { test: 'Glucose', value: '142', normal: '70-100', status: 'abnormal', trend: '→' }
        ],
        pmh: ['CKD Stage 3b', 'HTN', 'T2DM', 'CHF (EF 35%)', 'Afib on warfarin'],
        medications: [
            'Lisinopril 40mg daily',
            'Spironolactone 25mg daily',
            'Metoprolol 50mg BID',
            'Furosemide 40mg BID',
            'Warfarin 5mg daily'
        ],
        ecgFindings: 'Peaked T waves, widened QRS',
        clinicalGuidelines: [
            'Hyperkalemia Protocol: K+ >6.5 requires immediate treatment',
            'Hold ACE-I, ARB, K-sparing diuretics immediately',
            'Consider calcium gluconate, insulin/glucose, kayexalate',
            'May require emergent dialysis if refractory'
        ],
        recommendedActions: [
            { action: 'Call patient immediately', priority: 'immediate', selected: false },
            { action: 'Hold ACE-I and spironolactone', priority: 'immediate', selected: false },
            { action: 'Order stat ECG', priority: 'immediate', selected: false },
            { action: 'Prepare hyperkalemia treatment', priority: 'urgent', selected: false },
            { action: 'Nephrology consult', priority: 'urgent', selected: false }
        ],
        riskScore: 90
    },
    {
        id: 3,
        priority: 8,
        type: 'imaging',
        patient: 'Susan Chen',
        patientId: 'SC-2024-003',
        age: 67,
        gender: 'F',
        avatar: 'SC',
        time: '30 min ago',
        absoluteTime: '2025-01-07 09:15 AM',
        unread: true,
        preview: 'CXR: New RLL infiltrate with pleural effusion, concern for pneumonia vs malignancy',
        results: [
            { finding: 'RLL consolidation', significance: 'New finding - concerning', action: 'Urgent follow-up' },
            { finding: 'Moderate pleural effusion', significance: 'New - needs evaluation', action: 'Consider thoracentesis' },
            { finding: 'Mediastinal lymphadenopathy', significance: 'Enlarged - 2.5cm', action: 'CT chest recommended' },
            { finding: 'Cardiomegaly', significance: 'Stable', action: 'Continue monitoring' }
        ],
        vitals: { 
            temp: '101.8°F', 
            bp: '142/88', 
            hr: '102', 
            o2: '92% on RA',
            rr: '22'
        },
        pmh: ['CHF (EF 40%)', 'HTN', 'CKD Stage 3', '30 pack-year smoking history', 'COPD'],
        symptoms: ['Productive cough x1 week', 'Hemoptysis x2 days', 'Weight loss 10lbs/month', 'Night sweats'],
        clinicalGuidelines: [
            'Fleischner Society: Solid nodule >8mm requires CT',
            'Consider malignancy in smoker with hemoptysis',
            'CURB-65 score for pneumonia severity',
            'Light\'s criteria for pleural fluid analysis'
        ],
        recommendedActions: [
            { action: 'Order CT chest with contrast', priority: 'urgent', selected: false },
            { action: 'Start empiric antibiotics', priority: 'high', selected: false },
            { action: 'Pulmonology consult', priority: 'high', selected: false },
            { action: 'Consider thoracentesis', priority: 'medium', selected: false },
            { action: 'Sputum culture and cytology', priority: 'medium', selected: false }
        ],
        riskScore: 85
    },
    {
        id: 4,
        priority: 7,
        type: 'email',
        patient: 'David Kim',
        patientId: 'DK-2024-004',
        age: 42,
        gender: 'M',
        avatar: 'DK',
        time: '1 hour ago',
        absoluteTime: '2025-01-07 08:45 AM',
        unread: true,
        preview: 'New diabetes diagnosis - very anxious, family history of complications',
        fullMessage: `Dr. Chen, I just got my lab results showing I have diabetes with an A1C of 7.8%. I'm really scared and overwhelmed. My father had diabetes and ended up losing his foot. I don't know what to do or where to start. Can this be reversed? Will I need insulin? I've been reading online and I'm terrified about complications. Please help me understand what this means for my future. I have young kids and I need to be healthy for them.`,
        results: [
            { test: 'A1C', value: '7.8%', normal: '<5.7%', status: 'abnormal', trend: 'New' },
            { test: 'Glucose', value: '186', normal: '70-100', status: 'abnormal', trend: 'New' },
            { test: 'LDL', value: '142', normal: '<100', status: 'abnormal', trend: '↑' },
            { test: 'BMI', value: '31.2', normal: '18.5-24.9', status: 'abnormal', trend: '→' }
        ],
        newDiagnosis: true,
        education: ['Diabetes basics', 'Lifestyle modifications', 'Monitoring', 'Complication prevention'],
        clinicalGuidelines: [
            'ADA: Metformin first-line for T2DM',
            'Lifestyle intervention can reduce A1C by 1-2%',
            'Diabetes education reduces complications by 50%',
            'Screen for depression with new diagnosis'
        ],
        recommendedActions: [
            { action: 'Start metformin 500mg daily', priority: 'high', selected: false },
            { action: 'Diabetes educator referral', priority: 'high', selected: false },
            { action: 'Nutritionist consultation', priority: 'high', selected: false },
            { action: 'Order eye exam', priority: 'medium', selected: false },
            { action: 'Depression screening', priority: 'medium', selected: false }
        ],
        riskScore: 70
    },
    {
        id: 5,
        priority: 6,
        type: 'provider',
        patient: 'Robert Johnson',
        patientId: 'RJ-2024-005',
        age: 62,
        gender: 'M',
        avatar: 'RJ',
        time: '2 hours ago',
        absoluteTime: '2025-01-07 07:45 AM',
        unread: false,
        preview: 'Cardiology: Post-cath - 3VD, recommending CABG, needs optimization',
        providerNote: `Patient seen for cardiac catheterization today. Findings: 90% LAD, 85% RCA, 80% LCX stenosis. EF 35%. Recommend CABG after medical optimization. Please optimize diabetes control (A1C 8.5%) and start dual antiplatelet therapy. Will schedule for surgery in 2-3 weeks.`,
        currentMeds: [
            'Metoprolol 50mg BID',
            'Lisinopril 20mg daily',
            'Atorvastatin 80mg daily',
            'Metformin 1000mg BID'
        ],
        vitals: { bp: '156/92', hr: '78', weight: '245 lbs' },
        clinicalGuidelines: [
            'ACC/AHA: CABG for 3VD with reduced EF',
            'Optimize A1C <7.5% pre-operatively',
            'DAPT for ACS: ASA + P2Y12 inhibitor',
            'Perioperative beta-blockade recommended'
        ],
        recommendedActions: [
            { action: 'Start clopidogrel 75mg daily', priority: 'high', selected: false },
            { action: 'Increase insulin for better control', priority: 'high', selected: false },
            { action: 'Pre-op clearance labs', priority: 'medium', selected: false },
            { action: 'Cardiac rehab referral', priority: 'medium', selected: false },
            { action: 'Smoking cessation if applicable', priority: 'medium', selected: false }
        ],
        riskScore: 65
    },
    {
        id: 6,
        priority: 5,
        type: 'staff',
        patient: 'Emma Wilson',
        patientId: 'EW-2024-006',
        age: 58,
        gender: 'F',
        avatar: 'EW',
        time: '3 hours ago',
        absoluteTime: '2025-01-07 06:45 AM',
        unread: false,
        preview: 'RN: Patient c/o severe muscle pain on statin, CK pending, requesting guidance',
        staffNote: 'Patient called reporting bilateral leg pain and weakness x1 week. Started atorvastatin 80mg 3 weeks ago after MI. Pain 8/10, difficulty climbing stairs. Ordered CK level - results pending. Patient asking if she should stop the medication.',
        relevantLabs: [
            { test: 'CK', value: 'Pending', status: 'pending' },
            { test: 'LDL', value: '165', date: '6 weeks ago', status: 'abnormal' },
            { test: 'AST', value: '45', normal: '10-40', status: 'mildly elevated' }
        ],
        pmh: ['Recent NSTEMI', 'HTN', 'Prediabetes', 'Fibromyalgia'],
        clinicalGuidelines: [
            'ACC/AHA: Statin myopathy in 5-10% of patients',
            'Check CK if muscle symptoms on statin',
            'Consider dose reduction or alternate statin',
            'Severe myopathy: CK >10x ULN'
        ],
        recommendedActions: [
            { action: 'Hold statin pending CK result', priority: 'high', selected: false },
            { action: 'Check TSH and vitamin D', priority: 'medium', selected: false },
            { action: 'Consider rosuvastatin 10mg', priority: 'medium', selected: false },
            { action: 'CoQ10 supplementation', priority: 'low', selected: false },
            { action: 'Schedule follow-up visit', priority: 'medium', selected: false }
        ],
        riskScore: 55
    },
    {
        id: 7,
        priority: 4,
        type: 'refill',
        patient: 'Linda Martinez',
        patientId: 'LM-2024-007',
        age: 55,
        gender: 'F',
        avatar: 'LM',
        time: '4 hours ago',
        absoluteTime: '2025-01-07 05:45 AM',
        unread: false,
        preview: 'Multiple refill requests - BP and diabetes meds, last labs 6 months ago',
        medications: [
            { name: 'Lisinopril 20mg', lastFill: '90 days ago', adherence: '92%', refills: 0 },
            { name: 'Metformin 1000mg BID', lastFill: '85 days ago', adherence: '88%', refills: 1 },
            { name: 'Amlodipine 10mg', lastFill: '92 days ago', adherence: '95%', refills: 0 },
            { name: 'Atorvastatin 40mg', lastFill: '88 days ago', adherence: '90%', refills: 2 }
        ],
        lastLabs: { 
            date: '6 months ago',
            a1c: '7.2%', 
            ldl: '102', 
            creat: '0.9',
            k: '4.2'
        },
        vitals: { bp: '138/82', weight: '178 lbs' },
        clinicalGuidelines: [
            'Annual labs for diabetes and HTN monitoring',
            'A1C every 3-6 months if not at goal',
            'Lipid panel annually if stable',
            'Monitor K+ and Cr on ACE-I'
        ],
        recommendedActions: [
            { action: 'Approve refills x90 days', priority: 'medium', selected: false },
            { action: 'Order updated labs', priority: 'high', selected: false },
            { action: 'Schedule annual visit', priority: 'medium', selected: false },
            { action: 'Diabetic eye exam reminder', priority: 'low', selected: false }
        ],
        riskScore: 40
    },
    {
        id: 8,
        priority: 8,
        type: 'phone',
        patient: 'Michael Thompson',
        patientId: 'MT-2024-008',
        age: 34,
        gender: 'M',
        avatar: 'MT',
        time: '45 min ago',
        absoluteTime: '2025-01-07 09:00 AM',
        unread: true,
        preview: 'Severe headache, vision changes, BP 185/110 at pharmacy',
        fullMessage: `Dr. Chen, I have the worst headache of my life. It started suddenly about 2 hours ago. I'm seeing spots and my vision is blurry. I went to the pharmacy and my blood pressure was 185/110. I've never had high blood pressure before. I'm also feeling nauseous and my neck is stiff. Should I go to the ER?`,
        criticalFactors: ['Severe headache', 'Vision changes', 'BP 185/110', 'Neck stiffness'],
        vitals: { bp: '185/110', hr: '95' },
        pmh: ['No significant PMH', 'Family Hx of HTN'],
        clinicalGuidelines: [
            'Hypertensive emergency: BP >180/120 with end-organ damage',
            'Consider subarachnoid hemorrhage with sudden severe headache',
            'Papilledema suggests increased ICP',
            'Immediate BP reduction needed'
        ],
        recommendedActions: [
            { action: 'Direct to ED immediately', priority: 'immediate', selected: false },
            { action: 'Call ahead to ED', priority: 'immediate', selected: false },
            { action: 'Advise no driving', priority: 'immediate', selected: false },
            { action: 'Document symptoms', priority: 'urgent', selected: false }
        ],
        riskScore: 88
    },
    {
        id: 9,
        priority: 3,
        type: 'lab',
        patient: 'Patricia Davis',
        patientId: 'PD-2024-009',
        age: 48,
        gender: 'F',
        avatar: 'PD',
        time: '5 hours ago',
        absoluteTime: '2025-01-07 04:45 AM',
        unread: false,
        preview: 'Thyroid panel: TSH 12.5, Free T4 low - new hypothyroidism',
        results: [
            { test: 'TSH', value: '12.5', normal: '0.4-4.5', status: 'abnormal', trend: '↑' },
            { test: 'Free T4', value: '0.6', normal: '0.8-1.8', status: 'low', trend: '↓' },
            { test: 'Anti-TPO', value: '245', normal: '<35', status: 'positive', trend: 'New' }
        ],
        symptoms: ['Fatigue', 'Weight gain 15 lbs', 'Hair loss', 'Cold intolerance', 'Constipation'],
        pmh: ['Depression', 'Hyperlipidemia', 'PCOS'],
        clinicalGuidelines: [
            'Start levothyroxine for overt hypothyroidism',
            'Initial dose: 1.6 mcg/kg/day',
            'Recheck TSH in 6-8 weeks',
            'Screen for other autoimmune conditions'
        ],
        recommendedActions: [
            { action: 'Start levothyroxine 75mcg daily', priority: 'high', selected: false },
            { action: 'Take on empty stomach', priority: 'high', selected: false },
            { action: 'Recheck TSH in 6 weeks', priority: 'medium', selected: false },
            { action: 'Screen for celiac disease', priority: 'low', selected: false }
        ],
        riskScore: 35
    },
    {
        id: 10,
        priority: 6,
        type: 'consult',
        patient: 'George Anderson',
        patientId: 'GA-2024-010',
        age: 70,
        gender: 'M',
        avatar: 'GA',
        time: '2.5 hours ago',
        absoluteTime: '2025-01-07 07:15 AM',
        unread: true,
        preview: 'GI consult: Colonoscopy showed 2cm polyp, recommending surgical referral',
        consultNote: `Colonoscopy findings: 2cm sessile polyp in ascending colon, unable to remove endoscopically. Biopsies taken - pending pathology. Also found multiple small adenomas removed. Recommend surgical consultation for right hemicolectomy. High risk for malignancy given size and appearance.`,
        pathologyPending: true,
        findings: [
            '2cm sessile polyp - ascending colon',
            '3 small tubular adenomas removed',
            'Moderate diverticulosis',
            'Internal hemorrhoids'
        ],
        pmh: ['HTN', 'BPH', 'Former smoker', 'Father died of colon cancer at 65'],
        clinicalGuidelines: [
            'Polyps >2cm have 10-25% malignancy risk',
            'Surgical resection for unresectable polyps',
            'Surveillance colonoscopy post-resection',
            'Consider genetic counseling'
        ],
        recommendedActions: [
            { action: 'Urgent surgical referral', priority: 'high', selected: false },
            { action: 'Await pathology results', priority: 'high', selected: false },
            { action: 'CEA level', priority: 'medium', selected: false },
            { action: 'CT staging if malignant', priority: 'medium', selected: false },
            { action: 'Genetic counseling referral', priority: 'low', selected: false }
        ],
        riskScore: 60
    },
    {
        id: 11,
        priority: 2,
        type: 'email',
        patient: 'Sarah Mitchell',
        patientId: 'SM-2024-011',
        age: 28,
        gender: 'F',
        avatar: 'SM',
        time: '6 hours ago',
        absoluteTime: '2025-01-07 03:45 AM',
        unread: false,
        preview: 'Requesting birth control options, planning pregnancy in 1-2 years',
        fullMessage: `Hi Dr. Chen, I'd like to discuss birth control options. I'm getting married next month and we're planning to try for a baby in about 1-2 years. I've been on the pill for 5 years but have been having mood swings. What would you recommend? Also, should I start taking any vitamins now?`,
        currentMeds: ['Ortho Tri-Cyclen Lo'],
        pmh: ['Migraines without aura', 'Anxiety'],
        clinicalGuidelines: [
            'Consider LARC for 1-2 year contraception',
            'Start folic acid 400mcg preconception',
            'Screen for contraindications',
            'Discuss fertility timeline'
        ],
        recommendedActions: [
            { action: 'Schedule contraception counseling', priority: 'medium', selected: false },
            { action: 'Start folic acid 400mcg', priority: 'medium', selected: false },
            { action: 'Discuss IUD vs implant', priority: 'medium', selected: false },
            { action: 'Update vaccines', priority: 'low', selected: false }
        ],
        riskScore: 20
    },
    {
        id: 12,
        priority: 7,
        type: 'imaging',
        patient: 'William Brown',
        patientId: 'WB-2024-012',
        age: 56,
        gender: 'M',
        avatar: 'WB',
        time: '1.5 hours ago',
        absoluteTime: '2025-01-07 08:15 AM',
        unread: true,
        preview: 'Head CT: 8mm subdural hematoma, midline shift 3mm, neurosurgery recommended',
        results: [
            { finding: 'Right subdural hematoma 8mm', significance: 'Acute', action: 'Urgent neurosurgery consult' },
            { finding: 'Midline shift 3mm', significance: 'Concerning', action: 'Monitor closely' },
            { finding: 'No skull fracture', significance: 'Negative', action: 'None' }
        ],
        history: 'Fall from ladder 3 days ago, on warfarin',
        vitals: { bp: '165/95', hr: '82', gcs: '14' },
        medications: ['Warfarin 5mg daily for Afib', 'Metoprolol 50mg BID'],
        lastINR: { value: '3.8', date: 'Yesterday' },
        clinicalGuidelines: [
            'SDH >5mm with shift requires evaluation',
            'Reverse anticoagulation urgently',
            'Neurosurgical consultation indicated',
            'Serial neurological exams'
        ],
        recommendedActions: [
            { action: 'Urgent neurosurgery consult', priority: 'immediate', selected: false },
            { action: 'Reverse warfarin with Vitamin K/FFP', priority: 'immediate', selected: false },
            { action: 'Admit for monitoring', priority: 'immediate', selected: false },
            { action: 'Repeat CT in 24 hours', priority: 'high', selected: false },
            { action: 'Hold anticoagulation', priority: 'high', selected: false }
        ],
        riskScore: 75
    },
    {
        id: 13,
        priority: 4,
        type: 'staff',
        patient: 'Jennifer Taylor',
        patientId: 'JT-2024-013',
        age: 38,
        gender: 'F',
        avatar: 'JT',
        time: '3.5 hours ago',
        absoluteTime: '2025-01-07 06:15 AM',
        unread: false,
        preview: 'MA: Patient requesting early refill on Adderall, lost prescription',
        staffNote: 'Patient called stating she lost her Adderall prescription while traveling. Last filled 10 days ago. This is the second early refill request in 6 months. Patient sounds anxious on phone.',
        medication: 'Adderall XR 20mg daily',
        controlledSubstance: true,
        refillHistory: [
            { date: '10 days ago', quantity: '30 tablets' },
            { date: '40 days ago', quantity: '30 tablets' },
            { date: '4 months ago', note: 'Early refill - stolen' }
        ],
        clinicalGuidelines: [
            'Document all controlled substance requests',
            'Check PDMP before prescribing',
            'Consider treatment agreement',
            'Assess for misuse/diversion'
        ],
        recommendedActions: [
            { action: 'Check PDMP database', priority: 'high', selected: false },
            { action: 'Require police report', priority: 'high', selected: false },
            { action: 'Schedule office visit', priority: 'medium', selected: false },
            { action: 'Consider treatment agreement', priority: 'medium', selected: false },
            { action: 'Document thoroughly', priority: 'high', selected: false }
        ],
        riskScore: 45
    },
    {
        id: 14,
        priority: 5,
        type: 'lab',
        patient: 'Richard Garcia',
        patientId: 'RG-2024-014',
        age: 52,
        gender: 'M',
        avatar: 'RG',
        time: '7 hours ago',
        absoluteTime: '2025-01-07 02:45 AM',
        unread: false,
        preview: 'Lipid panel: LDL 189, TG 425 - significant hyperlipidemia despite statin',
        results: [
            { test: 'LDL', value: '189', normal: '<100', status: 'critical', trend: '↑' },
            { test: 'Triglycerides', value: '425', normal: '<150', status: 'critical', trend: '↑' },
            { test: 'HDL', value: '32', normal: '>40', status: 'low', trend: '↓' },
            { test: 'Total Cholesterol', value: '285', normal: '<200', status: 'critical', trend: '↑' }
        ],
        currentMeds: ['Atorvastatin 40mg daily x6 months'],
        pmh: ['T2DM', 'HTN', 'Obesity (BMI 38)', 'NASH'],
        lifestyle: 'Sedentary, high carb diet, 2-3 beers daily',
        clinicalGuidelines: [
            'Consider high-intensity statin or add ezetimibe',
            'TG >500 increases pancreatitis risk',
            'Address lifestyle factors',
            'Consider fibrate for TG'
        ],
        recommendedActions: [
            { action: 'Increase to atorvastatin 80mg', priority: 'high', selected: false },
            { action: 'Add fenofibrate for TG', priority: 'high', selected: false },
            { action: 'Strict dietary counseling', priority: 'high', selected: false },
            { action: 'Limit alcohol intake', priority: 'high', selected: false },
            { action: 'Recheck in 6 weeks', priority: 'medium', selected: false }
        ],
        riskScore: 50
    },
    {
        id: 15,
        priority: 3,
        type: 'phone',
        patient: 'Nancy White',
        patientId: 'NW-2024-015',
        age: 65,
        gender: 'F',
        avatar: 'NW',
        time: '8 hours ago',
        absoluteTime: '2025-01-07 01:45 AM',
        unread: false,
        preview: 'Fell last night, hip pain, difficulty walking, lives alone',
        fullMessage: `Dr. Chen, I fell in my bathroom last night around 10 PM. I didn't hit my head but landed on my right hip. I managed to get up but I'm having trouble walking today. The pain is about 7/10 when I try to walk. I live alone and I'm worried about getting around. Should I come in or go to urgent care?`,
        pmh: ['Osteoporosis', 'HTN', 'Previous hip fracture 5 years ago'],
        medications: ['Alendronate 70mg weekly', 'Calcium/Vitamin D', 'Lisinopril 10mg'],
        socialHistory: 'Lives alone, daughter checks weekly',
        clinicalGuidelines: [
            'Ottawa rules for hip fracture assessment',
            'Consider occult fracture in elderly',
            'Fall risk assessment needed',
            'Home safety evaluation'
        ],
        recommendedActions: [
            { action: 'Order hip X-ray', priority: 'high', selected: false },
            { action: 'Consider MRI if X-ray negative', priority: 'medium', selected: false },
            { action: 'PT evaluation', priority: 'medium', selected: false },
            { action: 'Home health referral', priority: 'medium', selected: false },
            { action: 'Fall prevention counseling', priority: 'medium', selected: false }
        ],
        riskScore: 30
    }
];

// State Management
const appState = {
    expandedMessages: new Set(),
    selectedActions: {},
    composedResponses: {},
    currentFilter: { type: 'priority', value: 'all' },
    currentView: 'priority',
    searchTerm: '',
    selectedMessageId: null,
    theme: localStorage.getItem('theme') || 'light',
    summaryTab: 'overview'
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Set initial theme
    document.documentElement.setAttribute('data-theme', appState.theme);
    updateThemeIcon();
    
    // Render initial content
    renderMessages();
    updateSummaryPanel();
    
    // Set up keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Initialize real-time updates simulation
    startRealTimeUpdates();
}

// Render Messages
function renderMessages() {
    const container = document.getElementById('messageList');
    container.innerHTML = '';

    // Filter and sort messages
    let filteredMessages = filterMessages(clinicalMessages);
    filteredMessages = sortMessages(filteredMessages);

    // Render each message
    filteredMessages.forEach(msg => {
        container.appendChild(createMessageCard(msg));
    });

    // Update counts
    updateFilterCounts();
}

// Filter messages based on current filters
function filterMessages(messages) {
    let filtered = [...messages];

    // Apply search filter
    if (appState.searchTerm) {
        const searchLower = appState.searchTerm.toLowerCase();
        filtered = filtered.filter(msg => 
            msg.patient.toLowerCase().includes(searchLower) ||
            msg.preview.toLowerCase().includes(searchLower) ||
            (msg.fullMessage && msg.fullMessage.toLowerCase().includes(searchLower))
        );
    }

    // Apply type/priority filters
    const { type, value } = appState.currentFilter;
    
    if (type === 'priority' && value !== 'all') {
        if (value === 'critical') {
            filtered = filtered.filter(msg => msg.priority >= 8);
        } else if (value === 'high') {
            filtered = filtered.filter(msg => msg.priority >= 6 && msg.priority < 8);
        } else if (value === 'medium') {
            filtered = filtered.filter(msg => msg.priority >= 4 && msg.priority < 6);
        } else if (value === 'low') {
            filtered = filtered.filter(msg => msg.priority < 4);
        }
    } else if (type === 'type' && value !== 'all') {
        filtered = filtered.filter(msg => msg.type === value);
    } else if (type === 'context') {
        if (value === 'abnormal') {
            filtered = filtered.filter(msg => 
                msg.results && msg.results.some(r => r.status === 'critical' || r.status === 'abnormal')
            );
        } else if (value === 'followup') {
            filtered = filtered.filter(msg => msg.riskScore >= 50);
        } else if (value === 'newpatient') {
            filtered = filtered.filter(msg => msg.newDiagnosis);
        }
    } else if (type === 'time') {
        const now = new Date();
        if (value === 'today') {
            filtered = filtered.filter(msg => {
                const msgTime = parseMessageTime(msg.time);
                return msgTime.toDateString() === now.toDateString();
            });
        }
    }

    return filtered;
}

// Sort messages based on current view
function sortMessages(messages) {
    const sorted = [...messages];
    
    if (appState.currentView === 'priority') {
        sorted.sort((a, b) => b.priority - a.priority);
    } else if (appState.currentView === 'timeline') {
        sorted.sort((a, b) => parseMessageTime(a.time) - parseMessageTime(b.time));
    } else if (appState.currentView === 'patient') {
        sorted.sort((a, b) => a.patient.localeCompare(b.patient));
    }
    
    return sorted;
}

// Parse message time to Date object
function parseMessageTime(timeStr) {
    // Simple implementation - in real app would be more sophisticated
    const now = new Date();
    if (timeStr.includes('min ago')) {
        const mins = parseInt(timeStr);
        return new Date(now - mins * 60000);
    } else if (timeStr.includes('hour')) {
        const hours = parseFloat(timeStr);
        return new Date(now - hours * 3600000);
    }
    return now;
}

// Create Message Card
function createMessageCard(msg) {
    const card = document.createElement('div');
    card.className = `message-card ${getPriorityClass(msg.priority)} ${msg.unread ? 'unread' : ''}`;
    card.dataset.messageId = msg.id;

    const layout = document.createElement('div');
    layout.className = 'msg-layout';
    layout.onclick = () => toggleExpanded(msg.id);

    // Priority indicator
    const priorityDiv = document.createElement('div');
    priorityDiv.className = 'msg-priority';
    priorityDiv.innerHTML = `
        <div class="priority-score ${getScoreClass(msg.priority)}">${msg.priority}</div>
        <div class="msg-type-icon">${getTypeLabel(msg.type)}</div>
    `;

    // Content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';
    contentDiv.innerHTML = `
        <div class="msg-header-row">
            <div class="patient-info">
                <div class="patient-avatar">${msg.avatar}</div>
                <div>
                    <div class="patient-name">${msg.patient}</div>
                    <div class="patient-details">${msg.age}${msg.gender} • ID: ${msg.patientId}</div>
                </div>
            </div>
            <div class="msg-meta">
                <span class="meta-tag tag-${msg.type}">${msg.type.toUpperCase()}</span>
                ${msg.newDiagnosis ? '<span class="meta-tag" style="background: #fee2e2; color: #dc2626;">NEW DX</span>' : ''}
                ${msg.criticalFactors ? '<span class="meta-tag" style="background: #dc2626; color: white;">CRITICAL</span>' : ''}
                ${msg.controlledSubstance ? '<span class="meta-tag" style="background: #f59e0b; color: white;">CONTROLLED</span>' : ''}
            </div>
        </div>
        <div class="msg-preview">${msg.preview}</div>
        <div class="msg-indicators">
            <span class="indicator ai-ready">🤖 AI Analysis Ready</span>
            ${msg.clinicalGuidelines ? '<span class="indicator">📋 Guidelines Available</span>' : ''}
            ${msg.priority > 6 ? '<span class="indicator needs-review">⚠️ Needs Review</span>' : ''}
            ${msg.pathologyPending ? '<span class="indicator follow-up">🔬 Path Pending</span>' : ''}
        </div>
    `;

    // Quick actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'msg-quick-actions';
    actionsDiv.innerHTML = `
        <div class="time-info">
            <div class="time-relative">${msg.time}</div>
            <div class="time-absolute">${msg.absoluteTime}</div>
        </div>
        <div class="quick-btns">
            ${msg.priority > 7 ? `<button class="quick-btn primary" onclick="quickAction(event, ${msg.id}, 'urgent')">Urgent</button>` : ''}
            <button class="quick-btn" onclick="quickAction(event, ${msg.id}, 'review')">Review</button>
            <button class="quick-btn" onclick="quickAction(event, ${msg.id}, 'defer')">Defer</button>
        </div>
    `;

    layout.appendChild(priorityDiv);
    layout.appendChild(contentDiv);
    layout.appendChild(actionsDiv);

    // Expanded detail
    const detail = createExpandedDetail(msg);

    card.appendChild(layout);
    card.appendChild(detail);

    return card;
}

// Create Expanded Detail
function createExpandedDetail(msg) {
    const detail = document.createElement('div');
    detail.className = 'clinical-detail';
    detail.id = `detail-${msg.id}`;

    let html = '<div class="detail-content">';

    // Patient Message/Content
    if (msg.fullMessage || msg.providerNote || msg.consultNote || msg.staffNote) {
        html += createPatientMessage(msg);
    }

    // Clinical Context
    html += createClinicalContext(msg);

    // Results Display
    if (msg.results || msg.findings) {
        html += createResultsDisplay(msg);
    }

    // Guidelines
    if (msg.clinicalGuidelines) {
        html += createGuidelinesPanel(msg);
    }

    // Decision Support
    html += createDecisionSupport(msg);

    // Action Builder
    html += createActionBuilder(msg);

    html += '</div>';
    detail.innerHTML = html;

    return detail;
}

// Create Patient Message Display
function createPatientMessage(msg) {
    let content = '';
    let header = '';
    
    if (msg.fullMessage) {
        content = msg.fullMessage;
        header = 'Patient Message';
    } else if (msg.providerNote) {
        content = msg.providerNote;
        header = 'Provider Note';
    } else if (msg.consultNote) {
        content = msg.consultNote;
        header = 'Consultation Note';
    } else if (msg.staffNote) {
        content = msg.staffNote;
        header = 'Staff Report';
    }

    const html = `
        <div class="patient-message">
            <div class="patient-message-header">
                💬 ${header}
            </div>
            <div class="patient-message-content">
                ${content}
            </div>
            ${msg.criticalFactors || msg.vitals || msg.symptoms ? `
                <div class="message-metadata">
                    ${msg.vitals ? Object.entries(msg.vitals).map(([k, v]) => 
                        `<span><strong>${k.toUpperCase()}:</strong> ${v}</span>`
                    ).join('') : ''}
                    ${msg.criticalFactors ? `<span><strong>Red Flags:</strong> ${msg.criticalFactors.join(', ')}</span>` : ''}
                    ${msg.symptoms ? `<span><strong>Symptoms:</strong> ${msg.symptoms.join(', ')}</span>` : ''}
                </div>
            ` : ''}
        </div>
    `;
    
    return html;
}

// Clinical Context Panel
function createClinicalContext(msg) {
    let html = '<div class="context-grid">';
    
    html += `
        <div class="context-item">
            <div class="context-label">Age/Gender</div>
            <div class="context-value">${msg.age}${msg.gender}</div>
        </div>
    `;

    if (msg.pmh && msg.pmh.length > 0) {
        html += `
            <div class="context-item">
                <div class="context-label">PMH</div>
                <div class="context-value">${msg.pmh.join(', ')}</div>
            </div>
        `;
    }

    if (msg.medications && msg.medications.length > 0) {
        html += `
            <div class="context-item">
                <div class="context-label">Current Meds</div>
                <div class="context-value">${msg.medications.length} active</div>
            </div>
        `;
    }

    if (msg.allergies) {
        html += `
            <div class="context-item">
                <div class="context-label">Allergies</div>
                <div class="context-value warning">${msg.allergies.join(', ')}</div>
            </div>
        `;
    }

    if (msg.vitals) {
        Object.entries(msg.vitals).forEach(([key, value]) => {
            const status = checkVitalStatus(key, value);
            html += `
                <div class="context-item">
                    <div class="context-label">${key.toUpperCase()}</div>
                    <div class="context-value ${status}">${value}</div>
                </div>
            `;
        });
    }

    if (msg.lastVisit) {
        html += `
            <div class="context-item">
                <div class="context-label">Last Visit</div>
                <div class="context-value">${msg.lastVisit}</div>
            </div>
        `;
    }

    html += '</div>';
    return html;
}

// Results Display
function createResultsDisplay(msg) {
    let html = '<div class="results-grid">';

    if (msg.type === 'lab' && msg.results) {
        msg.results.forEach(result => {
            const isAbnormal = result.status === 'critical' || result.status === 'abnormal';
            html += `
                <div class="result-card ${isAbnormal ? 'critical' : ''}">
                    <div class="result-name">${result.test}</div>
                    <div class="result-value ${result.status}">${result.value}</div>
                    <div class="result-meta">
                        <span>${result.normal || ''}</span>
                        <span class="result-trend">${result.trend || ''}</span>
                    </div>
                </div>
            `;
        });
    } else if ((msg.type === 'imaging' || msg.type === 'consult') && msg.results) {
        msg.results.forEach(finding => {
            html += `
                <div class="result-card">
                    <div class="result-name">${finding.finding}</div>
                    <div class="result-value" style="font-size: 12px;">${finding.significance}</div>
                    <div class="result-meta">
                        <span>Action: ${finding.action}</span>
                    </div>
                </div>
            `;
        });
    } else if (msg.findings) {
        msg.findings.forEach(finding => {
            html += `
                <div class="result-card">
                    <div class="result-value" style="font-size: 12px;">${finding}</div>
                </div>
            `;
        });
    }

    html += '</div>';
    return html;
}

// Guidelines Panel
function createGuidelinesPanel(msg) {
    let html = '<div class="guidelines-panel">';
    html += '<div class="guidelines-header">📋 Clinical Guidelines</div>';
    
    msg.clinicalGuidelines.forEach(guideline => {
        html += `<div class="guideline-item">${guideline}</div>`;
    });

    html += '</div>';
    return html;
}

// Decision Support Panel
function createDecisionSupport(msg) {
    let html = '<div class="decision-support">';
    html += '<div class="ds-header">🧭 Clinical Decision Support</div>';
    html += '<div class="ds-content">';

    msg.recommendedActions.forEach((action, idx) => {
        const selected = appState.selectedActions[msg.id]?.[idx] || false;
        html += `
            <div class="ds-item ${selected ? 'selected' : ''}" 
                 onclick="toggleAction(${msg.id}, ${idx})">
                <div class="ds-title">${action.action}</div>
                <div class="ds-detail">Priority: ${action.priority}</div>
            </div>
        `;
    });

    html += '</div></div>';
    return html;
}

// Action Builder
function createActionBuilder(msg) {
    let html = '<div class="action-builder">';
    
    html += `
        <div class="builder-tabs">
            <button class="builder-tab active" onclick="switchTab(${msg.id}, 'response')">Response</button>
            <button class="builder-tab" onclick="switchTab(${msg.id}, 'orders')">Orders</button>
            <button class="builder-tab" onclick="switchTab(${msg.id}, 'referrals')">Referrals</button>
            <button class="builder-tab" onclick="switchTab(${msg.id}, 'follow-up')">Follow-up</button>
            <button class="builder-tab" onclick="switchTab(${msg.id}, 'documentation')">Documentation</button>
        </div>
    `;

    html += `<div class="action-options" id="action-options-${msg.id}">`;
    html += createResponseOptions(msg);
    html += '</div>';

    const savedResponse = appState.composedResponses[msg.id] || '';
    html += `
        <div class="composed-action" 
             id="composed-${msg.id}" 
             contenteditable="true" 
             placeholder="Compose your clinical response and actions..."
             onblur="saveComposedResponse(${msg.id})">${savedResponse}</div>
    `;

    html += `
        <div class="action-controls">
            <button class="action-ctrl ctrl-ai" onclick="generateAIResponse(${msg.id})">
                <span>🤖</span> AI Suggest
            </button>
            <button class="action-ctrl ctrl-execute" onclick="executeAction(${msg.id})">
                <span>✓</span> Execute & Send
            </button>
            <button class="action-ctrl ctrl-save" onclick="saveAction(${msg.id})">
                <span>💾</span> Save Draft
            </button>
            <button class="action-ctrl ctrl-defer" onclick="deferAction(${msg.id})">
                <span>⏰</span> Defer
            </button>
        </div>
    `;

    html += '</div>';
    return html;
}

// Create Response Options
function createResponseOptions(msg) {
    const templates = getResponseTemplates(msg);
    let html = '';

    templates.forEach((template) => {
        html += `
            <div class="action-opt" onclick="addToComposed(${msg.id}, '${template.text.replace(/'/g, "\\'")}')">
                ${template.label}
            </div>
        `;
    });

    return html;
}

// Get Response Templates based on message type and priority
function getResponseTemplates(msg) {
    const baseTemplates = [
        { label: 'Acknowledge', text: 'I have reviewed your message. ' },
        { label: 'Schedule Visit', text: 'Please schedule an appointment to discuss this further. ' }
    ];

    if (msg.priority >= 8) {
        return [
            { label: 'Urgent Action', text: 'This requires immediate attention. ' },
            { label: 'ED Referral', text: 'Please go to the emergency department immediately. ' },
            { label: 'Call 911', text: 'Please call 911 immediately for emergency medical attention. ' },
            { label: 'Direct Admit', text: 'I am arranging direct admission to the hospital. ' },
            ...baseTemplates
        ];
    } else if (msg.type === 'lab') {
        return [
            { label: 'Results Reviewed', text: 'I have reviewed your lab results. ' },
            { label: 'Medication Adjustment', text: 'Based on your results, I am adjusting your medications. ' },
            { label: 'Repeat Labs', text: 'Please repeat these labs in ' },
            { label: 'Lifestyle Changes', text: 'These results indicate we should discuss lifestyle modifications. ' },
            ...baseTemplates
        ];
    } else if (msg.type === 'imaging') {
        return [
            { label: 'Imaging Reviewed', text: 'I have reviewed your imaging results. ' },
            { label: 'Additional Imaging', text: 'I am ordering additional imaging for further evaluation. ' },
            { label: 'Specialist Referral', text: 'I am referring you to a specialist for further evaluation. ' },
            { label: 'No Acute Findings', text: 'The imaging shows no acute findings requiring immediate intervention. ' },
            ...baseTemplates
        ];
    } else if (msg.type === 'refill') {
        return [
            { label: 'Approved', text: 'Your medication refills have been approved and sent to your pharmacy. ' },
            { label: 'Needs Labs', text: 'Please schedule lab work before your next refill. ' },
            { label: 'Dose Adjustment', text: 'I am adjusting your medication dose based on recent data. ' },
            { label: 'Generic Substitution', text: 'I have approved a generic substitution to reduce cost. ' },
            ...baseTemplates
        ];
    } else if (msg.type === 'phone' || msg.type === 'email') {
        return [
            { label: 'Reassurance', text: 'I understand your concerns. ' },
            { label: 'Instructions', text: 'Please follow these instructions: ' },
            { label: 'Monitor Symptoms', text: 'Please monitor your symptoms and contact us if they worsen. ' },
            { label: 'Education', text: 'Let me provide some information about your condition. ' },
            ...baseTemplates
        ];
    }

    return baseTemplates;
}

// Helper Functions
function getPriorityClass(priority) {
    if (priority >= 8) return 'critical';
    if (priority >= 5) return 'warning';
    return 'routine';
}

function getScoreClass(priority) {
    if (priority >= 8) return 'score-high';
    if (priority >= 5) return 'score-medium';
    return 'score-low';
}

function getTypeLabel(type) {
    const labels = {
        phone: 'PHONE',
        email: 'EMAIL',
        lab: 'LAB',
        imaging: 'IMAGING',
        provider: 'PROVIDER',
        staff: 'STAFF',
        refill: 'REFILL',
        consult: 'CONSULT'
    };
    return labels[type] || type.toUpperCase();
}

function checkVitalStatus(key, value) {
    // Parse numeric values
    const numValue = parseFloat(value);
    
    if (key === 'bp') {
        const systolic = parseInt(value.split('/')[0]);
        if (systolic > 140) return 'abnormal';
        if (systolic > 130) return 'warning';
    } else if (key === 'hr') {
        if (numValue < 60 || numValue > 100) return 'warning';
        if (numValue < 50 || numValue > 120) return 'abnormal';
    } else if (key === 'o2') {
        if (numValue < 95) return 'warning';
        if (numValue < 90) return 'abnormal';
    } else if (key === 'temp') {
        if (numValue > 100.4) return 'warning';
        if (numValue > 102) return 'abnormal';
    }
    
    return 'normal';
}

// Event Handlers
function toggleExpanded(msgId) {
    const detail = document.getElementById(`detail-${msgId}`);
    
    if (appState.expandedMessages.has(msgId)) {
        appState.expandedMessages.delete(msgId);
        detail.classList.remove('open');
    } else {
        appState.expandedMessages.add(msgId);
        detail.classList.add('open');
        
        // Mark as read
        const msg = clinicalMessages.find(m => m.id === msgId);
        if (msg) msg.unread = false;
        
        // Update selected message
        appState.selectedMessageId = msgId;
    }
}

function quickAction(event, msgId, action) {
    event.stopPropagation();
    
    if (action === 'urgent') {
        // Handle urgent action
        showNotification(`Urgent protocol initiated for message ${msgId}`, 'warning');
    } else if (action === 'review') {
        // Mark as reviewed
        const msg = clinicalMessages.find(m => m.id === msgId);
        if (msg) msg.unread = false;
        renderMessages();
        showNotification('Message marked as reviewed', 'success');
    } else if (action === 'defer') {
        // Defer message
        showNotification('Message deferred for later review', 'info');
    }
}

function toggleAction(msgId, actionIdx) {
    if (!appState.selectedActions[msgId]) {
        appState.selectedActions[msgId] = {};
    }
    
    appState.selectedActions[msgId][actionIdx] = !appState.selectedActions[msgId][actionIdx];
    
    // Re-render the decision support panel
    const msg = clinicalMessages.find(m => m.id === msgId);
    if (msg) {
        const detail = document.getElementById(`detail-${msgId}`);
        if (detail) {
            // Update just the decision support section
            const dsElement = detail.querySelector('.decision-support');
            if (dsElement) {
                dsElement.outerHTML = createDecisionSupport(msg);
            }
        }
        
        // Add to composed response
        if (appState.selectedActions[msgId][actionIdx]) {
            addToComposed(msgId, msg.recommendedActions[actionIdx].action + '. ');
        }
    }
}

function addToComposed(msgId, text) {
    const composed = document.getElementById(`composed-${msgId}`);
    if (composed) {
        composed.textContent += text;
        saveComposedResponse(msgId);
    }
}

function saveComposedResponse(msgId) {
    const composed = document.getElementById(`composed-${msgId}`);
    if (composed) {
        appState.composedResponses[msgId] = composed.textContent;
    }
}

function switchTab(msgId, tab) {
    // Update active tab
    const tabs = document.querySelectorAll(`#detail-${msgId} .builder-tab`);
    tabs.forEach(t => {
        t.classList.remove('active');
        if (t.textContent.toLowerCase().includes(tab)) {
            t.classList.add('active');
        }
    });
    
    // Update options
    const optionsDiv = document.getElementById(`action-options-${msgId}`);
    if (!optionsDiv) return;
    
    if (tab === 'orders') {
        optionsDiv.innerHTML = `
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Order CBC with differential. ')">CBC</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Order comprehensive metabolic panel. ')">CMP</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Order hemoglobin A1C. ')">A1C</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Order lipid panel. ')">Lipids</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Order thyroid function tests. ')">TSH</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Order urinalysis. ')">UA</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Order chest X-ray. ')">CXR</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Order ECG. ')">ECG</div>
        `;
    } else if (tab === 'referrals') {
        optionsDiv.innerHTML = `
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Refer to cardiology. ')">Cardiology</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Refer to endocrinology. ')">Endocrinology</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Refer to nephrology. ')">Nephrology</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Refer to pulmonology. ')">Pulmonology</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Refer to gastroenterology. ')">GI</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Refer to neurology. ')">Neurology</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Refer to psychiatry. ')">Psychiatry</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Refer to physical therapy. ')">PT</div>
        `;
    } else if (tab === 'follow-up') {
        optionsDiv.innerHTML = `
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Follow up in 1 week. ')">1 week</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Follow up in 2 weeks. ')">2 weeks</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Follow up in 1 month. ')">1 month</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Follow up in 3 months. ')">3 months</div>
            <div class="action-opt" onclick="addToComposed(${msgId}, 'Follow up as needed. ')">
