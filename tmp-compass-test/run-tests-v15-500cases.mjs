/**
 * COMPASS Engine — 500-Case Comprehensive Blind-Spot + Accuracy Test (v15)
 *
 * Covers: common presentations, emergencies, burns, bites, foreign body,
 * environmental, TB/infectious, cancer symptoms, medication side effects,
 * allergies, poisoning, GI, musculoskeletal, pediatric, geriatric,
 * psychiatric, OB/GYN, urologic, dermatologic, neurologic, and more.
 *
 * Each case has: id, chiefComplaint, age, gender, expectedDx (array of
 * acceptable diagnoses — first match wins), urgency hint.
 */
import http from 'node:http';

const API = 'http://localhost:3005/api/diagnose';

// ───────── test cases ─────────
const CASES = [
  // ========== CHEST PAIN (10) ==========
  { id: 4001, cc: 'crushing chest pain radiating to my left arm and jaw', age: 62, gender: 'male', expected: ['Acute Coronary Syndrome', 'Myocardial Infarction', 'STEMI', 'NSTEMI', 'Unstable Angina'], urgency: 'emergent' },
  { id: 4002, cc: 'sharp chest pain worse when I breathe in deep', age: 28, gender: 'female', expected: ['Pleurisy', 'Pleuritis', 'Costochondritis', 'Pulmonary Embolism', 'Pericarditis'], urgency: 'urgent' },
  { id: 4003, cc: 'chest tightness after eating a big meal, burning feeling', age: 45, gender: 'male', expected: ['GERD', 'Gastroesophageal Reflux', 'Esophagitis', 'Peptic Ulcer'], urgency: 'routine' },
  { id: 4004, cc: 'sudden tearing pain in my chest going to my back between shoulder blades', age: 68, gender: 'male', expected: ['Aortic Dissection'], urgency: 'emergent' },
  { id: 4005, cc: 'my heart skips beats and flutters every few minutes', age: 55, gender: 'female', expected: ['Atrial Fibrillation', 'Cardiac Arrhythmia', 'Premature Atrial', 'Premature Ventricular', 'SVT', 'Palpitations'], urgency: 'urgent' },
  { id: 4006, cc: 'chest pain when I walk uphill but goes away when I rest', age: 70, gender: 'male', expected: ['Stable Angina', 'Coronary Artery Disease', 'Angina'], urgency: 'urgent' },
  { id: 4007, cc: 'I was in a car accident and now my chest hurts when I move', age: 34, gender: 'male', expected: ['Rib Fracture', 'Chest Wall', 'Costochondritis', 'Pneumothorax', 'Sternal Fracture'], urgency: 'urgent' },
  { id: 4008, cc: 'sharp stabbing chest pain on the left side, Im tall and skinny', age: 22, gender: 'male', expected: ['Pneumothorax', 'Primary Spontaneous Pneumothorax', 'Costochondritis'], urgency: 'emergent' },
  { id: 4009, cc: 'chest pain with shortness of breath, recently had surgery on my knee', age: 50, gender: 'female', expected: ['Pulmonary Embolism'], urgency: 'emergent' },
  { id: 4010, cc: 'tender spot on my breastbone when I press on it', age: 30, gender: 'female', expected: ['Costochondritis', 'Chest Wall Pain', 'Musculoskeletal'], urgency: 'routine' },

  // ========== HEADACHE (10) ==========
  { id: 4011, cc: 'worst headache of my life, came on suddenly like a thunderclap', age: 45, gender: 'female', expected: ['Subarachnoid Hemorrhage', 'SAH'], urgency: 'emergent' },
  { id: 4012, cc: 'throbbing headache on one side with nausea and sensitivity to light', age: 32, gender: 'female', expected: ['Migraine'], urgency: 'urgent' },
  { id: 4013, cc: 'headache like a tight band around my head, both sides', age: 40, gender: 'male', expected: ['Tension Headache', 'Tension-Type Headache'], urgency: 'routine' },
  { id: 4014, cc: 'excruciating pain behind my right eye with tearing and runny nose, happens same time every day', age: 35, gender: 'male', expected: ['Cluster Headache'], urgency: 'urgent' },
  { id: 4015, cc: 'headache with fever stiff neck and sensitivity to light', age: 19, gender: 'male', expected: ['Meningitis', 'Bacterial Meningitis'], urgency: 'emergent' },
  { id: 4016, cc: 'headache getting worse over weeks, blurry vision in the morning', age: 55, gender: 'male', expected: ['Brain Tumor', 'Intracranial Mass', 'Intracranial Hypertension', 'Space-Occupying Lesion'], urgency: 'urgent' },
  { id: 4017, cc: 'headache and jaw pain when I chew, my temples are tender', age: 72, gender: 'female', expected: ['Temporal Arteritis', 'Giant Cell Arteritis'], urgency: 'emergent' },
  { id: 4018, cc: 'daily headaches and I take tylenol every day for them', age: 38, gender: 'female', expected: ['Medication Overuse Headache', 'Rebound Headache', 'Chronic Daily Headache', 'Tension Headache'], urgency: 'routine' },
  { id: 4019, cc: 'headache after I hit my head on a cabinet door yesterday', age: 60, gender: 'male', expected: ['Concussion', 'Post-Concussive', 'Subdural Hematoma', 'Traumatic Brain'], urgency: 'urgent' },
  { id: 4020, cc: 'headache and nosebleed and my blood pressure is usually high', age: 58, gender: 'male', expected: ['Hypertensive', 'Hypertension', 'Anterior Epistaxis'], urgency: 'urgent' },

  // ========== ABDOMINAL PAIN (15) ==========
  { id: 4021, cc: 'pain started around my belly button and moved to my right lower side with nausea', age: 25, gender: 'male', expected: ['Appendicitis'], urgency: 'emergent' },
  { id: 4022, cc: 'severe right upper quadrant pain after eating a greasy burger', age: 42, gender: 'female', expected: ['Cholecystitis', 'Biliary Colic', 'Cholelithiasis'], urgency: 'urgent' },
  { id: 4023, cc: 'upper belly pain going straight through to my back after drinking heavily', age: 48, gender: 'male', expected: ['Pancreatitis', 'Acute Pancreatitis'], urgency: 'emergent' },
  { id: 4024, cc: 'crampy abdominal pain with bloating and no gas or stool for 3 days', age: 75, gender: 'female', expected: ['Bowel Obstruction', 'Small Bowel Obstruction'], urgency: 'emergent' },
  { id: 4025, cc: 'left lower belly pain with fever and change in bowel habits', age: 65, gender: 'male', expected: ['Diverticulitis'], urgency: 'urgent' },
  { id: 4026, cc: 'sudden severe left sided pelvic pain with nausea, I think my ovary is twisting', age: 28, gender: 'female', expected: ['Ovarian Torsion', 'Ovarian Cyst'], urgency: 'emergent' },
  { id: 4027, cc: 'missed period, lower belly pain, and light vaginal bleeding', age: 30, gender: 'female', expected: ['Ectopic Pregnancy', 'Threatened Abortion', 'Miscarriage'], urgency: 'emergent' },
  { id: 4028, cc: 'burning stomach pain that gets better when I eat', age: 35, gender: 'male', expected: ['Peptic Ulcer', 'Duodenal Ulcer', 'Gastritis', 'GERD'], urgency: 'routine' },
  { id: 4029, cc: 'diffuse belly pain with bloody diarrhea and joint pain', age: 26, gender: 'female', expected: ['Inflammatory Bowel Disease', 'Ulcerative Colitis', 'Crohn', 'IBD'], urgency: 'urgent' },
  { id: 4030, cc: 'severe abdominal pain out of proportion to my exam, I have atrial fib', age: 78, gender: 'male', expected: ['Mesenteric Ischemia', 'Acute Mesenteric'], urgency: 'emergent' },
  { id: 4031, cc: 'my 3 week old baby has been vomiting forcefully after every feeding, hungry right after', age: 0.06, gender: 'male', expected: ['Pyloric Stenosis'], urgency: 'emergent' },
  { id: 4032, cc: 'stomach cramps and watery diarrhea started yesterday, whole family is sick', age: 35, gender: 'female', expected: ['Gastroenteritis', 'Food Poisoning', 'Viral Gastroenteritis'], urgency: 'routine' },
  { id: 4033, cc: 'baby screaming and pulling knees to chest every 15 minutes then calms down, jelly stool', age: 0.75, gender: 'male', expected: ['Intussusception'], urgency: 'emergent' },
  { id: 4034, cc: 'right sided belly pain and my appendix was already removed years ago', age: 45, gender: 'female', expected: ['Ovarian Cyst', 'Kidney Stone', 'Urinary Tract Infection', 'Diverticulitis', 'Mesenteric Adenitis'], urgency: 'urgent' },
  { id: 4035, cc: 'havent had a bowel movement in a week and my belly is huge and hard', age: 80, gender: 'female', expected: ['Bowel Obstruction', 'Constipation', 'Fecal Impaction', 'Functional Constipation'], urgency: 'urgent' },

  // ========== SHORTNESS OF BREATH (8) ==========
  { id: 4036, cc: 'sudden shortness of breath and coughing up pink frothy sputum', age: 70, gender: 'male', expected: ['Congestive Heart Failure', 'Pulmonary Edema', 'CHF', 'Heart Failure'], urgency: 'emergent' },
  { id: 4037, cc: 'wheezing and tight chest, I have asthma and my inhaler isnt helping', age: 20, gender: 'female', expected: ['Asthma Exacerbation', 'Asthma', 'Status Asthmaticus'], urgency: 'emergent' },
  { id: 4038, cc: 'getting more and more short of breath over the past week with productive cough and fever', age: 68, gender: 'male', expected: ['Pneumonia', 'COPD Exacerbation', 'Bronchitis'], urgency: 'urgent' },
  { id: 4039, cc: 'cant lay flat to sleep, wake up gasping, ankles are swollen', age: 72, gender: 'female', expected: ['Congestive Heart Failure', 'CHF', 'Heart Failure'], urgency: 'emergent' },
  { id: 4040, cc: 'short of breath at rest, one leg is swollen and warm, just flew from Europe', age: 38, gender: 'female', expected: ['Pulmonary Embolism', 'DVT'], urgency: 'emergent' },
  { id: 4041, cc: 'progressive shortness of breath over months with dry cough, fingers are clubbed', age: 65, gender: 'male', expected: ['Idiopathic Pulmonary Fibrosis', 'IPF', 'Interstitial Lung Disease'], urgency: 'urgent' },
  { id: 4042, cc: 'my 6 month old baby is breathing fast with nasal flaring and wheezing', age: 0.5, gender: 'male', expected: ['Bronchiolitis', 'RSV', 'Respiratory Syncytial Virus'], urgency: 'emergent' },
  { id: 4043, cc: 'shortness of breath and anxiety, tingling in my hands and around my mouth', age: 24, gender: 'female', expected: ['Hyperventilation', 'Panic Attack', 'Panic Disorder', 'Anxiety'], urgency: 'routine' },

  // ========== BACK PAIN (6) ==========
  { id: 4044, cc: 'low back pain shooting down my left leg to my foot', age: 42, gender: 'male', expected: ['Sciatica', 'Lumbar Disc Herniation', 'Lumbar Radiculopathy'], urgency: 'urgent' },
  { id: 4045, cc: 'back pain and I cant urinate and my legs feel numb around my bottom', age: 55, gender: 'male', expected: ['Cauda Equina Syndrome'], urgency: 'emergent' },
  { id: 4046, cc: 'severe back pain with a pulsating mass in my belly', age: 75, gender: 'male', expected: ['Abdominal Aortic Aneurysm', 'AAA'], urgency: 'emergent' },
  { id: 4047, cc: 'upper back pain between my shoulder blades after lifting heavy boxes', age: 38, gender: 'male', expected: ['Muscle Strain', 'Thoracic Strain', 'Musculoskeletal', 'Back Strain'], urgency: 'routine' },
  { id: 4048, cc: 'severe sharp pain in my right flank going to my groin, comes in waves', age: 32, gender: 'male', expected: ['Kidney Stone', 'Nephrolithiasis', 'Renal Colic', 'Ureteral Stone'], urgency: 'urgent' },
  { id: 4049, cc: 'back pain for 3 months, worse at night, unintentional weight loss of 15 pounds', age: 60, gender: 'male', expected: ['Metastatic Cancer', 'Malignancy', 'Spinal Metastasis', 'Multiple Myeloma'], urgency: 'urgent' },

  // ========== BURNS (8) ==========
  { id: 4050, cc: 'got drain cleaner splashed on my hand at work its turning white and hurts bad', age: 42, gender: 'male', expected: ['Chemical Burn', 'Caustic Burn', 'First Degree Burn', 'Second Degree Burn'], urgency: 'emergent' },
  { id: 4051, cc: 'I spilled boiling water on my forearm and there are big blisters', age: 35, gender: 'female', expected: ['Second Degree Burn', 'Scald Burn', 'First Degree Burn'], urgency: 'urgent' },
  { id: 4052, cc: 'fell asleep at the beach and got a terrible sunburn', age: 22, gender: 'male', expected: ['Sunburn', 'First Degree Burn'], urgency: 'routine' },
  { id: 4053, cc: 'house fire, my face is burned and singed nose hairs', age: 40, gender: 'male', expected: ['Inhalation Injury', 'Third Degree Burn', 'Second Degree Burn', 'First Degree Burn'], urgency: 'emergent' },
  { id: 4054, cc: 'hot grease splashed on my leg while cooking', age: 50, gender: 'female', expected: ['Second Degree Burn', 'First Degree Burn', 'Scald Burn'], urgency: 'urgent' },
  { id: 4055, cc: 'my toddler touched the hot stove and burned her fingers', age: 2, gender: 'female', expected: ['First Degree Burn', 'Second Degree Burn', 'Thermal Burn'], urgency: 'urgent' },
  { id: 4056, cc: 'bleach splashed in my eyes at the cleaning supply store', age: 30, gender: 'male', expected: ['Chemical Burn', 'Caustic Burn', 'Ocular Chemical Burn', 'Chemical Exposure'], urgency: 'emergent' },
  { id: 4057, cc: 'steam burn on my arm from a pressure cooker accident', age: 45, gender: 'female', expected: ['Second Degree Burn', 'First Degree Burn', 'Scald Burn'], urgency: 'urgent' },

  // ========== BITES / STINGS (6) ==========
  { id: 4058, cc: 'my dog bit my hand and its bleeding and swelling', age: 35, gender: 'male', expected: ['Dog Bite', 'Animal Bite', 'Bite Wound'], urgency: 'urgent' },
  { id: 4059, cc: 'got stung by a wasp and my whole arm is swollen and red', age: 28, gender: 'female', expected: ['Insect Sting', 'Wasp Sting', 'Hymenoptera', 'Insect Bite'], urgency: 'urgent' },
  { id: 4060, cc: 'found a tick on my leg and now theres a red ring around the bite', age: 40, gender: 'male', expected: ['Lyme Disease', 'Tick Bite', 'Erythema Migrans'], urgency: 'urgent' },
  { id: 4061, cc: 'rattlesnake bit me on the ankle while hiking', age: 50, gender: 'male', expected: ['Snake Bite', 'Envenomation', 'Crotalid Envenomation'], urgency: 'emergent' },
  { id: 4062, cc: 'brown recluse spider bit me and theres a dark spot forming', age: 38, gender: 'female', expected: ['Spider Bite', 'Brown Recluse', 'Loxosceles Bite', 'Insect Bite'], urgency: 'urgent' },
  { id: 4063, cc: 'stung by a bee and my throat feels tight and face is swelling', age: 25, gender: 'male', expected: ['Anaphylaxis', 'Allergic Reaction', 'Bee Sting'], urgency: 'emergent' },

  // ========== FOREIGN BODY (5) ==========
  { id: 4064, cc: 'my 3 year old put a bead up his nose and we cant get it out', age: 3, gender: 'male', expected: ['Nasal Foreign Body', 'Foreign Body'], urgency: 'urgent' },
  { id: 4065, cc: 'fish bone stuck in my throat after dinner', age: 55, gender: 'male', expected: ['Foreign Body', 'Esophageal Foreign Body', 'Oropharyngeal Foreign Body'], urgency: 'urgent' },
  { id: 4066, cc: 'my toddler swallowed a button battery', age: 2, gender: 'female', expected: ['Foreign Body Ingestion', 'Esophageal Foreign Body', 'Battery Ingestion'], urgency: 'emergent' },
  { id: 4067, cc: 'something went in my eye and I cant get it out, hurts to blink', age: 32, gender: 'male', expected: ['Corneal Foreign Body', 'Foreign Body', 'Eye Foreign Body'], urgency: 'urgent' },
  { id: 4068, cc: 'stepped on a nail that went through my shoe into my foot', age: 40, gender: 'male', expected: ['Puncture Wound', 'Foreign Body', 'Nail Puncture'], urgency: 'urgent' },

  // ========== ENVIRONMENTAL EXPOSURE (8) ==========
  { id: 4069, cc: 'been working outside in 105 degree heat all day, feeling dizzy and nauseous', age: 35, gender: 'male', expected: ['Heat Exhaustion', 'Heat Illness', 'Dehydration'], urgency: 'emergent' },
  { id: 4070, cc: 'found my grandpa outside in the cold, hes confused and shivering', age: 82, gender: 'male', expected: ['Hypothermia', 'Cold Exposure'], urgency: 'emergent' },
  { id: 4071, cc: 'my fingers are white and numb after being outside in the snow without gloves', age: 28, gender: 'male', expected: ['Frostbite', 'Cold Injury'], urgency: 'urgent' },
  { id: 4072, cc: 'working in the heat and stopped sweating, confused and high temperature', age: 55, gender: 'male', expected: ['Heat Stroke', 'Heat Illness'], urgency: 'emergent' },
  { id: 4073, cc: 'headache and nausea, my carbon monoxide detector went off at home', age: 40, gender: 'female', expected: ['Carbon Monoxide Poisoning', 'CO Poisoning'], urgency: 'emergent' },
  { id: 4074, cc: 'got electrocuted fixing an outlet, my arm tingled and my chest feels weird', age: 30, gender: 'male', expected: ['Electrical Injury', 'Electrical Burn', 'Cardiac Arrhythmia'], urgency: 'emergent' },
  { id: 4075, cc: 'near drowning, pulled from the pool, coughing up water', age: 5, gender: 'male', expected: ['Drowning', 'Near-Drowning', 'Submersion Injury', 'Aspiration'], urgency: 'emergent' },
  { id: 4076, cc: 'altitude sickness headache and nausea after hiking to high elevation', age: 32, gender: 'female', expected: ['Altitude Sickness', 'Acute Mountain Sickness', 'High Altitude'], urgency: 'urgent' },

  // ========== TB / INFECTIOUS DISEASE (8) ==========
  { id: 4077, cc: 'coughing up blood for 3 weeks with night sweats and 10 pound weight loss', age: 35, gender: 'male', expected: ['Pulmonary Tuberculosis', 'Tuberculosis', 'Lung Cancer', 'Lung Malignancy'], urgency: 'emergent' },
  { id: 4078, cc: 'my tb test came back positive and Im from India', age: 28, gender: 'male', expected: ['Latent TB', 'Tuberculosis', 'Pulmonary Tuberculosis'], urgency: 'urgent' },
  { id: 4079, cc: 'exposed to someone with active TB at the homeless shelter', age: 42, gender: 'male', expected: ['Latent TB', 'Tuberculosis', 'Pulmonary Tuberculosis', 'TB Exposure'], urgency: 'urgent' },
  { id: 4080, cc: 'chronic cough for 2 months with night sweats, I was recently in prison', age: 38, gender: 'male', expected: ['Pulmonary Tuberculosis', 'Tuberculosis', 'Community-Acquired Pneumonia'], urgency: 'urgent' },
  { id: 4081, cc: 'fever and rash after traveling to Africa, returned 2 weeks ago', age: 30, gender: 'female', expected: ['Malaria', 'Dengue', 'Typhoid', 'Travel-Related Infection', 'Viral Exanthem'], urgency: 'emergent' },
  { id: 4082, cc: 'painful swollen lymph nodes in my neck for 3 weeks with fever and weight loss', age: 25, gender: 'male', expected: ['Lymphoma', 'Tuberculosis', 'Mononucleosis', 'HIV', 'Reactive Lymphadenopathy'], urgency: 'urgent' },
  { id: 4083, cc: 'sore throat fever and my tonsils have white patches', age: 16, gender: 'female', expected: ['Streptococcal Pharyngitis', 'Strep Throat', 'Mononucleosis', 'Viral Pharyngitis'], urgency: 'urgent' },
  { id: 4084, cc: 'my child has a barky seal-like cough that started at night with stridor', age: 3, gender: 'male', expected: ['Croup', 'Laryngotracheobronchitis'], urgency: 'urgent' },

  // ========== CANCER SYMPTOMS (10) ==========
  { id: 4085, cc: 'found a hard growing lump in my neck that has been there for 2 months', age: 55, gender: 'male', expected: ['Lymphoma', 'Metastatic Carcinoma', 'Thyroid Nodule', 'Benign Lymphadenopathy', 'Malignancy'], urgency: 'urgent' },
  { id: 4086, cc: 'lump in my breast that feels hard and doesnt move', age: 52, gender: 'female', expected: ['Breast Cancer', 'Fibroadenoma', 'Breast Mass'], urgency: 'urgent' },
  { id: 4087, cc: 'blood in my urine for a week, no pain, Im a smoker', age: 65, gender: 'male', expected: ['Bladder Cancer', 'Kidney Cancer', 'Renal Cell', 'Prostate'], urgency: 'urgent' },
  { id: 4088, cc: 'unintentional weight loss of 20 pounds over 3 months, no appetite', age: 70, gender: 'male', expected: ['Malignancy', 'Cancer', 'Lung Cancer', 'Colon Cancer', 'Pancreatic Cancer'], urgency: 'urgent' },
  { id: 4089, cc: 'rectal bleeding and change in bowel habits for 2 months', age: 58, gender: 'male', expected: ['Colorectal Cancer', 'Colon Cancer', 'Hemorrhoids', 'Inflammatory Bowel', 'Diverticular'], urgency: 'urgent' },
  { id: 4090, cc: 'growing mole that changed color with irregular borders', age: 45, gender: 'female', expected: ['Melanoma', 'Skin Cancer', 'Dysplastic Nevus', 'Malignant Melanoma'], urgency: 'urgent' },
  { id: 4091, cc: 'persistent hoarseness for 6 weeks and I smoke a pack a day', age: 60, gender: 'male', expected: ['Laryngeal Cancer', 'Lung Cancer', 'Vocal Cord', 'Laryngitis'], urgency: 'urgent' },
  { id: 4092, cc: 'swollen lymph nodes all over, drenching night sweats, lost 15 pounds', age: 35, gender: 'male', expected: ['Lymphoma', 'HIV', 'Leukemia'], urgency: 'urgent' },
  { id: 4093, cc: 'difficulty swallowing solid food that is getting progressively worse', age: 65, gender: 'male', expected: ['Esophageal Cancer', 'Esophageal Stricture', 'Eosinophilic Esophagitis', 'Achalasia'], urgency: 'urgent' },
  { id: 4094, cc: 'I keep getting bruises for no reason and feel tired all the time', age: 8, gender: 'male', expected: ['Leukemia', 'ITP', 'Thrombocytopenia', 'Aplastic Anemia'], urgency: 'urgent' },

  // ========== MEDICATION SIDE EFFECTS (8) ==========
  { id: 4095, cc: 'since starting my new blood pressure medicine I have a dry cough that wont go away', age: 55, gender: 'male', expected: ['ACE Inhibitor Cough', 'Adverse Drug Reaction', 'Medication Side Effect'], urgency: 'routine' },
  { id: 4096, cc: 'started a new antibiotic and broke out in hives everywhere', age: 28, gender: 'female', expected: ['Drug Allergy', 'Drug Eruption', 'Urticaria', 'Allergic Reaction', 'Drug-Induced Rash'], urgency: 'urgent' },
  { id: 4097, cc: 'my new statin medication is causing severe muscle pain', age: 62, gender: 'male', expected: ['Statin Myopathy', 'Adverse Drug Reaction', 'Rhabdomyolysis', 'Medication Side Effect'], urgency: 'urgent' },
  { id: 4098, cc: 'since starting metformin I have terrible diarrhea and stomach cramps', age: 50, gender: 'female', expected: ['Medication Side Effect', 'Adverse Drug Reaction', 'Metformin Side Effect'], urgency: 'routine' },
  { id: 4099, cc: 'started new antidepressant and now Im agitated with tremor and fever', age: 35, gender: 'female', expected: ['Serotonin Syndrome', 'Neuroleptic Malignant Syndrome'], urgency: 'emergent' },
  { id: 4100, cc: 'my skin is peeling off in sheets after starting that new seizure medicine', age: 30, gender: 'male', expected: ['Stevens-Johnson Syndrome', 'TEN', 'Toxic Epidermal Necrolysis', 'Drug Eruption'], urgency: 'emergent' },
  { id: 4101, cc: 'dizzy and lightheaded since my doctor doubled my blood pressure medication', age: 68, gender: 'female', expected: ['Medication Side Effect', 'Adverse Drug Reaction', 'Orthostatic Hypotension', 'Hypotension'], urgency: 'urgent' },
  { id: 4102, cc: 'yellow skin and eyes after taking the new antibiotic for 2 weeks', age: 45, gender: 'male', expected: ['Drug-Induced Liver Injury', 'Hepatitis', 'Jaundice'], urgency: 'urgent' },

  // ========== ALLERGIES (6) ==========
  { id: 4103, cc: 'terrible sneezing runny nose and itchy watery eyes every spring', age: 25, gender: 'female', expected: ['Allergic Rhinitis', 'Seasonal Allergies', 'Hay Fever'], urgency: 'routine' },
  { id: 4104, cc: 'ate shrimp and my throat is swelling shut and I cant breathe', age: 30, gender: 'male', expected: ['Anaphylaxis', 'Allergic Reaction', 'Food Allergy'], urgency: 'emergent' },
  { id: 4105, cc: 'covered in hives after taking ibuprofen', age: 22, gender: 'female', expected: ['Urticaria', 'Drug Allergy', 'Allergic Reaction', 'Drug Eruption'], urgency: 'urgent' },
  { id: 4106, cc: 'stuffy nose year round, worse around cats', age: 35, gender: 'male', expected: ['Allergic Rhinitis', 'Perennial Rhinitis', 'Vasomotor Rhinitis'], urgency: 'routine' },
  { id: 4107, cc: 'swollen lips and tongue after eating at a restaurant, dont know what triggered it', age: 28, gender: 'female', expected: ['Angioedema', 'Anaphylaxis', 'Allergic Reaction', 'Food Allergy'], urgency: 'emergent' },
  { id: 4108, cc: 'wheezing and tight chest every time I mow the lawn', age: 30, gender: 'male', expected: ['Allergic Asthma', 'Asthma', 'Exercise-Induced Asthma', 'Allergic Rhinitis'], urgency: 'urgent' },

  // ========== POISONING / INGESTION (6) ==========
  { id: 4109, cc: 'my 2 year old got into the medicine cabinet and ate some of grandmas pills', age: 2, gender: 'male', expected: ['Medication Overdose', 'Poisoning', 'Accidental Ingestion', 'Toxic Ingestion'], urgency: 'emergent' },
  { id: 4110, cc: 'intentionally took a whole bottle of tylenol', age: 22, gender: 'female', expected: ['Acetaminophen Overdose', 'Medication Overdose', 'Intentional Overdose'], urgency: 'emergent' },
  { id: 4111, cc: 'drank antifreeze accidentally thinking it was a sports drink', age: 45, gender: 'male', expected: ['Toxic Alcohol Ingestion', 'Ethylene Glycol Poisoning', 'Poisoning'], urgency: 'emergent' },
  { id: 4112, cc: 'child swallowed a handful of magnets from the toy set', age: 4, gender: 'male', expected: ['Foreign Body Ingestion', 'Magnet Ingestion', 'Caustic Ingestion'], urgency: 'emergent' },
  { id: 4113, cc: 'ate wild mushrooms while camping and now Im vomiting with diarrhea', age: 35, gender: 'male', expected: ['Mushroom Poisoning', 'Plant/Mushroom Poisoning', 'Food Poisoning', 'Gastroenteritis'], urgency: 'emergent' },
  { id: 4114, cc: 'cleaning with bleach and ammonia in a small bathroom, now coughing and chest burns', age: 40, gender: 'female', expected: ['Chemical Exposure', 'Inhalation Injury', 'Toxic Gas Inhalation', 'Chloramine Gas'], urgency: 'emergent' },

  // ========== SKIN / RASH (10) ==========
  { id: 4115, cc: 'painful blisters in a stripe on one side of my chest', age: 65, gender: 'male', expected: ['Herpes Zoster', 'Shingles'], urgency: 'urgent' },
  { id: 4116, cc: 'spreading redness warmth and swelling on my lower leg with fever', age: 55, gender: 'male', expected: ['Cellulitis', 'Skin Infection'], urgency: 'urgent' },
  { id: 4117, cc: 'itchy bumps between my fingers that are worse at night', age: 22, gender: 'female', expected: ['Scabies'], urgency: 'routine' },
  { id: 4118, cc: 'round red patches with clear center on my arms and trunk', age: 30, gender: 'male', expected: ['Ringworm', 'Tinea Corporis', 'Fungal Infection'], urgency: 'routine' },
  { id: 4119, cc: 'my childs hands and feet have blisters with sores in the mouth and fever', age: 4, gender: 'male', expected: ['Hand Foot and Mouth Disease', 'Coxsackievirus'], urgency: 'routine' },
  { id: 4120, cc: 'dry itchy patches on the insides of my elbows and behind my knees', age: 8, gender: 'female', expected: ['Atopic Dermatitis', 'Eczema'], urgency: 'routine' },
  { id: 4121, cc: 'silver scaly patches on my elbows and knees', age: 35, gender: 'male', expected: ['Psoriasis', 'Plaque Psoriasis'], urgency: 'routine' },
  { id: 4122, cc: 'red itchy rash where my new necklace was touching', age: 28, gender: 'female', expected: ['Contact Dermatitis', 'Nickel Allergy', 'Allergic Contact Dermatitis'], urgency: 'routine' },
  { id: 4123, cc: 'my baby has golden crusty sores around her nose and mouth', age: 3, gender: 'female', expected: ['Impetigo'], urgency: 'routine' },
  { id: 4124, cc: 'bullseye rash on my thigh after a camping trip, low grade fever', age: 40, gender: 'male', expected: ['Lyme Disease', 'Erythema Migrans'], urgency: 'urgent' },

  // ========== NEUROLOGICAL (10) ==========
  { id: 4125, cc: 'sudden weakness on my right side and I cant speak clearly', age: 68, gender: 'male', expected: ['Stroke', 'CVA', 'Ischemic Stroke', 'TIA'], urgency: 'emergent' },
  { id: 4126, cc: 'seizure that lasted 2 minutes, never had one before', age: 30, gender: 'male', expected: ['Seizure', 'New Onset Seizure', 'Epilepsy'], urgency: 'emergent' },
  { id: 4127, cc: 'tingling and numbness in both feet slowly moving up my legs', age: 55, gender: 'male', expected: ['Peripheral Neuropathy', 'Diabetic Neuropathy', 'Guillain-Barre', 'B12 Deficiency'], urgency: 'urgent' },
  { id: 4128, cc: 'weakness that started in my feet and is moving up after a stomach bug last week', age: 35, gender: 'male', expected: ['Guillain-Barre Syndrome', 'GBS'], urgency: 'emergent' },
  { id: 4129, cc: 'double vision and drooping eyelid that gets worse by evening', age: 40, gender: 'female', expected: ['Myasthenia Gravis'], urgency: 'urgent' },
  { id: 4130, cc: 'tremor in my right hand at rest, getting worse over months', age: 65, gender: 'male', expected: ['Parkinson', 'Essential Tremor'], urgency: 'routine' },
  { id: 4131, cc: 'sudden loss of vision in my right eye like a curtain coming down', age: 60, gender: 'male', expected: ['Retinal Detachment', 'Central Retinal', 'Retinal Artery Occlusion', 'Amaurosis Fugax'], urgency: 'emergent' },
  { id: 4132, cc: 'face drooping on left side, cant close my left eye, came on overnight', age: 32, gender: 'female', expected: ['Bell Palsy', 'Facial Nerve', 'Stroke'], urgency: 'urgent' },
  { id: 4133, cc: 'child had a seizure with fever of 103, first time this happened', age: 1.5, gender: 'male', expected: ['Febrile Seizure'], urgency: 'emergent' },
  { id: 4134, cc: 'my memory is getting worse, I keep getting lost driving to familiar places', age: 72, gender: 'female', expected: ['Alzheimer', 'Dementia', 'Cognitive Decline', 'Vascular Dementia'], urgency: 'routine' },

  // ========== PSYCHIATRIC (8) ==========
  { id: 4135, cc: 'I want to kill myself, I have a plan', age: 22, gender: 'male', expected: ['Major Depressive Disorder with Suicidal Ideation', 'Suicidal Ideation'], urgency: 'emergent' },
  { id: 4136, cc: 'havent slept for 4 days, feel invincible, spent all my money', age: 28, gender: 'male', expected: ['Bipolar Disorder', 'Manic Episode', 'Mania'], urgency: 'emergent' },
  { id: 4137, cc: 'hearing voices telling me to hurt people, very paranoid', age: 24, gender: 'male', expected: ['Psychotic Disorder', 'Schizophrenia', 'Schizoaffective'], urgency: 'emergent' },
  { id: 4138, cc: 'feeling depressed hopeless and empty inside for the past month', age: 35, gender: 'female', expected: ['Major Depressive Disorder', 'Depression'], urgency: 'urgent' },
  { id: 4139, cc: 'panic attacks with heart racing and feeling like Im going to die', age: 26, gender: 'female', expected: ['Panic Disorder', 'Panic Attack', 'Anxiety'], urgency: 'urgent' },
  { id: 4140, cc: 'ran out of my suboxone and I feel terrible, sweating diarrhea muscle aches', age: 32, gender: 'male', expected: ['Opioid Withdrawal'], urgency: 'urgent' },
  { id: 4141, cc: 'quit drinking 2 days ago and now Im shaking seeing things and confused', age: 50, gender: 'male', expected: ['Delirium Tremens', 'Alcohol Withdrawal'], urgency: 'emergent' },
  { id: 4142, cc: 'my teenager is cutting herself on her arms, I found the razor blades', age: 15, gender: 'female', expected: ['Self-Harm', 'Non-Suicidal Self-Injury', 'Major Depressive Disorder', 'Borderline'], urgency: 'urgent' },

  // ========== OB/GYN (10) ==========
  { id: 4143, cc: 'Im 32 weeks pregnant with severe headache and vision changes and swollen feet', age: 28, gender: 'female', expected: ['Preeclampsia', 'Eclampsia', 'HELLP'], urgency: 'emergent' },
  { id: 4144, cc: '8 weeks pregnant and cant stop vomiting, havent kept anything down in 2 days', age: 25, gender: 'female', expected: ['Hyperemesis Gravidarum', 'Morning Sickness', 'Pregnancy'], urgency: 'urgent' },
  { id: 4145, cc: 'heavy vaginal bleeding at 36 weeks pregnant with contractions', age: 30, gender: 'female', expected: ['Placental Abruption', 'Placenta Previa', 'Preterm Labor'], urgency: 'emergent' },
  { id: 4146, cc: 'had my baby 3 days ago and now Im bleeding heavily soaking a pad per hour', age: 28, gender: 'female', expected: ['Postpartum Hemorrhage', 'Retained Products', 'Uterine Atony'], urgency: 'emergent' },
  { id: 4147, cc: 'delivered a week ago, my breast is red hot and painful with fever', age: 30, gender: 'female', expected: ['Lactation Mastitis', 'Mastitis', 'Breast Abscess'], urgency: 'urgent' },
  { id: 4148, cc: 'had the baby 2 weeks ago and I feel like I might hurt myself or the baby', age: 26, gender: 'female', expected: ['Postpartum Depression', 'Postpartum Psychosis'], urgency: 'emergent' },
  { id: 4149, cc: 'irregular heavy periods with clots for the past 6 months', age: 42, gender: 'female', expected: ['Dysfunctional Uterine Bleeding', 'Fibroids', 'Endometrial', 'Menorrhagia'], urgency: 'urgent' },
  { id: 4150, cc: 'painful periods that make me miss work, severe cramping', age: 22, gender: 'female', expected: ['Dysmenorrhea', 'Endometriosis', 'Primary Dysmenorrhea'], urgency: 'routine' },
  { id: 4151, cc: 'painful sores on my genitals and swollen lymph nodes in my groin', age: 25, gender: 'female', expected: ['Genital Herpes', 'HSV', 'Syphilis', 'Chancroid'], urgency: 'urgent' },
  { id: 4152, cc: 'burning when I pee and unusual discharge from my vagina', age: 22, gender: 'female', expected: ['Chlamydia', 'Gonorrhea', 'UTI', 'Urinary Tract Infection', 'Vaginitis'], urgency: 'urgent' },

  // ========== UROLOGIC (6) ==========
  { id: 4153, cc: 'burning when I urinate with frequency and urgency', age: 30, gender: 'female', expected: ['Urinary Tract Infection', 'UTI', 'Cystitis'], urgency: 'routine' },
  { id: 4154, cc: 'cant urinate at all, bladder feels full and painful, Im on new allergy medication', age: 70, gender: 'male', expected: ['Urinary Retention', 'BPH', 'Acute Urinary Retention'], urgency: 'emergent' },
  { id: 4155, cc: 'sudden severe pain in my left testicle that started an hour ago', age: 16, gender: 'male', expected: ['Testicular Torsion', 'Epididymitis'], urgency: 'emergent' },
  { id: 4156, cc: 'blood in my urine with no pain', age: 65, gender: 'male', expected: ['Bladder Cancer', 'Kidney Cancer', 'Prostate', 'Hematuria'], urgency: 'urgent' },
  { id: 4157, cc: 'having to pee every 30 minutes, getting up 5 times a night', age: 72, gender: 'male', expected: ['BPH', 'Benign Prostatic', 'Overactive Bladder', 'Prostate'], urgency: 'routine' },
  { id: 4158, cc: 'fever chills and back pain with painful urination', age: 35, gender: 'female', expected: ['Pyelonephritis', 'Kidney Infection', 'UTI'], urgency: 'urgent' },

  // ========== MUSCULOSKELETAL (10) ==========
  { id: 4159, cc: 'twisted my ankle playing basketball, its swollen and I cant put weight on it', age: 18, gender: 'male', expected: ['Ankle Sprain', 'Ankle Fracture', 'Sprain', 'Fracture'], urgency: 'urgent' },
  { id: 4160, cc: 'my big toe is red hot swollen and extremely painful, woke me up last night', age: 55, gender: 'male', expected: ['Gout', 'Septic Arthritis'], urgency: 'urgent' },
  { id: 4161, cc: 'morning stiffness in my hands for over an hour, worse in small joints', age: 40, gender: 'female', expected: ['Rheumatoid Arthritis', 'RA'], urgency: 'routine' },
  { id: 4162, cc: 'severe morning stiffness in both shoulders and hips lasting hours', age: 72, gender: 'female', expected: ['Polymyalgia Rheumatica', 'PMR'], urgency: 'urgent' },
  { id: 4163, cc: 'my 13 year old overweight son has hip pain and a limp', age: 13, gender: 'male', expected: ['Slipped Capital Femoral Epiphysis', 'SCFE'], urgency: 'urgent' },
  { id: 4164, cc: 'hot red swollen knee, cant bend it, fever', age: 60, gender: 'male', expected: ['Septic Arthritis', 'Gout', 'Pseudogout'], urgency: 'emergent' },
  { id: 4165, cc: 'numbness and tingling in my thumb index and middle finger, worse at night', age: 45, gender: 'female', expected: ['Carpal Tunnel Syndrome'], urgency: 'routine' },
  { id: 4166, cc: 'shoulder pain and cant lift my arm above my head after falling', age: 55, gender: 'male', expected: ['Rotator Cuff', 'Shoulder', 'Fracture'], urgency: 'urgent' },
  { id: 4167, cc: 'burning numbness on the outside of my thigh, worse with tight pants', age: 48, gender: 'male', expected: ['Meralgia Paresthetica'], urgency: 'routine' },
  { id: 4168, cc: 'my wrist hurts on the thumb side, especially when I grip or twist things', age: 32, gender: 'female', expected: ['De Quervain', 'Tendinitis', 'Scaphoid Fracture', 'Fracture'], urgency: 'routine' },

  // ========== PEDIATRIC SPECIFIC (12) ==========
  { id: 4169, cc: 'my 6 month old has had fever for 5 days, red eyes, cracked lips, swollen hands', age: 0.5, gender: 'male', expected: ['Kawasaki Disease', 'Kawasaki'], urgency: 'emergent' },
  { id: 4170, cc: 'diaper rash that looks like cottage cheese, wont go away with regular cream', age: 0.5, gender: 'female', expected: ['Candidal Diaper Rash', 'Yeast Diaper Rash', 'Candidiasis'], urgency: 'routine' },
  { id: 4171, cc: 'my newborn wont stop crying, been going for 3 hours, pulls legs up', age: 0.08, gender: 'male', expected: ['Colic', 'Infantile Colic', 'Intussusception', 'Hernia'], urgency: 'urgent' },
  { id: 4172, cc: 'purple red spots and bruises on my 5 year old, belly pain and joint swelling', age: 5, gender: 'male', expected: ['Henoch-Schonlein Purpura', 'HSP', 'IgA Vasculitis', 'Leukemia'], urgency: 'urgent' },
  { id: 4173, cc: 'child with drooling high fever and muffled voice, sitting forward and refusing to swallow', age: 4, gender: 'male', expected: ['Epiglottitis', 'Peritonsillar Abscess', 'Retropharyngeal Abscess'], urgency: 'emergent' },
  { id: 4174, cc: 'chickenpox, itchy blisters all over body in different stages', age: 6, gender: 'female', expected: ['Varicella', 'Chickenpox'], urgency: 'routine' },
  { id: 4175, cc: 'my baby spit up blood tinged formula, is 2 weeks old', age: 0.04, gender: 'female', expected: ['Swallowed Maternal Blood', 'NEC', 'GI Bleed', 'Vitamin K Deficiency'], urgency: 'emergent' },
  { id: 4176, cc: 'limping and refusing to walk, no injury, 2 year old with fever', age: 2, gender: 'male', expected: ['Septic Arthritis', 'Transient Synovitis', 'Osteomyelitis', 'Fracture'], urgency: 'urgent' },
  { id: 4177, cc: 'my 3 year old pulled away while I was holding his hand and now wont use that arm', age: 3, gender: 'male', expected: ['Nursemaid Elbow', 'Radial Head Subluxation', 'Annular Ligament'], urgency: 'urgent' },
  { id: 4178, cc: 'baby has a bulging soft spot with fever and vomiting', age: 0.25, gender: 'female', expected: ['Meningitis', 'Bacterial Meningitis', 'Increased Intracranial Pressure'], urgency: 'emergent' },
  { id: 4179, cc: 'my 8 year old has bedwetting thats getting worse, drinking a lot of water', age: 8, gender: 'male', expected: ['Type 1 Diabetes', 'Diabetes Mellitus', 'Diabetes Insipidus', 'UTI'], urgency: 'urgent' },
  { id: 4180, cc: 'rash and fever for 3 days then rash appeared as fever broke, 1 year old', age: 1, gender: 'female', expected: ['Roseola', 'Exanthem Subitum', 'HHV-6', 'Viral Exanthem'], urgency: 'routine' },

  // ========== GERIATRIC SPECIFIC (8) ==========
  { id: 4181, cc: 'my 85 year old mother is confused and not eating, just not herself', age: 85, gender: 'female', expected: ['Delirium', 'UTI', 'Urinary Tract Infection', 'Deconditioning', 'Failure to Thrive'], urgency: 'urgent' },
  { id: 4182, cc: 'keeps falling, fallen 3 times this month, on lots of medications', age: 80, gender: 'female', expected: ['Polypharmacy', 'Medication Effect', 'Orthostatic Hypotension', 'Deconditioning'], urgency: 'urgent' },
  { id: 4183, cc: 'confusion in my father who has liver cirrhosis, asterixis, belly is swollen', age: 70, gender: 'male', expected: ['Hepatic Encephalopathy', 'Decompensated Cirrhosis', 'Spontaneous Bacterial Peritonitis'], urgency: 'emergent' },
  { id: 4184, cc: 'hit her head in a fall 3 weeks ago, now getting progressively confused and headache', age: 78, gender: 'female', expected: ['Subdural Hematoma', 'Chronic Subdural'], urgency: 'emergent' },
  { id: 4185, cc: 'dark brown urine and severe leg pain after falling and lying on the floor for 2 days', age: 82, gender: 'male', expected: ['Rhabdomyolysis', 'Acute Kidney Injury', 'Crush Injury'], urgency: 'emergent' },
  { id: 4186, cc: 'sudden onset of garbled speech and right arm weakness 30 minutes ago', age: 75, gender: 'male', expected: ['Stroke', 'CVA', 'Ischemic Stroke', 'TIA'], urgency: 'emergent' },
  { id: 4187, cc: 'nursing home patient with productive cough fever and confusion', age: 88, gender: 'female', expected: ['Pneumonia', 'Sepsis', 'Aspiration Pneumonia'], urgency: 'emergent' },
  { id: 4188, cc: 'cant walk anymore, been getting weaker over months, losing weight', age: 78, gender: 'male', expected: ['Deconditioning', 'Malignancy', 'Heart Failure', 'Depression'], urgency: 'urgent' },

  // ========== EAR NOSE THROAT (8) ==========
  { id: 4189, cc: 'terrible ear pain and drainage coming out of my ear', age: 8, gender: 'male', expected: ['Otitis Media', 'Otitis Externa', 'Ear Infection'], urgency: 'urgent' },
  { id: 4190, cc: 'my nose wont stop bleeding, going on 30 minutes', age: 70, gender: 'male', expected: ['Epistaxis', 'Posterior Epistaxis', 'Anterior Epistaxis'], urgency: 'urgent' },
  { id: 4191, cc: 'sore throat so bad I cant swallow, voice sounds muffled, drooling', age: 28, gender: 'male', expected: ['Peritonsillar Abscess', 'Epiglottitis', 'Pharyngitis'], urgency: 'emergent' },
  { id: 4192, cc: 'sudden hearing loss in my left ear that happened this morning', age: 50, gender: 'female', expected: ['Sudden Sensorineural Hearing Loss', 'SSNHL', 'Hearing Loss'], urgency: 'emergent' },
  { id: 4193, cc: 'face pain and thick green nasal discharge for 10 days', age: 35, gender: 'female', expected: ['Sinusitis', 'Acute Sinusitis', 'Bacterial Sinusitis'], urgency: 'routine' },
  { id: 4194, cc: 'white patches on my tongue and inner cheeks that dont scrape off easily', age: 60, gender: 'male', expected: ['Oral Candidiasis', 'Thrush', 'Leukoplakia', 'Oral Cancer'], urgency: 'routine' },
  { id: 4195, cc: 'ringing in my ears getting louder with dizziness and hearing loss', age: 45, gender: 'female', expected: ['Meniere Disease', 'Tinnitus', 'Acoustic Neuroma'], urgency: 'routine' },
  { id: 4196, cc: 'lump on the side of my neck under my jaw that appeared last week', age: 35, gender: 'male', expected: ['Reactive Lymphadenopathy', 'Lymph Node', 'Lymphadenitis', 'Mononucleosis'], urgency: 'routine' },

  // ========== EYE (6) ==========
  { id: 4197, cc: 'sudden painless loss of vision in my right eye', age: 72, gender: 'male', expected: ['Central Retinal Artery Occlusion', 'Retinal Detachment', 'Retinal Vein Occlusion'], urgency: 'emergent' },
  { id: 4198, cc: 'red painful eye with decreased vision and halos around lights', age: 65, gender: 'female', expected: ['Acute Angle-Closure Glaucoma', 'Glaucoma', 'Uveitis', 'Iritis'], urgency: 'emergent' },
  { id: 4199, cc: 'both eyes are red and goopy, my kid brought it home from school', age: 7, gender: 'male', expected: ['Conjunctivitis', 'Pink Eye', 'Viral Conjunctivitis'], urgency: 'routine' },
  { id: 4200, cc: 'welding without a mask yesterday, now both eyes burn terribly', age: 30, gender: 'male', expected: ['Photokeratitis', 'UV Keratitis', 'Welder Flash', 'Corneal Burn'], urgency: 'urgent' },
  { id: 4201, cc: 'seeing flashing lights and floaters in my right eye', age: 58, gender: 'female', expected: ['Retinal Detachment', 'Posterior Vitreous Detachment', 'Retinal Tear'], urgency: 'emergent' },
  { id: 4202, cc: 'painful bump on my eyelid that is red and swollen', age: 25, gender: 'female', expected: ['Hordeolum', 'Stye', 'Chalazion', 'Preseptal Cellulitis'], urgency: 'routine' },

  // ========== DIZZINESS / SYNCOPE (8) ==========
  { id: 4203, cc: 'room is spinning when I roll over in bed', age: 45, gender: 'female', expected: ['BPPV', 'Benign Paroxysmal Positional Vertigo', 'Vertigo'], urgency: 'routine' },
  { id: 4204, cc: 'passed out while standing in line at the store, felt hot and lightheaded first', age: 22, gender: 'female', expected: ['Vasovagal Syncope', 'Syncope', 'Orthostatic'], urgency: 'routine' },
  { id: 4205, cc: 'passed out without warning while exercising, family history of sudden death', age: 18, gender: 'male', expected: ['Cardiac Syncope', 'Hypertrophic Cardiomyopathy', 'Long QT', 'Cardiac Arrhythmia', 'Arrhythmia'], urgency: 'emergent' },
  { id: 4206, cc: 'dizzy and lightheaded when I stand up too fast', age: 70, gender: 'male', expected: ['Orthostatic Hypotension', 'Dehydration', 'Medication Side Effect'], urgency: 'routine' },
  { id: 4207, cc: 'vertigo with hearing loss and ringing in one ear', age: 50, gender: 'female', expected: ['Meniere Disease'], urgency: 'urgent' },
  { id: 4208, cc: 'severe vertigo for 3 days with vomiting, cant walk straight, nystagmus', age: 55, gender: 'male', expected: ['Vestibular Neuritis', 'Labyrinthitis', 'Cerebellar Stroke', 'Stroke'], urgency: 'urgent' },
  { id: 4209, cc: 'feel like Im going to pass out, heart racing then slowing', age: 65, gender: 'male', expected: ['Cardiac Arrhythmia', 'Sick Sinus Syndrome', 'AV Block', 'Bradycardia'], urgency: 'emergent' },
  { id: 4210, cc: 'lightheaded and weak, been having black tarry stools', age: 60, gender: 'male', expected: ['GI Bleed', 'Gastrointestinal Bleeding', 'Upper GI Bleed', 'Peptic Ulcer'], urgency: 'emergent' },

  // ========== COUGH (6) ==========
  { id: 4211, cc: 'persistent dry cough for 3 months, I take lisinopril', age: 58, gender: 'female', expected: ['ACE Inhibitor Cough', 'Medication Side Effect', 'Chronic Cough'], urgency: 'routine' },
  { id: 4212, cc: 'cough with rust colored sputum and fever, short of breath', age: 45, gender: 'male', expected: ['Pneumonia', 'Community-Acquired Pneumonia'], urgency: 'urgent' },
  { id: 4213, cc: 'whooping cough sound, cough so hard I vomit', age: 4, gender: 'female', expected: ['Pertussis', 'Whooping Cough', 'Croup'], urgency: 'urgent' },
  { id: 4214, cc: 'smoked for 30 years, cough getting worse with blood in sputum', age: 62, gender: 'male', expected: ['Lung Cancer', 'COPD', 'Tuberculosis', 'Lung Malignancy', 'Pulmonary Tuberculosis'], urgency: 'urgent' },
  { id: 4215, cc: 'post nasal drip and cough for weeks after a cold', age: 35, gender: 'female', expected: ['Post-Nasal Drip', 'Upper Airway Cough Syndrome', 'Sinusitis', 'Allergic Rhinitis'], urgency: 'routine' },
  { id: 4216, cc: 'weed smoker throwing up every morning, hot showers are the only thing that helps', age: 25, gender: 'male', expected: ['Cannabinoid Hyperemesis Syndrome', 'CHS'], urgency: 'routine' },

  // ========== FATIGUE / WEAKNESS (6) ==========
  { id: 4217, cc: 'exhausted all the time, gaining weight, always cold, constipated', age: 45, gender: 'female', expected: ['Hypothyroidism', 'Hashimoto'], urgency: 'routine' },
  { id: 4218, cc: 'so tired I cant function, heavy periods, craving ice', age: 28, gender: 'female', expected: ['Iron Deficiency Anemia', 'Anemia'], urgency: 'routine' },
  { id: 4219, cc: 'fatigue for 6 months, swollen glands, had mono before', age: 20, gender: 'female', expected: ['Chronic Fatigue Syndrome', 'Mononucleosis', 'EBV', 'Depression'], urgency: 'routine' },
  { id: 4220, cc: 'peeing all the time, so thirsty, lost weight without trying', age: 35, gender: 'male', expected: ['Diabetes Mellitus', 'Type 2 Diabetes', 'Type 1 Diabetes', 'DKA'], urgency: 'urgent' },
  { id: 4221, cc: 'suddenly cant keep my eyes open, need 14 hours of sleep, hair falling out', age: 50, gender: 'female', expected: ['Hypothyroidism', 'Anemia', 'Depression'], urgency: 'routine' },
  { id: 4222, cc: 'weak and dizzy, salt craving, skin getting darker in creases', age: 38, gender: 'female', expected: ['Adrenal Insufficiency', 'Addison'], urgency: 'urgent' },

  // ========== DENTAL / ORAL (4) ==========
  { id: 4223, cc: 'terrible toothache swelling in my jaw and fever', age: 35, gender: 'male', expected: ['Dental Abscess', 'Periapical Abscess', 'Dental Infection'], urgency: 'urgent' },
  { id: 4224, cc: 'painful sores inside my mouth that keep coming back', age: 28, gender: 'female', expected: ['Aphthous Ulcer', 'Canker Sore', 'Aphthous Stomatitis', 'Oral Ulcer'], urgency: 'routine' },
  { id: 4225, cc: 'my jaw is locked open and I cant close my mouth', age: 30, gender: 'female', expected: ['TMJ Dislocation', 'TMJ Disorder', 'Mandibular Dislocation'], urgency: 'emergent' },
  { id: 4226, cc: 'got hit in the mouth and my tooth is loose and bleeding', age: 12, gender: 'male', expected: ['Dental Trauma', 'Tooth Avulsion', 'Dental Fracture', 'Dental Luxation'], urgency: 'urgent' },

  // ========== RECTAL / ANAL (4) ==========
  { id: 4227, cc: 'severe pain with bowel movements and bright red blood on the paper', age: 35, gender: 'female', expected: ['Anal Fissure', 'Hemorrhoids'], urgency: 'routine' },
  { id: 4228, cc: 'painful lump near my rectum with fever', age: 40, gender: 'male', expected: ['Perianal Abscess', 'Anorectal Abscess', 'Perirectal Abscess', 'Thrombosed Hemorrhoid'], urgency: 'urgent' },
  { id: 4229, cc: 'something coming out of my rectum when I have a bowel movement', age: 70, gender: 'female', expected: ['Rectal Prolapse', 'Hemorrhoids'], urgency: 'routine' },
  { id: 4230, cc: 'itching around my anus that is worse at night', age: 6, gender: 'male', expected: ['Pinworm', 'Pruritus Ani', 'Enterobiasis'], urgency: 'routine' },

  // ========== SLEEP (4) ==========
  { id: 4231, cc: 'cant sleep, been awake for 3 nights, mind racing', age: 40, gender: 'female', expected: ['Insomnia', 'Anxiety', 'Bipolar', 'Insomnia Disorder'], urgency: 'urgent' },
  { id: 4232, cc: 'husband says I stop breathing in my sleep and snore terribly', age: 55, gender: 'male', expected: ['Obstructive Sleep Apnea', 'Sleep Apnea', 'OSA'], urgency: 'routine' },
  { id: 4233, cc: 'legs feel restless at night and I have to keep moving them to sleep', age: 50, gender: 'female', expected: ['Restless Leg Syndrome', 'RLS'], urgency: 'routine' },
  { id: 4234, cc: 'falling asleep suddenly during the day, even while driving', age: 25, gender: 'male', expected: ['Narcolepsy', 'Sleep Apnea', 'Hypersomnia'], urgency: 'urgent' },

  // ========== WOUND / LACERATION (4) ==========
  { id: 4235, cc: 'cut my hand on a knife while cooking, wont stop bleeding', age: 40, gender: 'female', expected: ['Laceration', 'Hand Laceration'], urgency: 'urgent' },
  { id: 4236, cc: 'stepped on a rusty nail, when was my last tetanus shot', age: 35, gender: 'male', expected: ['Puncture Wound', 'Wound', 'Tetanus'], urgency: 'urgent' },
  { id: 4237, cc: 'road rash on my arms and legs from a motorcycle accident', age: 28, gender: 'male', expected: ['Abrasion', 'Road Rash', 'Laceration', 'Skin Avulsion'], urgency: 'urgent' },
  { id: 4238, cc: 'old wound on my shin that wont heal, been there for 2 months', age: 68, gender: 'female', expected: ['Chronic Wound', 'Venous Stasis Ulcer', 'Chronic Venous Ulcer', 'Diabetic Ulcer'], urgency: 'routine' },

  // ========== SUBSTANCE USE / OVERDOSE (6) ==========
  { id: 4239, cc: 'found unresponsive with pinpoint pupils and blue lips, needle marks on arms', age: 28, gender: 'male', expected: ['Opioid Overdose', 'Heroin Overdose'], urgency: 'emergent' },
  { id: 4240, cc: 'smoking marijuana daily for years, throwing up every morning, hot showers help', age: 24, gender: 'male', expected: ['Cannabinoid Hyperemesis Syndrome', 'CHS'], urgency: 'routine' },
  { id: 4241, cc: 'been drinking a fifth a day and decided to stop cold turkey yesterday', age: 48, gender: 'male', expected: ['Alcohol Withdrawal', 'Delirium Tremens'], urgency: 'emergent' },
  { id: 4242, cc: 'took molly at a concert and now heart racing high temperature confused', age: 21, gender: 'female', expected: ['MDMA Overdose', 'Stimulant Intoxication', 'Serotonin Syndrome', 'Substance Intoxication'], urgency: 'emergent' },
  { id: 4243, cc: 'crystal meth binge for 3 days, paranoid, seeing shadow people', age: 30, gender: 'male', expected: ['Stimulant-Induced Psychosis', 'Methamphetamine Intoxication', 'Psychotic Disorder', 'Substance Intoxication'], urgency: 'emergent' },
  { id: 4244, cc: 'cocaine chest pain, snorted cocaine an hour ago and now crushing chest pain', age: 35, gender: 'male', expected: ['Cocaine-Induced MI', 'Acute Coronary Syndrome', 'Substance Intoxication'], urgency: 'emergent' },

  // ========== AUTOIMMUNE / RHEUMATOLOGIC (6) ==========
  { id: 4245, cc: 'butterfly rash on my face with joint pain and mouth sores', age: 28, gender: 'female', expected: ['Systemic Lupus Erythematosus', 'SLE', 'Lupus'], urgency: 'urgent' },
  { id: 4246, cc: 'dry eyes dry mouth and joint pain', age: 50, gender: 'female', expected: ['Sjogren Syndrome', 'Sicca Syndrome'], urgency: 'routine' },
  { id: 4247, cc: 'skin tightening on my hands with raynauds and difficulty swallowing', age: 42, gender: 'female', expected: ['Scleroderma', 'Systemic Sclerosis', 'CREST'], urgency: 'urgent' },
  { id: 4248, cc: 'muscle weakness in my thighs and upper arms with a rash on my eyelids', age: 45, gender: 'female', expected: ['Dermatomyositis', 'Polymyositis'], urgency: 'urgent' },
  { id: 4249, cc: 'pain all over my body, fatigue, cant concentrate, sensitive to touch', age: 38, gender: 'female', expected: ['Fibromyalgia', 'Widespread Pain'], urgency: 'routine' },
  { id: 4250, cc: 'flushing and diarrhea and wheezing episodes', age: 55, gender: 'male', expected: ['Carcinoid Syndrome'], urgency: 'urgent' },

  // ========== ENDOCRINE (6) ==========
  { id: 4251, cc: 'episodic severe headache with sweating and racing heart and blood pressure spikes', age: 40, gender: 'female', expected: ['Pheochromocytoma'], urgency: 'urgent' },
  { id: 4252, cc: 'losing weight despite eating more, tremor, sweating, eyes bulging', age: 30, gender: 'female', expected: ['Hyperthyroidism', 'Graves Disease', 'Thyrotoxicosis'], urgency: 'urgent' },
  { id: 4253, cc: 'blood sugar of 450, fruity breath, nauseous and vomiting', age: 22, gender: 'male', expected: ['Diabetic Ketoacidosis', 'DKA'], urgency: 'emergent' },
  { id: 4254, cc: 'shaking sweating confused and blood sugar was 40', age: 55, gender: 'female', expected: ['Hypoglycemia', 'Insulin Overdose', 'Low Blood Sugar'], urgency: 'emergent' },
  { id: 4255, cc: 'round face, buffalo hump, stretch marks on belly, gaining weight', age: 40, gender: 'female', expected: ['Cushing Syndrome', 'Hypercortisolism'], urgency: 'routine' },
  { id: 4256, cc: 'feel terrible all the time, salt craving, dizzy when standing, skin darker', age: 35, gender: 'male', expected: ['Adrenal Insufficiency', 'Addison Disease'], urgency: 'urgent' },

  // ========== VASCULAR (4) ==========
  { id: 4257, cc: 'one leg is swollen red and warm, just had hip replacement surgery 2 weeks ago', age: 65, gender: 'female', expected: ['DVT', 'Deep Vein Thrombosis'], urgency: 'emergent' },
  { id: 4258, cc: 'my foot is cold and pale and I cant feel my toes', age: 70, gender: 'male', expected: ['Acute Limb Ischemia', 'Peripheral Arterial Disease', 'PAD'], urgency: 'emergent' },
  { id: 4259, cc: 'varicose veins that are now painful and hard', age: 55, gender: 'female', expected: ['Superficial Thrombophlebitis', 'Varicose Veins', 'DVT'], urgency: 'urgent' },
  { id: 4260, cc: 'fingers turn white then blue then red in the cold', age: 30, gender: 'female', expected: ['Raynaud', 'Raynaud Phenomenon'], urgency: 'routine' },

  // ========== HEMATOLOGIC (4) ==========
  { id: 4261, cc: 'bruising easily, bleeding gums, heavy periods, always tired', age: 25, gender: 'female', expected: ['Thrombocytopenia', 'ITP', 'Anemia', 'Von Willebrand Disease', 'Leukemia'], urgency: 'urgent' },
  { id: 4262, cc: 'taking warfarin and my INR is 8, seeing blood in urine', age: 72, gender: 'male', expected: ['Supratherapeutic Anticoagulation', 'Coagulopathy', 'Anticoagulant Effect', 'Warfarin Toxicity'], urgency: 'emergent' },
  { id: 4263, cc: 'sickle cell patient with severe pain crisis in chest and limbs', age: 22, gender: 'male', expected: ['Sickle Cell Crisis', 'Vaso-Occlusive Crisis', 'Acute Chest Syndrome'], urgency: 'emergent' },
  { id: 4264, cc: 'blood clot in my leg, family history, third time this has happened', age: 35, gender: 'female', expected: ['DVT', 'Deep Vein Thrombosis', 'Hypercoagulable', 'Thrombophilia'], urgency: 'urgent' },

  // ========== MISCELLANEOUS (36) — gap fillers for diverse coverage ==========
  { id: 4265, cc: 'my stool is pale and my urine is dark, Im itching all over', age: 60, gender: 'male', expected: ['Obstructive Jaundice', 'Bile Duct', 'Pancreatic Cancer', 'Cholestasis', 'Jaundice', 'Hepatitis'], urgency: 'urgent' },
  { id: 4266, cc: 'hiccups that wont stop for 3 days', age: 55, gender: 'male', expected: ['Intractable Hiccups', 'Persistent Hiccups', 'GERD', 'Phrenic Nerve'], urgency: 'routine' },
  { id: 4267, cc: 'food keeps getting stuck when I swallow, young guy', age: 25, gender: 'male', expected: ['Eosinophilic Esophagitis', 'Esophageal Stricture', 'Achalasia'], urgency: 'urgent' },
  { id: 4268, cc: 'swollen painful joint in my knee after a tick bite last month', age: 40, gender: 'male', expected: ['Lyme Disease', 'Lyme Arthritis', 'Septic Arthritis', 'Reactive Arthritis'], urgency: 'urgent' },
  { id: 4269, cc: 'mass in my abdomen that I can feel getting bigger', age: 60, gender: 'female', expected: ['Ovarian Cancer', 'Abdominal Mass', 'Malignancy', 'Fibroids'], urgency: 'urgent' },
  { id: 4270, cc: 'I got kicked in the side during soccer and Im peeing blood', age: 16, gender: 'male', expected: ['Kidney Contusion', 'Renal Trauma', 'Splenic Injury', 'Hematuria'], urgency: 'emergent' },
  { id: 4271, cc: 'parotid gland swollen on both sides, looks like chipmunk cheeks', age: 8, gender: 'male', expected: ['Mumps', 'Parotitis', 'Viral Parotitis'], urgency: 'routine' },
  { id: 4272, cc: 'Im having trouble breathing, my throat is closing up, I just ate peanuts', age: 12, gender: 'female', expected: ['Anaphylaxis', 'Allergic Reaction', 'Food Allergy'], urgency: 'emergent' },
  { id: 4273, cc: 'chronic runny nose on one side with foul smell, toddler', age: 2.5, gender: 'male', expected: ['Nasal Foreign Body', 'Foreign Body', 'Sinusitis'], urgency: 'urgent' },
  { id: 4274, cc: 'my shoulder came out of the socket playing football', age: 20, gender: 'male', expected: ['Shoulder Dislocation', 'Anterior Dislocation', 'Glenohumeral Dislocation'], urgency: 'emergent' },
  { id: 4275, cc: 'hand swollen and hurts after punching a wall', age: 22, gender: 'male', expected: ['Boxer Fracture', 'Metacarpal Fracture', 'Hand Fracture', 'Fracture'], urgency: 'urgent' },
  { id: 4276, cc: 'red eye pain and sensitivity to light, had eye surgery recently', age: 65, gender: 'female', expected: ['Endophthalmitis', 'Uveitis', 'Iritis', 'Post-Operative Infection', 'Acute Angle-Closure Glaucoma'], urgency: 'emergent' },
  { id: 4277, cc: 'recurrent kidney stones, 4th episode this year', age: 38, gender: 'male', expected: ['Kidney Stone', 'Nephrolithiasis', 'Hyperparathyroidism', 'Metabolic Stone Disease'], urgency: 'urgent' },
  { id: 4278, cc: 'chest wall pain after going on a roller coaster', age: 17, gender: 'female', expected: ['Costochondritis', 'Chest Wall Pain', 'Musculoskeletal'], urgency: 'routine' },
  { id: 4279, cc: 'confusion in my alcoholic brother, stumbling, eye movements are weird', age: 50, gender: 'male', expected: ['Wernicke Encephalopathy', 'Hepatic Encephalopathy', 'Alcohol Intoxication'], urgency: 'emergent' },
  { id: 4280, cc: 'my POTS keeps acting up, heart races when I stand', age: 24, gender: 'female', expected: ['Postural Tachycardia', 'POTS', 'Postural Orthostatic Tachycardia'], urgency: 'routine' },
  { id: 4281, cc: 'excessive thirst and urination, also losing weight', age: 12, gender: 'male', expected: ['Type 1 Diabetes', 'Diabetes Mellitus', 'DKA', 'Diabetic Ketoacidosis'], urgency: 'urgent' },
  { id: 4282, cc: 'arm went numb and I dropped things but it came back after 10 minutes', age: 60, gender: 'male', expected: ['TIA', 'Transient Ischemic Attack', 'Stroke'], urgency: 'emergent' },
  { id: 4283, cc: 'neck swelling, difficulty breathing, recently had a dental procedure', age: 35, gender: 'male', expected: ['Ludwig Angina', 'Deep Neck Infection', 'Dental Abscess', 'Angioedema'], urgency: 'emergent' },
  { id: 4284, cc: 'chest pain and difficulty breathing, Im 25 weeks pregnant', age: 30, gender: 'female', expected: ['Pulmonary Embolism', 'Preeclampsia', 'Peripartum Cardiomyopathy'], urgency: 'emergent' },
  { id: 4285, cc: 'my baby has a flat spot on the back of his head', age: 0.25, gender: 'male', expected: ['Positional Plagiocephaly', 'Plagiocephaly', 'Craniosynostosis'], urgency: 'routine' },
  { id: 4286, cc: 'chronic pain everywhere since my car accident, also having headaches and cant sleep', age: 42, gender: 'female', expected: ['Fibromyalgia', 'Post-Traumatic', 'Chronic Pain Syndrome', 'Widespread Pain'], urgency: 'routine' },
  { id: 4287, cc: 'genital warts that keep coming back', age: 25, gender: 'male', expected: ['HPV', 'Condylomata', 'Genital Warts', 'Human Papillomavirus'], urgency: 'routine' },
  { id: 4288, cc: 'heel pain worst with first steps in the morning', age: 45, gender: 'female', expected: ['Plantar Fasciitis', 'Heel Spur', 'Achilles Tendinitis'], urgency: 'routine' },
  { id: 4289, cc: 'I think I have a hernia, bulge in my groin that comes and goes', age: 50, gender: 'male', expected: ['Inguinal Hernia', 'Hernia'], urgency: 'routine' },
  { id: 4290, cc: 'sharp pain in my side when I take a deep breath and cough', age: 40, gender: 'male', expected: ['Pleurisy', 'Costochondritis', 'Pneumonia', 'Rib Fracture'], urgency: 'urgent' },
  { id: 4291, cc: 'blood blisters in my mouth and nosebleeds, bruises on legs', age: 60, gender: 'female', expected: ['Thrombocytopenia', 'ITP', 'Leukemia', 'Aplastic Anemia', 'Coagulopathy'], urgency: 'urgent' },
  { id: 4292, cc: 'my ankles swell up by the end of the day', age: 55, gender: 'female', expected: ['Chronic Venous Insufficiency', 'DVT', 'Heart Failure', 'Leg Edema', 'Peripheral Edema'], urgency: 'routine' },
  { id: 4293, cc: 'pins and needles in my feet, diabetic', age: 60, gender: 'male', expected: ['Diabetic Neuropathy', 'Peripheral Neuropathy', 'Neuropathy'], urgency: 'routine' },
  { id: 4294, cc: 'woke up and cant move the right side of my face', age: 35, gender: 'male', expected: ['Bell Palsy', 'Facial Nerve Palsy', 'Stroke'], urgency: 'urgent' },
  { id: 4295, cc: 'severe belly pain in a child with rash on legs and butt, joint pain', age: 7, gender: 'male', expected: ['Henoch-Schonlein Purpura', 'HSP', 'IgA Vasculitis'], urgency: 'urgent' },
  { id: 4296, cc: 'pregnant and my leg is really swollen and painful, 34 weeks', age: 28, gender: 'female', expected: ['DVT', 'Deep Vein Thrombosis', 'Preeclampsia'], urgency: 'emergent' },
  { id: 4297, cc: 'pain in my elbow on the outside when I grip things or twist my arm', age: 38, gender: 'male', expected: ['Lateral Epicondylitis', 'Tennis Elbow', 'Tendinitis'], urgency: 'routine' },
  { id: 4298, cc: 'my newborn has a yellow color to the skin and whites of eyes', age: 0.01, gender: 'male', expected: ['Neonatal Jaundice', 'Physiologic Jaundice', 'Jaundice', 'Hyperbilirubinemia'], urgency: 'urgent' },
  { id: 4299, cc: 'pain in my thumb base, hard to open jars', age: 55, gender: 'female', expected: ['CMC Arthritis', 'Thumb Arthritis', 'Osteoarthritis', 'De Quervain'], urgency: 'routine' },
  { id: 4300, cc: 'weird heart rhythm and Im dizzy, on digoxin and they just added a new medication', age: 75, gender: 'female', expected: ['Drug-Induced QT Prolongation', 'Cardiac Arrhythmia', 'Medication Side Effect', 'Adverse Drug Reaction', 'Digoxin Toxicity'], urgency: 'emergent' },

  // ========== ADDITIONAL GAP FILLERS (200 more to reach ~500) ==========
  // Cardiac
  { id: 4301, cc: 'woke up short of breath, cant lay flat, gained 10 pounds in a week from fluid', age: 72, gender: 'male', expected: ['Congestive Heart Failure', 'Heart Failure', 'CHF'], urgency: 'emergent' },
  { id: 4302, cc: 'swelling in legs that leaves dents when I press on them', age: 65, gender: 'female', expected: ['Heart Failure', 'DVT', 'Chronic Venous Insufficiency', 'Nephrotic Syndrome', 'Peripheral Edema'], urgency: 'urgent' },
  { id: 4303, cc: 'pounding heartbeat in my neck and throat felt like a fish flopping', age: 40, gender: 'female', expected: ['SVT', 'Supraventricular Tachycardia', 'Atrial Fibrillation', 'Palpitations', 'Cardiac Arrhythmia'], urgency: 'urgent' },

  // Respiratory
  { id: 4304, cc: 'asthma attack not responding to my rescue inhaler, lips turning blue', age: 8, gender: 'male', expected: ['Status Asthmaticus', 'Severe Asthma', 'Asthma Exacerbation'], urgency: 'emergent' },
  { id: 4305, cc: 'coughing up large amounts of thick green sputum every morning for years, smoker', age: 60, gender: 'male', expected: ['COPD', 'Chronic Bronchitis', 'Bronchiectasis'], urgency: 'routine' },

  // GI
  { id: 4306, cc: 'been throwing up nonstop and now my vomit looks like coffee grounds', age: 65, gender: 'male', expected: ['GI Bleed', 'Upper GI Bleed', 'Gastrointestinal Bleeding', 'Peptic Ulcer'], urgency: 'emergent' },
  { id: 4307, cc: 'diarrhea after antibiotics for 2 weeks, really watery and smells terrible', age: 70, gender: 'female', expected: ['C. difficile', 'Clostridioides difficile', 'Antibiotic-Associated Diarrhea'], urgency: 'urgent' },
  { id: 4308, cc: 'bloating gas and diarrhea whenever I eat bread or pasta', age: 30, gender: 'female', expected: ['Celiac Disease', 'Gluten Intolerance', 'IBS', 'Irritable Bowel'], urgency: 'routine' },
  { id: 4309, cc: 'projectile vomiting in my 4 week old son after every bottle, always hungry', age: 0.08, gender: 'male', expected: ['Pyloric Stenosis'], urgency: 'emergent' },
  { id: 4310, cc: 'belly swollen like Im pregnant but Im not, fluid accumulation', age: 55, gender: 'male', expected: ['Ascites', 'Cirrhosis', 'Liver Disease', 'Heart Failure', 'Ovarian Cancer'], urgency: 'urgent' },

  // Ortho
  { id: 4311, cc: 'fell on outstretched hand, wrist is deformed and swollen', age: 65, gender: 'female', expected: ['Distal Radius Fracture', 'Colles Fracture', 'Wrist Fracture', 'Fracture'], urgency: 'urgent' },
  { id: 4312, cc: 'snapped my achilles playing basketball, felt like someone kicked me', age: 35, gender: 'male', expected: ['Achilles Tendon Rupture', 'Achilles Rupture'], urgency: 'urgent' },
  { id: 4313, cc: 'cant straighten my finger after it got jammed playing volleyball', age: 18, gender: 'female', expected: ['Mallet Finger', 'Extensor Tendon Injury', 'Finger Fracture', 'Tendon Injury'], urgency: 'urgent' },

  // Neuro
  { id: 4314, cc: 'numbness around my mouth and tingling in both hands, breathing fast', age: 20, gender: 'female', expected: ['Hyperventilation', 'Panic Attack', 'Anxiety'], urgency: 'routine' },
  { id: 4315, cc: 'episodic spells of deja vu with lip smacking and staring, cant remember after', age: 28, gender: 'male', expected: ['Temporal Lobe Epilepsy', 'Focal Seizure', 'Seizure', 'Complex Partial Seizure'], urgency: 'urgent' },
  { id: 4316, cc: 'electric shock sensation down my spine when I bend my neck forward', age: 35, gender: 'female', expected: ['Multiple Sclerosis', 'Cervical Myelopathy', 'Lhermitte Sign'], urgency: 'urgent' },

  // Dermatology
  { id: 4317, cc: 'target-shaped red rings on my skin, multiple circles', age: 25, gender: 'male', expected: ['Erythema Multiforme', 'Lyme Disease', 'Drug Eruption'], urgency: 'urgent' },
  { id: 4318, cc: 'painless ulcer on my genitals for a week', age: 30, gender: 'male', expected: ['Syphilis', 'Primary Syphilis', 'Chancre', 'Genital Herpes'], urgency: 'urgent' },
  { id: 4319, cc: 'patches of white skin appearing on my face and hands', age: 20, gender: 'female', expected: ['Vitiligo', 'Tinea Versicolor', 'Pityriasis'], urgency: 'routine' },

  // ENT
  { id: 4320, cc: 'vertigo and nausea after an upper respiratory infection', age: 40, gender: 'female', expected: ['Vestibular Neuritis', 'Labyrinthitis', 'BPPV'], urgency: 'urgent' },
  { id: 4321, cc: 'difficulty hearing gradually getting worse in both ears', age: 65, gender: 'male', expected: ['Presbycusis', 'Age-Related Hearing Loss', 'Sensorineural Hearing Loss'], urgency: 'routine' },

  // Renal
  { id: 4322, cc: 'foamy urine and swelling around my eyes in the morning', age: 30, gender: 'male', expected: ['Nephrotic Syndrome', 'Glomerulonephritis', 'Proteinuria'], urgency: 'urgent' },

  // Infectious
  { id: 4323, cc: 'high fever rigors right sided flank pain cloudy smelly urine', age: 28, gender: 'female', expected: ['Pyelonephritis', 'Kidney Infection', 'Urosepsis'], urgency: 'urgent' },
  { id: 4324, cc: 'painful grouped vesicles on my lip, tingling before they appeared', age: 25, gender: 'female', expected: ['Herpes Simplex', 'Cold Sore', 'HSV-1', 'Oral Herpes'], urgency: 'routine' },
  { id: 4325, cc: 'swollen red hot painful joint in my knee, I have a fever', age: 55, gender: 'male', expected: ['Septic Arthritis', 'Gout'], urgency: 'emergent' },
  { id: 4326, cc: 'travelled to Caribbean, fever joint pain and rash', age: 32, gender: 'female', expected: ['Chikungunya', 'Dengue', 'Zika', 'Travel-Related Infection'], urgency: 'urgent' },

  // Peds
  { id: 4327, cc: 'my 5 year old has sandpaper-like rash with sore throat and strawberry tongue', age: 5, gender: 'male', expected: ['Scarlet Fever', 'Strep', 'Streptococcal'], urgency: 'urgent' },
  { id: 4328, cc: 'baby keeps turning head to one side, flat spot developing', age: 0.17, gender: 'female', expected: ['Torticollis', 'Plagiocephaly', 'Positional Plagiocephaly'], urgency: 'routine' },
  { id: 4329, cc: 'toddler with high fever and crying when peeing, no other symptoms', age: 1.5, gender: 'female', expected: ['Urinary Tract Infection', 'UTI'], urgency: 'urgent' },

  // Geri
  { id: 4330, cc: 'hip pain after a fall, cant bear weight, leg looks shortened and rotated', age: 85, gender: 'female', expected: ['Hip Fracture', 'Femoral Neck Fracture', 'Fracture'], urgency: 'emergent' },
  { id: 4331, cc: 'gradually cant swallow pills anymore, coughing when drinking liquids', age: 80, gender: 'male', expected: ['Dysphagia', 'Aspiration Risk', 'Esophageal Stricture', 'Stroke', 'Neurogenic Dysphagia'], urgency: 'urgent' },

  // OB/GYN
  { id: 4332, cc: 'water broke at 34 weeks and having contractions', age: 30, gender: 'female', expected: ['Preterm Labor', 'Premature Rupture of Membranes', 'PPROM'], urgency: 'emergent' },
  { id: 4333, cc: 'vaginal discharge that is fishy smelling', age: 28, gender: 'female', expected: ['Bacterial Vaginosis', 'Vaginitis', 'Trichomoniasis'], urgency: 'routine' },
  { id: 4334, cc: 'post menopausal vaginal bleeding, Im 65', age: 65, gender: 'female', expected: ['Endometrial Cancer', 'Atrophic Vaginitis', 'Endometrial Polyp', 'Postmenopausal Bleeding'], urgency: 'urgent' },

  // Psych
  { id: 4335, cc: 'flashbacks and nightmares about a car accident 6 months ago, cant sleep', age: 30, gender: 'male', expected: ['PTSD', 'Post-Traumatic Stress Disorder'], urgency: 'urgent' },
  { id: 4336, cc: 'my teenager wont eat, lost 30 pounds, exercises obsessively', age: 16, gender: 'female', expected: ['Anorexia Nervosa', 'Eating Disorder'], urgency: 'urgent' },

  // Burns additional
  { id: 4337, cc: 'acid battery exploded in my face at the auto shop', age: 35, gender: 'male', expected: ['Chemical Burn', 'Caustic Burn', 'Acid Burn', 'Ocular Chemical Burn'], urgency: 'emergent' },
  { id: 4338, cc: 'rope burn on my hands from rock climbing', age: 25, gender: 'female', expected: ['Friction Burn', 'Abrasion', 'First Degree Burn', 'Skin Avulsion'], urgency: 'routine' },

  // Medication side effect additional
  { id: 4339, cc: 'my gums are swollen and bleeding since starting my new seizure medication', age: 28, gender: 'male', expected: ['Drug-Induced Gingival Hyperplasia', 'Medication Side Effect', 'Adverse Drug Reaction'], urgency: 'routine' },
  { id: 4340, cc: 'ringing in my ears since they increased my aspirin dose', age: 60, gender: 'male', expected: ['Ototoxicity', 'Medication Side Effect', 'Tinnitus', 'Adverse Drug Reaction'], urgency: 'routine' },

  // Cancer additional
  { id: 4341, cc: 'bone pain in my back and hips, lost weight, PSA was high', age: 72, gender: 'male', expected: ['Prostate Cancer', 'Metastatic Cancer', 'Bone Metastasis', 'Malignancy'], urgency: 'urgent' },
  { id: 4342, cc: 'persistent cough and hemoptysis, used to work with asbestos', age: 68, gender: 'male', expected: ['Mesothelioma', 'Lung Cancer', 'Asbestosis', 'Lung Malignancy'], urgency: 'urgent' },

  // TB additional
  { id: 4343, cc: 'chronic cough productive of sputum for 6 weeks, lost 15 pounds, immigrant from Philippines', age: 35, gender: 'male', expected: ['Pulmonary Tuberculosis', 'Tuberculosis', 'TB'], urgency: 'urgent' },
  { id: 4344, cc: 'family member just diagnosed with active TB, I need screening', age: 30, gender: 'female', expected: ['Latent TB', 'Tuberculosis', 'TB Exposure', 'TB Screening'], urgency: 'urgent' },

  // Allergy additional
  { id: 4345, cc: 'lip and tongue swelling, take lisinopril', age: 55, gender: 'male', expected: ['ACE Inhibitor Angioedema', 'Angioedema', 'Allergic Reaction'], urgency: 'emergent' },
  { id: 4346, cc: 'itchy raised welts all over after being stung by a bee', age: 35, gender: 'female', expected: ['Urticaria', 'Allergic Reaction', 'Hives'], urgency: 'urgent' },

  // Environmental additional
  { id: 4347, cc: 'got lightning struck while golfing, confused and my arm is numb', age: 45, gender: 'male', expected: ['Lightning Strike', 'Electrical Injury', 'Burns'], urgency: 'emergent' },
  { id: 4348, cc: 'nose and throat burning after exposure to chlorine gas at the pool', age: 30, gender: 'female', expected: ['Chemical Inhalation', 'Toxic Gas Exposure', 'Chemical Exposure', 'Inhalation Injury'], urgency: 'urgent' },

  // Diverse musculoskeletal
  { id: 4349, cc: 'clicking and locking in my jaw, cant open my mouth all the way', age: 28, gender: 'female', expected: ['TMJ Disorder', 'TMJ', 'Temporomandibular'], urgency: 'routine' },
  { id: 4350, cc: 'lateral hip pain worse when lying on that side at night', age: 50, gender: 'female', expected: ['Trochanteric Bursitis', 'Greater Trochanteric Pain', 'Hip Bursitis', 'Hip Osteoarthritis'], urgency: 'routine' },

  // Misc
  { id: 4351, cc: 'eyes and skin yellow, dark urine, very itchy', age: 50, gender: 'male', expected: ['Hepatitis', 'Cholestasis', 'Obstructive Jaundice', 'Jaundice', 'Pancreatic Cancer'], urgency: 'urgent' },
  { id: 4352, cc: 'my incision from surgery last week is red swollen and draining pus', age: 45, gender: 'female', expected: ['Surgical Site Infection', 'Wound Infection', 'Cellulitis', 'Abscess'], urgency: 'urgent' },
  { id: 4353, cc: 'chronic fatigue body aches and a rash after a tick bite last summer', age: 42, gender: 'male', expected: ['Lyme Disease', 'Post-Treatment Lyme', 'Fibromyalgia'], urgency: 'routine' },
  { id: 4354, cc: 'swollen testicle with pain that gets better when I elevate it', age: 25, gender: 'male', expected: ['Epididymitis', 'Orchitis'], urgency: 'urgent' },
  { id: 4355, cc: 'red streak going up my arm from a wound on my hand', age: 35, gender: 'male', expected: ['Lymphangitis', 'Cellulitis', 'Ascending Infection'], urgency: 'urgent' },
  { id: 4356, cc: 'chest pain and shortness of breath after snorting cocaine', age: 30, gender: 'male', expected: ['Cocaine-Induced MI', 'Acute Coronary Syndrome', 'Pneumothorax', 'Substance Intoxication'], urgency: 'emergent' },
  { id: 4357, cc: 'pain worse when I swallow, fever, one side of my throat is really swollen', age: 22, gender: 'male', expected: ['Peritonsillar Abscess', 'Strep Throat', 'Pharyngitis'], urgency: 'urgent' },
  { id: 4358, cc: 'blood in my semen', age: 35, gender: 'male', expected: ['Hematospermia', 'Prostatitis', 'STI'], urgency: 'routine' },
  { id: 4359, cc: 'my child fell off the monkey bars and wont move her arm, holding it close', age: 5, gender: 'female', expected: ['Fracture', 'Nursemaid Elbow', 'Radial Head Subluxation', 'Elbow Fracture'], urgency: 'urgent' },
  { id: 4360, cc: 'terrible abdominal cramps, watery diarrhea, just got back from Mexico', age: 30, gender: 'male', expected: ['Traveler\'s Diarrhea', 'Gastroenteritis', 'Food Poisoning', 'Parasitic Infection'], urgency: 'urgent' },
  { id: 4361, cc: 'weakness in my legs getting worse, having trouble walking, bladder problems', age: 35, gender: 'female', expected: ['Multiple Sclerosis', 'Spinal Cord Compression', 'Transverse Myelitis', 'Guillain-Barre'], urgency: 'urgent' },
  { id: 4362, cc: 'puffy face and weight gain since starting prednisone for my asthma', age: 40, gender: 'female', expected: ['Cushing Syndrome', 'Medication Side Effect', 'Steroid Side Effect', 'Adverse Drug Reaction'], urgency: 'routine' },
  { id: 4363, cc: 'blood on my pillow, ear drainage overnight', age: 4, gender: 'male', expected: ['Otitis Media with Rupture', 'Ruptured Tympanic Membrane', 'Otitis Media', 'Ear Infection'], urgency: 'urgent' },
  { id: 4364, cc: 'red raised itchy streaks on my arms after working in the garden', age: 45, gender: 'female', expected: ['Contact Dermatitis', 'Poison Ivy', 'Allergic Contact Dermatitis', 'Plant Dermatitis'], urgency: 'routine' },
  { id: 4365, cc: 'random episodes where everything tastes metallic and I feel weird before a seizure', age: 30, gender: 'male', expected: ['Epilepsy', 'Focal Seizure', 'Aura', 'Temporal Lobe Epilepsy', 'Seizure'], urgency: 'urgent' },
  { id: 4366, cc: 'tremor worse with action, family history of tremor, better with alcohol', age: 45, gender: 'male', expected: ['Essential Tremor', 'Familial Tremor'], urgency: 'routine' },
  { id: 4367, cc: 'sudden hearing loss tinnitus and vertigo attacks lasting hours', age: 40, gender: 'female', expected: ['Meniere Disease', 'Sudden Hearing Loss'], urgency: 'urgent' },
  { id: 4368, cc: 'I tripped and fell on my outstretched hand, snuffbox area is tender', age: 25, gender: 'male', expected: ['Scaphoid Fracture', 'Wrist Fracture', 'Fracture'], urgency: 'urgent' },
  { id: 4369, cc: 'stool leaking without control, cant make it to the bathroom in time', age: 70, gender: 'female', expected: ['Fecal Incontinence', 'Rectal Prolapse', 'Anal Sphincter Dysfunction'], urgency: 'routine' },
  { id: 4370, cc: 'swallowed a chicken bone and now it hurts when I swallow', age: 60, gender: 'male', expected: ['Foreign Body', 'Esophageal Foreign Body', 'Esophageal Perforation'], urgency: 'urgent' },

  // More OB
  { id: 4371, cc: 'leaking fluid from my vagina at 28 weeks pregnant', age: 27, gender: 'female', expected: ['PPROM', 'Premature Rupture of Membranes', 'Preterm Labor'], urgency: 'emergent' },
  { id: 4372, cc: 'just had my baby and I feel like Im going to hurt the baby', age: 24, gender: 'female', expected: ['Postpartum Psychosis', 'Postpartum Depression'], urgency: 'emergent' },

  // More peds
  { id: 4373, cc: 'child limping and wont bear weight, no history of injury, age 4', age: 4, gender: 'male', expected: ['Transient Synovitis', 'Septic Arthritis', 'Osteomyelitis', 'Toddler Fracture'], urgency: 'urgent' },
  { id: 4374, cc: 'my infant has noisy breathing that sounds like a rooster crowing when inhaling', age: 0.25, gender: 'male', expected: ['Laryngomalacia', 'Stridor', 'Croup'], urgency: 'urgent' },

  // More cardiac
  { id: 4375, cc: 'severe crushing chest pain radiating to jaw in a diabetic woman', age: 65, gender: 'female', expected: ['Acute Coronary Syndrome', 'STEMI', 'Myocardial Infarction', 'NSTEMI'], urgency: 'emergent' },
  { id: 4376, cc: 'heart murmur found on physical exam, getting more short of breath', age: 70, gender: 'male', expected: ['Aortic Stenosis', 'Valvular Heart Disease', 'Heart Failure'], urgency: 'urgent' },

  // More neuro
  { id: 4377, cc: 'child had a seizure lasting 20 minutes and is still seizing', age: 5, gender: 'male', expected: ['Status Epilepticus', 'Seizure', 'Febrile Seizure', 'Epilepsy'], urgency: 'emergent' },
  { id: 4378, cc: 'progressive weakness going up from feet, lost reflexes, after a flu', age: 30, gender: 'male', expected: ['Guillain-Barre Syndrome', 'GBS', 'Ascending Weakness'], urgency: 'emergent' },

  // More GI
  { id: 4379, cc: 'cant stop vomiting for 3 days, cannabis user, only hot baths help', age: 23, gender: 'male', expected: ['Cannabinoid Hyperemesis Syndrome', 'CHS'], urgency: 'urgent' },
  { id: 4380, cc: 'massive bright red blood per rectum, feel faint, heart racing', age: 65, gender: 'male', expected: ['GI Bleed', 'Gastrointestinal Bleeding', 'Diverticular Bleeding', 'Lower GI Bleed'], urgency: 'emergent' },

  // More skin
  { id: 4381, cc: 'peeling blistering skin rash after starting allopurinol, painful mouth sores', age: 50, gender: 'male', expected: ['Stevens-Johnson Syndrome', 'TEN', 'Drug Eruption', 'Toxic Epidermal Necrolysis'], urgency: 'emergent' },

  // More infectious
  { id: 4382, cc: 'high fever and confusion with a stiff neck, college freshman in the dorms', age: 18, gender: 'male', expected: ['Meningitis', 'Bacterial Meningitis', 'Meningococcal'], urgency: 'emergent' },
  { id: 4383, cc: 'red painful swollen area on my shin with spreading redness and red streaks', age: 45, gender: 'male', expected: ['Cellulitis', 'Lymphangitis', 'Skin Infection'], urgency: 'urgent' },

  // More endocrine
  { id: 4384, cc: 'very thirsty peeing constantly losing weight, child', age: 10, gender: 'male', expected: ['Type 1 Diabetes', 'Diabetes Mellitus', 'DKA'], urgency: 'urgent' },

  // More ortho
  { id: 4385, cc: 'severe forearm pain and swelling after falling off bike, compartment feels tight', age: 20, gender: 'male', expected: ['Compartment Syndrome', 'Fracture', 'Forearm Fracture'], urgency: 'emergent' },

  // More psych
  { id: 4386, cc: 'seeing things that arent there and very paranoid, using crystal meth', age: 28, gender: 'male', expected: ['Stimulant-Induced Psychosis', 'Psychotic Disorder', 'Methamphetamine', 'Substance Intoxication'], urgency: 'emergent' },

  // More dental
  { id: 4387, cc: 'swelling under my chin spreading down my neck, cant swallow, recent tooth infection', age: 40, gender: 'male', expected: ['Ludwig Angina', 'Deep Neck Space Infection', 'Dental Abscess'], urgency: 'emergent' },

  // More eye
  { id: 4388, cc: 'eye is swollen shut red and painful, cant move it, fever', age: 5, gender: 'male', expected: ['Orbital Cellulitis', 'Periorbital Cellulitis', 'Preseptal Cellulitis'], urgency: 'emergent' },

  // More vascular
  { id: 4389, cc: 'sudden severe abdominal pain after heart surgery, bloody stool', age: 72, gender: 'male', expected: ['Mesenteric Ischemia', 'Ischemic Colitis', 'GI Bleed'], urgency: 'emergent' },

  // More environmental
  { id: 4390, cc: 'scuba diving and now have joint pain and skin rash, feel dizzy', age: 35, gender: 'male', expected: ['Decompression Sickness', 'The Bends', 'Barotrauma'], urgency: 'emergent' },

  // Fill to 500 with diverse edge cases
  { id: 4391, cc: 'chronic pain in both hands worse in the morning for months', age: 55, gender: 'female', expected: ['Rheumatoid Arthritis', 'Osteoarthritis', 'Carpal Tunnel'], urgency: 'routine' },
  { id: 4392, cc: 'swollen painful calf after a long car ride', age: 45, gender: 'female', expected: ['DVT', 'Deep Vein Thrombosis', 'Muscle Strain', 'Baker Cyst'], urgency: 'urgent' },
  { id: 4393, cc: 'bright red painless rectal bleeding after straining', age: 40, gender: 'male', expected: ['Hemorrhoids', 'Anal Fissure', 'Rectal Polyp'], urgency: 'routine' },
  { id: 4394, cc: 'tender bump behind my ear with fever', age: 3, gender: 'male', expected: ['Mastoiditis', 'Lymphadenitis', 'Otitis Media'], urgency: 'urgent' },
  { id: 4395, cc: 'hair loss in round patches on my scalp', age: 15, gender: 'female', expected: ['Alopecia Areata', 'Tinea Capitis', 'Traction Alopecia'], urgency: 'routine' },
  { id: 4396, cc: 'severe stomach pain and I just ate at a sushi restaurant', age: 30, gender: 'female', expected: ['Food Poisoning', 'Gastroenteritis', 'Anisakiasis', 'Allergic Reaction'], urgency: 'urgent' },
  { id: 4397, cc: 'numbness and tingling around my mouth after a dental procedure', age: 40, gender: 'male', expected: ['Inferior Alveolar Nerve', 'Dental Anesthesia', 'Nerve Injury', 'Paresthesia'], urgency: 'routine' },
  { id: 4398, cc: 'sharp pain on the bottom of my foot when I walk, feels like stepping on a pebble', age: 50, gender: 'female', expected: ['Morton Neuroma', 'Plantar Fasciitis', 'Metatarsalgia', 'Plantar Wart'], urgency: 'routine' },
  { id: 4399, cc: 'pain in my chest with a rash that looks like shingles but Im only 25', age: 25, gender: 'male', expected: ['Herpes Zoster', 'Shingles', 'Costochondritis'], urgency: 'urgent' },
  { id: 4400, cc: 'itching all over but no rash, been going on for weeks', age: 55, gender: 'male', expected: ['Pruritus', 'Cholestasis', 'Liver Disease', 'Lymphoma', 'Chronic Kidney Disease', 'Polycythemia Vera'], urgency: 'routine' },

  // ========== FINAL 100 — maximum diversity ==========
  { id: 4401, cc: 'excessive drooling and fussiness in my 8 month old, chewing on everything', age: 0.67, gender: 'male', expected: ['Teething', 'Oral Thrush', 'Hand Foot and Mouth'], urgency: 'routine' },
  { id: 4402, cc: 'belly button area red oozing and smelly in my newborn', age: 0.02, gender: 'female', expected: ['Omphalitis', 'Umbilical Infection', 'Umbilical Granuloma'], urgency: 'urgent' },
  { id: 4403, cc: 'one eye looks bigger than the other, white reflex in flash photos', age: 1, gender: 'male', expected: ['Retinoblastoma', 'Leukocoria', 'Congenital Cataract'], urgency: 'emergent' },
  { id: 4404, cc: 'foot drop, cant lift my foot when walking, tripping a lot', age: 45, gender: 'male', expected: ['Peroneal Nerve Palsy', 'L5 Radiculopathy', 'Foot Drop', 'Peripheral Neuropathy'], urgency: 'urgent' },
  { id: 4405, cc: 'my tongue is swollen and I cant breathe well, Im on lisinopril', age: 60, gender: 'male', expected: ['Angioedema', 'ACE Inhibitor Angioedema', 'Allergic Reaction'], urgency: 'emergent' },
  { id: 4406, cc: 'peeing orange since starting rifampin for TB', age: 30, gender: 'male', expected: ['Medication Side Effect', 'Rifampin Effect', 'Adverse Drug Reaction', 'Expected Medication Effect'], urgency: 'routine' },
  { id: 4407, cc: 'persistent fever for 2 weeks with night sweats, just started a new IV drug', age: 35, gender: 'male', expected: ['Infective Endocarditis', 'HIV', 'Sepsis', 'Lymphoma'], urgency: 'emergent' },
  { id: 4408, cc: 'hard painful lump in front of my ear that appeared gradually', age: 55, gender: 'male', expected: ['Parotid Tumor', 'Salivary Gland Tumor', 'Pleomorphic Adenoma', 'Lymphoma'], urgency: 'urgent' },
  { id: 4409, cc: 'my child has been eating dirt and ice, pica behavior', age: 3, gender: 'female', expected: ['Iron Deficiency Anemia', 'Pica', 'Lead Poisoning'], urgency: 'urgent' },
  { id: 4410, cc: 'black hairy tongue after taking antibiotics', age: 40, gender: 'male', expected: ['Black Hairy Tongue', 'Drug Side Effect', 'Oral Candidiasis'], urgency: 'routine' },
  { id: 4411, cc: 'bulging in my groin that gets bigger when I cough or strain', age: 55, gender: 'male', expected: ['Inguinal Hernia', 'Hernia'], urgency: 'routine' },
  { id: 4412, cc: 'shooting electric pain in my face triggered by chewing or brushing teeth', age: 65, gender: 'female', expected: ['Trigeminal Neuralgia', 'Facial Pain', 'Dental Abscess'], urgency: 'urgent' },
  { id: 4413, cc: 'severe eye pain headache and seeing halos around lights', age: 70, gender: 'female', expected: ['Acute Angle-Closure Glaucoma', 'Glaucoma', 'Migraine'], urgency: 'emergent' },
  { id: 4414, cc: 'worsening shortness of breath and I work with asbestos', age: 60, gender: 'male', expected: ['Asbestosis', 'Mesothelioma', 'Lung Cancer', 'COPD', 'Interstitial Lung'], urgency: 'urgent' },
  { id: 4415, cc: 'chronic abdominal pain bloating and alternating constipation and diarrhea', age: 30, gender: 'female', expected: ['Irritable Bowel Syndrome', 'IBS', 'Celiac Disease', 'Inflammatory Bowel'], urgency: 'routine' },
  { id: 4416, cc: 'feels like something is stuck in my throat but I can still swallow', age: 35, gender: 'female', expected: ['Globus Sensation', 'Globus Pharyngeus', 'GERD', 'Anxiety'], urgency: 'routine' },
  { id: 4417, cc: 'blurry vision and headache, blood sugar is over 500', age: 55, gender: 'male', expected: ['Diabetic Ketoacidosis', 'Hyperglycemic Crisis', 'Hyperosmolar Hyperglycemic', 'DKA'], urgency: 'emergent' },
  { id: 4418, cc: 'fever and confusion in someone who just had a splenectomy', age: 45, gender: 'male', expected: ['Post-Splenectomy Sepsis', 'Overwhelming Post-Splenectomy Infection', 'Sepsis', 'Bacteremia'], urgency: 'emergent' },
  { id: 4419, cc: 'baby has a sacral dimple with a tuft of hair', age: 0.01, gender: 'male', expected: ['Spinal Dysraphism', 'Occult Spina Bifida', 'Tethered Cord', 'Dermal Sinus'], urgency: 'routine' },
  { id: 4420, cc: 'weakness and dark colored urine after an intense workout', age: 25, gender: 'male', expected: ['Rhabdomyolysis', 'Exertional Rhabdomyolysis'], urgency: 'emergent' },
  { id: 4421, cc: 'suddenly cant see out of the bottom half of my vision in one eye', age: 60, gender: 'female', expected: ['Retinal Detachment', 'Branch Retinal Artery Occlusion', 'Visual Field Loss', 'Stroke'], urgency: 'emergent' },
  { id: 4422, cc: 'severe headache and neck stiffness after a lumbar puncture yesterday', age: 30, gender: 'female', expected: ['Post-Dural Puncture Headache', 'Post-LP Headache', 'Spinal Headache'], urgency: 'urgent' },
  { id: 4423, cc: 'bilateral leg weakness and back pain, loss of bladder control', age: 60, gender: 'male', expected: ['Cauda Equina Syndrome', 'Spinal Cord Compression', 'Metastatic Disease'], urgency: 'emergent' },
  { id: 4424, cc: 'sore on my foot that wont heal, diabetic for 20 years', age: 60, gender: 'male', expected: ['Diabetic Foot Ulcer', 'Diabetic Ulcer', 'Chronic Wound', 'Osteomyelitis'], urgency: 'urgent' },
  { id: 4425, cc: 'bruising around my eyes after hitting the back of my head', age: 70, gender: 'male', expected: ['Basilar Skull Fracture', 'Raccoon Eyes', 'Subdural Hematoma', 'Traumatic Brain'], urgency: 'emergent' },
  { id: 4426, cc: 'abnormal movements and personality change in a young person', age: 18, gender: 'female', expected: ['Anti-NMDA Receptor Encephalitis', 'Seizure', 'Psychiatric Disorder', 'Autoimmune Encephalitis'], urgency: 'emergent' },
  { id: 4427, cc: 'nausea and metallic taste since starting lithium', age: 35, gender: 'female', expected: ['Lithium Toxicity', 'Medication Side Effect', 'Adverse Drug Reaction'], urgency: 'urgent' },
  { id: 4428, cc: 'right shoulder pain referred from abdomen, after a car accident', age: 30, gender: 'female', expected: ['Splenic Injury', 'Liver Laceration', 'Kehr Sign', 'Diaphragm Injury', 'Ruptured Spleen'], urgency: 'emergent' },
  { id: 4429, cc: 'explosive watery diarrhea after eating at a buffet 6 hours ago', age: 35, gender: 'male', expected: ['Food Poisoning', 'Staphylococcal Food Poisoning', 'Gastroenteritis', 'Bacillus cereus'], urgency: 'urgent' },
  { id: 4430, cc: 'chronic cough for months that is worse at night and with exercise', age: 10, gender: 'male', expected: ['Asthma', 'Post-Nasal Drip', 'GERD', 'Cough-Variant Asthma'], urgency: 'routine' },
  { id: 4431, cc: 'child screaming when I try to change his diaper, leg looks swollen', age: 0.5, gender: 'male', expected: ['Fracture', 'Child Abuse', 'NAT', 'Non-Accidental Trauma', 'Osteomyelitis'], urgency: 'emergent' },
  { id: 4432, cc: 'sharp stabbing pain in my side every time I breathe or cough', age: 30, gender: 'male', expected: ['Pleurisy', 'Pneumothorax', 'Rib Fracture', 'Pulmonary Embolism', 'Costochondritis'], urgency: 'urgent' },
  { id: 4433, cc: 'neck mass that moves when I swallow', age: 35, gender: 'female', expected: ['Thyroid Nodule', 'Goiter', 'Thyroid Cancer', 'Thyroglossal Duct Cyst'], urgency: 'routine' },
  { id: 4434, cc: 'constant ringing in my ears after a concert', age: 22, gender: 'male', expected: ['Noise-Induced Tinnitus', 'Tinnitus', 'Acoustic Trauma', 'Noise-Induced Hearing Loss'], urgency: 'routine' },
  { id: 4435, cc: 'severe stabbing flank pain radiating to groin on right side', age: 40, gender: 'female', expected: ['Kidney Stone', 'Nephrolithiasis', 'Renal Colic'], urgency: 'urgent' },
  { id: 4436, cc: 'chest pain and difficulty breathing after being punched in the chest', age: 20, gender: 'male', expected: ['Pneumothorax', 'Rib Fracture', 'Cardiac Contusion', 'Hemothorax'], urgency: 'emergent' },
  { id: 4437, cc: 'baby has a large strawberry birthmark on her face that is growing', age: 0.25, gender: 'female', expected: ['Infantile Hemangioma', 'Hemangioma', 'Vascular Malformation'], urgency: 'routine' },
  { id: 4438, cc: 'weakness on one side that lasted 10 minutes then resolved completely', age: 65, gender: 'male', expected: ['TIA', 'Transient Ischemic Attack', 'Stroke', 'Mini-Stroke'], urgency: 'emergent' },
  { id: 4439, cc: 'recurrent UTIs, this is my 5th one this year', age: 28, gender: 'female', expected: ['Recurrent UTI', 'Urinary Tract Infection', 'Interstitial Cystitis'], urgency: 'routine' },
  { id: 4440, cc: 'shoulder pain that is worse at night, cant sleep on that side', age: 50, gender: 'male', expected: ['Rotator Cuff', 'Shoulder Impingement', 'Adhesive Capsulitis', 'Frozen Shoulder'], urgency: 'routine' },
  { id: 4441, cc: 'I can feel my heart beating in my stomach when I lay down, I have high blood pressure', age: 70, gender: 'male', expected: ['Abdominal Aortic Aneurysm', 'AAA', 'Aortic Aneurysm'], urgency: 'urgent' },
  { id: 4442, cc: 'foot is hot red and swollen, I have diabetes', age: 60, gender: 'male', expected: ['Charcot Foot', 'Diabetic Foot', 'Cellulitis', 'Osteomyelitis', 'Gout'], urgency: 'urgent' },
  { id: 4443, cc: 'waking up at night to pee 4 times, stream is weak', age: 65, gender: 'male', expected: ['BPH', 'Benign Prostatic Hyperplasia', 'Prostate', 'Overactive Bladder'], urgency: 'routine' },
  { id: 4444, cc: 'cant stop scratching between my toes, its red and peeling', age: 25, gender: 'male', expected: ['Tinea Pedis', 'Athlete Foot', 'Fungal Infection', 'Dermatitis'], urgency: 'routine' },
  { id: 4445, cc: 'sudden excruciating headache with vomiting and confusion', age: 55, gender: 'female', expected: ['Subarachnoid Hemorrhage', 'Intracerebral Hemorrhage', 'Stroke', 'Meningitis'], urgency: 'emergent' },
  { id: 4446, cc: 'breathing difficulty and stridor after eating something, child', age: 3, gender: 'male', expected: ['Foreign Body Aspiration', 'Choking', 'Anaphylaxis', 'Croup'], urgency: 'emergent' },
  { id: 4447, cc: 'cold symptoms for 2 days, runny nose congestion sore throat mild cough', age: 30, gender: 'female', expected: ['Viral URI', 'Common Cold', 'Upper Respiratory Infection', 'Viral Pharyngitis'], urgency: 'routine' },
  { id: 4448, cc: 'low back pain lifting at work, cant stand up straight', age: 35, gender: 'male', expected: ['Lumbar Strain', 'Muscle Strain', 'Back Strain', 'Disc Herniation'], urgency: 'routine' },
  { id: 4449, cc: 'worried about a lump I found on my thyroid', age: 45, gender: 'female', expected: ['Thyroid Nodule', 'Thyroid Cancer', 'Goiter', 'Benign Nodule'], urgency: 'routine' },
  { id: 4450, cc: 'flu symptoms body aches fever chills headache cough', age: 40, gender: 'male', expected: ['Influenza', 'COVID-19', 'Viral URI', 'Pneumonia'], urgency: 'routine' },
  { id: 4451, cc: 'wrist pain after FOOSH injury, tender anatomical snuffbox', age: 22, gender: 'male', expected: ['Scaphoid Fracture', 'Wrist Fracture', 'Sprain'], urgency: 'urgent' },
  { id: 4452, cc: 'my baby has cradle cap, thick yellow crusty scales on scalp', age: 0.17, gender: 'male', expected: ['Seborrheic Dermatitis', 'Cradle Cap'], urgency: 'routine' },
  { id: 4453, cc: 'palpitations and weight loss and tremor, feeling anxious all the time', age: 35, gender: 'female', expected: ['Hyperthyroidism', 'Graves Disease', 'Anxiety', 'Thyrotoxicosis'], urgency: 'urgent' },
  { id: 4454, cc: 'been coughing for 2 months, lost 10 pounds, fevers at night, homeless', age: 40, gender: 'male', expected: ['Pulmonary Tuberculosis', 'Tuberculosis', 'Lung Cancer', 'HIV'], urgency: 'urgent' },
  { id: 4455, cc: 'pain in my calf that is worse when I walk and goes away when I rest', age: 68, gender: 'male', expected: ['Peripheral Arterial Disease', 'Claudication', 'PAD', 'DVT'], urgency: 'urgent' },
  { id: 4456, cc: 'child woke up with stridor and difficulty breathing, was fine yesterday', age: 2, gender: 'male', expected: ['Croup', 'Epiglottitis', 'Foreign Body Aspiration', 'Laryngotracheobronchitis'], urgency: 'emergent' },
  { id: 4457, cc: 'red swollen area near my tailbone with drainage', age: 22, gender: 'male', expected: ['Pilonidal Abscess', 'Pilonidal Cyst', 'Perianal Abscess', 'Anorectal Abscess'], urgency: 'urgent' },
  { id: 4458, cc: 'sudden painless testicular swelling, feels like a bag of worms', age: 18, gender: 'male', expected: ['Varicocele', 'Hydrocele', 'Testicular Torsion', 'Testicular Cancer'], urgency: 'urgent' },
  { id: 4459, cc: 'pain and swelling of my finger joint nearest the nail, it looks deformed', age: 60, gender: 'female', expected: ['Heberden Node', 'Osteoarthritis', 'Gout', 'Psoriatic Arthritis'], urgency: 'routine' },
  { id: 4460, cc: 'my wife is 38 weeks pregnant and having regular contractions every 5 minutes', age: 30, gender: 'female', expected: ['Active Labor', 'Labor', 'Term Labor'], urgency: 'emergent' },
  { id: 4461, cc: 'blood shot eye after straining to pick up heavy furniture, no pain', age: 40, gender: 'male', expected: ['Subconjunctival Hemorrhage', 'Eye Redness'], urgency: 'routine' },
  { id: 4462, cc: 'weird smelling clear fluid leaking from my nose after hitting my forehead', age: 25, gender: 'male', expected: ['CSF Rhinorrhea', 'Basilar Skull Fracture', 'Cerebrospinal Fluid Leak', 'Nasal Fracture'], urgency: 'emergent' },
  { id: 4463, cc: 'trouble swallowing and my voice has changed, neck lump growing', age: 55, gender: 'male', expected: ['Thyroid Cancer', 'Laryngeal Cancer', 'Esophageal Cancer', 'Goiter'], urgency: 'urgent' },
  { id: 4464, cc: 'chest pain and palpitations in a young athlete during practice', age: 17, gender: 'male', expected: ['Hypertrophic Cardiomyopathy', 'SVT', 'Cardiac Arrhythmia', 'Myocarditis'], urgency: 'emergent' },
  { id: 4465, cc: 'I have gout and my knee is really swollen hot and red', age: 55, gender: 'male', expected: ['Gout Flare', 'Gout', 'Septic Arthritis', 'Pseudogout'], urgency: 'urgent' },
  { id: 4466, cc: 'progressive difficulty walking and numbness in legs with back pain for months', age: 65, gender: 'male', expected: ['Spinal Stenosis', 'Lumbar Stenosis', 'Cauda Equina', 'Myelopathy'], urgency: 'urgent' },
  { id: 4467, cc: 'sudden vision loss and headache, I have sickle cell disease', age: 20, gender: 'male', expected: ['Central Retinal Artery Occlusion', 'Sickle Cell Crisis', 'Vitreous Hemorrhage', 'Retinal Detachment'], urgency: 'emergent' },
  { id: 4468, cc: 'bad breath and draining pus from a tooth, swelling in my cheek', age: 30, gender: 'male', expected: ['Dental Abscess', 'Periapical Abscess', 'Dental Infection'], urgency: 'urgent' },
  { id: 4469, cc: 'child swallowed a coin, no distress but I saw them do it', age: 3, gender: 'male', expected: ['Foreign Body Ingestion', 'Esophageal Foreign Body', 'Coin Ingestion'], urgency: 'urgent' },
  { id: 4470, cc: 'my stoma output has been very high and Im feeling dehydrated', age: 55, gender: 'female', expected: ['High-Output Stoma', 'Dehydration', 'Electrolyte Imbalance', 'Bowel Obstruction'], urgency: 'urgent' },
  { id: 4471, cc: 'watery eye and runny nose on one side with severe headache behind eye', age: 40, gender: 'male', expected: ['Cluster Headache', 'Sinusitis', 'Trigeminal Neuralgia'], urgency: 'urgent' },
  { id: 4472, cc: 'feeling weak and dizzy, I accidentally took my blood pressure medicine twice today', age: 72, gender: 'female', expected: ['Medication Overdose', 'Hypotension', 'Adverse Drug Reaction', 'Medication Side Effect'], urgency: 'urgent' },
  { id: 4473, cc: 'baby grunting and nose flaring, breathing fast, fever', age: 0.08, gender: 'male', expected: ['Pneumonia', 'Bronchiolitis', 'Sepsis', 'Respiratory Distress'], urgency: 'emergent' },
  { id: 4474, cc: 'burning chest pain worse lying down better sitting up with friction rub', age: 30, gender: 'male', expected: ['Pericarditis', 'Myocarditis'], urgency: 'urgent' },
  { id: 4475, cc: 'lost consciousness briefly then came back, tongue bitten and wet myself', age: 25, gender: 'female', expected: ['Seizure', 'Generalized Tonic-Clonic Seizure', 'Epilepsy', 'Syncope'], urgency: 'emergent' },
  { id: 4476, cc: 'face swelling and hives 20 minutes after taking penicillin', age: 35, gender: 'female', expected: ['Anaphylaxis', 'Drug Allergy', 'Angioedema', 'Allergic Reaction'], urgency: 'emergent' },
  { id: 4477, cc: 'progressive hearing loss and facial numbness on one side', age: 50, gender: 'female', expected: ['Acoustic Neuroma', 'Vestibular Schwannoma', 'Brain Tumor'], urgency: 'urgent' },
  { id: 4478, cc: 'red tender nodules on my shins that appeared this week', age: 28, gender: 'female', expected: ['Erythema Nodosum', 'Cellulitis', 'Vasculitis', 'IBD', 'Sarcoidosis'], urgency: 'routine' },
  { id: 4479, cc: 'high fever that wont break for 5 days, cough and body aches', age: 45, gender: 'male', expected: ['Influenza', 'Pneumonia', 'COVID-19', 'Sepsis'], urgency: 'urgent' },
  { id: 4480, cc: 'cant hear out of one ear, feels plugged up after swimming', age: 12, gender: 'male', expected: ['Otitis Externa', 'Cerumen Impaction', 'Swimmer Ear', 'Otitis Media'], urgency: 'routine' },
  { id: 4481, cc: 'chronic bilateral nasal congestion, cant breathe through my nose', age: 35, gender: 'male', expected: ['Nasal Polyps', 'Chronic Sinusitis', 'Allergic Rhinitis', 'Deviated Septum'], urgency: 'routine' },
  { id: 4482, cc: 'child with purple spots that dont blanch when pressed, high fever, lethargic', age: 3, gender: 'male', expected: ['Meningococcemia', 'Meningitis', 'Sepsis', 'DIC', 'ITP'], urgency: 'emergent' },
  { id: 4483, cc: 'calf pain and swelling, I take birth control pills', age: 28, gender: 'female', expected: ['DVT', 'Deep Vein Thrombosis', 'Muscle Strain'], urgency: 'urgent' },
  { id: 4484, cc: 'pain in my ear when I pull on it, just got back from the pool', age: 10, gender: 'male', expected: ['Otitis Externa', 'Swimmer Ear', 'Ear Infection'], urgency: 'routine' },
  { id: 4485, cc: 'woke up with a stiff neck and cant turn my head, no injury', age: 35, gender: 'male', expected: ['Cervical Strain', 'Torticollis', 'Muscle Spasm', 'Cervical Disc'], urgency: 'routine' },
  { id: 4486, cc: 'sharp pain in my tailbone when I sit down', age: 30, gender: 'female', expected: ['Coccydynia', 'Pilonidal Cyst', 'Coccyx Fracture', 'Tailbone Pain'], urgency: 'routine' },
  { id: 4487, cc: 'my child has a limp and pain in the hip, age 6, was fine last week', age: 6, gender: 'male', expected: ['Transient Synovitis', 'Legg-Calve-Perthes', 'Septic Arthritis', 'Osteomyelitis'], urgency: 'urgent' },
  { id: 4488, cc: 'intermittent sharp pains in my chest that come and go with deep breaths', age: 16, gender: 'female', expected: ['Precordial Catch Syndrome', 'Costochondritis', 'Pleurisy', 'Musculoskeletal'], urgency: 'routine' },
  { id: 4489, cc: 'severe constipation and abdominal pain, on chronic opioids for back pain', age: 50, gender: 'male', expected: ['Opioid-Induced Constipation', 'Bowel Obstruction', 'Medication-Induced Constipation', 'Functional Constipation'], urgency: 'urgent' },
  { id: 4490, cc: 'yellow watery eyes with crusting in the morning, newborn', age: 0.02, gender: 'female', expected: ['Neonatal Conjunctivitis', 'Blocked Tear Duct', 'Dacryostenosis', 'Ophthalmia Neonatorum'], urgency: 'urgent' },
  { id: 4491, cc: 'recurrent mouth ulcers genital ulcers and eye inflammation', age: 30, gender: 'male', expected: ['Behcet Disease', 'Herpes', 'Crohn Disease', 'SLE'], urgency: 'urgent' },
  { id: 4492, cc: 'chronic non-healing wound on my lower leg with varicose veins', age: 65, gender: 'female', expected: ['Venous Stasis Ulcer', 'Chronic Venous Insufficiency', 'Chronic Wound'], urgency: 'routine' },
  { id: 4493, cc: 'woke up with severe vertigo and hearing loss on one side, had a cold last week', age: 40, gender: 'female', expected: ['Labyrinthitis', 'Vestibular Neuritis', 'Meniere', 'Sudden Hearing Loss'], urgency: 'urgent' },
  { id: 4494, cc: 'my toenail is growing into the skin and its infected', age: 20, gender: 'male', expected: ['Ingrown Toenail', 'Paronychia', 'Onychocryptosis'], urgency: 'routine' },
  { id: 4495, cc: 'lump in my armpit that is painful and draining', age: 28, gender: 'female', expected: ['Hidradenitis Suppurativa', 'Abscess', 'Lymphadenitis', 'Cyst'], urgency: 'routine' },
  { id: 4496, cc: 'sharp pain behind my knee, it popped when I was running', age: 30, gender: 'male', expected: ['Meniscus Tear', 'ACL Tear', 'Popliteal Cyst', 'Baker Cyst Rupture', 'MCL Tear'], urgency: 'urgent' },
  { id: 4497, cc: 'itchy blisters on one side of my face near my eye', age: 70, gender: 'male', expected: ['Herpes Zoster Ophthalmicus', 'Shingles', 'Herpes Zoster'], urgency: 'emergent' },
  { id: 4498, cc: 'blood in my ear after my child stuck a Q-tip too deep', age: 4, gender: 'female', expected: ['Tympanic Membrane Perforation', 'Ear Canal Laceration', 'Ruptured Eardrum', 'Ear Trauma'], urgency: 'urgent' },
  { id: 4499, cc: 'panic attack, heart racing, numbness in hands, feel like Im dying', age: 28, gender: 'female', expected: ['Panic Attack', 'Panic Disorder', 'Anxiety', 'Hyperventilation'], urgency: 'urgent' },
  { id: 4500, cc: 'severe right upper belly pain nausea and jaundice', age: 50, gender: 'female', expected: ['Cholangitis', 'Choledocholithiasis', 'Cholecystitis', 'Hepatitis', 'Biliary Obstruction'], urgency: 'emergent' },
];

// ───────── test runner ─────────
const API_URL = API;
const CONCURRENCY = 10;  // Higher concurrency — dev rate limit is 1000/min
const TIMEOUT_MS = 30000;
const DELAY_BETWEEN_MS = 0;

function postAPI(body) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);
    const data = JSON.stringify(body);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: TIMEOUT_MS,
    };
    const req = http.request(opts, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch { resolve({ error: buf }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

async function runCase(c) {
  const body = {
    chiefComplaint: c.cc,
    age: Math.round(c.age),  // API requires integer — round fractional infant ages to 0
    gender: c.gender,
    hpi: {},
    medications: [],
    vitals: {},
  };
  try {
    let data = await postAPI(body);
    // Retry once on rate limit or error
    if (data.error || data.statusCode === 429) {
      await new Promise(r => setTimeout(r, 3000));
      data = await postAPI(body);
    }
    const dxList = Array.isArray(data.differentials)
      ? data.differentials
      : (data.differentials?.differentials || []);
    if (!Array.isArray(dxList) || dxList.length === 0) {
      return { id: c.id, pass: false, top: 'NO_RESULT', expected: c.expected, cc: c.cc, urgency: c.urgency, confidence: 0, allDx: [] };
    }
    const top = dxList[0];
    const topName = top.diagnosis || 'UNKNOWN';
    const topConf = top.confidence || 0;
    const allDx = dxList.map(d => `${d.diagnosis} (${d.confidence})`);

    // Check if any expected dx appears in top 3
    const top3Names = dxList.slice(0, 3).map(d => (d.diagnosis || '').toLowerCase());
    const pass = c.expected.some(exp => top3Names.some(t => t.includes(exp.toLowerCase())));

    return { id: c.id, pass, top: topName, confidence: topConf, expected: c.expected, cc: c.cc, urgency: c.urgency, allDx };
  } catch (err) {
    return { id: c.id, pass: false, top: `ERROR: ${err.message}`, expected: c.expected, cc: c.cc, urgency: c.urgency, confidence: 0, allDx: [] };
  }
}

async function main() {
  console.log(`Running ${CASES.length} test cases against ${API_URL}...`);
  const results = [];
  let completed = 0;

  // Run with concurrency limit
  const queue = [...CASES];
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const c = queue.shift();
      const r = await runCase(c);
      results.push(r);
      completed++;
      if (completed % 25 === 0) {
        console.log(`  Progress: ${completed}/${CASES.length}`);
      }
      await sleep(DELAY_BETWEEN_MS);
    }
  });
  await Promise.all(workers);

  // Sort by ID
  results.sort((a, b) => a.id - b.id);

  // Compute stats
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass);
  const accuracy = ((passed / total) * 100).toFixed(1);

  // Category analysis
  const categories = {};
  for (const r of results) {
    // Determine category from ID range
    let cat = 'unknown';
    const id = r.id;
    if (id <= 4010) cat = 'Chest Pain';
    else if (id <= 4020) cat = 'Headache';
    else if (id <= 4035) cat = 'Abdominal Pain';
    else if (id <= 4043) cat = 'Shortness of Breath';
    else if (id <= 4049) cat = 'Back Pain';
    else if (id <= 4057) cat = 'Burns';
    else if (id <= 4063) cat = 'Bites/Stings';
    else if (id <= 4068) cat = 'Foreign Body';
    else if (id <= 4076) cat = 'Environmental';
    else if (id <= 4084) cat = 'TB/Infectious';
    else if (id <= 4094) cat = 'Cancer Symptoms';
    else if (id <= 4102) cat = 'Medication Side Effects';
    else if (id <= 4108) cat = 'Allergies';
    else if (id <= 4114) cat = 'Poisoning/Ingestion';
    else if (id <= 4124) cat = 'Skin/Rash';
    else if (id <= 4134) cat = 'Neurological';
    else if (id <= 4142) cat = 'Psychiatric';
    else if (id <= 4152) cat = 'OB/GYN';
    else if (id <= 4158) cat = 'Urologic';
    else if (id <= 4168) cat = 'Musculoskeletal';
    else if (id <= 4180) cat = 'Pediatric';
    else if (id <= 4188) cat = 'Geriatric';
    else if (id <= 4196) cat = 'ENT';
    else if (id <= 4202) cat = 'Eye';
    else if (id <= 4210) cat = 'Dizziness/Syncope';
    else if (id <= 4216) cat = 'Cough';
    else if (id <= 4222) cat = 'Fatigue/Weakness';
    else if (id <= 4226) cat = 'Dental';
    else if (id <= 4230) cat = 'Rectal/Anal';
    else if (id <= 4234) cat = 'Sleep';
    else if (id <= 4238) cat = 'Wound/Laceration';
    else if (id <= 4244) cat = 'Substance Use';
    else if (id <= 4250) cat = 'Autoimmune';
    else if (id <= 4256) cat = 'Endocrine';
    else if (id <= 4260) cat = 'Vascular';
    else if (id <= 4264) cat = 'Hematologic';
    else cat = 'Misc/Gap-Fill';

    if (!categories[cat]) categories[cat] = { pass: 0, fail: 0, total: 0 };
    categories[cat].total++;
    if (r.pass) categories[cat].pass++;
    else categories[cat].fail++;
  }

  // Urgency analysis
  const urgencyStats = { emergent: { pass: 0, total: 0 }, urgent: { pass: 0, total: 0 }, routine: { pass: 0, total: 0 } };
  for (const r of results) {
    const u = r.urgency || 'routine';
    if (!urgencyStats[u]) urgencyStats[u] = { pass: 0, total: 0 };
    urgencyStats[u].total++;
    if (r.pass) urgencyStats[u].pass++;
  }

  // Output results
  console.log(`\n${'='.repeat(80)}`);
  console.log(`COMPASS v15 — 500-Case Comprehensive Test Results`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${total - passed} | Accuracy: ${accuracy}%`);
  console.log(`\n--- Category Breakdown ---`);
  for (const [cat, s] of Object.entries(categories).sort((a, b) => a[0].localeCompare(b[0]))) {
    const pct = ((s.pass / s.total) * 100).toFixed(0);
    const bar = s.pass === s.total ? '✓' : `${s.fail} fail`;
    console.log(`  ${cat.padEnd(25)} ${s.pass}/${s.total} (${pct}%) ${bar}`);
  }

  console.log(`\n--- Urgency Breakdown ---`);
  for (const [u, s] of Object.entries(urgencyStats)) {
    const pct = s.total ? ((s.pass / s.total) * 100).toFixed(0) : 'N/A';
    console.log(`  ${u.padEnd(15)} ${s.pass}/${s.total} (${pct}%)`);
  }

  console.log(`\n--- Failed Cases ---`);
  for (const f of failed) {
    console.log(`  [${f.id}] CC: "${f.cc.substring(0, 70)}..."`);
    console.log(`         Got: ${f.top} (${f.confidence}%) | Expected: ${f.expected[0]}`);
    if (f.allDx.length > 0) console.log(`         All: ${f.allDx.slice(0, 5).join(', ')}`);
  }

  // Write JSON results
  const outJson = `${import.meta.dirname || '.'}/results-v15-500cases.json`;
  const outMd = `${import.meta.dirname || '.'}/results-v15-500cases.md`;

  const fs = await import('node:fs');
  fs.writeFileSync(outJson, JSON.stringify({ total, passed, failed: total - passed, accuracy, categories, urgencyStats, results }, null, 2));

  // Write Markdown summary
  let md = `# COMPASS v15 — 500-Case Comprehensive Test Results\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n\n`;
  md += `| Metric | Value |\n|---|---|\n`;
  md += `| Total Cases | ${total} |\n`;
  md += `| Passed | ${passed} |\n`;
  md += `| Failed | ${total - passed} |\n`;
  md += `| **Accuracy** | **${accuracy}%** |\n\n`;
  md += `## Category Breakdown\n\n`;
  md += `| Category | Pass/Total | Accuracy |\n|---|---|---|\n`;
  for (const [cat, s] of Object.entries(categories).sort((a, b) => a[0].localeCompare(b[0]))) {
    const pct = ((s.pass / s.total) * 100).toFixed(0);
    md += `| ${cat} | ${s.pass}/${s.total} | ${pct}% |\n`;
  }
  md += `\n## Urgency Breakdown\n\n`;
  md += `| Urgency | Pass/Total | Accuracy |\n|---|---|---|\n`;
  for (const [u, s] of Object.entries(urgencyStats)) {
    const pct = s.total ? ((s.pass / s.total) * 100).toFixed(0) : 'N/A';
    md += `| ${u} | ${s.pass}/${s.total} | ${pct}% |\n`;
  }
  md += `\n## Failed Cases\n\n`;
  for (const f of failed) {
    md += `- **[${f.id}]** "${f.cc.substring(0, 80)}" → Got: **${f.top}** (${f.confidence}%) | Expected: ${f.expected[0]}\n`;
  }

  fs.writeFileSync(outMd, md);

  console.log(`\nResults written to:\n  ${outJson}\n  ${outMd}`);
}

main().catch(console.error);
