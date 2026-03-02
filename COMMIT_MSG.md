feat: wire all ordering pages to real patient data, fix navigation bug

CRITICAL BUG FIX — PreVisitSummary quick action buttons:
- PreVisitSummary accepted onOrderLabs/onOrderImaging/onPrescribe/onRefer
  callbacks but NEVER used them — QuickActionButtons hardcoded href links
  with ONLY patientId, missing assessmentId and chiefComplaint
- previsit/[id].tsx properly passed callbacks with full params, but they
  were ignored because the component destructured and discarded them
- FIX: Quick action buttons now use onClick callbacks when provided,
  falling back to href-only links as a default (defensive)
- Result: Clicking "Order Labs" from previsit now navigates with
  /labs?patientId=X&assessmentId=Y&chiefComplaint=Z instead of just
  /labs?patientId=X

SHARED UTILITY (new):
- lib/fetchPatientContext.ts: DRY patient+assessment parallel fetcher
  Used by all 4 ordering pages (labs, imaging, medications, referrals)

LABS PAGE — refactored to shared utility:
- labs.tsx: replaced 70-line inline fetchPatientContext with shared import

IMAGING PAGE — wired to real data:
- imaging.tsx: reads patientId, assessmentId, chiefComplaint from URL

REFERRALS PAGE — wired to real data:
- referrals.tsx: reads patientId, assessmentId from URL
  Maps allergyNames for string[] store type
  Removed fake encounterId 'enc-001' fallback

MEDICATIONS PAGE — wired to real patient data:
- medications.tsx: patient card shows real patient from URL params
  Prescriptions + pharmacies remain mock (requires pharmacy API)

REFERRAL ORDERING PANEL — runtime crash fix:
- ReferralOrderingPanel.tsx: loadAIRecommendations → generateAIRecommendations

VERIFICATION — all clean:
  ✅ No remaining Map<string references
  ✅ No remaining loadAIRecommendations calls  
  ✅ No remaining fake encounterId fallbacks
  ✅ PreVisitSummary callbacks properly wired to quick action buttons

END-TO-END NAVIGATION FLOW:
  Dashboard → Patient Queue → /previsit/[id]
    → "Order Labs"       → /labs?patientId=X&assessmentId=Y&chiefComplaint=Z ✅
    → "Order Imaging"    → /imaging?patientId=X&assessmentId=Y ✅
    → "E-Prescribe"      → /medications?patientId=X&assessmentId=Y ✅
    → "Refer Specialist" → /referrals?patientId=X&assessmentId=Y ✅

FILES:
  NEW:  apps/provider-portal/lib/fetchPatientContext.ts
  MOD:  apps/provider-portal/pages/labs.tsx
  MOD:  apps/provider-portal/pages/imaging.tsx
  MOD:  apps/provider-portal/pages/referrals.tsx
  MOD:  apps/provider-portal/pages/medications.tsx
  MOD:  apps/provider-portal/components/previsit/PreVisitSummary.tsx
  MOD:  apps/provider-portal/components/referral-ordering/ReferralOrderingPanel.tsx
