// ============================================================
// ATTENDING AI — Lay → Medical Symptom Synonym Expansion
// apps/shared/lib/ai/symptomSynonyms.ts
//
// Patients describe symptoms in plain English with typos, slang,
// and colloquialisms. The engine's prevalence triggers and CC
// keyword LRs were written against medical terminology and miss
// the real-world patient input. This module normalizes free text
// by APPENDING medical equivalents when lay phrases are present,
// so both the original language (for display) and the medical
// form (for matching) are retained.
//
// Approach: substring match (case-insensitive) against the lay
// forms; if any is present in the text, append the canonical
// medical term to the returned string. This is backward-compatible
// — the original text is preserved in full, and the appended
// medical terms simply give the downstream regex matchers another
// way to hit.
//
// Example:
//   Input:  "my chest feels like an elephant is sittin on it"
//   Output: "my chest feels like an elephant is sittin on it chest pain crushing chest pressure"
//
// The output is fed to the prevalence trigger regex and the
// CC-keyword LR regex. Both previously failed on the lay input and
// now succeed because "chest pain" and "chest pressure" appear
// verbatim in the normalized string.
// ============================================================

/**
 * Dictionary: medical term → array of lay expressions that mean the same thing.
 * Keys are the canonical medical term to append; values are substrings to look for.
 * All keys and values are lowercase. Matching is case-insensitive substring.
 *
 * When adding entries, prefer specific lay phrases over single words — e.g.
 * "chest hurts" is specific enough to imply chest pain, but just "hurts" is
 * too generic. Single-word synonyms are only safe when the word is a clear
 * medical referent (e.g. "puking" → "vomiting").
 */
const SYNONYMS: Record<string, string[]> = {
  // ===== CARDIOVASCULAR =====
  'chest pain': [
    'chest hurts', 'chest hurt', 'chest ache', 'chest aching',
    'chest is killing', 'my chest is killing',
    'tightness in chest', 'tight chest', 'tight in my chest',
    'heavy chest', 'chest heavy', 'chest feels heavy', 'chest feels tight',
    'chest feels like', 'my chest feels',
    'elephant on my chest', 'elephant sitting', 'elephant sittin',
    'elephant is sitting', 'an elephant', 'like an elephant',
    'sitting on my chest', 'sittin on my chest', 'sitting on chest',
    'something sitting on my chest', 'weight on my chest', 'weight on chest',
    'pressure on my chest', 'chest pressure', 'pressure in my chest',
    'squeezing chest', 'chest squeezing', 'chest squeeze', 'squeeze in my chest',
    'crushing chest', 'chest crushing', 'crushing my chest', 'crushing pain in chest',
    'band around my chest', 'band across my chest', 'grip on my chest',
    'pain in my chest', 'chest is killing me',
  ],
  'chest pressure': [
    'chest pressure', 'pressure on my chest', 'tight chest',
    'elephant on my chest', 'something sitting on my chest',
    'squeezing chest', 'vise on my chest',
  ],
  'palpitations': [
    'heart pounding', 'heart racing', 'heart is racing', 'racing heart',
    'heart beating fast', 'heart going fast', 'heart flutter', 'heart fluttering',
    'fluttery feeling', 'heart skipping', 'heart is skipping',
    'heart beating irregular', 'irregular heartbeat', 'pounding heart',
  ],
  'syncope': [
    'passed out', 'pass out', 'passes out', 'passing out',
    'blacked out', 'blacks out', 'fainted', 'fainting', 'faint spell',
    'lost consciousness', 'knocked out',
  ],

  // ===== RESPIRATORY =====
  'shortness of breath': [
    "can't breathe", "cant breathe", "can not breathe",
    "can't catch my breath", "cant catch my breath", "cant catch breath",
    "out of breath", 'winded', 'huffing', 'breathless',
    'hard to breathe', 'hard time breathing', 'hard time breathin',
    'struggling to breathe', 'struggle to breathe',
    'breathing is hard', 'breath is short',
  ],
  'dyspnea': [
    "can't breathe", 'hard to breathe', 'short of breath',
    'cant catch breath', 'winded', 'breathless',
  ],
  'orthopnea': [
    "can't lay flat", 'cant lay flat', 'cant sleep flat', 'cannot lay flat',
    'need pillows to sleep', 'need pillows to breathe', 'pillows under head',
    'worse when lying down', 'worse lying flat', 'cant lie flat',
  ],
  'paroxysmal nocturnal dyspnea': [
    'wake up gasping', 'wake up cant breathe', 'wake up short of breath',
    'gasping for air at night', 'wake up gasping for air',
  ],
  'hemoptysis': [
    'coughing blood', 'coughing up blood', 'blood in phlegm',
    'blood in sputum', 'spitting blood', 'blood in my cough',
  ],
  'wheezing': [
    'wheezy', 'whistling when i breathe', 'whistle when i breathe',
    'chest whistling', 'breathing sounds wheezy',
  ],
  'stridor': [
    'noisy breathing', 'whistling breathing', 'high pitched breathing',
    'crowing sound',
  ],
  'barky cough': [
    'barky cough', 'barking cough', 'seal cough', 'seal sounding cough',
    'bark like a seal', 'sounds like a seal',
  ],
  'productive cough': [
    'cough with phlegm', 'coughing up phlegm', 'hacking up phlegm',
    'bringing up yellow', 'bringing up green', 'wet cough',
    'cough with snot', 'yellow snot cough', 'green snot cough',
  ],

  // ===== GASTROINTESTINAL =====
  'abdominal pain': [
    'belly hurt', 'belly hurts', 'belly pain', 'belly ache', 'belly aching',
    'bellyache',
    'tummy hurt', 'tummy hurts', 'tummy pain', 'tummy ache',
    'stomach hurts', 'stomach hurt', 'stomach pain', 'stomach ache', 'stomachache',
    'gut hurts', 'gut pain', 'gut ache',
    "can't eat because of my stomach",
  ],
  'epigastric pain': [
    'upper belly hurt', 'upper belly hurts', 'upper belly pain',
    'upper stomach pain', 'upper stomach hurts',
    'pain under my ribs', 'pain below my ribs',
    'pain in my pit', 'pit of my stomach',
  ],
  'right lower quadrant pain': [
    'bottom right side hurts', 'bottom right belly', 'right lower belly',
    'right side hurts below', 'lower right tummy',
  ],
  'vomiting': [
    'pukin', 'puking', 'puke',
    'throwin up', 'throwing up', 'throw up',
    'barfing', 'barf',
    "can't keep anything down", 'cant keep anything down',
    "can't keep food down", 'cant keep food down',
    "can't keep it down", 'tossin cookies',
  ],
  'nausea': [
    'nauseous', 'nauseaus', 'nauseated',
    'queasy', 'sick to my stomach', 'stomach is upset',
    'tummy upset', 'feel like puking',
  ],
  'diarrhea': [
    'the runs', 'runs', 'runny poop', 'loose poop', 'loose stool',
    'watery poop', 'watery stool', 'liquid stool',
    'havin the runs', 'has the runs',
  ],
  'constipation': [
    "can't poop", 'cant poop', "can't go", 'cant go',
    "haven't pooped", 'havent pooped', 'no bowel movement',
    'backed up', 'blocked up', 'hard stool',
  ],
  'hematemesis': [
    'throwing up blood', 'vomiting blood', 'blood when i puke',
    'bloody vomit',
  ],
  'melena': [
    'black poop', 'black stool', 'black tarry', 'tarry poop',
    'dark black stool', 'dark black poop',
  ],
  'hematochezia': [
    'blood in my poop', 'blood in stool', 'bloody stool',
    'red blood in poop', 'bright red blood',
  ],
  'dysphagia': [
    "can't swallow", 'cant swallow', 'trouble swallowing',
    'food gets stuck', 'food stuck in my throat',
    'food catch', 'food catches in throat', 'hard to swallow',
  ],
  'jaundice': [
    'yellow skin', 'yellow eyes', 'skin turned yellow',
    'eyes are yellow', 'yellowish',
  ],

  // ===== GENITOURINARY =====
  'dysuria': [
    'burns when i pee', 'burns when peeing', 'burning when i pee',
    'burning pee', 'burning urine', 'burning piss',
    'hurts to pee', 'hurts when i pee', 'hurts when peeing',
    'stings when i pee', 'stings when peeing',
    'painful pee', 'pain when peeing', 'pain when urinating',
    'it burns to pee',
  ],
  'urinary frequency': [
    'peeing all the time', 'peein all the time', 'peeing constantly',
    'have to go all the time', 'gotta go every 10 minutes',
    'running to the bathroom', 'keep going to the bathroom',
    'gotta pee a lot', 'keep having to pee',
  ],
  'polyuria': [
    'peeing a lot', 'peein a lot', 'peein constantly',
    'cant stop peeing', "can't stop peeing", 'going all the time',
    'pee nonstop', 'urinate all the time',
  ],
  'polydipsia': [
    'drinking a lot', 'drinkin tons', 'drinking tons',
    "can't stop drinking", 'cant stop drinking',
    'so thirsty', 'super thirsty', 'drinking water constantly',
    'drinkin water nonstop', 'always thirsty',
  ],
  'hematuria': [
    'blood in pee', 'blood in my pee', 'blood in urine',
    'blood in my urine', 'pink pee', 'red pee', 'bloody urine',
  ],
  'urinary incontinence': [
    'peeing myself', 'wet my pants', 'leak pee', 'leaking pee',
    "can't hold my pee", 'cant control my pee',
    'pee accidents', 'having accidents',
  ],
  'testicular pain': [
    'nut hurts', 'nut hurt', 'nuts hurt',
    'pain in my nut', 'pain in my nuts', 'pain in his nut', 'pain in his nuts',
    'pain in my left nut', 'pain in my right nut', 'pain in his left nut', 'pain in his right nut',
    'my nut', 'his nut', 'her nut', 'left nut', 'right nut',
    'ball hurts', 'balls hurt', 'ball pain', 'balls pain',
    'pain in my ball', 'pain in his ball',
    'testicle hurts', 'testicles hurt', 'down there pain',
    'pain in my groin', 'groin hurts', 'groin pain',
  ],
  'vaginal bleeding': [
    'bleeding down there', 'bleeding vaginally', 'bleeding from vagina',
    'period bleeding', 'spotting',
  ],

  // ===== NEUROLOGICAL =====
  'headache': [
    'head hurts', 'head hurt', 'head is killing me', 'head killing me',
    'my head hurts', 'my head kills', 'head aching',
    'pounding in my head', 'pounding head',
    'pain in my head',
  ],
  'worst headache of life': [
    'worst headache of my life', 'worst headache ever',
    'worst headache ive ever had', 'headache worst ever',
    'ton of bricks headache', 'like a ton of bricks',
    'hit me like a ton of bricks',
  ],
  'stiff neck': [
    'stiff neck', 'neck stiff', 'cant turn my neck',
    "can't turn my head", 'cant move my neck', 'neck wont move',
  ],
  'photophobia': [
    'lights bother me', 'lights bother', 'light bothers me',
    "can't stand light", "can't stand the light",
    'cant stand lights', 'bright hurts', 'lights hurt', 'light hurts',
    'light sensitive', 'sensitive to light',
  ],
  'phonophobia': [
    'sound hurts', 'noise hurts', 'cant stand noise',
    'cant stand sound', 'sound bothers me',
  ],
  'aphasia': [
    "can't speak right", 'cant speak right', "can't speak clearly",
    'cant speak clearly', 'slurred speech', 'slurrin', 'slurring words',
    'slurring my words', "words won't come", 'words wont come out',
    "can't talk clearly", 'cant talk clearly', 'cant talk right',
  ],
  'facial droop': [
    'face droop', 'face drooping', 'face droopin', 'droopin face',
    'drooping face', 'half my face is droopy', 'half my face is drooping',
    "can't close my eye", 'cant close my eye',
    "can't smile right", 'cant smile right',
    'one side of face', 'side of face drooping',
  ],
  'hemiparesis': [
    "can't move one side", 'cant move one side',
    'one side is weak', 'one side weak',
    'arm went dead', 'arm wont move', 'cant move my arm',
    'leg wont move', 'half of body weak', 'half my body is weak',
  ],
  'seizure': [
    'shaking episode', 'shaking fit', 'shakin fit',
    'convulsions', 'convulsing', 'fit',
    'eyes rolled back', 'eyes rolling back',
  ],
  'vertigo': [
    'room spinning', 'room is spinning', 'spinning sensation',
    'everything is spinning', 'dizzy and spinning',
  ],
  'dizziness': [
    'dizzy', 'lightheaded', 'lightheadedness', 'woozy',
    'head spinning', 'feel spinny',
  ],
  'confusion': [
    "doesn't know where", 'doesnt know where', 'not making sense',
    'not makin sense', 'out of it', 'not acting right',
    'not actin right', 'acting weird', 'weird behavior',
    'disoriented',
  ],
  'lethargy': [
    'wont wake up', "won't wake up", 'super sleepy',
    'just lays there', 'just laying there',
    'floppy', 'limp', 'not moving',
    'not himself', 'not herself',
  ],
  'weakness': [
    'weak', 'no strength', 'feel weak', 'legs wont hold me',
    "can't stand up", 'cant stand up', 'too weak to stand',
  ],

  // ===== DERMATOLOGIC =====
  'rash': [
    'red bumps', 'red spots', 'red patches', 'blotchy',
    'breaking out', 'broke out', 'red blotchy',
  ],
  'hives': [
    'welts', 'raised bumps', 'itchy welts', 'itchy bumps',
    'allergy bumps', 'allergic bumps',
  ],
  'vesicular rash': [
    'blisters', 'blistering rash', 'fluid filled bumps',
    'watery bumps', 'little blisters', 'tiny blisters',
  ],
  'dermatomal rash': [
    'rash in a stripe', 'blisters in a stripe', 'stripe on my back',
    'stripe on my side', 'stripe on my chest', 'rash on one side only',
    'one sided rash', 'band of blisters',
  ],
  'conjunctivitis': [
    'pinkeye', 'pink eye', 'eye is red', 'eyes are red',
    'red eye', 'red eyes', 'eye all red', 'eyes all red',
    'eye discharge', 'gunky eye', 'gunky eyes',
    'gunk in eye', 'gunk in my eye', 'gunk coming out',
    'eye boogers', 'eye stuck shut', 'stuck shut',
    'crusty eye', 'crusty eyes', 'crust in my eye',
    'goopy eye', 'goop in my eye',
  ],
  'impetigo': [
    'honey colored crust', 'honey crust', 'honey colored sores',
    'crusty sores', 'sores around mouth', 'sores around nose',
    'golden crust', 'golden crusted sores',
    'weeping sores', 'oozing sores', 'sores that spread',
  ],
  'hand foot mouth disease': [
    'sores in mouth', 'blisters on hands', 'blisters on feet',
    'blisters on palms', 'sores on palms', 'sores on feet',
    'mouth sores and blisters', 'hand foot mouth',
    'spots on hands and feet', 'bumps on hands and feet',
  ],
  'varicella': [
    'chickenpox', 'chicken pox', 'itchy blisters all over',
    'blisters all over', 'itchy spots all over',
    'pox', 'the pox',
  ],
  'shingles': [
    'shingles', 'one sided blisters', 'painful rash one side',
    'burning rash one side', 'stripe of blisters',
    'blisters on one side of body',
  ],
  'cellulitis': [
    'skin infection', 'red hot swollen skin', 'spreading redness',
    'red area spreading', 'warm red skin', 'infected skin',
  ],
  'erythema': [
    'red', 'redness', 'skin is red', 'skin turned red',
  ],
  'swelling': [
    'swollen', 'puffy', 'big and puffy', 'swole up',
    'bloated', 'bulging',
  ],

  // ===== CONSTITUTIONAL =====
  'fatigue': [
    'exhausted', 'tired all the time', 'no energy', 'wiped out',
    'worn out', 'so tired', 'bone tired', 'dead tired',
    'cant get out of bed', 'cant keep my eyes open',
  ],
  'fever': [
    'running a temp', 'running a fever', 'got a fever', 'has a fever',
    'high fever', 'burning up', 'warm', 'hot to touch',
    'feels hot', 'temperature of', 'temp of',
  ],
  'chills': [
    'freezing cold', 'shivering', 'can\'t get warm', 'teeth chattering',
    'goosebumps', 'cold sweats', 'shiverin',
  ],
  'diaphoresis': [
    'sweating buckets', 'drenched in sweat', 'soaked with sweat',
    'sweating like crazy', 'sweating profusely', 'drenched',
  ],
  'weight loss': [
    'lost weight', 'losing weight', 'dropped pounds', 'pants falling off',
    'losing pounds', 'lost like 20 pounds', 'lost about',
  ],
  'weight gain': [
    'gained weight', 'gaining weight', 'put on pounds', 'put on weight',
  ],
  'night sweats': [
    'soaked the sheets', 'sweating at night', 'drenched at night',
    'wake up sweating',
  ],

  // ===== MUSCULOSKELETAL =====
  'back pain': [
    'back hurt', 'back hurts', 'back is killing', 'back killing me',
    'my back hurts', 'achey back', 'back ache', 'backache',
  ],
  'flank pain': [
    'side hurts', 'side is killing', 'pain in my side', 'pain on my side',
    'hurts on my side', 'right side hurts', 'left side hurts',
    'side pain', 'side ache',
  ],
  'joint pain': [
    'joints hurt', 'joints ache', 'joint ache', 'sore joints',
    'hurt all over my joints',
  ],
  'widespread pain': [
    'whole body hurts', 'body hurts all over', 'everything hurts',
    'hurt everywhere', 'hurts all over', 'hurting all over',
    'all over body pain', 'body aches everywhere',
  ],
  'stiffness': [
    'stiff', 'cant bend', "can't bend", 'feels stiff',
    'stiff in the morning',
  ],
  'arthritis': [
    'joint pain', 'arthritic', 'arthuritis',
  ],

  // ===== MENTAL HEALTH =====
  'suicidal ideation': [
    'thinking about ending it', 'want to die', 'end my life',
    'thinking of ending it', 'thoughts of suicide', 'thoughts of killing myself',
    'want to kill myself',
  ],
  'depression': [
    'hopeless', 'no interest', 'nothing matters', 'dont want to do anything',
    'feeling down', 'really sad',
  ],
  'anxiety': [
    'anxious', 'panicking', 'panic', 'scared', 'feel like im dying',
    'feel like im going to die', 'like im gonna die',
  ],

  // ===== PEDIATRIC-SPECIFIC =====
  'ear pain': [
    'pulling at ear', 'pullin at ear', 'pullin at her ear', 'pullin at his ear',
    'pullin ear', 'pulling ear', 'pull at ear', 'pulling on her ear',
    'pulls at her ear', 'pulls at his ear', 'pulls his ear',
    'pulling at his ear', 'pulls ear', 'pulls on ear',
    'tugging ear', 'tuggin ear', 'tugging on her ear', 'tugging at ear',
    'tuggin at ear', 'tugs at ear', 'tugs on ear',
    'ear hurt', 'ear hurts', 'earache', 'ear ache',
    'ear infection',
  ],
  'fussy': [
    'wont stop crying', 'crying all the time', 'cryin all the time',
    'inconsolable',
  ],
  'poor feeding': [
    'wont eat', 'wont drink', 'not eating', 'not drinking',
    'wont take a bottle', 'refusing bottle', 'not feeding',
  ],
  'currant jelly stool': [
    'red jelly poop', 'jelly poop', 'red jelly',
    'jelly looking poop',
  ],

  // ===== OB/GYN =====
  'missed period': [
    "period is late", 'late period', 'missed my period',
    'period hasnt come', 'havent had my period',
  ],

  // ===== SPECIFIC CONDITION TRIGGERS =====
  'saddle anesthesia': [
    "can't feel in my groin", 'cant feel in my groin',
    "can't feel anything in my groin", 'cant feel anything in my groin',
    'numb in my groin', 'numbness in groin', 'groin is numb',
    'numb down there', 'numbness down there',
    'numb between my legs', 'cant feel between my legs',
  ],
  'bladder incontinence': [
    "can't control my pee", 'cant control my pee',
    "can't hold my bladder", 'cant hold my bladder',
    'lost control of my bladder', 'wetting myself',
    'peeing on myself', 'bladder wont work',
  ],
  'sore throat': [
    'throat hurts', 'throat is killing', 'throat killing me',
    'throat is on fire', 'throat burning', 'my throat hurts',
    'throat is sore', 'hurts to swallow', 'painful swallowing',
    'pain when i swallow',
  ],
  'butterfly rash': [
    'rash on my cheeks', 'rash on cheeks', 'rash across my cheeks',
    'cheek rash', 'face rash and sun', 'rash worse in sun',
    'rash looks like a butterfly', 'butterfly shaped rash',
  ],
  'fruity breath': [
    'breath smells fruity', 'fruity breath', 'breath smells funny',
    'breath smells like nail polish', 'nail polish smell',
    'acetone breath', 'sweet smelling breath',
  ],
  'leg swelling bilateral': [
    'both legs swollen', 'legs are swollen', 'legs swollen',
    'swollen legs', 'swollen ankles', 'ankles swollen',
    'feet swollen', 'swollen feet',
  ],

  // ===== EYE =====
  'visual acuity change': [
    'blurry vision', 'blurry', 'cant see right', "can't see right",
    'vision is off', 'vision blurry', 'vision changed', 'see sparkles',
    'seeing sparkles', 'seeing spots',
  ],
  'vision loss': [
    'cant see', "can't see", 'lost vision', 'losing vision',
    'blind', 'went blind', 'cant see out of',
  ],
  'eye discharge': [
    'gunk in my eye', 'gunk coming out', 'goop in my eye',
    'eye boogers', 'stuck shut', 'crusty eye', 'crust in my eye',
  ],
};

/**
 * Canonical medical terms listed in SYNONYMS (the keys). Used by the
 * "does this match any category?" client-side helper.
 */
export const MEDICAL_TERMS = Object.keys(SYNONYMS);

/**
 * Normalize text by appending the canonical medical term whenever any of
 * its lay forms appears in the input. Returns a longer string that
 * preserves the original text and adds medical synonyms; the downstream
 * regex matchers can then hit on either form.
 *
 * Case-insensitive. Returns input unchanged if empty/falsy.
 */
export function normalizeSymptomText(text: string | undefined | null): string {
  if (!text) return '';
  const lower = text.toLowerCase();
  const appended: string[] = [];
  const seen = new Set<string>();
  for (const [medical, synonyms] of Object.entries(SYNONYMS)) {
    if (seen.has(medical)) continue;
    for (const syn of synonyms) {
      if (lower.includes(syn)) {
        appended.push(medical);
        seen.add(medical);
        break;
      }
    }
  }
  if (appended.length === 0) return text;
  return `${text} ${appended.join(' ')}`;
}

/**
 * Heuristic: does the text look like a known symptom? Used by the chat
 * flow to decide whether to ask for clarification after the user types
 * their chief complaint.
 *
 * Returns true if normalizeSymptomText would add at least one canonical
 * medical term OR the text already contains at least one medical term
 * that the engine's prevalence categories or CC-keyword LRs can match.
 */
const FALLBACK_MEDICAL_HITS = [
  'chest', 'heart', 'breath', 'breathe', 'lung',
  'head', 'headache', 'migrain', 'dizzy', 'vertigo',
  'belly', 'stomach', 'abdomen', 'abdomin', 'tummy', 'gut',
  'back pain', 'back hurt', 'lumbar', 'sciatica',
  'knee', 'hip', 'shoulder', 'elbow', 'ankle', 'wrist',
  'rash', 'hive', 'itch', 'blister', 'burn', 'cut',
  'fever', 'chill', 'tired', 'fatigue', 'weight',
  'pee', 'urine', 'urinate', 'bladder', 'kidney',
  'poop', 'stool', 'bowel', 'diarrhea', 'constipat',
  'vomit', 'nausea', 'throw up', 'puke',
  'swell', 'bruis', 'fall', 'fell', 'injur', 'hurt', 'pain',
  'sore throat', 'throat', 'tonsil', 'cough', 'cold', 'flu',
  'ear', 'eye', 'nose', 'mouth', 'tongue', 'lip', 'face',
  'neck', 'arm', 'leg', 'foot', 'hand', 'toe', 'finger',
  'seizure', 'faint', 'pass out', 'black out',
  'cancer', 'tumor', 'lump', 'mass',
  'period', 'pregnan', 'bleeding', 'vagin',
  'diabetes', 'diabetic', 'glucose', 'insulin',
  'depress', 'anxious', 'panic', 'sad', 'suicid',
  'infect', 'sepsis',
];

export function matchesKnownSymptom(text: string | undefined | null): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  if (lower.length < 3) return false;
  // Check if the normalizer would pick up any lay forms
  for (const synonyms of Object.values(SYNONYMS)) {
    for (const syn of synonyms) {
      if (lower.includes(syn)) return true;
    }
  }
  // Fallback: check for any medical keyword
  for (const kw of FALLBACK_MEDICAL_HITS) {
    if (lower.includes(kw)) return true;
  }
  return false;
}
