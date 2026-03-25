# ATTENDING AI - Clinical Workflow Documentation

## Complete Provider Workflow

This document describes the full clinical workflow implemented in the ATTENDING AI Provider Portal.

---

## Workflow Overview

```
┌─────────────────┐
│     Login       │
│  /auth/signin   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Dashboard    │
│       /         │ ◄──────────────────────────────┐
└────────┬────────┘                                │
         │                                          │
         ▼                                          │
┌─────────────────┐                                │
│     Inbox       │                                │
│     /inbox      │                                │
└────────┬────────┘                                │
         │ Click Patient                           │
         ▼                                          │
┌─────────────────┐                                │
│   Pre-Visit     │                                │
│  /previsit/[id] │                                │
└────────┬────────┘                                │
         │ "Start Visit"                           │
         ▼                                          │
┌─────────────────┐                                │
│   Diagnosis     │                                │
│  Selection      │                                │
│  /visit/[id]    │                                │
└────────┬────────┘                                │
         │ "Select Diagnosis & Move to Treatment"  │
         ▼                                          │
┌─────────────────┐                                │
│   Treatment     │                                │
│   Planning      │                                │
│/visit/[id]/treatment│                            │
└────────┬────────┘                                │
         │ "Execute Treatment Plan"                │
         ▼                                          │
┌─────────────────┐                                │
│  Note & Billing │                                │
│   Summary       │                                │
│/visit/[id]/complete│                             │
└────────┬────────┘                                │
         │ "Complete Visit & Sign Note"            │
         ▼                                          │
    Success Modal ─────────────────────────────────┘
    (Dashboard or Next Patient)
```

---

## Page Descriptions

### 1. Login Page (`/auth/signin`)
- Purple gradient background
- Dev login buttons for Provider, Nurse, Admin
- Credentials: provider@attending.dev / password

### 2. Dashboard (`/`)
- Purple gradient background matching login
- Welcome message with provider name
- Stats cards: Pending Assessments, Patients Today, Unread Messages, Completed Visits
- Quick Actions: Inbox, Labs, Imaging, Medications
- Patient Queue with urgency badges
- AI Insights banner

### 3. Provider Inbox (`/inbox`)
- Central hub for all patient items
- Categories: Encounters, Phone Calls, Charts, Messages, Refills, Labs, Imaging, Incomplete
- Click patient to expand → "Open Pre-Visit" button
- Real-time updates from COMPASS assessments

### 4. Pre-Visit Summary (`/previsit/[id]`)
- Comprehensive patient information before visit
- Chief Complaint with patient quote
- Vitals with status indicators
- Medications and allergies
- Risk Assessment with AI-generated flags
- Action Items with priority levels
- Critical alerts for red flags
- **"Start Visit" button** → Navigates to Diagnosis Selection

### 5. Diagnosis Selection (`/visit/[id]`)
**STEP 1 OF 3**

Features:
- AI Differential Diagnosis list with probabilities
- Select/deselect diagnoses using checkboxes
- Each diagnosis shows:
  - ICD-10 code
  - Category badge (PRIMARY, RULE OUT, SECONDARY)
  - Probability percentage bar
  - Supporting evidence (expandable)
  - Clinical concerns
- **Guidelines Button** for each diagnosis → Opens modal with:
  - Overview
  - Diagnostic Criteria
  - Red Flags
  - Workup recommendations
  - Treatment options
  - References

Patient context sidebar:
- Chief Complaint
- Red Flags alert
- HPI Summary
- Vital Signs
- Allergies

**"Select Diagnosis & Move to Treatment"** → Navigates to Treatment Page

### 6. Treatment Planning (`/visit/[id]/treatment`)
**STEP 2 OF 3**

Treatment categories:
- **Medications** (First-line, Second-line, Adjunctive)
  - Sumatriptan, Rizatriptan, Metoclopramide, etc.
  - Insurance coverage badges
  - FDA approval badges
  - Contraindications & interactions warnings
- **Laboratory Studies**
  - CBC, BMP, Pregnancy Test, etc.
- **Imaging Studies**
  - CT Head, MRI Brain
- **Follow-up & Referrals**
  - Follow-up appointments
  - Headache journal
  - Neurology consultation

Sidebar shows:
- Working Diagnoses (from previous step)
- Patient Allergies
- Order Summary with counts

**"Execute Treatment Plan"** → Navigates to Note & Billing

### 7. Note & Billing Summary (`/visit/[id]/complete`)
**STEP 3 OF 3**

Left sidebar:
- **Billing Codes**
  - ICD-10 diagnosis codes (selectable)
  - E&M level (99214, etc.)
  - CPT procedure codes
  - Estimated total
- **Visit Summary**
  - Patient info
  - Date
  - Count of diagnoses, medications, labs, imaging

Main area:
- **AI-Generated Clinical Note**
  - Full medical documentation
  - Patient information
  - Chief complaint
  - HPI
  - Vital signs
  - Allergies
  - Assessment/Diagnosis
  - Plan (medications, labs, imaging, follow-up)
  - Return precautions
  - Attestation
- Edit/Preview toggle
- Copy to clipboard
- Print/Export buttons

**"Complete Visit & Sign Note"** → Shows Success Modal

### 8. Success Modal
- Confirmation of completed visit
- Summary: Note signed, billing submitted, orders sent
- Two options:
  - **Dashboard** → Return to main dashboard
  - **Next Patient** → Go to inbox for next patient

---

## Theme Consistency

All pages use the purple gradient theme:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

Purple color palette:
- purple-50: #faf5ff
- purple-100: #ede9fe
- purple-500: #8b5cf6
- purple-600: #7c3aed
- purple-700: #6d28d9

---

## Data Flow

1. **Pre-Visit** → Patient context stored
2. **Diagnosis Selection** → Selected diagnoses stored in sessionStorage
3. **Treatment Planning** → Selected treatments stored in sessionStorage
4. **Note & Billing** → All data combined for documentation
5. **Complete** → sessionStorage cleared, workflow reset

---

## Testing the Flow

1. Start provider portal: `cd apps/provider-portal && npm run dev`
2. Go to http://localhost:3002
3. Login as Provider
4. Click any patient in the queue or go to Inbox
5. Click a patient → "Open Pre-Visit"
6. Review pre-visit info → Click "Start Visit"
7. Select diagnoses → Click "Select Diagnosis & Move to Treatment"
8. Select treatments → Click "Execute Treatment Plan"
9. Review note and billing → Click "Complete Visit & Sign Note"
10. Choose "Dashboard" or "Next Patient"

---

## Files Created/Modified

### New Pages
- `/pages/visit/[id]/index.tsx` - Diagnosis selection
- `/pages/visit/[id]/treatment.tsx` - Treatment planning
- `/pages/visit/[id]/complete.tsx` - Note & billing

### Modified Pages
- `/pages/index.tsx` - Dashboard with purple gradient
- `/pages/previsit/[id].tsx` - Start Visit navigates to /visit/[id]
- `/components/inbox/ExpandedPanel.tsx` - "Open Pre-Visit" button

### Deleted/Deprecated
- `/pages/patients/[id].tsx` - Replaced by previsit flow

---

## Version
Date: January 27, 2026
Documentation for ATTENDING AI Provider Portal Clinical Workflow
