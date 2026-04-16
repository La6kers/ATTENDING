# COMPASS Blind Spot Test — 100 Cases (v14)

**Date:** 2026-04-16T19:08:12.115Z
**Endpoint:** http://localhost:3005/api/diagnose
**Total cases:** 100

## Overall Accuracy

| Metric | Value |
|---|---|
| **Hits** | 32 |
| **Misses** | 68 |
| **Errors** | 0 |
| **Accuracy** | **32.0%** |

## By Category

| Category | Hits/Total | Accuracy | Status |
|---|---|---|---|
| Burns | 0/3 | 0% | FAIL |
| Foreign Body | 0/3 | 0% | FAIL |
| Allergic Reactions | 0/3 | 0% | FAIL |
| STI | 0/2 | 0% | FAIL |
| Urinary Retention | 0/1 | 0% | FAIL |
| Environmental | 0/3 | 0% | FAIL |
| Breast | 0/2 | 0% | FAIL |
| Pediatric Specific | 0/2 | 0% | FAIL |
| Insomnia/Sleep | 0/2 | 0% | FAIL |
| Occupational | 0/2 | 0% | FAIL |
| Anal/Rectal | 0/2 | 0% | FAIL |
| Bites/Stings | 1/4 | 25% | PARTIAL |
| Consistently Failing (retested) | 22/56 | 39% | PARTIAL |
| Wounds/Lacerations | 1/2 | 50% | PARTIAL |
| Dental | 1/2 | 50% | PARTIAL |
| Postpartum | 1/2 | 50% | PARTIAL |
| Geriatric Specific | 1/2 | 50% | PARTIAL |
| Weight Loss | 1/2 | 50% | PARTIAL |
| Syncope | 2/3 | 67% | PARTIAL |
| Pregnancy | 2/2 | 100% | PASS |

## All Misses

| ID | Demo | Setting | Expected | Got (Primary) | Top 5 | CC |
|---|---|---|---|---|---|---|
| 3000 | adult | ED | Second Degree Burn | Fracture | Fracture, Soft Tissue Injury, Rib Fracture, Concussion, Traumatic Brain Injury | spilled boiling water on my arm its all red with blisters |
| 3001 | adult | ED | Chemical Burn | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | got drain cleaner splashed on my hand at work its turning wh |
| 3002 | peds | UC | Sunburn | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | fell asleep at the beach now my kid is bright red and crying |
| 3003 | peds | ED | Dog Bite | Dog/Cat Bite | Dog/Cat Bite, Insect Bite/Sting, Cellulitis (bite-related), Allergic Reaction to Sting, Snake Envenomation | neighbors dog bit my kid on the face its bleeding pretty bad |
| 3005 | adult | PC | Tick Bite | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | found a tick on me last week now theres a big red ring aroun |
| 3006 | adult | ED | Snake Bite | Gout | Gout, Plantar Fasciitis, Ankle Sprain, Stress Fracture, Peripheral Neuropathy | got bit by a snake out hiking my ankle is swelling up fast a |
| 3007 | peds | UC | Nasal Foreign Body | Medication-Induced Sexual Dysfunction | Medication-Induced Sexual Dysfunction, Hypogonadism, Premature Ejaculation, Peyronie Disease, Dyspareunia | my kid stuck a bead up his nose and we cant get it out its m |
| 3008 | peds | UC | Ear Foreign Body | Needs in-person evaluation | Needs in-person evaluation | my daughter put something in her ear now she says it hurts a |
| 3009 | peds | ED | Esophageal Foreign Body | Esophageal Cancer | Esophageal Cancer, Esophageal Stricture, Eosinophilic Esophagitis, GERD, Achalasia | my toddler swallowed a coin now hes drooling and wont eat an |
| 3011 | adult | UC | Puncture Wound | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | stepped on a rusty nail went right through my shoe into my f |
| 3014 | geri | PC | Orthostatic Syncope | Hip Fracture | Hip Fracture, Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | every time i stand up from the chair i get so dizzy i almost |
| 3015 | adult | UC | Urticaria | Opioid Overdose | Opioid Overdose, Anaphylaxis, Polypharmacy/Mixed Overdose, Acetaminophen Overdose, Alcohol Intoxication | broke out in hives all over my body theyre itchy and keep mo |
| 3016 | adult | ED | Angioedema | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Benzodiazepine Overdose, Polypharmacy/Mixed Overdose | my lips and tongue are swelling up really fast i just starte |
| 3017 | geri | ED | Drug Reaction | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Atrophic Vaginitis, Female Sexual Arousal Disorder, Hypogonadism | started a new antibiotic and now i have a rash all over and  |
| 3019 | adult | PC | TMJ Disorder | Tension headache | Tension headache, Migraine, Sinusitis, Medication overuse headache, Cluster headache | my jaw clicks and locks when i open it and i get bad headach |
| 3020 | adult | UC | Chlamydia | UTI | UTI, Pyelonephritis, Kidney Stone, Interstitial Cystitis, Urethritis | new discharge down there that doesnt look normal and it burn |
| 3021 | adult | UC | Genital Herpes | Erectile Dysfunction | Erectile Dysfunction, Medication-Induced Sexual Dysfunction, Hypogonadism, Premature Ejaculation, Peyronie Disease | painful blisters down there that popped and turned into sore |
| 3022 | geri | ED | Urinary Retention | Major Depressive Disorder | Major Depressive Disorder, Adjustment Disorder, Generalized Anxiety Disorder, Substance Use Disorder, Bipolar Disorder | i havent been able to pee all day my belly is getting big an |
| 3023 | adult | ED | Heat Exhaustion | Acute Myocardial Infarction | Acute Myocardial Infarction, BPPV, Vestibular neuritis, Orthostatic hypotension, Medication side effect | was working outside in the heat all day now im dizzy nauseou |
| 3024 | geri | ED | Hypothermia | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Sepsis, Bacterial infection | found grandpa outside confused and shivering his skin feels  |
| 3025 | adult | ED | Frostbite | Peripheral Neuropathy | Peripheral Neuropathy, Carpal Tunnel Syndrome, Cervical Radiculopathy, Stroke, Vitamin B12 Deficiency | my fingers are white and numb from being out in the cold the |
| 3028 | adult | PC | Postpartum Depression | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Atrophic Vaginitis | had my baby 3 weeks ago and i cant stop crying feel worthles |
| 3030 | adult | PC | Breast Cyst | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Polypharmacy/Mixed Overdose, Stimulant Intoxication, Acetaminophen Overdose | found a lump in my breast its round and moves and gets tende |
| 3031 | peds | PC | Gynecomastia | Needs in-person evaluation | Needs in-person evaluation | my chest is getting bigger on both sides and its embarrassin |
| 3032 | peds | PC | Colic | Needs in-person evaluation | Needs in-person evaluation | my 6 week old baby cries for hours every evening nothing we  |
| 3033 | peds | PC | Diaper Rash | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Hypogonadism | babys bottom is all red raw and now theres white patches tha |
| 3035 | geri | PC | Deconditioning | Erectile Dysfunction | Erectile Dysfunction, Hypogonadism, Medication-Induced Sexual Dysfunction, Premature Ejaculation, Peyronie Disease | since my wife died ive barely left bed and now i can hardly  |
| 3037 | adult | PC | Celiac Disease | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Appendicitis, Ectopic Pregnancy | every time i eat bread or pasta my belly bloats up terrible  |
| 3038 | adult | PC | Sleep Apnea | Kidney Stone | Kidney Stone, UTI, Prostatitis, Urethritis, Pyelonephritis | my wife says i stop breathing at night and snore real loud i |
| 3039 | adult | PC | Restless Leg Syndrome | Chlamydia | Chlamydia, Genital Herpes, Trichomoniasis, Gonorrhea, Bacterial Vaginosis | cant sit still at night my legs get this creepy crawly feeli |
| 3040 | adult | ED | Crush Injury | Erectile Dysfunction | Erectile Dysfunction, Medication-Induced Sexual Dysfunction, Hypogonadism, Premature Ejaculation, Peyronie Disease | forklift rolled over my foot at work its smashed and turning |
| 3041 | adult | ED | Chemical Exposure | Corneal Abrasion | Corneal Abrasion, Foreign Body, Post-Bronchitic cough, Conjunctivitis, Bronchitis | breathed in fumes at the factory now im coughing and my eyes |
| 3042 | adult | UC | Anal Fissure | Opioid Overdose | Opioid Overdose, Polypharmacy/Mixed Overdose, Alcohol Intoxication, Acetaminophen Overdose, Stimulant Intoxication | sharp tearing pain every time i have a bowel movement with a |
| 3043 | adult | ED | Perianal Abscess | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Bacterial infection, Acute Otitis Media | theres a painful swollen lump right next to my butt i cant s |
| 3044 | adult | ED | Pneumothorax | Vasovagal Syncope | Vasovagal Syncope, Cardiac Arrhythmia, Orthostatic Hypotension, Acute Hemorrhage, Seizure | i think my lung collapsed im a tall skinny guy and it feels  |
| 3046 | adult | ED | Pancreatitis | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Benzodiazepine Overdose, Polypharmacy/Mixed Overdose | pain goes straight through from my belly to my back worse af |
| 3048 | peds | ED | Epiglottitis | Esophageal Cancer | Esophageal Cancer, Esophageal Stricture, Eosinophilic Esophagitis, GERD, Achalasia | my kid woke up drooling cant swallow sitting up leaning forw |
| 3049 | adult | ED | Epiglottitis | Erectile Dysfunction | Erectile Dysfunction, Medication-Induced Sexual Dysfunction, Hypogonadism, Premature Ejaculation, Peyronie Disease | swallowing is so painful i cant even swallow my own spit and |
| 3050 | adult | ED | Ovarian Torsion | Female Sexual Arousal Disorder | Female Sexual Arousal Disorder, Dyspareunia, Medication-Induced Sexual Dysfunction, Acute Gastroenteritis, Vaginismus | sudden sharp stabbing pain in my lower right belly near my o |
| 3051 | adult | ED | Ovarian Torsion | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Atrophic Vaginitis | woke up with the worst pain on my left side down low like so |
| 3052 | geri | UC | Shingles | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Conjunctivitis, Allergic Reaction, Cellulitis | had chickenpox years ago now theres a painful band of bliste |
| 3053 | geri | PC | Shingles | Musculoskeletal pain | Musculoskeletal pain, Acute Coronary Syndrome, GERD, Costochondritis, Pneumonia | got herpes zoster my doctor said its shingles burning nerve  |
| 3056 | adult | ED | Placental Abruption | Uterine Fibroids | Uterine Fibroids, Dysfunctional Uterine Bleeding, Atrophic Vaginitis, Endometrial Hyperplasia, Miscarriage | im 35 weeks pregnant and having painful dark vaginal bleedin |
| 3060 | geri | ED | Subdural Hematoma | Fracture | Fracture, Hip Fracture, Traumatic Brain Injury, Soft Tissue Injury, Rib Fracture | dad fell and hit his head 2 weeks ago seemed fine but now he |
| 3061 | geri | ED | Subdural Hematoma | Fracture | Fracture, Hip Fracture, Traumatic Brain Injury, Soft Tissue Injury, Rib Fracture | on blood thinners fell and bumped his head last week now hav |
| 3062 | geri | ED | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Appendicitis | belly pain thats way worse than it looks i have afib and the |
| 3063 | adult | PC | Hypothyroidism | Fracture | Fracture, Soft Tissue Injury, Hip Fracture, Rib Fracture, Traumatic Brain Injury | my thyroid feels swollen im exhausted constipated gaining we |
| 3065 | adult | ED | Gastrointestinal Bleeding | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Benzodiazepine Overdose, Polypharmacy/Mixed Overdose | having large bloody bowel movements bright red blood filling |
| 3066 | adult | PC | Sciatica | Gout | Gout, Plantar Fasciitis, Cauda Equina Syndrome, Ankle Sprain, Narrowing of lumbar spinal canal with back pain and leg numbness, weakness better with rest | electric shock pain shooting from my lower back down the bac |
| 3070 | geri | ED | COPD Exacerbation | Aspiration Pneumonitis | Aspiration Pneumonitis, Asthma Exacerbation, Cystic Fibrosis or ciliary Dyskinesia, Anomalous left common Carotid Artery, Bronchopulmonary Dysplasia | i have copd and my breathing got way worse cant walk to the  |
| 3071 | adult | ED | Pyelonephritis | Musculoskeletal strain | Musculoskeletal strain, Herniated Disc, Genitourinary, Compression fracture, Urethral | started as a uti now my back hurts on the left side with 103 |
| 3073 | geri | ED | Sepsis | Atrial Fibrillation | Atrial Fibrillation, Supraventricular Tachycardia, Panic Disorder, Cardiac Arrhythmia, Anxiety | infection spread from my wound now my whole body is shaking  |
| 3076 | adult | ED | Appendicitis | Erectile Dysfunction | Erectile Dysfunction, Medication-Induced Sexual Dysfunction, Hypogonadism, Premature Ejaculation, Peyronie Disease | started around my belly button last night now it moved down  |
| 3077 | geri | ED | Congestive Heart Failure | DVT | DVT, Cellulitis, Musculoskeletal Strain, Venous Insufficiency, Baker's Cyst Rupture | cant lay flat at night without choking on fluid legs so swol |
| 3078 | geri | ED | Diverticulitis | Viral infection | Viral infection, Pneumonia, Gastroenteritis, Sepsis, Bacterial infection | pain in my lower left belly been getting worse for 2 days no |
| 3080 | peds | ED | Orbital Cellulitis | Viral URI | Viral URI, Nasal Foreign Body, Allergic Rhinitis, Acute Sinusitis, Epistaxis | my childs eye is bulging out red and swollen cant move it pr |
| 3081 | peds | UC | Impetigo | Dyspareunia | Dyspareunia, Medication-Induced Sexual Dysfunction, Female Sexual Arousal Disorder, Vaginismus, Hypogonadism | sores with yellow honey colored crusty scabs spreading on my |
| 3082 | adult | ED | Thyroid Storm | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Anxiety, Cardiac Arrhythmia, Atrial Fibrillation | i have graves disease and now my heart is racing over 150 wi |
| 3083 | adult | ED | Rhabdomyolysis | Fracture | Fracture, Soft Tissue Injury, Joint Dislocation, Nursemaid Elbow, Septic Arthritis | did an insane workout yesterday now i cant move my arms they |
| 3084 | adult | UC | Panic Attack | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Anxiety, Cardiac Arrhythmia, Atrial Fibrillation | out of nowhere i got terrified heart racing hands tingling f |
| 3086 | adult | ED | Serotonin Syndrome | Viral infection | Viral infection, Brachioradial Pruritus, Meningitis, Allergic Contact Dermatitis, Bacterial infection | started tramadol with my antidepressant now i have fever clo |
| 3087 | peds | ED | Henoch-Schonlein Purpura | Viral Illness | Viral Illness, Fibromyalgia, Sleep Apnea, Depression, Chronic Fatigue Syndrome | my son has raised purple spots all over his legs and butt pl |
| 3088 | peds | ED | Slipped Capital Femoral Epiphysis | Labral Tear | Labral Tear, Hoffa Disease, Septic Arthritis, Acute Hip and Leg, Plica Syndrome | my heavy set 13 year old has been limping for weeks hip hurt |
| 3089 | peds | ED | Intussusception | Opioid Overdose | Opioid Overdose, Alcohol Intoxication, Stimulant Intoxication, Gastrointestinal Bleeding, Benzodiazepine Overdose | my 10 month old screams pulls his legs up tight then calms d |
| 3090 | peds | ED | Pyloric Stenosis | Medication-Induced Sexual Dysfunction | Medication-Induced Sexual Dysfunction, Hypogonadism, Premature Ejaculation, Peyronie Disease, Dyspareunia | my 4 week old forcefully vomits across the room after every  |
| 3091 | adult | ED | Psychotic Disorder | Substance Intoxication | Substance Intoxication, Delirium Tremens, Toxic/Metabolic Encephalopathy, Hepatic Encephalopathy, Wernicke Encephalopathy | hearing voices telling him to hurt himself and believes the  |
| 3092 | adult | ED | Bipolar Disorder — Manic Episode | Needs in-person evaluation | Needs in-person evaluation | hasnt slept in 5 days spending thousands of dollars talking  |
| 3093 | adult | ED | Opioid Withdrawal | Viral URI | Viral URI, Allergic Rhinitis, Acute Sinusitis, Nasal Foreign Body, Epistaxis | havent had any opiates in 3 days now i have horrible body ac |

## All Hits

| ID | Demo | Setting | Expected | Got (Primary) | CC |
|---|---|---|---|---|---|
| 3004 | adult | UC | Spider Bite | Insect Bite/Sting | something bit me in bed now theres a red area on my leg with |
| 3010 | adult | ED | Laceration | Simple Laceration | cut my hand real deep on a knife its gaping open and wont st |
| 3012 | adult | UC | Vasovagal Syncope | Opioid Overdose | i passed out at the doctors office when they drew my blood w |
| 3013 | geri | ED | Cardiac Syncope | Orthostatic hypotension | passed out without any warning while just sitting in my chai |
| 3018 | adult | ED | Dental Abscess | Dental Abscess | my tooth is killing me my whole jaw is swollen and i can fee |
| 3026 | adult | ED | Hyperemesis Gravidarum | Depression | im 10 weeks pregnant and i cant stop throwing up ive lost 8  |
| 3027 | adult | ED | Threatened Miscarriage | Uterine Fibroids | im 8 weeks pregnant and started spotting with some cramping  |
| 3029 | adult | UC | Mastitis | Cellulitis | breastfeeding and one breast is super red hot swollen and pa |
| 3034 | geri | ED | Falls with Polypharmacy | Dyspareunia | keep falling down three times this month i take about 12 dif |
| 3036 | geri | PC | Malignancy | Malignancy | lost 30 pounds without trying in 3 months and i have no appe |
| 3045 | adult | ED | Pneumothorax | Kidney Stone | something popped in my chest while lifting weights now one s |
| 3047 | adult | ED | Pancreatitis | Gastroenteritis | severe upper belly pain that bores through to my back i have |
| 3054 | peds | ED | Status Epilepticus | Seizure | my child has been having continuous seizures for over 30 min |
| 3055 | adult | ED | Status Epilepticus | Seizure | she keeps seizing over and over not waking up between the se |
| 3057 | adult | ED | Tension Pneumothorax | Asthma | stabbed in the chest and getting worse fast neck veins poppi |
| 3058 | geri | PC | Temporal Arteritis | Temporal Arteritis | my temple artery is swollen and tender hurts to chew and im  |
| 3059 | geri | ED | Temporal Arteritis | Temporal Arteritis | sudden vision loss in one eye and my head hurts on the side  |
| 3064 | geri | ED | Gastrointestinal Bleeding | Opioid Overdose | throwing up blood looks like coffee grounds and my stool is  |
| 3067 | geri | ED | Atrial Fibrillation | Erectile Dysfunction | my pulse is totally irregular i checked it and its all over  |
| 3068 | adult | ED | Deep Vein Thrombosis | DVT | my left calf is swollen red warm and painful just got off a  |
| 3069 | adult | ED | Cholecystitis | Viral infection | terrible pain under my right ribs that goes to my shoulder b |
| 3072 | adult | ED | Diabetic Ketoacidosis | Diabetic Ketoacidosis | im type 1 diabetic my blood sugar is over 500 im vomiting an |
| 3074 | adult | ED | Ectopic Pregnancy | Ectopic Pregnancy | missed my period positive pregnancy test now sharp pain on o |
| 3075 | adult | ED | Pulmonary Embolism | Post-Infectious Cough | leg was swollen for a week now suddenly cant catch my breath |
| 3079 | peds | UC | Hand Foot and Mouth Disease | Viral infection | my toddler has tiny blisters on his palms and soles of his f |
| 3085 | adult | ED | Alcohol Withdrawal | Alcohol Withdrawal | quit drinking cold turkey 48 hours ago now im shaking sweati |
| 3094 | geri | ED | Hepatic Encephalopathy | Delirium Tremens | has cirrhosis and is getting more confused by the day hands  |
| 3095 | adult | ED | Stimulant Intoxication | Psychotic Disorder | snorted cocaine an hour ago now chest is pounding he is agit |
| 3096 | geri | ED | Aortic Dissection | Aortic Dissection | sudden tearing pain in my chest ripping through to my back w |
| 3097 | geri | ED | Bowel Obstruction | Gastroenteritis | belly is bloated hard as a rock havent pooped or passed gas  |
| 3098 | adult | ED | Cannabinoid Hyperemesis Syndrome | Opioid Overdose | been smoking weed daily for years and keep having episodes o |
| 3099 | adult | ED | Neuroleptic Malignant Syndrome | Viral infection | started a new antipsychotic and now he has a super high feve |

## Latency

| Percentile | ms |
|---|---|
| p50 | 10 |
| p95 | 14 |
| p99 | 41 |
