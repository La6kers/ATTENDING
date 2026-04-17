# COMPASS Stress Test — 600 API Cases (v17)

**Date:** 2026-04-17T00:31:48.441Z
**Endpoint:** http://localhost:3005/api/diagnose
**Total cases:** 600

## Overall Accuracy

| Metric | Value |
|---|---|
| **Hits (primary or top-5)** | 344 |
| **Misses** | 256 |
| **Errors** | 0 |
| **Accuracy** | **57.3%** |

## By Demographic

| Demo | Hits | Total | Accuracy |
|---|---|---|---|
| peds | 82 | 150 | 54.7% |
| adult | 141 | 250 | 56.4% |
| geri | 121 | 200 | 60.5% |

## By Setting

| Setting | Hits | Total | Accuracy |
|---|---|---|---|
| ED | 115 | 200 | 57.5% |
| UC | 113 | 200 | 56.5% |
| PC | 116 | 200 | 58.0% |

## Latency

| Percentile | ms |
|---|---|
| p50 | 15 |
| p95 | 20 |
| p99 | 25 |

## Top 10 Most-Missed Conditions

| Condition | Misses |
|---|---|
| Pulmonary Embolism | 5 |
| Appendicitis | 5 |
| Pneumothorax | 5 |
| Pyloric Stenosis | 5 |
| Slipped Capital Femoral Epiphysis | 5 |
| Intussusception | 5 |
| Placental Abruption | 5 |
| Tension Pneumothorax | 5 |
| Status Epilepticus | 5 |
| Thyroid Storm | 5 |

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
| Aortic Dissection | 5/5 |
| Subarachnoid Hemorrhage | 5/5 |

## All Misses

| ID | Demo | Setting | Expected | Got (Primary) | Top 5 | CC |
|---|---|---|---|---|---|---|
| 5002 | adult | PC | Pulmonary Embolism | Bronchitis | Bronchitis, Viral URI, ACE inhibitor cough, Pneumonia, Asthma | i was just sittin there and suddenly couldnt breathe and sta |
| 5005 | adult | PC | Appendicitis | Gastroenteritis | Gastroenteritis, Food Poisoning, Pregnancy (early), Medication Side Effect, Gastroparesis | started around my belly button now the pain moved to the low |
| 5009 | peds | ED | Nephrolithiasis | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Trichomoniasis, Bacterial Vaginosis | worst pain of my life in my side it comes and goes and i can |
| 5012 | peds | ED | COPD Exacerbation | Asthma | Asthma, Bronchi, Pneumonia, Post-infectious cough, Pulmonary Embolism | my copd is acting up cant breathe and coughing way more than |
| 5022 | geri | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, Acute Coronary Syndrome, GERD | sharp chest pain outta nowhere and now i cant take a full br |
| 5027 | adult | ED | Diverticulitis | Viral infection | Viral infection, UTI, Pneumonia, Gastroenteritis, Bacterial infection | pain in my lower left belly with fever and i been constipate |
| 5028 | geri | UC | Pancreatitis | Gastroenteritis | Gastroenteritis, GERD, Mesenteric Ischemia, Peptic Ulcer, Appendicitis | worst belly pain after eating greasy food goes right through |
| 5042 | adult | ED | Pyloric Stenosis | Gastroenteritis | Gastroenteritis, Food Poisoning, Bowel Obstruction, Medication Side Effect, Pregnancy (early) | my 3 week old baby keeps projectile vomiting after every fee |
| 5044 | adult | PC | Henoch-Schonlein Purpura | Systemic Lupus Erythematosus | Systemic Lupus Erythematosus, Rheumatoid Arthritis, Polymyalgia Rheumatica, Fibromyalgia, Sjogren Syndrome | my kid has a purple rash on his legs and his belly and joint |
| 5045 | adult | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Trochanteric Bursitis, Labral Tear | my overweight teen has been complaining of hip pain and now  |
| 5047 | geri | PC | Intussusception | Viral Illness | Viral Illness, Sepsis, Dehydration, Acute Hip and Leg, Hand Foot and Mouth Disease | my infant has episodes of screaming drawing up legs then goi |
| 5048 | geri | ED | Ovarian Torsion | Gastroenteritis | Gastroenteritis, Food Poisoning, Bowel Obstruction, Medication Side Effect, Pregnancy (early) | sudden horrible pain on one side of my pelvis and im throwin |
| 5049 | adult | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Appendicitis | pregnant and my belly got really hard and painful and theres |
| 5050 | geri | PC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder, Hyperthyroidism, Cardiac Arrhythmia | got hit in the chest and now i can barely breathe and feel l |
| 5051 | adult | ED | Status Epilepticus | Needs in-person evaluation | Needs in-person evaluation | my family member started seizing and its been going on and o |
| 5053 | adult | PC | Thyroid Storm | Viral infection | Viral infection, UTI, Pneumonia, Gastroenteritis, Bacterial infection | hyperthyroid and now everything is going haywire fever fast  |
| 5054 | geri | ED | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 5057 | peds | ED | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 5058 | adult | UC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Appendicitis, Peptic Ulcer, Diverticulitis | terrible belly pain after eating and ive been losing weight  |
| 5059 | adult | PC | Subdural Hematoma | Concussion | Concussion, Meningitis, Mild Traumatic Brain Injury, Post-Concussive Syndrome, Scalp Contusion/Laceration | grandpa bumped his head and now hes acting weird and drowsy |
| 5061 | geri | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Sepsis, Bacterial infection | daycare kid with fever painful mouth sores and a rash on pal |
| 5063 | adult | ED | Bronchiolitis | Viral URI | Viral URI, Anaphylaxis, Allergic Rhinitis, Acute Sinusitis, Epistaxis | infant with runny nose that turned into fast breathing and w |
| 5064 | peds | UC | Atrial Fibrillation | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Medication side effect, Anxiety | my heart is all over the place beating fast and irregular fe |
| 5066 | peds | ED | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 5070 | peds | UC | Hypothyroidism | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | im always cold tired and gaining weight even though i barely |
| 5076 | geri | UC | Alcohol Withdrawal | Delirium Tremens | Delirium Tremens, Toxic/Metabolic Encephalopathy, Substance Intoxication, Sepsis, Hepatic Encephalopathy | last drink was 2 days ago and now i got the shakes sweating  |
| 5078 | geri | ED | Opioid Withdrawal | Fibromyalgia | Fibromyalgia, Polymyalgia Rheumatica, Chronic Fatigue Syndrome, Hypothyroidism, Viral Illness | ran out of my pain pills 2 days ago and my whole body aches  |
| 5081 | geri | ED | Psychotic Disorder | Caustic Ingestion | Caustic Ingestion, Chemical Exposure, Foreign Body Ingestion, Medication Overdose, Toxic Alcohol Ingestion | she started talking to people who arent there and thinks som |
| 5082 | geri | UC | Stimulant Intoxication | Atrial Fibrillation | Atrial Fibrillation, Anxiety, Cardiac Arrhythmia, Supraventricular Tachycardia, Panic Disorder | took too much adderall and my heart is pounding im shaking a |
| 5087 | adult | ED | ADEM | Tension headache | Tension headache, Migraine, Stroke, Meningitis, Sinusitis | child developed weakness in legs after a virus plus headache |
| 5094 | peds | UC | Sexual Assault | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | something happened to me last night at a party and i need to |
| 5095 | adult | PC | Erectile Dysfunction | Needs in-person evaluation | Needs in-person evaluation | things arent working down there like they used to and im too |
| 5096 | geri | ED | Dyspareunia | First Degree Burn | First Degree Burn, Second Degree Burn, Third Degree Burn, Chemical Burn, Sunburn | it hurts every time my husband and i try to have sex like a  |
| 5097 | geri | UC | Chlamydia | Choledocholithiasis | Choledocholithiasis, Pancreatic Cancer, Viral Hepatitis, Cirrhosis, Cholangitis | theres a yellowish drip and it stings to urinate think i mig |
| 5100 | peds | UC | Postpartum Depression | Needs in-person evaluation | Needs in-person evaluation | had my baby 6 weeks ago and i cant stop crying i dont feel b |
| 5101 | adult | PC | Colic | Needs in-person evaluation | Needs in-person evaluation | baby cries inconsolably for 3 plus hours pulls legs up turns |
| 5102 | adult | ED | Polypharmacy/Medication Effect | Fracture | Fracture, Hip Fracture, Traumatic Brain Injury, Soft Tissue Injury, Rib Fracture | my grandpa keeps falling he takes like 12 different medicati |
| 5105 | peds | ED | Esophageal Foreign Body | Child Abuse / Non-Accidental Trauma | Child Abuse / Non-Accidental Trauma, Physical Abuse, Intimate Partner Violence, Elder Abuse/Neglect, Sexual Assault | my toddler put a battery in her mouth and i think she swallo |
| 5106 | adult | UC | Acute Urinary Retention | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Pancreatitis | i havent been able to pee all day my belly is huge and it fe |
| 5107 | geri | PC | Inguinal Hernia | Needs in-person evaluation | Needs in-person evaluation | got this lump near my privates that comes and goes and aches |
| 5110 | peds | PC | Obstructive Sleep Apnea | UTI | UTI, Kidney Stone, Prostatitis, Urethritis, Pyelonephritis | my wife says i snore like a freight train and stop breathing |
| 5111 | adult | ED | Malignancy | Seizure | Seizure, New-Onset Epilepsy, Alcohol Withdrawal Seizure, Stroke, Syncope | been losing weight like crazy clothes dont fit anymore and i |
| 5114 | peds | ED | Hypothermia | Viral infection | Viral infection, Sepsis, UTI, Gastroenteritis, Pneumonia | found my grandpa outside in the cold hes shivering confused  |
| 5115 | geri | UC | Laceration/Crush Injury | Fracture | Fracture, Hip Fracture, Traumatic Brain Injury, Soft Tissue Injury, Rib Fracture | fell off a ladder at the construction site landed on my arm  |
| 5119 | adult | PC | Pneumonia | Bronchitis | Bronchitis, ACE inhibitor cough, Viral URI, Sepsis, Asthma | started as a cold but now i cant stop shaking and coughing u |
| 5121 | adult | UC | Appendicitis | Kidney Stone | Kidney Stone, Abdominal Aortic Aneurysm, Pyelonephritis, Musculoskeletal Strain, UTI | my right side is killing me i cant even stand up straight |
| 5124 | adult | UC | Migraine | Acute Angle Closure Glaucoma | Acute Angle Closure Glaucoma, Subarachnoid Hemorrhage, Conjunctivitis, Corneal Abrasion, Foreign Body | throbbing pain behind my eye and i feel like ima throw up fr |
| 5126 | geri | ED | Congestive Heart Failure | DVT | DVT, Cellulitis, Musculoskeletal Strain, Venous Insufficiency, Baker's Cyst Rupture | keep waking up at night gasping for air and my legs are swol |
| 5127 | peds | UC | Deep Vein Thrombosis | Cellulitis | Cellulitis, Abscess, Contact Dermatitis, Orbital Cellulitis, Erysipelas | one leg is way bigger than the other and its warm and tender |
| 5129 | adult | ED | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Spinal Stenosis, Herniated Disc, Sepsis, Kidney Stone | hurts to pee and now my back is killing me and i got a high  |
| 5132 | adult | ED | Sepsis | Atrial Fibrillation | Atrial Fibrillation, Supraventricular Tachycardia, Cardiac Arrhythmia, Panic Disorder, Anxiety | infection got real bad now im lightheaded heart pounding fev |
| 5134 | geri | PC | Pharyngitis | Viral infection | Viral infection, Pneumonia, UTI, Gastroenteritis, Sepsis | hurts so bad to swallow even water and i got a fever |
| 5138 | geri | ED | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Coronary Syndrome, Acute Myocardial Infarction, Pneumonia, GERD | sharp chest pain outta nowhere and now i cant take a full br |
| 5143 | adult | PC | Diverticulitis | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Appendicitis, Ectopic Pregnancy | belly pain on the lower left that gets worse and i dont wann |
| 5145 | geri | UC | Cholecystitis | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Appendicitis | right upper belly pain that goes to my shoulder and i feel s |
| 5150 | geri | ED | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | been pooping black tar looking stuff and feel lightheaded |
| 5158 | adult | PC | Pyloric Stenosis | Gastroenteritis | Gastroenteritis, Food Poisoning, Bowel Obstruction, Medication Side Effect, Cyclic Vomiting Syndrome | my 3 week old baby keeps projectile vomiting after every fee |
| 5161 | adult | PC | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Trochanteric Bursitis, Septic Arthritis, Hip Osteoarthritis | my overweight teen has been complaining of hip pain and now  |
| 5163 | geri | UC | Intussusception | Viral Illness | Viral Illness, Sepsis, Dehydration, Acute Hip and Leg, Hand Foot and Mouth Disease | my infant has episodes of screaming drawing up legs then goi |
| 5164 | geri | PC | Ovarian Torsion | Gastroenteritis | Gastroenteritis, Food Poisoning, Bowel Obstruction, Medication Side Effect, Pregnancy (early) | sudden horrible pain on one side of my pelvis and im throwin |
| 5165 | adult | ED | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Appendicitis | pregnant and my belly got really hard and painful and theres |
| 5166 | geri | UC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Major Depressive Disorder, Panic Disorder, Cardiac Arrhythmia, Substance Use Disorder | got hit in the chest and now i can barely breathe and feel l |
| 5167 | geri | PC | Status Epilepticus | Needs in-person evaluation | Needs in-person evaluation | my family member started seizing and its been going on and o |
| 5169 | geri | UC | Thyroid Storm | Viral infection | Viral infection, Pneumonia, UTI, Gastroenteritis, Sepsis | hyperthyroid and now everything is going haywire fever fast  |
| 5170 | adult | PC | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 5172 | adult | UC | Orbital Cellulitis | Conjunctivitis | Conjunctivitis, Corneal Abrasion, Foreign Body, Acute Angle Closure Glaucoma, Uveitis | my eye is swollen shut red and it hurts to move it plus i go |
| 5173 | geri | PC | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 5175 | adult | UC | Subdural Hematoma | Concussion | Concussion, Meningitis, Mild Traumatic Brain Injury, Post-Concussive Syndrome, Scalp Contusion/Laceration | grandpa bumped his head and now hes acting weird and drowsy |
| 5177 | geri | ED | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, UTI, Gastroenteritis, Sepsis | daycare kid with fever painful mouth sores and a rash on pal |
| 5179 | adult | PC | Bronchiolitis | Viral URI | Viral URI, Allergic Rhinitis, Anaphylaxis, Acute Sinusitis, Nasal Foreign Body | infant with runny nose that turned into fast breathing and w |
| 5180 | adult | ED | Atrial Fibrillation | BPPV | BPPV, Vestibular neuritis, Orthostatic hypotension, Anxiety, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 5182 | adult | PC | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 5186 | geri | ED | Hypothyroidism | Fracture | Fracture, Hip Fracture, Traumatic Brain Injury, Soft Tissue Injury, Rib Fracture | im always cold tired and gaining weight even though i barely |
| 5191 | geri | PC | Delirium Tremens | Temporal Arteritis | Temporal Arteritis, Meningitis, Stroke, Central Retinal Artery Occlusion, Retinal Detachment | stopped drinking and now im trembling cant think straight an |
| 5193 | geri | UC | Opioid Overdose | Toxic/Metabolic Encephalopathy | Toxic/Metabolic Encephalopathy, Substance Intoxication, Delirium Tremens, Sepsis, Stroke | she took a bunch of pills and now shes barely breathing and  |
| 5196 | peds | UC | Bipolar Disorder — Manic Episode | Needs in-person evaluation | Needs in-person evaluation | i feel amazing like i can do anything havent needed sleep an |
| 5197 | geri | PC | Psychotic Disorder | Medication Overdose | Medication Overdose, Caustic Ingestion, Foreign Body Ingestion, Chemical Exposure, Toxic Alcohol Ingestion | she started talking to people who arent there and thinks som |
| 5198 | adult | ED | Stimulant Intoxication | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Atrial Fibrillation, Cardiac Arrhythmia, Anxiety | he smoked meth and now his heart is racing hes paranoid swea |
| 5203 | geri | PC | ADEM | Tension headache | Tension headache, Stroke, Meningitis, Cluster headache, Migraine | child developed weakness in legs after a virus plus headache |
| 5205 | peds | UC | Vasovagal Syncope | BPPV | BPPV, Acute Myocardial Infarction, Anxiety, Orthostatic hypotension, Vestibular neuritis | got lightheaded at church felt hot and sweaty then next thin |
| 5206 | peds | PC | Urticaria | Viral Exanthem | Viral Exanthem, Contact Dermatitis, Conjunctivitis, Allergic Reaction, Varicella (Chickenpox) | took a new medicine yesterday and now i got bumps and itchy  |
| 5208 | geri | UC | Iron Deficiency Anemia | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Cardiac Arrhythmia | so tired i can barely function my periods have been super he |
| 5209 | adult | PC | Intimate Partner Violence | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | he punched me in the face again and i think my cheekbone mig |
| 5210 | peds | ED | Sexual Assault | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | something happened to me last night at a party and i need to |
| 5212 | adult | PC | Dyspareunia | First Degree Burn | First Degree Burn, Second Degree Burn, Third Degree Burn, Chemical Burn, Sunburn | it hurts every time my husband and i try to have sex like a  |
| 5213 | peds | ED | Chlamydia | Choledocholithiasis | Choledocholithiasis, Viral Hepatitis, Cirrhosis, Alcoholic Hepatitis, Cholangitis | theres a yellowish drip and it stings to urinate think i mig |
| 5214 | adult | UC | HRT Side Effect — Mood/Psychiatric | DVT | DVT, Cellulitis, Venous Insufficiency, Musculoskeletal Strain, Lymphedema | started estrogen 3 months ago and now i get terrible headach |
| 5215 | adult | PC | Lactation Mastitis | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Trichomoniasis, Bacterial Vaginosis | had a clogged duct that turned into my whole breast being re |
| 5216 | adult | ED | Postpartum Depression | Needs in-person evaluation | Needs in-person evaluation | had my baby 6 weeks ago and i cant stop crying i dont feel b |
| 5217 | adult | UC | Colic | Needs in-person evaluation | Needs in-person evaluation | baby cries inconsolably for 3 plus hours pulls legs up turns |
| 5218 | adult | PC | Polypharmacy/Medication Effect | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | ever since they added that new medicine i feel woozy and uns |
| 5219 | adult | ED | Heat Exhaustion | BPPV | BPPV, Acute Myocardial Infarction, Vestibular neuritis, Orthostatic hypotension, Anxiety | was working outside in the heat all day and now im dizzy nau |
| 5221 | adult | PC | Esophageal Foreign Body | Intimate Partner Violence | Intimate Partner Violence, Elder Abuse/Neglect, Physical Abuse, Sexual Assault, Child Abuse / Non-Accidental Trauma | my toddler put a battery in her mouth and i think she swallo |
| 5222 | peds | ED | Acute Urinary Retention | Gastroenteritis | Gastroenteritis, GERD, Appendicitis, Peptic Ulcer, Pancreatitis | i havent been able to pee all day my belly is huge and it fe |
| 5223 | peds | UC | Inguinal Hernia | Needs in-person evaluation | Needs in-person evaluation | got this lump near my privates that comes and goes and aches |
| 5226 | adult | UC | Obstructive Sleep Apnea | Kidney Stone | Kidney Stone, UTI, Prostatitis, Urethritis, Pyelonephritis | my wife says i snore like a freight train and stop breathing |
| 5227 | adult | PC | Malignancy | Seizure | Seizure, New-Onset Epilepsy, Alcohol Withdrawal Seizure, Stroke, Syncope | been losing weight like crazy clothes dont fit anymore and i |
| 5230 | peds | PC | Hypothermia | Viral infection | Viral infection, Sepsis, UTI, Gastroenteritis, Pneumonia | found my grandpa outside in the cold hes shivering confused  |
| 5231 | geri | ED | Laceration/Crush Injury | Fracture | Fracture, Hip Fracture, Traumatic Brain Injury, Soft Tissue Injury, Rib Fracture | fell off a ladder at the construction site landed on my arm  |
| 5234 | peds | ED | Pulmonary Embolism | Asthma | Asthma, Pneumonia, Viral URI | feel like im suffocating and theres this stabbing pain on th |
| 5236 | adult | PC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | feels like peein razor blades and my pee smells awful |
| 5240 | adult | ED | Migraine | Temporal Arteritis | Temporal Arteritis, Retinal Detachment, Optic Neuritis, Central Retinal Artery Occlusion, Stroke | my head is pounding so bad i cant see straight and lights ma |
| 5244 | adult | UC | COPD Exacerbation | Bronchitis | Bronchitis, ACE inhibitor cough, Viral URI, Asthma, Pneumonia | lungs feel like theyre on fire and i cant stop coughing gree |
| 5245 | geri | PC | Pyelonephritis | Spinal Stenosis | Spinal Stenosis, Musculoskeletal strain, Compression fracture, Cauda Equina Syndrome, Herniated Disc | fever of 103 and pain in my lower back plus burning when i u |
| 5247 | peds | UC | Diabetic Ketoacidosis | Depression | Depression, Anemia, Hypothyroidism, Electrolyte abnormality, Acute Nephritis | my sugar was over 500 and i feel terrible im so nauseous and |
| 5248 | peds | PC | Sepsis | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Anxiety, Cardiac Arrhythmia, Meningitis | had a cut that got infected now i feel terrible fever racing |
| 5250 | adult | UC | Pharyngitis | Anaphylaxis | Anaphylaxis, Angioedema, ACE Inhibitor Angioedema, Food Allergy (severe), Hereditary Angioedema | sore throat is killing me and my glands are all swollen up |
| 5254 | peds | PC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, GERD, Anxiety | sharp chest pain outta nowhere and now i cant take a full br |
| 5260 | peds | PC | Pancreatitis | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Medication Induced Vomiting, Peptic Ulcer | upper stomach pain that gets worse after i eat and im puking |
| 5261 | adult | ED | Cholecystitis | Gastroenteritis | Gastroenteritis, Food Poisoning, Pregnancy (early), Medication Side Effect, Gastroparesis | pain under my right ribs especially after eating and im naus |
| 5274 | geri | UC | Pyloric Stenosis | Gastroenteritis | Gastroenteritis, Food Poisoning, Bowel Obstruction, Medication Side Effect, Cyclic Vomiting Syndrome | my 3 week old baby keeps projectile vomiting after every fee |
| 5275 | adult | PC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Peritonsillar Abscess, Infectious Mononucleosis, GERD | sore throat came on fast now my child is leaning forward dro |
| 5276 | geri | ED | Henoch-Schonlein Purpura | Systemic Lupus Erythematosus | Systemic Lupus Erythematosus, Rheumatoid Arthritis, Polymyalgia Rheumatica, Fibromyalgia, Sjogren Syndrome | my kid has a purple rash on his legs and his belly and joint |
| 5277 | adult | UC | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Labral Tear, Anterior or Anterolateral thigh neuropathic pain | my overweight teen has been complaining of hip pain and now  |
| 5279 | adult | ED | Intussusception | Viral Illness | Viral Illness, Sepsis, Dehydration, Acute Hip and Leg, Hand Foot and Mouth Disease | my infant has episodes of screaming drawing up legs then goi |
| 5280 | geri | UC | Ovarian Torsion | Gastroenteritis | Gastroenteritis, Food Poisoning, Bowel Obstruction, Medication Side Effect, Pregnancy (early) | sudden horrible pain on one side of my pelvis and im throwin |
| 5281 | geri | PC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Diverticulitis | pregnant and my belly got really hard and painful and theres |
| 5282 | peds | ED | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder, Hyperthyroidism, Substance Use Disorder | got hit in the chest and now i can barely breathe and feel l |
| 5283 | geri | UC | Status Epilepticus | Needs in-person evaluation | Needs in-person evaluation | my family member started seizing and its been going on and o |
| 5285 | geri | ED | Thyroid Storm | Viral infection | Viral infection, Pneumonia, UTI, Gastroenteritis, Sepsis | hyperthyroid and now everything is going haywire fever fast  |
| 5286 | adult | UC | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 5288 | geri | ED | Orbital Cellulitis | Conjunctivitis | Conjunctivitis, Corneal Abrasion, Acute Angle Closure Glaucoma, Foreign Body, Uveitis | my eye is swollen shut red and it hurts to move it plus i go |
| 5289 | adult | UC | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 5290 | adult | PC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Appendicitis, Diverticulitis | terrible belly pain after eating and ive been losing weight  |
| 5293 | adult | PC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Bacterial infection, Acute Otitis Media | daycare kid with fever painful mouth sores and a rash on pal |
| 5294 | geri | ED | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Cellulitis, Conjunctivitis, Allergic Reaction | my kid has crusty honey colored sores around his mouth and n |
| 5295 | geri | UC | Bronchiolitis | Viral URI | Viral URI, Anaphylaxis, Allergic Rhinitis, Acute Sinusitis, Epistaxis | infant with runny nose that turned into fast breathing and w |
| 5296 | peds | PC | Atrial Fibrillation | BPPV | BPPV, Anxiety, Orthostatic hypotension, Vestibular neuritis, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 5298 | adult | UC | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 5302 | adult | PC | Hypothyroidism | Fracture | Fracture, Soft Tissue Injury, Rib Fracture, Concussion, Traumatic Brain Injury | im always cold tired and gaining weight even though i barely |
| 5308 | geri | PC | Alcohol Withdrawal | Atrial Fibrillation | Atrial Fibrillation, Supraventricular Tachycardia, Cardiac Arrhythmia, Panic Disorder, Anxiety | trying to detox from alcohol at home and im shaking anxious  |
| 5313 | peds | UC | Psychotic Disorder | Medication Overdose | Medication Overdose, Caustic Ingestion, Foreign Body Ingestion, Chemical Exposure, Toxic Alcohol Ingestion | she started talking to people who arent there and thinks som |
| 5314 | geri | PC | Stimulant Intoxication | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Acute Coronary Syndrome, GERD, Pneumonia | she used cocaine and now shes agitated chest pain and her pu |
| 5318 | peds | ED | Neuroleptic Malignant Syndrome | Meningitis | Meningitis, Viral infection, Acute Otitis Media, UTI, Gastroenteritis | started haldol and now hes rigid as a board with a high feve |
| 5319 | geri | UC | ADEM | Tension headache | Tension headache, Stroke, Migraine, Meningitis, Sinusitis | child developed weakness in legs after a virus plus headache |
| 5323 | adult | PC | Simple Laceration | Fracture | Fracture, Soft Tissue Injury, Rib Fracture, Traumatic Brain Injury, Concussion | my kid fell on the playground and split his chin open its ga |
| 5326 | peds | PC | Sexual Assault | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | something happened to me last night at a party and i need to |
| 5328 | geri | UC | Dyspareunia | First Degree Burn | First Degree Burn, Second Degree Burn, Third Degree Burn, Chemical Burn, Sunburn | it hurts every time my husband and i try to have sex like a  |
| 5329 | peds | PC | Chlamydia | Choledocholithiasis | Choledocholithiasis, Viral Hepatitis, Cirrhosis, Alcoholic Hepatitis, Cholangitis | theres a yellowish drip and it stings to urinate think i mig |
| 5332 | geri | PC | Postpartum Depression | Needs in-person evaluation | Needs in-person evaluation | had my baby 6 weeks ago and i cant stop crying i dont feel b |
| 5333 | adult | ED | Colic | Needs in-person evaluation | Needs in-person evaluation | baby cries inconsolably for 3 plus hours pulls legs up turns |
| 5334 | peds | UC | Polypharmacy/Medication Effect | BPPV | BPPV, Vestibular neuritis, Orthostatic hypotension | keep losing my balance fell three times this week and im on  |
| 5337 | adult | UC | Esophageal Foreign Body | Physical Abuse | Physical Abuse, Intimate Partner Violence, Child Abuse / Non-Accidental Trauma, Elder Abuse/Neglect, Sexual Assault | my toddler put a battery in her mouth and i think she swallo |
| 5338 | adult | PC | Acute Urinary Retention | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Pancreatitis | i havent been able to pee all day my belly is huge and it fe |
| 5339 | adult | ED | Inguinal Hernia | Needs in-person evaluation | Needs in-person evaluation | got this lump near my privates that comes and goes and aches |
| 5342 | peds | ED | Obstructive Sleep Apnea | UTI | UTI, Kidney Stone, Prostatitis, Urethritis, Pyelonephritis | my wife says i snore like a freight train and stop breathing |
| 5343 | adult | UC | Malignancy | Seizure | Seizure, New-Onset Epilepsy, Alcohol Withdrawal Seizure, Stroke, Syncope | been losing weight like crazy clothes dont fit anymore and i |
| 5346 | geri | UC | Hypothermia | Viral infection | Viral infection, Sepsis, Pneumonia, UTI, Gastroenteritis | found my grandpa outside in the cold hes shivering confused  |
| 5347 | adult | PC | Laceration/Crush Injury | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | fell off a ladder at the construction site landed on my arm  |
| 5350 | adult | PC | Pulmonary Embolism | Musculoskeletal pain | Musculoskeletal pain, Acute Coronary Syndrome, Acute Myocardial Infarction, GERD, Pneumonia | cant catch my breath outta nowhere and my chest hurts when i |
| 5353 | adult | PC | Appendicitis | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Bacterial infection, Acute Otitis Media | sharp stabbing pain in my lower right belly and i got a feve |
| 5357 | peds | ED | Nephrolithiasis | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Trichomoniasis, Bacterial Vaginosis | worst pain of my life in my side it comes and goes and i can |
| 5370 | geri | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, Acute Coronary Syndrome, GERD | sharp chest pain outta nowhere and now i cant take a full br |
| 5375 | peds | ED | Diverticulitis | Viral infection | Viral infection, Acute Otitis Media, UTI, Gastroenteritis, Pneumonia | pain in my lower left belly with fever and i been constipate |
| 5376 | peds | UC | Pancreatitis | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Mesenteric Ischemia, Peptic Ulcer | worst belly pain after eating greasy food goes right through |
| 5390 | geri | ED | Pyloric Stenosis | Gastroenteritis | Gastroenteritis, Food Poisoning, Bowel Obstruction, Medication Side Effect, Cyclic Vomiting Syndrome | my 3 week old baby keeps projectile vomiting after every fee |
| 5391 | geri | UC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, Bone Lesions, Peritonsillar Abscess | sore throat came on fast now my child is leaning forward dro |
| 5392 | geri | PC | Henoch-Schonlein Purpura | Systemic Lupus Erythematosus | Systemic Lupus Erythematosus, Rheumatoid Arthritis, Polymyalgia Rheumatica, Sjogren Syndrome, Fibromyalgia | my kid has a purple rash on his legs and his belly and joint |
| 5393 | peds | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Labral Tear, Anterior or Anterolateral thigh neuropathic pain | my overweight teen has been complaining of hip pain and now  |
| 5395 | geri | PC | Intussusception | Viral Illness | Viral Illness, Sepsis, UTI, Dehydration, Acute Hip and Leg | my infant has episodes of screaming drawing up legs then goi |
| 5397 | geri | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Diverticulitis | pregnant and my belly got really hard and painful and theres |
| 5398 | peds | PC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Major Depressive Disorder, Panic Disorder, Substance Use Disorder, Cardiac Arrhythmia | got hit in the chest and now i can barely breathe and feel l |
| 5399 | peds | ED | Status Epilepticus | Needs in-person evaluation | Needs in-person evaluation | my family member started seizing and its been going on and o |
| 5401 | adult | PC | Thyroid Storm | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Bacterial infection, Acute Otitis Media | hyperthyroid and now everything is going haywire fever fast  |
| 5402 | peds | ED | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 5405 | adult | ED | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 5407 | peds | PC | Subdural Hematoma | Concussion | Concussion, Meningitis, Mild Traumatic Brain Injury, Post-Concussive Syndrome, Scalp Contusion/Laceration | grandpa bumped his head and now hes acting weird and drowsy |
| 5409 | adult | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, UTI, Pneumonia, Gastroenteritis, Bacterial infection | daycare kid with fever painful mouth sores and a rash on pal |
| 5411 | geri | ED | Bronchiolitis | Viral URI | Viral URI, Anaphylaxis, Allergic Rhinitis, Acute Sinusitis, Epistaxis | infant with runny nose that turned into fast breathing and w |
| 5412 | adult | UC | Atrial Fibrillation | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 5414 | peds | ED | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 5418 | geri | UC | Hypothyroidism | Fracture | Fracture, Hip Fracture, Traumatic Brain Injury, Soft Tissue Injury, Rib Fracture | im always cold tired and gaining weight even though i barely |
| 5424 | adult | UC | Alcohol Withdrawal | Delirium Tremens | Delirium Tremens, Substance Intoxication, Toxic/Metabolic Encephalopathy, UTI, Hepatic Encephalopathy | last drink was 2 days ago and now i got the shakes sweating  |
| 5426 | geri | ED | Opioid Withdrawal | Polymyalgia Rheumatica | Polymyalgia Rheumatica, Viral Illness, Acute Gastroenteritis, Fibromyalgia, Chronic Fatigue Syndrome | ran out of my pain pills 2 days ago and my whole body aches  |
| 5429 | adult | ED | Psychotic Disorder | Medication Overdose | Medication Overdose, Caustic Ingestion, Chemical Exposure, Foreign Body Ingestion, Toxic Alcohol Ingestion | she started talking to people who arent there and thinks som |
| 5430 | adult | UC | Stimulant Intoxication | Anxiety | Anxiety, Supraventricular Tachycardia, Panic Disorder, Cardiac Arrhythmia, Hyperthyroidism | took too much adderall and my heart is pounding im shaking a |
| 5435 | geri | ED | ADEM | Tension headache | Tension headache, Stroke, Meningitis, Cluster headache, Migraine | child developed weakness in legs after a virus plus headache |
| 5442 | adult | UC | Sexual Assault | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | something happened to me last night at a party and i need to |
| 5443 | peds | PC | Erectile Dysfunction | Needs in-person evaluation | Needs in-person evaluation | things arent working down there like they used to and im too |
| 5444 | peds | ED | Dyspareunia | First Degree Burn | First Degree Burn, Second Degree Burn, Third Degree Burn, Chemical Burn, Sunburn | it hurts every time my husband and i try to have sex like a  |
| 5445 | peds | UC | Chlamydia | Choledocholithiasis | Choledocholithiasis, Viral Hepatitis, Cirrhosis, Alcoholic Hepatitis, Cholangitis | theres a yellowish drip and it stings to urinate think i mig |
| 5448 | peds | UC | Postpartum Depression | Needs in-person evaluation | Needs in-person evaluation | had my baby 6 weeks ago and i cant stop crying i dont feel b |
| 5449 | adult | PC | Colic | Needs in-person evaluation | Needs in-person evaluation | baby cries inconsolably for 3 plus hours pulls legs up turns |
| 5450 | peds | ED | Polypharmacy/Medication Effect | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | my grandpa keeps falling he takes like 12 different medicati |
| 5453 | geri | ED | Esophageal Foreign Body | Physical Abuse | Physical Abuse, Elder Abuse/Neglect, Child Abuse / Non-Accidental Trauma, Intimate Partner Violence, Sexual Assault | my toddler put a battery in her mouth and i think she swallo |
| 5454 | adult | UC | Acute Urinary Retention | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Pancreatitis | i havent been able to pee all day my belly is huge and it fe |
| 5455 | peds | PC | Inguinal Hernia | Needs in-person evaluation | Needs in-person evaluation | got this lump near my privates that comes and goes and aches |
| 5458 | geri | PC | Obstructive Sleep Apnea | UTI | UTI, Kidney Stone, Prostatitis, Urethritis, Pyelonephritis | my wife says i snore like a freight train and stop breathing |
| 5459 | peds | ED | Malignancy | Seizure | Seizure, New-Onset Epilepsy, Alcohol Withdrawal Seizure, Syncope, Febrile Seizure | been losing weight like crazy clothes dont fit anymore and i |
| 5462 | geri | ED | Hypothermia | Viral infection | Viral infection, Sepsis, Pneumonia, Gastroenteritis, Bacterial infection | found my grandpa outside in the cold hes shivering confused  |
| 5463 | geri | UC | Laceration/Crush Injury | Fracture | Fracture, Hip Fracture, Traumatic Brain Injury, Soft Tissue Injury, Rib Fracture | fell off a ladder at the construction site landed on my arm  |
| 5466 | geri | UC | Pulmonary Embolism | Atrial Fibrillation | Atrial Fibrillation, Cardiac Arrhythmia, Supraventricular Tachycardia, Panic Disorder, Anxiety | sharp pain in my chest every time i take a breath and my hea |
| 5468 | adult | ED | Urinary Tract Infection | Chlamydia | Chlamydia, Genital Herpes, Gonorrhea, Syphilis, Trichomoniasis | i keep runnin to the bathroom but barely anything comes out  |
| 5469 | adult | UC | Appendicitis | Viral infection | Viral infection, Bacterial infection, UTI | pain in my stomach moved down to the right side and bumps in |
| 5472 | geri | UC | Migraine | Acute Angle Closure Glaucoma | Acute Angle Closure Glaucoma, Subarachnoid Hemorrhage, Conjunctivitis, Corneal Abrasion, Foreign Body | throbbing pain behind my eye and i feel like ima throw up fr |
| 5474 | adult | ED | Congestive Heart Failure | Seizure | Seizure, New-Onset Epilepsy, Syncope, Alcohol Withdrawal Seizure, Hypoglycemia | cant walk to the mailbox without stopping to rest and my sho |
| 5475 | adult | UC | Deep Vein Thrombosis | Cellulitis | Cellulitis, Abscess, Contact Dermatitis, Orbital Cellulitis, Erysipelas | one leg is way bigger than the other and its warm and tender |
| 5476 | peds | PC | COPD Exacerbation | Pneumonia | Pneumonia, Asthma, Viral URI | breathing is worse than ever my inhaler aint helping like it |
| 5477 | peds | ED | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Sepsis, Herniated Disc, Compression fracture, Spinal Stenosis | hurts to pee and now my back is killing me and i got a high  |
| 5482 | peds | PC | Pharyngitis | Viral infection | Viral infection, Acute Otitis Media, Gastroenteritis, Pneumonia, Hand Foot and Mouth Disease | hurts so bad to swallow even water and i got a fever |
| 5486 | adult | ED | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, Anxiety, GERD | sharp chest pain outta nowhere and now i cant take a full br |
| 5493 | geri | UC | Cholecystitis | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Appendicitis | right upper belly pain that goes to my shoulder and i feel s |
| 5498 | adult | ED | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | been pooping black tar looking stuff and feel lightheaded |
| 5506 | geri | PC | Pyloric Stenosis | Gastroenteritis | Gastroenteritis, Food Poisoning, Bowel Obstruction, Medication Side Effect, Pregnancy (early) | my 3 week old baby keeps projectile vomiting after every fee |
| 5508 | adult | UC | Henoch-Schonlein Purpura | Systemic Lupus Erythematosus | Systemic Lupus Erythematosus, Rheumatoid Arthritis, Polymyalgia Rheumatica, Fibromyalgia, Sjogren Syndrome | my kid has a purple rash on his legs and his belly and joint |
| 5509 | geri | PC | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Septic Arthritis, Femoral Lesion, Hip Osteoarthritis, Anterior or Anterolateral thigh neuropathic pain | my overweight teen has been complaining of hip pain and now  |
| 5511 | adult | UC | Intussusception | Viral Illness | Viral Illness, Sepsis, Dehydration, Acute Hip and Leg, Hand Foot and Mouth Disease | my infant has episodes of screaming drawing up legs then goi |
| 5513 | geri | ED | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Diverticulitis | pregnant and my belly got really hard and painful and theres |
| 5514 | adult | UC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder, Hyperthyroidism, Substance Use Disorder | got hit in the chest and now i can barely breathe and feel l |
| 5515 | peds | PC | Status Epilepticus | Needs in-person evaluation | Needs in-person evaluation | my family member started seizing and its been going on and o |
| 5517 | geri | UC | Thyroid Storm | Viral infection | Viral infection, Pneumonia, UTI, Gastroenteritis, Sepsis | hyperthyroid and now everything is going haywire fever fast  |
| 5518 | adult | PC | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 5520 | geri | UC | Orbital Cellulitis | Conjunctivitis | Conjunctivitis, Corneal Abrasion, Foreign Body, Acute Angle Closure Glaucoma, Uveitis | my eye is swollen shut red and it hurts to move it plus i go |
| 5521 | adult | PC | Temporal Arteritis | Iron Deficiency Anemia | Iron Deficiency Anemia, Hypothyroidism, Major Depressive Disorder | my temple area is tender and throbbing and i noticed my visi |
| 5525 | peds | ED | Hand Foot and Mouth Disease | Viral infection | Viral infection, Acute Otitis Media, UTI, Gastroenteritis, Pneumonia | daycare kid with fever painful mouth sores and a rash on pal |
| 5526 | adult | UC | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Conjunctivitis, Allergic Reaction, Cellulitis | my kid has crusty honey colored sores around his mouth and n |
| 5527 | peds | PC | Bronchiolitis | Viral URI | Viral URI, Nasal Foreign Body, Allergic Rhinitis, Anaphylaxis, Acute Sinusitis | infant with runny nose that turned into fast breathing and w |
| 5528 | peds | ED | Atrial Fibrillation | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Medication side effect, Anxiety | my heart is all over the place beating fast and irregular fe |
| 5530 | geri | PC | Panic Attack | Pulmonary Embolism | Pulmonary Embolism, Primary Spontaneous Pneumothorax, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 5534 | peds | ED | Hypothyroidism | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | im always cold tired and gaining weight even though i barely |
| 5539 | adult | PC | Delirium Tremens | Meningitis | Meningitis, Retinal Detachment, Central Retinal Artery Occlusion, Stroke, Amaurosis Fugax | stopped drinking and now im trembling cant think straight an |
| 5541 | geri | UC | Opioid Overdose | UTI | UTI, Toxic/Metabolic Encephalopathy, Sepsis, Stroke, Hypoglycemia | she took a bunch of pills and now shes barely breathing and  |
| 5544 | adult | UC | Bipolar Disorder — Manic Episode | Needs in-person evaluation | Needs in-person evaluation | i feel amazing like i can do anything havent needed sleep an |
| 5545 | adult | PC | Psychotic Disorder | Medication Overdose | Medication Overdose, Caustic Ingestion, Foreign Body Ingestion, Chemical Exposure, Toxic Alcohol Ingestion | she started talking to people who arent there and thinks som |
| 5546 | adult | ED | Stimulant Intoxication | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Anxiety, Cardiac Arrhythmia, Atrial Fibrillation | he smoked meth and now his heart is racing hes paranoid swea |
| 5550 | peds | UC | Neuroleptic Malignant Syndrome | Meningitis | Meningitis, Viral infection, UTI, Gastroenteritis, Pneumonia | started haldol and now hes rigid as a board with a high feve |
| 5551 | peds | PC | ADEM | Tension headache | Tension headache, Stroke, Migraine, Meningitis, Cluster headache | child developed weakness in legs after a virus plus headache |
| 5553 | peds | UC | Vasovagal Syncope | BPPV | BPPV, Acute Myocardial Infarction, Anxiety, Orthostatic hypotension, Vestibular neuritis | got lightheaded at church felt hot and sweaty then next thin |
| 5554 | adult | PC | Urticaria | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Conjunctivitis, Allergic Reaction, Cellulitis | took a new medicine yesterday and now i got bumps and itchy  |
| 5556 | adult | UC | Iron Deficiency Anemia | BPPV | BPPV, Anxiety, Orthostatic hypotension, Vestibular neuritis, Medication side effect | so tired i can barely function my periods have been super he |
| 5557 | adult | PC | Intimate Partner Violence | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | he punched me in the face again and i think my cheekbone mig |
| 5558 | peds | ED | Sexual Assault | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder | something happened to me last night at a party and i need to |
| 5559 | peds | UC | Erectile Dysfunction | Medication-Induced Sexual Dysfunction | Medication-Induced Sexual Dysfunction, Hypogonadism, Premature Ejaculation, Peyronie Disease, Dyspareunia | been having trouble performing in the bedroom cant keep an e |
| 5560 | geri | PC | Dyspareunia | First Degree Burn | First Degree Burn, Second Degree Burn, Third Degree Burn, Chemical Burn, Sunburn | it hurts every time my husband and i try to have sex like a  |
| 5561 | adult | ED | Chlamydia | Choledocholithiasis | Choledocholithiasis, Viral Hepatitis, Cirrhosis, Pancreatic Cancer, Alcoholic Hepatitis | theres a yellowish drip and it stings to urinate think i mig |
| 5562 | geri | UC | HRT Side Effect — Mood/Psychiatric | DVT | DVT, Cellulitis, Venous Insufficiency, Musculoskeletal Strain, Lymphedema | started estrogen 3 months ago and now i get terrible headach |
| 5563 | adult | PC | Lactation Mastitis | Chlamydia | Chlamydia, Genital Herpes, Trichomoniasis, Gonorrhea, Bacterial Vaginosis | had a clogged duct that turned into my whole breast being re |
| 5564 | peds | ED | Postpartum Depression | Needs in-person evaluation | Needs in-person evaluation | had my baby 6 weeks ago and i cant stop crying i dont feel b |
| 5565 | adult | UC | Colic | Needs in-person evaluation | Needs in-person evaluation | baby cries inconsolably for 3 plus hours pulls legs up turns |
| 5566 | adult | PC | Polypharmacy/Medication Effect | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | ever since they added that new medicine i feel woozy and uns |
| 5567 | adult | ED | Heat Exhaustion | BPPV | BPPV, Acute Myocardial Infarction, Vestibular neuritis, Orthostatic hypotension, Medication side effect | was working outside in the heat all day and now im dizzy nau |
| 5569 | adult | PC | Esophageal Foreign Body | Intimate Partner Violence | Intimate Partner Violence, Sexual Assault, Physical Abuse, Strangulation Injury, Child Abuse / Non-Accidental Trauma | my toddler put a battery in her mouth and i think she swallo |
| 5570 | geri | ED | Acute Urinary Retention | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Appendicitis | i havent been able to pee all day my belly is huge and it fe |
| 5571 | adult | UC | Inguinal Hernia | Needs in-person evaluation | Needs in-person evaluation | got this lump near my privates that comes and goes and aches |
| 5574 | adult | UC | Obstructive Sleep Apnea | Kidney Stone | Kidney Stone, UTI, Prostatitis, Urethritis, Pyelonephritis | my wife says i snore like a freight train and stop breathing |
| 5575 | adult | PC | Malignancy | Seizure | Seizure, New-Onset Epilepsy, Syncope, Alcohol Withdrawal Seizure, Stroke | been losing weight like crazy clothes dont fit anymore and i |
| 5578 | peds | PC | Hypothermia | Viral infection | Viral infection, Sepsis, Acute Otitis Media, Gastroenteritis, Pneumonia | found my grandpa outside in the cold hes shivering confused  |
| 5579 | adult | ED | Laceration/Crush Injury | Fracture | Fracture, Soft Tissue Injury, Hip Fracture, Rib Fracture, Traumatic Brain Injury | fell off a ladder at the construction site landed on my arm  |
| 5582 | peds | ED | Pulmonary Embolism | Viral URI | Viral URI, Bronchitis, Post-Bronchitic cough, Pneumonia, Asthma | i was just sittin there and suddenly couldnt breathe and sta |
| 5585 | geri | ED | Appendicitis | Gastroenteritis | Gastroenteritis, Food Poisoning, Bowel Obstruction, Medication Side Effect, Cyclic Vomiting Syndrome | started around my belly button now the pain moved to the low |
| 5588 | adult | ED | Migraine | Central Retinal Artery Occlusion | Central Retinal Artery Occlusion, Retinal Detachment, Stroke, Amaurosis Fugax, Acute Glaucoma | my head is pounding so bad i cant see straight and lights ma |
| 5592 | peds | UC | COPD Exacerbation | Viral URI | Viral URI, Bronchitis, Post-Bronchitic cough, Asthma, Pneumonia | lungs feel like theyre on fire and i cant stop coughing gree |
| 5593 | geri | PC | Pyelonephritis | Spinal Stenosis | Spinal Stenosis, Musculoskeletal strain, Compression fracture, Cauda Equina Syndrome, Herniated Disc | fever of 103 and pain in my lower back plus burning when i u |
| 5595 | adult | UC | Diabetic Ketoacidosis | Depression | Depression, Electrolyte abnormality, Acute Nephritis, Anemia, Cannabinoid Hyperemesis Syndrome | my sugar was over 500 and i feel terrible im so nauseous and |
| 5597 | peds | ED | Gout | Trauma | Trauma, Cellulitis, Bursitis, Septic Arthritis, Reactive Arthritis | my big toe is swollen red and hurts so bad i cant even put a |
| 5598 | peds | UC | Pharyngitis | Anaphylaxis | Anaphylaxis, Angioedema, ACE Inhibitor Angioedema, Food Allergy (severe), Hereditary Angioedema | sore throat is killing me and my glands are all swollen up |


## Failure Mode Breakdown

| Mode | Count | % of Total |
|---|---|---|
| Dead-end ("Needs in-person") | 25 | 4.2% |
| Viral over-generalization | 28 | 4.7% |
| Wrong diagnosis | 203 | 33.8% |
| API errors | 0 | 0.0% |

### Dead-End Cases

| Expected | CC (truncated) |
|---|---|
| Status Epilepticus (5) | my family member started seizing and its been going on and o |
| Postpartum Depression (5) | had my baby 6 weeks ago and i cant stop crying i dont feel b |
| Colic (5) | baby cries inconsolably for 3 plus hours pulls legs up turns |
| Inguinal Hernia (5) | got this lump near my privates that comes and goes and aches |
| Erectile Dysfunction (2) | things arent working down there like they used to and im too |
| Bipolar Disorder — Manic Episode (2) | i feel amazing like i can do anything havent needed sleep an |
| Urinary Tract Infection (1) | feels like peein razor blades and my pee smells awful |

### Viral Over-Generalization Cases

| Expected | CC (truncated) |
|---|---|
| Thyroid Storm (5) | hyperthyroid and now everything is going haywire fever fast  |
| Hand Foot and Mouth Disease (5) | daycare kid with fever painful mouth sores and a rash on pal |
| Bronchiolitis (5) | infant with runny nose that turned into fast breathing and w |
| Hypothermia (5) | found my grandpa outside in the cold hes shivering confused  |
| Diverticulitis (2) | pain in my lower left belly with fever and i been constipate |
| Pharyngitis (2) | hurts so bad to swallow even water and i got a fever |
| Appendicitis (2) | sharp stabbing pain in my lower right belly and i got a feve |
| Pulmonary Embolism (1) | i was just sittin there and suddenly couldnt breathe and sta |
| COPD Exacerbation (1) | lungs feel like theyre on fire and i cant stop coughing gree |

## Per-Condition Accuracy

| Condition | Hits | Total | Accuracy | Primary Failure Mode |
|---|---|---|---|---|
| Pneumothorax | 0 | 5 | 0% | Musculoskeletal pain |
| Pyloric Stenosis | 0 | 5 | 0% | Gastroenteritis |
| Slipped Capital Femoral Epiphysis | 0 | 5 | 0% | Hip Fracture |
| Intussusception | 0 | 5 | 0% | Viral Illness |
| Placental Abruption | 0 | 5 | 0% | Ectopic Pregnancy |
| Tension Pneumothorax | 0 | 5 | 0% | Generalized Anxiety Disorder |
| Status Epilepticus | 0 | 5 | 0% | Needs in-person evaluation |
| Thyroid Storm | 0 | 5 | 0% | Viral infection |
| Rhabdomyolysis | 0 | 5 | 0% | Stroke |
| Temporal Arteritis | 0 | 5 | 0% | Iron Deficiency Anemia |
| Hand Foot and Mouth Disease | 0 | 5 | 0% | Viral infection |
| Bronchiolitis | 0 | 5 | 0% | Viral URI |
| Atrial Fibrillation | 0 | 5 | 0% | BPPV |
| Panic Attack | 0 | 5 | 0% | Primary Spontaneous Pneumothorax |
| Hypothyroidism | 0 | 5 | 0% | Fracture |
| Psychotic Disorder | 0 | 5 | 0% | Medication Overdose |
| Stimulant Intoxication | 0 | 5 | 0% | Supraventricular Tachycardia |
| ADEM | 0 | 5 | 0% | Tension headache |
| Sexual Assault | 0 | 5 | 0% | Generalized Anxiety Disorder |
| Dyspareunia | 0 | 5 | 0% | First Degree Burn |
| Chlamydia | 0 | 5 | 0% | Choledocholithiasis |
| Postpartum Depression | 0 | 5 | 0% | Needs in-person evaluation |
| Colic | 0 | 5 | 0% | Needs in-person evaluation |
| Polypharmacy/Medication Effect | 0 | 5 | 0% | BPPV |
| Esophageal Foreign Body | 0 | 5 | 0% | Intimate Partner Violence |
| Acute Urinary Retention | 0 | 5 | 0% | Gastroenteritis |
| Inguinal Hernia | 0 | 5 | 0% | Needs in-person evaluation |
| Obstructive Sleep Apnea | 0 | 5 | 0% | UTI |
| Malignancy | 0 | 5 | 0% | Seizure |
| Hypothermia | 0 | 5 | 0% | Viral infection |
| Laceration/Crush Injury | 0 | 5 | 0% | Fracture |
| Pulmonary Embolism | 1 | 6 | 17% | Bronchitis |
| Appendicitis | 1 | 6 | 17% | Gastroenteritis |
| Henoch-Schonlein Purpura | 1 | 5 | 20% | Systemic Lupus Erythematosus |
| Migraine | 2 | 6 | 33% | Acute Angle Closure Glaucoma |
| COPD Exacerbation | 2 | 6 | 33% | Asthma |
| Pyelonephritis | 2 | 6 | 33% | Musculoskeletal strain |
| Pharyngitis | 2 | 6 | 33% | Viral infection |
| Diverticulitis | 2 | 5 | 40% | Viral infection |
| Pancreatitis | 2 | 5 | 40% | Gastroenteritis |
| Cholecystitis | 2 | 5 | 40% | Gastroenteritis |
| Ovarian Torsion | 2 | 5 | 40% | Gastroenteritis |
| Orbital Cellulitis | 2 | 5 | 40% | Conjunctivitis |
| Subdural Hematoma | 2 | 5 | 40% | Concussion |
| Alcohol Withdrawal | 2 | 5 | 40% | Delirium Tremens |
| Erectile Dysfunction | 2 | 5 | 40% | Needs in-person evaluation |
| Gastrointestinal Bleeding | 3 | 5 | 60% | BPPV |
| Epiglottitis | 3 | 5 | 60% | Viral Pharyngitis |
| Mesenteric Ischemia | 3 | 5 | 60% | Gastroenteritis |
| Impetigo | 3 | 5 | 60% | Contact Dermatitis |
| Delirium Tremens | 3 | 5 | 60% | Temporal Arteritis |
| Opioid Overdose | 3 | 5 | 60% | Toxic/Metabolic Encephalopathy |
| Opioid Withdrawal | 3 | 5 | 60% | Fibromyalgia |
| Bipolar Disorder — Manic Episode | 3 | 5 | 60% | Needs in-person evaluation |
| Neuroleptic Malignant Syndrome | 3 | 5 | 60% | Meningitis |
| Vasovagal Syncope | 3 | 5 | 60% | BPPV |
| Urticaria | 3 | 5 | 60% | Viral Exanthem |
| Iron Deficiency Anemia | 3 | 5 | 60% | BPPV |
| Intimate Partner Violence | 3 | 5 | 60% | Generalized Anxiety Disorder |
| HRT Side Effect — Mood/Psychiatric | 3 | 5 | 60% | DVT |
| Lactation Mastitis | 3 | 5 | 60% | Chlamydia |
| Heat Exhaustion | 3 | 5 | 60% | BPPV |
| Urinary Tract Infection | 4 | 6 | 67% | Needs in-person evaluation |
| Nephrolithiasis | 4 | 6 | 67% | Chlamydia |
| Congestive Heart Failure | 4 | 6 | 67% | DVT |
| Deep Vein Thrombosis | 4 | 6 | 67% | Cellulitis |
| Diabetic Ketoacidosis | 4 | 6 | 67% | Depression |
| Sepsis | 4 | 6 | 67% | Atrial Fibrillation |
| Simple Laceration | 4 | 5 | 80% | Fracture |
| Pneumonia | 5 | 6 | 83% | Bronchitis |
| Gout | 5 | 6 | 83% | Trauma |
| Acute Myocardial Infarction | 6 | 6 | 100% | - |
| Stroke | 6 | 6 | 100% | - |
| Asthma | 6 | 6 | 100% | - |
| Gastroenteritis | 6 | 6 | 100% | - |
| Meningitis | 6 | 6 | 100% | - |
| Cellulitis | 6 | 6 | 100% | - |
| Bronchitis | 5 | 5 | 100% | - |
| Upper Respiratory Infection | 5 | 5 | 100% | - |
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
| Peritonsillar Abscess | 5 | 5 | 100% | - |
| Nursemaid Elbow | 5 | 5 | 100% | - |
| Kawasaki Disease | 5 | 5 | 100% | - |
| Addison Crisis | 5 | 5 | 100% | - |
| Corneal Abrasion | 5 | 5 | 100% | - |
| Shingles | 5 | 5 | 100% | - |
| Depression | 5 | 5 | 100% | - |
| Sciatica | 5 | 5 | 100% | - |
| Bowel Obstruction | 5 | 5 | 100% | - |
| Hemorrhoids | 5 | 5 | 100% | - |
| Peripheral Neuropathy | 5 | 5 | 100% | - |
| Plantar Fasciitis | 5 | 5 | 100% | - |
| Carpal Tunnel Syndrome | 5 | 5 | 100% | - |
| Fibromyalgia | 5 | 5 | 100% | - |
| Cannabinoid Hyperemesis Syndrome | 5 | 5 | 100% | - |
| Wernicke Encephalopathy | 5 | 5 | 100% | - |
| Hepatic Encephalopathy | 5 | 5 | 100% | - |
| Serotonin Syndrome | 5 | 5 | 100% | - |
| Dental Abscess | 5 | 5 | 100% | - |
| Dog/Cat Bite | 5 | 5 | 100% | - |
| Second Degree Burn | 5 | 5 | 100% | - |
| Insomnia Disorder | 5 | 5 | 100% | - |
| Fibrocystic Breast Changes | 5 | 5 | 100% | - |
| Irritant Contact Diaper Dermatitis | 5 | 5 | 100% | - |

