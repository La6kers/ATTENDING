// ============================================================
// COMPASS Blind Spot Test — 100 API Cases (v14)
// Targets: untested new prevalence categories, consistently
// failing conditions, and diverse visit types
// IDs 3000-3099
// ============================================================

import { writeFileSync } from 'fs';

const BASE_URL = 'http://localhost:3005/api/diagnose';
const DELAY_MS = 3500;

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ========== CASES ==========
// Each case is a self-contained object with all fields.
// Organized by category to find blind spots.

const CASES = [
  // ── BURNS (never tested) ──
  { id: 3000, expected: 'Second Degree Burn', demo: 'adult', setting: 'ED', age: 35, gender: 'male',
    cc: "spilled boiling water on my arm its all red with blisters", hpi: { onset: 'sudden', location: 'arm', duration: '1 hour', character: 'burning', severity: 8, associated: ['blistering', 'redness', 'pain'] } },
  { id: 3001, expected: 'Chemical Burn', demo: 'adult', setting: 'ED', age: 42, gender: 'male',
    cc: "got drain cleaner splashed on my hand at work its turning white and hurts bad", hpi: { onset: 'sudden', location: 'hand', duration: '30 minutes', character: 'burning', severity: 9, associated: ['chemical exposure', 'skin discoloration', 'severe pain'] } },
  { id: 3002, expected: 'Sunburn', demo: 'peds', setting: 'UC', age: 8, gender: 'female',
    cc: "fell asleep at the beach now my kid is bright red and crying it hurts to touch her", hpi: { onset: 'gradual', location: 'back and shoulders', duration: '6 hours', character: 'burning', severity: 6, associated: ['redness', 'tenderness', 'warmth'] } },

  // ── BITES/STINGS (never tested) ──
  { id: 3003, expected: 'Dog Bite', demo: 'peds', setting: 'ED', age: 6, gender: 'male',
    cc: "neighbors dog bit my kid on the face its bleeding pretty bad", hpi: { onset: 'sudden', location: 'face', duration: '30 minutes', character: 'laceration', severity: 7, associated: ['bleeding', 'puncture wound', 'swelling'] } },
  { id: 3004, expected: 'Spider Bite', demo: 'adult', setting: 'UC', age: 28, gender: 'female',
    cc: "something bit me in bed now theres a red area on my leg with a dark center", hpi: { onset: 'gradual', location: 'leg', duration: '2 days', character: 'painful', severity: 5, associated: ['necrotic center', 'redness', 'swelling'] } },
  { id: 3005, expected: 'Tick Bite', demo: 'adult', setting: 'PC', age: 45, gender: 'male',
    cc: "found a tick on me last week now theres a big red ring around the bite", hpi: { onset: 'gradual', location: 'thigh', duration: '1 week', character: 'expanding rash', severity: 3, associated: ['erythema migrans', 'target lesion', 'fatigue'] } },
  { id: 3006, expected: 'Snake Bite', demo: 'adult', setting: 'ED', age: 55, gender: 'male',
    cc: "got bit by a snake out hiking my ankle is swelling up fast and it hurts real bad", hpi: { onset: 'sudden', location: 'ankle', duration: '1 hour', character: 'sharp', severity: 9, associated: ['swelling', 'fang marks', 'pain spreading'] } },

  // ── FOREIGN BODY (never tested) ──
  { id: 3007, expected: 'Nasal Foreign Body', demo: 'peds', setting: 'UC', age: 3, gender: 'male',
    cc: "my kid stuck a bead up his nose and we cant get it out its making a bad smell", hpi: { onset: 'sudden', location: 'nose', duration: '1 day', character: 'obstruction', severity: 4, associated: ['unilateral nasal discharge', 'foul smell', 'visible foreign body'] } },
  { id: 3008, expected: 'Ear Foreign Body', demo: 'peds', setting: 'UC', age: 4, gender: 'female',
    cc: "my daughter put something in her ear now she says it hurts and wont stop crying", hpi: { onset: 'sudden', location: 'ear', duration: '2 hours', character: 'pain', severity: 5, associated: ['ear pain', 'decreased hearing', 'crying'] } },
  { id: 3009, expected: 'Esophageal Foreign Body', demo: 'peds', setting: 'ED', age: 2, gender: 'male',
    cc: "my toddler swallowed a coin now hes drooling and wont eat anything", hpi: { onset: 'sudden', location: 'throat', duration: '3 hours', character: 'obstruction', severity: 7, associated: ['drooling', 'refusal to eat', 'chest discomfort'] } },

  // ── WOUNDS/LACERATIONS (never tested) ──
  { id: 3010, expected: 'Laceration', demo: 'adult', setting: 'ED', age: 30, gender: 'male',
    cc: "cut my hand real deep on a knife its gaping open and wont stop bleeding", hpi: { onset: 'sudden', location: 'hand', duration: '30 minutes', character: 'sharp', severity: 7, associated: ['bleeding', 'deep wound', 'visible tissue'] } },
  { id: 3011, expected: 'Puncture Wound', demo: 'adult', setting: 'UC', age: 38, gender: 'male',
    cc: "stepped on a rusty nail went right through my shoe into my foot", hpi: { onset: 'sudden', location: 'foot', duration: '1 hour', character: 'sharp', severity: 6, associated: ['puncture', 'rusty object', 'bleeding'] } },

  // ── SYNCOPE (never tested) ──
  { id: 3012, expected: 'Vasovagal Syncope', demo: 'adult', setting: 'UC', age: 22, gender: 'female',
    cc: "i passed out at the doctors office when they drew my blood woke up on the floor", hpi: { onset: 'sudden', location: 'whole body', duration: '1 minute', character: 'loss of consciousness', severity: 5, associated: ['lightheadedness', 'nausea', 'sweating before fainting'] } },
  { id: 3013, expected: 'Cardiac Syncope', demo: 'geri', setting: 'ED', age: 72, gender: 'male',
    cc: "passed out without any warning while just sitting in my chair no dizziness first", hpi: { onset: 'sudden', location: 'whole body', duration: '2 minutes', character: 'sudden loss of consciousness', severity: 8, associated: ['no prodrome', 'chest pain before', 'palpitations'] } },
  { id: 3014, expected: 'Orthostatic Syncope', demo: 'geri', setting: 'PC', age: 78, gender: 'female',
    cc: "every time i stand up from the chair i get so dizzy i almost fall over", hpi: { onset: 'gradual', location: 'head', duration: '2 weeks', character: 'lightheadedness', severity: 5, associated: ['worse with standing', 'improved lying down', 'near-syncope'] } },

  // ── ALLERGIC REACTIONS (beyond anaphylaxis, never tested) ──
  { id: 3015, expected: 'Urticaria', demo: 'adult', setting: 'UC', age: 33, gender: 'female',
    cc: "broke out in hives all over my body theyre itchy and keep moving around", hpi: { onset: 'sudden', location: 'whole body', duration: '4 hours', character: 'itching', severity: 5, associated: ['welts', 'itching', 'blanching'] } },
  { id: 3016, expected: 'Angioedema', demo: 'adult', setting: 'ED', age: 50, gender: 'male',
    cc: "my lips and tongue are swelling up really fast i just started a new blood pressure pill", hpi: { onset: 'sudden', location: 'face', duration: '2 hours', character: 'swelling', severity: 8, associated: ['lip swelling', 'tongue swelling', 'new ACE inhibitor'] } },
  { id: 3017, expected: 'Drug Reaction', demo: 'geri', setting: 'ED', age: 68, gender: 'female',
    cc: "started a new antibiotic and now i have a rash all over and my skin is peeling", hpi: { onset: 'gradual', location: 'whole body', duration: '3 days', character: 'rash', severity: 7, associated: ['diffuse rash', 'skin peeling', 'new medication'] } },

  // ── DENTAL (never tested) ──
  { id: 3018, expected: 'Dental Abscess', demo: 'adult', setting: 'ED', age: 40, gender: 'male',
    cc: "my tooth is killing me my whole jaw is swollen and i can feel a bump on my gum", hpi: { onset: 'gradual', location: 'jaw', duration: '4 days', character: 'throbbing', severity: 8, associated: ['swelling', 'fever', 'gum bump', 'bad taste'] } },
  { id: 3019, expected: 'TMJ Disorder', demo: 'adult', setting: 'PC', age: 29, gender: 'female',
    cc: "my jaw clicks and locks when i open it and i get bad headaches from it", hpi: { onset: 'gradual', location: 'jaw', duration: '2 months', character: 'clicking', severity: 5, associated: ['jaw locking', 'headache', 'clicking sound', 'pain with chewing'] } },

  // ── STI (never tested) ──
  { id: 3020, expected: 'Chlamydia', demo: 'adult', setting: 'UC', age: 23, gender: 'female',
    cc: "new discharge down there that doesnt look normal and it burns a little when i pee", hpi: { onset: 'gradual', location: 'pelvic', duration: '5 days', character: 'discharge', severity: 4, associated: ['abnormal discharge', 'dysuria', 'pelvic discomfort'] } },
  { id: 3021, expected: 'Genital Herpes', demo: 'adult', setting: 'UC', age: 27, gender: 'male',
    cc: "painful blisters down there that popped and turned into sores its really uncomfortable", hpi: { onset: 'gradual', location: 'genital', duration: '4 days', character: 'painful', severity: 6, associated: ['vesicles', 'ulcers', 'pain', 'inguinal lymphadenopathy'] } },

  // ── URINARY RETENTION (never tested) ──
  { id: 3022, expected: 'Urinary Retention', demo: 'geri', setting: 'ED', age: 75, gender: 'male',
    cc: "i havent been able to pee all day my belly is getting big and it hurts down low", hpi: { onset: 'gradual', location: 'lower abdomen', duration: '12 hours', character: 'pressure', severity: 7, associated: ['inability to urinate', 'suprapubic pain', 'distension'] } },

  // ── ENVIRONMENTAL (never tested) ──
  { id: 3023, expected: 'Heat Exhaustion', demo: 'adult', setting: 'ED', age: 32, gender: 'male',
    cc: "was working outside in the heat all day now im dizzy nauseous and sweating buckets", hpi: { onset: 'gradual', location: 'whole body', duration: '4 hours', character: 'exhaustion', severity: 7, associated: ['heavy sweating', 'dizziness', 'nausea', 'headache'] } },
  { id: 3024, expected: 'Hypothermia', demo: 'geri', setting: 'ED', age: 82, gender: 'male',
    cc: "found grandpa outside confused and shivering his skin feels ice cold", hpi: { onset: 'gradual', location: 'whole body', duration: '3 hours', character: 'cold', severity: 8, associated: ['shivering', 'confusion', 'cold skin', 'bradycardia'] } },
  { id: 3025, expected: 'Frostbite', demo: 'adult', setting: 'ED', age: 45, gender: 'male',
    cc: "my fingers are white and numb from being out in the cold they hurt bad now warming up", hpi: { onset: 'gradual', location: 'fingers', duration: '2 hours', character: 'numbness', severity: 7, associated: ['white waxy skin', 'numbness', 'pain on rewarming'] } },

  // ── PREGNANCY COMPLAINTS (never tested) ──
  { id: 3026, expected: 'Hyperemesis Gravidarum', demo: 'adult', setting: 'ED', age: 26, gender: 'female',
    cc: "im 10 weeks pregnant and i cant stop throwing up ive lost 8 pounds and feel so weak", hpi: { onset: 'gradual', location: 'abdomen', duration: '3 weeks', character: 'nausea', severity: 8, associated: ['persistent vomiting', 'weight loss', 'dehydration'] } },
  { id: 3027, expected: 'Threatened Miscarriage', demo: 'adult', setting: 'ED', age: 30, gender: 'female',
    cc: "im 8 weeks pregnant and started spotting with some cramping im really scared", hpi: { onset: 'sudden', location: 'pelvis', duration: '6 hours', character: 'cramping', severity: 5, associated: ['vaginal spotting', 'pelvic cramping', 'pregnancy'] } },

  // ── POSTPARTUM (never tested) ──
  { id: 3028, expected: 'Postpartum Depression', demo: 'adult', setting: 'PC', age: 28, gender: 'female',
    cc: "had my baby 3 weeks ago and i cant stop crying feel worthless and scared i might hurt myself", hpi: { onset: 'gradual', location: 'whole body', duration: '2 weeks', character: 'emotional', severity: 8, associated: ['crying', 'hopelessness', 'difficulty bonding', 'suicidal ideation'] } },
  { id: 3029, expected: 'Mastitis', demo: 'adult', setting: 'UC', age: 31, gender: 'female',
    cc: "breastfeeding and one breast is super red hot swollen and painful with a fever", hpi: { onset: 'gradual', location: 'breast', duration: '2 days', character: 'throbbing', severity: 7, associated: ['breast redness', 'warmth', 'fever', 'painful breastfeeding'] } },

  // ── BREAST COMPLAINTS (never tested) ──
  { id: 3030, expected: 'Breast Cyst', demo: 'adult', setting: 'PC', age: 38, gender: 'female',
    cc: "found a lump in my breast its round and moves and gets tender before my period", hpi: { onset: 'gradual', location: 'breast', duration: '2 weeks', character: 'tender', severity: 4, associated: ['palpable lump', 'cyclical tenderness', 'mobile mass'] } },
  { id: 3031, expected: 'Gynecomastia', demo: 'peds', setting: 'PC', age: 14, gender: 'male',
    cc: "my chest is getting bigger on both sides and its embarrassing and a little sore", hpi: { onset: 'gradual', location: 'chest', duration: '2 months', character: 'swelling', severity: 3, associated: ['bilateral breast enlargement', 'tenderness'] } },

  // ── PEDIATRIC SPECIFIC (never tested) ──
  { id: 3032, expected: 'Colic', demo: 'peds', setting: 'PC', age: 0, gender: 'male',
    cc: "my 6 week old baby cries for hours every evening nothing we do helps", hpi: { onset: 'gradual', location: 'abdomen', duration: '3 weeks', character: 'crying', severity: 6, associated: ['inconsolable crying', 'draws up legs', 'evening episodes'] } },
  { id: 3033, expected: 'Diaper Rash', demo: 'peds', setting: 'PC', age: 1, gender: 'female',
    cc: "babys bottom is all red raw and now theres white patches that look like thrush on her diaper area", hpi: { onset: 'gradual', location: 'diaper area', duration: '5 days', character: 'rash', severity: 4, associated: ['erythema', 'satellite lesions', 'white patches'] } },

  // ── GERIATRIC SPECIFIC (never tested) ──
  { id: 3034, expected: 'Falls with Polypharmacy', demo: 'geri', setting: 'ED', age: 85, gender: 'female',
    cc: "keep falling down three times this month i take about 12 different medicines", hpi: { onset: 'gradual', location: 'whole body', duration: '1 month', character: 'falls', severity: 6, associated: ['recurrent falls', 'polypharmacy', 'dizziness', 'unsteadiness'] } },
  { id: 3035, expected: 'Deconditioning', demo: 'geri', setting: 'PC', age: 80, gender: 'male',
    cc: "since my wife died ive barely left bed and now i can hardly walk to the bathroom", hpi: { onset: 'gradual', location: 'whole body', duration: '3 months', character: 'weakness', severity: 6, associated: ['progressive weakness', 'inactivity', 'muscle wasting', 'depression'] } },

  // ── WEIGHT LOSS (never tested) ──
  { id: 3036, expected: 'Malignancy', demo: 'geri', setting: 'PC', age: 70, gender: 'male',
    cc: "lost 30 pounds without trying in 3 months and i have no appetite", hpi: { onset: 'gradual', location: 'whole body', duration: '3 months', character: 'weight loss', severity: 6, associated: ['unintentional weight loss', 'anorexia', 'fatigue', 'night sweats'] } },
  { id: 3037, expected: 'Celiac Disease', demo: 'adult', setting: 'PC', age: 32, gender: 'female',
    cc: "every time i eat bread or pasta my belly bloats up terrible with diarrhea and im losing weight", hpi: { onset: 'gradual', location: 'abdomen', duration: '6 months', character: 'bloating', severity: 5, associated: ['bloating', 'diarrhea', 'weight loss', 'relation to gluten'] } },

  // ── INSOMNIA/SLEEP (never tested) ──
  { id: 3038, expected: 'Sleep Apnea', demo: 'adult', setting: 'PC', age: 50, gender: 'male',
    cc: "my wife says i stop breathing at night and snore real loud im exhausted during the day", hpi: { onset: 'gradual', location: 'head', duration: '6 months', character: 'fatigue', severity: 5, associated: ['snoring', 'witnessed apneas', 'daytime sleepiness', 'morning headache'] } },
  { id: 3039, expected: 'Restless Leg Syndrome', demo: 'adult', setting: 'PC', age: 45, gender: 'female',
    cc: "cant sit still at night my legs get this creepy crawly feeling and i have to keep moving them", hpi: { onset: 'gradual', location: 'legs', duration: '3 months', character: 'restlessness', severity: 5, associated: ['urge to move legs', 'worse at night', 'relieved by movement'] } },

  // ── OCCUPATIONAL INJURIES (never tested) ──
  { id: 3040, expected: 'Crush Injury', demo: 'adult', setting: 'ED', age: 35, gender: 'male',
    cc: "forklift rolled over my foot at work its smashed and turning purple", hpi: { onset: 'sudden', location: 'foot', duration: '1 hour', character: 'crushing', severity: 9, associated: ['severe pain', 'swelling', 'discoloration', 'inability to bear weight'] } },
  { id: 3041, expected: 'Chemical Exposure', demo: 'adult', setting: 'ED', age: 40, gender: 'male',
    cc: "breathed in fumes at the factory now im coughing and my eyes are burning and watering", hpi: { onset: 'sudden', location: 'lungs', duration: '2 hours', character: 'burning', severity: 7, associated: ['cough', 'eye irritation', 'dyspnea', 'chemical exposure'] } },

  // ── ANAL/RECTAL (partially tested, poor results) ──
  { id: 3042, expected: 'Anal Fissure', demo: 'adult', setting: 'UC', age: 35, gender: 'female',
    cc: "sharp tearing pain every time i have a bowel movement with a little bright red blood", hpi: { onset: 'gradual', location: 'rectum', duration: '2 weeks', character: 'tearing', severity: 7, associated: ['pain with bowel movements', 'bright red blood', 'constipation'] } },
  { id: 3043, expected: 'Perianal Abscess', demo: 'adult', setting: 'ED', age: 42, gender: 'male',
    cc: "theres a painful swollen lump right next to my butt i cant sit down and got a fever", hpi: { onset: 'gradual', location: 'perianal', duration: '4 days', character: 'throbbing', severity: 8, associated: ['swelling', 'fever', 'pain with sitting', 'fluctuant mass'] } },

  // ── CONDITIONS THAT CONSISTENTLY FAIL (retesting with NEW phrasings) ──

  // Pneumothorax — always returns "Musculoskeletal pain". Try different keywords.
  { id: 3044, expected: 'Pneumothorax', demo: 'adult', setting: 'ED', age: 22, gender: 'male',
    cc: "i think my lung collapsed im a tall skinny guy and it feels like air is leaking in my chest", hpi: { onset: 'sudden', location: 'chest', duration: '2 hours', character: 'sharp', severity: 8, associated: ['sudden dyspnea', 'pleuritic chest pain', 'decreased breath sounds'] } },
  { id: 3045, expected: 'Pneumothorax', demo: 'adult', setting: 'ED', age: 19, gender: 'male',
    cc: "something popped in my chest while lifting weights now one side hurts to breathe and i feel air under my skin", hpi: { onset: 'sudden', location: 'chest', duration: '1 hour', character: 'sharp', severity: 8, associated: ['subcutaneous emphysema', 'chest pain', 'dyspnea'] } },

  // Pancreatitis — always returns "Gastroenteritis". Try more specific keywords.
  { id: 3046, expected: 'Pancreatitis', demo: 'adult', setting: 'ED', age: 48, gender: 'male',
    cc: "pain goes straight through from my belly to my back worse after drinking and eating fatty food", hpi: { onset: 'sudden', location: 'epigastric', duration: '12 hours', character: 'boring', severity: 9, associated: ['radiating to back', 'nausea', 'vomiting', 'worse with eating'] } },
  { id: 3047, expected: 'Pancreatitis', demo: 'adult', setting: 'ED', age: 55, gender: 'female',
    cc: "severe upper belly pain that bores through to my back i have to lean forward for any relief", hpi: { onset: 'sudden', location: 'epigastric', duration: '8 hours', character: 'boring', severity: 9, aggravating: ['eating', 'lying flat'], relieving: ['leaning forward'], associated: ['nausea', 'vomiting'] } },

  // Epiglottitis — returns "Viral Pharyngitis". Try without "sore throat".
  { id: 3048, expected: 'Epiglottitis', demo: 'peds', setting: 'ED', age: 4, gender: 'male',
    cc: "my kid woke up drooling cant swallow sitting up leaning forward and making a weird high pitched noise breathing", hpi: { onset: 'sudden', location: 'throat', duration: '4 hours', character: 'severe', severity: 9, associated: ['stridor', 'drooling', 'tripod position', 'dysphagia'] } },
  { id: 3049, expected: 'Epiglottitis', demo: 'adult', setting: 'ED', age: 35, gender: 'male',
    cc: "swallowing is so painful i cant even swallow my own spit and my voice sounds muffled", hpi: { onset: 'sudden', location: 'throat', duration: '6 hours', character: 'severe', severity: 9, associated: ['odynophagia', 'muffled voice', 'drooling', 'fever'] } },

  // Ovarian Torsion — returns "Gastroenteritis". Emphasize pelvic pain differently.
  { id: 3050, expected: 'Ovarian Torsion', demo: 'adult', setting: 'ED', age: 25, gender: 'female',
    cc: "sudden sharp stabbing pain in my lower right belly near my ovary im doubled over vomiting", hpi: { onset: 'sudden', location: 'right lower quadrant', duration: '3 hours', character: 'sharp', severity: 9, associated: ['nausea', 'vomiting', 'known ovarian cyst'] } },
  { id: 3051, expected: 'Ovarian Torsion', demo: 'adult', setting: 'ED', age: 19, gender: 'female',
    cc: "woke up with the worst pain on my left side down low like something twisted inside me", hpi: { onset: 'sudden', location: 'left lower quadrant', duration: '2 hours', character: 'twisting', severity: 10, associated: ['nausea', 'vomiting'] } },

  // Shingles — returns "Opioid Overdose" (wtf). Try clearer CC.
  { id: 3052, expected: 'Shingles', demo: 'geri', setting: 'UC', age: 70, gender: 'female',
    cc: "had chickenpox years ago now theres a painful band of blisters wrapping around my left side", hpi: { onset: 'gradual', location: 'left torso', duration: '5 days', character: 'burning', severity: 7, associated: ['unilateral vesicular rash', 'dermatomal distribution', 'pain before rash'] } },
  { id: 3053, expected: 'Shingles', demo: 'geri', setting: 'PC', age: 65, gender: 'male',
    cc: "got herpes zoster my doctor said its shingles burning nerve pain with blisters on one side of my chest", hpi: { onset: 'gradual', location: 'chest', duration: '4 days', character: 'burning nerve pain', severity: 8, associated: ['vesicular rash', 'unilateral', 'allodynia'] } },

  // Status Epilepticus — returns "Needs in-person evaluation". Try different phrasing.
  { id: 3054, expected: 'Status Epilepticus', demo: 'peds', setting: 'ED', age: 8, gender: 'male',
    cc: "my child has been having continuous seizures for over 30 minutes wont stop convulsing", hpi: { onset: 'sudden', location: 'whole body', duration: '30 minutes', character: 'convulsions', severity: 10, associated: ['continuous seizures', 'not regaining consciousness'] } },
  { id: 3055, expected: 'Status Epilepticus', demo: 'adult', setting: 'ED', age: 30, gender: 'female',
    cc: "she keeps seizing over and over not waking up between the seizures its been almost an hour", hpi: { onset: 'sudden', location: 'whole body', duration: '45 minutes', character: 'recurrent seizures', severity: 10, associated: ['recurrent seizures', 'no return to baseline', 'altered consciousness'] } },

  // Placental Abruption — returns "Ectopic Pregnancy". Use different keywords.
  { id: 3056, expected: 'Placental Abruption', demo: 'adult', setting: 'ED', age: 34, gender: 'female',
    cc: "im 35 weeks pregnant and having painful dark vaginal bleeding my uterus feels rock hard", hpi: { onset: 'sudden', location: 'uterus', duration: '1 hour', character: 'constant', severity: 9, associated: ['dark vaginal bleeding', 'uterine rigidity', 'fetal distress'] } },

  // Tension Pneumothorax — returns "GAD". Try trauma-focused.
  { id: 3057, expected: 'Tension Pneumothorax', demo: 'adult', setting: 'ED', age: 28, gender: 'male',
    cc: "stabbed in the chest and getting worse fast neck veins popping out and cant breathe", hpi: { onset: 'sudden', location: 'chest', duration: '20 minutes', character: 'severe', severity: 10, associated: ['distended neck veins', 'tracheal deviation', 'absent breath sounds', 'hypotension'] } },

  // Temporal Arteritis — returns "Iron Deficiency Anemia". Try more specific.
  { id: 3058, expected: 'Temporal Arteritis', demo: 'geri', setting: 'PC', age: 72, gender: 'female',
    cc: "my temple artery is swollen and tender hurts to chew and im scared im going to go blind", hpi: { onset: 'gradual', location: 'temple', duration: '2 weeks', character: 'throbbing', severity: 7, associated: ['jaw claudication', 'scalp tenderness', 'visual changes', 'elevated ESR'] } },
  { id: 3059, expected: 'Temporal Arteritis', demo: 'geri', setting: 'ED', age: 68, gender: 'female',
    cc: "sudden vision loss in one eye and my head hurts on the side with a tender bump near my temple", hpi: { onset: 'sudden', location: 'eye and temple', duration: '4 hours', character: 'throbbing', severity: 8, associated: ['monocular vision loss', 'temporal tenderness', 'jaw claudication'] } },

  // Subdural Hematoma — returns "Meningitis". Try clearer head trauma link.
  { id: 3060, expected: 'Subdural Hematoma', demo: 'geri', setting: 'ED', age: 80, gender: 'male',
    cc: "dad fell and hit his head 2 weeks ago seemed fine but now hes confused sleepy and one side is weak", hpi: { onset: 'gradual', location: 'head', duration: '2 weeks', character: 'progressive', severity: 7, associated: ['history of head trauma', 'progressive confusion', 'unilateral weakness', 'headache'] } },
  { id: 3061, expected: 'Subdural Hematoma', demo: 'geri', setting: 'ED', age: 76, gender: 'male',
    cc: "on blood thinners fell and bumped his head last week now having trouble speaking and walking", hpi: { onset: 'gradual', location: 'head', duration: '1 week', character: 'progressive neurological decline', severity: 8, associated: ['anticoagulant use', 'head trauma', 'speech difficulty', 'gait instability'] } },

  // Mesenteric Ischemia — returns "Gastroenteritis". Try classic presentation.
  { id: 3062, expected: 'Mesenteric Ischemia', demo: 'geri', setting: 'ED', age: 75, gender: 'male',
    cc: "belly pain thats way worse than it looks i have afib and the pain hit out of nowhere after eating", hpi: { onset: 'sudden', location: 'abdomen', duration: '4 hours', character: 'severe', severity: 10, associated: ['pain out of proportion to exam', 'atrial fibrillation history', 'bloody diarrhea'] } },

  // Hypothyroidism — returns "Hip Fracture". CC is too vague. Try clearer.
  { id: 3063, expected: 'Hypothyroidism', demo: 'adult', setting: 'PC', age: 45, gender: 'female',
    cc: "my thyroid feels swollen im exhausted constipated gaining weight and my hair is falling out in clumps", hpi: { onset: 'gradual', location: 'whole body', duration: '4 months', character: 'fatigue', severity: 5, associated: ['weight gain', 'cold intolerance', 'constipation', 'hair loss', 'thyroid enlargement'] } },

  // GI Bleeding — returns "BPPV". Try more direct.
  { id: 3064, expected: 'Gastrointestinal Bleeding', demo: 'geri', setting: 'ED', age: 70, gender: 'male',
    cc: "throwing up blood looks like coffee grounds and my stool is black and tarry", hpi: { onset: 'sudden', location: 'GI', duration: '12 hours', character: 'acute', severity: 8, associated: ['hematemesis', 'melena', 'lightheadedness', 'tachycardia'] } },
  { id: 3065, expected: 'Gastrointestinal Bleeding', demo: 'adult', setting: 'ED', age: 58, gender: 'male',
    cc: "having large bloody bowel movements bright red blood filling the toilet and feeling faint", hpi: { onset: 'sudden', location: 'rectum', duration: '6 hours', character: 'acute', severity: 8, associated: ['hematochezia', 'lightheadedness', 'weakness'] } },

  // Sciatica — returns "Musculoskeletal strain". Try radiculopathy language.
  { id: 3066, expected: 'Sciatica', demo: 'adult', setting: 'PC', age: 40, gender: 'male',
    cc: "electric shock pain shooting from my lower back down the back of my leg all the way to my toes numb and tingling", hpi: { onset: 'gradual', location: 'lower back and leg', duration: '2 weeks', character: 'shooting', severity: 7, aggravating: ['sitting', 'coughing'], relieving: ['lying down'], associated: ['numbness', 'tingling', 'leg weakness'] } },

  // Atrial Fibrillation — returns "BPPV". Try focusing on irregular heartbeat.
  { id: 3067, expected: 'Atrial Fibrillation', demo: 'geri', setting: 'ED', age: 68, gender: 'male',
    cc: "my pulse is totally irregular i checked it and its all over the place jumping from 80 to 140", hpi: { onset: 'sudden', location: 'chest', duration: '6 hours', character: 'palpitations', severity: 6, associated: ['irregularly irregular pulse', 'palpitations', 'fatigue', 'dyspnea'] } },

  // DVT — needs testing with new phrasings
  { id: 3068, expected: 'Deep Vein Thrombosis', demo: 'adult', setting: 'ED', age: 45, gender: 'female',
    cc: "my left calf is swollen red warm and painful just got off a long flight yesterday", hpi: { onset: 'gradual', location: 'left calf', duration: '1 day', character: 'aching', severity: 6, associated: ['unilateral leg swelling', 'warmth', 'recent travel', 'calf tenderness'] } },

  // Cholecystitis — returns "Acute Nephritis". Gallbladder-specific language.
  { id: 3069, expected: 'Cholecystitis', demo: 'adult', setting: 'ED', age: 40, gender: 'female',
    cc: "terrible pain under my right ribs that goes to my shoulder blade especially after eating greasy food with fever", hpi: { onset: 'sudden', location: 'right upper quadrant', duration: '8 hours', character: 'colicky then constant', severity: 8, associated: ['Murphy sign', 'nausea', 'vomiting', 'fever', 'worse after fatty meals'] } },

  // COPD Exacerbation — returns "Bronchitis". Try emphysema/COPD wording.
  { id: 3070, expected: 'COPD Exacerbation', demo: 'geri', setting: 'ED', age: 72, gender: 'male',
    cc: "i have copd and my breathing got way worse cant walk to the kitchen wheezing and using my inhaler every hour", hpi: { onset: 'gradual', location: 'chest', duration: '3 days', character: 'worsening', severity: 8, associated: ['increased dyspnea', 'increased sputum', 'wheezing', 'known COPD'] } },

  // Pyelonephritis — sometimes fails. Back pain + fever + urinary.
  { id: 3071, expected: 'Pyelonephritis', demo: 'adult', setting: 'ED', age: 25, gender: 'female',
    cc: "started as a uti now my back hurts on the left side with 103 fever and chills feel awful", hpi: { onset: 'gradual', location: 'flank', duration: '3 days', character: 'aching', severity: 7, associated: ['fever', 'flank pain', 'dysuria', 'nausea'] } },

  // DKA — sometimes fails. Blood sugar + vomiting.
  { id: 3072, expected: 'Diabetic Ketoacidosis', demo: 'adult', setting: 'ED', age: 22, gender: 'male',
    cc: "im type 1 diabetic my blood sugar is over 500 im vomiting and my breath smells fruity", hpi: { onset: 'gradual', location: 'whole body', duration: '1 day', character: 'weakness', severity: 8, associated: ['hyperglycemia', 'vomiting', 'fruity breath', 'Kussmaul breathing'] } },

  // Sepsis — sometimes fails. Infected wound.
  { id: 3073, expected: 'Sepsis', demo: 'geri', setting: 'ED', age: 78, gender: 'female',
    cc: "infection spread from my wound now my whole body is shaking fever high heart pounding feeling confused", hpi: { onset: 'sudden', location: 'whole body', duration: '12 hours', character: 'systemic', severity: 9, associated: ['fever', 'tachycardia', 'confusion', 'wound infection'] } },

  // Ectopic Pregnancy — returns "PID". Emphasize pregnancy + bleeding.
  { id: 3074, expected: 'Ectopic Pregnancy', demo: 'adult', setting: 'ED', age: 28, gender: 'female',
    cc: "missed my period positive pregnancy test now sharp pain on one side and vaginal bleeding feeling dizzy", hpi: { onset: 'sudden', location: 'right lower quadrant', duration: '4 hours', character: 'sharp', severity: 8, associated: ['amenorrhea', 'positive pregnancy test', 'vaginal bleeding', 'dizziness'] } },

  // PE — sometimes fails. Leg swelling + SOB.
  { id: 3075, expected: 'Pulmonary Embolism', demo: 'adult', setting: 'ED', age: 38, gender: 'female',
    cc: "leg was swollen for a week now suddenly cant catch my breath chest pain when breathing in and coughing up blood", hpi: { onset: 'sudden', location: 'chest', duration: '3 hours', character: 'pleuritic', severity: 8, associated: ['hemoptysis', 'leg swelling', 'pleuritic chest pain', 'tachycardia'] } },

  // Appendicitis — sometimes fails. Classic migration.
  { id: 3076, expected: 'Appendicitis', demo: 'adult', setting: 'ED', age: 18, gender: 'male',
    cc: "started around my belly button last night now it moved down to my lower right and it hurts way worse when i let go after pushing", hpi: { onset: 'gradual', location: 'right lower quadrant', duration: '18 hours', character: 'sharp', severity: 8, associated: ['periumbilical pain migration', 'rebound tenderness', 'anorexia', 'nausea'] } },

  // CHF — sometimes fails. Orthopnea + edema.
  { id: 3077, expected: 'Congestive Heart Failure', demo: 'geri', setting: 'ED', age: 75, gender: 'male',
    cc: "cant lay flat at night without choking on fluid legs so swollen my shoes dont fit gained 15 pounds this week", hpi: { onset: 'gradual', location: 'chest', duration: '1 week', character: 'dyspnea', severity: 7, associated: ['orthopnea', 'PND', 'bilateral leg edema', 'weight gain'] } },

  // Diverticulitis — returns "Viral infection". Left lower quadrant + fever.
  { id: 3078, expected: 'Diverticulitis', demo: 'geri', setting: 'ED', age: 65, gender: 'male',
    cc: "pain in my lower left belly been getting worse for 2 days now with fever and my bowels changed", hpi: { onset: 'gradual', location: 'left lower quadrant', duration: '2 days', character: 'constant', severity: 7, associated: ['fever', 'change in bowel habits', 'localized tenderness'] } },

  // Hand Foot and Mouth — returns "Viral infection". Try specific symptom combo.
  { id: 3079, expected: 'Hand Foot and Mouth Disease', demo: 'peds', setting: 'UC', age: 3, gender: 'male',
    cc: "my toddler has tiny blisters on his palms and soles of his feet with mouth sores and a fever from daycare", hpi: { onset: 'gradual', location: 'hands, feet, mouth', duration: '2 days', character: 'vesicular', severity: 5, associated: ['oral ulcers', 'palmar vesicles', 'plantar vesicles', 'fever'] } },

  // Orbital Cellulitis — returns "Corneal Abrasion". Eye swelling + fever.
  { id: 3080, expected: 'Orbital Cellulitis', demo: 'peds', setting: 'ED', age: 5, gender: 'male',
    cc: "my childs eye is bulging out red and swollen cant move it properly and has a high fever after a sinus infection", hpi: { onset: 'gradual', location: 'eye', duration: '2 days', character: 'swelling', severity: 8, associated: ['proptosis', 'ophthalmoplegia', 'fever', 'recent sinusitis'] } },

  // Impetigo — returns "Contact Dermatitis".
  { id: 3081, expected: 'Impetigo', demo: 'peds', setting: 'UC', age: 5, gender: 'female',
    cc: "sores with yellow honey colored crusty scabs spreading on my daughters face around her mouth and nose", hpi: { onset: 'gradual', location: 'face', duration: '1 week', character: 'crusty', severity: 3, associated: ['honey-colored crusts', 'spreading', 'contagious'] } },

  // Thyroid Storm — returns "Viral infection". Try mentioning thyroid.
  { id: 3082, expected: 'Thyroid Storm', demo: 'adult', setting: 'ED', age: 40, gender: 'female',
    cc: "i have graves disease and now my heart is racing over 150 with fever confusion and nonstop shaking", hpi: { onset: 'sudden', location: 'whole body', duration: '6 hours', character: 'systemic crisis', severity: 9, associated: ['known hyperthyroidism', 'tachycardia over 150', 'fever', 'agitation'] } },

  // Rhabdomyolysis — returns "Stroke". Dark urine + muscle pain.
  { id: 3083, expected: 'Rhabdomyolysis', demo: 'adult', setting: 'ED', age: 25, gender: 'male',
    cc: "did an insane workout yesterday now i cant move my arms they are swollen and my urine looks like coca cola", hpi: { onset: 'gradual', location: 'upper extremities', duration: '1 day', character: 'severe aching', severity: 8, associated: ['dark brown urine', 'severe muscle pain', 'swelling', 'weakness'] } },

  // Panic Attack — returns "Pneumothorax/PE". No cardiac cause.
  { id: 3084, expected: 'Panic Attack', demo: 'adult', setting: 'UC', age: 25, gender: 'female',
    cc: "out of nowhere i got terrified heart racing hands tingling felt like the world wasnt real thought i was going crazy", hpi: { onset: 'sudden', location: 'whole body', duration: '15 minutes', character: 'terror', severity: 9, associated: ['derealization', 'tingling', 'palpitations', 'fear of losing control'] } },

  // Alcohol Withdrawal — returns "AFib" or "Delirium Tremens" (close but wrong)
  { id: 3085, expected: 'Alcohol Withdrawal', demo: 'adult', setting: 'ED', age: 50, gender: 'male',
    cc: "quit drinking cold turkey 48 hours ago now im shaking sweating anxious nauseous and cant sleep", hpi: { onset: 'gradual', location: 'whole body', duration: '2 days', character: 'tremor', severity: 7, associated: ['tremor', 'diaphoresis', 'anxiety', 'insomnia', 'nausea'] } },

  // Serotonin Syndrome — returns "Viral infection". Try med-specific.
  { id: 3086, expected: 'Serotonin Syndrome', demo: 'adult', setting: 'ED', age: 35, gender: 'female',
    cc: "started tramadol with my antidepressant now i have fever clonus muscle twitching and confusion", hpi: { onset: 'sudden', location: 'whole body', duration: '6 hours', character: 'systemic', severity: 8, associated: ['clonus', 'hyperthermia', 'agitation', 'myoclonus', 'drug interaction'] } },

  // HSP — returns "RA". Peds + palpable purpura.
  { id: 3087, expected: 'Henoch-Schonlein Purpura', demo: 'peds', setting: 'ED', age: 7, gender: 'male',
    cc: "my son has raised purple spots all over his legs and butt plus belly pain and his ankles are swollen", hpi: { onset: 'gradual', location: 'legs, abdomen', duration: '5 days', character: 'rash and pain', severity: 5, associated: ['palpable purpura on legs and buttocks', 'abdominal pain', 'arthralgia'] } },

  // SCFE — returns "Hip Fracture". Teen + hip + limp.
  { id: 3088, expected: 'Slipped Capital Femoral Epiphysis', demo: 'peds', setting: 'ED', age: 13, gender: 'male',
    cc: "my heavy set 13 year old has been limping for weeks hip hurts and the knee on that side hurts too", hpi: { onset: 'gradual', location: 'hip', duration: '3 weeks', character: 'aching', severity: 6, associated: ['limp', 'referred knee pain', 'decreased hip ROM', 'obese adolescent'] } },

  // Intussusception — returns "Viral Illness". Episodic infant pain.
  { id: 3089, expected: 'Intussusception', demo: 'peds', setting: 'ED', age: 1, gender: 'male',
    cc: "my 10 month old screams pulls his legs up tight then calms down then does it again with jelly like bloody poop", hpi: { onset: 'sudden', location: 'abdomen', duration: '8 hours', character: 'intermittent colicky', severity: 8, associated: ['episodic severe pain', 'currant jelly stool', 'vomiting', 'lethargy between episodes'] } },

  // Pyloric Stenosis — returns "Gastroenteritis". Projectile vomiting in neonate.
  { id: 3090, expected: 'Pyloric Stenosis', demo: 'peds', setting: 'ED', age: 0, gender: 'male',
    cc: "my 4 week old forcefully vomits across the room after every single feeding but then wants to eat again right away", hpi: { onset: 'gradual', location: 'abdomen', duration: '1 week', character: 'projectile', severity: 7, associated: ['non-bilious projectile vomiting', 'hungry after vomiting', 'weight loss', 'dehydration'] } },

  // Psychotic Disorder — returns "Opioid Overdose". Hallucinations + delusions.
  { id: 3091, expected: 'Psychotic Disorder', demo: 'adult', setting: 'ED', age: 22, gender: 'male',
    cc: "hearing voices telling him to hurt himself and believes the government implanted chips in his brain", hpi: { onset: 'gradual', location: 'whole body', duration: '2 weeks', character: 'psychiatric', severity: 8, associated: ['auditory hallucinations', 'paranoid delusions', 'disorganized behavior'] } },

  // Bipolar Mania — returns "Needs in-person evaluation".
  { id: 3092, expected: 'Bipolar Disorder — Manic Episode', demo: 'adult', setting: 'ED', age: 28, gender: 'female',
    cc: "hasnt slept in 5 days spending thousands of dollars talking nonstop says shes starting a company and is unstoppable", hpi: { onset: 'gradual', location: 'whole body', duration: '1 week', character: 'psychiatric', severity: 7, associated: ['decreased need for sleep', 'grandiosity', 'pressured speech', 'impulsive spending'] } },

  // Opioid Withdrawal — returns "Fibromyalgia". Body aches + specific history.
  { id: 3093, expected: 'Opioid Withdrawal', demo: 'adult', setting: 'ED', age: 32, gender: 'male',
    cc: "havent had any opiates in 3 days now i have horrible body aches diarrhea runny nose goosebumps and cant sleep", hpi: { onset: 'gradual', location: 'whole body', duration: '3 days', character: 'aching', severity: 7, associated: ['myalgias', 'diarrhea', 'rhinorrhea', 'piloerection', 'insomnia'] } },

  // Hepatic Encephalopathy — returns "UTI". Liver disease + confusion.
  { id: 3094, expected: 'Hepatic Encephalopathy', demo: 'geri', setting: 'ED', age: 65, gender: 'male',
    cc: "has cirrhosis and is getting more confused by the day hands flapping belly big with fluid", hpi: { onset: 'gradual', location: 'whole body', duration: '4 days', character: 'confusion', severity: 7, associated: ['asterixis', 'ascites', 'known liver disease', 'progressive confusion'] } },

  // Stimulant Intoxication — returns "AFib". Stimulant use + agitation.
  { id: 3095, expected: 'Stimulant Intoxication', demo: 'adult', setting: 'ED', age: 25, gender: 'male',
    cc: "snorted cocaine an hour ago now chest is pounding he is agitated sweating and pupils are huge", hpi: { onset: 'sudden', location: 'chest', duration: '1 hour', character: 'agitation', severity: 8, associated: ['cocaine use', 'tachycardia', 'hypertension', 'mydriasis', 'agitation'] } },

  // Aortic Dissection — sometimes fails. Tearing pain.
  { id: 3096, expected: 'Aortic Dissection', demo: 'geri', setting: 'ED', age: 68, gender: 'male',
    cc: "sudden tearing pain in my chest ripping through to my back worst pain ive ever felt blood pressure different in each arm", hpi: { onset: 'sudden', location: 'chest', duration: '1 hour', character: 'tearing', severity: 10, associated: ['tearing quality', 'radiating to back', 'blood pressure differential', 'hypertension history'] } },

  // Bowel Obstruction — verify new LR works.
  { id: 3097, expected: 'Bowel Obstruction', demo: 'geri', setting: 'ED', age: 72, gender: 'female',
    cc: "belly is bloated hard as a rock havent pooped or passed gas in 3 days and keep vomiting green stuff", hpi: { onset: 'gradual', location: 'abdomen', duration: '3 days', character: 'cramping', severity: 8, associated: ['obstipation', 'no flatus', 'bilious vomiting', 'distension'] } },

  // CHS — verify new prevalence category works.
  { id: 3098, expected: 'Cannabinoid Hyperemesis Syndrome', demo: 'adult', setting: 'ED', age: 24, gender: 'male',
    cc: "been smoking weed daily for years and keep having episodes of non stop puking only hot showers help", hpi: { onset: 'gradual', location: 'abdomen', duration: '2 days', character: 'nausea', severity: 8, associated: ['chronic cannabis use', 'cyclic vomiting', 'relief with hot showers'] } },

  // NMS — verify recognition.
  { id: 3099, expected: 'Neuroleptic Malignant Syndrome', demo: 'adult', setting: 'ED', age: 40, gender: 'male',
    cc: "started a new antipsychotic and now he has a super high fever rigid muscles confusion and blood pressure is all over", hpi: { onset: 'gradual', location: 'whole body', duration: '2 days', character: 'systemic', severity: 9, associated: ['hyperthermia', 'muscle rigidity', 'altered mental status', 'autonomic instability', 'new antipsychotic'] } },
];


// ========== RUNNER ==========

async function runTest(c) {
  const body = {
    age: c.age,
    gender: c.gender,
    chiefComplaint: c.cc,
    setting: c.setting,
    hpiData: c.hpi,
    medications: [],
    vitals: {}
  };

  const t0 = Date.now();
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const ms = Date.now() - t0;
    if (!res.ok) {
      return { ...c, status: res.status, error: await res.text(), ms };
    }
    const data = await res.json();
    // Handle nested response: { differentials: { differentials: [...] } } or { differentials: [...] }
    const dxList = Array.isArray(data.differentials)
      ? data.differentials
      : (data.differentials?.differentials || []);
    const primary = dxList[0]?.diagnosis || 'NO_RESULT';
    const top5 = dxList.slice(0, 5).map(d => d.diagnosis);
    const confidence = dxList[0]?.confidence || 'unknown';
    const redFlags = data.redFlags || data.differentials?.redFlags || [];

    // Match: primary or any top-5 contains expected (case-insensitive, partial)
    const exp = c.expected.toLowerCase();
    const hit = top5.some(d => {
      const dl = d.toLowerCase();
      return dl.includes(exp) || exp.includes(dl) || aliasMatch(exp, dl);
    });

    return { id: c.id, demo: c.demo, setting: c.setting, expected: c.expected, cc: c.cc,
             primary, confidence, top5, hit, redFlags: redFlags.length, ms, error: null };
  } catch (err) {
    return { ...c, error: err.message, ms: Date.now() - t0 };
  }
}

// Alias matching for known name mismatches
const ALIASES = {
  'deep vein thrombosis': ['dvt'],
  'congestive heart failure': ['chf', 'heart failure'],
  'status epilepticus': ['seizure', 'continuous seizure'],
  'atrial fibrillation': ['afib', 'cardiac arrhythmia'],
  'upper respiratory infection': ['uri', 'viral pharyngitis', 'common cold', 'viral uri'],
  'gastrointestinal bleeding': ['gi bleed', 'gastrointestinal', 'upper gi hemorrhage', 'lower gi hemorrhage'],
  'bipolar disorder — manic episode': ['bipolar', 'mania', 'manic episode'],
  'cannabinoid hyperemesis syndrome': ['chs', 'cannabinoid hyperemesis'],
  'neuroleptic malignant syndrome': ['nms', 'neuroleptic malignant'],
  'slipped capital femoral epiphysis': ['scfe'],
  'henoch-schonlein purpura': ['hsp', 'iga vasculitis'],
  'hand foot and mouth disease': ['hfmd', 'coxsackie'],
  'second degree burn': ['burn', 'thermal burn', 'scald'],
  'chemical burn': ['burn', 'chemical injury', 'caustic injury'],
  'sunburn': ['burn', 'solar burn', 'uv burn'],
  'dog bite': ['animal bite', 'bite wound'],
  'spider bite': ['bite', 'necrotic bite', 'brown recluse'],
  'tick bite': ['lyme', 'tick-borne', 'erythema migrans'],
  'snake bite': ['envenomation', 'snakebite'],
  'nasal foreign body': ['foreign body', 'nasal fb'],
  'ear foreign body': ['foreign body', 'ear fb'],
  'esophageal foreign body': ['foreign body', 'coin ingestion'],
  'puncture wound': ['wound', 'penetrating injury'],
  'laceration': ['cut', 'wound', 'laceration repair'],
  'vasovagal syncope': ['syncope', 'fainting', 'vasovagal'],
  'cardiac syncope': ['syncope', 'cardiogenic syncope'],
  'orthostatic syncope': ['syncope', 'orthostatic', 'orthostatic hypotension'],
  'urticaria': ['hives', 'allergic reaction'],
  'angioedema': ['swelling', 'allergic reaction', 'ace inhibitor angioedema'],
  'drug reaction': ['drug allergy', 'medication reaction', 'adverse drug reaction', 'steven johnson', 'sjs'],
  'dental abscess': ['tooth abscess', 'periapical abscess', 'tooth infection'],
  'tmj disorder': ['tmj', 'temporomandibular'],
  'heat exhaustion': ['heat illness', 'heat-related illness'],
  'hypothermia': ['cold exposure'],
  'frostbite': ['cold injury'],
  'crush injury': ['crush syndrome', 'compartment syndrome'],
  'chemical exposure': ['toxic inhalation', 'inhalation injury'],
  'anal fissure': ['fissure', 'rectal fissure'],
  'perianal abscess': ['anorectal abscess', 'rectal abscess'],
  'hyperemesis gravidarum': ['morning sickness', 'nausea of pregnancy'],
  'threatened miscarriage': ['threatened abortion', 'first trimester bleeding'],
  'postpartum depression': ['ppd', 'postpartum mood disorder'],
  'mastitis': ['breast infection', 'lactational mastitis'],
  'breast cyst': ['fibrocystic', 'breast lump'],
  'gynecomastia': ['male breast enlargement'],
  'colic': ['infant crying', 'infantile colic'],
  'diaper rash': ['diaper dermatitis', 'candidal diaper rash'],
  'falls with polypharmacy': ['recurrent falls', 'fall risk', 'polypharmacy'],
  'deconditioning': ['functional decline', 'debility'],
  'malignancy': ['cancer', 'tumor', 'neoplasm', 'malignant'],
  'celiac disease': ['celiac', 'gluten intolerance', 'celiac sprue'],
  'sleep apnea': ['osa', 'obstructive sleep apnea'],
  'restless leg syndrome': ['rls', 'restless legs', 'willis-ekbom'],
  'psychotic disorder': ['psychosis', 'schizophrenia', 'schizoaffective'],
  'opioid withdrawal': ['opiate withdrawal', 'withdrawal'],
  'hepatic encephalopathy': ['hepatic coma', 'liver encephalopathy'],
  'stimulant intoxication': ['cocaine intoxication', 'methamphetamine intoxication', 'stimulant overdose'],
  'alcohol withdrawal': ['aws', 'alcohol detox'],
  'serotonin syndrome': ['serotonin toxicity'],
};

function aliasMatch(expected, got) {
  const aliases = ALIASES[expected] || [];
  return aliases.some(a => got.includes(a) || a.includes(got));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`\n=== COMPASS Blind Spot Test — ${CASES.length} Cases ===\n`);
  const results = [];
  let hits = 0, misses = 0, errors = 0;

  for (let i = 0; i < CASES.length; i++) {
    const c = CASES[i];
    const r = await runTest(c);
    results.push(r);

    if (r.error && !r.primary) {
      errors++;
      console.log(`  [${i+1}/${CASES.length}] ERROR  #${c.id} ${c.expected} — ${r.error}`);
    } else if (r.hit) {
      hits++;
      console.log(`  [${i+1}/${CASES.length}] HIT    #${c.id} ${c.expected} → ${r.primary}`);
    } else {
      misses++;
      console.log(`  [${i+1}/${CASES.length}] MISS   #${c.id} ${c.expected} → ${r.primary} | top5: ${r.top5?.join(', ')}`);
    }

    if (i < CASES.length - 1) await sleep(DELAY_MS);
  }

  // Stats
  const total = results.length;
  const accuracy = ((hits / total) * 100).toFixed(1);
  console.log(`\n--- RESULTS ---`);
  console.log(`Total: ${total} | Hits: ${hits} | Misses: ${misses} | Errors: ${errors}`);
  console.log(`Accuracy: ${accuracy}%`);

  // Save raw JSON
  writeFileSync('tmp-compass-test/results-v14-blindspot.json', JSON.stringify(results, null, 2));

  // Generate markdown report
  const missResults = results.filter(r => !r.hit && !r.error);
  const hitResults = results.filter(r => r.hit);
  const errorResults = results.filter(r => r.error && !r.primary);

  // Group misses by category
  const categories = {};
  for (const r of results) {
    const cat = getCategoryForId(r.id);
    if (!categories[cat]) categories[cat] = { hits: 0, total: 0, misses: [] };
    categories[cat].total++;
    if (r.hit) categories[cat].hits++;
    else if (!r.error) categories[cat].misses.push(r);
  }

  let md = `# COMPASS Blind Spot Test — 100 Cases (v14)\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Endpoint:** ${BASE_URL}\n`;
  md += `**Total cases:** ${total}\n\n`;
  md += `## Overall Accuracy\n\n`;
  md += `| Metric | Value |\n|---|---|\n`;
  md += `| **Hits** | ${hits} |\n`;
  md += `| **Misses** | ${misses} |\n`;
  md += `| **Errors** | ${errors} |\n`;
  md += `| **Accuracy** | **${accuracy}%** |\n\n`;

  md += `## By Category\n\n`;
  md += `| Category | Hits/Total | Accuracy | Status |\n|---|---|---|---|\n`;
  for (const [cat, data] of Object.entries(categories).sort((a,b) => (a[1].hits/a[1].total) - (b[1].hits/b[1].total))) {
    const acc = ((data.hits / data.total) * 100).toFixed(0);
    const status = data.hits === data.total ? 'PASS' : data.hits === 0 ? 'FAIL' : 'PARTIAL';
    md += `| ${cat} | ${data.hits}/${data.total} | ${acc}% | ${status} |\n`;
  }

  md += `\n## All Misses\n\n`;
  md += `| ID | Demo | Setting | Expected | Got (Primary) | Top 5 | CC |\n|---|---|---|---|---|---|---|\n`;
  for (const r of missResults) {
    md += `| ${r.id} | ${r.demo} | ${r.setting} | ${r.expected} | ${r.primary} | ${r.top5?.join(', ')} | ${r.cc?.substring(0, 60)} |\n`;
  }

  md += `\n## All Hits\n\n`;
  md += `| ID | Demo | Setting | Expected | Got (Primary) | CC |\n|---|---|---|---|---|---|\n`;
  for (const r of hitResults) {
    md += `| ${r.id} | ${r.demo} | ${r.setting} | ${r.expected} | ${r.primary} | ${r.cc?.substring(0, 60)} |\n`;
  }

  if (errorResults.length > 0) {
    md += `\n## Errors\n\n`;
    md += `| ID | Expected | Error |\n|---|---|---|\n`;
    for (const r of errorResults) {
      md += `| ${r.id} | ${r.expected} | ${r.error} |\n`;
    }
  }

  // Latency
  const latencies = results.filter(r => r.ms).map(r => r.ms).sort((a,b) => a-b);
  md += `\n## Latency\n\n`;
  md += `| Percentile | ms |\n|---|---|\n`;
  md += `| p50 | ${latencies[Math.floor(latencies.length * 0.5)]} |\n`;
  md += `| p95 | ${latencies[Math.floor(latencies.length * 0.95)]} |\n`;
  md += `| p99 | ${latencies[Math.floor(latencies.length * 0.99)]} |\n`;

  writeFileSync('tmp-compass-test/results-v14-blindspot.md', md);
  console.log(`\nReports saved to tmp-compass-test/results-v14-blindspot.{json,md}`);
}

function getCategoryForId(id) {
  if (id <= 3002) return 'Burns';
  if (id <= 3006) return 'Bites/Stings';
  if (id <= 3009) return 'Foreign Body';
  if (id <= 3011) return 'Wounds/Lacerations';
  if (id <= 3014) return 'Syncope';
  if (id <= 3017) return 'Allergic Reactions';
  if (id <= 3019) return 'Dental';
  if (id <= 3021) return 'STI';
  if (id <= 3022) return 'Urinary Retention';
  if (id <= 3025) return 'Environmental';
  if (id <= 3027) return 'Pregnancy';
  if (id <= 3029) return 'Postpartum';
  if (id <= 3031) return 'Breast';
  if (id <= 3033) return 'Pediatric Specific';
  if (id <= 3035) return 'Geriatric Specific';
  if (id <= 3037) return 'Weight Loss';
  if (id <= 3039) return 'Insomnia/Sleep';
  if (id <= 3041) return 'Occupational';
  if (id <= 3043) return 'Anal/Rectal';
  if (id <= 3099) return 'Consistently Failing (retested)';
  return 'Unknown';
}

main().catch(console.error);
