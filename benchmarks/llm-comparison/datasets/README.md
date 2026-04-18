# External dataset downloads

These three free public datasets supplement the synthetic 600-case seed 42
harness with real patient data. Raw files are gitignored — regenerate via
the commands below.

## DDXPlus (Mila, 2022)

Synthetic dataset of ~1.3M patients across 49 pathologies, 110 symptoms,
113 antecedents, with expert differential diagnoses. We use the test split
(~134K patients) and stratified-sample 600.

```bash
cd ddxplus
curl -sL -o release_evidences.json "https://ndownloader.figshare.com/files/40495562"
curl -sL -o release_conditions.json "https://ndownloader.figshare.com/files/62657140"
curl -sL -o release_test_patients.zip "https://ndownloader.figshare.com/files/40495565"
unzip release_test_patients.zip
```

Paper: https://arxiv.org/abs/2205.09148

## NHAMCS 2019 ED (CDC)

Real ED visits from ~500 nationally-representative US hospitals. We use the
2019 public-use file (~19K visits) and theme-match RFV (reason for visit)
codes to ICD-10 primary diagnoses, then stratified-sample 300.

```bash
cd nhamcs
curl -sL -o ed2019.zip "https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Datasets/NHAMCS/ed2019.zip"
curl -sL -o ed19inp.txt "https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Dataset_Documentation/NHAMCS/sas/ed19inp.txt"
unzip ed2019.zip
```

Docs: https://www.cdc.gov/nchs/nhamcs/documentation/index.html

## MedCaseReasoning (Stanford, 2025)

14,489 open-access PMC case reports with clinician diagnostic reasoning.
We pull the test split (897 cases) via the HuggingFace datasets API and
random-sample 100.

```bash
# Via HF datasets-server (paged API):
curl -sL -o medcasereasoning/mcr-100-test.json \
  "https://datasets-server.huggingface.co/rows?dataset=zou-lab%2FMedCaseReasoning&config=default&split=test&offset=0&length=100"
```

Paper: https://arxiv.org/html/2505.11733v2
Dataset: https://huggingface.co/datasets/zou-lab/MedCaseReasoning

## Build 1000-case merged set

Once raw files are downloaded:

```bash
cd ../ingest
node ingest-ddxplus.mjs --n 600 --seed 42
node ingest-nhamcs.mjs --n 300 --seed 42
node ingest-medcase.mjs --n 100 --seed 42
node merge-1000.mjs
```

Then run:

```bash
cd ..
node run-external.mjs --limit 1000 --delay 500 --label external-v1
```

## Pending (requires credentialing)

- **MIMIC-IV-ED** — 425K Beth Israel ED admissions. Apply for PhysioNet
  credentialing (CITI training + DUA) at https://physionet.org/content/mimic-iv-ed/2.2/
