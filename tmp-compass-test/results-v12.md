# COMPASS Stress Test — 500 API Cases (v12)

**Date:** 2026-04-16T16:24:26.503Z
**Endpoint:** http://localhost:3005/api/diagnose
**Total cases:** 500

## Overall Accuracy

| Metric | Value |
|---|---|
| **Hits (primary or top-5)** | 272 |
| **Misses** | 228 |
| **Errors** | 0 |
| **Accuracy** | **54.4%** |

## By Demographic

| Demo | Hits | Total | Accuracy |
|---|---|---|---|
| peds | 67 | 125 | 53.6% |
| geri | 92 | 175 | 52.6% |
| adult | 113 | 200 | 56.5% |

## By Setting

| Setting | Hits | Total | Accuracy |
|---|---|---|---|
| ED | 92 | 167 | 55.1% |
| UC | 84 | 167 | 50.3% |
| PC | 96 | 166 | 57.8% |

## Latency

| Percentile | ms |
|---|---|
| p50 | 15 |
| p95 | 22 |
| p99 | 53 |

## Top 10 Most-Missed Conditions

| Condition | Misses |
|---|---|
| Pneumothorax | 6 |
| Pancreatitis | 6 |
| Pyloric Stenosis | 6 |
| Epiglottitis | 6 |
| Henoch-Schonlein Purpura | 6 |
| Slipped Capital Femoral Epiphysis | 6 |
| Ovarian Torsion | 6 |
| Placental Abruption | 6 |
| Tension Pneumothorax | 6 |
| Status Epilepticus | 6 |

## Top 10 Most-Reliable Conditions (100% hit rate, n>=2)

| Condition | Hits/Total |
|---|---|
| Acute Myocardial Infarction | 6/6 |
| Stroke | 6/6 |
| Asthma | 6/6 |
| Gastroenteritis | 6/6 |
| Meningitis | 6/6 |
| Cellulitis | 6/6 |
| Bronchitis | 6/6 |
| Upper Respiratory Infection | 6/6 |
| Subarachnoid Hemorrhage | 6/6 |
| Testicular Torsion | 6/6 |

## All Misses

| ID | Demo | Setting | Expected | Got (Primary) | Top 5 | CC |
|---|---|---|---|---|---|---|
| 2202 | geri | PC | Pulmonary Embolism | Bronchitis | Bronchitis, Viral URI, ACE inhibitor cough, Pneumonia, COPD exacerbation | i was just sittin there and suddenly couldnt breathe and sta |
| 2205 | geri | PC | Appendicitis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | started around my belly button now the pain moved to the low |
| 2209 | geri | ED | Nephrolithiasis | Needs in-person evaluation | Needs in-person evaluation | worst pain of my life in my side it comes and goes and i can |
| 2217 | peds | PC | Gout | Plantar Fasciitis | Plantar Fasciitis, Ankle Sprain, Stress Fracture, Morton Neuroma, Peripheral Neuropathy | woke up with the worst pain in my foot its swollen hot and t |
| 2222 | peds | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, GERD, Anxiety | sharp chest pain outta nowhere and now i cant take a full br |
| 2223 | peds | PC | Aortic Dissection | Acute Hemorrhage | Acute Hemorrhage, Subset of patients present with Syncope Plus another key symptom, Other Reflex Mediated Syncope causes, Carotid Sinus Syncope, Metabolic Disorders | ripping sensation in my chest going through to my back and i |
| 2225 | peds | UC | Ectopic Pregnancy | Acute Pelvic Inflammatory Disease | Acute Pelvic Inflammatory Disease, Ovarian Hyperstimulation Syndrome, Pelvic Congestion Syndrome, Bowel Obstruction, Bladder perforation | pelvic pain with some bleeding and i think i might be pregna |
| 2227 | adult | ED | Diverticulitis | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Bacterial infection, Acute Otitis Media | pain in my lower left belly with fever and i been constipate |
| 2228 | peds | UC | Pancreatitis | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Peptic Ulcer, Mesenteric Adenitis | worst belly pain after eating greasy food goes right through |
| 2234 | geri | UC | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | theres blood in my stool bright red and i feel dizzy |
| 2242 | adult | ED | Pyloric Stenosis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | my 3 week old baby keeps projectile vomiting after every fee |
| 2243 | adult | UC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, GERD, Bone Lesions | sore throat came on fast now my child is leaning forward dro |
| 2244 | peds | PC | Henoch-Schonlein Purpura | Rheumatoid Arthritis | Rheumatoid Arthritis, Reactive Arthritis, Viral Arthritis, Systemic Lupus Erythematosus, Fibromyalgia | my kid has a purple rash on his legs and his belly and joint |
| 2245 | adult | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Labral Tear, Anterior or Anterolateral thigh neuropathic pain | my overweight teen has been complaining of hip pain and now  |
| 2248 | peds | ED | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | sudden horrible pain on one side of my pelvis and im throwin |
| 2249 | adult | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Appendicitis | pregnant and my belly got really hard and painful and theres |
| 2250 | geri | PC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder, Hyperthyroidism, Cardiac Arrhythmia | got hit in the chest and now i can barely breathe and feel l |
| 2251 | adult | ED | Status Epilepticus | Needs in-person evaluation | Needs in-person evaluation | my family member started seizing and its been going on and o |
| 2253 | geri | PC | Thyroid Storm | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Sepsis, Bacterial infection | hyperthyroid and now everything is going haywire fever fast  |
| 2254 | geri | ED | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 2256 | adult | PC | Orbital Cellulitis | Corneal Abrasion | Corneal Abrasion, Conjunctivitis, Foreign Body, Uveitis, Acute Angle Closure Glaucoma | my eye is swollen shut red and it hurts to move it plus i go |
| 2257 | adult | ED | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 2258 | geri | UC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Peptic Ulcer, Appendicitis, Diverticulitis | terrible belly pain after eating and ive been losing weight  |
| 2259 | adult | PC | Subdural Hematoma | Meningitis | Meningitis, Substance Intoxication, Toxic/Metabolic Encephalopathy, UTI, Hypoglycemia | grandpa bumped his head and now hes acting weird and drowsy |
| 2260 | adult | ED | Shingles | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Stimulant Intoxication, Acetaminophen Overdose | burning painful rash on one side of my body with little blis |
| 2261 | geri | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Sepsis, Bacterial infection | daycare kid with fever painful mouth sores and a rash on pal |
| 2263 | adult | ED | Bronchiolitis | Viral URI | Viral URI, Allergic Rhinitis, Anaphylaxis, Acute Sinusitis, Nasal Foreign Body | infant with runny nose that turned into fast breathing and w |
| 2264 | peds | UC | Atrial Fibrillation | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 2266 | geri | ED | Panic Attack | Pulmonary Embolism | Pulmonary Embolism, Primary Spontaneous Pneumothorax, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 2267 | adult | UC | Sciatica | Musculoskeletal strain | Musculoskeletal strain, Herniated Disc, Compression fracture, Spinal Stenosis, Lumbar Spondylosis | back pain that goes down my leg like an electric shock worse |
| 2270 | geri | UC | Hypothyroidism | Hip Fracture | Hip Fracture, Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | im always cold tired and gaining weight even though i barely |
| 2276 | peds | UC | Alcohol Withdrawal | Delirium Tremens | Delirium Tremens, Substance Intoxication, Toxic/Metabolic Encephalopathy, Hepatic Encephalopathy, Sepsis | last drink was 2 days ago and now i got the shakes sweating  |
| 2278 | adult | ED | Opioid Withdrawal | Fibromyalgia | Fibromyalgia, Chronic Fatigue Syndrome, Hypothyroidism, Viral Illness, Depression | ran out of my pain pills 2 days ago and my whole body aches  |
| 2281 | peds | ED | Psychotic Disorder | Opioid Overdose | Opioid Overdose, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Alcohol Intoxication, Stimulant Intoxication | she started talking to people who arent there and thinks som |
| 2282 | geri | UC | Stimulant Intoxication | Atrial Fibrillation | Atrial Fibrillation, Anxiety, Cardiac Arrhythmia, Supraventricular Tachycardia, Panic Disorder | took too much adderall and my heart is pounding im shaking a |
| 2284 | geri | ED | Hepatic Encephalopathy | UTI | UTI, Toxic/Metabolic Encephalopathy, Sepsis, Stroke, Hypoglycemia | my mom has liver disease and shes getting more confused and  |
| 2285 | geri | UC | Serotonin Syndrome | Viral infection | Viral infection, Brachioradial Pruritus, Allergic Contact Dermatitis, Bacterial infection, Pneumonia | doctor increased my ssri and now i got fever muscle twitchin |
| 2287 | adult | ED | ADEM | Tension headache | Tension headache, Stroke, Migraine, Cluster headache, Meningitis | child developed weakness in legs after a virus plus headache |
| 2290 | geri | ED | Pulmonary Embolism | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Acute Coronary Syndrome, Pneumonia, Costochondritis | cant catch my breath outta nowhere and my chest hurts when i |
| 2292 | adult | PC | Urinary Tract Infection | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Polypharmacy/Mixed Overdose, Benzodiazepine Overdose | it hurts so bad to pee and theres blood in it |
| 2293 | peds | ED | Appendicitis | Viral infection | Viral infection, Gastroenteritis, Pneumonia, Acute Otitis Media, Bacterial infection | sharp stabbing pain in my lower right belly and i got a feve |
| 2296 | geri | ED | Migraine | Temporal Arteritis | Temporal Arteritis, Stroke, Central Retinal Artery Occlusion, Amaurosis Fugax, Retinal Detachment | my head is pounding so bad i cant see straight and lights ma |
| 2297 | geri | UC | Nephrolithiasis | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Benzodiazepine Overdose, Polypharmacy/Mixed Overdose | pain in my back going down to my groin and theres blood when |
| 2298 | adult | PC | Congestive Heart Failure | Asthma | Asthma, Pulmonary Embolism, Anxiety, Pneumonia, Anemia | so short of breath climbing stairs and my feet look like bal |
| 2300 | adult | UC | COPD Exacerbation | Bronchitis | Bronchitis, Viral URI, ACE inhibitor cough, Pneumonia, Asthma | lungs feel like theyre on fire and i cant stop coughing gree |
| 2301 | geri | PC | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Spinal Stenosis, Cauda Equina Syndrome, Herniated Disc, Compression fracture | fever of 103 and pain in my lower back plus burning when i u |
| 2303 | peds | UC | Diabetic Ketoacidosis | Depression | Depression, Electrolyte abnormality, Acute Nephritis, Anemia, Cannabinoid Hyperemesis Syndrome | my sugar was over 500 and i feel terrible im so nauseous and |
| 2310 | adult | PC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, GERD, Costochondritis, Acute Coronary Syndrome | sharp chest pain outta nowhere and now i cant take a full br |
| 2313 | geri | PC | Ectopic Pregnancy | Acute Pelvic Inflammatory Disease | Acute Pelvic Inflammatory Disease, Ovarian Hyperstimulation Syndrome, Pelvic Congestion Syndrome, Bowel Obstruction, Bladder perforation | pelvic pain with some bleeding and i think i might be pregna |
| 2316 | geri | PC | Pancreatitis | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Diverticulitis, Bowel obstruction | upper stomach pain that gets worse after i eat and im puking |
| 2317 | peds | ED | Cholecystitis | Acute Nephritis | Acute Nephritis, See Vomiting in Pregnancy, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Medication induced | pain under my right ribs especially after eating and im naus |
| 2330 | geri | UC | Pyloric Stenosis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | my 3 week old baby keeps projectile vomiting after every fee |
| 2331 | geri | PC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, Bone Lesions, Peritonsillar Abscess | sore throat came on fast now my child is leaning forward dro |
| 2332 | adult | ED | Henoch-Schonlein Purpura | Polymyalgia Rheumatica | Polymyalgia Rheumatica, Rheumatoid Arthritis, Reactive Arthritis, Viral Arthritis, Systemic Lupus Erythematosus | my kid has a purple rash on his legs and his belly and joint |
| 2333 | peds | UC | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Labral Tear, Anterior or Anterolateral thigh neuropathic pain | my overweight teen has been complaining of hip pain and now  |
| 2335 | geri | ED | Intussusception | Viral Illness | Viral Illness, Sepsis, UTI, Dehydration, Acute Hip and Leg | my infant has episodes of screaming drawing up legs then goi |
| 2336 | geri | UC | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | sudden horrible pain on one side of my pelvis and im throwin |
| 2337 | adult | PC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Appendicitis | pregnant and my belly got really hard and painful and theres |
| 2338 | adult | ED | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder, Substance Use Disorder, Cardiac Arrhythmia | got hit in the chest and now i can barely breathe and feel l |
| 2339 | geri | UC | Status Epilepticus | Needs in-person evaluation | Needs in-person evaluation | my family member started seizing and its been going on and o |
| 2341 | adult | ED | Thyroid Storm | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Bacterial infection, Acute Otitis Media | hyperthyroid and now everything is going haywire fever fast  |
| 2342 | geri | UC | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 2344 | geri | ED | Orbital Cellulitis | Corneal Abrasion | Corneal Abrasion, Conjunctivitis, Foreign Body, Acute Angle Closure Glaucoma, Uveitis | my eye is swollen shut red and it hurts to move it plus i go |
| 2345 | peds | UC | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 2347 | adult | ED | Subdural Hematoma | Meningitis | Meningitis, Substance Intoxication, Toxic/Metabolic Encephalopathy, UTI, Hepatic Encephalopathy | grandpa bumped his head and now hes acting weird and drowsy |
| 2348 | geri | UC | Shingles | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Benzodiazepine Overdose, Polypharmacy/Mixed Overdose | burning painful rash on one side of my body with little blis |
| 2349 | geri | PC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Sepsis, Bacterial infection | daycare kid with fever painful mouth sores and a rash on pal |
| 2350 | geri | ED | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Herpes Zoster (Shingles), Conjunctivitis, Allergic Reaction | my kid has crusty honey colored sores around his mouth and n |
| 2351 | adult | UC | Bronchiolitis | Viral URI | Viral URI, Anaphylaxis, Allergic Rhinitis, Acute Sinusitis, Epistaxis | infant with runny nose that turned into fast breathing and w |
| 2354 | geri | UC | Panic Attack | Pulmonary Embolism | Pulmonary Embolism, Primary Spontaneous Pneumothorax, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 2355 | geri | PC | Sciatica | Musculoskeletal strain | Musculoskeletal strain, Spinal Stenosis, Herniated Disc, Compression fracture, Kidney Stone | back pain that goes down my leg like an electric shock worse |
| 2358 | geri | PC | Hypothyroidism | Hip Fracture | Hip Fracture, Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | im always cold tired and gaining weight even though i barely |
| 2364 | geri | PC | Alcohol Withdrawal | Atrial Fibrillation | Atrial Fibrillation, Supraventricular Tachycardia, Panic Disorder, Cardiac Arrhythmia, Anxiety | trying to detox from alcohol at home and im shaking anxious  |
| 2369 | adult | UC | Psychotic Disorder | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Polypharmacy/Mixed Overdose, Benzodiazepine Overdose | she started talking to people who arent there and thinks som |
| 2370 | adult | PC | Stimulant Intoxication | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, GERD, Costochondritis, Acute Coronary Syndrome | she used cocaine and now shes agitated chest pain and her pu |
| 2373 | geri | PC | Serotonin Syndrome | Viral infection | Viral infection, Brachioradial Pruritus, Pneumonia, Allergic Contact Dermatitis, Bacterial infection | doctor increased my ssri and now i got fever muscle twitchin |
| 2375 | adult | UC | ADEM | Tension headache | Tension headache, Stroke, Migraine, Cluster headache, Meningitis | child developed weakness in legs after a virus plus headache |
| 2381 | adult | UC | Appendicitis | Kidney Stone | Kidney Stone, Pyelonephritis, UTI, Musculoskeletal Strain, Abdominal Aortic Aneurysm | my right side is killing me i cant even stand up straight |
| 2384 | adult | UC | Migraine | Acute Angle Closure Glaucoma | Acute Angle Closure Glaucoma, Subarachnoid Hemorrhage, Conjunctivitis, Corneal Abrasion, Foreign Body | throbbing pain behind my eye and i feel like ima throw up fr |
| 2386 | adult | ED | Congestive Heart Failure | DVT | DVT, Cellulitis, Venous Insufficiency, Musculoskeletal Strain, Lymphedema | keep waking up at night gasping for air and my legs are swol |
| 2387 | geri | UC | Deep Vein Thrombosis | Cellulitis | Cellulitis, Abscess, Contact Dermatitis, Erysipelas, Orbital Cellulitis | one leg is way bigger than the other and its warm and tender |
| 2389 | peds | ED | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Sepsis, Herniated Disc, Spinal Stenosis, Kidney Stone | hurts to pee and now my back is killing me and i got a high  |
| 2392 | adult | ED | Sepsis | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Anxiety, Cardiac Arrhythmia, Atrial Fibrillation | infection got real bad now im lightheaded heart pounding fev |
| 2394 | geri | PC | Pharyngitis | Viral infection | Viral infection, Pneumonia, UTI, Gastroenteritis, Sepsis | hurts so bad to swallow even water and i got a fever |
| 2398 | peds | ED | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, GERD, Costochondritis, Pneumonia | sharp chest pain outta nowhere and now i cant take a full br |
| 2401 | adult | ED | Ectopic Pregnancy | Acute Pelvic Inflammatory Disease | Acute Pelvic Inflammatory Disease, Ovarian Hyperstimulation Syndrome, Pelvic Congestion Syndrome, Bowel Obstruction, Bladder perforation | pelvic pain with some bleeding and i think i might be pregna |
| 2404 | peds | ED | Pancreatitis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | pain in my upper belly going straight through to my back and |
| 2410 | adult | ED | Gastrointestinal Bleeding | BPPV | BPPV, Anxiety, Orthostatic hypotension, Vestibular neuritis, Medication side effect | been pooping black tar looking stuff and feel lightheaded |
| 2418 | adult | PC | Pyloric Stenosis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | my 3 week old baby keeps projectile vomiting after every fee |
| 2419 | geri | ED | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, Bone Lesions, Peritonsillar Abscess | sore throat came on fast now my child is leaning forward dro |
| 2420 | adult | UC | Henoch-Schonlein Purpura | Rheumatoid Arthritis | Rheumatoid Arthritis, Reactive Arthritis, Systemic Lupus Erythematosus, Viral Arthritis, Fibromyalgia | my kid has a purple rash on his legs and his belly and joint |
| 2421 | adult | PC | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Trochanteric Bursitis, Labral Tear | my overweight teen has been complaining of hip pain and now  |
| 2423 | adult | UC | Intussusception | Viral Illness | Viral Illness, Sepsis, Dehydration, Acute Hip and Leg, Hand Foot and Mouth Disease | my infant has episodes of screaming drawing up legs then goi |
| 2424 | peds | PC | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | sudden horrible pain on one side of my pelvis and im throwin |
| 2425 | adult | ED | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Appendicitis | pregnant and my belly got really hard and painful and theres |
| 2426 | peds | UC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder, Substance Use Disorder, Cardiac Arrhythmia | got hit in the chest and now i can barely breathe and feel l |
| 2427 | peds | PC | Status Epilepticus | Needs in-person evaluation | Needs in-person evaluation | my family member started seizing and its been going on and o |
| 2429 | geri | UC | Thyroid Storm | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Sepsis, Bacterial infection | hyperthyroid and now everything is going haywire fever fast  |
| 2430 | geri | PC | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 2432 | adult | UC | Orbital Cellulitis | Corneal Abrasion | Corneal Abrasion, Conjunctivitis, Foreign Body, Uveitis, Acute Angle Closure Glaucoma | my eye is swollen shut red and it hurts to move it plus i go |
| 2433 | peds | PC | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 2434 | geri | ED | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Peptic Ulcer, Appendicitis, Diverticulitis | terrible belly pain after eating and ive been losing weight  |
| 2435 | peds | UC | Subdural Hematoma | Meningitis | Meningitis, Toxic/Metabolic Encephalopathy, UTI, Substance Intoxication, Hypoglycemia | grandpa bumped his head and now hes acting weird and drowsy |
| 2436 | geri | PC | Shingles | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Benzodiazepine Overdose, Polypharmacy/Mixed Overdose | burning painful rash on one side of my body with little blis |
| 2437 | adult | ED | Hand Foot and Mouth Disease | Viral infection | Viral infection, UTI, Pneumonia, Gastroenteritis, Bacterial infection | daycare kid with fever painful mouth sores and a rash on pal |
| 2439 | peds | PC | Bronchiolitis | Viral URI | Viral URI, Nasal Foreign Body, Allergic Rhinitis, Anaphylaxis, Acute Sinusitis | infant with runny nose that turned into fast breathing and w |
| 2442 | geri | PC | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 2443 | adult | ED | Sciatica | Spinal Stenosis | Spinal Stenosis, Musculoskeletal strain, Compression fracture, Herniated Disc, Lumbar Spondylosis | back pain that goes down my leg like an electric shock worse |
| 2446 | adult | ED | Hypothyroidism | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | im always cold tired and gaining weight even though i barely |
| 2451 | geri | PC | Delirium Tremens | Meningitis | Meningitis, Central Retinal Artery Occlusion, Stroke, Amaurosis Fugax, Retinal Detachment | stopped drinking and now im trembling cant think straight an |
| 2453 | adult | UC | Opioid Overdose | Substance Intoxication | Substance Intoxication, Toxic/Metabolic Encephalopathy, UTI, Hypoglycemia, Sepsis | she took a bunch of pills and now shes barely breathing and  |
| 2454 | geri | PC | Opioid Withdrawal | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Sepsis, Bacterial infection | stopped using heroin and now i got chills body aches diarrhe |
| 2456 | geri | UC | Bipolar Disorder — Manic Episode | Needs in-person evaluation | Needs in-person evaluation | i feel amazing like i can do anything havent needed sleep an |
| 2457 | adult | PC | Psychotic Disorder | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Polypharmacy/Mixed Overdose, Benzodiazepine Overdose | she started talking to people who arent there and thinks som |
| 2458 | peds | ED | Stimulant Intoxication | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Anxiety, Cardiac Arrhythmia, Atrial Flutter | he smoked meth and now his heart is racing hes paranoid swea |
| 2461 | adult | ED | Serotonin Syndrome | Viral infection | Viral infection, Brachioradial Pruritus, Allergic Contact Dermatitis, Bacterial infection, Pneumonia | doctor increased my ssri and now i got fever muscle twitchin |
| 2463 | adult | PC | ADEM | Tension headache | Tension headache, Migraine, Stroke, Meningitis, Sinusitis | child developed weakness in legs after a virus plus headache |
| 2466 | geri | PC | Pulmonary Embolism | Atrial Fibrillation | Atrial Fibrillation, Cardiac Arrhythmia, Supraventricular Tachycardia, Panic Disorder, Anxiety | sharp pain in my chest every time i take a breath and my hea |
| 2468 | peds | UC | Urinary Tract Infection | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Trichomoniasis, Bacterial Vaginosis | i keep runnin to the bathroom but barely anything comes out  |
| 2469 | adult | PC | Appendicitis | Major Depressive Disorder | Major Depressive Disorder, Adjustment Disorder, Generalized Anxiety Disorder, Substance Use Disorder, Bipolar Disorder | pain in my stomach moved down to the right side and bumps in |
| 2473 | peds | ED | Nephrolithiasis | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Syphilis, Trichomoniasis | worst pain of my life in my side it comes and goes and i can |
| 2474 | geri | UC | Congestive Heart Failure | Seizure | Seizure, New-Onset Epilepsy, Alcohol Withdrawal Seizure, Stroke, Syncope | cant walk to the mailbox without stopping to rest and my sho |
| 2480 | adult | UC | Sepsis | Viral infection | Viral infection, Meningitis, UTI, Pneumonia, Gastroenteritis | fever wont break im shaking uncontrollably and my heart is r |
| 2481 | peds | PC | Gout | Plantar Fasciitis | Plantar Fasciitis, Ankle Sprain, Stress Fracture, Peripheral Neuropathy, Morton Neuroma | woke up with the worst pain in my foot its swollen hot and t |
| 2486 | peds | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, GERD, Costochondritis, Pneumonia | sharp chest pain outta nowhere and now i cant take a full br |
| 2489 | adult | UC | Ectopic Pregnancy | Acute Pelvic Inflammatory Disease | Acute Pelvic Inflammatory Disease, Ovarian Hyperstimulation Syndrome, Pelvic Congestion Syndrome, Bowel Obstruction, Bladder perforation | pelvic pain with some bleeding and i think i might be pregna |
| 2491 | peds | ED | Diverticulitis | Viral infection | Viral infection, Acute Otitis Media, UTI, Gastroenteritis, Pneumonia | pain in my lower left belly with fever and i been constipate |
| 2492 | geri | UC | Pancreatitis | Gastroenteritis | Gastroenteritis, GERD, Peptic Ulcer, Appendicitis, Diverticulitis | worst belly pain after eating greasy food goes right through |
| 2498 | geri | UC | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | theres blood in my stool bright red and i feel dizzy |
| 2506 | geri | ED | Pyloric Stenosis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Major Depressive Disorder | my 3 week old baby keeps projectile vomiting after every fee |
| 2507 | adult | UC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Peritonsillar Abscess, Infectious Mononucleosis, GERD | sore throat came on fast now my child is leaning forward dro |
| 2508 | geri | PC | Henoch-Schonlein Purpura | Polymyalgia Rheumatica | Polymyalgia Rheumatica, Rheumatoid Arthritis, Reactive Arthritis, Viral Arthritis, Systemic Lupus Erythematosus | my kid has a purple rash on his legs and his belly and joint |
| 2509 | adult | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Labral Tear, Anterior or Anterolateral thigh neuropathic pain | my overweight teen has been complaining of hip pain and now  |
| 2511 | geri | PC | Intussusception | Viral Illness | Viral Illness, Sepsis, Dehydration, Acute Hip and Leg, Hand Foot and Mouth Disease | my infant has episodes of screaming drawing up legs then goi |
| 2512 | adult | ED | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | sudden horrible pain on one side of my pelvis and im throwin |
| 2513 | peds | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Appendicitis, Cholecystitis | pregnant and my belly got really hard and painful and theres |
| 2514 | peds | PC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Major Depressive Disorder, Panic Disorder, Substance Use Disorder, Cardiac Arrhythmia | got hit in the chest and now i can barely breathe and feel l |
| 2515 | adult | ED | Status Epilepticus | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | my family member started seizing and its been going on and o |
| 2517 | adult | PC | Thyroid Storm | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Bacterial infection, Acute Otitis Media | hyperthyroid and now everything is going haywire fever fast  |
| 2518 | adult | ED | Rhabdomyolysis | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Atrophic Vaginitis, Female Sexual Arousal Disorder, Hypogonadism | worked out way too hard muscles are killing me and my pee is |
| 2520 | adult | PC | Orbital Cellulitis | Corneal Abrasion | Corneal Abrasion, Conjunctivitis, Foreign Body, Uveitis, Acute Angle Closure Glaucoma | my eye is swollen shut red and it hurts to move it plus i go |
| 2521 | geri | ED | Temporal Arteritis | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Atrophic Vaginitis, Migraine | my temple area is tender and throbbing and i noticed my visi |
| 2522 | adult | UC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Appendicitis, Peptic Ulcer, Pancreatitis | terrible belly pain after eating and ive been losing weight  |
| 2523 | peds | PC | Subdural Hematoma | Meningitis | Meningitis, Toxic/Metabolic Encephalopathy, UTI, Substance Intoxication, Hypoglycemia | grandpa bumped his head and now hes acting weird and drowsy |
| 2524 | geri | ED | Shingles | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Benzodiazepine Overdose | burning painful rash on one side of my body with little blis |
| 2526 | geri | PC | Impetigo | Erectile Dysfunction | Erectile Dysfunction, Medication-Induced Sexual Dysfunction, Hypogonadism, Premature Ejaculation, Peyronie Disease | my kid has crusty honey colored sores around his mouth and n |
| 2527 | geri | ED | Bronchiolitis | Viral URI | Viral URI, Anaphylaxis, Allergic Rhinitis, Acute Sinusitis, Epistaxis | infant with runny nose that turned into fast breathing and w |
| 2528 | adult | UC | Atrial Fibrillation | BPPV | BPPV, Anxiety, Vestibular neuritis, Orthostatic hypotension, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 2530 | peds | ED | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 2531 | peds | UC | Sciatica | Musculoskeletal strain | Musculoskeletal strain, Herniated Disc, Spinal Stenosis, Kidney Stone, Lumbar Spondylosis | back pain that goes down my leg like an electric shock worse |
| 2533 | adult | ED | Hemorrhoids | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Atrophic Vaginitis | pain and bleeding when i go to the bathroom theres a lump ne |
| 2534 | adult | UC | Hypothyroidism | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | im always cold tired and gaining weight even though i barely |
| 2540 | geri | UC | Alcohol Withdrawal | Delirium Tremens | Delirium Tremens, Toxic/Metabolic Encephalopathy, Substance Intoxication, Sepsis, Hepatic Encephalopathy | last drink was 2 days ago and now i got the shakes sweating  |
| 2542 | adult | ED | Opioid Withdrawal | Viral Illness | Viral Illness, Fibromyalgia, Sleep Apnea, Acute Gastroenteritis, Chronic Fatigue Syndrome | ran out of my pain pills 2 days ago and my whole body aches  |
| 2545 | adult | ED | Psychotic Disorder | Opioid Overdose | Opioid Overdose, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Alcohol Intoxication, Stimulant Intoxication | she started talking to people who arent there and thinks som |
| 2546 | geri | UC | Stimulant Intoxication | Atrial Fibrillation | Atrial Fibrillation, Anxiety, Cardiac Arrhythmia, Supraventricular Tachycardia, Panic Disorder | took too much adderall and my heart is pounding im shaking a |
| 2548 | peds | ED | Hepatic Encephalopathy | Toxic/Metabolic Encephalopathy | Toxic/Metabolic Encephalopathy, Substance Intoxication, UTI, Hypoglycemia, Sepsis | my mom has liver disease and shes getting more confused and  |
| 2549 | adult | UC | Serotonin Syndrome | Viral infection | Viral infection, Brachioradial Pruritus, Allergic Contact Dermatitis, Bacterial infection, UTI | doctor increased my ssri and now i got fever muscle twitchin |
| 2551 | peds | ED | ADEM | Tension headache | Tension headache, Migraine, Stroke, Meningitis, Sinusitis | child developed weakness in legs after a virus plus headache |
| 2554 | geri | ED | Pulmonary Embolism | COPD exacerbation | COPD exacerbation, Asthma, Pneumonia, Viral URI | feel like im suffocating and theres this stabbing pain on th |
| 2555 | peds | UC | Pneumonia | Viral URI | Viral URI, Bronchitis, Post-Bronchitic cough, Sepsis, Asthma | been coughing up green stuff for a week and got the chills r |
| 2556 | peds | PC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | feels like peein razor blades and my pee smells awful |
| 2560 | geri | ED | Migraine | Central Retinal Artery Occlusion | Central Retinal Artery Occlusion, Stroke, Amaurosis Fugax, Retinal Detachment, Temporal Arteritis | my head is pounding so bad i cant see straight and lights ma |
| 2561 | peds | UC | Nephrolithiasis | Opioid Overdose | Opioid Overdose, Polypharmacy/Mixed Overdose, Alcohol Intoxication, Acetaminophen Overdose, Benzodiazepine Overdose | pain in my back going down to my groin and theres blood when |
| 2562 | peds | PC | Congestive Heart Failure | Asthma | Asthma, Anxiety, Pulmonary Embolism, Pneumonia, Anemia | gained like 10 pounds in a week all water weight and cant ca |
| 2564 | adult | UC | COPD Exacerbation | Bronchitis | Bronchitis, Viral URI, ACE inhibitor cough, Pneumonia, Asthma | lungs feel like theyre on fire and i cant stop coughing gree |
| 2565 | adult | PC | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Cauda Equina Syndrome, Herniated Disc, Kidney Stone, Spinal Stenosis | fever of 103 and pain in my lower back plus burning when i u |
| 2567 | peds | UC | Diabetic Ketoacidosis | Depression | Depression, Electrolyte abnormality, Acute Nephritis, Anemia, Cannabinoid Hyperemesis Syndrome | my sugar was over 500 and i feel terrible im so nauseous and |
| 2568 | geri | PC | Sepsis | Atrial Fibrillation | Atrial Fibrillation, Supraventricular Tachycardia, Cardiac Arrhythmia, Panic Disorder, Anxiety | had a cut that got infected now i feel terrible fever racing |
| 2574 | peds | PC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, Anxiety, GERD | sharp chest pain outta nowhere and now i cant take a full br |
| 2579 | peds | UC | Diverticulitis | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Peptic Ulcer, Mesenteric Adenitis | left side of my gut hurts and i got a fever and feel bloated |
| 2580 | peds | PC | Pancreatitis | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Medication Induced Vomiting, Peptic Ulcer | upper stomach pain that gets worse after i eat and im puking |
| 2581 | peds | ED | Cholecystitis | Acute Nephritis | Acute Nephritis, See Vomiting in Pregnancy, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Medication induced | pain under my right ribs especially after eating and im naus |
| 2594 | geri | UC | Pyloric Stenosis | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Acute Gastroenteritis, Premature Ejaculation | my 3 week old baby keeps projectile vomiting after every fee |
| 2595 | geri | PC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, Bone Lesions, Peritonsillar Abscess | sore throat came on fast now my child is leaning forward dro |
| 2596 | geri | ED | Henoch-Schonlein Purpura | Polymyalgia Rheumatica | Polymyalgia Rheumatica, Rheumatoid Arthritis, Reactive Arthritis, Viral Arthritis, Systemic Lupus Erythematosus | my kid has a purple rash on his legs and his belly and joint |
| 2597 | peds | UC | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Anterior or Anterolateral thigh neuropathic pain, Labral Tear | my overweight teen has been complaining of hip pain and now  |
| 2599 | adult | ED | Intussusception | Viral Illness | Viral Illness, Sepsis, Dehydration, Acute Hip and Leg, Hand Foot and Mouth Disease | my infant has episodes of screaming drawing up legs then goi |
| 2600 | adult | UC | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | sudden horrible pain on one side of my pelvis and im throwin |
| 2601 | adult | PC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Appendicitis | pregnant and my belly got really hard and painful and theres |
| 2602 | geri | ED | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Major Depressive Disorder, Panic Disorder, Cardiac Arrhythmia, Substance Use Disorder | got hit in the chest and now i can barely breathe and feel l |
| 2603 | adult | UC | Status Epilepticus | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Atrophic Vaginitis, Female Sexual Arousal Disorder, Hypogonadism | my family member started seizing and its been going on and o |
| 2605 | adult | ED | Thyroid Storm | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Bacterial infection, Acute Otitis Media | hyperthyroid and now everything is going haywire fever fast  |
| 2606 | peds | UC | Rhabdomyolysis | Medication-Induced Sexual Dysfunction | Medication-Induced Sexual Dysfunction, Hypogonadism, Premature Ejaculation, Peyronie Disease, Dyspareunia | worked out way too hard muscles are killing me and my pee is |
| 2609 | geri | UC | Temporal Arteritis | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Atrophic Vaginitis, Migraine | my temple area is tender and throbbing and i noticed my visi |
| 2610 | geri | PC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Diverticulitis, Appendicitis | terrible belly pain after eating and ive been losing weight  |
| 2611 | geri | ED | Subdural Hematoma | Meningitis | Meningitis, Delirium Tremens, Toxic/Metabolic Encephalopathy, Substance Intoxication, Sepsis | grandpa bumped his head and now hes acting weird and drowsy |
| 2612 | adult | UC | Shingles | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Polypharmacy/Mixed Overdose, Benzodiazepine Overdose | burning painful rash on one side of my body with little blis |
| 2613 | adult | PC | Hand Foot and Mouth Disease | Viral infection | Viral infection, UTI, Pneumonia, Gastroenteritis, Bacterial infection | daycare kid with fever painful mouth sores and a rash on pal |
| 2614 | geri | ED | Impetigo | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Atrophic Vaginitis, Female Sexual Arousal Disorder, Hypogonadism | my kid has crusty honey colored sores around his mouth and n |
| 2615 | adult | UC | Bronchiolitis | Viral URI | Viral URI, Allergic Rhinitis, Anaphylaxis, Acute Sinusitis, Nasal Foreign Body | infant with runny nose that turned into fast breathing and w |
| 2618 | adult | UC | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 2619 | adult | PC | Sciatica | Musculoskeletal strain | Musculoskeletal strain, Herniated Disc, Compression fracture, Spinal Stenosis, Lumbar Spondylosis | back pain that goes down my leg like an electric shock worse |
| 2621 | adult | UC | Hemorrhoids | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Atrophic Vaginitis | pain and bleeding when i go to the bathroom theres a lump ne |
| 2622 | adult | PC | Hypothyroidism | Fracture | Fracture, Soft Tissue Injury, Hip Fracture, Rib Fracture, Traumatic Brain Injury | im always cold tired and gaining weight even though i barely |
| 2628 | geri | PC | Alcohol Withdrawal | Atrial Fibrillation | Atrial Fibrillation, Supraventricular Tachycardia, Panic Disorder, Cardiac Arrhythmia, Anxiety | trying to detox from alcohol at home and im shaking anxious  |
| 2633 | geri | UC | Psychotic Disorder | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Benzodiazepine Overdose, Polypharmacy/Mixed Overdose | she started talking to people who arent there and thinks som |
| 2634 | geri | PC | Stimulant Intoxication | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, GERD, Acute Coronary Syndrome | she used cocaine and now shes agitated chest pain and her pu |
| 2637 | geri | PC | Serotonin Syndrome | Viral infection | Viral infection, Brachioradial Pruritus, Allergic Contact Dermatitis, Bacterial infection, Pneumonia | doctor increased my ssri and now i got fever muscle twitchin |
| 2638 | peds | ED | Neuroleptic Malignant Syndrome | Meningitis | Meningitis, Viral infection, Acute Otitis Media, Gastroenteritis, Pneumonia | started haldol and now hes rigid as a board with a high feve |
| 2639 | geri | UC | ADEM | Tension headache | Tension headache, Stroke, Meningitis, Cluster headache, Migraine | child developed weakness in legs after a virus plus headache |
| 2642 | peds | UC | Pulmonary Embolism | Viral URI | Viral URI, Bronchitis, Post-Bronchitic cough, Asthma, Pneumonia | i was just sittin there and suddenly couldnt breathe and sta |
| 2645 | peds | UC | Appendicitis | Medication-Induced Sexual Dysfunction | Medication-Induced Sexual Dysfunction, Hypogonadism, Acute Gastroenteritis, Premature Ejaculation, Medication Induced Vomiting | started around my belly button now the pain moved to the low |
| 2648 | geri | UC | Migraine | Acute Angle Closure Glaucoma | Acute Angle Closure Glaucoma, Subarachnoid Hemorrhage, Conjunctivitis, Corneal Abrasion, Foreign Body | throbbing pain behind my eye and i feel like ima throw up fr |
| 2650 | adult | ED | Congestive Heart Failure | Asthma | Asthma, Pulmonary Embolism, Pneumonia, Anxiety, Pneumothorax | my ankles are huge and i cant breathe when i lay down at nig |
| 2651 | adult | UC | Deep Vein Thrombosis | Cellulitis | Cellulitis, Abscess, Contact Dermatitis, Orbital Cellulitis, Erysipelas | one leg is way bigger than the other and its warm and tender |
| 2653 | peds | ED | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Sepsis, Herniated Disc, Compression fracture, Spinal Stenosis | hurts to pee and now my back is killing me and i got a high  |
| 2657 | peds | UC | Gout | Plantar Fasciitis | Plantar Fasciitis, Ankle Sprain, Stress Fracture, Morton Neuroma, Peripheral Neuropathy | toe joint blew up overnight cant walk on it and its bright r |
| 2658 | geri | PC | Pharyngitis | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Sepsis, Bacterial infection | hurts so bad to swallow even water and i got a fever |
| 2662 | peds | ED | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, GERD, Anxiety | sharp chest pain outta nowhere and now i cant take a full br |
| 2667 | peds | PC | Diverticulitis | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Peptic Ulcer, Mesenteric Adenitis | belly pain on the lower left that gets worse and i dont wann |
| 2668 | geri | ED | Pancreatitis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | pain in my upper belly going straight through to my back and |
| 2674 | geri | ED | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | been pooping black tar looking stuff and feel lightheaded |
| 2675 | adult | UC | Constipation | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Diverticulitis, Appendicitis | cant go to the bathroom belly is hard and hurts |
| 2682 | geri | PC | Pyloric Stenosis | Dyspareunia | Dyspareunia, Female Sexual Arousal Disorder, Medication-Induced Sexual Dysfunction, Atrophic Vaginitis, Acute Gastroenteritis | my 3 week old baby keeps projectile vomiting after every fee |
| 2683 | adult | ED | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, GERD, Bone Lesions | sore throat came on fast now my child is leaning forward dro |
| 2684 | adult | UC | Henoch-Schonlein Purpura | Systemic Lupus Erythematosus | Systemic Lupus Erythematosus, Rheumatoid Arthritis, Fibromyalgia, Mixed Connective Tissue Disease, Sjogren Syndrome | my kid has a purple rash on his legs and his belly and joint |
| 2685 | adult | PC | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Labral Tear, Anterior or Anterolateral thigh neuropathic pain | my overweight teen has been complaining of hip pain and now  |
| 2687 | geri | UC | Intussusception | Viral Illness | Viral Illness, Sepsis, UTI, Dehydration, Acute Hip and Leg | my infant has episodes of screaming drawing up legs then goi |
| 2688 | peds | PC | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | sudden horrible pain on one side of my pelvis and im throwin |
| 2689 | geri | ED | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Diverticulitis | pregnant and my belly got really hard and painful and theres |
| 2690 | peds | UC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder, Hyperthyroidism, Substance Use Disorder | got hit in the chest and now i can barely breathe and feel l |
| 2691 | adult | PC | Status Epilepticus | Erectile Dysfunction | Erectile Dysfunction, Medication-Induced Sexual Dysfunction, Hypogonadism, Premature Ejaculation, Peyronie Disease | my family member started seizing and its been going on and o |
| 2693 | geri | UC | Thyroid Storm | Viral infection | Viral infection, Pneumonia, UTI, Gastroenteritis, Sepsis | hyperthyroid and now everything is going haywire fever fast  |
| 2694 | adult | PC | Rhabdomyolysis | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Atrophic Vaginitis | worked out way too hard muscles are killing me and my pee is |
| 2697 | adult | PC | Temporal Arteritis | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Atrophic Vaginitis, Hypogonadism | my temple area is tender and throbbing and i noticed my visi |
| 2698 | adult | ED | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Cholecystitis, Ectopic Pregnancy | terrible belly pain after eating and ive been losing weight  |
| 2699 | peds | UC | Subdural Hematoma | Meningitis | Meningitis, Toxic/Metabolic Encephalopathy, Substance Intoxication, UTI, Hypoglycemia | grandpa bumped his head and now hes acting weird and drowsy |


## Failure Mode Breakdown

| Mode | Count | % of Total |
|---|---|---|
| Dead-end ("Needs in-person") | 6 | 1.2% |
| Viral over-generalization | 29 | 5.8% |
| Wrong diagnosis | 193 | 38.6% |
| API errors | 0 | 0.0% |

### Dead-End Cases

| Expected | CC (truncated) |
|---|---|
| Status Epilepticus (3) | my family member started seizing and its been going on and o |
| Nephrolithiasis (1) | worst pain of my life in my side it comes and goes and i can |
| Bipolar Disorder — Manic Episode (1) | i feel amazing like i can do anything havent needed sleep an |
| Urinary Tract Infection (1) | feels like peein razor blades and my pee smells awful |

### Viral Over-Generalization Cases

| Expected | CC (truncated) |
|---|---|
| Thyroid Storm (6) | hyperthyroid and now everything is going haywire fever fast  |
| Bronchiolitis (5) | infant with runny nose that turned into fast breathing and w |
| Serotonin Syndrome (5) | doctor increased my ssri and now i got fever muscle twitchin |
| Hand Foot and Mouth Disease (4) | daycare kid with fever painful mouth sores and a rash on pal |
| Diverticulitis (2) | pain in my lower left belly with fever and i been constipate |
| Pharyngitis (2) | hurts so bad to swallow even water and i got a fever |
| Appendicitis (1) | sharp stabbing pain in my lower right belly and i got a feve |
| Opioid Withdrawal (1) | stopped using heroin and now i got chills body aches diarrhe |
| Sepsis (1) | fever wont break im shaking uncontrollably and my heart is r |
| Pneumonia (1) | been coughing up green stuff for a week and got the chills r |
| Pulmonary Embolism (1) | i was just sittin there and suddenly couldnt breathe and sta |

## Per-Condition Accuracy

| Condition | Hits | Total | Accuracy | Primary Failure Mode |
|---|---|---|---|---|
| Pneumothorax | 0 | 6 | 0% | Musculoskeletal pain |
| Pancreatitis | 0 | 6 | 0% | Gastroenteritis |
| Pyloric Stenosis | 0 | 6 | 0% | Acute Gastroenteritis |
| Epiglottitis | 0 | 6 | 0% | Viral Pharyngitis |
| Henoch-Schonlein Purpura | 0 | 6 | 0% | Polymyalgia Rheumatica |
| Slipped Capital Femoral Epiphysis | 0 | 6 | 0% | Hip Fracture |
| Ovarian Torsion | 0 | 6 | 0% | Acute Gastroenteritis |
| Placental Abruption | 0 | 6 | 0% | Ectopic Pregnancy |
| Tension Pneumothorax | 0 | 6 | 0% | Generalized Anxiety Disorder |
| Status Epilepticus | 0 | 6 | 0% | Needs in-person evaluation |
| Thyroid Storm | 0 | 6 | 0% | Viral infection |
| Rhabdomyolysis | 0 | 6 | 0% | Stroke |
| Temporal Arteritis | 0 | 6 | 0% | Iron Deficiency Anemia |
| Subdural Hematoma | 0 | 6 | 0% | Meningitis |
| Shingles | 0 | 5 | 0% | Opioid Overdose |
| Bronchiolitis | 0 | 5 | 0% | Viral URI |
| Panic Attack | 0 | 5 | 0% | Primary Spontaneous Pneumothorax |
| Sciatica | 0 | 5 | 0% | Musculoskeletal strain |
| Hypothyroidism | 0 | 5 | 0% | Fracture |
| Psychotic Disorder | 0 | 5 | 0% | Opioid Overdose |
| Stimulant Intoxication | 0 | 5 | 0% | Atrial Fibrillation |
| Serotonin Syndrome | 0 | 5 | 0% | Viral infection |
| ADEM | 0 | 5 | 0% | Tension headache |
| Pulmonary Embolism | 1 | 6 | 17% | Bronchitis |
| Appendicitis | 1 | 6 | 17% | Acute Gastroenteritis |
| Congestive Heart Failure | 1 | 6 | 17% | Asthma |
| Intussusception | 1 | 6 | 17% | Viral Illness |
| Mesenteric Ischemia | 1 | 6 | 17% | Gastroenteritis |
| Hand Foot and Mouth Disease | 1 | 5 | 20% | Viral infection |
| Alcohol Withdrawal | 1 | 5 | 20% | Delirium Tremens |
| Migraine | 2 | 6 | 33% | Acute Angle Closure Glaucoma |
| Nephrolithiasis | 2 | 6 | 33% | Opioid Overdose |
| Pyelonephritis | 2 | 6 | 33% | Musculoskeletal strain |
| Ectopic Pregnancy | 2 | 6 | 33% | Acute Pelvic Inflammatory Disease |
| Diverticulitis | 2 | 6 | 33% | Viral infection |
| Gastrointestinal Bleeding | 2 | 6 | 33% | BPPV |
| Orbital Cellulitis | 2 | 6 | 33% | Corneal Abrasion |
| Impetigo | 2 | 5 | 40% | Contact Dermatitis |
| Opioid Withdrawal | 2 | 5 | 40% | Fibromyalgia |
| Urinary Tract Infection | 3 | 6 | 50% | Opioid Overdose |
| Sepsis | 3 | 6 | 50% | Supraventricular Tachycardia |
| Gout | 3 | 6 | 50% | Plantar Fasciitis |
| Atrial Fibrillation | 3 | 5 | 60% | BPPV |
| Hemorrhoids | 3 | 5 | 60% | Dyspareunia |
| Hepatic Encephalopathy | 3 | 5 | 60% | UTI |
| Deep Vein Thrombosis | 4 | 6 | 67% | Cellulitis |
| COPD Exacerbation | 4 | 6 | 67% | Bronchitis |
| Diabetic Ketoacidosis | 4 | 6 | 67% | Depression |
| Pharyngitis | 4 | 6 | 67% | Viral infection |
| Cholecystitis | 4 | 6 | 67% | Acute Nephritis |
| Delirium Tremens | 4 | 5 | 80% | Meningitis |
| Opioid Overdose | 4 | 5 | 80% | Substance Intoxication |
| Bipolar Disorder — Manic Episode | 4 | 5 | 80% | Needs in-person evaluation |
| Neuroleptic Malignant Syndrome | 4 | 5 | 80% | Meningitis |
| Pneumonia | 5 | 6 | 83% | Viral URI |
| Aortic Dissection | 5 | 6 | 83% | Acute Hemorrhage |
| Constipation | 5 | 6 | 83% | Gastroenteritis |
| Acute Myocardial Infarction | 6 | 6 | 100% | - |
| Stroke | 6 | 6 | 100% | - |
| Asthma | 6 | 6 | 100% | - |
| Gastroenteritis | 6 | 6 | 100% | - |
| Meningitis | 6 | 6 | 100% | - |
| Cellulitis | 6 | 6 | 100% | - |
| Bronchitis | 6 | 6 | 100% | - |
| Upper Respiratory Infection | 6 | 6 | 100% | - |
| Subarachnoid Hemorrhage | 6 | 6 | 100% | - |
| Testicular Torsion | 6 | 6 | 100% | - |
| Croup | 6 | 6 | 100% | - |
| Otitis Media | 6 | 6 | 100% | - |
| Febrile Seizure | 6 | 6 | 100% | - |
| Hip Fracture | 6 | 6 | 100% | - |
| Benign Paroxysmal Positional Vertigo | 6 | 6 | 100% | - |
| Anaphylaxis | 6 | 6 | 100% | - |
| Preeclampsia | 6 | 6 | 100% | - |
| Cauda Equina Syndrome | 6 | 6 | 100% | - |
| Peritonsillar Abscess | 6 | 6 | 100% | - |
| Nursemaid Elbow | 6 | 6 | 100% | - |
| Kawasaki Disease | 6 | 6 | 100% | - |
| Addison Crisis | 6 | 6 | 100% | - |
| Corneal Abrasion | 6 | 6 | 100% | - |
| Depression | 5 | 5 | 100% | - |
| Bowel Obstruction | 5 | 5 | 100% | - |
| Peripheral Neuropathy | 5 | 5 | 100% | - |
| Plantar Fasciitis | 5 | 5 | 100% | - |
| Carpal Tunnel Syndrome | 5 | 5 | 100% | - |
| Fibromyalgia | 5 | 5 | 100% | - |
| Cannabinoid Hyperemesis Syndrome | 5 | 5 | 100% | - |
| Wernicke Encephalopathy | 5 | 5 | 100% | - |

