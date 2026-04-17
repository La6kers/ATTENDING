# COMPASS Stress Test — 600 API Cases (v20)

**Date:** 2026-04-17T04:43:58.017Z
**Endpoint:** http://localhost:3005/api/diagnose
**Total cases:** 600

## Overall Accuracy

| Metric | Value |
|---|---|
| **Hits (primary or top-5)** | 560 |
| **Misses** | 40 |
| **Errors** | 0 |
| **Accuracy** | **93.3%** |

## By Demographic

| Demo | Hits | Total | Accuracy |
|---|---|---|---|
| adult | 235 | 250 | 94.0% |
| geri | 189 | 200 | 94.5% |
| peds | 136 | 150 | 90.7% |

## By Setting

| Setting | Hits | Total | Accuracy |
|---|---|---|---|
| ED | 189 | 200 | 94.5% |
| UC | 184 | 200 | 92.0% |
| PC | 187 | 200 | 93.5% |

## Latency

| Percentile | ms |
|---|---|
| p50 | 14 |
| p95 | 29 |
| p99 | 55 |

## Top 10 Most-Missed Conditions

| Condition | Misses |
|---|---|
| Congestive Heart Failure | 4 |
| Appendicitis | 4 |
| Sepsis | 3 |
| Gout | 2 |
| Gastrointestinal Bleeding | 2 |
| Delirium Tremens | 2 |
| Bipolar Disorder — Manic Episode | 2 |
| Iron Deficiency Anemia | 2 |
| Intimate Partner Violence | 2 |
| Lactation Mastitis | 2 |

## Top 10 Most-Reliable Conditions (100% hit rate, n>=2)

| Condition | Hits/Total |
|---|---|
| Acute Myocardial Infarction | 6/6 |
| Stroke | 6/6 |
| Pneumonia | 6/6 |
| Asthma | 6/6 |
| Gastroenteritis | 6/6 |
| Migraine | 6/6 |
| Nephrolithiasis | 6/6 |
| Deep Vein Thrombosis | 6/6 |
| Pyelonephritis | 6/6 |
| Meningitis | 6/6 |

## All Misses

| ID | Demo | Setting | Expected | Got (Primary) | Top 5 | CC |
|---|---|---|---|---|---|---|
| 8010 | peds | UC | Congestive Heart Failure | Asthma | Asthma, Pneumonia, Pulmonary Embolism, Anxiety, Pneumothorax | my ankles are huge and i cant breathe when i lay down at nig |
| 8121 | adult | UC | Appendicitis | Kidney Stone | Kidney Stone, Pyelonephritis, UTI, Musculoskeletal Strain, Abdominal Aortic Aneurysm | my right side is killing me i cant even stand up straight |
| 8126 | adult | ED | Congestive Heart Failure | DVT | DVT, Cellulitis, Musculoskeletal Strain, Venous Insufficiency, Baker's Cyst Rupture | keep waking up at night gasping for air and my legs are swol |
| 8132 | adult | ED | Sepsis | Atrial Fibrillation | Atrial Fibrillation, Supraventricular Tachycardia, Cardiac Arrhythmia, Panic Disorder, Anxiety | infection got real bad now im lightheaded heart pounding fev |
| 8133 | peds | UC | Gout | Plantar Fasciitis | Plantar Fasciitis, Ankle Sprain, Stress Fracture, Peripheral Neuropathy, Morton Neuroma | toe joint blew up overnight cant walk on it and its bright r |
| 8150 | geri | ED | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | been pooping black tar looking stuff and feel lightheaded |
| 8180 | peds | ED | Atrial Fibrillation | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 8191 | peds | PC | Delirium Tremens | Meningitis | Meningitis, Central Retinal Artery Occlusion, Retinal Detachment, Stroke, Amaurosis Fugax | stopped drinking and now im trembling cant think straight an |
| 8196 | geri | UC | Bipolar Disorder — Manic Episode | Needs in-person evaluation | Needs in-person evaluation | i feel amazing like i can do anything havent needed sleep an |
| 8208 | geri | UC | Iron Deficiency Anemia | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Cardiac Arrhythmia | so tired i can barely function my periods have been super he |
| 8209 | geri | PC | Intimate Partner Violence | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | he punched me in the face again and i think my cheekbone mig |
| 8215 | peds | PC | Lactation Mastitis | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Trichomoniasis, Bacterial Vaginosis | had a clogged duct that turned into my whole breast being re |
| 8234 | peds | ED | Pulmonary Embolism | Asthma | Asthma, Pneumonia, Viral URI | feel like im suffocating and theres this stabbing pain on th |
| 8236 | geri | PC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | feels like peein razor blades and my pee smells awful |
| 8237 | geri | ED | Appendicitis | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Diverticulitis, Peptic Ulcer | belly pain thats getting worse especially on the lower right |
| 8244 | peds | UC | COPD Exacerbation | Viral URI | Viral URI, Bronchitis, Post-Bronchitic cough, Asthma, Pneumonia | lungs feel like theyre on fire and i cant stop coughing gree |
| 8248 | geri | PC | Sepsis | Atrial Fibrillation | Atrial Fibrillation, Supraventricular Tachycardia, Cardiac Arrhythmia, Panic Disorder, Anxiety | had a cut that got infected now i feel terrible fever racing |
| 8249 | peds | ED | Gout | Trauma | Trauma, Cellulitis, Septic Arthritis, Reactive Arthritis, Bursitis | my big toe is swollen red and hurts so bad i cant even put a |
| 8250 | geri | UC | Pharyngitis | Anaphylaxis | Anaphylaxis, Angioedema, ACE Inhibitor Angioedema, Food Allergy (severe), Hereditary Angioedema | sore throat is killing me and my glands are all swollen up |
| 8259 | adult | UC | Diverticulitis | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Peptic Ulcer, Mesenteric Adenitis | left side of my gut hurts and i got a fever and feel bloated |
| 8323 | adult | PC | Simple Laceration | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | my kid fell on the playground and split his chin open its ga |
| 8334 | adult | UC | Polypharmacy/Medication Effect | BPPV | BPPV, Vestibular neuritis, Orthostatic hypotension | keep losing my balance fell three times this week and im on  |
| 8353 | adult | PC | Appendicitis | Viral infection | Viral infection, UTI, Pneumonia, Gastroenteritis, Bacterial infection | sharp stabbing pain in my lower right belly and i got a feve |
| 8358 | peds | UC | Congestive Heart Failure | Iron Deficiency Anemia | Iron Deficiency Anemia, Asthma, Pulmonary Embolism, Pneumonia, Anxiety | so short of breath climbing stairs and my feet look like bal |
| 8466 | geri | UC | Pulmonary Embolism | Atrial Fibrillation | Atrial Fibrillation, Cardiac Arrhythmia, Supraventricular Tachycardia, Panic Disorder, Anxiety | sharp pain in my chest every time i take a breath and my hea |
| 8468 | peds | ED | Urinary Tract Infection | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Trichomoniasis, Bacterial Vaginosis | i keep runnin to the bathroom but barely anything comes out  |
| 8469 | geri | UC | Appendicitis | Viral infection | Viral infection, Bacterial infection, UTI | pain in my stomach moved down to the right side and bumps in |
| 8474 | adult | ED | Congestive Heart Failure | Seizure | Seizure, New-Onset Epilepsy, Syncope, Stroke, Alcohol Withdrawal Seizure | cant walk to the mailbox without stopping to rest and my sho |
| 8476 | peds | PC | COPD Exacerbation | Pneumonia | Pneumonia, Asthma, Viral URI | breathing is worse than ever my inhaler aint helping like it |
| 8480 | adult | ED | Sepsis | Viral infection | Viral infection, Meningitis, Pneumonia, Gastroenteritis, Bacterial infection | fever wont break im shaking uncontrollably and my heart is r |
| 8491 | adult | PC | Diverticulitis | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Cholecystitis, Ectopic Pregnancy | belly pain on the lower left that gets worse and i dont wann |
| 8493 | geri | UC | Cholecystitis | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Appendicitis | right upper belly pain that goes to my shoulder and i feel s |
| 8498 | adult | ED | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | been pooping black tar looking stuff and feel lightheaded |
| 8521 | peds | PC | Temporal Arteritis | Tension headache | Tension headache, Migraine, Sinusitis, Cluster headache, Medication overuse headache | my temple area is tender and throbbing and i noticed my visi |
| 8539 | adult | PC | Delirium Tremens | Temporal Arteritis | Temporal Arteritis, Meningitis, Stroke, Central Retinal Artery Occlusion, Retinal Detachment | stopped drinking and now im trembling cant think straight an |
| 8544 | peds | UC | Bipolar Disorder — Manic Episode | Needs in-person evaluation | Needs in-person evaluation | i feel amazing like i can do anything havent needed sleep an |
| 8556 | peds | UC | Iron Deficiency Anemia | BPPV | BPPV, Anxiety, Orthostatic hypotension, Vestibular neuritis, Medication side effect | so tired i can barely function my periods have been super he |
| 8557 | adult | PC | Intimate Partner Violence | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | he punched me in the face again and i think my cheekbone mig |
| 8563 | adult | PC | Lactation Mastitis | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Trichomoniasis, Bacterial Vaginosis | had a clogged duct that turned into my whole breast being re |
| 8598 | adult | UC | Pharyngitis | Anaphylaxis | Anaphylaxis, Angioedema, ACE Inhibitor Angioedema, Food Allergy (severe), Hereditary Angioedema | sore throat is killing me and my glands are all swollen up |


## Failure Mode Breakdown

| Mode | Count | % of Total |
|---|---|---|
| Dead-end ("Needs in-person") | 3 | 0.5% |
| Viral over-generalization | 4 | 0.7% |
| Wrong diagnosis | 33 | 5.5% |
| API errors | 0 | 0.0% |

### Dead-End Cases

| Expected | CC (truncated) |
|---|---|
| Bipolar Disorder — Manic Episode (2) | i feel amazing like i can do anything havent needed sleep an |
| Urinary Tract Infection (1) | feels like peein razor blades and my pee smells awful |

### Viral Over-Generalization Cases

| Expected | CC (truncated) |
|---|---|
| Appendicitis (2) | sharp stabbing pain in my lower right belly and i got a feve |
| COPD Exacerbation (1) | lungs feel like theyre on fire and i cant stop coughing gree |
| Sepsis (1) | fever wont break im shaking uncontrollably and my heart is r |

## Per-Condition Accuracy

| Condition | Hits | Total | Accuracy | Primary Failure Mode |
|---|---|---|---|---|
| Appendicitis | 2 | 6 | 33% | Viral infection |
| Congestive Heart Failure | 2 | 6 | 33% | Asthma |
| Sepsis | 3 | 6 | 50% | Atrial Fibrillation |
| Diverticulitis | 3 | 5 | 60% | Gastroenteritis |
| Gastrointestinal Bleeding | 3 | 5 | 60% | BPPV |
| Delirium Tremens | 3 | 5 | 60% | Meningitis |
| Bipolar Disorder — Manic Episode | 3 | 5 | 60% | Needs in-person evaluation |
| Iron Deficiency Anemia | 3 | 5 | 60% | BPPV |
| Intimate Partner Violence | 3 | 5 | 60% | Generalized Anxiety Disorder |
| Lactation Mastitis | 3 | 5 | 60% | Chlamydia |
| Pulmonary Embolism | 4 | 6 | 67% | Asthma |
| Urinary Tract Infection | 4 | 6 | 67% | Needs in-person evaluation |
| COPD Exacerbation | 4 | 6 | 67% | Viral URI |
| Gout | 4 | 6 | 67% | Plantar Fasciitis |
| Pharyngitis | 4 | 6 | 67% | Anaphylaxis |
| Cholecystitis | 4 | 5 | 80% | Gastroenteritis |
| Temporal Arteritis | 4 | 5 | 80% | Tension headache |
| Atrial Fibrillation | 4 | 5 | 80% | BPPV |
| Simple Laceration | 4 | 5 | 80% | Fracture |
| Polypharmacy/Medication Effect | 4 | 5 | 80% | BPPV |
| Acute Myocardial Infarction | 6 | 6 | 100% | - |
| Stroke | 6 | 6 | 100% | - |
| Pneumonia | 6 | 6 | 100% | - |
| Asthma | 6 | 6 | 100% | - |
| Gastroenteritis | 6 | 6 | 100% | - |
| Migraine | 6 | 6 | 100% | - |
| Nephrolithiasis | 6 | 6 | 100% | - |
| Deep Vein Thrombosis | 6 | 6 | 100% | - |
| Pyelonephritis | 6 | 6 | 100% | - |
| Meningitis | 6 | 6 | 100% | - |
| Diabetic Ketoacidosis | 6 | 6 | 100% | - |
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
| Epiglottitis | 5 | 5 | 100% | - |
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
| Impetigo | 5 | 5 | 100% | - |
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
| Alcohol Withdrawal | 5 | 5 | 100% | - |
| Opioid Overdose | 5 | 5 | 100% | - |
| Opioid Withdrawal | 5 | 5 | 100% | - |
| Cannabinoid Hyperemesis Syndrome | 5 | 5 | 100% | - |
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
| Sexual Assault | 5 | 5 | 100% | - |
| Erectile Dysfunction | 5 | 5 | 100% | - |
| Dyspareunia | 5 | 5 | 100% | - |
| Chlamydia | 5 | 5 | 100% | - |
| HRT Side Effect — Mood/Psychiatric | 5 | 5 | 100% | - |
| Postpartum Depression | 5 | 5 | 100% | - |
| Colic | 5 | 5 | 100% | - |
| Heat Exhaustion | 5 | 5 | 100% | - |
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

