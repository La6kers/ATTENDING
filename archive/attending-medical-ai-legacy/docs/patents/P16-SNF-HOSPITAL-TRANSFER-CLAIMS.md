# Patent Application: Intelligent Skilled Nursing Facility to Hospital Transfer Documentation System

Last Updated: March 24, 2026

## TITLE OF INVENTION

System and Method for Automated Generation of Structured Clinical Transfer Documentation from Skilled Nursing Facility Records with Medication Reconciliation, Wound Assessment, and Regulatory Compliance Evaluation

## CROSS-REFERENCE TO RELATED APPLICATIONS

This application is a continuation-in-part of U.S. Patent Application No. 19/215,389 ("System and Method for Real-Time Emergency Medical Service Clinical Documentation and Hospital Pre-Arrival Notification"), which claims priority from U.S. Patent Application [P12 Serial Number] ("Emergency Clinical Data Access and Transmission Architecture"). The disclosures of each related application are incorporated herein by reference in their entireties.

## FIELD OF THE INVENTION

The present invention relates generally to healthcare information technology, and more specifically to systems and methods for automated aggregation, reconciliation, and structured transmission of clinical data from skilled nursing facilities to receiving hospitals during patient transfers, with particular application to medication administration record reconciliation, computer-vision-assisted wound assessment, infection control precaution transmission, functional status baseline documentation, regulatory compliance evaluation, and advance directive integration.

## BACKGROUND OF THE INVENTION

### The SNF Transfer Information Gap

Skilled nursing facilities (SNFs) in the United States transfer approximately 700,000 patients to acute care hospitals annually. These transfers represent one of the most dangerous information gaps in American healthcare. The Centers for Medicare & Medicaid Services (CMS) estimates that preventable readmissions from SNFs cost Medicare approximately $4.3 billion annually.

The current state of practice for SNF-to-hospital transfers involves a manual, paper-based documentation process. When a transfer is initiated — frequently during overnight hours when staffing is minimal — the responsible nurse must simultaneously manage acute patient care needs, emergency medical service coordination, and documentation assembly. The nurse must manually extract information from multiple SNF clinical data sources including:

(a) The Medication Administration Record (MAR), which for a typical SNF patient contains 12-20 medications scheduled across multiple daily time windows, with additional as-needed (PRN) medications, dose modifications, and recent changes;

(b) Nursing assessment notes documenting the patient's functional baseline, cognitive status, and recent clinical trajectory;

(c) Wound care documentation including pressure injury staging, dimensions, and treatment history;

(d) Infection control records documenting active isolation precautions, colonization status, and culture results;

(e) Advance directive documents including Physician Orders for Life-Sustaining Treatment (POLST), Do Not Resuscitate (DNR) orders, and treatment limitation specifications;

(f) Laboratory results and vital sign trends;

(g) Functional assessment scores from standardized instruments.

This manual process typically requires 30-45 minutes of nursing time. The resulting paper document is transmitted to the receiving hospital by facsimile, which frequently fails due to equipment malfunction, incorrect destination numbers, or transmission during transport such that the patient arrives before the documentation. Emergency medical service crews transporting the patient receive a verbal report of 2-5 minutes duration from a charge nurse who may have no prior relationship with the patient.

The receiving emergency department physician therefore evaluates the patient with incomplete or absent clinical information. Critical clinical questions — Is the patient's confusion acute or chronic? What is the patient's medication regimen? Is the patient colonized with multidrug-resistant organisms? What are the patient's advance directive preferences? — cannot be reliably answered from the information available at the time of presentation.

### Distinction from Prior Art

Prior patent application 19/215,389 (hereinafter "P15") addresses a related but architecturally distinct problem: the real-time documentation of emergency medical service encounters during ambulance transport. P15 captures ambient audio from emergency medical service personnel, processes natural language to extract clinical data elements, generates Situation-Background-Assessment-Recommendation (SBAR) formatted documents, and transmits structured clinical summaries to receiving emergency departments during transport.

The present invention addresses a fundamentally different clinical scenario. Where P15 operates on unstructured audio data from a brief emergency encounter, the present invention operates on extensive structured clinical records maintained over weeks, months, or years of facility-based care. Where P15 generates documentation from real-time speech, the present invention aggregates, reconciles, and transforms pre-existing structured data from multiple clinical information systems. Where P15 addresses a 4-8 minute pre-arrival window, the present invention supports transfer documentation windows ranging from minutes (emergency transfers) to days (planned transfers). Where P15 generates SBAR-formatted documents, the present invention generates INTERACT (Interventions to Reduce Acute Care Transfers) protocol-compliant documents with CMS-required field specifications.

Six specific architectural elements distinguish the present invention from P15 and all known prior art, each described in detail in the Detailed Description and claimed as dependent claims herein.

## SUMMARY OF THE INVENTION

The present invention provides a computer-implemented system and method for automated generation of structured clinical transfer documentation when a patient is transferred from a skilled nursing facility to an acute care hospital. The system ingests structured data from multiple SNF clinical data sources, including at minimum a medication administration record; generates an INTERACT-compatible structured transfer document containing reconciled clinical information; transmits the structured transfer document to a receiving hospital information system in advance of patient arrival; and receives bidirectional acknowledgment from the receiving hospital confirming document receipt and pre-arrival preparation status.

The system supports three transfer urgency modes — emergency, urgent, and planned — each with differentiated data collection requirements, document completion thresholds, and transmission timing. In emergency mode, the system prioritizes life-critical data elements and transmits an incrementally-updating document as additional data becomes available. In urgent mode, the system conducts comprehensive data collection including full medication reconciliation and wound assessment over a 2-4 hour window. In planned mode, the system enables complete clinical review and multidisciplinary coordination over 24-48 hours prior to transfer.

## DETAILED DESCRIPTION OF PREFERRED EMBODIMENTS

### System Architecture Overview

The system comprises the following principal components:

**SNF Data Ingestion Layer**: A set of data adapters configured to extract structured clinical data from SNF electronic health record systems, medication administration record systems, wound care documentation systems, infection control databases, and functional assessment instruments. The data ingestion layer normalizes extracted data into a canonical internal representation regardless of the source system's native data format.

**Clinical Reconciliation Engine**: A processing component that performs automated comparison and reconciliation of clinical data across multiple source systems, with particular emphasis on medication reconciliation between the SNF medication administration record and the receiving hospital's formulary database.

**INTERACT Document Generator**: A document assembly component that maps reconciled clinical data to the field specifications of the INTERACT (Interventions to Reduce Acute Care Transfers) version 4.0 transfer communication form, including all required and recommended fields as specified by the CMS-endorsed INTERACT quality improvement program.

**Transfer Communication Service**: A bidirectional communication component that transmits the generated transfer document to the receiving hospital's information system and receives structured acknowledgment confirming document receipt, isolation room pre-assignment status, and receiving physician identification.

**Regulatory Compliance Evaluator**: A quality analysis component that evaluates the transfer against CMS regulatory requirements, including potentially preventable readmission (PPR) diagnosis matching and INTERACT protocol compliance scoring.

### Transfer Mode Differentiation

The system implements three distinct transfer modes, each with differentiated operational characteristics:

**Emergency Mode**: Upon emergency transfer initiation, the system automatically extracts all available data from connected SNF clinical systems without manual intervention. Data elements are prioritized by clinical urgency: (1) advance directive status and code status, (2) active allergies, (3) current medications with last administration times, (4) active isolation precautions, (5) vital sign trends, (6) diagnosis and problem list. The system transmits immediately upon extraction of priority tier 1 data and continues transmitting incremental updates as additional data elements are extracted and reconciled. The receiving hospital receives a real-time updating clinical document. Estimated total documentation time: 10-15 minutes.

**Urgent Mode**: The system presents a structured data collection interface organized by INTERACT document sections. For each section, the system pre-populates fields with data extracted from SNF clinical systems and prompts the responsible nurse to verify, correct, or supplement the extracted data. Full medication administration record reconciliation is performed. Wound photography is captured and processed. Functional status scores are aggregated. The completed document is transmitted to the receiving hospital after provider review. Estimated total documentation time: 2-4 hours.

**Planned Mode**: The system enables document preparation over an extended period of 24-48 hours. All clinical data elements are extracted, reconciled, and reviewed by the responsible interdisciplinary team. The receiving hospital receives the completed document with sufficient advance time for insurance pre-authorization, bed planning, specialist coordination, and equipment preparation.

### Medication Administration Record Reconciliation

The MAR reconciliation component performs the following operations:

(a) Ingestion of the complete SNF medication administration record, including medication name (brand and generic), dose, dose unit, route of administration, frequency, scheduled administration times, PRN indication and parameters, controlled substance classification and DEA schedule, prescriber identification, start date, and current status (active, held, discontinued, pending);

(b) Extraction of recent medication administration history, including scheduled administration times, actual administration times, administering personnel identification, dose administered, and administration status (given, held, refused, omitted, late) with documented reason for non-administration;

(c) Comparison of each active SNF medication against the receiving hospital's formulary database using RxNorm Concept Unique Identifier (RXCUI) matching, with fallback to generic name matching and therapeutic class matching;

(d) Generation of a structured medication discrepancy report identifying: medications present in the SNF MAR but absent from the hospital formulary (with suggested therapeutic alternatives), medications with dose or frequency differences between the SNF regimen and standard hospital dosing protocols, potential therapeutic duplications across the combined medication list, potential drug-drug interactions between SNF medications and anticipated hospital medications, medications with recent dose changes (within 7 days) requiring particular attention, high-risk medications requiring verification (anticoagulants, insulin, opioids, immunosuppressants), and controlled substance transfer documentation requirements;

(e) Assignment of severity classification (informational, warning, critical) to each identified discrepancy based on clinical significance rules;

(f) Presentation of the discrepancy report for sequential review by nursing staff, pharmacist (for critical discrepancies), and authorizing provider, with structured resolution documentation for each discrepancy (accepted, substituted, discontinued, deferred to receiving provider).

### Wound Assessment with Computer Vision Assistance

The wound assessment component performs the following operations:

(a) Capture of clinical photograph of each documented wound using the mobile device camera of the responsible nurse, with standardized measurement reference (ruler or measurement sticker visible in frame);

(b) Processing of the captured photograph using a computer vision model trained on clinical wound images to generate an assisted staging classification for pressure injuries according to the National Pressure Injury Advisory Panel (NPIAP) staging system: Stage 1 (non-blanchable erythema of intact skin), Stage 2 (partial-thickness skin loss with exposed dermis), Stage 3 (full-thickness skin loss), Stage 4 (full-thickness skin and tissue loss with exposed fascia, muscle, tendon, ligament, cartilage, or bone), Unstageable (obscured full-thickness skin and tissue loss), and Deep Tissue Pressure Injury (persistent non-blanchable deep red, maroon, or purple discoloration);

(c) Computer-vision-assisted measurement extraction of wound dimensions (length, width, and depth in centimeters) from the photograph using the measurement reference;

(d) Generation of a structured wound assessment narrative in CMS-required documentation format, comprising: wound location (anatomical site), wound type and etiology, NPIAP stage classification, wound dimensions (L x W x D in centimeters), wound bed tissue type description (granulation, slough, eschar, mixed, epithelializing), exudate type (serous, sanguineous, serosanguineous, purulent) and amount (none, scant, moderate, copious), periwound skin condition, presence or absence of odor, undermining and tunneling if present (location by clock position and depth), current treatment regimen, and Braden Scale score with subscores (sensory perception, moisture, activity, mobility, nutrition, friction/shear);

(e) Inclusion of the structured wound assessment as a discrete section in the transfer document, enabling the receiving hospital wound care team to establish the wound baseline prior to patient arrival.

### Isolation Precaution Transfer with Organism Specificity

The isolation precaution component performs the following operations:

(a) Ingestion of the SNF infection control records, including active isolation precaution orders, causative organism identification, culture source and date, antibiotic susceptibility data, precaution type (contact, droplet, airborne, contact-plus, enteric, neutropenic/reverse), personal protective equipment requirements, and room requirements (private, negative pressure, anteroom);

(b) Extraction and structuring of active isolation precautions with the following discrete fields: precaution type, causative organism name and code (SNOMED CT or ICD-10-CM), most recent culture date and source, current antibiotic susceptibility pattern, and clearance criteria;

(c) Transmission of isolation precaution data as a structured field in the transfer document, transmitted as a priority data element in emergency mode, arriving at the receiving hospital before the patient;

(d) Integration with the receiving hospital's bed management system to enable pre-arrival isolation room assignment based on the specific precaution type and room requirements transmitted.

### Functional Status Structured Scoring

The functional status component performs the following operations:

(a) Ingestion of functional status assessment scores from the SNF clinical record, including standardized instruments: Barthel Index of Activities of Daily Living (scoring 0-100, with subscores for feeding, bathing, grooming, dressing, bowel control, bladder control, toileting, chair transfer, ambulation, and stair climbing), Katz Index of Independence in Activities of Daily Living (scoring 0-6, with binary assessments for bathing, dressing, toileting, transferring, continence, and feeding), Morse Fall Scale (scoring 0-125, with subscores for history of falling, secondary diagnosis, ambulatory aid, IV therapy/heparin lock, gait, and mental status), and Minimum Data Set (MDS) 3.0 Section GG Functional Abilities and Goals (self-care and mobility performance scores);

(b) Aggregation of multiple instrument scores into a unified functional status profile comprising: overall dependency level interpretation, mobility status and assistive device requirements, weight-bearing status, transfer assistance level (independent, standby assist, minimum assist, moderate assist, maximum assist, dependent), cognitive status assessment, and specific ADL dependency profile;

(c) Inclusion of the functional status profile as discrete structured fields in the transfer document, enabling the receiving hospital to establish the patient's pre-transfer functional baseline and distinguish acute changes from chronic deficits.

### INTERACT Protocol Compliance

The INTERACT compliance component performs the following operations:

(a) Mapping of all extracted and reconciled clinical data to the specific field requirements of the INTERACT version 4.0 Transfer Communication form, including: early warning signs documented, change in condition description, interventions attempted before transfer decision (with timestamps), physician notification time and response, family/responsible party notification time, transfer decision rationale, and specific clinical data sections as enumerated in the INTERACT field specification;

(b) Validation of document completeness against INTERACT required field specifications, with identification of any missing required fields and prompting for completion;

(c) Generation of an INTERACT compliance score indicating the percentage of required and recommended fields completed, for quality reporting purposes;

(d) Formatting of the completed document in INTERACT-specified section order and field labeling conventions, suitable for submission to CMS quality measurement programs and state survey readiness.

### Potentially Preventable Readmission Flagging

The PPR evaluation component performs the following operations:

(a) Comparison of the transfer reason (primary diagnosis or presenting complaint) against the CMS Potentially Preventable Readmission diagnosis list, which includes but is not limited to: pneumonia, urinary tract infection, dehydration, congestive heart failure exacerbation, chronic obstructive pulmonary disease exacerbation, wound infection, sepsis secondary to urinary or respiratory source, and electrolyte imbalance;

(b) Evaluation of the patient's transfer history within the preceding 30-day window to determine whether this transfer would constitute a readmission for PPR measurement purposes;

(c) Generation of a structured quality flag when the transfer reason matches a PPR diagnosis category, including: the specific PPR category matched, the patient's 30-day transfer history, the time elapsed since SNF admission or most recent hospital discharge, and relevant clinical indicators;

(d) Routing of the PPR quality flag to the SNF medical director and quality department for concurrent review, enabling real-time quality intervention and documentation of medical necessity for transfers that match PPR criteria but are clinically appropriate;

(e) Aggregation of PPR flag data for facility-level quality reporting and CMS Quality Reporting Program compliance.

### POLST and Advance Directive Integration

The advance directive component performs the following operations:

(a) Automated extraction of advance directive status from the SNF clinical record, including: document type (POLST, MOLST, Advance Directive, DNR Order, Living Will), code status (Full Code, DNR, DNR/DNI, Comfort Measures Only, Limited Interventions), specific treatment limitation instructions for intubation, dialysis, antibiotics, artificial nutrition, and hospitalization, document effective date and expiration date if applicable, and verification status (date and personnel who last verified the directive);

(b) For SNF records containing scanned advance directive documents rather than structured data, processing of the scanned document image using optical character recognition and natural language processing to extract the structured fields enumerated above;

(c) Placement of advance directive information as the first section of the transfer document, ensuring that the receiving hospital emergency department has immediate access to the patient's treatment preferences before initiating any interventions;

(d) Generation of a visual indicator when advance directive status has not been verified within 90 days, prompting the transferring nurse to re-verify with the patient or responsible party before transfer if clinical conditions permit.

## CLAIMS

### Independent Claims

**Claim 1.** A computer-implemented system for generating structured clinical transfer documentation for patient transfers from a skilled nursing facility to an acute care hospital, the system comprising:

a data ingestion layer configured to extract structured clinical data from a plurality of skilled nursing facility clinical data sources, the plurality of clinical data sources comprising at least a medication administration record system, a nursing assessment documentation system, and an advance directive record;

a clinical reconciliation engine configured to perform automated comparison and reconciliation of clinical data extracted from the plurality of skilled nursing facility clinical data sources, comprising at least medication reconciliation between a skilled nursing facility medication administration record and a receiving hospital formulary database;

an INTERACT document generator configured to map reconciled clinical data to the field specifications of the INTERACT (Interventions to Reduce Acute Care Transfers) transfer communication form, generating a structured transfer document comprising reconciled clinical information organized in INTERACT-specified sections;

a transfer communication service configured to transmit the structured transfer document to a receiving hospital information system in advance of patient arrival at the receiving hospital; and

a bidirectional acknowledgment component configured to receive structured confirmation from the receiving hospital information system indicating document receipt and pre-arrival preparation status.

**Claim 2.** A computer-implemented method for generating structured clinical transfer documentation for patient transfers from a skilled nursing facility to an acute care hospital, the method comprising:

extracting structured clinical data from a plurality of skilled nursing facility clinical data sources, the plurality of clinical data sources comprising at least a medication administration record system, a nursing assessment documentation system, and an advance directive record;

performing automated comparison and reconciliation of clinical data extracted from the plurality of skilled nursing facility clinical data sources, comprising at least medication reconciliation between a skilled nursing facility medication administration record and a receiving hospital formulary database;

mapping reconciled clinical data to the field specifications of the INTERACT (Interventions to Reduce Acute Care Transfers) transfer communication form, generating a structured transfer document comprising reconciled clinical information organized in INTERACT-specified sections;

transmitting the structured transfer document to a receiving hospital information system in advance of patient arrival at the receiving hospital; and

receiving structured confirmation from the receiving hospital information system indicating document receipt and pre-arrival preparation status.

**Claim 3.** A non-transitory computer-readable storage medium storing instructions that, when executed by one or more processors, cause the one or more processors to perform operations comprising:

extracting structured clinical data from a plurality of skilled nursing facility clinical data sources, the plurality of clinical data sources comprising at least a medication administration record system, a nursing assessment documentation system, and an advance directive record;

performing automated comparison and reconciliation of clinical data extracted from the plurality of skilled nursing facility clinical data sources, comprising at least medication reconciliation between a skilled nursing facility medication administration record and a receiving hospital formulary database;

mapping reconciled clinical data to the field specifications of the INTERACT (Interventions to Reduce Acute Care Transfers) transfer communication form, generating a structured transfer document comprising reconciled clinical information organized in INTERACT-specified sections;

transmitting the structured transfer document to a receiving hospital information system in advance of patient arrival at the receiving hospital; and

receiving structured confirmation from the receiving hospital information system indicating document receipt and pre-arrival preparation status.

### Dependent Claims — Novel Architectural Elements

**Claim 4.** The system of Claim 1, wherein the clinical reconciliation engine is further configured to perform medication administration record reconciliation comprising:

ingesting a complete medication administration record from the skilled nursing facility, the medication administration record comprising for each medication entry: medication name, dose, dose unit, route of administration, frequency, scheduled administration times, as-needed indication and parameters, controlled substance classification, prescriber identification, start date, current administration status, and recent administration history including actual administration times and non-administration reasons;

comparing each active medication entry in the medication administration record against the receiving hospital formulary database using at least RxNorm Concept Unique Identifier matching;

generating a structured medication discrepancy report identifying at least: medications present in the skilled nursing facility medication administration record but absent from the receiving hospital formulary with suggested therapeutic alternatives, potential therapeutic duplications, potential drug-drug interactions, medications with dose changes within a preceding seven-day period, and high-risk medications requiring verification; and

assigning a severity classification selected from informational, warning, and critical to each identified medication discrepancy.

**Claim 5.** The system of Claim 1, further comprising a wound assessment component configured to:

receive a clinical photograph of a wound captured by a mobile device camera;

process the clinical photograph using a computer vision model to generate an assisted pressure injury staging classification according to the National Pressure Injury Advisory Panel staging system, the staging classification selected from Stage 1, Stage 2, Stage 3, Stage 4, Unstageable, and Deep Tissue Pressure Injury;

extract wound dimension measurements comprising length, width, and depth in centimeters from the clinical photograph using a measurement reference visible in the photograph;

generate a structured wound assessment narrative comprising wound location, wound type, staging classification, wound dimensions, wound bed tissue type description, exudate type and amount, periwound skin condition, presence or absence of odor, and current treatment regimen; and

include the structured wound assessment narrative as a discrete section in the structured transfer document.

**Claim 6.** The system of Claim 1, further comprising an isolation precaution component configured to:

ingest infection control records from the skilled nursing facility, the infection control records comprising active isolation precaution orders with causative organism identification, culture source and date, and antibiotic susceptibility data;

extract and structure active isolation precautions comprising: precaution type selected from at least contact, droplet, airborne, contact-plus, enteric, and neutropenic reverse isolation; causative organism name and standardized code; most recent culture date and specimen source; and personal protective equipment requirements;

transmit the structured isolation precaution data as a priority data element in the transfer document in advance of patient arrival; and

communicate room isolation requirements to the receiving hospital to enable pre-arrival isolation room assignment based on the specific precaution type and room requirements.

**Claim 7.** The system of Claim 1, further comprising a functional status component configured to:

ingest functional status assessment scores from the skilled nursing facility clinical record, the assessment scores comprising scores from at least two standardized functional assessment instruments selected from: Barthel Index of Activities of Daily Living, Katz Index of Independence in Activities of Daily Living, Morse Fall Scale, and Minimum Data Set 3.0 Section GG Functional Abilities and Goals;

aggregate the plurality of functional assessment instrument scores into a unified functional status profile comprising at least: overall dependency level interpretation, mobility status and assistive device requirements, transfer assistance level, cognitive status assessment, and specific activities of daily living dependency profile; and

include the unified functional status profile as discrete structured fields in the transfer document, enabling the receiving hospital to establish the patient's pre-transfer functional baseline.

**Claim 8.** The system of Claim 1, further comprising a regulatory compliance evaluator configured to:

compare a transfer reason associated with the patient transfer against a CMS potentially preventable readmission diagnosis list comprising at least pneumonia, urinary tract infection, dehydration, congestive heart failure exacerbation, and wound infection;

evaluate the patient's transfer history within a preceding thirty-day window;

generate a structured quality flag when the transfer reason matches a potentially preventable readmission diagnosis category, the quality flag comprising: the specific diagnosis category matched, the patient's thirty-day transfer history, and time elapsed since the most recent hospital discharge; and

route the quality flag to at least the skilled nursing facility medical director for concurrent quality review.

**Claim 9.** The system of Claim 1, further comprising an advance directive component configured to:

extract advance directive status from the skilled nursing facility clinical record, the advance directive status comprising at least: document type, code status selected from at least full code, do not resuscitate, do not resuscitate and do not intubate, comfort measures only, and limited interventions, and specific treatment limitation instructions;

for skilled nursing facility records containing scanned advance directive documents, process the scanned document image using optical character recognition and natural language processing to extract structured advance directive fields;

place the advance directive information as a first section of the structured transfer document; and

generate a verification indicator when the advance directive status has not been verified within a preceding ninety-day period.

### Dependent Claims — System Features

**Claim 10.** The system of Claim 1, wherein the system is configured to operate in a plurality of transfer urgency modes comprising:

an emergency mode in which the data ingestion layer automatically extracts available data from the plurality of skilled nursing facility clinical data sources without manual intervention, prioritizes data elements by clinical urgency, and the transfer communication service transmits an incrementally-updating document beginning upon extraction of highest-priority data elements;

an urgent mode in which the system presents a structured data collection interface organized by INTERACT document sections, performs full medication administration record reconciliation, and transmits a completed document after provider review; and

a planned mode in which the system enables document preparation over an extended period, with the completed document transmitted to the receiving hospital with sufficient advance time for pre-authorization, bed planning, and specialist coordination.

**Claim 11.** The system of Claim 1, wherein the bidirectional acknowledgment component is further configured to receive structured receipt confirmation from the receiving hospital information system comprising at least: document receipt timestamp, receiving physician identification, isolation room pre-assignment status when isolation precautions are indicated, and estimated time to patient evaluation readiness.

**Claim 12.** The system of Claim 1, further comprising a real-time status tracking component configured to:

maintain a transfer status record comprising at least: transfer initiation time, data collection completion status for each INTERACT document section, document transmission time, hospital acknowledgment receipt time, patient departure time, and patient arrival time; and

transmit status updates to authorized users at both the sending skilled nursing facility and the receiving hospital via push notification.

## ABSTRACT

A computer-implemented system and method for automated generation of structured clinical transfer documentation when a patient is transferred from a skilled nursing facility (SNF) to an acute care hospital. The system ingests structured clinical data from multiple SNF data sources including medication administration records, nursing assessments, wound documentation, infection control records, functional status assessments, and advance directives. A clinical reconciliation engine performs automated medication reconciliation between the SNF medication administration record and the receiving hospital formulary. An INTERACT document generator maps reconciled data to CMS-endorsed INTERACT transfer communication form specifications. The system transmits the completed document to the receiving hospital before patient arrival and receives bidirectional acknowledgment. Novel features include computer-vision-assisted wound staging with CMS-compliant narrative generation, isolation precaution transmission with organism specificity enabling pre-arrival room assignment, aggregated functional status scoring from multiple standardized instruments, potentially preventable readmission flagging against CMS diagnosis lists, and advance directive extraction with automated verification status tracking. The system supports emergency, urgent, and planned transfer modes with differentiated data collection requirements and transmission timing.
