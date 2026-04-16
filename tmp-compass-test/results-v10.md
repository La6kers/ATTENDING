# COMPASS Stress Test — 500 API Cases (v10)

**Date:** 2026-04-16T15:13:49.521Z
**Endpoint:** http://localhost:3005/api/diagnose
**Total cases:** 500

## Overall Accuracy

| Metric | Value |
|---|---|
| **Hits (primary or top-5)** | 169 |
| **Misses** | 331 |
| **Errors** | 0 |
| **Accuracy** | **33.8%** |

## By Demographic

| Demo | Hits | Total | Accuracy |
|---|---|---|---|
| adult | 57 | 200 | 28.5% |
| geri | 76 | 175 | 43.4% |
| peds | 36 | 125 | 28.8% |

## By Setting

| Setting | Hits | Total | Accuracy |
|---|---|---|---|
| ED | 69 | 167 | 41.3% |
| UC | 39 | 167 | 23.4% |
| PC | 61 | 166 | 36.7% |

## Latency

| Percentile | ms |
|---|---|
| p50 | 14 |
| p95 | 19 |
| p99 | 22 |

## Top 10 Most-Missed Conditions

| Condition | Misses |
|---|---|
| Pulmonary Embolism | 7 |
| Urinary Tract Infection | 7 |
| Appendicitis | 7 |
| Gastroenteritis | 7 |
| Nephrolithiasis | 7 |
| Gout | 7 |
| Pharyngitis | 7 |
| Cellulitis | 7 |
| Pneumothorax | 7 |
| Diverticulitis | 7 |

## Top 10 Most-Reliable Conditions (100% hit rate, n>=2)

| Condition | Hits/Total |
|---|---|
| Acute Myocardial Infarction | 7/7 |
| Stroke | 7/7 |
| Asthma | 7/7 |
| Migraine | 7/7 |
| Deep Vein Thrombosis | 7/7 |
| Pyelonephritis | 7/7 |
| Meningitis | 7/7 |
| Diabetic Ketoacidosis | 7/7 |
| Bronchitis | 7/7 |
| Upper Respiratory Infection | 7/7 |

## All Misses

| ID | Demo | Setting | Expected | Got (Primary) | Top 5 | CC |
|---|---|---|---|---|---|---|
| 1202 | geri | PC | Pulmonary Embolism | Bronchitis | Bronchitis, ACE inhibitor cough, Viral URI, Pneumonia, Asthma | i was just sittin there and suddenly couldnt breathe and sta |
| 1203 | adult | ED | Pneumonia | Musculoskeletal pain | Musculoskeletal pain, Post-Bronchitic cough, Sepsis, Costochondritis, Anxiety | chest hurts when i cough and i been runnin a fever of 102 fo |
| 1204 | geri | UC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | constant urge to pee and it burns every single time |
| 1205 | peds | PC | Appendicitis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Viral infection | started around my belly button now the pain moved to the low |
| 1207 | adult | UC | Gastroenteritis | Viral infection | Viral infection, Bacterial infection, UTI | my stomach is a mess been runnin to the toilet every hour |
| 1209 | adult | ED | Nephrolithiasis | Needs in-person evaluation | Needs in-person evaluation | worst pain of my life in my side it comes and goes and i can |
| 1210 | peds | UC | Congestive Heart Failure | Asthma | Asthma, Pneumonia, Pulmonary Embolism, Anxiety, Pneumothorax | my ankles are huge and i cant breathe when i lay down at nig |
| 1212 | adult | ED | COPD Exacerbation | Asthma | Asthma, Bronchi, Pneumonia, Anxiety, Post-infectious cough | my copd is acting up cant breathe and coughing way more than |
| 1217 | peds | PC | Gout | Needs in-person evaluation | Needs in-person evaluation | woke up with the worst pain in my foot its swollen hot and t |
| 1218 | adult | ED | Pharyngitis | Esophageal Stricture | Esophageal Stricture, Anaphylaxis, GERD, Esophageal Cancer, Eosinophilic Esophagitis | throat is on fire cant swallow and theres white spots back t |
| 1219 | adult | UC | Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | skin on my arm is red warm and tender and the redness keeps  |
| 1222 | peds | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, GERD, Anxiety | sharp chest pain outta nowhere and now i cant take a full br |
| 1223 | peds | PC | Aortic Dissection | Acute Hemorrhage | Acute Hemorrhage, Subset of patients present with Syncope Plus another key symptom, Other Reflex Mediated Syncope causes, Carotid Sinus Syncope, Metabolic Disorders | ripping sensation in my chest going through to my back and i |
| 1225 | adult | UC | Ectopic Pregnancy | Acute Pelvic Inflammatory Disease | Acute Pelvic Inflammatory Disease, Ovarian Hyperstimulation Syndrome, Pelvic Congestion Syndrome, Bowel Obstruction, Bladder perforation | pelvic pain with some bleeding and i think i might be pregna |
| 1227 | geri | ED | Diverticulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | pain in my lower left belly with fever and i been constipate |
| 1228 | geri | UC | Pancreatitis | Gastroenteritis | Gastroenteritis, GERD, Peptic Ulcer, Appendicitis, Diverticulitis | worst belly pain after eating greasy food goes right through |
| 1229 | adult | PC | Cholecystitis | Kidney Stone | Kidney Stone, UTI, Prostatitis, Acute Gastroenteritis, Urethritis | gallbladder area is killing me after that burger cant stop p |
| 1230 | adult | ED | Croup | Post-Bronchitic cough | Post-Bronchitic cough, Viral URI, Foreign Body Aspiration, Bronchitis, Fungal Lung Infection | my baby has a barking cough sounds like a seal and is having |
| 1231 | peds | UC | Otitis Media | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | my kid is screamin and grabbin his ear and got a fever |
| 1234 | geri | UC | Gastrointestinal Bleeding | Orthostatic hypotension | Orthostatic hypotension, BPPV, Vestibular neuritis, Cardiac Arrhythmia, Medication side effect | theres blood in my stool bright red and i feel dizzy |
| 1235 | geri | PC | Constipation | Appendicitis | Appendicitis, Cholecystitis, Pancreatitis | cant go to the bathroom belly is hard and hurts |
| 1236 | adult | ED | Benign Paroxysmal Positional Vertigo | Needs in-person evaluation | Needs in-person evaluation | everythings spinnin when i turn my head or roll over in bed |
| 1240 | geri | UC | Peritonsillar Abscess | Esophageal Cancer | Esophageal Cancer, Esophageal Stricture, Eosinophilic Esophagitis, GERD, Achalasia | cant swallow at all one side of my throat is huge and i soun |
| 1241 | peds | PC | Nursemaid Elbow | Needs in-person evaluation | Needs in-person evaluation | my kid is holding her arm still and cries if you try to move |
| 1242 | geri | ED | Pyloric Stenosis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | my 3 week old baby keeps projectile vomiting after every fee |
| 1243 | peds | UC | Epiglottitis | Esophageal Stricture | Esophageal Stricture, GERD, Eosinophilic Esophagitis, Achalasia, Esophageal Cancer | sore throat came on fast now my child is leaning forward dro |
| 1244 | geri | PC | Henoch-Schonlein Purpura | Systemic Lupus Erythematosus | Systemic Lupus Erythematosus, Rheumatoid Arthritis, Polymyalgia Rheumatica, Fibromyalgia, Sjogren Syndrome | my kid has a purple rash on his legs and his belly and joint |
| 1245 | adult | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Labral Tear, Anterior or Anterolateral thigh neuropathic pain | my overweight teen has been complaining of hip pain and now  |
| 1247 | geri | PC | Intussusception | Viral Illness | Viral Illness, Sepsis, UTI, Dehydration, Acute Hip and Leg | my infant has episodes of screaming drawing up legs then goi |
| 1248 | geri | ED | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | sudden horrible pain on one side of my pelvis and im throwin |
| 1249 | peds | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy | pregnant and my belly got really hard and painful and theres |
| 1250 | adult | PC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder, Substance Use Disorder, Cardiac Arrhythmia | got hit in the chest and now i can barely breathe and feel l |
| 1251 | peds | ED | Status Epilepticus | Needs in-person evaluation | Needs in-person evaluation | my family member started seizing and its been going on and o |
| 1253 | geri | PC | Thyroid Storm | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | hyperthyroid and now everything is going haywire fever fast  |
| 1254 | adult | ED | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 1255 | peds | UC | Corneal Abrasion | Needs in-person evaluation | Needs in-person evaluation | feels like something is stuck in my eye its tearing up and i |
| 1256 | peds | PC | Orbital Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | my eye is swollen shut red and it hurts to move it plus i go |
| 1257 | adult | ED | Temporal Arteritis | Needs in-person evaluation | Needs in-person evaluation | my temple area is tender and throbbing and i noticed my visi |
| 1258 | adult | UC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Cholecystitis, Ectopic Pregnancy | terrible belly pain after eating and ive been losing weight  |
| 1259 | peds | PC | Subdural Hematoma | Tension headache | Tension headache, Migraine, Cluster headache | grandpa bumped his head and now hes acting weird and drowsy |
| 1260 | peds | ED | Shingles | Viral Exanthem | Viral Exanthem, Contact Dermatitis, Conjunctivitis, Varicella (Chickenpox), Hand Foot and Mouth Disease | burning painful rash on one side of my body with little blis |
| 1261 | peds | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | daycare kid with fever painful mouth sores and a rash on pal |
| 1262 | adult | PC | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Conjunctivitis, Allergic Reaction, Cellulitis | my kid has crusty honey colored sores around his mouth and n |
| 1263 | geri | ED | Bronchiolitis | Viral URI | Viral URI, Anaphylaxis, Allergic Rhinitis, Acute Sinusitis, Epistaxis | infant with runny nose that turned into fast breathing and w |
| 1264 | adult | UC | Atrial Fibrillation | BPPV | BPPV, Anxiety, Vestibular neuritis, Orthostatic hypotension, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 1266 | geri | ED | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 1267 | peds | UC | Sciatica | Musculoskeletal strain | Musculoskeletal strain, Herniated Disc, Spinal Stenosis, Kidney Stone, Lumbar Spondylosis | back pain that goes down my leg like an electric shock worse |
| 1268 | adult | PC | Bowel Obstruction | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | belly is huge and hard havent passed gas or pooped in days a |
| 1270 | adult | UC | Hypothyroidism | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | im always cold tired and gaining weight even though i barely |
| 1271 | adult | PC | Peripheral Neuropathy | Needs in-person evaluation | Needs in-person evaluation | numbness starting in my toes working up and i keep dropping  |
| 1272 | geri | ED | Plantar Fasciitis | Needs in-person evaluation | Needs in-person evaluation | my heel kills me first thing in the morning when i step outt |
| 1273 | geri | UC | Carpal Tunnel Syndrome | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | wrist hurts and my thumb and first two fingers tingle especi |
| 1277 | geri | PC | Pulmonary Embolism | Bronchitis | Bronchitis, Viral URI, ACE inhibitor cough, Pneumonia, COPD exacerbation | i was just sittin there and suddenly couldnt breathe and sta |
| 1278 | peds | ED | Pneumonia | Musculoskeletal pain | Musculoskeletal pain, Post-Bronchitic cough, Sepsis, Costochondritis, Anxiety | chest hurts when i cough and i been runnin a fever of 102 fo |
| 1279 | adult | UC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | constant urge to pee and it burns every single time |
| 1280 | adult | PC | Appendicitis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Viral infection | started around my belly button now the pain moved to the low |
| 1282 | adult | UC | Gastroenteritis | Viral infection | Viral infection, Bacterial infection, UTI | my stomach is a mess been runnin to the toilet every hour |
| 1284 | geri | ED | Nephrolithiasis | Needs in-person evaluation | Needs in-person evaluation | worst pain of my life in my side it comes and goes and i can |
| 1291 | peds | UC | Sepsis | Viral infection | Viral infection, Meningitis, Pneumonia, Bacterial infection, UTI | feel like im dying fever chills cant think straight and so w |
| 1292 | geri | PC | Gout | Needs in-person evaluation | Needs in-person evaluation | woke up with the worst pain in my foot its swollen hot and t |
| 1293 | adult | ED | Pharyngitis | Eosinophilic Esophagitis | Eosinophilic Esophagitis, Esophageal Cancer, Esophageal Stricture, GERD, Anaphylaxis | throat is on fire cant swallow and theres white spots back t |
| 1294 | geri | UC | Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | skin on my arm is red warm and tender and the redness keeps  |
| 1297 | peds | UC | Pneumothorax | Asthma | Asthma, Pulmonary Embolism, Anxiety, Pneumonia, Anemia | felt a pop in my chest and suddenly cant breathe on one side |
| 1302 | adult | ED | Diverticulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | pain in my lower left belly with fever and i been constipate |
| 1303 | geri | UC | Pancreatitis | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Diverticulitis, Appendicitis | worst belly pain after eating greasy food goes right through |
| 1304 | geri | PC | Cholecystitis | UTI | UTI, Kidney Stone, Prostatitis, Acute Gastroenteritis, Medication Induced Vomiting | gallbladder area is killing me after that burger cant stop p |
| 1306 | adult | UC | Otitis Media | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | my kid is screamin and grabbin his ear and got a fever |
| 1307 | adult | PC | Febrile Seizure | Viral infection | Viral infection, Brachioradial Pruritus, Bacterial infection, Allergic Contact Dermatitis, Pneumonia | my toddler was hot with fever then went stiff and was twitch |
| 1309 | peds | UC | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Medication side effect, Anxiety | theres blood in my stool bright red and i feel dizzy |
| 1310 | geri | PC | Constipation | Appendicitis | Appendicitis, Cholecystitis, Pancreatitis | havent pooped in like a week and my belly is so bloated and  |
| 1311 | peds | ED | Benign Paroxysmal Positional Vertigo | Needs in-person evaluation | Needs in-person evaluation | the rooms goin around and around when i look up or change po |
| 1315 | geri | UC | Peritonsillar Abscess | Esophageal Stricture | Esophageal Stricture, GERD, Esophageal Cancer, Eosinophilic Esophagitis, Achalasia | throat is so swollen on one side i can barely open my jaw an |
| 1316 | adult | PC | Nursemaid Elbow | Needs in-person evaluation | Needs in-person evaluation | my toddler wont use his arm after i pulled him up by the han |
| 1317 | peds | ED | Pyloric Stenosis | Needs in-person evaluation | Needs in-person evaluation | newborn throws up forcefully right after eating and hes alwa |
| 1318 | peds | UC | Epiglottitis | Esophageal Cancer | Esophageal Cancer, Eosinophilic Esophagitis, Esophageal Stricture, GERD, Achalasia | my kid is drooling sitting straight up and can barely breath |
| 1319 | adult | PC | Henoch-Schonlein Purpura | Orthostatic Hypotension | Orthostatic Hypotension, Vasovagal Syncope, Dehydration, Postural Orthostatic Tachycardia Syndrome, Cardiac Arrhythmia | weird bruise-like spots on my childs legs and butt and she s |
| 1320 | peds | ED | Slipped Capital Femoral Epiphysis | Labral Tear | Labral Tear, Hoffa Disease, Septic Arthritis, Hip Fracture, Acute Hip and Leg | my teenager is limping and says his hip and knee hurt he can |
| 1321 | peds | UC | Kawasaki Disease | Viral infection | Viral infection, UTI, Bacterial infection, Pneumonia, Irritant Conjunctivitis | my little one has fever that wont break plus red eyes swolle |
| 1322 | geri | PC | Intussusception | Needs in-person evaluation | Needs in-person evaluation | my baby screams in pain then stops then screams again and th |
| 1323 | geri | ED | Ovarian Torsion | Leaking Abdominal Aortic Aneurysm | Leaking Abdominal Aortic Aneurysm, Regional Enteritis | woke up with the worst pain in my right lower belly and i fe |
| 1324 | peds | UC | Placental Abruption | Gastroenteritis | Gastroenteritis, Ectopic Pregnancy, Appendicitis, GERD, Cholecystitis | im 32 weeks pregnant and suddenly bleeding heavy with terrib |
| 1325 | peds | PC | Tension Pneumothorax | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | chest trauma and now one side aint moving and im getting wor |
| 1327 | geri | UC | Addison Crisis | Orthostatic hypotension | Orthostatic hypotension, BPPV, Medication side effect, Vestibular neuritis, Cardiac Arrhythmia | been on steroids and stopped now im crashing feel terrible w |
| 1328 | adult | PC | Thyroid Storm | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Anxiety, Cardiac Arrhythmia, Atrial Fibrillation | heart is racing over 150 im sweating like crazy and feel agi |
| 1329 | peds | ED | Rhabdomyolysis | Seizure | Seizure, New-Onset Epilepsy, Alcohol Withdrawal Seizure, Syncope, Febrile Seizure | did crossfit for the first time and now i cant move and my u |
| 1330 | adult | UC | Corneal Abrasion | Needs in-person evaluation | Needs in-person evaluation | got poked in the eye and now it wont stop watering and hurts |
| 1331 | geri | PC | Orbital Cellulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | kids eye is bulging out puffy red and he has a fever |
| 1332 | adult | ED | Temporal Arteritis | Tension headache | Tension headache, Migraine, Sinusitis, Medication overuse headache, Cluster headache | bad headache on one side of my head near my temple and it hu |
| 1334 | adult | PC | Subdural Hematoma | Fracture | Fracture, Soft Tissue Injury, Rib Fracture, Hip Fracture, Traumatic Brain Injury | fell and hit my head a week ago and now im getting confused  |
| 1335 | adult | ED | Shingles | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Cellulitis, Conjunctivitis, Allergic Reaction | had chickenpox as a kid now theres a strip of painful bliste |
| 1336 | geri | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | my toddler has sores in his mouth and blisters on his hands  |
| 1337 | adult | PC | Impetigo | Needs in-person evaluation | Needs in-person evaluation | these yellow crusty patches keep spreading on my childs face |
| 1338 | geri | ED | Bronchiolitis | Anaphylaxis | Anaphylaxis, Aspiration Pneumonitis, Asthma Exacerbation, Cystic Fibrosis or ciliary Dyskinesia, Anomalous left common Carotid Artery | my baby is wheezing and having trouble breathing after a col |
| 1339 | geri | UC | Atrial Fibrillation | COPD exacerbation | COPD exacerbation, Heart Failure, Asthma, Pneumonia, Pulmonary Embolism | heart is fluttering and skipping beats and i feel short of b |
| 1342 | adult | UC | Sciatica | Major Depressive Disorder | Major Depressive Disorder, Adjustment Disorder, Generalized Anxiety Disorder, Substance Use Disorder, Bipolar Disorder | shooting pain from my butt all the way down my leg to my foo |
| 1343 | adult | PC | Bowel Obstruction | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | stomach cramps come and go and everything is bloated and i k |
| 1344 | geri | ED | Hemorrhoids | Major Depressive Disorder | Major Depressive Disorder, Generalized Anxiety Disorder, Adjustment Disorder, Hypothyroidism, Bipolar Disorder | bright red blood on the toilet paper when i wipe and its itc |
| 1345 | peds | UC | Hypothyroidism | Needs in-person evaluation | Needs in-person evaluation | feel sluggish all the time constipated and my skin is so dry |
| 1346 | adult | PC | Peripheral Neuropathy | Needs in-person evaluation | Needs in-person evaluation | my feet tingle and burn all the time especially at night fee |
| 1347 | peds | ED | Plantar Fasciitis | Needs in-person evaluation | Needs in-person evaluation | bottom of my foot hurts so bad especially after sitting for  |
| 1348 | peds | UC | Carpal Tunnel Syndrome | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | my hand goes numb at night and i keep dropping things tingli |
| 1352 | adult | PC | Pulmonary Embolism | Bronchitis | Bronchitis, Viral URI, ACE inhibitor cough, Pneumonia, COPD exacerbation | i was just sittin there and suddenly couldnt breathe and sta |
| 1354 | adult | UC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | constant urge to pee and it burns every single time |
| 1355 | adult | PC | Appendicitis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Viral infection | started around my belly button now the pain moved to the low |
| 1357 | peds | UC | Gastroenteritis | Viral infection | Viral infection, Bacterial infection, UTI | my stomach is a mess been runnin to the toilet every hour |
| 1359 | adult | ED | Nephrolithiasis | Needs in-person evaluation | Needs in-person evaluation | worst pain of my life in my side it comes and goes and i can |
| 1362 | adult | ED | COPD Exacerbation | Asthma | Asthma, Bronchi, Pneumonia, Post-infectious cough, Pulmonary Embolism | my copd is acting up cant breathe and coughing way more than |
| 1366 | peds | UC | Sepsis | Viral infection | Viral infection, Meningitis, Pneumonia, Bacterial infection, UTI | feel like im dying fever chills cant think straight and so w |
| 1367 | adult | PC | Gout | Needs in-person evaluation | Needs in-person evaluation | woke up with the worst pain in my foot its swollen hot and t |
| 1368 | adult | ED | Pharyngitis | Anaphylaxis | Anaphylaxis, Esophageal Stricture, GERD, Eosinophilic Esophagitis, Achalasia | throat is on fire cant swallow and theres white spots back t |
| 1369 | adult | UC | Cellulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | skin on my arm is red warm and tender and the redness keeps  |
| 1372 | geri | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, Acute Coronary Syndrome, GERD | sharp chest pain outta nowhere and now i cant take a full br |
| 1373 | geri | PC | Aortic Dissection | Acute Hemorrhage | Acute Hemorrhage, Subset of patients present with Syncope Plus another key symptom, Other Reflex Mediated Syncope causes, Carotid Sinus Syncope, Metabolic Disorders | ripping sensation in my chest going through to my back and i |
| 1375 | geri | UC | Ectopic Pregnancy | Acute Pelvic Inflammatory Disease | Acute Pelvic Inflammatory Disease, Ovarian Hyperstimulation Syndrome, Pelvic Congestion Syndrome, Bowel Obstruction, Bladder perforation | pelvic pain with some bleeding and i think i might be pregna |
| 1377 | geri | ED | Diverticulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | pain in my lower left belly with fever and i been constipate |
| 1378 | adult | UC | Pancreatitis | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Diverticulitis, Peptic Ulcer | worst belly pain after eating greasy food goes right through |
| 1379 | geri | PC | Cholecystitis | UTI | UTI, Kidney Stone, Prostatitis, Acute Gastroenteritis, Medication Induced Vomiting | gallbladder area is killing me after that burger cant stop p |
| 1380 | geri | ED | Croup | Post-Bronchitic cough | Post-Bronchitic cough, Viral URI, Foreign Body Aspiration, Bronchitis, Fungal Lung Infection | my baby has a barking cough sounds like a seal and is having |
| 1381 | peds | UC | Otitis Media | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | my kid is screamin and grabbin his ear and got a fever |
| 1384 | adult | UC | Gastrointestinal Bleeding | BPPV | BPPV, Vestibular neuritis, Orthostatic hypotension, Anxiety, Medication side effect | theres blood in my stool bright red and i feel dizzy |
| 1385 | peds | PC | Constipation | Appendicitis | Appendicitis, Cholecystitis, Pancreatitis | cant go to the bathroom belly is hard and hurts |
| 1386 | geri | ED | Benign Paroxysmal Positional Vertigo | Needs in-person evaluation | Needs in-person evaluation | everythings spinnin when i turn my head or roll over in bed |
| 1390 | peds | UC | Peritonsillar Abscess | Esophageal Stricture | Esophageal Stricture, GERD, Eosinophilic Esophagitis, Achalasia, Esophageal Cancer | cant swallow at all one side of my throat is huge and i soun |
| 1391 | peds | PC | Nursemaid Elbow | Needs in-person evaluation | Needs in-person evaluation | my kid is holding her arm still and cries if you try to move |
| 1392 | peds | ED | Pyloric Stenosis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | my 3 week old baby keeps projectile vomiting after every fee |
| 1393 | adult | UC | Epiglottitis | Eosinophilic Esophagitis | Eosinophilic Esophagitis, Esophageal Cancer, Esophageal Stricture, GERD, Achalasia | sore throat came on fast now my child is leaning forward dro |
| 1394 | adult | PC | Henoch-Schonlein Purpura | Rheumatoid Arthritis | Rheumatoid Arthritis, Reactive Arthritis, Systemic Lupus Erythematosus, Viral Arthritis, Fibromyalgia | my kid has a purple rash on his legs and his belly and joint |
| 1395 | peds | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Labral Tear, Anterior or Anterolateral thigh neuropathic pain | my overweight teen has been complaining of hip pain and now  |
| 1397 | geri | PC | Intussusception | Viral Illness | Viral Illness, Sepsis, UTI, Dehydration, Acute Hip and Leg | my infant has episodes of screaming drawing up legs then goi |
| 1398 | geri | ED | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | sudden horrible pain on one side of my pelvis and im throwin |
| 1399 | geri | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy | pregnant and my belly got really hard and painful and theres |
| 1400 | adult | PC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Major Depressive Disorder, Panic Disorder, Cardiac Arrhythmia, Substance Use Disorder | got hit in the chest and now i can barely breathe and feel l |
| 1401 | geri | ED | Status Epilepticus | Needs in-person evaluation | Needs in-person evaluation | my family member started seizing and its been going on and o |
| 1403 | adult | PC | Thyroid Storm | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | hyperthyroid and now everything is going haywire fever fast  |
| 1404 | geri | ED | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 1405 | geri | UC | Corneal Abrasion | Needs in-person evaluation | Needs in-person evaluation | feels like something is stuck in my eye its tearing up and i |
| 1406 | adult | PC | Orbital Cellulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | my eye is swollen shut red and it hurts to move it plus i go |
| 1407 | peds | ED | Temporal Arteritis | Needs in-person evaluation | Needs in-person evaluation | my temple area is tender and throbbing and i noticed my visi |
| 1408 | adult | UC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Appendicitis, Peptic Ulcer | terrible belly pain after eating and ive been losing weight  |
| 1409 | peds | PC | Subdural Hematoma | Tension headache | Tension headache, Migraine, Cluster headache | grandpa bumped his head and now hes acting weird and drowsy |
| 1411 | adult | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | daycare kid with fever painful mouth sores and a rash on pal |
| 1412 | adult | PC | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Conjunctivitis, Allergic Reaction, Cellulitis | my kid has crusty honey colored sores around his mouth and n |
| 1413 | adult | ED | Bronchiolitis | Viral URI | Viral URI, Allergic Rhinitis, Anaphylaxis, Acute Sinusitis, Nasal Foreign Body | infant with runny nose that turned into fast breathing and w |
| 1414 | adult | UC | Atrial Fibrillation | BPPV | BPPV, Vestibular neuritis, Orthostatic hypotension, Anxiety, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 1416 | peds | ED | Panic Attack | Pulmonary Embolism | Pulmonary Embolism, Primary Spontaneous Pneumothorax, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 1417 | adult | UC | Sciatica | Musculoskeletal strain | Musculoskeletal strain, Herniated Disc, Compression fracture, Spinal Stenosis, Lumbar Spondylosis | back pain that goes down my leg like an electric shock worse |
| 1418 | geri | PC | Bowel Obstruction | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | belly is huge and hard havent passed gas or pooped in days a |
| 1420 | adult | UC | Hypothyroidism | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | im always cold tired and gaining weight even though i barely |
| 1421 | geri | PC | Peripheral Neuropathy | Needs in-person evaluation | Needs in-person evaluation | numbness starting in my toes working up and i keep dropping  |
| 1422 | geri | ED | Plantar Fasciitis | Needs in-person evaluation | Needs in-person evaluation | my heel kills me first thing in the morning when i step outt |
| 1423 | geri | UC | Carpal Tunnel Syndrome | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | wrist hurts and my thumb and first two fingers tingle especi |
| 1427 | adult | PC | Pulmonary Embolism | Bronchitis | Bronchitis, Viral URI, ACE inhibitor cough, Pneumonia, Asthma | i was just sittin there and suddenly couldnt breathe and sta |
| 1429 | adult | UC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | constant urge to pee and it burns every single time |
| 1430 | adult | PC | Appendicitis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Viral infection | started around my belly button now the pain moved to the low |
| 1432 | peds | UC | Gastroenteritis | Viral infection | Viral infection, Bacterial infection, UTI | my stomach is a mess been runnin to the toilet every hour |
| 1434 | geri | ED | Nephrolithiasis | Needs in-person evaluation | Needs in-person evaluation | worst pain of my life in my side it comes and goes and i can |
| 1437 | peds | ED | COPD Exacerbation | Asthma | Asthma, Bronchi, Pneumonia, Post-infectious cough, Anxiety | my copd is acting up cant breathe and coughing way more than |
| 1441 | peds | UC | Sepsis | Viral infection | Viral infection, Meningitis, UTI, Pneumonia, Bacterial infection | feel like im dying fever chills cant think straight and so w |
| 1442 | peds | PC | Gout | Needs in-person evaluation | Needs in-person evaluation | woke up with the worst pain in my foot its swollen hot and t |
| 1443 | peds | ED | Pharyngitis | Anaphylaxis | Anaphylaxis, Esophageal Stricture, GERD, Eosinophilic Esophagitis, Achalasia | throat is on fire cant swallow and theres white spots back t |
| 1444 | peds | UC | Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | skin on my arm is red warm and tender and the redness keeps  |
| 1447 | adult | UC | Pneumothorax | Asthma | Asthma, Anxiety, Pulmonary Embolism, Pneumonia, Anemia | felt a pop in my chest and suddenly cant breathe on one side |
| 1452 | geri | ED | Diverticulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | pain in my lower left belly with fever and i been constipate |
| 1453 | geri | UC | Pancreatitis | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Diverticulitis, Appendicitis | worst belly pain after eating greasy food goes right through |
| 1454 | adult | PC | Cholecystitis | Kidney Stone | Kidney Stone, UTI, Prostatitis, Acute Gastroenteritis, Medication Induced Vomiting | gallbladder area is killing me after that burger cant stop p |
| 1455 | geri | ED | Croup | Post-Bronchitic cough | Post-Bronchitic cough, Viral URI, Foreign Body Aspiration, Bronchitis, Aspiration lung disease | my toddlers cough sounds really weird like barking and hes w |
| 1456 | geri | UC | Otitis Media | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | my kid is screamin and grabbin his ear and got a fever |
| 1457 | geri | PC | Febrile Seizure | Viral infection | Viral infection, Brachioradial Pruritus, Bacterial infection, Allergic Contact Dermatitis, UTI | my toddler was hot with fever then went stiff and was twitch |
| 1459 | adult | UC | Gastrointestinal Bleeding | BPPV | BPPV, Anxiety, Vestibular neuritis, Orthostatic hypotension, Medication side effect | theres blood in my stool bright red and i feel dizzy |
| 1460 | adult | PC | Constipation | Appendicitis | Appendicitis, Cholecystitis, Pancreatitis | havent pooped in like a week and my belly is so bloated and  |
| 1461 | peds | ED | Benign Paroxysmal Positional Vertigo | Needs in-person evaluation | Needs in-person evaluation | the rooms goin around and around when i look up or change po |
| 1465 | geri | UC | Peritonsillar Abscess | Esophageal Cancer | Esophageal Cancer, Esophageal Stricture, Eosinophilic Esophagitis, GERD, Achalasia | throat is so swollen on one side i can barely open my jaw an |
| 1466 | adult | PC | Nursemaid Elbow | Needs in-person evaluation | Needs in-person evaluation | my toddler wont use his arm after i pulled him up by the han |
| 1467 | adult | ED | Pyloric Stenosis | Needs in-person evaluation | Needs in-person evaluation | newborn throws up forcefully right after eating and hes alwa |
| 1468 | adult | UC | Epiglottitis | Eosinophilic Esophagitis | Eosinophilic Esophagitis, Esophageal Cancer, Esophageal Stricture, GERD, Achalasia | my kid is drooling sitting straight up and can barely breath |
| 1469 | adult | PC | Henoch-Schonlein Purpura | Postural Orthostatic Tachycardia Syndrome | Postural Orthostatic Tachycardia Syndrome, Orthostatic Hypotension, Dehydration, Vasovagal Syncope, Anemia | weird bruise-like spots on my childs legs and butt and she s |
| 1470 | geri | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Hoffa Disease, Hip Osteoarthritis, Labral Tear, Septic Arthritis | my teenager is limping and says his hip and knee hurt he can |
| 1471 | peds | UC | Kawasaki Disease | Viral infection | Viral infection, UTI, Bacterial infection, Pneumonia, Irritant Conjunctivitis | my little one has fever that wont break plus red eyes swolle |
| 1472 | adult | PC | Intussusception | Needs in-person evaluation | Needs in-person evaluation | my baby screams in pain then stops then screams again and th |
| 1473 | peds | ED | Ovarian Torsion | Regional Enteritis | Regional Enteritis | woke up with the worst pain in my right lower belly and i fe |
| 1474 | adult | UC | Placental Abruption | Gastroenteritis | Gastroenteritis, Ectopic Pregnancy, Appendicitis, GERD, Cholecystitis | im 32 weeks pregnant and suddenly bleeding heavy with terrib |
| 1475 | adult | PC | Tension Pneumothorax | Fracture | Fracture, Soft Tissue Injury, Rib Fracture, Traumatic Brain Injury, Concussion | chest trauma and now one side aint moving and im getting wor |
| 1477 | adult | UC | Addison Crisis | BPPV | BPPV, Anxiety, Orthostatic hypotension, Vestibular neuritis, Medication side effect | been on steroids and stopped now im crashing feel terrible w |
| 1478 | adult | PC | Thyroid Storm | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Anxiety, Cardiac Arrhythmia, Atrial Fibrillation | heart is racing over 150 im sweating like crazy and feel agi |
| 1479 | geri | ED | Rhabdomyolysis | Seizure | Seizure, New-Onset Epilepsy, Alcohol Withdrawal Seizure, Stroke, Syncope | did crossfit for the first time and now i cant move and my u |
| 1480 | peds | UC | Corneal Abrasion | Needs in-person evaluation | Needs in-person evaluation | got poked in the eye and now it wont stop watering and hurts |
| 1481 | geri | PC | Orbital Cellulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | kids eye is bulging out puffy red and he has a fever |
| 1482 | adult | ED | Temporal Arteritis | Tension headache | Tension headache, Migraine, Sinusitis, Medication overuse headache, Subarachnoid hemorrhage | bad headache on one side of my head near my temple and it hu |
| 1483 | adult | UC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Appendicitis, Ectopic Pregnancy | sudden severe belly pain way worse than what the exam shows |
| 1484 | peds | PC | Subdural Hematoma | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | fell and hit my head a week ago and now im getting confused  |
| 1485 | peds | ED | Shingles | Viral Exanthem | Viral Exanthem, Contact Dermatitis, Conjunctivitis, Impetigo, Varicella (Chickenpox) | had chickenpox as a kid now theres a strip of painful bliste |
| 1486 | peds | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | my toddler has sores in his mouth and blisters on his hands  |
| 1487 | adult | PC | Impetigo | Needs in-person evaluation | Needs in-person evaluation | these yellow crusty patches keep spreading on my childs face |
| 1488 | peds | ED | Bronchiolitis | Anaphylaxis | Anaphylaxis, Aspiration Pneumonitis, Asthma Exacerbation, Cystic Fibrosis or ciliary Dyskinesia, Anomalous left common Carotid Artery | my baby is wheezing and having trouble breathing after a col |
| 1489 | geri | UC | Atrial Fibrillation | COPD exacerbation | COPD exacerbation, Heart Failure, Asthma, Pneumonia, Pulmonary Embolism | heart is fluttering and skipping beats and i feel short of b |
| 1492 | adult | UC | Sciatica | Major Depressive Disorder | Major Depressive Disorder, Adjustment Disorder, Generalized Anxiety Disorder, Substance Use Disorder, Bipolar Disorder | shooting pain from my butt all the way down my leg to my foo |
| 1493 | adult | PC | Bowel Obstruction | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | stomach cramps come and go and everything is bloated and i k |
| 1494 | adult | ED | Hemorrhoids | Major Depressive Disorder | Major Depressive Disorder, Generalized Anxiety Disorder, Adjustment Disorder, Hypothyroidism, Bipolar Disorder | bright red blood on the toilet paper when i wipe and its itc |
| 1495 | adult | UC | Hypothyroidism | Needs in-person evaluation | Needs in-person evaluation | feel sluggish all the time constipated and my skin is so dry |
| 1496 | adult | PC | Peripheral Neuropathy | Needs in-person evaluation | Needs in-person evaluation | my feet tingle and burn all the time especially at night fee |
| 1497 | adult | ED | Plantar Fasciitis | Needs in-person evaluation | Needs in-person evaluation | bottom of my foot hurts so bad especially after sitting for  |
| 1498 | geri | UC | Carpal Tunnel Syndrome | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | my hand goes numb at night and i keep dropping things tingli |
| 1502 | adult | PC | Pulmonary Embolism | Bronchitis | Bronchitis, Viral URI, ACE inhibitor cough, Pneumonia, Asthma | i was just sittin there and suddenly couldnt breathe and sta |
| 1504 | adult | UC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | constant urge to pee and it burns every single time |
| 1505 | peds | PC | Appendicitis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Viral infection | started around my belly button now the pain moved to the low |
| 1507 | peds | UC | Gastroenteritis | Viral infection | Viral infection, Bacterial infection, UTI | my stomach is a mess been runnin to the toilet every hour |
| 1509 | peds | ED | Nephrolithiasis | Needs in-person evaluation | Needs in-person evaluation | worst pain of my life in my side it comes and goes and i can |
| 1516 | peds | UC | Sepsis | Viral infection | Viral infection, Meningitis, Pneumonia, Bacterial infection, UTI | feel like im dying fever chills cant think straight and so w |
| 1517 | adult | PC | Gout | Needs in-person evaluation | Needs in-person evaluation | woke up with the worst pain in my foot its swollen hot and t |
| 1518 | adult | ED | Pharyngitis | Esophageal Stricture | Esophageal Stricture, Anaphylaxis, GERD, Eosinophilic Esophagitis, Achalasia | throat is on fire cant swallow and theres white spots back t |
| 1519 | geri | UC | Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | skin on my arm is red warm and tender and the redness keeps  |
| 1522 | adult | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, GERD, Acute Coronary Syndrome | sharp chest pain outta nowhere and now i cant take a full br |
| 1523 | peds | PC | Aortic Dissection | Acute Hemorrhage | Acute Hemorrhage, Subset of patients present with Syncope Plus another key symptom, Other Reflex Mediated Syncope causes, Carotid Sinus Syncope, Metabolic Disorders | ripping sensation in my chest going through to my back and i |
| 1525 | geri | UC | Ectopic Pregnancy | Acute Pelvic Inflammatory Disease | Acute Pelvic Inflammatory Disease, Ovarian Hyperstimulation Syndrome, Pelvic Congestion Syndrome, Bowel Obstruction, Bladder perforation | pelvic pain with some bleeding and i think i might be pregna |
| 1527 | geri | ED | Diverticulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | pain in my lower left belly with fever and i been constipate |
| 1528 | peds | UC | Pancreatitis | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Cholecystitis, Ectopic Pregnancy | worst belly pain after eating greasy food goes right through |
| 1529 | adult | PC | Cholecystitis | Kidney Stone | Kidney Stone, UTI, Prostatitis, Acute Gastroenteritis, Urethritis | gallbladder area is killing me after that burger cant stop p |
| 1530 | geri | ED | Croup | Post-Bronchitic cough | Post-Bronchitic cough, Viral URI, Foreign Body Aspiration, Bronchitis, Fungal Lung Infection | my baby has a barking cough sounds like a seal and is having |
| 1531 | adult | UC | Otitis Media | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | my kid is screamin and grabbin his ear and got a fever |
| 1534 | adult | UC | Gastrointestinal Bleeding | BPPV | BPPV, Anxiety, Orthostatic hypotension, Vestibular neuritis, Medication side effect | theres blood in my stool bright red and i feel dizzy |
| 1535 | peds | PC | Constipation | Appendicitis | Appendicitis, Cholecystitis, Pancreatitis | cant go to the bathroom belly is hard and hurts |
| 1536 | geri | ED | Benign Paroxysmal Positional Vertigo | Needs in-person evaluation | Needs in-person evaluation | everythings spinnin when i turn my head or roll over in bed |
| 1540 | adult | UC | Peritonsillar Abscess | Esophageal Stricture | Esophageal Stricture, GERD, Eosinophilic Esophagitis, Achalasia, Esophageal Cancer | cant swallow at all one side of my throat is huge and i soun |
| 1541 | peds | PC | Nursemaid Elbow | Needs in-person evaluation | Needs in-person evaluation | my kid is holding her arm still and cries if you try to move |
| 1542 | adult | ED | Pyloric Stenosis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | my 3 week old baby keeps projectile vomiting after every fee |
| 1543 | adult | UC | Epiglottitis | Esophageal Stricture | Esophageal Stricture, GERD, Eosinophilic Esophagitis, Achalasia, Esophageal Spasm | sore throat came on fast now my child is leaning forward dro |
| 1544 | geri | PC | Henoch-Schonlein Purpura | Polymyalgia Rheumatica | Polymyalgia Rheumatica, Rheumatoid Arthritis, Reactive Arthritis, Viral Arthritis, Systemic Lupus Erythematosus | my kid has a purple rash on his legs and his belly and joint |
| 1545 | peds | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Anterior or Anterolateral thigh neuropathic pain, Labral Tear | my overweight teen has been complaining of hip pain and now  |
| 1547 | adult | PC | Intussusception | Viral Illness | Viral Illness, Sepsis, UTI, Dehydration, Acute Hip and Leg | my infant has episodes of screaming drawing up legs then goi |
| 1548 | adult | ED | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | sudden horrible pain on one side of my pelvis and im throwin |
| 1549 | adult | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy | pregnant and my belly got really hard and painful and theres |
| 1550 | peds | PC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder, Substance Use Disorder, Cardiac Arrhythmia | got hit in the chest and now i can barely breathe and feel l |
| 1551 | peds | ED | Status Epilepticus | Needs in-person evaluation | Needs in-person evaluation | my family member started seizing and its been going on and o |
| 1553 | geri | PC | Thyroid Storm | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | hyperthyroid and now everything is going haywire fever fast  |
| 1554 | geri | ED | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 1555 | geri | UC | Corneal Abrasion | Needs in-person evaluation | Needs in-person evaluation | feels like something is stuck in my eye its tearing up and i |
| 1556 | adult | PC | Orbital Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | my eye is swollen shut red and it hurts to move it plus i go |
| 1557 | peds | ED | Temporal Arteritis | Needs in-person evaluation | Needs in-person evaluation | my temple area is tender and throbbing and i noticed my visi |
| 1558 | adult | UC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Peptic Ulcer, Pancreatitis | terrible belly pain after eating and ive been losing weight  |
| 1559 | adult | PC | Subdural Hematoma | Tension headache | Tension headache, Migraine, Cluster headache | grandpa bumped his head and now hes acting weird and drowsy |
| 1560 | peds | ED | Shingles | Viral Exanthem | Viral Exanthem, Contact Dermatitis, Conjunctivitis, Impetigo, Varicella (Chickenpox) | burning painful rash on one side of my body with little blis |
| 1561 | adult | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | daycare kid with fever painful mouth sores and a rash on pal |
| 1562 | adult | PC | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Conjunctivitis, Allergic Reaction, Cellulitis | my kid has crusty honey colored sores around his mouth and n |
| 1563 | peds | ED | Bronchiolitis | Viral URI | Viral URI, Nasal Foreign Body, Allergic Rhinitis, Anaphylaxis, Acute Sinusitis | infant with runny nose that turned into fast breathing and w |
| 1564 | geri | UC | Atrial Fibrillation | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 1566 | geri | ED | Panic Attack | Pulmonary Embolism | Pulmonary Embolism, Primary Spontaneous Pneumothorax, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 1567 | adult | UC | Sciatica | Musculoskeletal strain | Musculoskeletal strain, Spinal Stenosis, Herniated Disc, Compression fracture, Lumbar Spondylosis | back pain that goes down my leg like an electric shock worse |
| 1568 | adult | PC | Bowel Obstruction | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | belly is huge and hard havent passed gas or pooped in days a |
| 1570 | peds | UC | Hypothyroidism | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | im always cold tired and gaining weight even though i barely |
| 1571 | adult | PC | Peripheral Neuropathy | Needs in-person evaluation | Needs in-person evaluation | numbness starting in my toes working up and i keep dropping  |
| 1572 | geri | ED | Plantar Fasciitis | Needs in-person evaluation | Needs in-person evaluation | my heel kills me first thing in the morning when i step outt |
| 1573 | adult | UC | Carpal Tunnel Syndrome | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | wrist hurts and my thumb and first two fingers tingle especi |
| 1577 | peds | PC | Pulmonary Embolism | Viral URI | Viral URI, Bronchitis, Post-Bronchitic cough, Pneumonia, Asthma | i was just sittin there and suddenly couldnt breathe and sta |
| 1579 | adult | UC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | constant urge to pee and it burns every single time |
| 1580 | geri | PC | Appendicitis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Viral infection | started around my belly button now the pain moved to the low |
| 1582 | adult | UC | Gastroenteritis | Viral infection | Viral infection, Bacterial infection, UTI | my stomach is a mess been runnin to the toilet every hour |
| 1584 | adult | ED | Nephrolithiasis | Needs in-person evaluation | Needs in-person evaluation | worst pain of my life in my side it comes and goes and i can |
| 1591 | adult | UC | Sepsis | Viral infection | Viral infection, Meningitis, Pneumonia, Bacterial infection, UTI | feel like im dying fever chills cant think straight and so w |
| 1592 | geri | PC | Gout | Needs in-person evaluation | Needs in-person evaluation | woke up with the worst pain in my foot its swollen hot and t |
| 1593 | peds | ED | Pharyngitis | Esophageal Cancer | Esophageal Cancer, Eosinophilic Esophagitis, Esophageal Stricture, GERD, Anaphylaxis | throat is on fire cant swallow and theres white spots back t |
| 1594 | peds | UC | Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | skin on my arm is red warm and tender and the redness keeps  |
| 1597 | adult | UC | Pneumothorax | Asthma | Asthma, Anxiety, Pulmonary Embolism, Pneumonia, Anemia | felt a pop in my chest and suddenly cant breathe on one side |
| 1602 | adult | ED | Diverticulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | pain in my lower left belly with fever and i been constipate |
| 1603 | peds | UC | Pancreatitis | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Peptic Ulcer, Mesenteric Adenitis | worst belly pain after eating greasy food goes right through |
| 1604 | adult | PC | Cholecystitis | Kidney Stone | Kidney Stone, UTI, Prostatitis, Acute Gastroenteritis, Urethritis | gallbladder area is killing me after that burger cant stop p |
| 1605 | geri | ED | Croup | Post-Bronchitic cough | Post-Bronchitic cough, Viral URI, Foreign Body Aspiration, Bronchitis, Aspiration lung disease | my toddlers cough sounds really weird like barking and hes w |
| 1606 | peds | UC | Otitis Media | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | my kid is screamin and grabbin his ear and got a fever |
| 1607 | peds | PC | Febrile Seizure | Viral infection | Viral infection, Brachioradial Pruritus, Bacterial infection, Allergic Contact Dermatitis, Pneumonia | my toddler was hot with fever then went stiff and was twitch |
| 1609 | adult | UC | Gastrointestinal Bleeding | BPPV | BPPV, Anxiety, Orthostatic hypotension, Vestibular neuritis, Medication side effect | theres blood in my stool bright red and i feel dizzy |
| 1610 | peds | PC | Constipation | Appendicitis | Appendicitis, Cholecystitis, Pancreatitis | havent pooped in like a week and my belly is so bloated and  |
| 1611 | geri | ED | Benign Paroxysmal Positional Vertigo | Needs in-person evaluation | Needs in-person evaluation | the rooms goin around and around when i look up or change po |
| 1615 | geri | UC | Peritonsillar Abscess | Esophageal Stricture | Esophageal Stricture, GERD, Esophageal Cancer, Eosinophilic Esophagitis, Esophageal Spasm | throat is so swollen on one side i can barely open my jaw an |
| 1616 | peds | PC | Nursemaid Elbow | Needs in-person evaluation | Needs in-person evaluation | my toddler wont use his arm after i pulled him up by the han |
| 1617 | geri | ED | Pyloric Stenosis | Needs in-person evaluation | Needs in-person evaluation | newborn throws up forcefully right after eating and hes alwa |
| 1618 | adult | UC | Epiglottitis | Esophageal Stricture | Esophageal Stricture, GERD, Eosinophilic Esophagitis, Achalasia, Esophageal Cancer | my kid is drooling sitting straight up and can barely breath |
| 1619 | peds | PC | Henoch-Schonlein Purpura | Postural Orthostatic Tachycardia Syndrome | Postural Orthostatic Tachycardia Syndrome, Orthostatic Hypotension, Vasovagal Syncope, Dehydration, Anemia | weird bruise-like spots on my childs legs and butt and she s |
| 1620 | geri | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Hoffa Disease, Hip Osteoarthritis, Labral Tear, Septic Arthritis | my teenager is limping and says his hip and knee hurt he can |
| 1621 | adult | UC | Kawasaki Disease | Viral infection | Viral infection, UTI, Bacterial infection, Pneumonia, Irritant Conjunctivitis | my little one has fever that wont break plus red eyes swolle |
| 1622 | adult | PC | Intussusception | Needs in-person evaluation | Needs in-person evaluation | my baby screams in pain then stops then screams again and th |
| 1623 | geri | ED | Ovarian Torsion | Leaking Abdominal Aortic Aneurysm | Leaking Abdominal Aortic Aneurysm, Regional Enteritis | woke up with the worst pain in my right lower belly and i fe |
| 1624 | geri | UC | Placental Abruption | Gastroenteritis | Gastroenteritis, Ectopic Pregnancy, GERD, Cholecystitis, Diverticulitis | im 32 weeks pregnant and suddenly bleeding heavy with terrib |
| 1625 | adult | PC | Tension Pneumothorax | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | chest trauma and now one side aint moving and im getting wor |
| 1627 | geri | UC | Addison Crisis | BPPV | BPPV, Orthostatic hypotension, Medication side effect, Vestibular neuritis, Anxiety | been on steroids and stopped now im crashing feel terrible w |
| 1628 | peds | PC | Thyroid Storm | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Anxiety, Cardiac Arrhythmia, Meningitis | heart is racing over 150 im sweating like crazy and feel agi |
| 1629 | geri | ED | Rhabdomyolysis | Seizure | Seizure, New-Onset Epilepsy, Syncope, Stroke, Hypoglycemia | did crossfit for the first time and now i cant move and my u |
| 1630 | adult | UC | Corneal Abrasion | Needs in-person evaluation | Needs in-person evaluation | got poked in the eye and now it wont stop watering and hurts |
| 1631 | adult | PC | Orbital Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | kids eye is bulging out puffy red and he has a fever |
| 1632 | peds | ED | Temporal Arteritis | Tension headache | Tension headache, Migraine, Sinusitis, Medication overuse headache, Subarachnoid hemorrhage | bad headache on one side of my head near my temple and it hu |
| 1633 | geri | UC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Peptic Ulcer, Appendicitis, Diverticulitis | sudden severe belly pain way worse than what the exam shows |
| 1634 | adult | PC | Subdural Hematoma | Fracture | Fracture, Soft Tissue Injury, Rib Fracture, Concussion, Traumatic Brain Injury | fell and hit my head a week ago and now im getting confused  |
| 1635 | adult | ED | Shingles | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Conjunctivitis, Allergic Reaction, Cellulitis | had chickenpox as a kid now theres a strip of painful bliste |
| 1636 | geri | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | my toddler has sores in his mouth and blisters on his hands  |
| 1637 | adult | PC | Impetigo | Needs in-person evaluation | Needs in-person evaluation | these yellow crusty patches keep spreading on my childs face |
| 1638 | geri | ED | Bronchiolitis | Anaphylaxis | Anaphylaxis, Aspiration Pneumonitis, Asthma Exacerbation, Cystic Fibrosis or ciliary Dyskinesia, Anomalous left common Carotid Artery | my baby is wheezing and having trouble breathing after a col |
| 1639 | adult | UC | Atrial Fibrillation | Asthma | Asthma, Anxiety, Pulmonary Embolism, Pneumonia, Anemia | heart is fluttering and skipping beats and i feel short of b |
| 1642 | adult | UC | Sciatica | Major Depressive Disorder | Major Depressive Disorder, Adjustment Disorder, Generalized Anxiety Disorder, Substance Use Disorder, Bipolar Disorder | shooting pain from my butt all the way down my leg to my foo |
| 1643 | peds | PC | Bowel Obstruction | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | stomach cramps come and go and everything is bloated and i k |
| 1644 | geri | ED | Hemorrhoids | Major Depressive Disorder | Major Depressive Disorder, Adjustment Disorder, Generalized Anxiety Disorder, Substance Use Disorder, Bipolar Disorder | bright red blood on the toilet paper when i wipe and its itc |
| 1645 | peds | UC | Hypothyroidism | Needs in-person evaluation | Needs in-person evaluation | feel sluggish all the time constipated and my skin is so dry |
| 1646 | geri | PC | Peripheral Neuropathy | Needs in-person evaluation | Needs in-person evaluation | my feet tingle and burn all the time especially at night fee |
| 1647 | adult | ED | Plantar Fasciitis | Needs in-person evaluation | Needs in-person evaluation | bottom of my foot hurts so bad especially after sitting for  |
| 1648 | adult | UC | Carpal Tunnel Syndrome | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | my hand goes numb at night and i keep dropping things tingli |
| 1652 | adult | PC | Pulmonary Embolism | Bronchitis | Bronchitis, ACE inhibitor cough, Viral URI, Asthma, Pneumonia | i was just sittin there and suddenly couldnt breathe and sta |
| 1654 | geri | UC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | constant urge to pee and it burns every single time |
| 1655 | geri | PC | Appendicitis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Viral infection | started around my belly button now the pain moved to the low |
| 1657 | geri | UC | Gastroenteritis | Viral infection | Viral infection, Bacterial infection, UTI | my stomach is a mess been runnin to the toilet every hour |
| 1659 | adult | ED | Nephrolithiasis | Needs in-person evaluation | Needs in-person evaluation | worst pain of my life in my side it comes and goes and i can |
| 1666 | adult | UC | Sepsis | Viral infection | Viral infection, Meningitis, Pneumonia, Bacterial infection, UTI | feel like im dying fever chills cant think straight and so w |
| 1667 | adult | PC | Gout | Needs in-person evaluation | Needs in-person evaluation | woke up with the worst pain in my foot its swollen hot and t |
| 1668 | geri | ED | Pharyngitis | Esophageal Stricture | Esophageal Stricture, Anaphylaxis, GERD, Esophageal Cancer, Eosinophilic Esophagitis | throat is on fire cant swallow and theres white spots back t |
| 1669 | adult | UC | Cellulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | skin on my arm is red warm and tender and the redness keeps  |
| 1672 | adult | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, GERD, Costochondritis, Acute Coronary Syndrome | sharp chest pain outta nowhere and now i cant take a full br |
| 1673 | adult | PC | Aortic Dissection | Acute Hemorrhage | Acute Hemorrhage, Subset of patients present with Syncope Plus another key symptom, Other Reflex Mediated Syncope causes, Carotid Sinus Syncope, Metabolic Disorders | ripping sensation in my chest going through to my back and i |
| 1675 | peds | UC | Ectopic Pregnancy | Acute Pelvic Inflammatory Disease | Acute Pelvic Inflammatory Disease, Ovarian Hyperstimulation Syndrome, Pelvic Congestion Syndrome, Bowel Obstruction, Bladder perforation | pelvic pain with some bleeding and i think i might be pregna |
| 1677 | geri | ED | Diverticulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | pain in my lower left belly with fever and i been constipate |
| 1678 | adult | UC | Pancreatitis | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Cholecystitis, Ectopic Pregnancy | worst belly pain after eating greasy food goes right through |
| 1679 | peds | PC | Cholecystitis | UTI | UTI, Pyelonephritis, Acute Gastroenteritis, Medication Induced Vomiting, Kidney Stone | gallbladder area is killing me after that burger cant stop p |
| 1680 | adult | ED | Croup | Post-Bronchitic cough | Post-Bronchitic cough, Viral URI, Foreign Body Aspiration, Bronchitis, Fungal Lung Infection | my baby has a barking cough sounds like a seal and is having |
| 1681 | adult | UC | Otitis Media | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | my kid is screamin and grabbin his ear and got a fever |
| 1684 | peds | UC | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | theres blood in my stool bright red and i feel dizzy |
| 1685 | adult | PC | Constipation | Appendicitis | Appendicitis, Cholecystitis, Pancreatitis | cant go to the bathroom belly is hard and hurts |
| 1686 | adult | ED | Benign Paroxysmal Positional Vertigo | Needs in-person evaluation | Needs in-person evaluation | everythings spinnin when i turn my head or roll over in bed |
| 1690 | peds | UC | Peritonsillar Abscess | Esophageal Stricture | Esophageal Stricture, GERD, Eosinophilic Esophagitis, Achalasia, Esophageal Cancer | cant swallow at all one side of my throat is huge and i soun |
| 1691 | adult | PC | Nursemaid Elbow | Needs in-person evaluation | Needs in-person evaluation | my kid is holding her arm still and cries if you try to move |
| 1692 | geri | ED | Pyloric Stenosis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | my 3 week old baby keeps projectile vomiting after every fee |
| 1693 | adult | UC | Epiglottitis | Esophageal Stricture | Esophageal Stricture, GERD, Eosinophilic Esophagitis, Achalasia, Esophageal Spasm | sore throat came on fast now my child is leaning forward dro |
| 1694 | geri | PC | Henoch-Schonlein Purpura | Systemic Lupus Erythematosus | Systemic Lupus Erythematosus, Rheumatoid Arthritis, Polymyalgia Rheumatica, Fibromyalgia, Sjogren Syndrome | my kid has a purple rash on his legs and his belly and joint |
| 1695 | geri | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Septic Arthritis, Femoral Lesion, Hip Osteoarthritis, Anterior or Anterolateral thigh neuropathic pain | my overweight teen has been complaining of hip pain and now  |
| 1697 | peds | PC | Intussusception | Sepsis | Sepsis, UTI, Viral Illness, Dehydration, Acute Hip and Leg | my infant has episodes of screaming drawing up legs then goi |
| 1698 | geri | ED | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | sudden horrible pain on one side of my pelvis and im throwin |
| 1699 | geri | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy | pregnant and my belly got really hard and painful and theres |


## Failure Mode Breakdown

| Mode | Count | % of Total |
|---|---|---|
| Dead-end ("Needs in-person") | 71 | 14.2% |
| Viral over-generalization | 59 | 11.8% |
| Wrong diagnosis | 201 | 40.2% |
| API errors | 0 | 0.0% |

### Dead-End Cases

| Expected | CC (truncated) |
|---|---|
| Urinary Tract Infection (7) | constant urge to pee and it burns every single time |
| Nephrolithiasis (7) | worst pain of my life in my side it comes and goes and i can |
| Gout (7) | woke up with the worst pain in my foot its swollen hot and t |
| Benign Paroxysmal Positional Vertigo (7) | everythings spinnin when i turn my head or roll over in bed |
| Nursemaid Elbow (7) | my kid is holding her arm still and cries if you try to move |
| Corneal Abrasion (6) | feels like something is stuck in my eye its tearing up and i |
| Peripheral Neuropathy (6) | numbness starting in my toes working up and i keep dropping  |
| Plantar Fasciitis (6) | my heel kills me first thing in the morning when i step outt |
| Status Epilepticus (3) | my family member started seizing and its been going on and o |
| Temporal Arteritis (3) | my temple area is tender and throbbing and i noticed my visi |
| Pyloric Stenosis (3) | newborn throws up forcefully right after eating and hes alwa |
| Intussusception (3) | my baby screams in pain then stops then screams again and th |
| Impetigo (3) | these yellow crusty patches keep spreading on my childs face |
| Hypothyroidism (3) | feel sluggish all the time constipated and my skin is so dry |

### Viral Over-Generalization Cases

| Expected | CC (truncated) |
|---|---|
| Gastroenteritis (7) | my stomach is a mess been runnin to the toilet every hour |
| Cellulitis (7) | skin on my arm is red warm and tender and the redness keeps  |
| Diverticulitis (7) | pain in my lower left belly with fever and i been constipate |
| Otitis Media (7) | my kid is screamin and grabbin his ear and got a fever |
| Orbital Cellulitis (6) | my eye is swollen shut red and it hurts to move it plus i go |
| Hand Foot and Mouth Disease (6) | daycare kid with fever painful mouth sores and a rash on pal |
| Sepsis (6) | feel like im dying fever chills cant think straight and so w |
| Thyroid Storm (3) | hyperthyroid and now everything is going haywire fever fast  |
| Bronchiolitis (3) | infant with runny nose that turned into fast breathing and w |
| Febrile Seizure (3) | my toddler was hot with fever then went stiff and was twitch |
| Kawasaki Disease (3) | my little one has fever that wont break plus red eyes swolle |
| Pulmonary Embolism (1) | i was just sittin there and suddenly couldnt breathe and sta |

## Per-Condition Accuracy

| Condition | Hits | Total | Accuracy | Primary Failure Mode |
|---|---|---|---|---|
| Pulmonary Embolism | 0 | 7 | 0% | Bronchitis |
| Urinary Tract Infection | 0 | 7 | 0% | Needs in-person evaluation |
| Appendicitis | 0 | 7 | 0% | Acute Gastroenteritis |
| Gastroenteritis | 0 | 7 | 0% | Viral infection |
| Nephrolithiasis | 0 | 7 | 0% | Needs in-person evaluation |
| Gout | 0 | 7 | 0% | Needs in-person evaluation |
| Pharyngitis | 0 | 7 | 0% | Esophageal Stricture |
| Cellulitis | 0 | 7 | 0% | Viral infection |
| Pneumothorax | 0 | 7 | 0% | Musculoskeletal pain |
| Diverticulitis | 0 | 7 | 0% | Viral infection |
| Pancreatitis | 0 | 7 | 0% | Gastroenteritis |
| Cholecystitis | 0 | 7 | 0% | Kidney Stone |
| Otitis Media | 0 | 7 | 0% | Viral infection |
| Gastrointestinal Bleeding | 0 | 7 | 0% | BPPV |
| Constipation | 0 | 7 | 0% | Appendicitis |
| Benign Paroxysmal Positional Vertigo | 0 | 7 | 0% | Needs in-person evaluation |
| Peritonsillar Abscess | 0 | 7 | 0% | Esophageal Stricture |
| Nursemaid Elbow | 0 | 7 | 0% | Needs in-person evaluation |
| Pyloric Stenosis | 0 | 7 | 0% | Acute Gastroenteritis |
| Epiglottitis | 0 | 7 | 0% | Esophageal Stricture |
| Henoch-Schonlein Purpura | 0 | 7 | 0% | Systemic Lupus Erythematosus |
| Slipped Capital Femoral Epiphysis | 0 | 7 | 0% | Hip Fracture |
| Intussusception | 0 | 7 | 0% | Viral Illness |
| Ovarian Torsion | 0 | 7 | 0% | Acute Gastroenteritis |
| Placental Abruption | 0 | 7 | 0% | Ectopic Pregnancy |
| Tension Pneumothorax | 0 | 6 | 0% | Generalized Anxiety Disorder |
| Thyroid Storm | 0 | 6 | 0% | Viral infection |
| Rhabdomyolysis | 0 | 6 | 0% | Stroke |
| Corneal Abrasion | 0 | 6 | 0% | Needs in-person evaluation |
| Orbital Cellulitis | 0 | 6 | 0% | Viral infection |
| Temporal Arteritis | 0 | 6 | 0% | Needs in-person evaluation |
| Subdural Hematoma | 0 | 6 | 0% | Tension headache |
| Hand Foot and Mouth Disease | 0 | 6 | 0% | Viral infection |
| Impetigo | 0 | 6 | 0% | Contact Dermatitis |
| Bronchiolitis | 0 | 6 | 0% | Viral URI |
| Atrial Fibrillation | 0 | 6 | 0% | BPPV |
| Sciatica | 0 | 6 | 0% | Musculoskeletal strain |
| Bowel Obstruction | 0 | 6 | 0% | Acute Gastroenteritis |
| Hypothyroidism | 0 | 6 | 0% | Fracture |
| Peripheral Neuropathy | 0 | 6 | 0% | Needs in-person evaluation |
| Plantar Fasciitis | 0 | 6 | 0% | Needs in-person evaluation |
| Carpal Tunnel Syndrome | 0 | 6 | 0% | Stroke |
| Sepsis | 1 | 7 | 14% | Viral infection |
| Croup | 1 | 7 | 14% | Post-Bronchitic cough |
| Mesenteric Ischemia | 1 | 6 | 17% | Gastroenteritis |
| Shingles | 1 | 6 | 17% | Viral Exanthem |
| Aortic Dissection | 3 | 7 | 43% | Acute Hemorrhage |
| Ectopic Pregnancy | 3 | 7 | 43% | Acute Pelvic Inflammatory Disease |
| Status Epilepticus | 3 | 6 | 50% | Needs in-person evaluation |
| Addison Crisis | 3 | 6 | 50% | BPPV |
| Panic Attack | 3 | 6 | 50% | Pulmonary Embolism |
| Hemorrhoids | 3 | 6 | 50% | Major Depressive Disorder |
| COPD Exacerbation | 4 | 7 | 57% | Asthma |
| Febrile Seizure | 4 | 7 | 57% | Viral infection |
| Kawasaki Disease | 4 | 7 | 57% | Viral infection |
| Pneumonia | 5 | 7 | 71% | Musculoskeletal pain |
| Congestive Heart Failure | 6 | 7 | 86% | Asthma |
| Acute Myocardial Infarction | 7 | 7 | 100% | - |
| Stroke | 7 | 7 | 100% | - |
| Asthma | 7 | 7 | 100% | - |
| Migraine | 7 | 7 | 100% | - |
| Deep Vein Thrombosis | 7 | 7 | 100% | - |
| Pyelonephritis | 7 | 7 | 100% | - |
| Meningitis | 7 | 7 | 100% | - |
| Diabetic Ketoacidosis | 7 | 7 | 100% | - |
| Bronchitis | 7 | 7 | 100% | - |
| Upper Respiratory Infection | 7 | 7 | 100% | - |
| Subarachnoid Hemorrhage | 7 | 7 | 100% | - |
| Testicular Torsion | 7 | 7 | 100% | - |
| Hip Fracture | 7 | 7 | 100% | - |
| Anaphylaxis | 7 | 7 | 100% | - |
| Preeclampsia | 7 | 7 | 100% | - |
| Cauda Equina Syndrome | 7 | 7 | 100% | - |
| Depression | 6 | 6 | 100% | - |
| Fibromyalgia | 6 | 6 | 100% | - |

