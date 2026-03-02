cd C:\Users\Scott\ATTENDING
git add apps/patient-portal/lib/api/ apps/patient-portal/hooks/ apps/patient-portal/pages/api/
git commit -m "feat: API service layer + React hooks - connect patient portal to .NET backend

- lib/api/client.ts: Base HTTP client with auth, retry, offline queue, token refresh
- lib/api/patient.ts: Patient profile, medical ID, vitals, labs, meds, appointments
- lib/api/assessments.ts: COMPASS assessment CQRS flow (start/respond/advance/complete)
- lib/api/messages.ts: Conversations list, thread messages, send, mark read
- lib/api/emergency.ts: Access settings, crash config, contacts, audit log, facesheet
- lib/api/notifications.ts: In-app notifications, push token registration, preferences

- hooks/usePatientData.ts: SWR-style cached health data with auto-refresh
- hooks/useMessages.ts: Conversations + threaded messages with optimistic send
- hooks/useNotifications.ts: SignalR real-time + polling fallback
- hooks/useEmergencySettings.ts: Access/crash/contacts with localStorage fallback

- 8 new Next.js API routes: vitals, labs, medications, appointments,
  medical-id, messages/conversations, messages/[id], messages/unread,
  emergency/access-settings, emergency/crash-settings, emergency/contacts"
git push origin mockup-2
