// ============================================================
// COMPASS Stress Test — 600 API Cases (v18)
// Full coverage: medical + psych + substance + inclusive + layman
// IDs 3000-3599, mix of peds/adult/geri, ED/UC/PC
// ============================================================

import { writeFileSync } from 'fs';

const BASE_URL = 'http://localhost:3005/api/diagnose';
const DELAY_MS = 3500; // Must stay above 3s to respect 20/min rate limit

// --- Case Generator ---

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const SETTINGS = ['ED', 'UC', 'PC'];

function makeAge(demo) {
  if (demo === 'peds') return randomInt(1, 17);
  if (demo === 'adult') return randomInt(18, 64);
  return randomInt(65, 95);
}

function makeGender() { return Math.random() > 0.5 ? 'male' : 'female'; }

// --- Disease definitions with layman phrasings ---
// Each entry: { expected, phrasings[], hpiTemplate }

const COMMON_CONDITIONS = [
  // Acute MI (10 variants)
  { expected: 'Acute Myocardial Infarction', phrasings: [
    "my chest feels like someones sittin on it and my left arm is numb",
    "this pressure in my chest wont let up been going on for an hour",
    "feels like a vice grip on my chest and im sweatin buckets",
    "my jaw hurts real bad and im so tired i cant move and kinda nauseous",
    "i been havin this weird squeezing in my chest since this morning",
    "woke up drenched in sweat with this heavy feeling right here in my chest",
    "everything hurts my chest my arm my back and i feel like im gonna pass out",
    "i thought it was heartburn but its been 3 hours and tums aint helpin",
    "im confused and my chest feels tight cant really think straight",
    "been outta breath all day and theres this ache in my chest that wont quit"
  ], hpi: () => ({ onset: 'sudden', location: 'chest', duration: randomFrom(['1 hour', '2 hours', '30 minutes']), character: 'pressure', severity: randomInt(7, 10), aggravating: ['exertion'], relieving: ['nothing'], associated: ['shortness of breath', 'sweating', 'nausea'] }) },

  // Stroke (5 variants)
  { expected: 'Stroke', phrasings: [
    "my face is drooping on one side and i cant lift my right arm",
    "i cant talk right everything is coming out wrong and my arm wont work",
    "suddenly everything went blurry and my left side feels dead",
    "worst headache of my life and now i cant feel the right side of my body",
    "my speech is all slurred and i dropped my coffee cuz my hand stopped working"
  ], hpi: () => ({ onset: 'sudden', location: 'head', duration: randomFrom(['30 minutes', '1 hour']), character: 'weakness', severity: 9, associated: ['facial drooping', 'arm weakness', 'speech difficulty'] }) },

  // PE (5 variants)
  { expected: 'Pulmonary Embolism', phrasings: [
    "cant catch my breath outta nowhere and my chest hurts when i breathe in",
    "sharp pain in my chest every time i take a breath and my heart is racing",
    "i was just sittin there and suddenly couldnt breathe and started coughing",
    "my leg was swollen last week now i cant breathe and chest hurts",
    "feel like im suffocating and theres this stabbing pain on the right side"
  ], hpi: () => ({ onset: 'sudden', location: 'chest', duration: randomFrom(['2 hours', '1 hour']), character: 'sharp', severity: 8, aggravating: ['breathing'], associated: ['shortness of breath', 'rapid heart rate', 'cough'] }) },

  // Pneumonia (5 variants)
  { expected: 'Pneumonia', phrasings: [
    "been coughing up green stuff for a week and got the chills real bad",
    "my cough wont quit and i got a fever and everything aches",
    "feels like im breathing through mud and i keep hackin up yellow gunk",
    "chest hurts when i cough and i been runnin a fever of 102 for three days",
    "started as a cold but now i cant stop shaking and coughing up nasty stuff"
  ], hpi: () => ({ onset: 'gradual', location: 'chest', duration: randomFrom(['5 days', '1 week']), character: 'aching', severity: 6, associated: ['fever', 'productive cough', 'chills', 'fatigue'] }) },

  // UTI (5 variants)
  { expected: 'Urinary Tract Infection', phrasings: [
    "burns like fire when i pee and i gotta go every 5 minutes",
    "feels like peein razor blades and my pee smells awful",
    "it hurts so bad to pee and theres blood in it",
    "i keep runnin to the bathroom but barely anything comes out and it stings",
    "constant urge to pee and it burns every single time"
  ], hpi: () => ({ onset: 'gradual', location: 'lower abdomen', duration: randomFrom(['2 days', '3 days']), character: 'burning', severity: 6, associated: ['frequent urination', 'urgency', 'foul smelling urine'] }) },

  // Appendicitis (5 variants)
  { expected: 'Appendicitis', phrasings: [
    "started around my belly button now the pain moved to the lower right and i wanna puke",
    "my right side is killing me i cant even stand up straight",
    "belly pain thats getting worse especially on the lower right cant eat anything",
    "sharp stabbing pain in my lower right belly and i got a fever",
    "pain in my stomach moved down to the right side and bumps in the road make it way worse"
  ], hpi: () => ({ onset: 'gradual', location: 'right lower abdomen', duration: randomFrom(['12 hours', '1 day']), character: 'sharp', severity: 8, aggravating: ['movement'], associated: ['nausea', 'vomiting', 'fever', 'loss of appetite'] }) },

  // Asthma (3 variants)
  { expected: 'Asthma', phrasings: [
    "cant breathe my chest is so tight and theres this wheezing sound",
    "my breathing is whistling and i feel like im sucking air through a straw",
    "allergies set off my chest and now im wheezing and gasping"
  ], hpi: () => ({ onset: randomFrom(['sudden', 'gradual']), location: 'chest', duration: randomFrom(['2 hours', '1 day']), character: 'tight', severity: 7, aggravating: randomFrom(['exercise', 'cold air', 'allergens']), relieving: ['rest'], associated: ['wheezing', 'shortness of breath', 'cough'] }) },

  // Gastroenteritis (5 variants)
  { expected: 'Gastroenteritis', phrasings: [
    "been pukin my guts out since last night and got the runs too",
    "cant keep nothin down been throwin up all day and my stomach is crampin",
    "my stomach is a mess been runnin to the toilet every hour",
    "i ate somethin bad now im pukin and got diarrhea and feel awful",
    "non stop pukin and diarrhea since yesterday i think im dehydrated"
  ], hpi: () => ({ onset: 'sudden', location: 'abdomen', duration: randomFrom(['1 day', '2 days']), character: 'cramping', severity: 6, associated: ['nausea', 'vomiting', 'diarrhea', 'fever'] }) },

  // Migraine (3 variants)
  { expected: 'Migraine', phrasings: [
    "my head is pounding so bad i cant see straight and lights make it worse",
    "throbbing pain behind my eye and i feel like ima throw up from it",
    "worst headache ever on one side and everything is too loud and too bright"
  ], hpi: () => ({ onset: 'gradual', location: 'head', duration: randomFrom(['4 hours', '8 hours']), character: 'throbbing', severity: 8, aggravating: ['light', 'noise'], relieving: ['dark room'], associated: ['nausea', 'sensitivity to light', 'sensitivity to sound'] }) },

  // Kidney Stone (3 variants)
  { expected: 'Nephrolithiasis', phrasings: [
    "worst pain of my life in my side it comes and goes and i cant sit still",
    "pain in my back going down to my groin and theres blood when i pee",
    "feels like someone stabbing me in the flank and waves of agony"
  ], hpi: () => ({ onset: 'sudden', location: 'flank', duration: randomFrom(['3 hours', '6 hours']), character: 'colicky', severity: 10, associated: ['blood in urine', 'nausea', 'vomiting'] }) },

  // CHF (5 variants)
  { expected: 'Congestive Heart Failure', phrasings: [
    "my ankles are huge and i cant breathe when i lay down at night",
    "keep waking up at night gasping for air and my legs are swollen",
    "gained like 10 pounds in a week all water weight and cant catch my breath",
    "so short of breath climbing stairs and my feet look like balloons",
    "cant walk to the mailbox without stopping to rest and my shoes dont fit anymore"
  ], hpi: () => ({ onset: 'gradual', location: 'chest', duration: randomFrom(['2 weeks', '1 week']), character: 'heaviness', severity: 7, aggravating: ['exertion', 'lying flat'], relieving: ['sitting up'], associated: ['swollen ankles', 'shortness of breath', 'weight gain', 'fatigue'] }) },

  // DVT (3 variants)
  { expected: 'Deep Vein Thrombosis', phrasings: [
    "my calf is swollen red and hurts like crazy been sittin a lot lately",
    "one leg is way bigger than the other and its warm and tender",
    "pain in the back of my leg and its all swollen up after my long flight"
  ], hpi: () => ({ onset: 'gradual', location: 'calf', duration: randomFrom(['2 days', '3 days']), character: 'aching', severity: 6, associated: ['leg swelling', 'warmth', 'redness'] }) },

  // COPD exacerbation (3 variants)
  { expected: 'COPD Exacerbation', phrasings: [
    "my copd is acting up cant breathe and coughing way more than usual",
    "lungs feel like theyre on fire and i cant stop coughing green stuff",
    "breathing is worse than ever my inhaler aint helping like it usually does"
  ], hpi: () => ({ onset: 'gradual', location: 'chest', duration: randomFrom(['3 days', '5 days']), character: 'tight', severity: 7, associated: ['increased cough', 'increased sputum', 'wheezing', 'shortness of breath'] }) },

  // Pyelonephritis (3 variants)
  { expected: 'Pyelonephritis', phrasings: [
    "hurts to pee and now my back is killing me and i got a high fever",
    "started like a uti but now i got chills and my side hurts bad",
    "fever of 103 and pain in my lower back plus burning when i urinate"
  ], hpi: () => ({ onset: 'gradual', location: 'flank', duration: '3 days', character: 'aching', severity: 7, associated: ['fever', 'chills', 'burning urination', 'nausea'] }) },

  // Meningitis (3 variants)
  { expected: 'Meningitis', phrasings: [
    "worst headache ever my neck is so stiff i cant touch my chin to my chest",
    "head is killing me cant look at lights and my neck wont bend",
    "high fever headache stiff neck and i feel confused"
  ], hpi: () => ({ onset: 'sudden', location: 'head', duration: '1 day', character: 'severe', severity: 9, associated: ['stiff neck', 'fever', 'photophobia', 'confusion'] }) },

  // DKA (3 variants)
  { expected: 'Diabetic Ketoacidosis', phrasings: [
    "im diabetic and been peein a ton super thirsty and my belly hurts",
    "my sugar was over 500 and i feel terrible im so nauseous and weak",
    "breath smells fruity been throwing up and drinking water nonstop sugar is sky high"
  ], hpi: () => ({ onset: 'gradual', location: 'abdomen', duration: '2 days', character: 'nausea', severity: 7, associated: ['excessive thirst', 'frequent urination', 'nausea', 'vomiting', 'abdominal pain', 'fruity breath'] }) },

  // Sepsis (5 variants)
  { expected: 'Sepsis', phrasings: [
    "fever wont break im shaking uncontrollably and my heart is racin",
    "feel like im dying fever chills cant think straight and so weak",
    "infection got real bad now im lightheaded heart pounding fever 104",
    "had a cut that got infected now i feel terrible fever racing heart confusion",
    "been sick all week and now my blood pressure dropped and im barely conscious"
  ], hpi: () => ({ onset: 'gradual', location: 'whole body', duration: randomFrom(['2 days', '3 days']), character: 'systemic', severity: 9, associated: ['fever', 'chills', 'rapid heart rate', 'confusion', 'low blood pressure'] }) },

  // Gout (3 variants)
  { expected: 'Gout', phrasings: [
    "my big toe is swollen red and hurts so bad i cant even put a sheet on it",
    "toe joint blew up overnight cant walk on it and its bright red",
    "woke up with the worst pain in my foot its swollen hot and throbbing"
  ], hpi: () => ({ onset: 'sudden', location: 'big toe', duration: '1 day', character: 'throbbing', severity: 9, associated: ['joint swelling', 'redness', 'warmth'] }) },

  // Pharyngitis/Strep (3 variants)
  { expected: 'Pharyngitis', phrasings: [
    "throat is on fire cant swallow and theres white spots back there",
    "sore throat is killing me and my glands are all swollen up",
    "hurts so bad to swallow even water and i got a fever"
  ], hpi: () => ({ onset: 'gradual', location: 'throat', duration: '2 days', character: 'burning', severity: 6, associated: ['fever', 'swollen lymph nodes', 'difficulty swallowing'] }) },

  // Cellulitis (3 variants)
  { expected: 'Cellulitis', phrasings: [
    "my leg is all red hot and swollen spreading up from a cut i got",
    "skin on my arm is red warm and tender and the redness keeps getting bigger",
    "got a bug bite and now theres a big red area thats warm and hurts"
  ], hpi: () => ({ onset: 'gradual', location: randomFrom(['leg', 'arm']), duration: '3 days', character: 'warm', severity: 5, associated: ['redness', 'warmth', 'swelling', 'tenderness'] }) },

  // Bronchitis (3 variants)
  { expected: 'Bronchitis', phrasings: [
    "this cough wont go away been over a week and now im coughing up stuff",
    "had a cold and now this chest cough keeps me up at night",
    "coughing so much my chest is sore but no real fever"
  ], hpi: () => ({ onset: 'gradual', location: 'chest', duration: '10 days', character: 'aching', severity: 4, associated: ['productive cough', 'chest discomfort', 'fatigue'] }) },

  // Viral URI (3 variants)
  { expected: 'Upper Respiratory Infection', phrasings: [
    "stuffy nose sore throat and i feel run down just a bad cold",
    "runny nose sneezing and my throat is scratchy feel lousy",
    "head is all stuffed up and i got a little cough and body aches"
  ], hpi: () => ({ onset: 'gradual', location: 'head', duration: '3 days', character: 'congestion', severity: 3, associated: ['runny nose', 'sneezing', 'sore throat', 'mild cough'] }) },

  // Pneumothorax (2 variants)
  { expected: 'Pneumothorax', phrasings: [
    "sharp chest pain outta nowhere and now i cant take a full breath",
    "felt a pop in my chest and suddenly cant breathe on one side"
  ], hpi: () => ({ onset: 'sudden', location: 'chest', duration: '1 hour', character: 'sharp', severity: 8, associated: ['shortness of breath', 'decreased breath sounds'] }) },

  // Aortic Dissection (2 variants)
  { expected: 'Aortic Dissection', phrasings: [
    "tearing pain between my shoulder blades worst pain of my life",
    "ripping sensation in my chest going through to my back and im gonna pass out"
  ], hpi: () => ({ onset: 'sudden', location: 'chest/back', duration: '30 minutes', character: 'tearing', severity: 10, associated: ['back pain', 'syncope', 'blood pressure difference between arms'] }) },

  // SAH (2 variants)
  { expected: 'Subarachnoid Hemorrhage', phrasings: [
    "thunderclap headache worst of my life hit me like a baseball bat",
    "sudden explosive headache and now my neck is stiff and i feel sick"
  ], hpi: () => ({ onset: 'sudden', location: 'head', duration: '1 hour', character: 'explosive', severity: 10, associated: ['stiff neck', 'nausea', 'vomiting', 'photophobia'] }) },

  // Ectopic Pregnancy (2 variants)
  { expected: 'Ectopic Pregnancy', phrasings: [
    "sharp pain on one side of my lower belly and i missed my period and theres spotting",
    "pelvic pain with some bleeding and i think i might be pregnant"
  ], hpi: () => ({ onset: 'sudden', location: 'lower abdomen', duration: '4 hours', character: 'sharp', severity: 8, associated: ['vaginal bleeding', 'missed period', 'dizziness'] }), gender: 'female', ageRange: [18, 40] },

  // Testicular Torsion (2 variants)
  { expected: 'Testicular Torsion', phrasings: [
    "my testicle suddenly hurts so bad i wanna throw up and its swollen",
    "woke up with terrible pain down there and one side is way higher than the other"
  ], hpi: () => ({ onset: 'sudden', location: 'testicle', duration: '2 hours', character: 'severe', severity: 9, associated: ['nausea', 'vomiting', 'testicular swelling'] }), gender: 'male', ageRange: [10, 25] },

  // Diverticulitis (3 variants)
  { expected: 'Diverticulitis', phrasings: [
    "pain in my lower left belly with fever and i been constipated",
    "left side of my gut hurts and i got a fever and feel bloated",
    "belly pain on the lower left that gets worse and i dont wanna eat"
  ], hpi: () => ({ onset: 'gradual', location: 'left lower abdomen', duration: '2 days', character: 'cramping', severity: 6, associated: ['fever', 'constipation', 'bloating', 'nausea'] }) },

  // Pancreatitis (3 variants)
  { expected: 'Pancreatitis', phrasings: [
    "pain in my upper belly going straight through to my back and i cant stop throwing up",
    "worst belly pain after eating greasy food goes right through to my back",
    "upper stomach pain that gets worse after i eat and im puking"
  ], hpi: () => ({ onset: 'sudden', location: 'upper abdomen', duration: '1 day', character: 'boring', severity: 9, aggravating: ['eating'], relieving: ['leaning forward'], associated: ['nausea', 'vomiting', 'back pain'] }) },

  // Cholecystitis (3 variants)
  { expected: 'Cholecystitis', phrasings: [
    "pain under my right ribs especially after eating and im nauseous",
    "right upper belly pain that goes to my shoulder and i feel sick",
    "gallbladder area is killing me after that burger cant stop puking"
  ], hpi: () => ({ onset: 'sudden', location: 'right upper abdomen', duration: '6 hours', character: 'sharp', severity: 7, aggravating: ['fatty food'], associated: ['nausea', 'vomiting', 'fever', 'right shoulder pain'] }) },

  // Croup (2 variants)
  { expected: 'Croup', phrasings: [
    "my baby has a barking cough sounds like a seal and is having trouble breathing",
    "my toddlers cough sounds really weird like barking and hes wheezy"
  ], hpi: () => ({ onset: 'gradual', location: 'throat', duration: '2 days', character: 'barking cough', severity: 6, associated: ['stridor', 'hoarseness', 'mild fever'] }), ageRange: [1, 5] },

  // Otitis Media (3 variants)
  { expected: 'Otitis Media', phrasings: [
    "my baby wont stop cryin and she keeps pullin at her ear",
    "my kid is screamin and grabbin his ear and got a fever",
    "ear hurts so bad and i can barely hear outta it"
  ], hpi: () => ({ onset: 'gradual', location: 'ear', duration: '2 days', character: 'sharp', severity: 6, associated: ['fever', 'ear pain', 'hearing loss', 'irritability'] }) },

  // Febrile Seizure (2 variants)
  { expected: 'Febrile Seizure', phrasings: [
    "my baby had a fever then started shaking all over and his eyes rolled back",
    "my toddler was hot with fever then went stiff and was twitching"
  ], hpi: () => ({ onset: 'sudden', location: 'whole body', duration: '2 minutes', character: 'convulsion', severity: 9, associated: ['fever', 'loss of consciousness', 'post-ictal drowsiness'] }), ageRange: [6/12, 5] },

  // Hip Fracture (3 variants)
  { expected: 'Hip Fracture', phrasings: [
    "i fell and now i cant put any weight on my leg my hip hurts terrible",
    "tripped and landed hard on my hip and now its swollen and i cant walk",
    "fell outta bed and my leg is turned out funny and my hip is killing me"
  ], hpi: () => ({ onset: 'sudden', location: 'hip', duration: '2 hours', character: 'severe', severity: 9, associated: ['inability to bear weight', 'leg shortening', 'external rotation'] }) },

  // GI Bleed (3 variants)
  { expected: 'Gastrointestinal Bleeding', phrasings: [
    "been pooping black tar looking stuff and feel lightheaded",
    "theres blood in my stool bright red and i feel dizzy",
    "threw up and it looked like coffee grounds and my stomach hurts"
  ], hpi: () => ({ onset: 'gradual', location: 'abdomen', duration: '2 days', character: 'cramping', severity: 7, associated: ['melena', 'dizziness', 'fatigue', 'weakness'] }) },

  // Constipation (2 variants)
  { expected: 'Constipation', phrasings: [
    "havent pooped in like a week and my belly is so bloated and crampy",
    "cant go to the bathroom belly is hard and hurts"
  ], hpi: () => ({ onset: 'gradual', location: 'abdomen', duration: '7 days', character: 'cramping', severity: 4, associated: ['bloating', 'abdominal pain', 'decreased bowel movements'] }) },

  // BPPV (2 variants)
  { expected: 'Benign Paroxysmal Positional Vertigo', phrasings: [
    "everythings spinnin when i turn my head or roll over in bed",
    "the rooms goin around and around when i look up or change positions"
  ], hpi: () => ({ onset: 'sudden', location: 'head', duration: '3 days', character: 'spinning', severity: 6, aggravating: ['head movement'], associated: ['nausea', 'vertigo with position changes'] }) },

  // Anaphylaxis (2 variants)
  { expected: 'Anaphylaxis', phrasings: [
    "ate peanuts and now my throat is swelling shut and i got hives everywhere",
    "bee sting and now i cant breathe my face is puffy and im covered in welts"
  ], hpi: () => ({ onset: 'sudden', location: 'whole body', duration: '15 minutes', character: 'swelling', severity: 10, associated: ['hives', 'throat swelling', 'difficulty breathing', 'low blood pressure'] }) },

  // Preeclampsia (2 variants)
  { expected: 'Preeclampsia', phrasings: [
    "im 34 weeks pregnant and my blood pressure is high and i see spots",
    "pregnant and got a bad headache swollen ankles and my vision is blurry"
  ], hpi: () => ({ onset: 'gradual', location: 'head', duration: '2 days', character: 'throbbing', severity: 7, associated: ['high blood pressure', 'visual changes', 'edema', 'headache'] }), gender: 'female', ageRange: [18, 42] },

  // Cauda Equina (2 variants)
  { expected: 'Cauda Equina Syndrome', phrasings: [
    "back pain shooting down both legs and i cant feel my butt and cant pee",
    "my legs are going numb from the back down and i lost control of my bladder"
  ], hpi: () => ({ onset: 'sudden', location: 'lower back', duration: '1 day', character: 'radiating', severity: 9, associated: ['bilateral leg weakness', 'saddle anesthesia', 'urinary retention', 'bowel dysfunction'] }) },
];

const RARE_CONDITIONS = [
  { expected: 'Peritonsillar Abscess', phrasings: ["cant swallow at all one side of my throat is huge and i sound like i got a hot potato in my mouth", "throat is so swollen on one side i can barely open my jaw and im drooling"], hpi: () => ({ onset: 'gradual', location: 'throat', duration: '4 days', character: 'severe', severity: 8, associated: ['fever', 'trismus', 'drooling', 'muffled voice'] }) },
  { expected: 'Nursemaid Elbow', phrasings: ["my toddler wont use his arm after i pulled him up by the hand", "my kid is holding her arm still and cries if you try to move it i think i yanked it"], hpi: () => ({ onset: 'sudden', location: 'elbow', duration: '1 hour', character: 'guarding', severity: 5, associated: ['refusal to use arm', 'arm held at side'] }), ageRange: [1, 5] },
  { expected: 'Pyloric Stenosis', phrasings: ["my 3 week old baby keeps projectile vomiting after every feeding", "newborn throws up forcefully right after eating and hes always hungry"], hpi: () => ({ onset: 'gradual', location: 'abdomen', duration: '1 week', character: 'projectile vomiting', severity: 7, associated: ['projectile vomiting', 'hunger after vomiting', 'weight loss'] }), ageRange: [0, 1] },
  { expected: 'Epiglottitis', phrasings: ["my kid is drooling sitting straight up and can barely breathe sounds muffled", "sore throat came on fast now my child is leaning forward drooling and making a weird breathing sound"], hpi: () => ({ onset: 'sudden', location: 'throat', duration: '6 hours', character: 'severe', severity: 9, associated: ['drooling', 'stridor', 'tripod position', 'muffled voice'] }) },
  { expected: 'Henoch-Schonlein Purpura', phrasings: ["my kid has a purple rash on his legs and his belly and joints hurt", "weird bruise-like spots on my childs legs and butt and she says her tummy hurts"], hpi: () => ({ onset: 'gradual', location: 'legs', duration: '5 days', character: 'rash', severity: 5, associated: ['palpable purpura', 'abdominal pain', 'joint pain', 'hematuria'] }), ageRange: [3, 12] },
  { expected: 'Slipped Capital Femoral Epiphysis', phrasings: ["my teenager is limping and says his hip and knee hurt he cant run anymore", "my overweight teen has been complaining of hip pain and now walks with a limp"], hpi: () => ({ onset: 'gradual', location: 'hip', duration: '2 weeks', character: 'aching', severity: 6, associated: ['limp', 'knee pain', 'limited hip motion'] }), ageRange: [10, 16] },
  { expected: 'Kawasaki Disease', phrasings: ["my toddler has had a high fever for 5 days red eyes cracked lips and a rash", "my little one has fever that wont break plus red eyes swollen hands and a rash"], hpi: () => ({ onset: 'gradual', location: 'whole body', duration: '5 days', character: 'fever', severity: 7, associated: ['persistent fever', 'conjunctivitis', 'rash', 'swollen hands', 'cracked lips'] }), ageRange: [1, 5] },
  { expected: 'Intussusception', phrasings: ["my baby screams in pain then stops then screams again and theres jelly looking stuff in the diaper", "my infant has episodes of screaming drawing up legs then going limp with bloody stool"], hpi: () => ({ onset: 'sudden', location: 'abdomen', duration: '6 hours', character: 'colicky', severity: 8, associated: ['intermittent crying', 'currant jelly stool', 'vomiting', 'lethargy'] }), ageRange: [0, 3] },
  { expected: 'Ovarian Torsion', phrasings: ["sudden horrible pain on one side of my pelvis and im throwing up", "woke up with the worst pain in my right lower belly and i feel like im gonna faint"], hpi: () => ({ onset: 'sudden', location: 'pelvis', duration: '3 hours', character: 'sharp', severity: 9, associated: ['nausea', 'vomiting'] }), gender: 'female' },
  { expected: 'Placental Abruption', phrasings: ["im 32 weeks pregnant and suddenly bleeding heavy with terrible belly pain", "pregnant and my belly got really hard and painful and theres dark blood"], hpi: () => ({ onset: 'sudden', location: 'abdomen', duration: '1 hour', character: 'constant', severity: 9, associated: ['vaginal bleeding', 'uterine tenderness', 'rigid abdomen'] }), gender: 'female', ageRange: [18, 42] },
  { expected: 'Tension Pneumothorax', phrasings: ["got hit in the chest and now i can barely breathe and feel like im gonna die", "chest trauma and now one side aint moving and im getting worse fast"], hpi: () => ({ onset: 'sudden', location: 'chest', duration: '30 minutes', character: 'severe', severity: 10, associated: ['severe dyspnea', 'tracheal deviation', 'hypotension', 'distended neck veins'] }) },
  { expected: 'Status Epilepticus', phrasings: ["been having seizures back to back for 20 minutes and wont stop", "my family member started seizing and its been going on and on"], hpi: () => ({ onset: 'sudden', location: 'whole body', duration: '20 minutes', character: 'convulsions', severity: 10, associated: ['continuous seizures', 'altered consciousness'] }) },
  { expected: 'Addison Crisis', phrasings: ["feel so weak lightheaded blood pressure dropped and im throwing up got addisons", "been on steroids and stopped now im crashing feel terrible weak dizzy nauseous"], hpi: () => ({ onset: 'sudden', location: 'whole body', duration: '1 day', character: 'weakness', severity: 8, associated: ['hypotension', 'nausea', 'vomiting', 'weakness', 'confusion'] }) },
  { expected: 'Thyroid Storm', phrasings: ["heart is racing over 150 im sweating like crazy and feel agitated and confused", "hyperthyroid and now everything is going haywire fever fast heart shaking"], hpi: () => ({ onset: 'sudden', location: 'whole body', duration: '12 hours', character: 'systemic', severity: 9, associated: ['tachycardia', 'fever', 'agitation', 'tremor', 'diaphoresis'] }) },
  { expected: 'Rhabdomyolysis', phrasings: ["worked out way too hard muscles are killing me and my pee is dark brown like cola", "did crossfit for the first time and now i cant move and my urine looks like tea"], hpi: () => ({ onset: 'gradual', location: 'muscles', duration: '2 days', character: 'severe aching', severity: 7, associated: ['dark urine', 'muscle pain', 'weakness', 'swelling'] }) },
  { expected: 'Corneal Abrasion', phrasings: ["got poked in the eye and now it wont stop watering and hurts to look at light", "feels like something is stuck in my eye its tearing up and i cant open it"], hpi: () => ({ onset: 'sudden', location: 'eye', duration: '3 hours', character: 'sharp', severity: 6, associated: ['tearing', 'photophobia', 'foreign body sensation'] }) },
  { expected: 'Orbital Cellulitis', phrasings: ["my eye is swollen shut red and it hurts to move it plus i got a fever", "kids eye is bulging out puffy red and he has a fever"], hpi: () => ({ onset: 'gradual', location: 'eye', duration: '2 days', character: 'swelling', severity: 7, associated: ['fever', 'proptosis', 'pain with eye movement', 'eyelid swelling'] }) },
  { expected: 'Temporal Arteritis', phrasings: ["bad headache on one side of my head near my temple and it hurts to chew", "my temple area is tender and throbbing and i noticed my vision got blurry in one eye"], hpi: () => ({ onset: 'gradual', location: 'temple', duration: '1 week', character: 'throbbing', severity: 7, associated: ['jaw claudication', 'scalp tenderness', 'visual changes', 'fatigue'] }) },
  { expected: 'Mesenteric Ischemia', phrasings: ["terrible belly pain after eating and ive been losing weight afraid to eat", "sudden severe belly pain way worse than what the exam shows"], hpi: () => ({ onset: 'sudden', location: 'abdomen', duration: '6 hours', character: 'severe', severity: 9, associated: ['pain out of proportion to exam', 'nausea', 'bloody stool'] }) },
  { expected: 'Subdural Hematoma', phrasings: ["fell and hit my head a week ago and now im getting confused and headachy", "grandpa bumped his head and now hes acting weird and drowsy"], hpi: () => ({ onset: 'gradual', location: 'head', duration: '1 week', character: 'progressive', severity: 7, associated: ['confusion', 'headache', 'drowsiness', 'history of fall'] }) },
  { expected: 'Shingles', phrasings: ["burning painful rash on one side of my body with little blisters", "had chickenpox as a kid now theres a strip of painful blisters on my torso"], hpi: () => ({ onset: 'gradual', location: 'torso', duration: '4 days', character: 'burning', severity: 7, associated: ['unilateral rash', 'vesicles', 'pain before rash', 'tingling'] }) },
  { expected: 'Hand Foot and Mouth Disease', phrasings: ["my toddler has sores in his mouth and blisters on his hands and feet and a fever", "daycare kid with fever painful mouth sores and a rash on palms and soles"], hpi: () => ({ onset: 'gradual', location: 'mouth, hands, feet', duration: '3 days', character: 'painful', severity: 5, associated: ['fever', 'oral ulcers', 'vesicular rash on palms and soles'] }), ageRange: [1, 7] },
  { expected: 'Impetigo', phrasings: ["my kid has crusty honey colored sores around his mouth and nose", "these yellow crusty patches keep spreading on my childs face"], hpi: () => ({ onset: 'gradual', location: 'face', duration: '5 days', character: 'crusty', severity: 3, associated: ['honey-colored crusts', 'spreading lesions'] }), ageRange: [2, 10] },
  { expected: 'Bronchiolitis', phrasings: ["my baby is wheezing and having trouble breathing after a cold", "infant with runny nose that turned into fast breathing and wheezing"], hpi: () => ({ onset: 'gradual', location: 'chest', duration: '3 days', character: 'wheezing', severity: 6, associated: ['wheezing', 'rapid breathing', 'feeding difficulty', 'runny nose'] }), ageRange: [0, 2] },
  { expected: 'Atrial Fibrillation', phrasings: ["my heart is all over the place beating fast and irregular feel lightheaded", "heart is fluttering and skipping beats and i feel short of breath"], hpi: () => ({ onset: 'sudden', location: 'chest', duration: '4 hours', character: 'palpitations', severity: 6, associated: ['irregular heartbeat', 'palpitations', 'lightheadedness', 'shortness of breath'] }) },
  { expected: 'Depression', phrasings: ["i dont wanna do anything anymore feel empty and hopeless for months", "cant get out of bed no energy no interest in anything and im not sleeping well"], hpi: () => ({ onset: 'gradual', location: 'whole body', duration: '3 months', character: 'emotional', severity: 7, associated: ['fatigue', 'loss of interest', 'sleep changes', 'hopelessness', 'poor concentration'] }) },
  { expected: 'Panic Attack', phrasings: ["my heart is pounding i cant breathe i feel like im dying but nothing triggered it", "sudden chest tightness tingling hands racing heart thought i was having a heart attack"], hpi: () => ({ onset: 'sudden', location: 'chest', duration: '20 minutes', character: 'overwhelming', severity: 8, associated: ['palpitations', 'shortness of breath', 'tingling', 'derealization', 'fear of dying'] }) },
  { expected: 'Sciatica', phrasings: ["shooting pain from my butt all the way down my leg to my foot", "back pain that goes down my leg like an electric shock worse when i sit"], hpi: () => ({ onset: 'gradual', location: 'lower back', duration: '1 week', character: 'shooting', severity: 7, aggravating: ['sitting', 'bending'], relieving: ['standing'], associated: ['leg pain', 'numbness', 'tingling in foot'] }) },
  { expected: 'Bowel Obstruction', phrasings: ["belly is huge and hard havent passed gas or pooped in days and im puking", "stomach cramps come and go and everything is bloated and i keep throwing up"], hpi: () => ({ onset: 'gradual', location: 'abdomen', duration: '2 days', character: 'cramping', severity: 8, associated: ['vomiting', 'obstipation', 'distension', 'no flatus'] }) },
  { expected: 'Hemorrhoids', phrasings: ["bright red blood on the toilet paper when i wipe and its itchy down there", "pain and bleeding when i go to the bathroom theres a lump near my butt"], hpi: () => ({ onset: 'gradual', location: 'rectum', duration: '1 week', character: 'burning', severity: 4, associated: ['rectal bleeding', 'itching', 'pain with bowel movements'] }) },
  { expected: 'Hypothyroidism', phrasings: ["im always cold tired and gaining weight even though i barely eat and my hair is falling out", "feel sluggish all the time constipated and my skin is so dry"], hpi: () => ({ onset: 'gradual', location: 'whole body', duration: '3 months', character: 'fatigue', severity: 5, associated: ['weight gain', 'cold intolerance', 'constipation', 'dry skin', 'hair loss'] }) },
  { expected: 'Peripheral Neuropathy', phrasings: ["my feet tingle and burn all the time especially at night feels like pins and needles", "numbness starting in my toes working up and i keep dropping things"], hpi: () => ({ onset: 'gradual', location: 'feet', duration: '2 months', character: 'tingling', severity: 5, associated: ['numbness', 'burning', 'tingling', 'balance problems'] }) },
  { expected: 'Plantar Fasciitis', phrasings: ["my heel kills me first thing in the morning when i step outta bed", "bottom of my foot hurts so bad especially after sitting for a while"], hpi: () => ({ onset: 'gradual', location: 'heel', duration: '3 weeks', character: 'stabbing', severity: 6, aggravating: ['first steps in morning'], relieving: ['rest'], associated: ['heel pain', 'pain with first steps'] }) },
  { expected: 'Carpal Tunnel Syndrome', phrasings: ["my hand goes numb at night and i keep dropping things tingling in my fingers", "wrist hurts and my thumb and first two fingers tingle especially when typing"], hpi: () => ({ onset: 'gradual', location: 'hand', duration: '1 month', character: 'tingling', severity: 5, associated: ['numbness', 'tingling in thumb and fingers', 'weakness', 'night symptoms'] }) },
  { expected: 'Fibromyalgia', phrasings: ["everything hurts all over my whole body aches and im exhausted but cant sleep", "widespread pain for months hurts when anyone touches me and im always tired"], hpi: () => ({ onset: 'gradual', location: 'whole body', duration: '6 months', character: 'widespread aching', severity: 6, associated: ['widespread pain', 'fatigue', 'sleep disturbance', 'cognitive difficulties'] }) },

  // ===== PSYCH / SUBSTANCE / ENCEPHALOPATHY =====
  { expected: 'Delirium Tremens', phrasings: [
    "my husband quit drinking cold turkey 3 days ago and now hes shaking seeing things and confused",
    "havent had a drink in 2 days and im sweating shaking and seeing bugs on the wall",
    "stopped drinking and now im trembling cant think straight and seeing shadows",
  ], hpi: () => ({ onset: 'sudden', location: 'whole body', duration: '1 day', character: 'tremor', severity: 8, associated: ['tremor', 'confusion', 'hallucinations', 'sweating', 'tachycardia'] }), ageRange: [25, 70] },

  { expected: 'Alcohol Withdrawal', phrasings: [
    "i quit drinking yesterday and my hands wont stop shaking and i feel terrible",
    "last drink was 2 days ago and now i got the shakes sweating and cant eat",
    "trying to detox from alcohol at home and im shaking anxious and my heart is racing",
  ], hpi: () => ({ onset: 'gradual', location: 'whole body', duration: '2 days', character: 'tremor', severity: 7, associated: ['tremor', 'anxiety', 'sweating', 'nausea', 'insomnia'] }), ageRange: [20, 70] },

  { expected: 'Opioid Overdose', phrasings: [
    "found my son on the bathroom floor not breathing blue lips and pinpoint pupils",
    "she took a bunch of pills and now shes barely breathing and wont wake up",
    "think my roommate overdosed on fentanyl hes unresponsive and his lips are blue",
  ], hpi: () => ({ onset: 'sudden', location: 'whole body', duration: '30 minutes', character: 'unresponsive', severity: 10, associated: ['respiratory depression', 'pinpoint pupils', 'cyanosis', 'unresponsive'] }), ageRange: [15, 60] },

  { expected: 'Opioid Withdrawal', phrasings: [
    "ran out of my pain pills 2 days ago and my whole body aches i cant stop puking and got diarrhea",
    "im dope sick havent had anything in a day and im crawling out of my skin",
    "stopped using heroin and now i got chills body aches diarrhea and cant sleep",
  ], hpi: () => ({ onset: 'gradual', location: 'whole body', duration: '2 days', character: 'aching', severity: 7, associated: ['body aches', 'nausea', 'vomiting', 'diarrhea', 'restlessness', 'chills'] }), ageRange: [18, 55] },

  { expected: 'Cannabinoid Hyperemesis Syndrome', phrasings: [
    "i smoke weed every day and keep having these episodes where i throw up for hours only hot showers help",
    "been a daily marijuana user for years and now i get these cycles of nonstop vomiting",
    "throwing up every few weeks for months and the only thing that helps is a hot bath i smoke cannabis daily",
  ], hpi: () => ({ onset: 'gradual', location: 'abdomen', duration: '3 months', character: 'episodic vomiting', severity: 7, associated: ['cyclic vomiting', 'hot shower relief', 'abdominal pain', 'weight loss'] }), ageRange: [18, 45] },

  { expected: 'Bipolar Disorder — Manic Episode', phrasings: [
    "my wife hasnt slept in 4 days shes talking a mile a minute and spent our savings on stuff we dont need",
    "i feel amazing like i can do anything havent needed sleep and my thoughts are racing so fast",
    "hes been up for days grandiose thinks hes invincible and is making terrible decisions spending money",
  ], hpi: () => ({ onset: 'gradual', location: 'whole body', duration: '1 week', character: 'euphoria', severity: 7, associated: ['decreased sleep', 'racing thoughts', 'pressured speech', 'grandiosity', 'impulsive behavior'] }), ageRange: [16, 45] },

  { expected: 'Psychotic Disorder', phrasings: [
    "my son is hearing voices telling him to do things and he thinks the government is watching him",
    "she started talking to people who arent there and thinks someone is trying to poison her food",
  ], hpi: () => ({ onset: 'gradual', location: 'head', duration: '2 weeks', character: 'hallucinations', severity: 8, associated: ['auditory hallucinations', 'paranoia', 'delusions', 'social withdrawal'] }), ageRange: [16, 35] },

  { expected: 'Stimulant Intoxication', phrasings: [
    "he smoked meth and now his heart is racing hes paranoid sweating and wont sit still",
    "took too much adderall and my heart is pounding im shaking and feel like im gonna have a heart attack",
    "she used cocaine and now shes agitated chest pain and her pupils are huge",
  ], hpi: () => ({ onset: 'sudden', location: 'whole body', duration: '3 hours', character: 'agitation', severity: 8, associated: ['tachycardia', 'hypertension', 'agitation', 'dilated pupils', 'diaphoresis'] }), ageRange: [16, 55] },

  { expected: 'Wernicke Encephalopathy', phrasings: [
    "my dad is a heavy drinker and now hes confused stumbling and his eyes are moving funny",
    "chronic alcoholic came in confused cant walk straight and has weird eye movements",
  ], hpi: () => ({ onset: 'gradual', location: 'head', duration: '3 days', character: 'confusion', severity: 8, associated: ['confusion', 'ataxia', 'ophthalmoplegia', 'nystagmus'] }), ageRange: [30, 75] },

  { expected: 'Hepatic Encephalopathy', phrasings: [
    "my mom has liver disease and shes getting more confused and her hands are flapping",
    "cirrhosis patient acting weird confused and disoriented and his belly is getting bigger",
  ], hpi: () => ({ onset: 'gradual', location: 'head', duration: '3 days', character: 'confusion', severity: 7, associated: ['confusion', 'asterixis', 'jaundice', 'ascites', 'personality changes'] }), ageRange: [40, 80] },

  { expected: 'Serotonin Syndrome', phrasings: [
    "started a new antidepressant and now im agitated trembling sweating and my muscles are jerking",
    "doctor increased my ssri and now i got fever muscle twitching and cant sit still",
  ], hpi: () => ({ onset: 'sudden', location: 'whole body', duration: '12 hours', character: 'agitation', severity: 8, associated: ['agitation', 'tremor', 'clonus', 'hyperthermia', 'diaphoresis'] }), ageRange: [18, 70] },

  { expected: 'Neuroleptic Malignant Syndrome', phrasings: [
    "started haldol and now hes rigid as a board with a high fever and confused",
    "on antipsychotics and developed severe muscle rigidity fever and altered mental status",
  ], hpi: () => ({ onset: 'gradual', location: 'whole body', duration: '2 days', character: 'rigidity', severity: 9, associated: ['rigidity', 'hyperthermia', 'altered mental status', 'tachycardia', 'diaphoresis'] }), ageRange: [20, 70] },

  { expected: 'ADEM', phrasings: [
    "my kid had a cold last week and now has headache fever and suddenly cant walk and seems confused",
    "child developed weakness in legs after a virus plus headaches and vision changes",
  ], hpi: () => ({ onset: 'sudden', location: 'head', duration: '3 days', character: 'neurological decline', severity: 8, associated: ['headache', 'fever', 'ataxia', 'weakness', 'vision changes', 'confusion'] }), ageRange: [3, 15] },

  // ===== INCLUSIVE / GAP CATEGORIES — all pure layman language =====

  { expected: 'Dental Abscess', phrasings: [
    "my tooth is killing me and my whole jaw is swollen up and i got a fever",
    "got a bad tooth thats been hurting for days and now my face is puffy on one side",
    "theres a bump on my gum that keeps filling with gross stuff and my tooth throbs",
  ], hpi: () => ({ onset: 'gradual', location: 'jaw', duration: '4 days', character: 'throbbing', severity: 8, associated: ['facial swelling', 'fever', 'pus drainage', 'pain with chewing'] }) },

  { expected: 'Vasovagal Syncope', phrasings: [
    "i was standing in line at the store and everything went gray and i woke up on the floor",
    "got lightheaded at church felt hot and sweaty then next thing i know im on the ground",
    "i passed out after getting my blood drawn they said i was only out for a few seconds",
  ], hpi: () => ({ onset: 'sudden', location: 'head', duration: '30 seconds', character: 'loss of consciousness', severity: 6, associated: ['lightheadedness', 'warmth', 'diaphoresis', 'nausea', 'tunnel vision'] }) },

  { expected: 'Urticaria', phrasings: [
    "im covered in these itchy red welts that keep moving around they popped up outta nowhere",
    "broke out in hives all over my body after dinner and theyre spreading",
    "took a new medicine yesterday and now i got bumps and itchy patches everywhere",
  ], hpi: () => ({ onset: 'sudden', location: 'whole body', duration: '4 hours', character: 'itchy', severity: 5, associated: ['hives', 'itching', 'welts', 'swelling'] }) },

  { expected: 'Simple Laceration', phrasings: [
    "sliced my finger open on a kitchen knife its pretty deep and bleeding a lot",
    "cut my hand on broken glass and i think it might need stitches wont stop bleeding",
    "my kid fell on the playground and split his chin open its gaping and bloody",
  ], hpi: () => ({ onset: 'sudden', location: randomFrom(['hand', 'finger', 'chin', 'arm']), duration: '1 hour', character: 'bleeding', severity: 5, associated: ['active bleeding', 'open wound', 'pain'] }) },

  { expected: 'Iron Deficiency Anemia', phrasings: [
    "im exhausted all the time no matter how much i sleep and i look pale as a ghost",
    "so tired i can barely function my periods have been super heavy and im dizzy a lot",
    "been dragging for months short of breath going up stairs and craving ice all the time",
  ], hpi: () => ({ onset: 'gradual', location: 'whole body', duration: '3 months', character: 'fatigue', severity: 5, associated: ['fatigue', 'pallor', 'dizziness', 'heavy periods', 'pica'] }), gender: 'female', ageRange: [18, 45] },

  { expected: 'Intimate Partner Violence', phrasings: [
    "my boyfriend pushed me down the stairs and i hit my head im scared to go home",
    "my husband choked me last night and now my neck hurts and my voice is raspy",
    "he punched me in the face again and i think my cheekbone might be broken",
  ], hpi: () => ({ onset: 'sudden', location: randomFrom(['head', 'face', 'neck', 'abdomen']), duration: '1 day', character: 'pain', severity: 7, associated: ['bruising', 'swelling', 'fear', 'anxiety'] }), gender: 'female', ageRange: [18, 50] },

  { expected: 'Sexual Assault', phrasings: [
    "something happened to me last night at a party and i need to be checked out i dont want to say much",
    "i was assaulted i need a forensic exam and i dont know if i should go to the police",
  ], hpi: () => ({ onset: 'sudden', location: 'pelvis', duration: '1 day', character: 'trauma', severity: 9, associated: ['emotional distress', 'pain', 'anxiety'] }), gender: 'female', ageRange: [15, 45] },

  { expected: 'Erectile Dysfunction', phrasings: [
    "i cant get it up anymore its been going on for months and its ruining my relationship",
    "been having trouble performing in the bedroom cant keep an erection",
    "things arent working down there like they used to and im too embarrassed to ask anyone",
  ], hpi: () => ({ onset: 'gradual', location: 'genitals', duration: '6 months', character: 'dysfunction', severity: 5, associated: ['erectile difficulty', 'relationship stress', 'decreased confidence'] }), gender: 'male', ageRange: [35, 75] },

  { expected: 'Dyspareunia', phrasings: [
    "it hurts every time my husband and i try to have sex like a burning sharp pain",
    "sex has become really painful and im starting to avoid it because of how bad it hurts",
  ], hpi: () => ({ onset: 'gradual', location: 'pelvis', duration: '3 months', character: 'burning', severity: 6, associated: ['pain during intercourse', 'burning', 'avoidance'] }), gender: 'female', ageRange: [25, 60] },

  { expected: 'Chlamydia', phrasings: [
    "i got this weird discharge down there and it burns when i pee had unprotected sex last month",
    "theres a yellowish drip and it stings to urinate think i mighta caught something",
  ], hpi: () => ({ onset: 'gradual', location: 'genitals', duration: '1 week', character: 'burning', severity: 4, associated: ['urethral discharge', 'dysuria', 'recent unprotected sex'] }), ageRange: [16, 35] },

  { expected: 'HRT Side Effect — Mood/Psychiatric', phrasings: [
    "im on testosterone shots and having crazy mood swings and my face is breaking out bad",
    "started estrogen 3 months ago and now i get terrible headaches and my legs swell",
    "been on hormone therapy for a year and my emotions are all over the place cant stop crying",
  ], hpi: () => ({ onset: 'gradual', location: 'whole body', duration: '3 months', character: 'mood changes', severity: 5, associated: ['mood swings', 'acne', 'headaches', 'emotional lability'] }), ageRange: [16, 45] },

  { expected: 'Lactation Mastitis', phrasings: [
    "im breastfeeding and my left breast is bright red hot to the touch and i got a fever of 102",
    "nursing my baby and one breast got hard and painful with red streaks and now i feel flu like",
    "had a clogged duct that turned into my whole breast being red swollen and i feel awful",
  ], hpi: () => ({ onset: 'gradual', location: 'breast', duration: '2 days', character: 'pain', severity: 7, associated: ['breast redness', 'warmth', 'fever', 'flu-like symptoms', 'hard area'] }), gender: 'female', ageRange: [18, 40] },

  { expected: 'Postpartum Depression', phrasings: [
    "had my baby 6 weeks ago and i cant stop crying i dont feel bonded and having scary thoughts",
    "since i gave birth i have zero interest in anything cant sleep even when the baby sleeps and feel worthless",
  ], hpi: () => ({ onset: 'gradual', location: 'whole body', duration: '6 weeks', character: 'emotional', severity: 7, associated: ['crying', 'hopelessness', 'poor bonding', 'insomnia', 'intrusive thoughts'] }), gender: 'female', ageRange: [18, 40] },

  { expected: 'Colic', phrasings: [
    "my 3 week old screams for hours every evening nothing i do helps and hes been checked and is healthy",
    "baby cries inconsolably for 3 plus hours pulls legs up turns red and we cant figure out whats wrong",
  ], hpi: () => ({ onset: 'gradual', location: 'abdomen', duration: '2 weeks', character: 'inconsolable crying', severity: 6, associated: ['evening crying episodes', 'drawing up legs', 'red face', 'otherwise healthy'] }), ageRange: [0, 0.5] },

  { expected: 'Polypharmacy/Medication Effect', phrasings: [
    "my grandpa keeps falling he takes like 12 different medications and hes dizzy all the time",
    "keep losing my balance fell three times this week and im on a bunch of blood pressure pills and sleeping pills",
    "ever since they added that new medicine i feel woozy and unsteady on my feet",
  ], hpi: () => ({ onset: 'gradual', location: 'whole body', duration: '2 weeks', character: 'dizziness', severity: 5, associated: ['recurrent falls', 'dizziness', 'multiple medications', 'unsteadiness'] }), ageRange: [65, 95] },

  { expected: 'Heat Exhaustion', phrasings: [
    "was working outside in the heat all day and now im dizzy nauseous and drenched in sweat",
    "been out in the sun at a festival and feel terrible headache muscle cramps and super thirsty",
    "my kid was playing football in the heat and now hes throwing up dizzy and his skin is clammy",
  ], hpi: () => ({ onset: 'sudden', location: 'whole body', duration: '2 hours', character: 'overheated', severity: 7, associated: ['dizziness', 'nausea', 'profuse sweating', 'headache', 'muscle cramps'] }) },

  { expected: 'Dog/Cat Bite', phrasings: [
    "neighbors dog bit me on the arm broke the skin and its swelling up",
    "my cat bit my hand yesterday and now its red puffy and throbbing with red streaks",
  ], hpi: () => ({ onset: 'sudden', location: randomFrom(['arm', 'hand', 'leg']), duration: '1 day', character: 'pain', severity: 5, associated: ['puncture wound', 'swelling', 'redness'] }) },

  { expected: 'Esophageal Foreign Body', phrasings: [
    "my 2 year old swallowed a coin and now hes drooling and wont eat and keeps pointing at his chest",
    "my toddler put a battery in her mouth and i think she swallowed it shes gagging",
  ], hpi: () => ({ onset: 'sudden', location: 'chest', duration: '1 hour', character: 'discomfort', severity: 7, associated: ['drooling', 'dysphagia', 'refusal to eat', 'gagging'] }), ageRange: [1, 5] },

  { expected: 'Acute Urinary Retention', phrasings: [
    "i havent been able to pee all day my belly is huge and it feels like my bladder is gonna burst",
    "cant urinate at all been trying for hours and the pressure down there is unbearable",
  ], hpi: () => ({ onset: 'sudden', location: 'lower abdomen', duration: '12 hours', character: 'pressure', severity: 8, associated: ['inability to void', 'suprapubic fullness', 'discomfort'] }), gender: 'male', ageRange: [55, 85] },

  { expected: 'Inguinal Hernia', phrasings: [
    "theres a bulge in my groin that pops out when i cough or lift something heavy",
    "got this lump near my privates that comes and goes and aches when i stand too long",
  ], hpi: () => ({ onset: 'gradual', location: 'groin', duration: '2 months', character: 'bulging', severity: 4, associated: ['inguinal bulge', 'worse with Valsalva', 'aching'] }), gender: 'male', ageRange: [30, 75] },

  { expected: 'Second Degree Burn', phrasings: [
    "spilled boiling water on my arm and theres big blisters and its bright red and hurts like crazy",
    "my kid touched the stove and his hand has blisters all over it and hes screaming",
  ], hpi: () => ({ onset: 'sudden', location: randomFrom(['arm', 'hand', 'leg']), duration: '2 hours', character: 'burning', severity: 7, associated: ['blisters', 'redness', 'pain', 'weeping'] }) },

  { expected: 'Insomnia Disorder', phrasings: [
    "i havent slept more than 2 hours a night in weeks my mind wont shut off and im barely functioning",
    "tossing and turning all night cant fall asleep or stay asleep and its been going on for months",
  ], hpi: () => ({ onset: 'gradual', location: 'head', duration: '2 months', character: 'sleeplessness', severity: 6, associated: ['difficulty falling asleep', 'difficulty staying asleep', 'daytime fatigue', 'irritability'] }), ageRange: [25, 70] },

  { expected: 'Obstructive Sleep Apnea', phrasings: [
    "my wife says i snore like a freight train and stop breathing in my sleep and im exhausted during the day",
    "i fall asleep at my desk every afternoon and my partner says i gasp and choke at night",
  ], hpi: () => ({ onset: 'gradual', location: 'throat', duration: '1 year', character: 'snoring', severity: 5, associated: ['loud snoring', 'witnessed apneas', 'excessive daytime sleepiness', 'morning headaches'] }), gender: 'male', ageRange: [35, 70] },

  { expected: 'Malignancy', phrasings: [
    "lost 30 pounds in the last 2 months without even trying and i have zero appetite and night sweats",
    "been losing weight like crazy clothes dont fit anymore and im tired all the time with no explanation",
  ], hpi: () => ({ onset: 'gradual', location: 'whole body', duration: '2 months', character: 'weight loss', severity: 6, associated: ['unintentional weight loss', 'anorexia', 'night sweats', 'fatigue'] }), ageRange: [50, 85] },

  { expected: 'Fibrocystic Breast Changes', phrasings: [
    "found a lump in my breast and im freaking out its tender and gets worse before my period",
    "my breasts get really lumpy and painful every month right before my cycle starts",
  ], hpi: () => ({ onset: 'gradual', location: 'breast', duration: '6 months', character: 'lumpy', severity: 4, associated: ['breast lump', 'cyclical tenderness', 'bilateral'] }), gender: 'female', ageRange: [25, 50] },

  { expected: 'Irritant Contact Diaper Dermatitis', phrasings: [
    "my babys butt is bright red and raw she screams during every diaper change",
    "diaper rash is getting worse the whole area is red with little bumps and nothing is helping",
  ], hpi: () => ({ onset: 'gradual', location: 'perineum', duration: '4 days', character: 'rash', severity: 4, associated: ['perineal redness', 'pain with diaper changes', 'skin breakdown'] }), ageRange: [0, 2] },

  { expected: 'Hypothermia', phrasings: [
    "found my grandpa outside in the cold hes shivering confused and his skin feels ice cold",
    "homeless man brought in from the street in winter barely responsive and cold to the touch",
  ], hpi: () => ({ onset: 'gradual', location: 'whole body', duration: '4 hours', character: 'cold', severity: 8, associated: ['shivering', 'confusion', 'cold skin', 'hypothermia'] }), ageRange: [60, 95] },

  { expected: 'Laceration/Crush Injury', phrasings: [
    "got my hand caught in a machine at work and its bleeding bad and i cant move my fingers",
    "fell off a ladder at the construction site landed on my arm and theres a bone sticking out",
  ], hpi: () => ({ onset: 'sudden', location: randomFrom(['hand', 'arm', 'leg']), duration: '1 hour', character: 'crush', severity: 9, associated: ['deformity', 'bleeding', 'loss of function', 'swelling'] }), gender: 'male', ageRange: [18, 65] },
];

// --- Build 600 cases ---

function buildCases() {
  const cases = [];
  let id = 6000;

  // Target distribution: 150 peds, 250 adult, 200 geri
  const demoSlots = [
    ...Array(150).fill('peds'),
    ...Array(250).fill('adult'),
    ...Array(200).fill('geri'),
  ];
  // Shuffle
  for (let i = demoSlots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [demoSlots[i], demoSlots[j]] = [demoSlots[j], demoSlots[i]];
  }

  // Combine all conditions
  const allConditions = [...COMMON_CONDITIONS, ...RARE_CONDITIONS];

  // Distribute: cycle through conditions, assigning demographics
  for (let i = 0; i < 600; i++) {
    const cond = allConditions[i % allConditions.length];
    const demo = demoSlots[i];
    const setting = SETTINGS[i % 3];

    // Age: respect condition's ageRange or use demo bucket
    let age;
    if (cond.ageRange) {
      age = randomInt(Math.max(cond.ageRange[0], demo === 'peds' ? 1 : demo === 'adult' ? 18 : 65),
                       Math.min(cond.ageRange[1], demo === 'peds' ? 17 : demo === 'adult' ? 64 : 95));
      // If range doesn't overlap with demo, just use demo bucket
      if (age < cond.ageRange[0] || age > cond.ageRange[1]) age = makeAge(demo);
    } else {
      age = makeAge(demo);
    }

    const gender = cond.gender || makeGender();
    const hpi = cond.hpi();
    const phrasing = cond.phrasings[i % cond.phrasings.length];

    cases.push({
      id: id++,
      demo,
      setting,
      expected: cond.expected,
      body: {
        chiefComplaint: phrasing,
        gender,
        age,
        hpi: {
          onset: hpi.onset,
          location: hpi.location,
          duration: hpi.duration,
          character: hpi.character,
          severity: hpi.severity,
          timing: hpi.timing,
          aggravating: hpi.aggravating,
          relieving: hpi.relieving,
          associated: hpi.associated || [],
        },
        vitals: undefined,
        medications: [],
      },
    });
  }

  return cases;
}

// --- Match function with alias support ---
const MATCH_ALIASES = {
  'deep vein thrombosis': ['dvt', 'deep venous thrombosis'],
  'congestive heart failure': ['chf', 'heart failure'],
  'febrile seizure': ['seizure', 'febrile convulsion'],
  'status epilepticus': ['seizure', 'continuous seizure'],
  'hip fracture': ['fracture', 'femoral neck fracture'],
  'depression': ['major depressive disorder', 'depressive disorder'],
  'atrial fibrillation': ['afib', 'a-fib', 'cardiac arrhythmia'],
  'upper respiratory infection': ['uri', 'viral pharyngitis', 'common cold', 'viral uri'],
  'gastrointestinal bleeding': ['gi bleed', 'gi bleeding', 'upper gi bleed', 'lower gi bleed'],
  'urinary tract infection': ['uti', 'cystitis', 'urinary infection'],
  'copd exacerbation': ['copd', 'chronic obstructive'],
  'acute myocardial infarction': ['mi', 'acute coronary syndrome', 'acs', 'heart attack', 'stemi', 'nstemi'],
  'pulmonary embolism': ['pe'],
  'subarachnoid hemorrhage': ['sah'],
  'diabetic ketoacidosis': ['dka'],
  'benign paroxysmal positional vertigo': ['bppv', 'positional vertigo'],
  'hand foot and mouth disease': ['hfm', 'hfmd', 'coxsackie'],
  'pharyngitis': ['viral pharyngitis', 'strep pharyngitis', 'streptococcal pharyngitis'],
  'otitis media': ['acute otitis media', 'middle ear infection'],
  'nephrolithiasis': ['kidney stone', 'renal calculus', 'renal colic'],
  'cholecystitis': ['gallbladder', 'biliary colic'],
  'cellulitis': ['skin infection', 'soft tissue infection'],
  'gastroenteritis': ['viral gastroenteritis', 'stomach flu', 'stomach bug'],
  'constipation': ['functional constipation'],
  'bowel obstruction': ['small bowel obstruction', 'sbo', 'intestinal obstruction'],
  'peripheral neuropathy': ['neuropathy', 'diabetic neuropathy'],
  'hypothyroidism': ['underactive thyroid'],
  'cauda equina syndrome': ['cauda equina'],
};

function isHit(r) {
  if (!r.ok) return false;
  const expectedLower = (r.expected || '').toLowerCase();
  const expectedFirst = expectedLower.split(' ')[0].replace(/[^a-z]/g, '');
  const primary = (r.result?.differentials?.primaryDiagnosis?.diagnosis || '').toLowerCase();
  const top5 = (r.result?.differentials?.differentials || []).slice(0, 5).map(d => d.diagnosis.toLowerCase());
  const topFiveStr = top5.join(' | ');

  // Direct match
  if (primary.includes(expectedFirst) || topFiveStr.includes(expectedLower) || topFiveStr.includes(expectedFirst)) return true;

  // Full name in any top-5 diagnosis
  if (top5.some(d => d.includes(expectedLower) || expectedLower.includes(d))) return true;

  // Alias match — check if any alias of the expected condition appears in engine output
  const aliases = MATCH_ALIASES[expectedLower] || [];
  for (const alias of aliases) {
    if (primary.includes(alias) || top5.some(d => d.includes(alias) || alias.includes(d))) return true;
  }

  return false;
}

// --- Run ---
async function main() {
  console.log('Building 500 test cases...');
  const cases = buildCases();
  const results = [];
  let hits = 0, misses = 0, errors = 0;

  console.log(`Running ${cases.length} API cases against ${BASE_URL}...`);
  console.log(`Estimated time: ~${Math.round(cases.length * DELAY_MS / 60000)} minutes\n`);

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const startTime = Date.now();
    let result, ok = false, latencyMs = 0;

    try {
      const resp = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c.body),
      });
      latencyMs = Date.now() - startTime;
      ok = resp.ok;
      result = await resp.json();
    } catch (e) {
      latencyMs = Date.now() - startTime;
      result = { error: e.message };
    }

    const entry = {
      id: c.id,
      demo: c.demo,
      setting: c.setting,
      expected: c.expected,
      cc: c.body.chiefComplaint,
      ok,
      latencyMs,
      result,
    };

    const hit = isHit(entry);
    entry.hit = hit;
    if (!ok) { errors++; entry.hit = false; }
    else if (hit) hits++;
    else misses++;
    results.push(entry);

    const primary = result?.differentials?.primaryDiagnosis?.diagnosis || 'N/A';
    const mark = !ok ? 'ERR' : hit ? 'HIT' : 'MISS';
    const pct = ((hits / (hits + misses + errors)) * 100).toFixed(1);
    process.stdout.write(`\r[${i + 1}/${cases.length}] ${mark} | ${pct}% | ${c.expected} → ${primary} (${latencyMs}ms)                    `);

    if (i < cases.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log('\n\nDone! Generating reports...');

  // --- Summary stats ---
  const total = results.length;
  const accuracy = ((hits / total) * 100).toFixed(1);

  const byDemo = {};
  const bySetting = {};
  for (const r of results) {
    byDemo[r.demo] = byDemo[r.demo] || { hits: 0, total: 0 };
    byDemo[r.demo].total++;
    if (r.hit) byDemo[r.demo].hits++;

    bySetting[r.setting] = bySetting[r.setting] || { hits: 0, total: 0 };
    bySetting[r.setting].total++;
    if (r.hit) bySetting[r.setting].hits++;
  }

  const missedList = results.filter(r => !r.hit && r.ok);
  const errorList = results.filter(r => !r.ok);

  // Latency stats
  const latencies = results.filter(r => r.ok).map(r => r.latencyMs).sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  // Top missed conditions
  const missedByCondition = {};
  for (const m of missedList) {
    missedByCondition[m.expected] = (missedByCondition[m.expected] || 0) + 1;
  }
  const topMissed = Object.entries(missedByCondition).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Top reliable conditions
  const hitByCondition = {};
  const totalByCondition = {};
  for (const r of results) {
    totalByCondition[r.expected] = (totalByCondition[r.expected] || 0) + 1;
    if (r.hit) hitByCondition[r.expected] = (hitByCondition[r.expected] || 0) + 1;
  }
  const topReliable = Object.entries(totalByCondition)
    .map(([cond, tot]) => [cond, (hitByCondition[cond] || 0), tot])
    .filter(([, h, t]) => h === t && t >= 2)
    .sort((a, b) => b[2] - a[2])
    .slice(0, 10);

  // --- Write markdown report ---
  let md = `# COMPASS Stress Test — 600 API Cases (v18)\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Endpoint:** ${BASE_URL}\n`;
  md += `**Total cases:** ${total}\n\n`;

  md += `## Overall Accuracy\n\n`;
  md += `| Metric | Value |\n|---|---|\n`;
  md += `| **Hits (primary or top-5)** | ${hits} |\n`;
  md += `| **Misses** | ${misses} |\n`;
  md += `| **Errors** | ${errors} |\n`;
  md += `| **Accuracy** | **${accuracy}%** |\n\n`;

  md += `## By Demographic\n\n`;
  md += `| Demo | Hits | Total | Accuracy |\n|---|---|---|---|\n`;
  for (const [d, s] of Object.entries(byDemo)) {
    md += `| ${d} | ${s.hits} | ${s.total} | ${((s.hits / s.total) * 100).toFixed(1)}% |\n`;
  }
  md += `\n`;

  md += `## By Setting\n\n`;
  md += `| Setting | Hits | Total | Accuracy |\n|---|---|---|---|\n`;
  for (const [s, v] of Object.entries(bySetting)) {
    md += `| ${s} | ${v.hits} | ${v.total} | ${((v.hits / v.total) * 100).toFixed(1)}% |\n`;
  }
  md += `\n`;

  md += `## Latency\n\n`;
  md += `| Percentile | ms |\n|---|---|\n`;
  md += `| p50 | ${p50} |\n| p95 | ${p95} |\n| p99 | ${p99} |\n\n`;

  md += `## Top 10 Most-Missed Conditions\n\n`;
  md += `| Condition | Misses |\n|---|---|\n`;
  for (const [cond, cnt] of topMissed) {
    md += `| ${cond} | ${cnt} |\n`;
  }
  md += `\n`;

  md += `## Top 10 Most-Reliable Conditions (100% hit rate, n>=2)\n\n`;
  md += `| Condition | Hits/Total |\n|---|---|\n`;
  for (const [cond, h, t] of topReliable) {
    md += `| ${cond} | ${h}/${t} |\n`;
  }
  md += `\n`;

  md += `## All Misses\n\n`;
  md += `| ID | Demo | Setting | Expected | Got (Primary) | Top 5 | CC |\n|---|---|---|---|---|---|---|\n`;
  for (const m of missedList) {
    const primary = m.result?.differentials?.primaryDiagnosis?.diagnosis || 'N/A';
    const top5 = (m.result?.differentials?.differentials || []).slice(0, 5).map(d => d.diagnosis).join(', ');
    const cc = m.cc.slice(0, 60).replace(/\|/g, '/');
    md += `| ${m.id} | ${m.demo} | ${m.setting} | ${m.expected} | ${primary} | ${top5} | ${cc} |\n`;
  }
  md += `\n`;

  if (errorList.length > 0) {
    md += `## Errors\n\n`;
    md += `| ID | Expected | Error |\n|---|---|---|\n`;
    for (const e of errorList) {
      md += `| ${e.id} | ${e.expected} | ${JSON.stringify(e.result?.error || 'unknown').slice(0, 100)} |\n`;
    }
  }

  // --- Failure mode categorization ---
  const failureModes = { deadEnd: [], viralOvergen: [], wrongDx: [] };
  for (const m of missedList) {
    const primary = (m.result?.differentials?.primaryDiagnosis?.diagnosis || '').toLowerCase();
    if (primary.includes('needs in-person') || primary === 'n/a' || primary === '') {
      failureModes.deadEnd.push(m);
    } else if (primary.includes('viral infection') || primary.includes('viral uri')) {
      failureModes.viralOvergen.push(m);
    } else {
      failureModes.wrongDx.push(m);
    }
  }

  md += `\n## Failure Mode Breakdown\n\n`;
  md += `| Mode | Count | % of Total |\n|---|---|---|\n`;
  md += `| Dead-end ("Needs in-person") | ${failureModes.deadEnd.length} | ${((failureModes.deadEnd.length / total) * 100).toFixed(1)}% |\n`;
  md += `| Viral over-generalization | ${failureModes.viralOvergen.length} | ${((failureModes.viralOvergen.length / total) * 100).toFixed(1)}% |\n`;
  md += `| Wrong diagnosis | ${failureModes.wrongDx.length} | ${((failureModes.wrongDx.length / total) * 100).toFixed(1)}% |\n`;
  md += `| API errors | ${errors} | ${((errors / total) * 100).toFixed(1)}% |\n\n`;

  // Dead-end details
  if (failureModes.deadEnd.length > 0) {
    md += `### Dead-End Cases\n\n`;
    md += `| Expected | CC (truncated) |\n|---|---|\n`;
    const deadEndByCondition = {};
    for (const m of failureModes.deadEnd) {
      deadEndByCondition[m.expected] = (deadEndByCondition[m.expected] || 0) + 1;
    }
    for (const [cond, cnt] of Object.entries(deadEndByCondition).sort((a, b) => b[1] - a[1])) {
      md += `| ${cond} (${cnt}) | ${failureModes.deadEnd.find(m => m.expected === cond).cc.slice(0, 60)} |\n`;
    }
    md += `\n`;
  }

  // Viral over-generalization details
  if (failureModes.viralOvergen.length > 0) {
    md += `### Viral Over-Generalization Cases\n\n`;
    md += `| Expected | CC (truncated) |\n|---|---|\n`;
    const viralByCondition = {};
    for (const m of failureModes.viralOvergen) {
      viralByCondition[m.expected] = (viralByCondition[m.expected] || 0) + 1;
    }
    for (const [cond, cnt] of Object.entries(viralByCondition).sort((a, b) => b[1] - a[1])) {
      md += `| ${cond} (${cnt}) | ${failureModes.viralOvergen.find(m => m.expected === cond).cc.slice(0, 60)} |\n`;
    }
    md += `\n`;
  }

  // Per-condition accuracy table
  md += `## Per-Condition Accuracy\n\n`;
  md += `| Condition | Hits | Total | Accuracy | Primary Failure Mode |\n|---|---|---|---|---|\n`;
  const conditionEntries = Object.entries(totalByCondition).sort((a, b) => {
    const aRate = (hitByCondition[a[0]] || 0) / a[1];
    const bRate = (hitByCondition[b[0]] || 0) / b[1];
    return aRate - bRate;
  });
  for (const [cond, tot] of conditionEntries) {
    const h = hitByCondition[cond] || 0;
    const rate = ((h / tot) * 100).toFixed(0);
    // Determine primary failure mode for this condition
    const condMisses = missedList.filter(m => m.expected === cond);
    let mode = '-';
    if (condMisses.length > 0) {
      const primaries = condMisses.map(m => (m.result?.differentials?.primaryDiagnosis?.diagnosis || 'N/A'));
      const topReturn = primaries.sort((a, b) => primaries.filter(v => v === b).length - primaries.filter(v => v === a).length)[0];
      mode = topReturn.slice(0, 40);
    }
    md += `| ${cond} | ${h} | ${tot} | ${rate}% | ${mode} |\n`;
  }
  md += `\n`;

  writeFileSync('tmp-compass-test/results-v18.md', md);
  writeFileSync('tmp-compass-test/results-v18.json', JSON.stringify(results, null, 2));

  console.log(`\n=== RESULTS ===`);
  console.log(`Accuracy: ${accuracy}% (${hits}/${total})`);
  console.log(`Misses: ${misses} | Errors: ${errors}`);
  console.log(`Latency: p50=${p50}ms p95=${p95}ms p99=${p99}ms`);
  console.log(`\nReports written to tmp-compass-test/results-v18.md and results-v18.json`);
}

main().catch(console.error);
