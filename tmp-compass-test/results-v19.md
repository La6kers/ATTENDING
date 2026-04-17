# COMPASS Stress Test — 600 API Cases (v19)

**Date:** 2026-04-17T03:50:35.912Z
**Endpoint:** http://localhost:3005/api/diagnose
**Total cases:** 600

## Overall Accuracy

| Metric | Value |
|---|---|
| **Hits (primary or top-5)** | 508 |
| **Misses** | 92 |
| **Errors** | 0 |
| **Accuracy** | **84.7%** |

## By Demographic

| Demo | Hits | Total | Accuracy |
|---|---|---|---|
| peds | 119 | 150 | 79.3% |
| adult | 217 | 250 | 86.8% |
| geri | 172 | 200 | 86.0% |

## By Setting

| Setting | Hits | Total | Accuracy |
|---|---|---|---|
| ED | 168 | 200 | 84.0% |
| UC | 169 | 200 | 84.5% |
| PC | 171 | 200 | 85.5% |

## Latency

| Percentile | ms |
|---|---|
| p50 | 10 |
| p95 | 15 |
| p99 | 22 |

## Top 10 Most-Missed Conditions

| Condition | Misses |
|---|---|
| Appendicitis | 5 |
| COPD Exacerbation | 5 |
| Temporal Arteritis | 5 |
| Pulmonary Embolism | 4 |
| Diverticulitis | 4 |
| Epiglottitis | 4 |
| Atrial Fibrillation | 4 |
| Alcohol Withdrawal | 4 |
| Iron Deficiency Anemia | 4 |
| Pyelonephritis | 4 |

## Top 10 Most-Reliable Conditions (100% hit rate, n>=2)

| Condition | Hits/Total |
|---|---|
| Acute Myocardial Infarction | 6/6 |
| Stroke | 6/6 |
| Asthma | 6/6 |
| Gastroenteritis | 6/6 |
| Meningitis | 6/6 |
| Gout | 6/6 |
| Cellulitis | 6/6 |
| Bronchitis | 5/5 |
| Upper Respiratory Infection | 5/5 |
| Pneumothorax | 5/5 |

## All Misses

| ID | Demo | Setting | Expected | Got (Primary) | Top 5 | CC |
|---|---|---|---|---|---|---|
| 7002 | geri | PC | Pulmonary Embolism | Bronchitis | Bronchitis, Viral URI, ACE inhibitor cough, Pneumonia, COPD exacerbation | i was just sittin there and suddenly couldnt breathe and sta |
| 7005 | peds | PC | Appendicitis | Gastroenteritis | Gastroenteritis, Food Poisoning, Cyclic Vomiting Syndrome, Medication Side Effect, Bowel Obstruction | started around my belly button now the pain moved to the low |
| 7009 | geri | ED | Nephrolithiasis | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Trichomoniasis, Bacterial Vaginosis | worst pain of my life in my side it comes and goes and i can |
| 7012 | adult | ED | COPD Exacerbation | Asthma | Asthma, Bronchi, Pneumonia, Post-infectious cough, Pulmonary Embolism | my copd is acting up cant breathe and coughing way more than |
| 7027 | geri | ED | Diverticulitis | Viral infection | Viral infection, Pneumonia, UTI, Gastroenteritis, Sepsis | pain in my lower left belly with fever and i been constipate |
| 7034 | adult | UC | Gastrointestinal Bleeding | Orthostatic hypotension | Orthostatic hypotension, BPPV, Vestibular neuritis, Cardiac Arrhythmia, Medication side effect | theres blood in my stool bright red and i feel dizzy |
| 7043 | geri | UC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, Bone Lesions, Peritonsillar Abscess | sore throat came on fast now my child is leaning forward dro |
| 7057 | geri | ED | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 7062 | geri | PC | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Herpes Zoster (Shingles), Cellulitis, Conjunctivitis | my kid has crusty honey colored sores around his mouth and n |
| 7064 | peds | UC | Atrial Fibrillation | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Medication side effect, Anxiety | my heart is all over the place beating fast and irregular fe |
| 7076 | geri | UC | Alcohol Withdrawal | Delirium Tremens | Delirium Tremens, UTI, Toxic/Metabolic Encephalopathy, Sepsis, Stroke | last drink was 2 days ago and now i got the shakes sweating  |
| 7092 | geri | PC | Iron Deficiency Anemia | Heart Failure | Heart Failure, Asthma, COPD exacerbation, Pneumonia, Pulmonary Embolism | been dragging for months short of breath going up stairs and |
| 7121 | geri | UC | Appendicitis | Kidney Stone | Kidney Stone, Abdominal Aortic Aneurysm, Pyelonephritis, Musculoskeletal Strain, UTI | my right side is killing me i cant even stand up straight |
| 7126 | adult | ED | Congestive Heart Failure | DVT | DVT, Cellulitis, Musculoskeletal Strain, Venous Insufficiency, Baker's Cyst Rupture | keep waking up at night gasping for air and my legs are swol |
| 7127 | geri | UC | Deep Vein Thrombosis | Cellulitis | Cellulitis, Abscess, Contact Dermatitis, Erysipelas, Orbital Cellulitis | one leg is way bigger than the other and its warm and tender |
| 7128 | peds | PC | COPD Exacerbation | Pneumonia | Pneumonia, Asthma, Viral URI | breathing is worse than ever my inhaler aint helping like it |
| 7129 | adult | ED | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Spinal Stenosis, Herniated Disc, Sepsis, Kidney Stone | hurts to pee and now my back is killing me and i got a high  |
| 7132 | geri | ED | Sepsis | Atrial Fibrillation | Atrial Fibrillation, Supraventricular Tachycardia, Cardiac Arrhythmia, Panic Disorder, Anxiety | infection got real bad now im lightheaded heart pounding fev |
| 7134 | peds | PC | Pharyngitis | Viral infection | Viral infection, Acute Otitis Media, UTI, Gastroenteritis, Pneumonia | hurts so bad to swallow even water and i got a fever |
| 7143 | adult | PC | Diverticulitis | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Appendicitis, Ectopic Pregnancy | belly pain on the lower left that gets worse and i dont wann |
| 7150 | peds | ED | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Medication side effect, Anxiety | been pooping black tar looking stuff and feel lightheaded |
| 7159 | adult | ED | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, Peritonsillar Abscess, GERD | sore throat came on fast now my child is leaning forward dro |
| 7173 | geri | PC | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 7178 | geri | UC | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Herpes Zoster (Shingles), Cellulitis, Conjunctivitis | my kid has crusty honey colored sores around his mouth and n |
| 7180 | peds | ED | Atrial Fibrillation | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Medication side effect, Anxiety | my heart is all over the place beating fast and irregular fe |
| 7191 | geri | PC | Delirium Tremens | Temporal Arteritis | Temporal Arteritis, Meningitis, Stroke, Central Retinal Artery Occlusion, Retinal Detachment | stopped drinking and now im trembling cant think straight an |
| 7193 | peds | UC | Opioid Overdose | Substance Intoxication | Substance Intoxication, Delirium Tremens, Toxic/Metabolic Encephalopathy, Hepatic Encephalopathy, Sepsis | she took a bunch of pills and now shes barely breathing and  |
| 7196 | geri | UC | Bipolar Disorder — Manic Episode | Needs in-person evaluation | Needs in-person evaluation | i feel amazing like i can do anything havent needed sleep an |
| 7205 | adult | UC | Vasovagal Syncope | BPPV | BPPV, Acute Myocardial Infarction, Anxiety, Orthostatic hypotension, Vestibular neuritis | got lightheaded at church felt hot and sweaty then next thin |
| 7206 | geri | PC | Urticaria | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Herpes Zoster (Shingles), Cellulitis, Conjunctivitis | took a new medicine yesterday and now i got bumps and itchy  |
| 7208 | geri | UC | Iron Deficiency Anemia | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Cardiac Arrhythmia | so tired i can barely function my periods have been super he |
| 7209 | adult | PC | Intimate Partner Violence | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | he punched me in the face again and i think my cheekbone mig |
| 7214 | adult | UC | HRT Side Effect — Mood/Psychiatric | DVT | DVT, Cellulitis, Venous Insufficiency, Musculoskeletal Strain, Lymphedema | started estrogen 3 months ago and now i get terrible headach |
| 7215 | adult | PC | Lactation Mastitis | Chlamydia | Chlamydia, Genital Herpes, Trichomoniasis, Gonorrhea, Bacterial Vaginosis | had a clogged duct that turned into my whole breast being re |
| 7218 | peds | PC | Polypharmacy/Medication Effect | BPPV | BPPV, Anxiety, Orthostatic hypotension, Vestibular neuritis, Medication side effect | ever since they added that new medicine i feel woozy and uns |
| 7219 | peds | ED | Heat Exhaustion | BPPV | BPPV, Acute Myocardial Infarction, Orthostatic hypotension, Vestibular neuritis, Anxiety | was working outside in the heat all day and now im dizzy nau |
| 7234 | peds | ED | Pulmonary Embolism | Asthma | Asthma, Pneumonia, Viral URI | feel like im suffocating and theres this stabbing pain on th |
| 7236 | peds | PC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | feels like peein razor blades and my pee smells awful |
| 7240 | geri | ED | Migraine | Temporal Arteritis | Temporal Arteritis, Stroke, Central Retinal Artery Occlusion, Amaurosis Fugax, Acute Glaucoma | my head is pounding so bad i cant see straight and lights ma |
| 7244 | adult | UC | COPD Exacerbation | Bronchitis | Bronchitis, Viral URI, ACE inhibitor cough, Pneumonia, Asthma | lungs feel like theyre on fire and i cant stop coughing gree |
| 7245 | peds | PC | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Cauda Equina Syndrome, Herniated Disc, Compression fracture, Spinal Stenosis | fever of 103 and pain in my lower back plus burning when i u |
| 7248 | adult | PC | Sepsis | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Anxiety, Cardiac Arrhythmia, Atrial Fibrillation | had a cut that got infected now i feel terrible fever racing |
| 7250 | adult | UC | Pharyngitis | Anaphylaxis | Anaphylaxis, Angioedema, ACE Inhibitor Angioedema, Food Allergy (severe), Hereditary Angioedema | sore throat is killing me and my glands are all swollen up |
| 7259 | adult | UC | Diverticulitis | Gastroenteritis | Gastroenteritis, GERD, Appendicitis, Peptic Ulcer, Pancreatitis | left side of my gut hurts and i got a fever and feel bloated |
| 7261 | peds | ED | Cholecystitis | Gastroenteritis | Gastroenteritis, Food Poisoning, Cyclic Vomiting Syndrome, Medication Side Effect, Bowel Obstruction | pain under my right ribs especially after eating and im naus |
| 7289 | adult | UC | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 7296 | peds | PC | Atrial Fibrillation | BPPV | BPPV, Anxiety, Orthostatic hypotension, Vestibular neuritis, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 7308 | peds | PC | Alcohol Withdrawal | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Anxiety, Cardiac Arrhythmia, Atrial Flutter | trying to detox from alcohol at home and im shaking anxious  |
| 7318 | peds | ED | Neuroleptic Malignant Syndrome | Meningitis | Meningitis, Viral infection, Acute Otitis Media, Gastroenteritis, Pneumonia | started haldol and now hes rigid as a board with a high feve |
| 7323 | geri | PC | Simple Laceration | Hip Fracture | Hip Fracture, Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | my kid fell on the playground and split his chin open its ga |
| 7334 | adult | UC | Polypharmacy/Medication Effect | BPPV | BPPV, Vestibular neuritis, Orthostatic hypotension | keep losing my balance fell three times this week and im on  |
| 7335 | peds | PC | Heat Exhaustion | Gastroenteritis | Gastroenteritis, Foreign Body Ingestion, Intussusception, Appendicitis, Constipation | my kid was playing football in the heat and now hes throwing |
| 7351 | adult | ED | Pneumonia | Bronchitis | Bronchitis, ACE inhibitor cough, Viral URI, Sepsis, Asthma | my cough wont quit and i got a fever and everything aches |
| 7353 | peds | PC | Appendicitis | Viral infection | Viral infection, Acute Otitis Media, Gastroenteritis, Pneumonia, Hand Foot and Mouth Disease | sharp stabbing pain in my lower right belly and i got a feve |
| 7357 | adult | ED | Nephrolithiasis | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Trichomoniasis, Bacterial Vaginosis | worst pain of my life in my side it comes and goes and i can |
| 7360 | peds | ED | COPD Exacerbation | Asthma | Asthma, Bronchi, Pneumonia, Post-infectious cough, Pulmonary Embolism | my copd is acting up cant breathe and coughing way more than |
| 7375 | peds | ED | Diverticulitis | Viral infection | Viral infection, Acute Otitis Media, Gastroenteritis, Pneumonia, Bacterial infection | pain in my lower left belly with fever and i been constipate |
| 7391 | adult | UC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, Peritonsillar Abscess, GERD | sore throat came on fast now my child is leaning forward dro |
| 7405 | adult | ED | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 7424 | adult | UC | Alcohol Withdrawal | Delirium Tremens | Delirium Tremens, Substance Intoxication, Toxic/Metabolic Encephalopathy, UTI, Hypoglycemia | last drink was 2 days ago and now i got the shakes sweating  |
| 7440 | geri | PC | Iron Deficiency Anemia | Heart Failure | Heart Failure, COPD exacerbation, Asthma, Pneumonia, Pulmonary Embolism | been dragging for months short of breath going up stairs and |
| 7466 | geri | UC | Pulmonary Embolism | Atrial Fibrillation | Atrial Fibrillation, Cardiac Arrhythmia, Supraventricular Tachycardia, Panic Disorder, Anxiety | sharp pain in my chest every time i take a breath and my hea |
| 7468 | peds | ED | Urinary Tract Infection | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Syphilis, Trichomoniasis | i keep runnin to the bathroom but barely anything comes out  |
| 7469 | peds | UC | Appendicitis | Viral infection | Viral infection, Bacterial infection, UTI | pain in my stomach moved down to the right side and bumps in |
| 7474 | peds | ED | Congestive Heart Failure | Seizure | Seizure, New-Onset Epilepsy, Alcohol Withdrawal Seizure, Syncope, Febrile Seizure | cant walk to the mailbox without stopping to rest and my sho |
| 7475 | geri | UC | Deep Vein Thrombosis | Cellulitis | Cellulitis, Abscess, Contact Dermatitis, Erysipelas, Orbital Cellulitis | one leg is way bigger than the other and its warm and tender |
| 7477 | peds | ED | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Sepsis, Herniated Disc, Spinal Stenosis, Kidney Stone | hurts to pee and now my back is killing me and i got a high  |
| 7480 | peds | ED | Sepsis | Viral infection | Viral infection, Meningitis, Acute Otitis Media, Gastroenteritis, Pneumonia | fever wont break im shaking uncontrollably and my heart is r |
| 7482 | geri | PC | Pharyngitis | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Sepsis, Bacterial infection | hurts so bad to swallow even water and i got a fever |
| 7498 | peds | ED | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Medication side effect, Anxiety | been pooping black tar looking stuff and feel lightheaded |
| 7507 | geri | ED | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, Bone Lesions, Peritonsillar Abscess | sore throat came on fast now my child is leaning forward dro |
| 7521 | adult | PC | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 7526 | adult | UC | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Conjunctivitis, Allergic Reaction, Cellulitis | my kid has crusty honey colored sores around his mouth and n |
| 7528 | peds | ED | Atrial Fibrillation | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Medication side effect, Anxiety | my heart is all over the place beating fast and irregular fe |
| 7539 | geri | PC | Delirium Tremens | Temporal Arteritis | Temporal Arteritis, Meningitis, Stroke, Central Retinal Artery Occlusion, Retinal Detachment | stopped drinking and now im trembling cant think straight an |
| 7540 | peds | ED | Alcohol Withdrawal | Seizure | Seizure, New-Onset Epilepsy, Delirium Tremens, Syncope, Febrile Seizure | i quit drinking yesterday and my hands wont stop shaking and |
| 7541 | peds | UC | Opioid Overdose | Substance Intoxication | Substance Intoxication, Toxic/Metabolic Encephalopathy, UTI, Hypoglycemia, Sepsis | she took a bunch of pills and now shes barely breathing and  |
| 7544 | adult | UC | Bipolar Disorder — Manic Episode | Needs in-person evaluation | Needs in-person evaluation | i feel amazing like i can do anything havent needed sleep an |
| 7553 | adult | UC | Vasovagal Syncope | BPPV | BPPV, Acute Myocardial Infarction, Orthostatic hypotension, Vestibular neuritis, Cardiac Arrhythmia | got lightheaded at church felt hot and sweaty then next thin |
| 7554 | peds | PC | Urticaria | Viral Exanthem | Viral Exanthem, Contact Dermatitis, Conjunctivitis, Hand Foot and Mouth Disease, Allergic Reaction | took a new medicine yesterday and now i got bumps and itchy  |
| 7556 | geri | UC | Iron Deficiency Anemia | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Cardiac Arrhythmia | so tired i can barely function my periods have been super he |
| 7557 | adult | PC | Intimate Partner Violence | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | he punched me in the face again and i think my cheekbone mig |
| 7562 | adult | UC | HRT Side Effect — Mood/Psychiatric | DVT | DVT, Cellulitis, Venous Insufficiency, Musculoskeletal Strain, Lymphedema | started estrogen 3 months ago and now i get terrible headach |
| 7566 | geri | PC | Polypharmacy/Medication Effect | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | ever since they added that new medicine i feel woozy and uns |
| 7567 | adult | ED | Heat Exhaustion | Acute Myocardial Infarction | Acute Myocardial Infarction, BPPV, Vestibular neuritis, Orthostatic hypotension, Medication side effect | was working outside in the heat all day and now im dizzy nau |
| 7582 | peds | ED | Pulmonary Embolism | Viral URI | Viral URI, Bronchitis, Post-Bronchitic cough, Pneumonia, Asthma | i was just sittin there and suddenly couldnt breathe and sta |
| 7585 | adult | ED | Appendicitis | Gastroenteritis | Gastroenteritis, Food Poisoning, Bowel Obstruction, Medication Side Effect, Pregnancy (early) | started around my belly button now the pain moved to the low |
| 7588 | geri | ED | Migraine | Temporal Arteritis | Temporal Arteritis, Stroke, Central Retinal Artery Occlusion, Retinal Detachment, Amaurosis Fugax | my head is pounding so bad i cant see straight and lights ma |
| 7592 | adult | UC | COPD Exacerbation | Bronchitis | Bronchitis, ACE inhibitor cough, Viral URI, Asthma, Pneumonia | lungs feel like theyre on fire and i cant stop coughing gree |
| 7593 | adult | PC | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Herniated Disc, Cauda Equina Syndrome, Spinal Stenosis, Kidney Stone | fever of 103 and pain in my lower back plus burning when i u |
| 7595 | adult | UC | Diabetic Ketoacidosis | Depression | Depression, Hypothyroidism, Anemia, Electrolyte abnormality, Acute Nephritis | my sugar was over 500 and i feel terrible im so nauseous and |
| 7598 | adult | UC | Pharyngitis | Anaphylaxis | Anaphylaxis, Angioedema, ACE Inhibitor Angioedema, Food Allergy (severe), Hereditary Angioedema | sore throat is killing me and my glands are all swollen up |


## Failure Mode Breakdown

| Mode | Count | % of Total |
|---|---|---|
| Dead-end ("Needs in-person") | 3 | 0.5% |
| Viral over-generalization | 8 | 1.3% |
| Wrong diagnosis | 81 | 13.5% |
| API errors | 0 | 0.0% |

### Dead-End Cases

| Expected | CC (truncated) |
|---|---|
| Bipolar Disorder — Manic Episode (2) | i feel amazing like i can do anything havent needed sleep an |
| Urinary Tract Infection (1) | feels like peein razor blades and my pee smells awful |

### Viral Over-Generalization Cases

| Expected | CC (truncated) |
|---|---|
| Diverticulitis (2) | pain in my lower left belly with fever and i been constipate |
| Pharyngitis (2) | hurts so bad to swallow even water and i got a fever |
| Appendicitis (2) | sharp stabbing pain in my lower right belly and i got a feve |
| Sepsis (1) | fever wont break im shaking uncontrollably and my heart is r |
| Pulmonary Embolism (1) | i was just sittin there and suddenly couldnt breathe and sta |

## Per-Condition Accuracy

| Condition | Hits | Total | Accuracy | Primary Failure Mode |
|---|---|---|---|---|
| Temporal Arteritis | 0 | 5 | 0% | Iron Deficiency Anemia |
| Appendicitis | 1 | 6 | 17% | Gastroenteritis |
| COPD Exacerbation | 1 | 6 | 17% | Asthma |
| Diverticulitis | 1 | 5 | 20% | Viral infection |
| Epiglottitis | 1 | 5 | 20% | Viral Pharyngitis |
| Atrial Fibrillation | 1 | 5 | 20% | BPPV |
| Alcohol Withdrawal | 1 | 5 | 20% | Delirium Tremens |
| Iron Deficiency Anemia | 1 | 5 | 20% | Heart Failure |
| Pulmonary Embolism | 2 | 6 | 33% | Bronchitis |
| Pyelonephritis | 2 | 6 | 33% | Musculoskeletal strain |
| Pharyngitis | 2 | 6 | 33% | Viral infection |
| Gastrointestinal Bleeding | 2 | 5 | 40% | BPPV |
| Impetigo | 2 | 5 | 40% | Contact Dermatitis |
| Polypharmacy/Medication Effect | 2 | 5 | 40% | BPPV |
| Heat Exhaustion | 2 | 5 | 40% | BPPV |
| Sepsis | 3 | 6 | 50% | Atrial Fibrillation |
| Delirium Tremens | 3 | 5 | 60% | Temporal Arteritis |
| Opioid Overdose | 3 | 5 | 60% | Substance Intoxication |
| Bipolar Disorder — Manic Episode | 3 | 5 | 60% | Needs in-person evaluation |
| Vasovagal Syncope | 3 | 5 | 60% | BPPV |
| Urticaria | 3 | 5 | 60% | Contact Dermatitis |
| Intimate Partner Violence | 3 | 5 | 60% | Generalized Anxiety Disorder |
| HRT Side Effect — Mood/Psychiatric | 3 | 5 | 60% | DVT |
| Urinary Tract Infection | 4 | 6 | 67% | Needs in-person evaluation |
| Migraine | 4 | 6 | 67% | Temporal Arteritis |
| Nephrolithiasis | 4 | 6 | 67% | Chlamydia |
| Congestive Heart Failure | 4 | 6 | 67% | DVT |
| Deep Vein Thrombosis | 4 | 6 | 67% | Cellulitis |
| Cholecystitis | 4 | 5 | 80% | Gastroenteritis |
| Neuroleptic Malignant Syndrome | 4 | 5 | 80% | Meningitis |
| Simple Laceration | 4 | 5 | 80% | Hip Fracture |
| Lactation Mastitis | 4 | 5 | 80% | Chlamydia |
| Pneumonia | 5 | 6 | 83% | Bronchitis |
| Diabetic Ketoacidosis | 5 | 6 | 83% | Depression |
| Acute Myocardial Infarction | 6 | 6 | 100% | - |
| Stroke | 6 | 6 | 100% | - |
| Asthma | 6 | 6 | 100% | - |
| Gastroenteritis | 6 | 6 | 100% | - |
| Meningitis | 6 | 6 | 100% | - |
| Gout | 6 | 6 | 100% | - |
| Cellulitis | 6 | 6 | 100% | - |
| Bronchitis | 5 | 5 | 100% | - |
| Upper Respiratory Infection | 5 | 5 | 100% | - |
| Pneumothorax | 5 | 5 | 100% | - |
| Aortic Dissection | 5 | 5 | 100% | - |
| Subarachnoid Hemorrhage | 5 | 5 | 100% | - |
| Ectopic Pregnancy | 5 | 5 | 100% | - |
| Testicular Torsion | 5 | 5 | 100% | - |
| Pancreatitis | 5 | 5 | 100% | - |
| Croup | 5 | 5 | 100% | - |
| Otitis Media | 5 | 5 | 100% | - |
| Febrile Seizure | 5 | 5 | 100% | - |
| Hip Fracture | 5 | 5 | 100% | - |
| Constipation | 5 | 5 | 100% | - |
| Benign Paroxysmal Positional Vertigo | 5 | 5 | 100% | - |
| Anaphylaxis | 5 | 5 | 100% | - |
| Preeclampsia | 5 | 5 | 100% | - |
| Cauda Equina Syndrome | 5 | 5 | 100% | - |
| Peritonsillar Abscess | 5 | 5 | 100% | - |
| Nursemaid Elbow | 5 | 5 | 100% | - |
| Pyloric Stenosis | 5 | 5 | 100% | - |
| Henoch-Schonlein Purpura | 5 | 5 | 100% | - |
| Slipped Capital Femoral Epiphysis | 5 | 5 | 100% | - |
| Kawasaki Disease | 5 | 5 | 100% | - |
| Intussusception | 5 | 5 | 100% | - |
| Ovarian Torsion | 5 | 5 | 100% | - |
| Placental Abruption | 5 | 5 | 100% | - |
| Tension Pneumothorax | 5 | 5 | 100% | - |
| Status Epilepticus | 5 | 5 | 100% | - |
| Addison Crisis | 5 | 5 | 100% | - |
| Thyroid Storm | 5 | 5 | 100% | - |
| Rhabdomyolysis | 5 | 5 | 100% | - |
| Corneal Abrasion | 5 | 5 | 100% | - |
| Orbital Cellulitis | 5 | 5 | 100% | - |
| Mesenteric Ischemia | 5 | 5 | 100% | - |
| Subdural Hematoma | 5 | 5 | 100% | - |
| Shingles | 5 | 5 | 100% | - |
| Hand Foot and Mouth Disease | 5 | 5 | 100% | - |
| Bronchiolitis | 5 | 5 | 100% | - |
| Depression | 5 | 5 | 100% | - |
| Panic Attack | 5 | 5 | 100% | - |
| Sciatica | 5 | 5 | 100% | - |
| Bowel Obstruction | 5 | 5 | 100% | - |
| Hemorrhoids | 5 | 5 | 100% | - |
| Hypothyroidism | 5 | 5 | 100% | - |
| Peripheral Neuropathy | 5 | 5 | 100% | - |
| Plantar Fasciitis | 5 | 5 | 100% | - |
| Carpal Tunnel Syndrome | 5 | 5 | 100% | - |
| Fibromyalgia | 5 | 5 | 100% | - |
| Opioid Withdrawal | 5 | 5 | 100% | - |
| Cannabinoid Hyperemesis Syndrome | 5 | 5 | 100% | - |
| Psychotic Disorder | 5 | 5 | 100% | - |
| Stimulant Intoxication | 5 | 5 | 100% | - |
| Wernicke Encephalopathy | 5 | 5 | 100% | - |
| Hepatic Encephalopathy | 5 | 5 | 100% | - |
| Serotonin Syndrome | 5 | 5 | 100% | - |
| ADEM | 5 | 5 | 100% | - |
| Dental Abscess | 5 | 5 | 100% | - |
| Sexual Assault | 5 | 5 | 100% | - |
| Erectile Dysfunction | 5 | 5 | 100% | - |
| Dyspareunia | 5 | 5 | 100% | - |
| Chlamydia | 5 | 5 | 100% | - |
| Postpartum Depression | 5 | 5 | 100% | - |
| Colic | 5 | 5 | 100% | - |
| Dog/Cat Bite | 5 | 5 | 100% | - |
| Esophageal Foreign Body | 5 | 5 | 100% | - |
| Acute Urinary Retention | 5 | 5 | 100% | - |
| Inguinal Hernia | 5 | 5 | 100% | - |
| Second Degree Burn | 5 | 5 | 100% | - |
| Insomnia Disorder | 5 | 5 | 100% | - |
| Obstructive Sleep Apnea | 5 | 5 | 100% | - |
| Malignancy | 5 | 5 | 100% | - |
| Fibrocystic Breast Changes | 5 | 5 | 100% | - |
| Irritant Contact Diaper Dermatitis | 5 | 5 | 100% | - |
| Hypothermia | 5 | 5 | 100% | - |
| Laceration/Crush Injury | 5 | 5 | 100% | - |

