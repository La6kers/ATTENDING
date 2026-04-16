# COMPASS Stress Test — 600 API Cases (v13)

**Date:** 2026-04-16T18:33:38.116Z
**Endpoint:** http://localhost:3005/api/diagnose
**Total cases:** 600

## Overall Accuracy

| Metric | Value |
|---|---|
| **Hits (primary or top-5)** | 283 |
| **Misses** | 317 |
| **Errors** | 0 |
| **Accuracy** | **47.2%** |

## By Demographic

| Demo | Hits | Total | Accuracy |
|---|---|---|---|
| adult | 115 | 250 | 46.0% |
| geri | 99 | 200 | 49.5% |
| peds | 69 | 150 | 46.0% |

## By Setting

| Setting | Hits | Total | Accuracy |
|---|---|---|---|
| ED | 91 | 200 | 45.5% |
| UC | 99 | 200 | 49.5% |
| PC | 93 | 200 | 46.5% |

## Latency

| Percentile | ms |
|---|---|
| p50 | 15 |
| p95 | 33 |
| p99 | 43 |

## Top 10 Most-Missed Conditions

| Condition | Misses |
|---|---|
| Pulmonary Embolism | 5 |
| Appendicitis | 5 |
| Pneumothorax | 5 |
| Pancreatitis | 5 |
| Pyloric Stenosis | 5 |
| Epiglottitis | 5 |
| Henoch-Schonlein Purpura | 5 |
| Slipped Capital Femoral Epiphysis | 5 |
| Ovarian Torsion | 5 |
| Placental Abruption | 5 |

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
| 3002 | adult | PC | Pulmonary Embolism | Bronchitis | Bronchitis, Viral URI, ACE inhibitor cough, Pneumonia, COPD exacerbation | i was just sittin there and suddenly couldnt breathe and sta |
| 3003 | adult | ED | Pneumonia | Musculoskeletal pain | Musculoskeletal pain, Post-Bronchitic cough, Sepsis, Costochondritis, Anxiety | chest hurts when i cough and i been runnin a fever of 102 fo |
| 3005 | geri | PC | Appendicitis | Erectile Dysfunction | Erectile Dysfunction, Medication-Induced Sexual Dysfunction, Hypogonadism, Acute Gastroenteritis, Premature Ejaculation | started around my belly button now the pain moved to the low |
| 3009 | adult | ED | Nephrolithiasis | Chlamydia | Chlamydia, Genital Herpes, Gonorrhea, Syphilis, Trichomoniasis | worst pain of my life in my side it comes and goes and i can |
| 3012 | peds | ED | COPD Exacerbation | Asthma | Asthma, Bronchi, Pneumonia, Anxiety, Post-infectious cough | my copd is acting up cant breathe and coughing way more than |
| 3017 | peds | PC | Gout | Plantar Fasciitis | Plantar Fasciitis, Ankle Sprain, Stress Fracture, Morton Neuroma, Peripheral Neuropathy | woke up with the worst pain in my foot its swollen hot and t |
| 3022 | peds | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, GERD, Costochondritis, Pneumonia | sharp chest pain outta nowhere and now i cant take a full br |
| 3027 | geri | ED | Diverticulitis | Viral infection | Viral infection, Pneumonia, UTI, Gastroenteritis, Sepsis | pain in my lower left belly with fever and i been constipate |
| 3028 | geri | UC | Pancreatitis | Gastroenteritis | Gastroenteritis, GERD, Peptic Ulcer, Appendicitis, Diverticulitis | worst belly pain after eating greasy food goes right through |
| 3042 | peds | ED | Pyloric Stenosis | Dyspareunia | Dyspareunia, Female Sexual Arousal Disorder, Medication-Induced Sexual Dysfunction, Acute Gastroenteritis, Medication Induced Vomiting | my 3 week old baby keeps projectile vomiting after every fee |
| 3043 | adult | UC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, GERD, Bone Lesions | sore throat came on fast now my child is leaning forward dro |
| 3044 | geri | PC | Henoch-Schonlein Purpura | Polymyalgia Rheumatica | Polymyalgia Rheumatica, Rheumatoid Arthritis, Reactive Arthritis, Viral Arthritis, Systemic Lupus Erythematosus | my kid has a purple rash on his legs and his belly and joint |
| 3045 | geri | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Septic Arthritis, Femoral Lesion, Hip Osteoarthritis, Anterior or Anterolateral thigh neuropathic pain | my overweight teen has been complaining of hip pain and now  |
| 3047 | adult | PC | Intussusception | Viral Illness | Viral Illness, Sepsis, UTI, Dehydration, Acute Hip and Leg | my infant has episodes of screaming drawing up legs then goi |
| 3048 | geri | ED | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | sudden horrible pain on one side of my pelvis and im throwin |
| 3049 | adult | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Appendicitis | pregnant and my belly got really hard and painful and theres |
| 3050 | peds | PC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder, Substance Use Disorder, Cardiac Arrhythmia | got hit in the chest and now i can barely breathe and feel l |
| 3051 | adult | ED | Status Epilepticus | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Atrophic Vaginitis | my family member started seizing and its been going on and o |
| 3053 | adult | PC | Thyroid Storm | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Bacterial infection, Acute Otitis Media | hyperthyroid and now everything is going haywire fever fast  |
| 3054 | peds | ED | Rhabdomyolysis | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Hypogonadism | worked out way too hard muscles are killing me and my pee is |
| 3056 | adult | PC | Orbital Cellulitis | Conjunctivitis | Conjunctivitis, Corneal Abrasion, Acute Angle Closure Glaucoma, Foreign Body, Uveitis | my eye is swollen shut red and it hurts to move it plus i go |
| 3057 | peds | ED | Temporal Arteritis | Medication-Induced Sexual Dysfunction | Medication-Induced Sexual Dysfunction, Hypogonadism, Premature Ejaculation, Migraine, Peyronie Disease | my temple area is tender and throbbing and i noticed my visi |
| 3058 | adult | UC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Appendicitis, Peptic Ulcer, Pancreatitis | terrible belly pain after eating and ive been losing weight  |
| 3059 | adult | PC | Subdural Hematoma | Meningitis | Meningitis, Substance Intoxication, Toxic/Metabolic Encephalopathy, UTI, Hepatic Encephalopathy | grandpa bumped his head and now hes acting weird and drowsy |
| 3060 | adult | ED | Shingles | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Benzodiazepine Overdose | burning painful rash on one side of my body with little blis |
| 3062 | adult | PC | Impetigo | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Atrophic Vaginitis | my kid has crusty honey colored sores around his mouth and n |
| 3063 | adult | ED | Bronchiolitis | Viral URI | Viral URI, Allergic Rhinitis, Anaphylaxis, Acute Sinusitis, Nasal Foreign Body | infant with runny nose that turned into fast breathing and w |
| 3064 | adult | UC | Atrial Fibrillation | BPPV | BPPV, Anxiety, Orthostatic hypotension, Vestibular neuritis, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 3066 | adult | ED | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 3067 | peds | UC | Sciatica | Musculoskeletal strain | Musculoskeletal strain, Herniated Disc, Compression fracture, Spinal Stenosis, Lumbar Spondylosis | back pain that goes down my leg like an electric shock worse |
| 3069 | peds | ED | Hemorrhoids | Medication-Induced Sexual Dysfunction | Medication-Induced Sexual Dysfunction, Hypogonadism, Premature Ejaculation, Peyronie Disease, Dyspareunia | pain and bleeding when i go to the bathroom theres a lump ne |
| 3070 | geri | UC | Hypothyroidism | Hip Fracture | Hip Fracture, Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | im always cold tired and gaining weight even though i barely |
| 3076 | geri | UC | Alcohol Withdrawal | Delirium Tremens | Delirium Tremens, UTI, Toxic/Metabolic Encephalopathy, Sepsis, Stroke | last drink was 2 days ago and now i got the shakes sweating  |
| 3078 | adult | ED | Opioid Withdrawal | Viral Illness | Viral Illness, Fibromyalgia, Acute Gastroenteritis, Sleep Apnea, Chronic Fatigue Syndrome | ran out of my pain pills 2 days ago and my whole body aches  |
| 3081 | geri | ED | Psychotic Disorder | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Benzodiazepine Overdose, Polypharmacy/Mixed Overdose | she started talking to people who arent there and thinks som |
| 3085 | peds | UC | Serotonin Syndrome | Viral infection | Viral infection, Brachioradial Pruritus, Allergic Contact Dermatitis, Bacterial infection, UTI | doctor increased my ssri and now i got fever muscle twitchin |
| 3086 | peds | PC | Neuroleptic Malignant Syndrome | Meningitis | Meningitis, Viral infection, Acute Otitis Media, Gastroenteritis, Pneumonia | started haldol and now hes rigid as a board with a high feve |
| 3087 | peds | ED | ADEM | Tension headache | Tension headache, Migraine, Stroke, Meningitis, Sinusitis | child developed weakness in legs after a virus plus headache |
| 3089 | adult | PC | Vasovagal Syncope | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Acute Myocardial Infarction, Subset of patients present with Syncope Plus another key symptom | i passed out after getting my blood drawn they said i was on |
| 3092 | geri | PC | Iron Deficiency Anemia | Heart Failure | Heart Failure, Asthma, COPD exacerbation, Pneumonia, Pulmonary Embolism | been dragging for months short of breath going up stairs and |
| 3096 | adult | ED | Dyspareunia | First Degree Burn | First Degree Burn, Second Degree Burn, Third Degree Burn, Chemical Burn, Sunburn | it hurts every time my husband and i try to have sex like a  |
| 3097 | peds | UC | Chlamydia | Choledocholithiasis | Choledocholithiasis, Viral Hepatitis, Cirrhosis, Alcoholic Hepatitis, Cholangitis | theres a yellowish drip and it stings to urinate think i mig |
| 3100 | adult | UC | Postpartum Depression | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Atrophic Vaginitis | had my baby 6 weeks ago and i cant stop crying i dont feel b |
| 3101 | adult | PC | Colic | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | baby cries inconsolably for 3 plus hours pulls legs up turns |
| 3102 | peds | ED | Polypharmacy/Medication Effect | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | my grandpa keeps falling he takes like 12 different medicati |
| 3105 | adult | ED | Esophageal Foreign Body | Opioid Overdose | Opioid Overdose, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Alcohol Intoxication, Stimulant Intoxication | my toddler put a battery in her mouth and i think she swallo |
| 3106 | geri | UC | Acute Urinary Retention | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Appendicitis | i havent been able to pee all day my belly is huge and it fe |
| 3107 | adult | PC | Inguinal Hernia | Needs in-person evaluation | Needs in-person evaluation | got this lump near my privates that comes and goes and aches |
| 3108 | peds | ED | Second Degree Burn | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | spilled boiling water on my arm and theres big blisters and  |
| 3109 | adult | UC | Insomnia Disorder | Fracture | Fracture, Hip Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | tossing and turning all night cant fall asleep or stay aslee |
| 3110 | geri | PC | Obstructive Sleep Apnea | UTI | UTI, Kidney Stone, Prostatitis, Urethritis, Pyelonephritis | my wife says i snore like a freight train and stop breathing |
| 3111 | adult | ED | Malignancy | Seizure | Seizure, Alcohol Withdrawal Seizure, New-Onset Epilepsy, Syncope, Stroke | been losing weight like crazy clothes dont fit anymore and i |
| 3112 | peds | UC | Fibrocystic Breast Changes | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Benzodiazepine Overdose | found a lump in my breast and im freaking out its tender and |
| 3113 | adult | PC | Irritant Contact Diaper Dermatitis | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | diaper rash is getting worse the whole area is red with litt |
| 3114 | peds | ED | Hypothermia | Viral infection | Viral infection, Sepsis, Acute Otitis Media, Gastroenteritis, Pneumonia | found my grandpa outside in the cold hes shivering confused  |
| 3115 | geri | UC | Laceration/Crush Injury | Fracture | Fracture, Hip Fracture, Traumatic Brain Injury, Soft Tissue Injury, Rib Fracture | fell off a ladder at the construction site landed on my arm  |
| 3121 | geri | UC | Appendicitis | Kidney Stone | Kidney Stone, Pyelonephritis, UTI, Musculoskeletal Strain, Abdominal Aortic Aneurysm | my right side is killing me i cant even stand up straight |
| 3124 | geri | UC | Migraine | Corneal Abrasion | Corneal Abrasion, Subarachnoid Hemorrhage, Conjunctivitis, Foreign Body, Acute Angle Closure Glaucoma | throbbing pain behind my eye and i feel like ima throw up fr |
| 3126 | peds | ED | Congestive Heart Failure | DVT | DVT, Cellulitis, Musculoskeletal Strain, Venous Insufficiency, Baker's Cyst Rupture | keep waking up at night gasping for air and my legs are swol |
| 3127 | adult | UC | Deep Vein Thrombosis | Cellulitis | Cellulitis, Abscess, Contact Dermatitis, Orbital Cellulitis, Erysipelas | one leg is way bigger than the other and its warm and tender |
| 3129 | geri | ED | Pyelonephritis | Spinal Stenosis | Spinal Stenosis, Musculoskeletal strain, Compression fracture, Sepsis, Herniated Disc | hurts to pee and now my back is killing me and i got a high  |
| 3132 | adult | ED | Sepsis | Supraventricular Tachycardia | Supraventricular Tachycardia, Cardiac Arrhythmia, Atrial Fibrillation, Panic Disorder, Anxiety | infection got real bad now im lightheaded heart pounding fev |
| 3134 | adult | PC | Pharyngitis | Viral infection | Viral infection, Pneumonia, UTI, Gastroenteritis, Bacterial infection | hurts so bad to swallow even water and i got a fever |
| 3138 | adult | ED | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Acute Coronary Syndrome, GERD, Pneumonia | sharp chest pain outta nowhere and now i cant take a full br |
| 3143 | adult | PC | Diverticulitis | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Peptic Ulcer, Pancreatitis | belly pain on the lower left that gets worse and i dont wann |
| 3144 | adult | ED | Pancreatitis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | pain in my upper belly going straight through to my back and |
| 3145 | peds | UC | Cholecystitis | Gastroenteritis | Gastroenteritis, GERD, Appendicitis, Peptic Ulcer, Epigastric Pain | right upper belly pain that goes to my shoulder and i feel s |
| 3150 | adult | ED | Gastrointestinal Bleeding | BPPV | BPPV, Vestibular neuritis, Orthostatic hypotension, Anxiety, Medication side effect | been pooping black tar looking stuff and feel lightheaded |
| 3158 | peds | PC | Pyloric Stenosis | Dyspareunia | Dyspareunia, Female Sexual Arousal Disorder, Medication-Induced Sexual Dysfunction, Acute Gastroenteritis, Medication Induced Vomiting | my 3 week old baby keeps projectile vomiting after every fee |
| 3159 | adult | ED | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, Peritonsillar Abscess, GERD | sore throat came on fast now my child is leaning forward dro |
| 3160 | adult | UC | Henoch-Schonlein Purpura | Systemic Lupus Erythematosus | Systemic Lupus Erythematosus, Rheumatoid Arthritis, Fibromyalgia, Mixed Connective Tissue Disease, Sjogren Syndrome | my kid has a purple rash on his legs and his belly and joint |
| 3161 | peds | PC | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Anterior or Anterolateral thigh neuropathic pain, Labral Tear | my overweight teen has been complaining of hip pain and now  |
| 3163 | adult | UC | Intussusception | Viral Illness | Viral Illness, Sepsis, UTI, Dehydration, Acute Hip and Leg | my infant has episodes of screaming drawing up legs then goi |
| 3164 | adult | PC | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | sudden horrible pain on one side of my pelvis and im throwin |
| 3165 | geri | ED | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Diverticulitis | pregnant and my belly got really hard and painful and theres |
| 3166 | adult | UC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder, Substance Use Disorder, Cardiac Arrhythmia | got hit in the chest and now i can barely breathe and feel l |
| 3167 | geri | PC | Status Epilepticus | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | my family member started seizing and its been going on and o |
| 3169 | geri | UC | Thyroid Storm | Viral infection | Viral infection, Pneumonia, UTI, Gastroenteritis, Sepsis | hyperthyroid and now everything is going haywire fever fast  |
| 3170 | geri | PC | Rhabdomyolysis | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Atrophic Vaginitis, Vaginismus | worked out way too hard muscles are killing me and my pee is |
| 3173 | adult | PC | Temporal Arteritis | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Atrophic Vaginitis, Vaginismus | my temple area is tender and throbbing and i noticed my visi |
| 3175 | geri | UC | Subdural Hematoma | Meningitis | Meningitis, UTI, Toxic/Metabolic Encephalopathy, Sepsis, Stroke | grandpa bumped his head and now hes acting weird and drowsy |
| 3176 | peds | PC | Shingles | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Benzodiazepine Overdose | burning painful rash on one side of my body with little blis |
| 3177 | geri | ED | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Sepsis, Bacterial infection | daycare kid with fever painful mouth sores and a rash on pal |
| 3178 | adult | UC | Impetigo | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | my kid has crusty honey colored sores around his mouth and n |
| 3179 | adult | PC | Bronchiolitis | Viral URI | Viral URI, Anaphylaxis, Allergic Rhinitis, Acute Sinusitis, Epistaxis | infant with runny nose that turned into fast breathing and w |
| 3180 | peds | ED | Atrial Fibrillation | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 3182 | geri | PC | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 3183 | peds | ED | Sciatica | Musculoskeletal strain | Musculoskeletal strain, Herniated Disc, Spinal Stenosis, Kidney Stone, Lumbar Spondylosis | back pain that goes down my leg like an electric shock worse |
| 3185 | peds | PC | Hemorrhoids | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Hypogonadism | pain and bleeding when i go to the bathroom theres a lump ne |
| 3186 | adult | ED | Hypothyroidism | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | im always cold tired and gaining weight even though i barely |
| 3191 | adult | PC | Delirium Tremens | Meningitis | Meningitis, Retinal Detachment, Optic Neuritis, Central Retinal Artery Occlusion, Temporal Arteritis | stopped drinking and now im trembling cant think straight an |
| 3193 | geri | UC | Opioid Overdose | Delirium Tremens | Delirium Tremens, Toxic/Metabolic Encephalopathy, Substance Intoxication, Sepsis, Hepatic Encephalopathy | she took a bunch of pills and now shes barely breathing and  |
| 3194 | adult | PC | Opioid Withdrawal | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Bacterial infection, Acute Otitis Media | stopped using heroin and now i got chills body aches diarrhe |
| 3196 | adult | UC | Bipolar Disorder — Manic Episode | Erectile Dysfunction | Erectile Dysfunction, Medication-Induced Sexual Dysfunction, Hypogonadism, Premature Ejaculation, Peyronie Disease | i feel amazing like i can do anything havent needed sleep an |
| 3197 | peds | PC | Psychotic Disorder | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Polypharmacy/Mixed Overdose, Benzodiazepine Overdose | she started talking to people who arent there and thinks som |
| 3198 | adult | ED | Stimulant Intoxication | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Atrial Fibrillation, Cardiac Arrhythmia, Anxiety | he smoked meth and now his heart is racing hes paranoid swea |
| 3201 | peds | ED | Serotonin Syndrome | Viral infection | Viral infection, Brachioradial Pruritus, Allergic Contact Dermatitis, Bacterial infection, UTI | doctor increased my ssri and now i got fever muscle twitchin |
| 3203 | peds | PC | ADEM | Tension headache | Tension headache, Stroke, Migraine, Meningitis, Cluster headache | child developed weakness in legs after a virus plus headache |
| 3204 | adult | ED | Dental Abscess | Viral infection | Viral infection, UTI, Pneumonia, Gastroenteritis, Bacterial infection | my tooth is killing me and my whole jaw is swollen up and i  |
| 3205 | adult | UC | Vasovagal Syncope | BPPV | BPPV, Acute Myocardial Infarction, Anxiety, Vestibular neuritis, Orthostatic hypotension | got lightheaded at church felt hot and sweaty then next thin |
| 3206 | geri | PC | Urticaria | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | took a new medicine yesterday and now i got bumps and itchy  |
| 3208 | adult | UC | Iron Deficiency Anemia | BPPV | BPPV, Anxiety, Vestibular neuritis, Orthostatic hypotension, Medication side effect | so tired i can barely function my periods have been super he |
| 3209 | adult | PC | Intimate Partner Violence | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Atrophic Vaginitis, Vaginismus | he punched me in the face again and i think my cheekbone mig |
| 3212 | peds | PC | Dyspareunia | First Degree Burn | First Degree Burn, Second Degree Burn, Third Degree Burn, Chemical Burn, Sunburn | it hurts every time my husband and i try to have sex like a  |
| 3213 | geri | ED | Chlamydia | Choledocholithiasis | Choledocholithiasis, Pancreatic Cancer, Viral Hepatitis, Cirrhosis, Cholangitis | theres a yellowish drip and it stings to urinate think i mig |
| 3214 | adult | UC | HRT Side Effect — Mood/Psychiatric | DVT | DVT, Cellulitis, Venous Insufficiency, Musculoskeletal Strain, Lymphedema | started estrogen 3 months ago and now i get terrible headach |
| 3215 | peds | PC | Lactation Mastitis | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Trichomoniasis, Bacterial Vaginosis | had a clogged duct that turned into my whole breast being re |
| 3216 | adult | ED | Postpartum Depression | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Atrophic Vaginitis | had my baby 6 weeks ago and i cant stop crying i dont feel b |
| 3217 | peds | UC | Colic | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Hypogonadism | baby cries inconsolably for 3 plus hours pulls legs up turns |
| 3218 | adult | PC | Polypharmacy/Medication Effect | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | ever since they added that new medicine i feel woozy and uns |
| 3219 | geri | ED | Heat Exhaustion | Orthostatic hypotension | Orthostatic hypotension, BPPV, Acute Myocardial Infarction, Medication side effect, Vestibular neuritis | was working outside in the heat all day and now im dizzy nau |
| 3221 | geri | PC | Esophageal Foreign Body | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Benzodiazepine Overdose | my toddler put a battery in her mouth and i think she swallo |
| 3222 | peds | ED | Acute Urinary Retention | Gastroenteritis | Gastroenteritis, GERD, Appendicitis, Peptic Ulcer, Pancreatitis | i havent been able to pee all day my belly is huge and it fe |
| 3223 | peds | UC | Inguinal Hernia | Needs in-person evaluation | Needs in-person evaluation | got this lump near my privates that comes and goes and aches |
| 3224 | geri | PC | Second Degree Burn | Fracture | Fracture, Hip Fracture, Traumatic Brain Injury, Soft Tissue Injury, Rib Fracture | spilled boiling water on my arm and theres big blisters and  |
| 3225 | adult | ED | Insomnia Disorder | Fracture | Fracture, Hip Fracture, Traumatic Brain Injury, Soft Tissue Injury, Rib Fracture | tossing and turning all night cant fall asleep or stay aslee |
| 3226 | geri | UC | Obstructive Sleep Apnea | UTI | UTI, Kidney Stone, Prostatitis, Urethritis, Pyelonephritis | my wife says i snore like a freight train and stop breathing |
| 3227 | geri | PC | Malignancy | Seizure | Seizure, New-Onset Epilepsy, Syncope, Stroke, Hypoglycemia | been losing weight like crazy clothes dont fit anymore and i |
| 3228 | adult | ED | Fibrocystic Breast Changes | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Stimulant Intoxication, Acetaminophen Overdose | found a lump in my breast and im freaking out its tender and |
| 3229 | adult | UC | Irritant Contact Diaper Dermatitis | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Atrophic Vaginitis | diaper rash is getting worse the whole area is red with litt |
| 3230 | geri | PC | Hypothermia | Viral infection | Viral infection, Sepsis, Pneumonia, UTI, Gastroenteritis | found my grandpa outside in the cold hes shivering confused  |
| 3231 | adult | ED | Laceration/Crush Injury | Fracture | Fracture, Hip Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | fell off a ladder at the construction site landed on my arm  |
| 3234 | adult | ED | Pulmonary Embolism | COPD exacerbation | COPD exacerbation, Asthma, Pneumonia, Viral URI | feel like im suffocating and theres this stabbing pain on th |
| 3235 | adult | UC | Pneumonia | Bronchitis | Bronchitis, ACE inhibitor cough, Viral URI, Sepsis, Asthma | been coughing up green stuff for a week and got the chills r |
| 3236 | geri | PC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | feels like peein razor blades and my pee smells awful |
| 3240 | adult | ED | Migraine | Optic Neuritis | Optic Neuritis, Central Retinal Artery Occlusion, Temporal Arteritis, Retinal Detachment, Stroke | my head is pounding so bad i cant see straight and lights ma |
| 3241 | adult | UC | Nephrolithiasis | Opioid Overdose | Opioid Overdose, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Alcohol Intoxication, Stimulant Intoxication | pain in my back going down to my groin and theres blood when |
| 3242 | adult | PC | Congestive Heart Failure | Asthma | Asthma, Pneumonia, Pulmonary Embolism, Anxiety, Pneumothorax | gained like 10 pounds in a week all water weight and cant ca |
| 3244 | adult | UC | COPD Exacerbation | Bronchitis | Bronchitis, Viral URI, ACE inhibitor cough, Pneumonia, Asthma | lungs feel like theyre on fire and i cant stop coughing gree |
| 3245 | peds | PC | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Cauda Equina Syndrome, Herniated Disc, Spinal Stenosis, Kidney Stone | fever of 103 and pain in my lower back plus burning when i u |
| 3247 | adult | UC | Diabetic Ketoacidosis | Depression | Depression, Electrolyte abnormality, Stroke, Acute Nephritis, Anemia | my sugar was over 500 and i feel terrible im so nauseous and |
| 3248 | peds | PC | Sepsis | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Cardiac Arrhythmia, Anxiety, Meningitis | had a cut that got infected now i feel terrible fever racing |
| 3254 | adult | PC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Acute Coronary Syndrome, GERD, Costochondritis | sharp chest pain outta nowhere and now i cant take a full br |
| 3260 | geri | PC | Pancreatitis | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Bowel obstruction, Ectopic Pregnancy | upper stomach pain that gets worse after i eat and im puking |
| 3261 | peds | ED | Cholecystitis | Acute Nephritis | Acute Nephritis, See Vomiting in Pregnancy, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Medication induced | pain under my right ribs especially after eating and im naus |
| 3272 | peds | PC | Peritonsillar Abscess | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, GERD, Epiglottitis | cant swallow at all one side of my throat is huge and i soun |
| 3274 | peds | UC | Pyloric Stenosis | Medication-Induced Sexual Dysfunction | Medication-Induced Sexual Dysfunction, Hypogonadism, Acute Gastroenteritis, Premature Ejaculation, Medication Induced Vomiting | my 3 week old baby keeps projectile vomiting after every fee |
| 3275 | adult | PC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, GERD, Bone Lesions | sore throat came on fast now my child is leaning forward dro |
| 3276 | adult | ED | Henoch-Schonlein Purpura | Rheumatoid Arthritis | Rheumatoid Arthritis, Reactive Arthritis, Viral Arthritis, Systemic Lupus Erythematosus, Fibromyalgia | my kid has a purple rash on his legs and his belly and joint |
| 3277 | geri | UC | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Septic Arthritis, Hip Osteoarthritis, Femoral Lesion, Trochanteric Bursitis | my overweight teen has been complaining of hip pain and now  |
| 3280 | adult | UC | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | sudden horrible pain on one side of my pelvis and im throwin |
| 3281 | peds | PC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Appendicitis, Cholecystitis | pregnant and my belly got really hard and painful and theres |
| 3282 | geri | ED | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Major Depressive Disorder, Panic Disorder, Cardiac Arrhythmia, Substance Use Disorder | got hit in the chest and now i can barely breathe and feel l |
| 3283 | geri | UC | Status Epilepticus | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Atrophic Vaginitis, Vaginismus | my family member started seizing and its been going on and o |
| 3285 | adult | ED | Thyroid Storm | Viral infection | Viral infection, UTI, Pneumonia, Gastroenteritis, Bacterial infection | hyperthyroid and now everything is going haywire fever fast  |
| 3286 | peds | UC | Rhabdomyolysis | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Hypogonadism | worked out way too hard muscles are killing me and my pee is |
| 3288 | adult | ED | Orbital Cellulitis | Corneal Abrasion | Corneal Abrasion, Conjunctivitis, Foreign Body, Uveitis, Acute Angle Closure Glaucoma | my eye is swollen shut red and it hurts to move it plus i go |
| 3289 | geri | UC | Temporal Arteritis | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Atrophic Vaginitis, Female Sexual Arousal Disorder, Hypogonadism | my temple area is tender and throbbing and i noticed my visi |
| 3290 | geri | PC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Diverticulitis, Peptic Ulcer | terrible belly pain after eating and ive been losing weight  |
| 3291 | peds | ED | Subdural Hematoma | Meningitis | Meningitis, Substance Intoxication, Delirium Tremens, Toxic/Metabolic Encephalopathy, Hepatic Encephalopathy | grandpa bumped his head and now hes acting weird and drowsy |
| 3292 | geri | UC | Shingles | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Benzodiazepine Overdose | burning painful rash on one side of my body with little blis |
| 3293 | peds | PC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Acute Otitis Media, UTI, Gastroenteritis, Pneumonia | daycare kid with fever painful mouth sores and a rash on pal |
| 3294 | peds | ED | Impetigo | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Hypogonadism | my kid has crusty honey colored sores around his mouth and n |
| 3295 | peds | UC | Bronchiolitis | Viral URI | Viral URI, Nasal Foreign Body, Allergic Rhinitis, Anaphylaxis, Acute Sinusitis | infant with runny nose that turned into fast breathing and w |
| 3296 | adult | PC | Atrial Fibrillation | BPPV | BPPV, Anxiety, Vestibular neuritis, Orthostatic hypotension, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 3298 | geri | UC | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 3299 | peds | PC | Sciatica | Musculoskeletal strain | Musculoskeletal strain, Herniated Disc, Spinal Stenosis, Kidney Stone, Lumbar Spondylosis | back pain that goes down my leg like an electric shock worse |
| 3301 | geri | UC | Hemorrhoids | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Atrophic Vaginitis, Female Sexual Arousal Disorder, Hypogonadism | pain and bleeding when i go to the bathroom theres a lump ne |
| 3302 | geri | PC | Hypothyroidism | Hip Fracture | Hip Fracture, Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | im always cold tired and gaining weight even though i barely |
| 3308 | peds | PC | Alcohol Withdrawal | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Anxiety, Cardiac Arrhythmia, Atrial Flutter | trying to detox from alcohol at home and im shaking anxious  |
| 3313 | adult | UC | Psychotic Disorder | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Polypharmacy/Mixed Overdose, Benzodiazepine Overdose | she started talking to people who arent there and thinks som |
| 3314 | geri | PC | Stimulant Intoxication | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, Acute Coronary Syndrome, GERD | she used cocaine and now shes agitated chest pain and her pu |
| 3317 | peds | PC | Serotonin Syndrome | Viral infection | Viral infection, Brachioradial Pruritus, Allergic Contact Dermatitis, Bacterial infection, UTI | doctor increased my ssri and now i got fever muscle twitchin |
| 3319 | adult | UC | ADEM | Tension headache | Tension headache, Migraine, Stroke, Meningitis, Sinusitis | child developed weakness in legs after a virus plus headache |
| 3322 | geri | UC | Urticaria | Anaphylaxis | Anaphylaxis, Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Acetaminophen Overdose | broke out in hives all over my body after dinner and theyre  |
| 3323 | adult | PC | Simple Laceration | Hip Fracture | Hip Fracture, Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | my kid fell on the playground and split his chin open its ga |
| 3328 | geri | UC | Dyspareunia | First Degree Burn | First Degree Burn, Second Degree Burn, Third Degree Burn, Chemical Burn, Sunburn | it hurts every time my husband and i try to have sex like a  |
| 3329 | geri | PC | Chlamydia | Pancreatic Cancer | Pancreatic Cancer, Cirrhosis, Choledocholithiasis, Viral Hepatitis, Alcoholic Hepatitis | theres a yellowish drip and it stings to urinate think i mig |
| 3330 | adult | ED | HRT Side Effect — Mood/Psychiatric | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Polypharmacy/Mixed Overdose, Benzodiazepine Overdose | im on testosterone shots and having crazy mood swings and my |
| 3332 | adult | PC | Postpartum Depression | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Atrophic Vaginitis | had my baby 6 weeks ago and i cant stop crying i dont feel b |
| 3333 | adult | ED | Colic | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | baby cries inconsolably for 3 plus hours pulls legs up turns |
| 3334 | geri | UC | Polypharmacy/Medication Effect | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Benzodiazepine Overdose | keep losing my balance fell three times this week and im on  |
| 3337 | geri | UC | Esophageal Foreign Body | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Benzodiazepine Overdose, Polypharmacy/Mixed Overdose | my toddler put a battery in her mouth and i think she swallo |
| 3338 | adult | PC | Acute Urinary Retention | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Pancreatitis | i havent been able to pee all day my belly is huge and it fe |
| 3339 | geri | ED | Inguinal Hernia | Needs in-person evaluation | Needs in-person evaluation | got this lump near my privates that comes and goes and aches |
| 3340 | peds | UC | Second Degree Burn | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | spilled boiling water on my arm and theres big blisters and  |
| 3341 | geri | PC | Insomnia Disorder | Hip Fracture | Hip Fracture, Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | tossing and turning all night cant fall asleep or stay aslee |
| 3342 | peds | ED | Obstructive Sleep Apnea | UTI | UTI, Kidney Stone, Prostatitis, Urethritis, Pyelonephritis | my wife says i snore like a freight train and stop breathing |
| 3343 | peds | UC | Malignancy | Seizure | Seizure, New-Onset Epilepsy, Alcohol Withdrawal Seizure, Syncope, Febrile Seizure | been losing weight like crazy clothes dont fit anymore and i |
| 3344 | adult | PC | Fibrocystic Breast Changes | Opioid Overdose | Opioid Overdose, Polypharmacy/Mixed Overdose, Alcohol Intoxication, Acetaminophen Overdose, Stimulant Intoxication | found a lump in my breast and im freaking out its tender and |
| 3345 | geri | ED | Irritant Contact Diaper Dermatitis | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | diaper rash is getting worse the whole area is red with litt |
| 3346 | adult | UC | Hypothermia | Viral infection | Viral infection, Sepsis, Pneumonia, UTI, Gastroenteritis | found my grandpa outside in the cold hes shivering confused  |
| 3347 | adult | PC | Laceration/Crush Injury | Fracture | Fracture, Soft Tissue Injury, Rib Fracture, Traumatic Brain Injury, Concussion | fell off a ladder at the construction site landed on my arm  |
| 3350 | geri | PC | Pulmonary Embolism | Musculoskeletal pain | Musculoskeletal pain, Acute Coronary Syndrome, Acute Myocardial Infarction, Pneumonia, GERD | cant catch my breath outta nowhere and my chest hurts when i |
| 3351 | peds | ED | Pneumonia | Viral URI | Viral URI, Bronchitis, Post-Bronchitic cough, Sepsis, Asthma | my cough wont quit and i got a fever and everything aches |
| 3352 | geri | UC | Urinary Tract Infection | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Benzodiazepine Overdose, Polypharmacy/Mixed Overdose | it hurts so bad to pee and theres blood in it |
| 3353 | geri | PC | Appendicitis | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Sepsis, Bacterial infection | sharp stabbing pain in my lower right belly and i got a feve |
| 3357 | adult | ED | Nephrolithiasis | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Syphilis, Trichomoniasis | worst pain of my life in my side it comes and goes and i can |
| 3358 | adult | UC | Congestive Heart Failure | Asthma | Asthma, Pulmonary Embolism, Anxiety, Pneumonia, Anemia | so short of breath climbing stairs and my feet look like bal |
| 3360 | peds | ED | COPD Exacerbation | Asthma | Asthma, Bronchi, Pneumonia, Post-infectious cough, Pulmonary Embolism | my copd is acting up cant breathe and coughing way more than |
| 3370 | geri | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, Acute Coronary Syndrome, GERD | sharp chest pain outta nowhere and now i cant take a full br |
| 3375 | geri | ED | Diverticulitis | Viral infection | Viral infection, Pneumonia, UTI, Gastroenteritis, Sepsis | pain in my lower left belly with fever and i been constipate |
| 3376 | adult | UC | Pancreatitis | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Appendicitis | worst belly pain after eating greasy food goes right through |
| 3382 | geri | UC | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | theres blood in my stool bright red and i feel dizzy |
| 3390 | geri | ED | Pyloric Stenosis | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Peyronie Disease, Acute Gastroenteritis | my 3 week old baby keeps projectile vomiting after every fee |
| 3391 | peds | UC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, Peritonsillar Abscess, Bone Lesions | sore throat came on fast now my child is leaning forward dro |
| 3392 | geri | PC | Henoch-Schonlein Purpura | Polymyalgia Rheumatica | Polymyalgia Rheumatica, Rheumatoid Arthritis, Reactive Arthritis, Viral Arthritis, Systemic Lupus Erythematosus | my kid has a purple rash on his legs and his belly and joint |
| 3393 | peds | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Labral Tear, Anterior or Anterolateral thigh neuropathic pain | my overweight teen has been complaining of hip pain and now  |
| 3395 | adult | PC | Intussusception | Viral Illness | Viral Illness, Sepsis, Dehydration, Acute Hip and Leg, Hand Foot and Mouth Disease | my infant has episodes of screaming drawing up legs then goi |
| 3396 | peds | ED | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | sudden horrible pain on one side of my pelvis and im throwin |
| 3397 | adult | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Cholecystitis, Appendicitis | pregnant and my belly got really hard and painful and theres |
| 3398 | geri | PC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Major Depressive Disorder, Panic Disorder, Cardiac Arrhythmia, Substance Use Disorder | got hit in the chest and now i can barely breathe and feel l |
| 3399 | adult | ED | Status Epilepticus | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Atrophic Vaginitis, Vaginismus | my family member started seizing and its been going on and o |
| 3401 | peds | PC | Thyroid Storm | Viral infection | Viral infection, Gastroenteritis, Pneumonia, Acute Otitis Media, Bacterial infection | hyperthyroid and now everything is going haywire fever fast  |
| 3402 | adult | ED | Rhabdomyolysis | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | worked out way too hard muscles are killing me and my pee is |
| 3405 | adult | ED | Temporal Arteritis | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Migraine | my temple area is tender and throbbing and i noticed my visi |
| 3407 | adult | PC | Subdural Hematoma | Meningitis | Meningitis, Substance Intoxication, Toxic/Metabolic Encephalopathy, UTI, Hypoglycemia | grandpa bumped his head and now hes acting weird and drowsy |
| 3408 | adult | ED | Shingles | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Stimulant Intoxication, Acetaminophen Overdose | burning painful rash on one side of my body with little blis |
| 3409 | adult | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Bacterial infection, Acute Otitis Media | daycare kid with fever painful mouth sores and a rash on pal |
| 3410 | peds | PC | Impetigo | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Hypogonadism | my kid has crusty honey colored sores around his mouth and n |
| 3411 | geri | ED | Bronchiolitis | Viral URI | Viral URI, Anaphylaxis, Allergic Rhinitis, Acute Sinusitis, Epistaxis | infant with runny nose that turned into fast breathing and w |
| 3414 | adult | ED | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 3415 | peds | UC | Sciatica | Musculoskeletal strain | Musculoskeletal strain, Herniated Disc, Spinal Stenosis, Kidney Stone, Lumbar Spondylosis | back pain that goes down my leg like an electric shock worse |
| 3417 | adult | ED | Hemorrhoids | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | pain and bleeding when i go to the bathroom theres a lump ne |
| 3418 | peds | UC | Hypothyroidism | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | im always cold tired and gaining weight even though i barely |
| 3424 | peds | UC | Alcohol Withdrawal | Delirium Tremens | Delirium Tremens, Substance Intoxication, Toxic/Metabolic Encephalopathy, Hepatic Encephalopathy, Sepsis | last drink was 2 days ago and now i got the shakes sweating  |
| 3426 | geri | ED | Opioid Withdrawal | Fibromyalgia | Fibromyalgia, Polymyalgia Rheumatica, Chronic Fatigue Syndrome, Hypothyroidism, Viral Illness | ran out of my pain pills 2 days ago and my whole body aches  |
| 3429 | peds | ED | Psychotic Disorder | Opioid Overdose | Opioid Overdose, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Alcohol Intoxication, Stimulant Intoxication | she started talking to people who arent there and thinks som |
| 3430 | adult | UC | Stimulant Intoxication | Anxiety | Anxiety, Supraventricular Tachycardia, Panic Disorder, Cardiac Arrhythmia, Hyperthyroidism | took too much adderall and my heart is pounding im shaking a |
| 3433 | geri | UC | Serotonin Syndrome | Viral infection | Viral infection, Brachioradial Pruritus, Pneumonia, Allergic Contact Dermatitis, Bacterial infection | doctor increased my ssri and now i got fever muscle twitchin |
| 3435 | geri | ED | ADEM | Tension headache | Tension headache, Stroke, Meningitis, Cluster headache, Migraine | child developed weakness in legs after a virus plus headache |
| 3437 | adult | PC | Vasovagal Syncope | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Acute Myocardial Infarction, Subset of patients present with Syncope Plus another key symptom | i passed out after getting my blood drawn they said i was on |
| 3440 | geri | PC | Iron Deficiency Anemia | COPD exacerbation | COPD exacerbation, Heart Failure, Asthma, Pneumonia, Pulmonary Embolism | been dragging for months short of breath going up stairs and |
| 3444 | adult | ED | Dyspareunia | First Degree Burn | First Degree Burn, Second Degree Burn, Third Degree Burn, Chemical Burn, Sunburn | it hurts every time my husband and i try to have sex like a  |
| 3445 | peds | UC | Chlamydia | Choledocholithiasis | Choledocholithiasis, Viral Hepatitis, Cirrhosis, Alcoholic Hepatitis, Cholangitis | theres a yellowish drip and it stings to urinate think i mig |
| 3448 | geri | UC | Postpartum Depression | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Atrophic Vaginitis, Vaginismus | had my baby 6 weeks ago and i cant stop crying i dont feel b |
| 3449 | peds | PC | Colic | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Hypogonadism | baby cries inconsolably for 3 plus hours pulls legs up turns |
| 3450 | peds | ED | Polypharmacy/Medication Effect | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | my grandpa keeps falling he takes like 12 different medicati |
| 3453 | adult | ED | Esophageal Foreign Body | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Stimulant Intoxication, Acetaminophen Overdose | my toddler put a battery in her mouth and i think she swallo |
| 3454 | geri | UC | Acute Urinary Retention | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Appendicitis | i havent been able to pee all day my belly is huge and it fe |
| 3455 | geri | PC | Inguinal Hernia | Needs in-person evaluation | Needs in-person evaluation | got this lump near my privates that comes and goes and aches |
| 3456 | geri | ED | Second Degree Burn | Hip Fracture | Hip Fracture, Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | spilled boiling water on my arm and theres big blisters and  |
| 3457 | geri | UC | Insomnia Disorder | Fracture | Fracture, Hip Fracture, Traumatic Brain Injury, Soft Tissue Injury, Rib Fracture | tossing and turning all night cant fall asleep or stay aslee |
| 3458 | adult | PC | Obstructive Sleep Apnea | Kidney Stone | Kidney Stone, UTI, Prostatitis, Urethritis, Pyelonephritis | my wife says i snore like a freight train and stop breathing |
| 3459 | adult | ED | Malignancy | Seizure | Seizure, New-Onset Epilepsy, Syncope, Alcohol Withdrawal Seizure, Stroke | been losing weight like crazy clothes dont fit anymore and i |
| 3460 | peds | UC | Fibrocystic Breast Changes | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Benzodiazepine Overdose | found a lump in my breast and im freaking out its tender and |
| 3461 | geri | PC | Irritant Contact Diaper Dermatitis | Erectile Dysfunction | Erectile Dysfunction, Medication-Induced Sexual Dysfunction, Hypogonadism, Premature Ejaculation, Peyronie Disease | diaper rash is getting worse the whole area is red with litt |
| 3462 | adult | ED | Hypothermia | Viral infection | Viral infection, Sepsis, Pneumonia, UTI, Gastroenteritis | found my grandpa outside in the cold hes shivering confused  |
| 3463 | adult | UC | Laceration/Crush Injury | Fracture | Fracture, Hip Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | fell off a ladder at the construction site landed on my arm  |
| 3466 | geri | UC | Pulmonary Embolism | Atrial Fibrillation | Atrial Fibrillation, Cardiac Arrhythmia, Supraventricular Tachycardia, Panic Disorder, Anxiety | sharp pain in my chest every time i take a breath and my hea |
| 3468 | geri | ED | Urinary Tract Infection | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Syphilis, Trichomoniasis | i keep runnin to the bathroom but barely anything comes out  |
| 3469 | geri | UC | Appendicitis | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | pain in my stomach moved down to the right side and bumps in |
| 3472 | adult | UC | Migraine | Corneal Abrasion | Corneal Abrasion, Subarachnoid Hemorrhage, Conjunctivitis, Foreign Body, Acute Angle Closure Glaucoma | throbbing pain behind my eye and i feel like ima throw up fr |
| 3474 | adult | ED | Congestive Heart Failure | Seizure | Seizure, Alcohol Withdrawal Seizure, New-Onset Epilepsy, Syncope, Stroke | cant walk to the mailbox without stopping to rest and my sho |
| 3475 | geri | UC | Deep Vein Thrombosis | Cellulitis | Cellulitis, Abscess, Contact Dermatitis, Erysipelas, Orbital Cellulitis | one leg is way bigger than the other and its warm and tender |
| 3477 | geri | ED | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Spinal Stenosis, Sepsis, Herniated Disc, Compression fracture | hurts to pee and now my back is killing me and i got a high  |
| 3480 | peds | ED | Sepsis | Viral infection | Viral infection, Meningitis, Acute Otitis Media, Gastroenteritis, Pneumonia | fever wont break im shaking uncontrollably and my heart is r |
| 3482 | geri | PC | Pharyngitis | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Sepsis, Bacterial infection | hurts so bad to swallow even water and i got a fever |
| 3486 | adult | ED | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, Anxiety, GERD | sharp chest pain outta nowhere and now i cant take a full br |
| 3491 | adult | PC | Diverticulitis | Gastroenteritis | Gastroenteritis, GERD, Appendicitis, Peptic Ulcer, Pancreatitis | belly pain on the lower left that gets worse and i dont wann |
| 3492 | peds | ED | Pancreatitis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | pain in my upper belly going straight through to my back and |
| 3493 | adult | UC | Cholecystitis | Gastroenteritis | Gastroenteritis, Appendicitis, GERD, Peptic Ulcer, Epigastric Pain | right upper belly pain that goes to my shoulder and i feel s |
| 3498 | geri | ED | Gastrointestinal Bleeding | Orthostatic hypotension | Orthostatic hypotension, BPPV, Vestibular neuritis, Cardiac Arrhythmia, Medication side effect | been pooping black tar looking stuff and feel lightheaded |
| 3506 | peds | PC | Pyloric Stenosis | Dyspareunia | Dyspareunia, Female Sexual Arousal Disorder, Medication-Induced Sexual Dysfunction, Acute Gastroenteritis, Medication Induced Vomiting | my 3 week old baby keeps projectile vomiting after every fee |
| 3507 | adult | ED | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, GERD, Bone Lesions | sore throat came on fast now my child is leaning forward dro |
| 3508 | geri | UC | Henoch-Schonlein Purpura | Polymyalgia Rheumatica | Polymyalgia Rheumatica, Rheumatoid Arthritis, Reactive Arthritis, Viral Arthritis, Systemic Lupus Erythematosus | my kid has a purple rash on his legs and his belly and joint |
| 3509 | adult | PC | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Trochanteric Bursitis, Labral Tear | my overweight teen has been complaining of hip pain and now  |
| 3511 | geri | UC | Intussusception | Viral Illness | Viral Illness, Sepsis, Dehydration, Acute Hip and Leg, Hand Foot and Mouth Disease | my infant has episodes of screaming drawing up legs then goi |
| 3512 | geri | PC | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Cannabinoid Hyperemesis Syndrome, Demyelinating disease, Ricin Poisoning | sudden horrible pain on one side of my pelvis and im throwin |
| 3513 | adult | ED | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy, Gastroenteritis, GERD, Appendicitis, Cholecystitis | pregnant and my belly got really hard and painful and theres |
| 3514 | adult | UC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder, Hyperthyroidism, Cardiac Arrhythmia | got hit in the chest and now i can barely breathe and feel l |
| 3515 | geri | PC | Status Epilepticus | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Atrophic Vaginitis, Female Sexual Arousal Disorder, Hypogonadism | my family member started seizing and its been going on and o |
| 3517 | peds | UC | Thyroid Storm | Viral infection | Viral infection, Acute Otitis Media, Gastroenteritis, Pneumonia, Hand Foot and Mouth Disease | hyperthyroid and now everything is going haywire fever fast  |
| 3518 | geri | PC | Rhabdomyolysis | Erectile Dysfunction | Erectile Dysfunction, Medication-Induced Sexual Dysfunction, Hypogonadism, Premature Ejaculation, Peyronie Disease | worked out way too hard muscles are killing me and my pee is |
| 3520 | geri | UC | Orbital Cellulitis | Corneal Abrasion | Corneal Abrasion, Conjunctivitis, Foreign Body, Acute Angle Closure Glaucoma, Uveitis | my eye is swollen shut red and it hurts to move it plus i go |
| 3521 | adult | PC | Temporal Arteritis | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Migraine | my temple area is tender and throbbing and i noticed my visi |
| 3523 | adult | UC | Subdural Hematoma | Meningitis | Meningitis, Substance Intoxication, Delirium Tremens, Toxic/Metabolic Encephalopathy, Hepatic Encephalopathy | grandpa bumped his head and now hes acting weird and drowsy |
| 3524 | adult | PC | Shingles | Opioid Overdose | Opioid Overdose, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Alcohol Intoxication, Stimulant Intoxication | burning painful rash on one side of my body with little blis |
| 3525 | adult | ED | Hand Foot and Mouth Disease | Viral infection | Viral infection, UTI, Pneumonia, Gastroenteritis, Bacterial infection | daycare kid with fever painful mouth sores and a rash on pal |
| 3526 | adult | UC | Impetigo | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | my kid has crusty honey colored sores around his mouth and n |
| 3527 | geri | PC | Bronchiolitis | Viral URI | Viral URI, Anaphylaxis, Allergic Rhinitis, Acute Sinusitis, Epistaxis | infant with runny nose that turned into fast breathing and w |
| 3528 | adult | ED | Atrial Fibrillation | BPPV | BPPV, Vestibular neuritis, Orthostatic hypotension, Anxiety, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 3530 | adult | PC | Panic Attack | Pulmonary Embolism | Pulmonary Embolism, Primary Spontaneous Pneumothorax, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 3531 | geri | ED | Sciatica | Musculoskeletal strain | Musculoskeletal strain, Spinal Stenosis, Herniated Disc, Compression fracture, Kidney Stone | back pain that goes down my leg like an electric shock worse |
| 3533 | adult | PC | Hemorrhoids | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Atrophic Vaginitis, Hypogonadism | pain and bleeding when i go to the bathroom theres a lump ne |
| 3534 | geri | ED | Hypothyroidism | Hip Fracture | Hip Fracture, Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | im always cold tired and gaining weight even though i barely |
| 3539 | geri | PC | Delirium Tremens | Meningitis | Meningitis, Central Retinal Artery Occlusion, Stroke, Amaurosis Fugax, Retinal Detachment | stopped drinking and now im trembling cant think straight an |
| 3541 | adult | UC | Opioid Overdose | Substance Intoxication | Substance Intoxication, Delirium Tremens, Hepatic Encephalopathy, Toxic/Metabolic Encephalopathy, Stroke | she took a bunch of pills and now shes barely breathing and  |
| 3542 | adult | PC | Opioid Withdrawal | Viral infection | Viral infection, UTI, Pneumonia, Gastroenteritis, Bacterial infection | stopped using heroin and now i got chills body aches diarrhe |
| 3544 | adult | UC | Bipolar Disorder — Manic Episode | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | i feel amazing like i can do anything havent needed sleep an |
| 3545 | peds | PC | Psychotic Disorder | Opioid Overdose | Opioid Overdose, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Alcohol Intoxication, Stimulant Intoxication | she started talking to people who arent there and thinks som |
| 3546 | geri | ED | Stimulant Intoxication | Atrial Fibrillation | Atrial Fibrillation, Supraventricular Tachycardia, Cardiac Arrhythmia, Panic Disorder, Anxiety | he smoked meth and now his heart is racing hes paranoid swea |
| 3548 | geri | PC | Hepatic Encephalopathy | UTI | UTI, Toxic/Metabolic Encephalopathy, Sepsis, Stroke, Hypoglycemia | my mom has liver disease and shes getting more confused and  |
| 3549 | geri | ED | Serotonin Syndrome | Viral infection | Viral infection, Brachioradial Pruritus, Pneumonia, Allergic Contact Dermatitis, Bacterial infection | doctor increased my ssri and now i got fever muscle twitchin |
| 3551 | adult | PC | ADEM | Tension headache | Tension headache, Stroke, Migraine, Cluster headache, Meningitis | child developed weakness in legs after a virus plus headache |
| 3552 | adult | ED | Dental Abscess | Viral infection | Viral infection, UTI, Pneumonia, Gastroenteritis, Bacterial infection | my tooth is killing me and my whole jaw is swollen up and i  |
| 3553 | geri | UC | Vasovagal Syncope | Orthostatic hypotension | Orthostatic hypotension, BPPV, Acute Myocardial Infarction, Vestibular neuritis, Cardiac Arrhythmia | got lightheaded at church felt hot and sweaty then next thin |
| 3554 | peds | PC | Urticaria | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Hypogonadism | took a new medicine yesterday and now i got bumps and itchy  |
| 3556 | peds | UC | Iron Deficiency Anemia | BPPV | BPPV, Anxiety, Orthostatic hypotension, Vestibular neuritis, Medication side effect | so tired i can barely function my periods have been super he |
| 3557 | adult | PC | Intimate Partner Violence | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Atrophic Vaginitis | he punched me in the face again and i think my cheekbone mig |
| 3560 | adult | PC | Dyspareunia | First Degree Burn | First Degree Burn, Second Degree Burn, Third Degree Burn, Chemical Burn, Sunburn | it hurts every time my husband and i try to have sex like a  |
| 3561 | peds | ED | Chlamydia | Cirrhosis | Cirrhosis, Viral Hepatitis, Alcoholic Hepatitis, Choledocholithiasis, Gilbert Syndrome | theres a yellowish drip and it stings to urinate think i mig |
| 3562 | adult | UC | HRT Side Effect — Mood/Psychiatric | DVT | DVT, Cellulitis, Musculoskeletal Strain, Venous Insufficiency, Baker's Cyst Rupture | started estrogen 3 months ago and now i get terrible headach |
| 3563 | peds | PC | Lactation Mastitis | Chlamydia | Chlamydia, Gonorrhea, Genital Herpes, Trichomoniasis, Bacterial Vaginosis | had a clogged duct that turned into my whole breast being re |
| 3564 | peds | ED | Postpartum Depression | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Atrophic Vaginitis | had my baby 6 weeks ago and i cant stop crying i dont feel b |
| 3565 | adult | UC | Colic | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | baby cries inconsolably for 3 plus hours pulls legs up turns |
| 3566 | adult | PC | Polypharmacy/Medication Effect | Orthostatic hypotension | Orthostatic hypotension, BPPV, Vestibular neuritis, Cardiac Arrhythmia, Medication side effect | ever since they added that new medicine i feel woozy and uns |
| 3567 | geri | ED | Heat Exhaustion | Orthostatic hypotension | Orthostatic hypotension, BPPV, Acute Myocardial Infarction, Medication side effect, Vestibular neuritis | was working outside in the heat all day and now im dizzy nau |
| 3569 | adult | PC | Esophageal Foreign Body | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Stimulant Intoxication | my toddler put a battery in her mouth and i think she swallo |
| 3570 | adult | ED | Acute Urinary Retention | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Pancreatitis | i havent been able to pee all day my belly is huge and it fe |
| 3571 | geri | UC | Inguinal Hernia | Needs in-person evaluation | Needs in-person evaluation | got this lump near my privates that comes and goes and aches |
| 3572 | adult | PC | Second Degree Burn | Fracture | Fracture, Soft Tissue Injury, Rib Fracture, Concussion, Traumatic Brain Injury | spilled boiling water on my arm and theres big blisters and  |
| 3573 | geri | ED | Insomnia Disorder | Fracture | Fracture, Hip Fracture, Traumatic Brain Injury, Soft Tissue Injury, Rib Fracture | tossing and turning all night cant fall asleep or stay aslee |
| 3574 | geri | UC | Obstructive Sleep Apnea | UTI | UTI, Kidney Stone, Prostatitis, Urethritis, Pyelonephritis | my wife says i snore like a freight train and stop breathing |
| 3575 | peds | PC | Malignancy | Seizure | Seizure, New-Onset Epilepsy, Syncope, Febrile Seizure, Hypoglycemia | been losing weight like crazy clothes dont fit anymore and i |
| 3576 | peds | ED | Fibrocystic Breast Changes | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Benzodiazepine Overdose | found a lump in my breast and im freaking out its tender and |
| 3577 | geri | UC | Irritant Contact Diaper Dermatitis | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Atrophic Vaginitis, Female Sexual Arousal Disorder, Hypogonadism | diaper rash is getting worse the whole area is red with litt |
| 3578 | adult | PC | Hypothermia | Viral infection | Viral infection, Sepsis, UTI, Pneumonia, Gastroenteritis | found my grandpa outside in the cold hes shivering confused  |
| 3579 | peds | ED | Laceration/Crush Injury | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | fell off a ladder at the construction site landed on my arm  |
| 3582 | geri | ED | Pulmonary Embolism | Bronchitis | Bronchitis, ACE inhibitor cough, Viral URI, Pneumonia, Asthma | i was just sittin there and suddenly couldnt breathe and sta |
| 3585 | geri | ED | Appendicitis | Dyspareunia | Dyspareunia, Female Sexual Arousal Disorder, Medication-Induced Sexual Dysfunction, Acute Gastroenteritis, Medication Induced Vomiting | started around my belly button now the pain moved to the low |
| 3588 | adult | ED | Migraine | Temporal Arteritis | Temporal Arteritis, Stroke, Central Retinal Artery Occlusion, Retinal Detachment, Amaurosis Fugax | my head is pounding so bad i cant see straight and lights ma |
| 3589 | adult | UC | Nephrolithiasis | Opioid Overdose | Opioid Overdose, Polypharmacy/Mixed Overdose, Alcohol Intoxication, Acetaminophen Overdose, Stimulant Intoxication | pain in my back going down to my groin and theres blood when |
| 3592 | peds | UC | COPD Exacerbation | Viral URI | Viral URI, Bronchitis, Post-Bronchitic cough, Asthma, Pneumonia | lungs feel like theyre on fire and i cant stop coughing gree |
| 3593 | geri | PC | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Spinal Stenosis, Cauda Equina Syndrome, Herniated Disc, Compression fracture | fever of 103 and pain in my lower back plus burning when i u |
| 3595 | peds | UC | Diabetic Ketoacidosis | Depression | Depression, Anemia, Hypothyroidism, Electrolyte abnormality, Acute Nephritis | my sugar was over 500 and i feel terrible im so nauseous and |
| 3597 | peds | ED | Gout | Trauma | Trauma, Cellulitis, Septic Arthritis, Bursitis, Reactive Arthritis | my big toe is swollen red and hurts so bad i cant even put a |


## Failure Mode Breakdown

| Mode | Count | % of Total |
|---|---|---|
| Dead-end ("Needs in-person") | 6 | 1.0% |
| Viral over-generalization | 36 | 6.0% |
| Wrong diagnosis | 275 | 45.8% |
| API errors | 0 | 0.0% |

### Dead-End Cases

| Expected | CC (truncated) |
|---|---|
| Inguinal Hernia (5) | got this lump near my privates that comes and goes and aches |
| Urinary Tract Infection (1) | feels like peein razor blades and my pee smells awful |

### Viral Over-Generalization Cases

| Expected | CC (truncated) |
|---|---|
| Thyroid Storm (5) | hyperthyroid and now everything is going haywire fever fast  |
| Bronchiolitis (5) | infant with runny nose that turned into fast breathing and w |
| Serotonin Syndrome (5) | doctor increased my ssri and now i got fever muscle twitchin |
| Hypothermia (5) | found my grandpa outside in the cold hes shivering confused  |
| Hand Foot and Mouth Disease (4) | daycare kid with fever painful mouth sores and a rash on pal |
| Diverticulitis (2) | pain in my lower left belly with fever and i been constipate |
| Pharyngitis (2) | hurts so bad to swallow even water and i got a fever |
| Opioid Withdrawal (2) | stopped using heroin and now i got chills body aches diarrhe |
| Dental Abscess (2) | my tooth is killing me and my whole jaw is swollen up and i  |
| Pneumonia (1) | my cough wont quit and i got a fever and everything aches |
| Appendicitis (1) | sharp stabbing pain in my lower right belly and i got a feve |
| Sepsis (1) | fever wont break im shaking uncontrollably and my heart is r |
| COPD Exacerbation (1) | lungs feel like theyre on fire and i cant stop coughing gree |

## Per-Condition Accuracy

| Condition | Hits | Total | Accuracy | Primary Failure Mode |
|---|---|---|---|---|
| Pneumothorax | 0 | 5 | 0% | Musculoskeletal pain |
| Pancreatitis | 0 | 5 | 0% | Gastroenteritis |
| Pyloric Stenosis | 0 | 5 | 0% | Dyspareunia |
| Epiglottitis | 0 | 5 | 0% | Viral Pharyngitis |
| Henoch-Schonlein Purpura | 0 | 5 | 0% | Polymyalgia Rheumatica |
| Slipped Capital Femoral Epiphysis | 0 | 5 | 0% | Hip Fracture |
| Ovarian Torsion | 0 | 5 | 0% | Acute Gastroenteritis |
| Placental Abruption | 0 | 5 | 0% | Ectopic Pregnancy |
| Tension Pneumothorax | 0 | 5 | 0% | Generalized Anxiety Disorder |
| Status Epilepticus | 0 | 5 | 0% | Dyspareunia |
| Thyroid Storm | 0 | 5 | 0% | Viral infection |
| Rhabdomyolysis | 0 | 5 | 0% | Dyspareunia |
| Temporal Arteritis | 0 | 5 | 0% | Dyspareunia |
| Subdural Hematoma | 0 | 5 | 0% | Meningitis |
| Shingles | 0 | 5 | 0% | Opioid Overdose |
| Impetigo | 0 | 5 | 0% | Dyspareunia |
| Bronchiolitis | 0 | 5 | 0% | Viral URI |
| Panic Attack | 0 | 5 | 0% | Primary Spontaneous Pneumothorax |
| Sciatica | 0 | 5 | 0% | Musculoskeletal strain |
| Hemorrhoids | 0 | 5 | 0% | Dyspareunia |
| Hypothyroidism | 0 | 5 | 0% | Hip Fracture |
| Psychotic Disorder | 0 | 5 | 0% | Opioid Overdose |
| Serotonin Syndrome | 0 | 5 | 0% | Viral infection |
| ADEM | 0 | 5 | 0% | Tension headache |
| Dyspareunia | 0 | 5 | 0% | First Degree Burn |
| Chlamydia | 0 | 5 | 0% | Choledocholithiasis |
| Postpartum Depression | 0 | 5 | 0% | Dyspareunia |
| Colic | 0 | 5 | 0% | Erectile Dysfunction |
| Polypharmacy/Medication Effect | 0 | 5 | 0% | Fracture |
| Esophageal Foreign Body | 0 | 5 | 0% | Opioid Overdose |
| Acute Urinary Retention | 0 | 5 | 0% | Gastroenteritis |
| Inguinal Hernia | 0 | 5 | 0% | Needs in-person evaluation |
| Second Degree Burn | 0 | 5 | 0% | Fracture |
| Insomnia Disorder | 0 | 5 | 0% | Fracture |
| Obstructive Sleep Apnea | 0 | 5 | 0% | UTI |
| Malignancy | 0 | 5 | 0% | Seizure |
| Fibrocystic Breast Changes | 0 | 5 | 0% | Opioid Overdose |
| Irritant Contact Diaper Dermatitis | 0 | 5 | 0% | Erectile Dysfunction |
| Hypothermia | 0 | 5 | 0% | Viral infection |
| Laceration/Crush Injury | 0 | 5 | 0% | Fracture |
| Pulmonary Embolism | 1 | 6 | 17% | Bronchitis |
| Appendicitis | 1 | 6 | 17% | Erectile Dysfunction |
| Diverticulitis | 1 | 5 | 20% | Viral infection |
| Intussusception | 1 | 5 | 20% | Viral Illness |
| Hand Foot and Mouth Disease | 1 | 5 | 20% | Viral infection |
| Atrial Fibrillation | 1 | 5 | 20% | BPPV |
| Opioid Withdrawal | 1 | 5 | 20% | Viral infection |
| Stimulant Intoxication | 1 | 5 | 20% | Supraventricular Tachycardia |
| Vasovagal Syncope | 1 | 5 | 20% | Opioid Overdose |
| Iron Deficiency Anemia | 1 | 5 | 20% | BPPV |
| Migraine | 2 | 6 | 33% | Corneal Abrasion |
| Nephrolithiasis | 2 | 6 | 33% | Chlamydia |
| Congestive Heart Failure | 2 | 6 | 33% | Asthma |
| COPD Exacerbation | 2 | 6 | 33% | Asthma |
| Pyelonephritis | 2 | 6 | 33% | Musculoskeletal strain |
| Cholecystitis | 2 | 5 | 40% | Gastroenteritis |
| Gastrointestinal Bleeding | 2 | 5 | 40% | BPPV |
| Orbital Cellulitis | 2 | 5 | 40% | Corneal Abrasion |
| Alcohol Withdrawal | 2 | 5 | 40% | Delirium Tremens |
| Urticaria | 2 | 5 | 40% | Erectile Dysfunction |
| HRT Side Effect — Mood/Psychiatric | 2 | 5 | 40% | DVT |
| Pneumonia | 3 | 6 | 50% | Musculoskeletal pain |
| Urinary Tract Infection | 3 | 6 | 50% | Needs in-person evaluation |
| Sepsis | 3 | 6 | 50% | Supraventricular Tachycardia |
| Mesenteric Ischemia | 3 | 5 | 60% | Gastroenteritis |
| Delirium Tremens | 3 | 5 | 60% | Meningitis |
| Opioid Overdose | 3 | 5 | 60% | Delirium Tremens |
| Bipolar Disorder — Manic Episode | 3 | 5 | 60% | Erectile Dysfunction |
| Dental Abscess | 3 | 5 | 60% | Viral infection |
| Intimate Partner Violence | 3 | 5 | 60% | Dyspareunia |
| Lactation Mastitis | 3 | 5 | 60% | Chlamydia |
| Heat Exhaustion | 3 | 5 | 60% | Orthostatic hypotension |
| Deep Vein Thrombosis | 4 | 6 | 67% | Cellulitis |
| Diabetic Ketoacidosis | 4 | 6 | 67% | Depression |
| Gout | 4 | 6 | 67% | Plantar Fasciitis |
| Pharyngitis | 4 | 6 | 67% | Viral infection |
| Peritonsillar Abscess | 4 | 5 | 80% | Viral Pharyngitis |
| Hepatic Encephalopathy | 4 | 5 | 80% | UTI |
| Neuroleptic Malignant Syndrome | 4 | 5 | 80% | Meningitis |
| Simple Laceration | 4 | 5 | 80% | Hip Fracture |
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
| Nursemaid Elbow | 5 | 5 | 100% | - |
| Kawasaki Disease | 5 | 5 | 100% | - |
| Addison Crisis | 5 | 5 | 100% | - |
| Corneal Abrasion | 5 | 5 | 100% | - |
| Depression | 5 | 5 | 100% | - |
| Bowel Obstruction | 5 | 5 | 100% | - |
| Peripheral Neuropathy | 5 | 5 | 100% | - |
| Plantar Fasciitis | 5 | 5 | 100% | - |
| Carpal Tunnel Syndrome | 5 | 5 | 100% | - |
| Fibromyalgia | 5 | 5 | 100% | - |
| Cannabinoid Hyperemesis Syndrome | 5 | 5 | 100% | - |
| Wernicke Encephalopathy | 5 | 5 | 100% | - |
| Sexual Assault | 5 | 5 | 100% | - |
| Erectile Dysfunction | 5 | 5 | 100% | - |
| Dog/Cat Bite | 5 | 5 | 100% | - |

