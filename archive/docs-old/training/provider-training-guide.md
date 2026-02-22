# ATTENDING AI - Provider Training Guide

## Quick Start for Healthcare Providers

**Version:** 1.0  
**Last Updated:** January 2026  
**Support:** support@attending.ai | 1-555-ATTEND1

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Patient Assessment Review](#patient-assessment-review)
4. [Order Entry](#order-entry)
5. [AI-Powered Features](#ai-powered-features)
6. [Emergency Protocols](#emergency-protocols)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## 1. Getting Started

### Logging In

1. Navigate to **https://provider.attending.ai**
2. Click **"Sign in with Organization Account"**
3. Enter your clinic credentials
4. Complete two-factor authentication (if enabled)

### First-Time Setup

Upon first login, you'll be prompted to:
- Verify your NPI number
- Set notification preferences
- Configure alert sounds
- Review the HIPAA acknowledgment

### Session Information

- Sessions automatically extend while active
- Maximum session duration: **8 hours** (aligned with clinical shifts)
- You'll receive a 15-minute warning before session expiration
- All actions are logged for HIPAA compliance

---

## 2. Dashboard Overview

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ATTENDING AI          [Search] [Notifications] [Profile]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │  PATIENT QUEUE      │  │  TODAY'S METRICS            │  │
│  │  ──────────────     │  │  ────────────────           │  │
│  │  🔴 CRITICAL (2)    │  │  Patients Seen: 12          │  │
│  │  🟠 URGENT (5)      │  │  Avg Wait Time: 8 min       │  │
│  │  🟢 ROUTINE (8)     │  │  Assessments: 15            │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  RECENT ASSESSMENTS                                    │ │
│  │  ─────────────────                                    │ │
│  │  • John Anderson - Chest pain - 🔴 CRITICAL           │ │
│  │  • Mary Johnson - SOB, wheezing - 🟠 URGENT           │ │
│  │  • Robert Williams - Follow-up - 🟢 ROUTINE           │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Priority Queue Colors

| Color | Priority | Meaning | Expected Response |
|-------|----------|---------|-------------------|
| 🔴 Red | CRITICAL | Life-threatening symptoms detected | Immediate (< 5 min) |
| 🟠 Orange | URGENT | Concerning symptoms requiring prompt attention | < 15 minutes |
| 🟡 Yellow | MODERATE | Symptoms needing same-day evaluation | < 30 minutes |
| 🟢 Green | ROUTINE | Non-urgent, scheduled follow-ups | As scheduled |

### Real-Time Alerts

- **Audio alerts** sound for CRITICAL patients
- **Browser notifications** appear for URGENT patients
- Click any alert to jump directly to that patient

---

## 3. Patient Assessment Review

### Opening an Assessment

1. Click a patient from the queue
2. Review the **AI-Generated Summary**:
   - Chief complaint
   - Symptom timeline
   - Red flags detected
   - Vital signs

### Understanding AI Confidence Levels

| Confidence | Meaning | Action |
|------------|---------|--------|
| **HIGH** (80%+) | Strong supporting evidence | Consider as primary differential |
| **MEDIUM** (50-79%) | Moderate evidence | Include in workup |
| **LOW** (< 50%) | Limited evidence | Consider if initial workup negative |

### Reviewing COMPASS Data

The patient completed their assessment via COMPASS (our patient-facing app). You can see:

- **Symptoms Reported**: Free-text and structured responses
- **Photos Attached**: Click to enlarge (if patient uploaded images)
- **Voice Notes**: Play button to listen to patient's description
- **Timeline**: When symptoms started, progression, what makes it better/worse

---

## 4. Order Entry

### Lab Orders

1. From the patient view, click **"Order Labs"**
2. Review **AI Recommendations** based on clinical presentation
3. Select tests individually or by panel
4. Set priority: **STAT**, **Urgent**, or **Routine**
5. Add clinical indication (required)
6. Click **"Submit Order"**

### Imaging Orders

1. Click **"Order Imaging"**
2. Select modality (X-ray, CT, MRI, Ultrasound)
3. Select body region
4. Review AI suggestions for appropriate studies
5. Note any contraindications (contrast allergy, pregnancy, implants)
6. Add clinical indication
7. Submit order

### Medication Orders

1. Click **"Prescribe Medication"**
2. Search by name or browse categories
3. System automatically checks:
   - **Drug interactions** with current medications
   - **Allergy alerts** (including cross-reactivity)
   - **Dose appropriateness** for age/weight/renal function
4. Adjust dose if needed
5. Add directions and quantity
6. E-prescribe or print

### Referrals

1. Click **"Create Referral"**
2. Select specialty
3. View AI-recommended specialists based on:
   - Clinical presentation
   - Location
   - Insurance
   - Availability
4. Select provider
5. Add reason for referral and relevant history
6. Set urgency level
7. Submit referral

---

## 5. AI-Powered Features

### Differential Diagnosis

The AI generates differential diagnoses based on:
- Patient demographics (age, gender)
- Symptoms and their characteristics
- Medical history
- Current medications
- Vital signs

**"Must Not Miss" diagnoses** are flagged with ⚠️ — these are serious conditions that should be ruled out even if probability is lower.

### How to Use AI Recommendations

1. **Review, don't just accept** — AI is a decision support tool
2. **Consider the clinical context** — you know things the AI doesn't
3. **Provide feedback** — click 👍 or 👎 to improve future recommendations
4. **Document your reasoning** — especially if you disagree with AI

### Providing AI Feedback

After each encounter, you can rate the AI's recommendations:

- **Accurate** — AI suggestions were clinically appropriate
- **Partially Accurate** — Some suggestions helpful, some not
- **Inaccurate** — AI missed the diagnosis or suggested wrong tests
- **Missed Important** — AI failed to flag a critical finding

Your feedback helps improve the AI for everyone.

---

## 6. Emergency Protocols

### When Red Flags Are Detected

1. **Audio alert sounds** — distinctive three-tone chime
2. **Patient moves to top of queue** with red indicator
3. **Emergency protocol button appears** — one-click access to:
   - Activate 911
   - Alert clinic staff
   - Start timer
   - Document interventions

### Critical Conditions Detected

ATTENDING AI detects these emergency patterns:
- Acute coronary syndrome (chest pain + risk factors)
- Stroke (sudden neuro deficits, FAST criteria)
- Pulmonary embolism (SOB + risk factors)
- Anaphylaxis (allergen exposure + respiratory distress)
- Sepsis (fever + vital sign abnormalities)
- Suicidal ideation (direct statements or concerning language)

### Emergency Actions

1. Click **"Emergency Protocol"**
2. Select the protocol to activate
3. Follow guided checklist
4. All actions are timestamped for documentation
5. Click **"Complete Protocol"** when resolved

---

## 7. Best Practices

### Workflow Tips

1. **Start each shift** by reviewing your queue
2. **Address CRITICAL patients first** — always
3. **Use AI recommendations** as a starting point, not final answer
4. **Complete documentation** before moving to next patient
5. **Provide AI feedback** — it takes 2 seconds and improves the system

### Documentation

- ATTENDING auto-generates documentation drafts
- Review and edit before signing
- Add physical exam findings
- Include your clinical reasoning
- Sign and lock the note

### Communication with Patients

When patients ask about the AI:
- "Your assessment was reviewed by our clinical AI to help identify any urgent concerns"
- "The AI helps us work more efficiently so we can spend more time with you"
- "All clinical decisions are made by your healthcare provider, not the AI"

### Privacy & Security

- Never share your login credentials
- Log out when stepping away
- Report any suspicious activity
- Remember: all actions are logged

---

## 8. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Can't log in | Check caps lock, try password reset |
| No audio alerts | Check browser permissions, system volume |
| Patient not in queue | Check filters, refresh page |
| AI not generating recommendations | May be processing; wait 10 seconds |
| Order not submitting | Check required fields, internet connection |

### Getting Help

- **In-app support**: Click the **?** icon in the bottom-right corner
- **Phone support**: 1-555-ATTEND1 (24/7)
- **Email**: support@attending.ai
- **Urgent issues**: Call the support hotline

### Reporting Bugs

If something isn't working correctly:
1. Click **"Report Issue"** in the help menu
2. Describe what happened
3. Include the patient ID (if applicable)
4. A screenshot is automatically captured
5. Submit — our team will investigate

---

## Quick Reference Card

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick search |
| `Ctrl/Cmd + N` | New order |
| `Ctrl/Cmd + S` | Save note |
| `Esc` | Close modal/dialog |
| `?` | Open help |

### Priority Response Times

| Priority | Response Target |
|----------|-----------------|
| CRITICAL | < 5 minutes |
| URGENT | < 15 minutes |
| MODERATE | < 30 minutes |
| ROUTINE | As scheduled |

### Support Contacts

- **Technical Support**: 1-555-ATTEND1
- **Clinical Questions**: clinicalsupport@attending.ai
- **Billing**: billing@attending.ai

---

## Training Checklist

Before going live, ensure you have:

- [ ] Logged in successfully
- [ ] Reviewed a sample patient assessment
- [ ] Placed a test lab order
- [ ] Placed a test imaging order
- [ ] Reviewed AI differential diagnosis
- [ ] Provided AI feedback
- [ ] Tested emergency alert
- [ ] Located the help resources

---

*Thank you for choosing ATTENDING AI. Together, we're transforming rural healthcare.*

**Questions?** Contact your clinic administrator or reach out to our support team.
