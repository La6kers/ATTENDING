# COMPASS Stress Test — 600 API Cases (v21)

**Date:** 2026-04-17T05:11:11.545Z
**Endpoint:** http://localhost:3005/api/diagnose
**Total cases:** 600

## Overall Accuracy

| Metric | Value |
|---|---|
| **Hits (primary or top-5)** | 589 |
| **Misses** | 11 |
| **Errors** | 0 |
| **Accuracy** | **98.2%** |

## By Demographic

| Demo | Hits | Total | Accuracy |
|---|---|---|---|
| adult | 246 | 250 | 98.4% |
| peds | 144 | 150 | 96.0% |
| geri | 199 | 200 | 99.5% |

## By Setting

| Setting | Hits | Total | Accuracy |
|---|---|---|---|
| ED | 196 | 200 | 98.0% |
| UC | 197 | 200 | 98.5% |
| PC | 196 | 200 | 98.0% |

## Latency

| Percentile | ms |
|---|---|
| p50 | 8 |
| p95 | 11 |
| p99 | 17 |

## Top 10 Most-Missed Conditions

| Condition | Misses |
|---|---|
| COPD Exacerbation | 3 |
| Diverticulitis | 2 |
| Gout | 2 |
| Temporal Arteritis | 1 |
| Urinary Tract Infection | 1 |
| Diabetic Ketoacidosis | 1 |
| Polypharmacy/Medication Effect | 1 |

## Top 10 Most-Reliable Conditions (100% hit rate, n>=2)

| Condition | Hits/Total |
|---|---|
| Acute Myocardial Infarction | 6/6 |
| Stroke | 6/6 |
| Pulmonary Embolism | 6/6 |
| Pneumonia | 6/6 |
| Appendicitis | 6/6 |
| Asthma | 6/6 |
| Gastroenteritis | 6/6 |
| Migraine | 6/6 |
| Nephrolithiasis | 6/6 |
| Congestive Heart Failure | 6/6 |

## All Misses

| ID | Demo | Setting | Expected | Got (Primary) | Top 5 | CC |
|---|---|---|---|---|---|---|
| 8012 | peds | ED | COPD Exacerbation | Asthma | Asthma, Bronchi, Pneumonia, Post-infectious cough, Pulmonary Embolism | my copd is acting up cant breathe and coughing way more than |
| 8057 | peds | ED | Temporal Arteritis | Migraine | Migraine, Tension headache, Sinusitis, Cluster headache, Medication overuse headache | my temple area is tender and throbbing and i noticed my visi |
| 8143 | adult | PC | Diverticulitis | Gastroenteritis | Gastroenteritis, GERD, Appendicitis, Peptic Ulcer, Pancreatitis | belly pain on the lower left that gets worse and i dont wann |
| 8236 | geri | PC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | feels like peein razor blades and my pee smells awful |
| 8247 | adult | UC | Diabetic Ketoacidosis | Depression | Depression, Hypothyroidism, Anemia, Electrolyte abnormality, Stroke | my sugar was over 500 and i feel terrible im so nauseous and |
| 8249 | peds | ED | Gout | Trauma | Trauma, Cellulitis, Reactive Arthritis, Septic Arthritis, Bursitis | my big toe is swollen red and hurts so bad i cant even put a |
| 8334 | adult | UC | Polypharmacy/Medication Effect | BPPV | BPPV, Vestibular neuritis, Orthostatic hypotension | keep losing my balance fell three times this week and im on  |
| 8360 | peds | ED | COPD Exacerbation | Asthma | Asthma, Bronchi, Pneumonia, Post-infectious cough, Pulmonary Embolism | my copd is acting up cant breathe and coughing way more than |
| 8476 | peds | PC | COPD Exacerbation | Asthma | Asthma, Anxiety, Pneumonia, Anemia, Pulmonary Embolism | breathing is worse than ever my inhaler aint helping like it |
| 8481 | peds | UC | Gout | Plantar Fasciitis | Plantar Fasciitis, Ankle Sprain, Stress Fracture, Morton Neuroma, Peripheral Neuropathy | toe joint blew up overnight cant walk on it and its bright r |
| 8491 | adult | PC | Diverticulitis | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Appendicitis, Peptic Ulcer | belly pain on the lower left that gets worse and i dont wann |


## Failure Mode Breakdown

| Mode | Count | % of Total |
|---|---|---|
| Dead-end ("Needs in-person") | 1 | 0.2% |
| Viral over-generalization | 0 | 0.0% |
| Wrong diagnosis | 10 | 1.7% |
| API errors | 0 | 0.0% |

### Dead-End Cases

| Expected | CC (truncated) |
|---|---|
| Urinary Tract Infection (1) | feels like peein razor blades and my pee smells awful |

## Per-Condition Accuracy

| Condition | Hits | Total | Accuracy | Primary Failure Mode |
|---|---|---|---|---|
| COPD Exacerbation | 3 | 6 | 50% | Asthma |
| Diverticulitis | 3 | 5 | 60% | Gastroenteritis |
| Gout | 4 | 6 | 67% | Trauma |
| Temporal Arteritis | 4 | 5 | 80% | Migraine |
| Polypharmacy/Medication Effect | 4 | 5 | 80% | BPPV |
| Urinary Tract Infection | 5 | 6 | 83% | Needs in-person evaluation |
| Diabetic Ketoacidosis | 5 | 6 | 83% | Depression |
| Acute Myocardial Infarction | 6 | 6 | 100% | - |
| Stroke | 6 | 6 | 100% | - |
| Pulmonary Embolism | 6 | 6 | 100% | - |
| Pneumonia | 6 | 6 | 100% | - |
| Appendicitis | 6 | 6 | 100% | - |
| Asthma | 6 | 6 | 100% | - |
| Gastroenteritis | 6 | 6 | 100% | - |
| Migraine | 6 | 6 | 100% | - |
| Nephrolithiasis | 6 | 6 | 100% | - |
| Congestive Heart Failure | 6 | 6 | 100% | - |
| Deep Vein Thrombosis | 6 | 6 | 100% | - |
| Pyelonephritis | 6 | 6 | 100% | - |
| Meningitis | 6 | 6 | 100% | - |
| Sepsis | 6 | 6 | 100% | - |
| Pharyngitis | 6 | 6 | 100% | - |
| Cellulitis | 6 | 6 | 100% | - |
| Bronchitis | 5 | 5 | 100% | - |
| Upper Respiratory Infection | 5 | 5 | 100% | - |
| Pneumothorax | 5 | 5 | 100% | - |
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
| Atrial Fibrillation | 5 | 5 | 100% | - |
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
| Delirium Tremens | 5 | 5 | 100% | - |
| Alcohol Withdrawal | 5 | 5 | 100% | - |
| Opioid Overdose | 5 | 5 | 100% | - |
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
| Insomnia Disorder | 5 | 5 | 100% | - |
| Obstructive Sleep Apnea | 5 | 5 | 100% | - |
| Malignancy | 5 | 5 | 100% | - |
| Fibrocystic Breast Changes | 5 | 5 | 100% | - |
| Irritant Contact Diaper Dermatitis | 5 | 5 | 100% | - |
| Hypothermia | 5 | 5 | 100% | - |
| Laceration/Crush Injury | 5 | 5 | 100% | - |

