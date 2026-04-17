# COMPASS Stress Test — 600 API Cases (v18)

**Date:** 2026-04-17T01:32:03.033Z
**Endpoint:** http://localhost:3005/api/diagnose
**Total cases:** 600

## Overall Accuracy

| Metric | Value |
|---|---|
| **Hits (primary or top-5)** | 471 |
| **Misses** | 129 |
| **Errors** | 0 |
| **Accuracy** | **78.5%** |

## By Demographic

| Demo | Hits | Total | Accuracy |
|---|---|---|---|
| peds | 118 | 150 | 78.7% |
| adult | 192 | 250 | 76.8% |
| geri | 161 | 200 | 80.5% |

## By Setting

| Setting | Hits | Total | Accuracy |
|---|---|---|---|
| ED | 157 | 200 | 78.5% |
| UC | 155 | 200 | 77.5% |
| PC | 159 | 200 | 79.5% |

## Latency

| Percentile | ms |
|---|---|
| p50 | 18 |
| p95 | 29 |
| p99 | 36 |

## Top 10 Most-Missed Conditions

| Condition | Misses |
|---|---|
| Pulmonary Embolism | 5 |
| Appendicitis | 5 |
| Pancreatitis | 5 |
| Intussusception | 5 |
| Placental Abruption | 5 |
| Rhabdomyolysis | 5 |
| Temporal Arteritis | 5 |
| ADEM | 5 |
| Sexual Assault | 5 |
| Esophageal Foreign Body | 5 |

## Top 10 Most-Reliable Conditions (100% hit rate, n>=2)

| Condition | Hits/Total |
|---|---|
| Acute Myocardial Infarction | 6/6 |
| Stroke | 6/6 |
| Asthma | 6/6 |
| Gastroenteritis | 6/6 |
| Meningitis | 6/6 |
| Cellulitis | 6/6 |
| Bronchitis | 5/5 |
| Upper Respiratory Infection | 5/5 |
| Pneumothorax | 5/5 |
| Aortic Dissection | 5/5 |

## All Misses

| ID | Demo | Setting | Expected | Got (Primary) | Top 5 | CC |
|---|---|---|---|---|---|---|
| 6002 | adult | PC | Pulmonary Embolism | Bronchitis | Bronchitis, ACE inhibitor cough, Viral URI, Asthma, Pneumonia | i was just sittin there and suddenly couldnt breathe and sta |
| 6005 | geri | PC | Appendicitis | Gastroenteritis | Gastroenteritis, Food Poisoning, Bowel Obstruction, Medication Side Effect, Cyclic Vomiting Syndrome | started around my belly button now the pain moved to the low |
| 6009 | adult | ED | Nephrolithiasis | Chlamydia | Chlamydia, Genital Herpes, Gonorrhea, Syphilis, Trichomoniasis | worst pain of my life in my side it comes and goes and i can |
| 6010 | peds | UC | Congestive Heart Failure | Asthma | Asthma, Pulmonary Embolism, Anxiety, Pneumonia, Anemia | my ankles are huge and i cant breathe when i lay down at nig |
| 6017 | peds | PC | Gout | Plantar Fasciitis | Plantar Fasciitis, Ankle Sprain, Stress Fracture, Morton Neuroma, Peripheral Neuropathy | woke up with the worst pain in my foot its swollen hot and t |
| 6027 | adult | ED | Diverticulitis | Viral infection | Viral infection, UTI, Pneumonia, Gastroenteritis, Bacterial infection | pain in my lower left belly with fever and i been constipate |
| 6028 | peds | UC | Pancreatitis | Gastroenteritis | Gastroenteritis, GERD, Appendicitis, Cholecystitis, Mesenteric Ischemia | worst belly pain after eating greasy food goes right through |
| 6045 | adult | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Hip Osteoarthritis, Femoral Lesion, Trochanteric Bursitis, Septic Arthritis | my overweight teen has been complaining of hip pain and now  |
| 6047 | geri | PC | Intussusception | Viral Illness | Viral Illness, Sepsis, Dehydration, Acute Hip and Leg, Hand Foot and Mouth Disease | my infant has episodes of screaming drawing up legs then goi |
| 6049 | adult | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Appendicitis | pregnant and my belly got really hard and painful and theres |
| 6054 | adult | ED | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 6057 | peds | ED | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 6076 | geri | UC | Alcohol Withdrawal | Delirium Tremens | Delirium Tremens, Toxic/Metabolic Encephalopathy, UTI, Sepsis, Stroke | last drink was 2 days ago and now i got the shakes sweating  |
| 6087 | geri | ED | ADEM | Acute Disseminated Encephalomyelitis | Acute Disseminated Encephalomyelitis, Tension headache, Stroke, Meningitis, Cluster headache | child developed weakness in legs after a virus plus headache |
| 6092 | geri | PC | Iron Deficiency Anemia | Heart Failure | Heart Failure, Asthma, COPD exacerbation, Pneumonia, Pulmonary Embolism | been dragging for months short of breath going up stairs and |
| 6094 | adult | UC | Sexual Assault | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | something happened to me last night at a party and i need to |
| 6105 | adult | ED | Esophageal Foreign Body | Intimate Partner Violence | Intimate Partner Violence, Button Battery Ingestion, Sexual Assault, Physical Abuse, Strangulation Injury | my toddler put a battery in her mouth and i think she swallo |
| 6121 | geri | UC | Appendicitis | Kidney Stone | Kidney Stone, Pyelonephritis, UTI, Musculoskeletal Strain, Abdominal Aortic Aneurysm | my right side is killing me i cant even stand up straight |
| 6126 | adult | ED | Congestive Heart Failure | DVT | DVT, Cellulitis, Venous Insufficiency, Musculoskeletal Strain, Lymphedema | keep waking up at night gasping for air and my legs are swol |
| 6127 | geri | UC | Deep Vein Thrombosis | Cellulitis | Cellulitis, Abscess, Contact Dermatitis, Erysipelas, Orbital Cellulitis | one leg is way bigger than the other and its warm and tender |
| 6128 | peds | PC | COPD Exacerbation | Pneumonia | Pneumonia, Asthma, Viral URI | breathing is worse than ever my inhaler aint helping like it |
| 6129 | adult | ED | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Herniated Disc, Sepsis, Kidney Stone, Spinal Stenosis | hurts to pee and now my back is killing me and i got a high  |
| 6132 | adult | ED | Sepsis | Atrial Fibrillation | Atrial Fibrillation, Supraventricular Tachycardia, Cardiac Arrhythmia, Panic Disorder, Anxiety | infection got real bad now im lightheaded heart pounding fev |
| 6134 | geri | PC | Pharyngitis | Viral infection | Viral infection, Pneumonia, UTI, Gastroenteritis, Sepsis | hurts so bad to swallow even water and i got a fever |
| 6144 | adult | ED | Pancreatitis | Gastroenteritis | Gastroenteritis, Food Poisoning, Pregnancy (early), Gastroparesis, Medication Side Effect | pain in my upper belly going straight through to my back and |
| 6150 | geri | ED | Gastrointestinal Bleeding | Orthostatic hypotension | Orthostatic hypotension, BPPV, Vestibular neuritis, Cardiac Arrhythmia, Medication side effect | been pooping black tar looking stuff and feel lightheaded |
| 6156 | peds | ED | Peritonsillar Abscess | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, GERD, Epiglottitis | cant swallow at all one side of my throat is huge and i soun |
| 6159 | adult | ED | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Infectious Mononucleosis, Strep Pharyngitis, Peritonsillar Abscess, Bone Lesions | sore throat came on fast now my child is leaning forward dro |
| 6163 | geri | UC | Intussusception | Viral Illness | Viral Illness, Sepsis, UTI, Dehydration, Acute Hip and Leg | my infant has episodes of screaming drawing up legs then goi |
| 6164 | geri | PC | Ovarian Torsion | Gastroenteritis | Gastroenteritis, Food Poisoning, Bowel Obstruction, Medication Side Effect, Pregnancy (early) | sudden horrible pain on one side of my pelvis and im throwin |
| 6165 | adult | ED | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Appendicitis | pregnant and my belly got really hard and painful and theres |
| 6170 | peds | PC | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 6173 | geri | PC | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 6178 | adult | UC | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Conjunctivitis, Allergic Reaction, Cellulitis | my kid has crusty honey colored sores around his mouth and n |
| 6191 | adult | PC | Delirium Tremens | Meningitis | Meningitis, Central Retinal Artery Occlusion, Retinal Detachment, Stroke, Amaurosis Fugax | stopped drinking and now im trembling cant think straight an |
| 6193 | geri | UC | Opioid Overdose | UTI | UTI, Toxic/Metabolic Encephalopathy, Sepsis, Stroke, Hypoglycemia | she took a bunch of pills and now shes barely breathing and  |
| 6196 | adult | UC | Bipolar Disorder — Manic Episode | Needs in-person evaluation | Needs in-person evaluation | i feel amazing like i can do anything havent needed sleep an |
| 6203 | adult | PC | ADEM | Acute Disseminated Encephalomyelitis | Acute Disseminated Encephalomyelitis, Tension headache, Migraine, Stroke, Meningitis | child developed weakness in legs after a virus plus headache |
| 6205 | geri | UC | Vasovagal Syncope | BPPV | BPPV, Orthostatic hypotension, Acute Myocardial Infarction, Vestibular neuritis, Anxiety | got lightheaded at church felt hot and sweaty then next thin |
| 6206 | peds | PC | Urticaria | Viral Exanthem | Viral Exanthem, Contact Dermatitis, Conjunctivitis, Impetigo, Varicella (Chickenpox) | took a new medicine yesterday and now i got bumps and itchy  |
| 6208 | adult | UC | Iron Deficiency Anemia | BPPV | BPPV, Anxiety, Vestibular neuritis, Orthostatic hypotension, Medication side effect | so tired i can barely function my periods have been super he |
| 6209 | adult | PC | Intimate Partner Violence | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | he punched me in the face again and i think my cheekbone mig |
| 6210 | adult | ED | Sexual Assault | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | something happened to me last night at a party and i need to |
| 6214 | geri | UC | HRT Side Effect — Mood/Psychiatric | DVT | DVT, Cellulitis, Musculoskeletal Strain, Venous Insufficiency, Baker's Cyst Rupture | started estrogen 3 months ago and now i get terrible headach |
| 6218 | adult | PC | Polypharmacy/Medication Effect | Orthostatic hypotension | Orthostatic hypotension, BPPV, Vestibular neuritis, Cardiac Arrhythmia, Medication side effect | ever since they added that new medicine i feel woozy and uns |
| 6219 | peds | ED | Heat Exhaustion | BPPV | BPPV, Acute Myocardial Infarction, Orthostatic hypotension, Vestibular neuritis, Anxiety | was working outside in the heat all day and now im dizzy nau |
| 6221 | adult | PC | Esophageal Foreign Body | Button Battery Ingestion | Button Battery Ingestion, Physical Abuse, Intimate Partner Violence, Child Abuse / Non-Accidental Trauma, Elder Abuse/Neglect | my toddler put a battery in her mouth and i think she swallo |
| 6234 | geri | ED | Pulmonary Embolism | COPD exacerbation | COPD exacerbation, Asthma, Pneumonia, Viral URI | feel like im suffocating and theres this stabbing pain on th |
| 6235 | adult | UC | Pneumonia | Bronchitis | Bronchitis, ACE inhibitor cough, Viral URI, Sepsis, Asthma | been coughing up green stuff for a week and got the chills r |
| 6236 | peds | PC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | feels like peein razor blades and my pee smells awful |
| 6240 | peds | ED | Migraine | Central Retinal Artery Occlusion | Central Retinal Artery Occlusion, Retinal Detachment, Stroke, Amaurosis Fugax, Acute Glaucoma | my head is pounding so bad i cant see straight and lights ma |
| 6244 | geri | UC | COPD Exacerbation | Bronchitis | Bronchitis, Viral URI, ACE inhibitor cough, Pneumonia, Asthma | lungs feel like theyre on fire and i cant stop coughing gree |
| 6245 | adult | PC | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Cauda Equina Syndrome, Herniated Disc, Compression fracture, Spinal Stenosis | fever of 103 and pain in my lower back plus burning when i u |
| 6247 | peds | UC | Diabetic Ketoacidosis | Depression | Depression, Anemia, Hypothyroidism, Electrolyte abnormality, Acute Nephritis | my sugar was over 500 and i feel terrible im so nauseous and |
| 6248 | geri | PC | Sepsis | Atrial Fibrillation | Atrial Fibrillation, Supraventricular Tachycardia, Cardiac Arrhythmia, Panic Disorder, Anxiety | had a cut that got infected now i feel terrible fever racing |
| 6249 | peds | ED | Gout | Trauma | Trauma, Cellulitis, Bursitis, Septic Arthritis, Reactive Arthritis | my big toe is swollen red and hurts so bad i cant even put a |
| 6250 | peds | UC | Pharyngitis | Anaphylaxis | Anaphylaxis, Angioedema, ACE Inhibitor Angioedema, Food Allergy (severe), Hereditary Angioedema | sore throat is killing me and my glands are all swollen up |
| 6259 | adult | UC | Diverticulitis | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Cholecystitis, Ectopic Pregnancy | left side of my gut hurts and i got a fever and feel bloated |
| 6260 | geri | PC | Pancreatitis | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Bowel obstruction | upper stomach pain that gets worse after i eat and im puking |
| 6261 | geri | ED | Cholecystitis | Gastroenteritis | Gastroenteritis, Food Poisoning, Bowel Obstruction, Medication Side Effect, Pregnancy (early) | pain under my right ribs especially after eating and im naus |
| 6275 | geri | PC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, Bone Lesions, Peritonsillar Abscess | sore throat came on fast now my child is leaning forward dro |
| 6279 | geri | ED | Intussusception | Viral Illness | Viral Illness, Sepsis, Dehydration, Acute Hip and Leg, Hand Foot and Mouth Disease | my infant has episodes of screaming drawing up legs then goi |
| 6280 | adult | UC | Ovarian Torsion | Gastroenteritis | Gastroenteritis, Food Poisoning, Medication Side Effect, Pregnancy (early), Bowel Obstruction | sudden horrible pain on one side of my pelvis and im throwin |
| 6281 | adult | PC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Appendicitis | pregnant and my belly got really hard and painful and theres |
| 6286 | geri | UC | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 6289 | peds | UC | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 6294 | geri | ED | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Herpes Zoster (Shingles), Cellulitis, Conjunctivitis | my kid has crusty honey colored sores around his mouth and n |
| 6308 | adult | PC | Alcohol Withdrawal | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Atrial Fibrillation, Cardiac Arrhythmia, Anxiety | trying to detox from alcohol at home and im shaking anxious  |
| 6319 | peds | UC | ADEM | Acute Disseminated Encephalomyelitis | Acute Disseminated Encephalomyelitis, Tension headache, Stroke, Migraine, Cluster headache | child developed weakness in legs after a virus plus headache |
| 6323 | adult | PC | Simple Laceration | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | my kid fell on the playground and split his chin open its ga |
| 6326 | peds | PC | Sexual Assault | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | something happened to me last night at a party and i need to |
| 6334 | adult | UC | Polypharmacy/Medication Effect | BPPV | BPPV, Vestibular neuritis, Orthostatic hypotension | keep losing my balance fell three times this week and im on  |
| 6337 | adult | UC | Esophageal Foreign Body | Button Battery Ingestion | Button Battery Ingestion, Physical Abuse, Elder Abuse/Neglect, Child Abuse / Non-Accidental Trauma, Intimate Partner Violence | my toddler put a battery in her mouth and i think she swallo |
| 6350 | adult | PC | Pulmonary Embolism | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Acute Coronary Syndrome, Costochondritis, GERD | cant catch my breath outta nowhere and my chest hurts when i |
| 6351 | adult | ED | Pneumonia | Bronchitis | Bronchitis, ACE inhibitor cough, Viral URI, Sepsis, Asthma | my cough wont quit and i got a fever and everything aches |
| 6353 | adult | PC | Appendicitis | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Bacterial infection, Acute Otitis Media | sharp stabbing pain in my lower right belly and i got a feve |
| 6357 | geri | ED | Nephrolithiasis | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Trichomoniasis, Bacterial Vaginosis | worst pain of my life in my side it comes and goes and i can |
| 6375 | adult | ED | Diverticulitis | Viral infection | Viral infection, UTI, Pneumonia, Gastroenteritis, Bacterial infection | pain in my lower left belly with fever and i been constipate |
| 6376 | adult | UC | Pancreatitis | Gastroenteritis | Gastroenteritis, GERD, Appendicitis, Peptic Ulcer, Mesenteric Ischemia | worst belly pain after eating greasy food goes right through |
| 6382 | geri | UC | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | theres blood in my stool bright red and i feel dizzy |
| 6391 | adult | UC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, GERD, Bone Lesions | sore throat came on fast now my child is leaning forward dro |
| 6395 | adult | PC | Intussusception | Viral Illness | Viral Illness, Sepsis, Dehydration, Acute Hip and Leg, Hand Foot and Mouth Disease | my infant has episodes of screaming drawing up legs then goi |
| 6396 | geri | ED | Ovarian Torsion | Gastroenteritis | Gastroenteritis, Food Poisoning, Bowel Obstruction, Medication Side Effect, Pregnancy (early) | sudden horrible pain on one side of my pelvis and im throwin |
| 6397 | geri | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Diverticulitis | pregnant and my belly got really hard and painful and theres |
| 6402 | peds | ED | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 6405 | geri | ED | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 6410 | adult | PC | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Conjunctivitis, Allergic Reaction, Cellulitis | my kid has crusty honey colored sores around his mouth and n |
| 6424 | adult | UC | Alcohol Withdrawal | Delirium Tremens | Delirium Tremens, Substance Intoxication, Toxic/Metabolic Encephalopathy, UTI, Hepatic Encephalopathy | last drink was 2 days ago and now i got the shakes sweating  |
| 6435 | peds | ED | ADEM | Acute Disseminated Encephalomyelitis | Acute Disseminated Encephalomyelitis, Tension headache, Stroke, Migraine, Meningitis | child developed weakness in legs after a virus plus headache |
| 6440 | geri | PC | Iron Deficiency Anemia | COPD exacerbation | COPD exacerbation, Heart Failure, Asthma, Pneumonia, Pulmonary Embolism | been dragging for months short of breath going up stairs and |
| 6442 | adult | UC | Sexual Assault | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | something happened to me last night at a party and i need to |
| 6453 | adult | ED | Esophageal Foreign Body | Button Battery Ingestion | Button Battery Ingestion, Physical Abuse, Child Abuse / Non-Accidental Trauma, Intimate Partner Violence, Elder Abuse/Neglect | my toddler put a battery in her mouth and i think she swallo |
| 6466 | geri | UC | Pulmonary Embolism | Atrial Fibrillation | Atrial Fibrillation, Cardiac Arrhythmia, Supraventricular Tachycardia, Panic Disorder, Anxiety | sharp pain in my chest every time i take a breath and my hea |
| 6468 | adult | ED | Urinary Tract Infection | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Trichomoniasis, Bacterial Vaginosis | i keep runnin to the bathroom but barely anything comes out  |
| 6469 | geri | UC | Appendicitis | Viral infection | Viral infection, Bacterial infection, UTI | pain in my stomach moved down to the right side and bumps in |
| 6474 | geri | ED | Congestive Heart Failure | Seizure | Seizure, New-Onset Epilepsy, Syncope, Stroke, Hypoglycemia | cant walk to the mailbox without stopping to rest and my sho |
| 6475 | adult | UC | Deep Vein Thrombosis | Cellulitis | Cellulitis, Abscess, Contact Dermatitis, Orbital Cellulitis, Erysipelas | one leg is way bigger than the other and its warm and tender |
| 6477 | peds | ED | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Sepsis, Herniated Disc, Compression fracture, Spinal Stenosis | hurts to pee and now my back is killing me and i got a high  |
| 6480 | adult | ED | Sepsis | Viral infection | Viral infection, Meningitis, UTI, Pneumonia, Gastroenteritis | fever wont break im shaking uncontrollably and my heart is r |
| 6481 | peds | UC | Gout | Plantar Fasciitis | Plantar Fasciitis, Ankle Sprain, Stress Fracture, Peripheral Neuropathy, Morton Neuroma | toe joint blew up overnight cant walk on it and its bright r |
| 6482 | adult | PC | Pharyngitis | Viral infection | Viral infection, UTI, Pneumonia, Gastroenteritis, Bacterial infection | hurts so bad to swallow even water and i got a fever |
| 6492 | peds | ED | Pancreatitis | Gastroenteritis | Gastroenteritis, Food Poisoning, Cyclic Vomiting Syndrome, Medication Side Effect, Bowel Obstruction | pain in my upper belly going straight through to my back and |
| 6498 | peds | ED | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Medication side effect, Anxiety | been pooping black tar looking stuff and feel lightheaded |
| 6511 | adult | UC | Intussusception | Viral Illness | Viral Illness, Sepsis, UTI, Dehydration, Acute Hip and Leg | my infant has episodes of screaming drawing up legs then goi |
| 6513 | geri | ED | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Diverticulitis | pregnant and my belly got really hard and painful and theres |
| 6518 | adult | PC | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 6521 | geri | PC | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 6526 | adult | UC | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Conjunctivitis, Allergic Reaction, Cellulitis | my kid has crusty honey colored sores around his mouth and n |
| 6539 | peds | PC | Delirium Tremens | Meningitis | Meningitis, Central Retinal Artery Occlusion, Optic Neuritis, Retinal Detachment, Stroke | stopped drinking and now im trembling cant think straight an |
| 6541 | peds | UC | Opioid Overdose | Substance Intoxication | Substance Intoxication, Toxic/Metabolic Encephalopathy, UTI, Hypoglycemia, Sepsis | she took a bunch of pills and now shes barely breathing and  |
| 6544 | adult | UC | Bipolar Disorder — Manic Episode | Needs in-person evaluation | Needs in-person evaluation | i feel amazing like i can do anything havent needed sleep an |
| 6551 | adult | PC | ADEM | Acute Disseminated Encephalomyelitis | Acute Disseminated Encephalomyelitis, Tension headache, Migraine, Stroke, Meningitis | child developed weakness in legs after a virus plus headache |
| 6553 | adult | UC | Vasovagal Syncope | BPPV | BPPV, Acute Myocardial Infarction, Anxiety, Vestibular neuritis, Orthostatic hypotension | got lightheaded at church felt hot and sweaty then next thin |
| 6554 | geri | PC | Urticaria | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Herpes Zoster (Shingles), Conjunctivitis, Allergic Reaction | took a new medicine yesterday and now i got bumps and itchy  |
| 6556 | adult | UC | Iron Deficiency Anemia | BPPV | BPPV, Anxiety, Vestibular neuritis, Orthostatic hypotension, Medication side effect | so tired i can barely function my periods have been super he |
| 6557 | adult | PC | Intimate Partner Violence | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | he punched me in the face again and i think my cheekbone mig |
| 6558 | peds | ED | Sexual Assault | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | something happened to me last night at a party and i need to |
| 6562 | peds | UC | HRT Side Effect — Mood/Psychiatric | DVT | DVT, Cellulitis, Musculoskeletal Strain, Venous Insufficiency, Baker's Cyst Rupture | started estrogen 3 months ago and now i get terrible headach |
| 6563 | peds | PC | Lactation Mastitis | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Trichomoniasis, Bacterial Vaginosis | had a clogged duct that turned into my whole breast being re |
| 6566 | adult | PC | Polypharmacy/Medication Effect | Orthostatic hypotension | Orthostatic hypotension, BPPV, Vestibular neuritis, Cardiac Arrhythmia, Medication side effect | ever since they added that new medicine i feel woozy and uns |
| 6567 | adult | ED | Heat Exhaustion | BPPV | BPPV, Acute Myocardial Infarction, Anxiety, Vestibular neuritis, Orthostatic hypotension | was working outside in the heat all day and now im dizzy nau |
| 6569 | geri | PC | Esophageal Foreign Body | Button Battery Ingestion | Button Battery Ingestion, Physical Abuse, Elder Abuse/Neglect, Child Abuse / Non-Accidental Trauma, Intimate Partner Violence | my toddler put a battery in her mouth and i think she swallo |
| 6582 | geri | ED | Pulmonary Embolism | Bronchitis | Bronchitis, Viral URI, ACE inhibitor cough, Pneumonia, Asthma | i was just sittin there and suddenly couldnt breathe and sta |
| 6585 | geri | ED | Appendicitis | Gastroenteritis | Gastroenteritis, Food Poisoning, Bowel Obstruction, Medication Side Effect, Cyclic Vomiting Syndrome | started around my belly button now the pain moved to the low |
| 6588 | peds | ED | Migraine | Central Retinal Artery Occlusion | Central Retinal Artery Occlusion, Retinal Detachment, Stroke, Amaurosis Fugax, Acute Glaucoma | my head is pounding so bad i cant see straight and lights ma |
| 6592 | peds | UC | COPD Exacerbation | Viral URI | Viral URI, Bronchitis, Post-Bronchitic cough, Pneumonia, Asthma | lungs feel like theyre on fire and i cant stop coughing gree |
| 6593 | peds | PC | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Cauda Equina Syndrome, Herniated Disc, Compression fracture, Spinal Stenosis | fever of 103 and pain in my lower back plus burning when i u |
| 6595 | peds | UC | Diabetic Ketoacidosis | Depression | Depression, Electrolyte abnormality, Acute Nephritis, Anemia, Cannabinoid Hyperemesis Syndrome | my sugar was over 500 and i feel terrible im so nauseous and |
| 6598 | adult | UC | Pharyngitis | Anaphylaxis | Anaphylaxis, Angioedema, ACE Inhibitor Angioedema, Food Allergy (severe), Hereditary Angioedema | sore throat is killing me and my glands are all swollen up |


## Failure Mode Breakdown

| Mode | Count | % of Total |
|---|---|---|
| Dead-end ("Needs in-person") | 3 | 0.5% |
| Viral over-generalization | 8 | 1.3% |
| Wrong diagnosis | 118 | 19.7% |
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
| COPD Exacerbation (1) | lungs feel like theyre on fire and i cant stop coughing gree |

## Per-Condition Accuracy

| Condition | Hits | Total | Accuracy | Primary Failure Mode |
|---|---|---|---|---|
| Pancreatitis | 0 | 5 | 0% | Gastroenteritis |
| Intussusception | 0 | 5 | 0% | Viral Illness |
| Placental Abruption | 0 | 5 | 0% | Ectopic Pregnancy |
| Rhabdomyolysis | 0 | 5 | 0% | Stroke |
| Temporal Arteritis | 0 | 5 | 0% | Iron Deficiency Anemia |
| ADEM | 0 | 5 | 0% | Acute Disseminated Encephalomyelitis |
| Sexual Assault | 0 | 5 | 0% | Generalized Anxiety Disorder |
| Esophageal Foreign Body | 0 | 5 | 0% | Button Battery Ingestion |
| Pulmonary Embolism | 1 | 6 | 17% | Bronchitis |
| Appendicitis | 1 | 6 | 17% | Gastroenteritis |
| Impetigo | 1 | 5 | 20% | Contact Dermatitis |
| Iron Deficiency Anemia | 1 | 5 | 20% | BPPV |
| Pyelonephritis | 2 | 6 | 33% | Musculoskeletal strain |
| Pharyngitis | 2 | 6 | 33% | Viral infection |
| Diverticulitis | 2 | 5 | 40% | Viral infection |
| Gastrointestinal Bleeding | 2 | 5 | 40% | BPPV |
| Epiglottitis | 2 | 5 | 40% | Viral Pharyngitis |
| Ovarian Torsion | 2 | 5 | 40% | Gastroenteritis |
| Alcohol Withdrawal | 2 | 5 | 40% | Delirium Tremens |
| Polypharmacy/Medication Effect | 2 | 5 | 40% | Orthostatic hypotension |
| Congestive Heart Failure | 3 | 6 | 50% | Asthma |
| COPD Exacerbation | 3 | 6 | 50% | Pneumonia |
| Sepsis | 3 | 6 | 50% | Atrial Fibrillation |
| Gout | 3 | 6 | 50% | Plantar Fasciitis |
| Delirium Tremens | 3 | 5 | 60% | Meningitis |
| Opioid Overdose | 3 | 5 | 60% | UTI |
| Bipolar Disorder — Manic Episode | 3 | 5 | 60% | Needs in-person evaluation |
| Vasovagal Syncope | 3 | 5 | 60% | BPPV |
| Urticaria | 3 | 5 | 60% | Viral Exanthem |
| Intimate Partner Violence | 3 | 5 | 60% | Generalized Anxiety Disorder |
| HRT Side Effect — Mood/Psychiatric | 3 | 5 | 60% | DVT |
| Heat Exhaustion | 3 | 5 | 60% | BPPV |
| Pneumonia | 4 | 6 | 67% | Bronchitis |
| Urinary Tract Infection | 4 | 6 | 67% | Needs in-person evaluation |
| Migraine | 4 | 6 | 67% | Central Retinal Artery Occlusion |
| Nephrolithiasis | 4 | 6 | 67% | Chlamydia |
| Deep Vein Thrombosis | 4 | 6 | 67% | Cellulitis |
| Diabetic Ketoacidosis | 4 | 6 | 67% | Depression |
| Cholecystitis | 4 | 5 | 80% | Gastroenteritis |
| Peritonsillar Abscess | 4 | 5 | 80% | Viral Pharyngitis |
| Slipped Capital Femoral Epiphysis | 4 | 5 | 80% | Hip Fracture |
| Simple Laceration | 4 | 5 | 80% | Fracture |
| Lactation Mastitis | 4 | 5 | 80% | Chlamydia |
| Acute Myocardial Infarction | 6 | 6 | 100% | - |
| Stroke | 6 | 6 | 100% | - |
| Asthma | 6 | 6 | 100% | - |
| Gastroenteritis | 6 | 6 | 100% | - |
| Meningitis | 6 | 6 | 100% | - |
| Cellulitis | 6 | 6 | 100% | - |
| Bronchitis | 5 | 5 | 100% | - |
| Upper Respiratory Infection | 5 | 5 | 100% | - |
| Pneumothorax | 5 | 5 | 100% | - |
| Aortic Dissection | 5 | 5 | 100% | - |
| Subarachnoid Hemorrhage | 5 | 5 | 100% | - |
| Ectopic Pregnancy | 5 | 5 | 100% | - |
| Testicular Torsion | 5 | 5 | 100% | - |
| Croup | 5 | 5 | 100% | - |
| Otitis Media | 5 | 5 | 100% | - |
| Febrile Seizure | 5 | 5 | 100% | - |
| Hip Fracture | 5 | 5 | 100% | - |
| Constipation | 5 | 5 | 100% | - |
| Benign Paroxysmal Positional Vertigo | 5 | 5 | 100% | - |
| Anaphylaxis | 5 | 5 | 100% | - |
| Preeclampsia | 5 | 5 | 100% | - |
| Cauda Equina Syndrome | 5 | 5 | 100% | - |
| Nursemaid Elbow | 5 | 5 | 100% | - |
| Pyloric Stenosis | 5 | 5 | 100% | - |
| Henoch-Schonlein Purpura | 5 | 5 | 100% | - |
| Kawasaki Disease | 5 | 5 | 100% | - |
| Tension Pneumothorax | 5 | 5 | 100% | - |
| Status Epilepticus | 5 | 5 | 100% | - |
| Addison Crisis | 5 | 5 | 100% | - |
| Thyroid Storm | 5 | 5 | 100% | - |
| Corneal Abrasion | 5 | 5 | 100% | - |
| Orbital Cellulitis | 5 | 5 | 100% | - |
| Mesenteric Ischemia | 5 | 5 | 100% | - |
| Subdural Hematoma | 5 | 5 | 100% | - |
| Shingles | 5 | 5 | 100% | - |
| Hand Foot and Mouth Disease | 5 | 5 | 100% | - |
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
| Opioid Withdrawal | 5 | 5 | 100% | - |
| Cannabinoid Hyperemesis Syndrome | 5 | 5 | 100% | - |
| Psychotic Disorder | 5 | 5 | 100% | - |
| Stimulant Intoxication | 5 | 5 | 100% | - |
| Wernicke Encephalopathy | 5 | 5 | 100% | - |
| Hepatic Encephalopathy | 5 | 5 | 100% | - |
| Serotonin Syndrome | 5 | 5 | 100% | - |
| Neuroleptic Malignant Syndrome | 5 | 5 | 100% | - |
| Dental Abscess | 5 | 5 | 100% | - |
| Erectile Dysfunction | 5 | 5 | 100% | - |
| Dyspareunia | 5 | 5 | 100% | - |
| Chlamydia | 5 | 5 | 100% | - |
| Postpartum Depression | 5 | 5 | 100% | - |
| Colic | 5 | 5 | 100% | - |
| Dog/Cat Bite | 5 | 5 | 100% | - |
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

