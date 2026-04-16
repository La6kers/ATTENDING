# COMPASS Stress Test — 500 API Cases (v9)

**Date:** 2026-04-16T07:26:42.539Z
**Endpoint:** http://localhost:3005/api/diagnose
**Total cases:** 500

## Overall Accuracy

| Metric | Value |
|---|---|
| **Hits (primary or top-5)** | 120 |
| **Misses** | 305 |
| **Errors** | 75 |
| **Accuracy** | **24.0%** |

## By Demographic

| Demo | Hits | Total | Accuracy |
|---|---|---|---|
| geri | 40 | 175 | 22.9% |
| adult | 43 | 200 | 21.5% |
| peds | 37 | 125 | 29.6% |

## By Setting

| Setting | Hits | Total | Accuracy |
|---|---|---|---|
| ED | 46 | 167 | 27.5% |
| UC | 34 | 167 | 20.4% |
| PC | 40 | 166 | 24.1% |

## Latency

| Percentile | ms |
|---|---|
| p50 | 10 |
| p95 | 14 |
| p99 | 21 |

## Top 10 Most-Missed Conditions

| Condition | Misses |
|---|---|
| Urinary Tract Infection | 7 |
| Gastroenteritis | 7 |
| Nephrolithiasis | 7 |
| Deep Vein Thrombosis | 7 |
| Gout | 7 |
| Pharyngitis | 7 |
| Cellulitis | 7 |
| Upper Respiratory Infection | 7 |
| Diverticulitis | 7 |
| Otitis Media | 7 |

## Top 10 Most-Reliable Conditions (100% hit rate, n>=2)

| Condition | Hits/Total |
|---|---|
| Stroke | 7/7 |
| Pyelonephritis | 7/7 |
| Meningitis | 7/7 |
| Diabetic Ketoacidosis | 7/7 |
| Bronchitis | 7/7 |
| Subarachnoid Hemorrhage | 7/7 |
| Testicular Torsion | 7/7 |
| Anaphylaxis | 7/7 |
| Preeclampsia | 7/7 |
| Cauda Equina Syndrome | 7/7 |

## All Misses

| ID | Demo | Setting | Expected | Got (Primary) | Top 5 | CC |
|---|---|---|---|---|---|---|
| 704 | peds | UC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | constant urge to pee and it burns every single time |
| 707 | geri | UC | Gastroenteritis | Viral infection | Viral infection, Bacterial infection, UTI | my stomach is a mess been runnin to the toilet every hour |
| 709 | geri | ED | Nephrolithiasis | Needs in-person evaluation | Needs in-person evaluation | worst pain of my life in my side it comes and goes and i can |
| 711 | geri | PC | Deep Vein Thrombosis | DVT | DVT, Cellulitis, Venous Insufficiency, Musculoskeletal Strain, Lymphedema | pain in the back of my leg and its all swollen up after my l |
| 716 | geri | UC | Sepsis | Viral infection | Viral infection, Meningitis, UTI, Pneumonia, Bacterial infection | feel like im dying fever chills cant think straight and so w |
| 717 | adult | PC | Gout | Needs in-person evaluation | Needs in-person evaluation | woke up with the worst pain in my foot its swollen hot and t |
| 718 | geri | ED | Pharyngitis | Esophageal Cancer | Esophageal Cancer, Esophageal Stricture, Eosinophilic Esophagitis, GERD, Anaphylaxis | throat is on fire cant swallow and theres white spots back t |
| 719 | adult | UC | Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | skin on my arm is red warm and tender and the redness keeps  |
| 721 | geri | ED | Upper Respiratory Infection | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, GERD, Peritonsillar Abscess | stuffy nose sore throat and i feel run down just a bad cold |
| 722 | adult | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, GERD, Costochondritis, Anxiety | sharp chest pain outta nowhere and now i cant take a full br |
| 723 | adult | PC | Aortic Dissection | Acute Hemorrhage | Acute Hemorrhage, Subset of patients present with Syncope Plus another key symptom, Other Reflex Mediated Syncope causes, Carotid Sinus Syncope, Metabolic Disorders | ripping sensation in my chest going through to my back and i |
| 725 | geri | UC | Ectopic Pregnancy | Acute Pelvic Inflammatory Disease | Acute Pelvic Inflammatory Disease, Ovarian Hyperstimulation Syndrome, Pelvic Congestion Syndrome, Bowel Obstruction, Bladder perforation | pelvic pain with some bleeding and i think i might be pregna |
| 727 | adult | ED | Diverticulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | pain in my lower left belly with fever and i been constipate |
| 731 | peds | UC | Otitis Media | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | my kid is screamin and grabbin his ear and got a fever |
| 732 | adult | PC | Febrile Seizure | Seizure | Seizure, New-Onset Epilepsy, Alcohol Withdrawal Seizure, Stroke, Syncope | my baby had a fever then started shaking all over and his ey |
| 734 | peds | UC | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Medication side effect, Anxiety | theres blood in my stool bright red and i feel dizzy |
| 735 | adult | PC | Constipation | Appendicitis | Appendicitis, Cholecystitis, Pancreatitis | cant go to the bathroom belly is hard and hurts |
| 740 | adult | UC | Peritonsillar Abscess | Eosinophilic Esophagitis | Eosinophilic Esophagitis, Esophageal Cancer, Esophageal Stricture, GERD, Achalasia | cant swallow at all one side of my throat is huge and i soun |
| 741 | adult | PC | Nursemaid Elbow | Needs in-person evaluation | Needs in-person evaluation | my kid is holding her arm still and cries if you try to move |
| 742 | peds | ED | Pyloric Stenosis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | my 3 week old baby keeps projectile vomiting after every fee |
| 743 | adult | UC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, GERD, Bone Lesions | sore throat came on fast now my child is leaning forward dro |
| 744 | peds | PC | Henoch-Schonlein Purpura | Rheumatoid Arthritis | Rheumatoid Arthritis, Reactive Arthritis, Viral Arthritis, Systemic Lupus Erythematosus, Fibromyalgia | my kid has a purple rash on his legs and his belly and joint |
| 745 | adult | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Trochanteric Bursitis, Labral Tear | my overweight teen has been complaining of hip pain and now  |
| 747 | adult | PC | Intussusception | Viral Illness | Viral Illness, Sepsis, UTI, Dehydration, Acute Hip and Leg | my infant has episodes of screaming drawing up legs then goi |
| 748 | adult | ED | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | sudden horrible pain on one side of my pelvis and im throwin |
| 749 | geri | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy | pregnant and my belly got really hard and painful and theres |
| 750 | geri | PC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder, Hyperthyroidism, Cardiac Arrhythmia | got hit in the chest and now i can barely breathe and feel l |
| 751 | geri | ED | Status Epilepticus | Needs in-person evaluation | Needs in-person evaluation | my family member started seizing and its been going on and o |
| 753 | adult | PC | Thyroid Storm | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | hyperthyroid and now everything is going haywire fever fast  |
| 754 | peds | ED | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 755 | geri | UC | Corneal Abrasion | Needs in-person evaluation | Needs in-person evaluation | feels like something is stuck in my eye its tearing up and i |
| 756 | adult | PC | Orbital Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | my eye is swollen shut red and it hurts to move it plus i go |
| 757 | adult | ED | Temporal Arteritis | Needs in-person evaluation | Needs in-person evaluation | my temple area is tender and throbbing and i noticed my visi |
| 758 | adult | UC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Appendicitis, Peptic Ulcer | terrible belly pain after eating and ive been losing weight  |
| 759 | geri | PC | Subdural Hematoma | Tension headache | Tension headache, Migraine, Cluster headache | grandpa bumped his head and now hes acting weird and drowsy |
| 760 | peds | ED | Shingles | Viral Exanthem | Viral Exanthem, Contact Dermatitis, Conjunctivitis, Hand Foot and Mouth Disease, Allergic Reaction | burning painful rash on one side of my body with little blis |
| 761 | geri | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | daycare kid with fever painful mouth sores and a rash on pal |
| 762 | adult | PC | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Conjunctivitis, Allergic Reaction, Cellulitis | my kid has crusty honey colored sores around his mouth and n |
| 763 | adult | ED | Bronchiolitis | Anaphylaxis | Anaphylaxis, Aspiration Pneumonitis, Asthma Exacerbation, Cystic Fibrosis or ciliary Dyskinesia, Anomalous left common Carotid Artery | infant with runny nose that turned into fast breathing and w |
| 764 | geri | UC | Atrial Fibrillation | Orthostatic hypotension | Orthostatic hypotension, BPPV, Vestibular neuritis, Cardiac Arrhythmia, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 766 | peds | ED | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 768 | adult | PC | Bowel Obstruction | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | belly is huge and hard havent passed gas or pooped in days a |
| 769 | geri | ED | Hemorrhoids | Needs in-person evaluation | Needs in-person evaluation | pain and bleeding when i go to the bathroom theres a lump ne |
| 770 | geri | UC | Hypothyroidism | Hip Fracture | Hip Fracture, Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | im always cold tired and gaining weight even though i barely |
| 771 | adult | PC | Peripheral Neuropathy | Needs in-person evaluation | Needs in-person evaluation | numbness starting in my toes working up and i keep dropping  |
| 773 | adult | UC | Carpal Tunnel Syndrome | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | wrist hurts and my thumb and first two fingers tingle especi |
| 779 | adult | UC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | constant urge to pee and it burns every single time |
| 782 | geri | UC | Gastroenteritis | Viral infection | Viral infection, Bacterial infection, UTI | my stomach is a mess been runnin to the toilet every hour |
| 784 | adult | ED | Nephrolithiasis | Needs in-person evaluation | Needs in-person evaluation | worst pain of my life in my side it comes and goes and i can |
| 786 | adult | PC | Deep Vein Thrombosis | DVT | DVT, Cellulitis, Musculoskeletal Strain, Venous Insufficiency, Baker's Cyst Rupture | pain in the back of my leg and its all swollen up after my l |
| 787 | adult | ED | COPD Exacerbation | Asthma | Asthma, Bronchi, Pneumonia, Anxiety, Post-infectious cough | my copd is acting up cant breathe and coughing way more than |
| 792 | peds | PC | Gout | Needs in-person evaluation | Needs in-person evaluation | woke up with the worst pain in my foot its swollen hot and t |
| 793 | adult | ED | Pharyngitis | Esophageal Stricture | Esophageal Stricture, Anaphylaxis, GERD, Esophageal Cancer, Eosinophilic Esophagitis | throat is on fire cant swallow and theres white spots back t |
| 794 | adult | UC | Cellulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | skin on my arm is red warm and tender and the redness keeps  |
| 796 | adult | ED | Upper Respiratory Infection | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, GERD, Infectious Mononucleosis, Peritonsillar Abscess | stuffy nose sore throat and i feel run down just a bad cold |
| 797 | peds | UC | Pneumothorax | Asthma | Asthma, Anxiety, Pulmonary Embolism, Pneumonia, Anemia | felt a pop in my chest and suddenly cant breathe on one side |
| 802 | adult | ED | Diverticulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | pain in my lower left belly with fever and i been constipate |
| 805 | geri | ED | Croup | Post-Bronchitic cough | Post-Bronchitic cough, Viral URI, Foreign Body Aspiration, Bronchitis, Aspiration lung disease | my toddlers cough sounds really weird like barking and hes w |
| 806 | peds | UC | Otitis Media | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | my kid is screamin and grabbin his ear and got a fever |
| 807 | geri | PC | Febrile Seizure | Viral infection | Viral infection, Brachioradial Pruritus, Bacterial infection, Pneumonia, Allergic Contact Dermatitis | my toddler was hot with fever then went stiff and was twitch |
| 809 | geri | UC | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | theres blood in my stool bright red and i feel dizzy |
| 810 | geri | PC | Constipation | Appendicitis | Appendicitis, Cholecystitis, Pancreatitis | havent pooped in like a week and my belly is so bloated and  |
| 815 | adult | UC | Peritonsillar Abscess | Bone Lesions | Bone Lesions, Bilateral Facial Nerve Palsy, Pseudobulbar paralysis, Alveolar abscess, Dental malocclusion | throat is so swollen on one side i can barely open my jaw an |
| 816 | adult | PC | Nursemaid Elbow | Needs in-person evaluation | Needs in-person evaluation | my toddler wont use his arm after i pulled him up by the han |
| 817 | geri | ED | Pyloric Stenosis | Needs in-person evaluation | Needs in-person evaluation | newborn throws up forcefully right after eating and hes alwa |
| 818 | adult | UC | Epiglottitis | Bone Lesions | Bone Lesions, Bilateral Facial Nerve Palsy, Pseudobulbar paralysis, Alveolar abscess, Dental malocclusion | my kid is drooling sitting straight up and can barely breath |
| 819 | adult | PC | Henoch-Schonlein Purpura | Orthostatic Hypotension | Orthostatic Hypotension, Vasovagal Syncope, Dehydration, Postural Orthostatic Tachycardia Syndrome, Cardiac Arrhythmia | weird bruise-like spots on my childs legs and butt and she s |
| 820 | geri | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Labral Tear, Hoffa Disease, Septic Arthritis, Hip Osteoarthritis | my teenager is limping and says his hip and knee hurt he can |
| 821 | geri | UC | Kawasaki Disease | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | my little one has fever that wont break plus red eyes swolle |
| 822 | adult | PC | Intussusception | Needs in-person evaluation | Needs in-person evaluation | my baby screams in pain then stops then screams again and th |
| 823 | peds | ED | Ovarian Torsion | Regional Enteritis | Regional Enteritis | woke up with the worst pain in my right lower belly and i fe |
| 824 | geri | UC | Placental Abruption | Gastroenteritis | Gastroenteritis, Ectopic Pregnancy, GERD, Cholecystitis, Diverticulitis | im 32 weeks pregnant and suddenly bleeding heavy with terrib |
| 825 | geri | PC | Tension Pneumothorax | Hip Fracture | Hip Fracture, Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | chest trauma and now one side aint moving and im getting wor |
| 826 | adult | ED | Status Epilepticus | Seizure | Seizure, New-Onset Epilepsy, Alcohol Withdrawal Seizure, Stroke, Syncope | been having seizures back to back for 20 minutes and wont st |
| 827 | adult | UC | Addison Crisis | Orthostatic hypotension | Orthostatic hypotension, BPPV, Medication side effect, Vestibular neuritis, Cardiac Arrhythmia | been on steroids and stopped now im crashing feel terrible w |
| 828 | peds | PC | Thyroid Storm | Supraventricular Tachycardia | Supraventricular Tachycardia, Panic Disorder, Anxiety, Cardiac Arrhythmia, Meningitis | heart is racing over 150 im sweating like crazy and feel agi |
| 829 | adult | ED | Rhabdomyolysis | Seizure | Seizure, New-Onset Epilepsy, Syncope, Alcohol Withdrawal Seizure, Hypoglycemia | did crossfit for the first time and now i cant move and my u |
| 830 | adult | UC | Corneal Abrasion | Needs in-person evaluation | Needs in-person evaluation | got poked in the eye and now it wont stop watering and hurts |
| 831 | geri | PC | Orbital Cellulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | kids eye is bulging out puffy red and he has a fever |
| 832 | adult | ED | Temporal Arteritis | Tension headache | Tension headache, Sinusitis, Cluster headache, Migraine, Medication overuse headache | bad headache on one side of my head near my temple and it hu |
| 833 | geri | UC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Appendicitis | sudden severe belly pain way worse than what the exam shows |
| 834 | adult | PC | Subdural Hematoma | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | fell and hit my head a week ago and now im getting confused  |
| 836 | adult | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | my toddler has sores in his mouth and blisters on his hands  |
| 837 | adult | PC | Impetigo | Needs in-person evaluation | Needs in-person evaluation | these yellow crusty patches keep spreading on my childs face |
| 838 | peds | ED | Bronchiolitis | Anaphylaxis | Anaphylaxis, Aspiration Pneumonitis, Asthma Exacerbation, Cystic Fibrosis or ciliary Dyskinesia, Anomalous left common Carotid Artery | my baby is wheezing and having trouble breathing after a col |
| 839 | adult | UC | Atrial Fibrillation | Asthma | Asthma, Pneumonia, Pulmonary Embolism, Anxiety, Pneumothorax | heart is fluttering and skipping beats and i feel short of b |
| 840 | adult | PC | Depression | Major Depressive Disorder | Major Depressive Disorder, Adjustment Disorder, Generalized Anxiety Disorder, Substance Use Disorder, Bipolar Disorder | i dont wanna do anything anymore feel empty and hopeless for |
| 843 | adult | PC | Bowel Obstruction | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | stomach cramps come and go and everything is bloated and i k |
| 844 | geri | ED | Hemorrhoids | Major Depressive Disorder | Major Depressive Disorder, Generalized Anxiety Disorder, Adjustment Disorder, Hypothyroidism, Bipolar Disorder | bright red blood on the toilet paper when i wipe and its itc |
| 845 | peds | UC | Hypothyroidism | Needs in-person evaluation | Needs in-person evaluation | feel sluggish all the time constipated and my skin is so dry |
| 846 | peds | PC | Peripheral Neuropathy | Needs in-person evaluation | Needs in-person evaluation | my feet tingle and burn all the time especially at night fee |
| 848 | peds | UC | Carpal Tunnel Syndrome | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | my hand goes numb at night and i keep dropping things tingli |
| 853 | adult | ED | Pneumonia | Musculoskeletal pain | Musculoskeletal pain, Post-Bronchitic cough, Sepsis, Costochondritis, Anxiety | chest hurts when i cough and i been runnin a fever of 102 fo |
| 854 | adult | UC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | constant urge to pee and it burns every single time |
| 857 | adult | UC | Gastroenteritis | Viral infection | Viral infection, Bacterial infection, UTI | my stomach is a mess been runnin to the toilet every hour |
| 859 | adult | ED | Nephrolithiasis | Needs in-person evaluation | Needs in-person evaluation | worst pain of my life in my side it comes and goes and i can |
| 861 | geri | PC | Deep Vein Thrombosis | DVT | DVT, Cellulitis, Musculoskeletal Strain, Venous Insufficiency, Baker's Cyst Rupture | pain in the back of my leg and its all swollen up after my l |
| 866 | adult | UC | Sepsis | Viral infection | Viral infection, Meningitis, UTI, Pneumonia, Bacterial infection | feel like im dying fever chills cant think straight and so w |
| 867 | geri | PC | Gout | Needs in-person evaluation | Needs in-person evaluation | woke up with the worst pain in my foot its swollen hot and t |
| 868 | geri | ED | Pharyngitis | Esophageal Cancer | Esophageal Cancer, Esophageal Stricture, Eosinophilic Esophagitis, GERD, Anaphylaxis | throat is on fire cant swallow and theres white spots back t |
| 869 | adult | UC | Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | skin on my arm is red warm and tender and the redness keeps  |
| 871 | geri | ED | Upper Respiratory Infection | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, GERD, Peritonsillar Abscess | stuffy nose sore throat and i feel run down just a bad cold |
| 872 | geri | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, Acute Coronary Syndrome, GERD | sharp chest pain outta nowhere and now i cant take a full br |
| 873 | geri | PC | Aortic Dissection | Acute Hemorrhage | Acute Hemorrhage, Subset of patients present with Syncope Plus another key symptom, Other Reflex Mediated Syncope causes, Carotid Sinus Syncope, Metabolic Disorders | ripping sensation in my chest going through to my back and i |
| 875 | geri | UC | Ectopic Pregnancy | Acute Pelvic Inflammatory Disease | Acute Pelvic Inflammatory Disease, Ovarian Hyperstimulation Syndrome, Pelvic Congestion Syndrome, Bowel Obstruction, Bladder perforation | pelvic pain with some bleeding and i think i might be pregna |
| 877 | adult | ED | Diverticulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | pain in my lower left belly with fever and i been constipate |
| 881 | adult | UC | Otitis Media | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | my kid is screamin and grabbin his ear and got a fever |
| 882 | adult | PC | Febrile Seizure | Seizure | Seizure, New-Onset Epilepsy, Alcohol Withdrawal Seizure, Stroke, Syncope | my baby had a fever then started shaking all over and his ey |
| 884 | peds | UC | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Medication side effect, Anxiety | theres blood in my stool bright red and i feel dizzy |
| 885 | peds | PC | Constipation | Appendicitis | Appendicitis, Cholecystitis, Pancreatitis | cant go to the bathroom belly is hard and hurts |
| 890 | geri | UC | Peritonsillar Abscess | Esophageal Cancer | Esophageal Cancer, Esophageal Stricture, Eosinophilic Esophagitis, GERD, Achalasia | cant swallow at all one side of my throat is huge and i soun |
| 891 | geri | PC | Nursemaid Elbow | Needs in-person evaluation | Needs in-person evaluation | my kid is holding her arm still and cries if you try to move |
| 892 | adult | ED | Pyloric Stenosis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | my 3 week old baby keeps projectile vomiting after every fee |
| 893 | peds | UC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, Bone Lesions, GERD | sore throat came on fast now my child is leaning forward dro |
| 894 | adult | PC | Henoch-Schonlein Purpura | Systemic Lupus Erythematosus | Systemic Lupus Erythematosus, Rheumatoid Arthritis, Fibromyalgia, Mixed Connective Tissue Disease, Sjogren Syndrome | my kid has a purple rash on his legs and his belly and joint |
| 895 | geri | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Septic Arthritis, Femoral Lesion, Hip Osteoarthritis, Anterior or Anterolateral thigh neuropathic pain | my overweight teen has been complaining of hip pain and now  |
| 897 | adult | PC | Intussusception | Viral Illness | Viral Illness, Sepsis, UTI, Dehydration, Acute Hip and Leg | my infant has episodes of screaming drawing up legs then goi |
| 898 | adult | ED | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | sudden horrible pain on one side of my pelvis and im throwin |
| 899 | geri | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy | pregnant and my belly got really hard and painful and theres |
| 900 | peds | PC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder, Hyperthyroidism, Substance Use Disorder | got hit in the chest and now i can barely breathe and feel l |
| 901 | geri | ED | Status Epilepticus | Needs in-person evaluation | Needs in-person evaluation | my family member started seizing and its been going on and o |
| 903 | peds | PC | Thyroid Storm | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | hyperthyroid and now everything is going haywire fever fast  |
| 904 | adult | ED | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 905 | adult | UC | Corneal Abrasion | Needs in-person evaluation | Needs in-person evaluation | feels like something is stuck in my eye its tearing up and i |
| 906 | adult | PC | Orbital Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | my eye is swollen shut red and it hurts to move it plus i go |
| 907 | geri | ED | Temporal Arteritis | Needs in-person evaluation | Needs in-person evaluation | my temple area is tender and throbbing and i noticed my visi |
| 908 | adult | UC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Appendicitis, Peptic Ulcer, Pancreatitis | terrible belly pain after eating and ive been losing weight  |
| 909 | peds | PC | Subdural Hematoma | Tension headache | Tension headache, Migraine, Cluster headache | grandpa bumped his head and now hes acting weird and drowsy |
| 910 | adult | ED | Shingles | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Cellulitis, Conjunctivitis, Allergic Reaction | burning painful rash on one side of my body with little blis |
| 911 | geri | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | daycare kid with fever painful mouth sores and a rash on pal |
| 912 | geri | PC | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Herpes Zoster (Shingles), Conjunctivitis, Allergic Reaction | my kid has crusty honey colored sores around his mouth and n |
| 913 | peds | ED | Bronchiolitis | Anaphylaxis | Anaphylaxis, Aspiration Pneumonitis, Asthma Exacerbation, Cystic Fibrosis or ciliary Dyskinesia, Anomalous left common Carotid Artery | infant with runny nose that turned into fast breathing and w |
| 914 | peds | UC | Atrial Fibrillation | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 916 | adult | ED | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 918 | adult | PC | Bowel Obstruction | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | belly is huge and hard havent passed gas or pooped in days a |
| 919 | geri | ED | Hemorrhoids | Needs in-person evaluation | Needs in-person evaluation | pain and bleeding when i go to the bathroom theres a lump ne |
| 920 | geri | UC | Hypothyroidism | Hip Fracture | Hip Fracture, Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | im always cold tired and gaining weight even though i barely |
| 921 | geri | PC | Peripheral Neuropathy | Needs in-person evaluation | Needs in-person evaluation | numbness starting in my toes working up and i keep dropping  |
| 923 | geri | UC | Carpal Tunnel Syndrome | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | wrist hurts and my thumb and first two fingers tingle especi |
| 929 | geri | UC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | constant urge to pee and it burns every single time |
| 932 | adult | UC | Gastroenteritis | Viral infection | Viral infection, Bacterial infection, UTI | my stomach is a mess been runnin to the toilet every hour |
| 934 | adult | ED | Nephrolithiasis | Needs in-person evaluation | Needs in-person evaluation | worst pain of my life in my side it comes and goes and i can |
| 936 | geri | PC | Deep Vein Thrombosis | DVT | DVT, Cellulitis, Venous Insufficiency, Musculoskeletal Strain, Lymphedema | pain in the back of my leg and its all swollen up after my l |
| 942 | peds | PC | Gout | Needs in-person evaluation | Needs in-person evaluation | woke up with the worst pain in my foot its swollen hot and t |
| 943 | adult | ED | Pharyngitis | Eosinophilic Esophagitis | Eosinophilic Esophagitis, Esophageal Cancer, Esophageal Stricture, GERD, Anaphylaxis | throat is on fire cant swallow and theres white spots back t |
| 944 | adult | UC | Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | skin on my arm is red warm and tender and the redness keeps  |
| 946 | adult | ED | Upper Respiratory Infection | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, GERD, Infectious Mononucleosis, Peritonsillar Abscess | stuffy nose sore throat and i feel run down just a bad cold |
| 952 | peds | ED | Diverticulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | pain in my lower left belly with fever and i been constipate |
| 956 | adult | UC | Otitis Media | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | my kid is screamin and grabbin his ear and got a fever |
| 957 | geri | PC | Febrile Seizure | Viral infection | Viral infection, Brachioradial Pruritus, Bacterial infection, Pneumonia, Allergic Contact Dermatitis | my toddler was hot with fever then went stiff and was twitch |
| 958 | peds | ED | Hip Fracture | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | i fell and now i cant put any weight on my leg my hip hurts  |
| 959 | peds | UC | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Medication side effect, Anxiety | theres blood in my stool bright red and i feel dizzy |
| 960 | adult | PC | Constipation | Appendicitis | Appendicitis, Cholecystitis, Pancreatitis | havent pooped in like a week and my belly is so bloated and  |
| 965 | adult | UC | Peritonsillar Abscess | Bone Lesions | Bone Lesions, Bilateral Facial Nerve Palsy, Pseudobulbar paralysis, Alveolar abscess, Dental malocclusion | throat is so swollen on one side i can barely open my jaw an |
| 966 | geri | PC | Nursemaid Elbow | Needs in-person evaluation | Needs in-person evaluation | my toddler wont use his arm after i pulled him up by the han |
| 967 | peds | ED | Pyloric Stenosis | Needs in-person evaluation | Needs in-person evaluation | newborn throws up forcefully right after eating and hes alwa |
| 968 | adult | UC | Epiglottitis | Bone Lesions | Bone Lesions, Bilateral Facial Nerve Palsy, Pseudobulbar paralysis, Alveolar abscess, Dental malocclusion | my kid is drooling sitting straight up and can barely breath |
| 969 | adult | PC | Henoch-Schonlein Purpura | Postural Orthostatic Tachycardia Syndrome | Postural Orthostatic Tachycardia Syndrome, Orthostatic Hypotension, Dehydration, Vasovagal Syncope, Anemia | weird bruise-like spots on my childs legs and butt and she s |
| 970 | adult | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Labral Tear, Hoffa Disease, Septic Arthritis, Hip Osteoarthritis | my teenager is limping and says his hip and knee hurt he can |
| 971 | peds | UC | Kawasaki Disease | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Irritant Conjunctivitis | my little one has fever that wont break plus red eyes swolle |
| 972 | geri | PC | Intussusception | Needs in-person evaluation | Needs in-person evaluation | my baby screams in pain then stops then screams again and th |
| 973 | geri | ED | Ovarian Torsion | Leaking Abdominal Aortic Aneurysm | Leaking Abdominal Aortic Aneurysm, Regional Enteritis | woke up with the worst pain in my right lower belly and i fe |
| 974 | adult | UC | Placental Abruption | Gastroenteritis | Gastroenteritis, Ectopic Pregnancy, GERD, Cholecystitis, Appendicitis | im 32 weeks pregnant and suddenly bleeding heavy with terrib |
| 975 | adult | PC | Tension Pneumothorax | Fracture | Fracture, Soft Tissue Injury, Rib Fracture, Traumatic Brain Injury, Concussion | chest trauma and now one side aint moving and im getting wor |
| 976 | adult | ED | Status Epilepticus | Seizure | Seizure, Alcohol Withdrawal Seizure, New-Onset Epilepsy, Syncope, Stroke | been having seizures back to back for 20 minutes and wont st |
| 977 | adult | UC | Addison Crisis | BPPV | BPPV, Vestibular neuritis, Orthostatic hypotension, Medication side effect, Anxiety | been on steroids and stopped now im crashing feel terrible w |
| 978 | adult | PC | Thyroid Storm | Atrial Fibrillation | Atrial Fibrillation, Supraventricular Tachycardia, Panic Disorder, Cardiac Arrhythmia, Anxiety | heart is racing over 150 im sweating like crazy and feel agi |
| 979 | peds | ED | Rhabdomyolysis | Febrile Seizure | Febrile Seizure, Seizure, New-Onset Epilepsy, Syncope, Meningitis | did crossfit for the first time and now i cant move and my u |
| 980 | adult | UC | Corneal Abrasion | Needs in-person evaluation | Needs in-person evaluation | got poked in the eye and now it wont stop watering and hurts |
| 981 | adult | PC | Orbital Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | kids eye is bulging out puffy red and he has a fever |
| 982 | geri | ED | Temporal Arteritis | Tension headache | Tension headache, Sinusitis, Migraine, Cluster headache, Medication overuse headache | bad headache on one side of my head near my temple and it hu |
| 983 | geri | UC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Diverticulitis, Appendicitis | sudden severe belly pain way worse than what the exam shows |
| 984 | adult | PC | Subdural Hematoma | Fracture | Fracture, Soft Tissue Injury, Rib Fracture, Hip Fracture, Traumatic Brain Injury | fell and hit my head a week ago and now im getting confused  |
| 985 | adult | ED | Shingles | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Conjunctivitis, Allergic Reaction, Cellulitis | had chickenpox as a kid now theres a strip of painful bliste |
| 986 | adult | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | my toddler has sores in his mouth and blisters on his hands  |
| 987 | geri | PC | Impetigo | Needs in-person evaluation | Needs in-person evaluation | these yellow crusty patches keep spreading on my childs face |
| 988 | adult | ED | Bronchiolitis | Anaphylaxis | Anaphylaxis, Aspiration Pneumonitis, Asthma Exacerbation, Cystic Fibrosis or ciliary Dyskinesia, Anomalous left common Carotid Artery | my baby is wheezing and having trouble breathing after a col |
| 989 | geri | UC | Atrial Fibrillation | COPD exacerbation | COPD exacerbation, Heart Failure, Pneumonia, Asthma, Pulmonary Embolism | heart is fluttering and skipping beats and i feel short of b |
| 990 | peds | PC | Depression | Major Depressive Disorder | Major Depressive Disorder, Adjustment Disorder, Generalized Anxiety Disorder, Substance Use Disorder, Bipolar Disorder | i dont wanna do anything anymore feel empty and hopeless for |
| 993 | adult | PC | Bowel Obstruction | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | stomach cramps come and go and everything is bloated and i k |
| 994 | peds | ED | Hemorrhoids | Major Depressive Disorder | Major Depressive Disorder, Generalized Anxiety Disorder, Adjustment Disorder, Hypothyroidism, Bipolar Disorder | bright red blood on the toilet paper when i wipe and its itc |
| 995 | peds | UC | Hypothyroidism | Needs in-person evaluation | Needs in-person evaluation | feel sluggish all the time constipated and my skin is so dry |
| 996 | peds | PC | Peripheral Neuropathy | Needs in-person evaluation | Needs in-person evaluation | my feet tingle and burn all the time especially at night fee |
| 998 | peds | UC | Carpal Tunnel Syndrome | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | my hand goes numb at night and i keep dropping things tingli |
| 1003 | adult | ED | Pneumonia | Musculoskeletal pain | Musculoskeletal pain, Post-Bronchitic cough, Sepsis, Costochondritis, Anxiety | chest hurts when i cough and i been runnin a fever of 102 fo |
| 1004 | geri | UC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | constant urge to pee and it burns every single time |
| 1007 | adult | UC | Gastroenteritis | Viral infection | Viral infection, Bacterial infection, UTI | my stomach is a mess been runnin to the toilet every hour |
| 1009 | peds | ED | Nephrolithiasis | Needs in-person evaluation | Needs in-person evaluation | worst pain of my life in my side it comes and goes and i can |
| 1011 | peds | PC | Deep Vein Thrombosis | DVT | DVT, Cellulitis, Venous Insufficiency, Musculoskeletal Strain, Lymphedema | pain in the back of my leg and its all swollen up after my l |
| 1016 | peds | UC | Sepsis | Viral infection | Viral infection, Meningitis, UTI, Pneumonia, Bacterial infection | feel like im dying fever chills cant think straight and so w |
| 1017 | geri | PC | Gout | Needs in-person evaluation | Needs in-person evaluation | woke up with the worst pain in my foot its swollen hot and t |
| 1018 | adult | ED | Pharyngitis | Eosinophilic Esophagitis | Eosinophilic Esophagitis, Esophageal Cancer, Esophageal Stricture, GERD, Anaphylaxis | throat is on fire cant swallow and theres white spots back t |
| 1019 | peds | UC | Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | skin on my arm is red warm and tender and the redness keeps  |
| 1021 | adult | ED | Upper Respiratory Infection | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, GERD, Infectious Mononucleosis, Peritonsillar Abscess | stuffy nose sore throat and i feel run down just a bad cold |
| 1022 | peds | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, Anxiety, GERD | sharp chest pain outta nowhere and now i cant take a full br |
| 1023 | adult | PC | Aortic Dissection | Acute Hemorrhage | Acute Hemorrhage, Subset of patients present with Syncope Plus another key symptom, Other Reflex Mediated Syncope causes, Carotid Sinus Syncope, Metabolic Disorders | ripping sensation in my chest going through to my back and i |
| 1025 | peds | UC | Ectopic Pregnancy | Acute Pelvic Inflammatory Disease | Acute Pelvic Inflammatory Disease, Ovarian Hyperstimulation Syndrome, Pelvic Congestion Syndrome, Bowel Obstruction, Bladder perforation | pelvic pain with some bleeding and i think i might be pregna |
| 1027 | geri | ED | Diverticulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | pain in my lower left belly with fever and i been constipate |
| 1031 | peds | UC | Otitis Media | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | my kid is screamin and grabbin his ear and got a fever |
| 1032 | adult | PC | Febrile Seizure | Seizure | Seizure, New-Onset Epilepsy, Syncope, Alcohol Withdrawal Seizure, Hypoglycemia | my baby had a fever then started shaking all over and his ey |
| 1033 | adult | ED | Hip Fracture | Fracture | Fracture, Soft Tissue Injury, Concussion, Rib Fracture, Traumatic Brain Injury | i fell and now i cant put any weight on my leg my hip hurts  |
| 1034 | geri | UC | Gastrointestinal Bleeding | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | theres blood in my stool bright red and i feel dizzy |
| 1035 | peds | PC | Constipation | Appendicitis | Appendicitis, Cholecystitis, Pancreatitis | cant go to the bathroom belly is hard and hurts |
| 1040 | peds | UC | Peritonsillar Abscess | Esophageal Cancer | Esophageal Cancer, Esophageal Stricture, Eosinophilic Esophagitis, GERD, Achalasia | cant swallow at all one side of my throat is huge and i soun |
| 1041 | adult | PC | Nursemaid Elbow | Needs in-person evaluation | Needs in-person evaluation | my kid is holding her arm still and cries if you try to move |
| 1042 | adult | ED | Pyloric Stenosis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | my 3 week old baby keeps projectile vomiting after every fee |
| 1043 | peds | UC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, Bone Lesions, GERD | sore throat came on fast now my child is leaning forward dro |
| 1044 | geri | PC | Henoch-Schonlein Purpura | Polymyalgia Rheumatica | Polymyalgia Rheumatica, Rheumatoid Arthritis, Reactive Arthritis, Viral Arthritis, Systemic Lupus Erythematosus | my kid has a purple rash on his legs and his belly and joint |
| 1045 | peds | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Anterior or Anterolateral thigh neuropathic pain, Labral Tear | my overweight teen has been complaining of hip pain and now  |
| 1047 | adult | PC | Intussusception | Viral Illness | Viral Illness, Sepsis, Dehydration, Acute Hip and Leg, Hand Foot and Mouth Disease | my infant has episodes of screaming drawing up legs then goi |
| 1048 | peds | ED | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | sudden horrible pain on one side of my pelvis and im throwin |
| 1049 | geri | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy | pregnant and my belly got really hard and painful and theres |
| 1050 | adult | PC | Tension Pneumothorax | Generalized Anxiety Disorder | Generalized Anxiety Disorder, Panic Disorder, Major Depressive Disorder, Hyperthyroidism, Substance Use Disorder | got hit in the chest and now i can barely breathe and feel l |
| 1051 | adult | ED | Status Epilepticus | Needs in-person evaluation | Needs in-person evaluation | my family member started seizing and its been going on and o |
| 1053 | adult | PC | Thyroid Storm | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | hyperthyroid and now everything is going haywire fever fast  |
| 1054 | geri | ED | Rhabdomyolysis | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | worked out way too hard muscles are killing me and my pee is |
| 1055 | peds | UC | Corneal Abrasion | Needs in-person evaluation | Needs in-person evaluation | feels like something is stuck in my eye its tearing up and i |
| 1056 | adult | PC | Orbital Cellulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | my eye is swollen shut red and it hurts to move it plus i go |
| 1057 | geri | ED | Temporal Arteritis | Needs in-person evaluation | Needs in-person evaluation | my temple area is tender and throbbing and i noticed my visi |
| 1058 | geri | UC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Diverticulitis, Peptic Ulcer, Appendicitis | terrible belly pain after eating and ive been losing weight  |
| 1059 | geri | PC | Subdural Hematoma | Tension headache | Tension headache, Migraine, Cluster headache | grandpa bumped his head and now hes acting weird and drowsy |
| 1060 | peds | ED | Shingles | Viral Exanthem | Viral Exanthem, Contact Dermatitis, Hand Foot and Mouth Disease, Conjunctivitis, Impetigo | burning painful rash on one side of my body with little blis |
| 1061 | peds | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | daycare kid with fever painful mouth sores and a rash on pal |
| 1062 | geri | PC | Impetigo | Contact Dermatitis | Contact Dermatitis, Viral Exanthem, Herpes Zoster (Shingles), Cellulitis, Conjunctivitis | my kid has crusty honey colored sores around his mouth and n |
| 1063 | adult | ED | Bronchiolitis | Anaphylaxis | Anaphylaxis, Aspiration Pneumonitis, Asthma Exacerbation, Cystic Fibrosis or ciliary Dyskinesia, Anomalous left common Carotid Artery | infant with runny nose that turned into fast breathing and w |
| 1064 | peds | UC | Atrial Fibrillation | BPPV | BPPV, Orthostatic hypotension, Vestibular neuritis, Anxiety, Medication side effect | my heart is all over the place beating fast and irregular fe |
| 1066 | peds | ED | Panic Attack | Primary Spontaneous Pneumothorax | Primary Spontaneous Pneumothorax, Pulmonary Embolism, Musculoskeletal Chest Pain, Pneumonia, Pleuritis | my heart is pounding i cant breathe i feel like im dying but |
| 1068 | geri | PC | Bowel Obstruction | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | belly is huge and hard havent passed gas or pooped in days a |
| 1069 | adult | ED | Hemorrhoids | Needs in-person evaluation | Needs in-person evaluation | pain and bleeding when i go to the bathroom theres a lump ne |
| 1070 | adult | UC | Hypothyroidism | Fracture | Fracture, Hip Fracture, Soft Tissue Injury, Traumatic Brain Injury, Rib Fracture | im always cold tired and gaining weight even though i barely |
| 1071 | adult | PC | Peripheral Neuropathy | Needs in-person evaluation | Needs in-person evaluation | numbness starting in my toes working up and i keep dropping  |
| 1073 | geri | UC | Carpal Tunnel Syndrome | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | wrist hurts and my thumb and first two fingers tingle especi |
| 1079 | adult | UC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | constant urge to pee and it burns every single time |
| 1082 | adult | UC | Gastroenteritis | Viral infection | Viral infection, Bacterial infection, UTI | my stomach is a mess been runnin to the toilet every hour |
| 1084 | geri | ED | Nephrolithiasis | Needs in-person evaluation | Needs in-person evaluation | worst pain of my life in my side it comes and goes and i can |
| 1086 | geri | PC | Deep Vein Thrombosis | DVT | DVT, Cellulitis, Venous Insufficiency, Musculoskeletal Strain, Lymphedema | pain in the back of my leg and its all swollen up after my l |
| 1091 | peds | UC | Sepsis | Viral infection | Viral infection, Meningitis, UTI, Pneumonia, Bacterial infection | feel like im dying fever chills cant think straight and so w |
| 1092 | adult | PC | Gout | Needs in-person evaluation | Needs in-person evaluation | woke up with the worst pain in my foot its swollen hot and t |
| 1093 | geri | ED | Pharyngitis | Esophageal Stricture | Esophageal Stricture, Anaphylaxis, GERD, Esophageal Cancer, Eosinophilic Esophagitis | throat is on fire cant swallow and theres white spots back t |
| 1094 | peds | UC | Cellulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | skin on my arm is red warm and tender and the redness keeps  |
| 1096 | peds | ED | Upper Respiratory Infection | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, GERD, Peritonsillar Abscess | stuffy nose sore throat and i feel run down just a bad cold |
| 1097 | adult | UC | Pneumothorax | Asthma | Asthma, Anxiety, Pulmonary Embolism, Pneumonia, Anemia | felt a pop in my chest and suddenly cant breathe on one side |
| 1102 | geri | ED | Diverticulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | pain in my lower left belly with fever and i been constipate |
| 1106 | geri | UC | Otitis Media | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | my kid is screamin and grabbin his ear and got a fever |
| 1107 | adult | PC | Febrile Seizure | Viral infection | Viral infection, Brachioradial Pruritus, Bacterial infection, Allergic Contact Dermatitis, UTI | my toddler was hot with fever then went stiff and was twitch |
| 1108 | adult | ED | Hip Fracture | Fracture | Fracture, Soft Tissue Injury, Rib Fracture, Traumatic Brain Injury, Concussion | i fell and now i cant put any weight on my leg my hip hurts  |
| 1109 | adult | UC | Gastrointestinal Bleeding | Orthostatic hypotension | Orthostatic hypotension, BPPV, Vestibular neuritis, Cardiac Arrhythmia, Medication side effect | theres blood in my stool bright red and i feel dizzy |
| 1110 | adult | PC | Constipation | Appendicitis | Appendicitis, Cholecystitis, Pancreatitis | havent pooped in like a week and my belly is so bloated and  |
| 1115 | geri | UC | Peritonsillar Abscess | Bone Lesions | Bone Lesions, Bilateral Facial Nerve Palsy, Pseudobulbar paralysis, Alveolar abscess, Dental malocclusion | throat is so swollen on one side i can barely open my jaw an |
| 1116 | geri | PC | Nursemaid Elbow | Needs in-person evaluation | Needs in-person evaluation | my toddler wont use his arm after i pulled him up by the han |
| 1117 | peds | ED | Pyloric Stenosis | Needs in-person evaluation | Needs in-person evaluation | newborn throws up forcefully right after eating and hes alwa |
| 1118 | geri | UC | Epiglottitis | Bone Lesions | Bone Lesions, Bilateral Facial Nerve Palsy, Pseudobulbar paralysis, Alveolar abscess, Dental malocclusion | my kid is drooling sitting straight up and can barely breath |
| 1119 | adult | PC | Henoch-Schonlein Purpura | Orthostatic Hypotension | Orthostatic Hypotension, Vasovagal Syncope, Dehydration, Postural Orthostatic Tachycardia Syndrome, Cardiac Arrhythmia | weird bruise-like spots on my childs legs and butt and she s |
| 1120 | peds | ED | Slipped Capital Femoral Epiphysis | Labral Tear | Labral Tear, Hoffa Disease, Septic Arthritis, Acute Hip and Leg, Plica Syndrome | my teenager is limping and says his hip and knee hurt he can |
| 1121 | geri | UC | Kawasaki Disease | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | my little one has fever that wont break plus red eyes swolle |
| 1122 | geri | PC | Intussusception | Needs in-person evaluation | Needs in-person evaluation | my baby screams in pain then stops then screams again and th |
| 1123 | geri | ED | Ovarian Torsion | Leaking Abdominal Aortic Aneurysm | Leaking Abdominal Aortic Aneurysm, Regional Enteritis | woke up with the worst pain in my right lower belly and i fe |
| 1124 | geri | UC | Placental Abruption | Gastroenteritis | Gastroenteritis, Ectopic Pregnancy, GERD, Cholecystitis, Diverticulitis | im 32 weeks pregnant and suddenly bleeding heavy with terrib |
| 1125 | adult | PC | Tension Pneumothorax | Fracture | Fracture, Soft Tissue Injury, Rib Fracture, Traumatic Brain Injury, Concussion | chest trauma and now one side aint moving and im getting wor |
| 1126 | adult | ED | Status Epilepticus | Seizure | Seizure, Alcohol Withdrawal Seizure, New-Onset Epilepsy, Syncope, Stroke | been having seizures back to back for 20 minutes and wont st |
| 1127 | adult | UC | Addison Crisis | BPPV | BPPV, Anxiety, Vestibular neuritis, Orthostatic hypotension, Medication side effect | been on steroids and stopped now im crashing feel terrible w |
| 1128 | peds | PC | Thyroid Storm | Supraventricular Tachycardia | Supraventricular Tachycardia, Cardiac Arrhythmia, Panic Disorder, Anxiety, Meningitis | heart is racing over 150 im sweating like crazy and feel agi |
| 1129 | adult | ED | Rhabdomyolysis | Seizure | Seizure, New-Onset Epilepsy, Alcohol Withdrawal Seizure, Syncope, Hypoglycemia | did crossfit for the first time and now i cant move and my u |
| 1130 | geri | UC | Corneal Abrasion | Needs in-person evaluation | Needs in-person evaluation | got poked in the eye and now it wont stop watering and hurts |
| 1131 | geri | PC | Orbital Cellulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, Sepsis, UTI | kids eye is bulging out puffy red and he has a fever |
| 1132 | geri | ED | Temporal Arteritis | Tension headache | Tension headache, Sinusitis, Migraine, Cluster headache, Medication overuse headache | bad headache on one side of my head near my temple and it hu |
| 1133 | geri | UC | Mesenteric Ischemia | Gastroenteritis | Gastroenteritis, GERD, Cholecystitis, Diverticulitis, Appendicitis | sudden severe belly pain way worse than what the exam shows |
| 1134 | adult | PC | Subdural Hematoma | Fracture | Fracture, Soft Tissue Injury, Rib Fracture, Concussion, Traumatic Brain Injury | fell and hit my head a week ago and now im getting confused  |
| 1136 | geri | UC | Hand Foot and Mouth Disease | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | my toddler has sores in his mouth and blisters on his hands  |
| 1137 | adult | PC | Impetigo | Needs in-person evaluation | Needs in-person evaluation | these yellow crusty patches keep spreading on my childs face |
| 1138 | geri | ED | Bronchiolitis | Anaphylaxis | Anaphylaxis, Aspiration Pneumonitis, Asthma Exacerbation, Cystic Fibrosis or ciliary Dyskinesia, Anomalous left common Carotid Artery | my baby is wheezing and having trouble breathing after a col |
| 1139 | peds | UC | Atrial Fibrillation | Asthma | Asthma, Pneumonia, Pulmonary Embolism, Anxiety, Pneumothorax | heart is fluttering and skipping beats and i feel short of b |
| 1140 | adult | PC | Depression | Major Depressive Disorder | Major Depressive Disorder, Adjustment Disorder, Generalized Anxiety Disorder, Substance Use Disorder, Bipolar Disorder | i dont wanna do anything anymore feel empty and hopeless for |
| 1143 | geri | PC | Bowel Obstruction | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | stomach cramps come and go and everything is bloated and i k |
| 1144 | peds | ED | Hemorrhoids | Major Depressive Disorder | Major Depressive Disorder, Adjustment Disorder, Generalized Anxiety Disorder, Substance Use Disorder, Bipolar Disorder | bright red blood on the toilet paper when i wipe and its itc |
| 1145 | geri | UC | Hypothyroidism | Needs in-person evaluation | Needs in-person evaluation | feel sluggish all the time constipated and my skin is so dry |
| 1146 | adult | PC | Peripheral Neuropathy | Needs in-person evaluation | Needs in-person evaluation | my feet tingle and burn all the time especially at night fee |
| 1148 | geri | UC | Carpal Tunnel Syndrome | Stroke | Stroke, Guillain-Barré syndrome, Myasthenia gravis | my hand goes numb at night and i keep dropping things tingli |
| 1154 | peds | UC | Urinary Tract Infection | Needs in-person evaluation | Needs in-person evaluation | constant urge to pee and it burns every single time |
| 1157 | geri | UC | Gastroenteritis | Viral infection | Viral infection, Bacterial infection, UTI | my stomach is a mess been runnin to the toilet every hour |
| 1159 | geri | ED | Nephrolithiasis | Needs in-person evaluation | Needs in-person evaluation | worst pain of my life in my side it comes and goes and i can |
| 1161 | peds | PC | Deep Vein Thrombosis | DVT | DVT, Cellulitis, Musculoskeletal Strain, Venous Insufficiency, Baker's Cyst Rupture | pain in the back of my leg and its all swollen up after my l |
| 1166 | geri | UC | Sepsis | Viral infection | Viral infection, Meningitis, UTI, Pneumonia, Bacterial infection | feel like im dying fever chills cant think straight and so w |
| 1167 | adult | PC | Gout | Needs in-person evaluation | Needs in-person evaluation | woke up with the worst pain in my foot its swollen hot and t |
| 1168 | peds | ED | Pharyngitis | Anaphylaxis | Anaphylaxis, Esophageal Stricture, GERD, Eosinophilic Esophagitis, Achalasia | throat is on fire cant swallow and theres white spots back t |
| 1169 | peds | UC | Cellulitis | Viral infection | Viral infection, Pneumonia, Bacterial infection, UTI, Sepsis | skin on my arm is red warm and tender and the redness keeps  |
| 1171 | peds | ED | Upper Respiratory Infection | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, GERD, Peritonsillar Abscess | stuffy nose sore throat and i feel run down just a bad cold |
| 1172 | geri | UC | Pneumothorax | Musculoskeletal pain | Musculoskeletal pain, Acute Myocardial Infarction, Costochondritis, Acute Coronary Syndrome, GERD | sharp chest pain outta nowhere and now i cant take a full br |
| 1173 | geri | PC | Aortic Dissection | Acute Hemorrhage | Acute Hemorrhage, Subset of patients present with Syncope Plus another key symptom, Other Reflex Mediated Syncope causes, Carotid Sinus Syncope, Metabolic Disorders | ripping sensation in my chest going through to my back and i |
| 1175 | geri | UC | Ectopic Pregnancy | Acute Pelvic Inflammatory Disease | Acute Pelvic Inflammatory Disease, Ovarian Hyperstimulation Syndrome, Pelvic Congestion Syndrome, Bowel Obstruction, Bladder perforation | pelvic pain with some bleeding and i think i might be pregna |
| 1177 | geri | ED | Diverticulitis | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | pain in my lower left belly with fever and i been constipate |
| 1180 | adult | ED | Croup | Post-Bronchitic cough | Post-Bronchitic cough, Viral URI, Foreign Body Aspiration, Bronchitis, Fungal Lung Infection | my baby has a barking cough sounds like a seal and is having |
| 1181 | peds | UC | Otitis Media | Viral infection | Viral infection, UTI, Pneumonia, Bacterial infection, Sepsis | my kid is screamin and grabbin his ear and got a fever |
| 1182 | geri | PC | Febrile Seizure | Seizure | Seizure, New-Onset Epilepsy, Syncope, Stroke, Alcohol Withdrawal Seizure | my baby had a fever then started shaking all over and his ey |
| 1184 | adult | UC | Gastrointestinal Bleeding | BPPV | BPPV, Anxiety, Vestibular neuritis, Orthostatic hypotension, Medication side effect | theres blood in my stool bright red and i feel dizzy |
| 1185 | adult | PC | Constipation | Appendicitis | Appendicitis, Cholecystitis, Pancreatitis | cant go to the bathroom belly is hard and hurts |
| 1190 | geri | UC | Peritonsillar Abscess | Esophageal Cancer | Esophageal Cancer, Esophageal Stricture, Eosinophilic Esophagitis, GERD, Achalasia | cant swallow at all one side of my throat is huge and i soun |
| 1191 | adult | PC | Nursemaid Elbow | Needs in-person evaluation | Needs in-person evaluation | my kid is holding her arm still and cries if you try to move |
| 1192 | adult | ED | Pyloric Stenosis | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | my 3 week old baby keeps projectile vomiting after every fee |
| 1193 | peds | UC | Epiglottitis | Viral Pharyngitis | Viral Pharyngitis, Strep Pharyngitis, Infectious Mononucleosis, Bone Lesions, GERD | sore throat came on fast now my child is leaning forward dro |
| 1194 | adult | PC | Henoch-Schonlein Purpura | Systemic Lupus Erythematosus | Systemic Lupus Erythematosus, Rheumatoid Arthritis, Fibromyalgia, Sjogren Syndrome, Mixed Connective Tissue Disease | my kid has a purple rash on his legs and his belly and joint |
| 1195 | peds | ED | Slipped Capital Femoral Epiphysis | Hip Fracture | Hip Fracture, Femoral Lesion, Septic Arthritis, Anterior or Anterolateral thigh neuropathic pain, Labral Tear | my overweight teen has been complaining of hip pain and now  |
| 1197 | adult | PC | Intussusception | Viral Illness | Viral Illness, Sepsis, UTI, Dehydration, Acute Hip and Leg | my infant has episodes of screaming drawing up legs then goi |
| 1198 | geri | ED | Ovarian Torsion | Acute Gastroenteritis | Acute Gastroenteritis, Medication Induced Vomiting, Demyelinating disease, Ricin Poisoning, Bariatric Surgery | sudden horrible pain on one side of my pelvis and im throwin |
| 1199 | peds | UC | Placental Abruption | Ectopic Pregnancy | Ectopic Pregnancy | pregnant and my belly got really hard and painful and theres |

## Errors

| ID | Expected | Error |
|---|---|---|
| 700 | Acute Myocardial Infarction | "Failed to generate diagnosis. Please try again." |
| 702 | Pulmonary Embolism | "Failed to generate diagnosis. Please try again." |
| 705 | Appendicitis | "Failed to generate diagnosis. Please try again." |
| 706 | Asthma | "Failed to generate diagnosis. Please try again." |
| 708 | Migraine | "Failed to generate diagnosis. Please try again." |
| 710 | Congestive Heart Failure | "Failed to generate diagnosis. Please try again." |
| 728 | Pancreatitis | "Failed to generate diagnosis. Please try again." |
| 729 | Cholecystitis | "Failed to generate diagnosis. Please try again." |
| 736 | Benign Paroxysmal Positional Vertigo | "Failed to generate diagnosis. Please try again." |
| 767 | Sciatica | "Failed to generate diagnosis. Please try again." |
| 772 | Plantar Fasciitis | "Failed to generate diagnosis. Please try again." |
| 775 | Acute Myocardial Infarction | "Failed to generate diagnosis. Please try again." |
| 777 | Pulmonary Embolism | "Failed to generate diagnosis. Please try again." |
| 780 | Appendicitis | "Failed to generate diagnosis. Please try again." |
| 781 | Asthma | "Failed to generate diagnosis. Please try again." |
| 783 | Migraine | "Failed to generate diagnosis. Please try again." |
| 785 | Congestive Heart Failure | "Failed to generate diagnosis. Please try again." |
| 803 | Pancreatitis | "Failed to generate diagnosis. Please try again." |
| 804 | Cholecystitis | "Failed to generate diagnosis. Please try again." |
| 811 | Benign Paroxysmal Positional Vertigo | "Failed to generate diagnosis. Please try again." |
| 842 | Sciatica | "Failed to generate diagnosis. Please try again." |
| 847 | Plantar Fasciitis | "Failed to generate diagnosis. Please try again." |
| 850 | Acute Myocardial Infarction | "Failed to generate diagnosis. Please try again." |
| 852 | Pulmonary Embolism | "Failed to generate diagnosis. Please try again." |
| 855 | Appendicitis | "Failed to generate diagnosis. Please try again." |
| 856 | Asthma | "Failed to generate diagnosis. Please try again." |
| 858 | Migraine | "Failed to generate diagnosis. Please try again." |
| 860 | Congestive Heart Failure | "Failed to generate diagnosis. Please try again." |
| 878 | Pancreatitis | "Failed to generate diagnosis. Please try again." |
| 879 | Cholecystitis | "Failed to generate diagnosis. Please try again." |
| 886 | Benign Paroxysmal Positional Vertigo | "Failed to generate diagnosis. Please try again." |
| 917 | Sciatica | "Failed to generate diagnosis. Please try again." |
| 922 | Plantar Fasciitis | "Failed to generate diagnosis. Please try again." |
| 925 | Acute Myocardial Infarction | "Failed to generate diagnosis. Please try again." |
| 927 | Pulmonary Embolism | "Failed to generate diagnosis. Please try again." |
| 930 | Appendicitis | "Failed to generate diagnosis. Please try again." |
| 931 | Asthma | "Failed to generate diagnosis. Please try again." |
| 933 | Migraine | "Failed to generate diagnosis. Please try again." |
| 935 | Congestive Heart Failure | "Failed to generate diagnosis. Please try again." |
| 953 | Pancreatitis | "Failed to generate diagnosis. Please try again." |
| 954 | Cholecystitis | "Failed to generate diagnosis. Please try again." |
| 961 | Benign Paroxysmal Positional Vertigo | "Failed to generate diagnosis. Please try again." |
| 992 | Sciatica | "Failed to generate diagnosis. Please try again." |
| 997 | Plantar Fasciitis | "Failed to generate diagnosis. Please try again." |
| 1000 | Acute Myocardial Infarction | "Failed to generate diagnosis. Please try again." |
| 1002 | Pulmonary Embolism | "Failed to generate diagnosis. Please try again." |
| 1005 | Appendicitis | "Failed to generate diagnosis. Please try again." |
| 1006 | Asthma | "Failed to generate diagnosis. Please try again." |
| 1008 | Migraine | "Failed to generate diagnosis. Please try again." |
| 1010 | Congestive Heart Failure | "Failed to generate diagnosis. Please try again." |
| 1028 | Pancreatitis | "Failed to generate diagnosis. Please try again." |
| 1029 | Cholecystitis | "Failed to generate diagnosis. Please try again." |
| 1036 | Benign Paroxysmal Positional Vertigo | "Failed to generate diagnosis. Please try again." |
| 1067 | Sciatica | "Failed to generate diagnosis. Please try again." |
| 1072 | Plantar Fasciitis | "Failed to generate diagnosis. Please try again." |
| 1075 | Acute Myocardial Infarction | "Failed to generate diagnosis. Please try again." |
| 1077 | Pulmonary Embolism | "Failed to generate diagnosis. Please try again." |
| 1080 | Appendicitis | "Failed to generate diagnosis. Please try again." |
| 1081 | Asthma | "Failed to generate diagnosis. Please try again." |
| 1083 | Migraine | "Failed to generate diagnosis. Please try again." |
| 1085 | Congestive Heart Failure | "Failed to generate diagnosis. Please try again." |
| 1103 | Pancreatitis | "Failed to generate diagnosis. Please try again." |
| 1104 | Cholecystitis | "Failed to generate diagnosis. Please try again." |
| 1111 | Benign Paroxysmal Positional Vertigo | "Failed to generate diagnosis. Please try again." |
| 1142 | Sciatica | "Failed to generate diagnosis. Please try again." |
| 1147 | Plantar Fasciitis | "Failed to generate diagnosis. Please try again." |
| 1150 | Acute Myocardial Infarction | "Failed to generate diagnosis. Please try again." |
| 1152 | Pulmonary Embolism | "Failed to generate diagnosis. Please try again." |
| 1155 | Appendicitis | "Failed to generate diagnosis. Please try again." |
| 1156 | Asthma | "Failed to generate diagnosis. Please try again." |
| 1158 | Migraine | "Failed to generate diagnosis. Please try again." |
| 1160 | Congestive Heart Failure | "Failed to generate diagnosis. Please try again." |
| 1178 | Pancreatitis | "Failed to generate diagnosis. Please try again." |
| 1179 | Cholecystitis | "Failed to generate diagnosis. Please try again." |
| 1186 | Benign Paroxysmal Positional Vertigo | "Failed to generate diagnosis. Please try again." |
