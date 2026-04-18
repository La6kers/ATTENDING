# COMPASS Stress Test — 600 API Cases (v21)

**Date:** 2026-04-18T04:46:26.953Z
**Endpoint:** http://localhost:3005/api/diagnose
**Total cases:** 600

## Overall Accuracy

| Metric | Value |
|---|---|
| **Hits (primary or top-5)** | 557 |
| **Misses** | 43 |
| **Errors** | 0 |
| **Accuracy** | **92.8%** |

## By Demographic

| Demo | Hits | Total | Accuracy |
|---|---|---|---|
| adult | 231 | 250 | 92.4% |
| geri | 185 | 200 | 92.5% |
| peds | 141 | 150 | 94.0% |

## By Setting

| Setting | Hits | Total | Accuracy |
|---|---|---|---|
| ED | 188 | 200 | 94.0% |
| UC | 184 | 200 | 92.0% |
| PC | 185 | 200 | 92.5% |

## Latency

| Percentile | ms |
|---|---|
| p50 | 10 |
| p95 | 13 |
| p99 | 21 |

## Top 10 Most-Missed Conditions

| Condition | Misses |
|---|---|
| Pneumothorax | 5 |
| Constipation | 5 |
| Tension Pneumothorax | 5 |
| Panic Attack | 5 |
| Insomnia Disorder | 5 |
| Malignancy | 5 |
| Diverticulitis | 2 |
| Opioid Overdose | 2 |
| Diabetic Ketoacidosis | 2 |
| Temporal Arteritis | 1 |

## Top 10 Most-Reliable Conditions (100% hit rate, n>=2)

| Condition | Hits/Total |
|---|---|
| Acute Myocardial Infarction | 6/6 |
| Stroke | 6/6 |
| Pulmonary Embolism | 6/6 |
| Pneumonia | 6/6 |
| Asthma | 6/6 |
| Gastroenteritis | 6/6 |
| Migraine | 6/6 |
| Nephrolithiasis | 6/6 |
| Deep Vein Thrombosis | 6/6 |
| Pyelonephritis | 6/6 |

## All Misses

| ID | Demo | Setting | Expected | Got (Primary) | Top 5 | CC |
|---|---|---|---|---|---|---|
| 8022 | geri | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, Acute Coronary Syndrome, GERD | sharp chest pain outta nowhere and now i cant take a full br |
| 8035 | geri | PC | Constipation | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Appendicitis | cant go to the bathroom belly is hard and hurts |
| 8050 | geri | PC | Tension Pneumothorax | Needs in-person evaluation | Needs in-person evaluation | got hit in the chest and now i can barely breathe and feel l |
| 8057 | peds | ED | Temporal Arteritis | Migraine | Migraine, Tension headache, Sinusitis, Medication overuse headache, Meningitis | my temple area is tender and throbbing and i noticed my visi |
| 8066 | geri | ED | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 8109 | geri | UC | Insomnia Disorder | Hip Fracture | Hip Fracture, Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | tossing and turning all night cant fall asleep or stay aslee |
| 8111 | adult | ED | Malignancy | Seizure | Seizure, New-Onset Epilepsy, Syncope, Stroke, Alcohol Withdrawal Seizure | been losing weight like crazy clothes dont fit anymore and i |
| 8121 | geri | UC | Appendicitis | Viral infection | Viral infection, Bacterial infection, UTI | my right side is killing me i cant even stand up straight |
| 8138 | adult | ED | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, GERD, Costochondritis, Anxiety | sharp chest pain outta nowhere and now i cant take a full br |
| 8143 | peds | PC | Diverticulitis | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Appendicitis, Mesenteric Adenitis | belly pain on the lower left that gets worse and i dont wann |
| 8151 | geri | UC | Constipation | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Appendicitis | cant go to the bathroom belly is hard and hurts |
| 8166 | adult | UC | Tension Pneumothorax | Needs in-person evaluation | Needs in-person evaluation | got hit in the chest and now i can barely breathe and feel l |
| 8182 | peds | PC | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 8193 | adult | UC | Opioid Overdose | Major Depressive Disorder | Major Depressive Disorder, Generalized Anxiety Disorder, Adjustment Disorder | she took a bunch of pills and now shes barely breathing and  |
| 8225 | geri | ED | Insomnia Disorder | Fracture | Fracture, Hip Fracture, Traumatic Brain Injury, Soft Tissue Injury, Rib Fracture | tossing and turning all night cant fall asleep or stay aslee |
| 8227 | geri | PC | Malignancy | Seizure | Seizure, New-Onset Epilepsy, Syncope, Stroke, Alcohol Withdrawal Seizure | been losing weight like crazy clothes dont fit anymore and i |
| 8236 | geri | PC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | feels like peein razor blades and my pee smells awful |
| 8247 | geri | UC | Diabetic Ketoacidosis | Depression | Depression, Anemia, Hypothyroidism, Electrolyte abnormality, Stroke | my sugar was over 500 and i feel terrible im so nauseous and |
| 8254 | peds | PC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, GERD, Costochondritis, Pneumonia | sharp chest pain outta nowhere and now i cant take a full br |
| 8267 | adult | ED | Constipation | Gastroenteritis | Gastroenteritis, GERD, Appendicitis, Cholecystitis, Ectopic Pregnancy | cant go to the bathroom belly is hard and hurts |
| 8282 | peds | ED | Tension Pneumothorax | Needs in-person evaluation | Needs in-person evaluation | got hit in the chest and now i can barely breathe and feel l |
| 8298 | adult | UC | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 8308 | adult | PC | Alcohol Withdrawal | Atrial Fibrillation | Atrial Fibrillation, Supraventricular Tachycardia, Cardiac Arrhythmia, Panic Disorder, Anxiety | trying to detox from alcohol at home and im shaking anxious  |
| 8334 | geri | UC | Polypharmacy/Medication Effect | BPPV | BPPV, Vestibular neuritis, Orthostatic hypotension | keep losing my balance fell three times this week and im on  |
| 8341 | adult | PC | Insomnia Disorder | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | tossing and turning all night cant fall asleep or stay aslee |
| 8343 | peds | UC | Malignancy | Febrile Seizure | Febrile Seizure, Seizure, New-Onset Epilepsy, Syncope, Meningitis | been losing weight like crazy clothes dont fit anymore and i |
| 8370 | geri | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, GERD, Acute Coronary Syndrome | sharp chest pain outta nowhere and now i cant take a full br |
| 8383 | adult | PC | Constipation | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Appendicitis, Ectopic Pregnancy | cant go to the bathroom belly is hard and hurts |
| 8398 | adult | PC | Tension Pneumothorax | Needs in-person evaluation | Needs in-person evaluation | got hit in the chest and now i can barely breathe and feel l |
| 8414 | peds | ED | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 8457 | adult | UC | Insomnia Disorder | Fracture | Fracture, Soft Tissue Injury, Hip Fracture, Rib Fracture, Traumatic Brain Injury | tossing and turning all night cant fall asleep or stay aslee |
| 8459 | adult | ED | Malignancy | Seizure | Seizure, New-Onset Epilepsy, Alcohol Withdrawal Seizure, Stroke, Syncope | been losing weight like crazy clothes dont fit anymore and i |
| 8474 | geri | ED | Congestive Heart Failure | Seizure | Seizure, New-Onset Epilepsy, Alcohol Withdrawal Seizure, Stroke, Syncope | cant walk to the mailbox without stopping to rest and my sho |
| 8476 | peds | PC | COPD Exacerbation | Asthma | Asthma, Pneumonia, Anxiety, Pulmonary Embolism, Anemia | breathing is worse than ever my inhaler aint helping like it |
| 8486 | adult | ED | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, GERD, Costochondritis, Anxiety | sharp chest pain outta nowhere and now i cant take a full br |
| 8491 | peds | PC | Diverticulitis | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Cholecystitis, Mesenteric Adenitis | belly pain on the lower left that gets worse and i dont wann |
| 8499 | adult | UC | Constipation | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Diverticulitis, Peptic Ulcer | cant go to the bathroom belly is hard and hurts |
| 8514 | geri | UC | Tension Pneumothorax | Needs in-person evaluation | Needs in-person evaluation | got hit in the chest and now i can barely breathe and feel l |
| 8530 | adult | PC | Panic Attack | Pulmonary Embolism | Pulmonary Embolism, Primary Spontaneous Pneumothorax, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 8541 | adult | UC | Opioid Overdose | Major Depressive Disorder | Major Depressive Disorder, Generalized Anxiety Disorder, Adjustment Disorder | she took a bunch of pills and now shes barely breathing and  |
| 8573 | adult | ED | Insomnia Disorder | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | tossing and turning all night cant fall asleep or stay aslee |
| 8575 | adult | PC | Malignancy | Seizure | Seizure, Alcohol Withdrawal Seizure, New-Onset Epilepsy, Syncope, Stroke | been losing weight like crazy clothes dont fit anymore and i |
| 8595 | adult | UC | Diabetic Ketoacidosis | Depression | Depression, Anemia, Hypothyroidism, Electrolyte abnormality, Acute Nephritis | my sugar was over 500 and i feel terrible im so nauseous and |


## Failure Mode Breakdown

| Mode | Count | % of Total |
|---|---|---|
| Dead-end ("Needs in-person") | 6 | 1.0% |
| Viral over-generalization | 1 | 0.2% |
| Wrong diagnosis | 36 | 6.0% |
| API errors | 0 | 0.0% |

### Dead-End Cases

| Expected | CC (truncated) |
|---|---|
| Tension Pneumothorax (5) | got hit in the chest and now i can barely breathe and feel l |
| Urinary Tract Infection (1) | feels like peein razor blades and my pee smells awful |

### Viral Over-Generalization Cases

| Expected | CC (truncated) |
|---|---|
| Appendicitis (1) | my right side is killing me i cant even stand up straight |

## Per-Condition Accuracy

| Condition | Hits | Total | Accuracy | Primary Failure Mode |
|---|---|---|---|---|
| Pneumothorax | 0 | 5 | 0% | Musculoskeletal pain |
| Constipation | 0 | 5 | 0% | Gastroenteritis |
| Tension Pneumothorax | 0 | 5 | 0% | Needs in-person evaluation |
| Panic Attack | 0 | 5 | 0% | Primary Spontaneous Pneumothorax |
| Insomnia Disorder | 0 | 5 | 0% | Fracture |
| Malignancy | 0 | 5 | 0% | Seizure |
| Diverticulitis | 3 | 5 | 60% | Gastroenteritis |
| Opioid Overdose | 3 | 5 | 60% | Major Depressive Disorder |
| Diabetic Ketoacidosis | 4 | 6 | 67% | Depression |
| Temporal Arteritis | 4 | 5 | 80% | Migraine |
| Alcohol Withdrawal | 4 | 5 | 80% | Atrial Fibrillation |
| Polypharmacy/Medication Effect | 4 | 5 | 80% | BPPV |
| Urinary Tract Infection | 5 | 6 | 83% | Needs in-person evaluation |
| Appendicitis | 5 | 6 | 83% | Viral infection |
| Congestive Heart Failure | 5 | 6 | 83% | Seizure |
| COPD Exacerbation | 5 | 6 | 83% | Asthma |
| Acute Myocardial Infarction | 6 | 6 | 100% | - |
| Stroke | 6 | 6 | 100% | - |
| Pulmonary Embolism | 6 | 6 | 100% | - |
| Pneumonia | 6 | 6 | 100% | - |
| Asthma | 6 | 6 | 100% | - |
| Gastroenteritis | 6 | 6 | 100% | - |
| Migraine | 6 | 6 | 100% | - |
| Nephrolithiasis | 6 | 6 | 100% | - |
| Deep Vein Thrombosis | 6 | 6 | 100% | - |
| Pyelonephritis | 6 | 6 | 100% | - |
| Meningitis | 6 | 6 | 100% | - |
| Sepsis | 6 | 6 | 100% | - |
| Gout | 6 | 6 | 100% | - |
| Pharyngitis | 6 | 6 | 100% | - |
| Cellulitis | 6 | 6 | 100% | - |
| Bronchitis | 5 | 5 | 100% | - |
| Upper Respiratory Infection | 5 | 5 | 100% | - |
| Aortic Dissection | 5 | 5 | 100% | - |
| Subarachnoid Hemorrhage | 5 | 5 | 100% | - |
| Ectopic Pregnancy | 5 | 5 | 100% | - |
| Testicular Torsion | 5 | 5 | 100% | - |
| Pancreatitis | 5 | 5 | 100% | - |
| Cholecystitis | 5 | 5 | 100% | - |
| Croup | 5 | 5 | 100% | - |
| Otitis Media | 5 | 5 | 100% | - |
| Febrile Seizure | 5 | 5 | 100% | - |
| Hip Fracture | 5 | 5 | 100% | - |
| Gastrointestinal Bleeding | 5 | 5 | 100% | - |
| Benign Paroxysmal Positional Vertigo | 5 | 5 | 100% | - |
| Anaphylaxis | 5 | 5 | 100% | - |
| Preeclampsia | 5 | 5 | 100% | - |
| Cauda Equina Syndrome | 5 | 5 | 100% | - |
| Peritonsillar Abscess | 5 | 5 | 100% | - |
| Nursemaid Elbow | 5 | 5 | 100% | - |
| Pyloric Stenosis | 5 | 5 | 100% | - |
| Epiglottitis | 5 | 5 | 100% | - |
| Henoch-Schonlein Purpura | 5 | 5 | 100% | - |
| Slipped Capital Femoral Epiphysis | 5 | 5 | 100% | - |
| Kawasaki Disease | 5 | 5 | 100% | - |
| Intussusception | 5 | 5 | 100% | - |
| Ovarian Torsion | 5 | 5 | 100% | - |
| Placental Abruption | 5 | 5 | 100% | - |
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
| Impetigo | 5 | 5 | 100% | - |
| Bronchiolitis | 5 | 5 | 100% | - |
| Atrial Fibrillation | 5 | 5 | 100% | - |
| Depression | 5 | 5 | 100% | - |
| Sciatica | 5 | 5 | 100% | - |
| Bowel Obstruction | 5 | 5 | 100% | - |
| Hemorrhoids | 5 | 5 | 100% | - |
| Hypothyroidism | 5 | 5 | 100% | - |
| Peripheral Neuropathy | 5 | 5 | 100% | - |
| Plantar Fasciitis | 5 | 5 | 100% | - |
| Carpal Tunnel Syndrome | 5 | 5 | 100% | - |
| Fibromyalgia | 5 | 5 | 100% | - |
| Delirium Tremens | 5 | 5 | 100% | - |
| Opioid Withdrawal | 5 | 5 | 100% | - |
| Cannabinoid Hyperemesis Syndrome | 5 | 5 | 100% | - |
| Bipolar Disorder — Manic Episode | 5 | 5 | 100% | - |
| Psychotic Disorder | 5 | 5 | 100% | - |
| Stimulant Intoxication | 5 | 5 | 100% | - |
| Wernicke Encephalopathy | 5 | 5 | 100% | - |
| Hepatic Encephalopathy | 5 | 5 | 100% | - |
| Serotonin Syndrome | 5 | 5 | 100% | - |
| Neuroleptic Malignant Syndrome | 5 | 5 | 100% | - |
| ADEM | 5 | 5 | 100% | - |
| Dental Abscess | 5 | 5 | 100% | - |
| Vasovagal Syncope | 5 | 5 | 100% | - |
| Urticaria | 5 | 5 | 100% | - |
| Simple Laceration | 5 | 5 | 100% | - |
| Iron Deficiency Anemia | 5 | 5 | 100% | - |
| Intimate Partner Violence | 5 | 5 | 100% | - |
| Sexual Assault | 5 | 5 | 100% | - |
| Erectile Dysfunction | 5 | 5 | 100% | - |
| Dyspareunia | 5 | 5 | 100% | - |
| Chlamydia | 5 | 5 | 100% | - |
| HRT Side Effect — Mood/Psychiatric | 5 | 5 | 100% | - |
| Lactation Mastitis | 5 | 5 | 100% | - |
| Postpartum Depression | 5 | 5 | 100% | - |
| Colic | 5 | 5 | 100% | - |
| Heat Exhaustion | 5 | 5 | 100% | - |
| Dog/Cat Bite | 5 | 5 | 100% | - |
| Esophageal Foreign Body | 5 | 5 | 100% | - |
| Acute Urinary Retention | 5 | 5 | 100% | - |
| Inguinal Hernia | 5 | 5 | 100% | - |
| Second Degree Burn | 5 | 5 | 100% | - |
| Obstructive Sleep Apnea | 5 | 5 | 100% | - |
| Fibrocystic Breast Changes | 5 | 5 | 100% | - |
| Irritant Contact Diaper Dermatitis | 5 | 5 | 100% | - |
| Hypothermia | 5 | 5 | 100% | - |
| Laceration/Crush Injury | 5 | 5 | 100% | - |

