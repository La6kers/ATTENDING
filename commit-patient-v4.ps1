# Patient Portal v4 — Wire pages to API hooks
# Run from: C:\Users\Scott\ATTENDING

cd C:\Users\Scott\ATTENDING

git add apps/patient-portal/pages/home.tsx
git add apps/patient-portal/pages/health/index.tsx
git add apps/patient-portal/pages/messages/index.tsx
git add apps/patient-portal/pages/messages/[id].tsx
git add apps/patient-portal/pages/notifications.tsx
git add apps/patient-portal/pages/emergency/index.tsx
git add apps/patient-portal/pages/emergency/medical-id.tsx
git add apps/patient-portal/pages/emergency/access-settings.tsx
git add apps/patient-portal/pages/emergency/crash-settings.tsx
git add apps/patient-portal/pages/emergency/contacts.tsx
git add apps/patient-portal/pages/emergency/history.tsx

git commit -m "feat: wire patient portal pages to API hooks — replace mock data with live data flow

Pages wired:
- home.tsx → usePatientData + useNotifications (vitals, appointments, activity feed)
- health/index.tsx → usePatientData (summary, labs, meds, appointments sections)
- messages/index.tsx → useConversations (live conversation list + unread count)
- messages/[id].tsx → useMessageThread (live thread, optimistic send, load more)
- notifications.tsx → useNotifications (real-time list, mark read, mark all read)
- emergency/index.tsx → useEmergencySettings + usePatientData (medical ID card, contacts)
- emergency/medical-id.tsx → patientApi.getMedicalID/saveMedicalID
- emergency/access-settings.tsx → useEmergencySettings (PIN, timing, visible data)
- emergency/crash-settings.tsx → useEmergencySettings (threshold, activity modes)
- emergency/contacts.tsx → useEmergencySettings (contacts CRUD)
- emergency/history.tsx → useEmergencySettings (access audit log)

Pattern: API-first with graceful fallback to demo data when API unavailable"

git push origin mockup-2
