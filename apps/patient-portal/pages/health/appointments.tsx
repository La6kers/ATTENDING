// ============================================================
// ATTENDING AI — Appointments Page
// apps/patient-portal/pages/health/appointments.tsx
//
// Placeholder for appointment scheduling. Displays upcoming
// appointments and explains that online scheduling requires
// provider integration.
// ============================================================

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Phone,
  Mail,
  ChevronLeft,
  Settings2,
  AlertCircle,
  Video,
  MapPin,
  Building2,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';

const UPCOMING = [
  {
    id: 'appt-1',
    provider: 'Dr. Sarah Chen',
    specialty: 'Primary Care — Annual Physical',
    date: '2026-03-18',
    time: '9:30 AM',
    type: 'in-person' as const,
    location: 'Parker Family Medicine',
    address: '18551 Ponderosa Dr, Parker, CO',
    phone: '(303) 555-0142',
  },
  {
    id: 'appt-2',
    provider: 'Dr. Michael Ruiz',
    specialty: 'Cardiology — Follow-up',
    date: '2026-04-02',
    time: '2:00 PM',
    type: 'telehealth' as const,
    location: 'Colorado Cardiology Associates',
    address: '',
    phone: '(303) 555-0198',
  },
];

export default function AppointmentsPage() {
  return (
    <>
      <Head>
        <title>Appointments | ATTENDING AI</title>
      </Head>

      <AppShell
        header={
          <header className="bg-white border-b border-light safe-area-top">
            <div className="max-w-lg mx-auto px-5 pt-5 pb-4">
              <div className="flex items-center gap-3 mb-1">
                <Link href="/home" className="p-1.5 -ml-1.5 rounded-lg hover:bg-attending-50">
                  <ChevronLeft className="w-5 h-5 text-attending-600" />
                </Link>
                <h1 className="text-xl font-bold text-attending-deep-navy">Appointments</h1>
              </div>
            </div>
          </header>
        }
      >
        <div className="bg-attending-800 dashboard-bg pb-8">
          <div className="max-w-lg mx-auto px-4 sm:px-5 py-5 space-y-4">

            {/* Online scheduling notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Online Scheduling Not Yet Available</p>
                <p className="text-xs text-amber-700 mt-1">
                  Your provider has not enabled online scheduling through ATTENDING yet.
                  To book or change an appointment, please contact their office directly.
                </p>
                <div className="flex gap-2 mt-3">
                  <a
                    href="tel:3035550142"
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-700" />
                    <span className="text-xs font-medium text-amber-800">Call Office</span>
                  </a>
                  <Link
                    href="/messages"
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-700" />
                    <span className="text-xs font-medium text-amber-800">Send Message</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Admin integration placeholder */}
            <div className="bg-attending-50 border border-attending-100 rounded-xl p-4 flex gap-3">
              <Settings2 className="w-5 h-5 text-attending-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-attending-deep-navy">Provider Admin</p>
                <p className="text-xs text-attending-600 mt-1">
                  Clinic administrators can connect their scheduling system (Epic, Cerner, athenahealth, etc.)
                  to enable online booking for patients.
                </p>
                <button
                  className="mt-2 px-3 py-2 bg-attending-primary text-white text-xs font-semibold rounded-lg hover:bg-attending-primary/90 transition-colors"
                  onClick={() => alert('This would open the admin integration setup flow. Contact support@attending.ai to get started.')}
                >
                  Request Integration
                </button>
              </div>
            </div>

            {/* Upcoming appointments */}
            <div>
              <h2 className="text-sm font-semibold text-attending-300 mb-3">Upcoming Appointments</h2>
              <div className="space-y-3">
                {UPCOMING.map((appt) => {
                  const dateObj = new Date(appt.date + 'T12:00:00');
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = dateObj.getDate();
                  const month = dateObj.toLocaleDateString('en-US', { month: 'short' });

                  return (
                    <div key={appt.id} className="bg-white rounded-xl border border-attending-100 overflow-hidden">
                      <div className="p-4 flex gap-3">
                        {/* Date block */}
                        <div className="w-14 h-14 rounded-xl bg-attending-50 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-semibold text-attending-primary uppercase">{dayName}</span>
                          <span className="text-lg font-bold text-attending-deep-navy leading-tight">{dayNum}</span>
                          <span className="text-[10px] text-attending-600">{month}</span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-attending-deep-navy">{appt.provider}</p>
                          <p className="text-xs text-attending-600 mt-0.5">{appt.specialty}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-attending-primary" />
                              <span className="text-xs text-attending-primary font-medium">{appt.time}</span>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              appt.type === 'telehealth'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-attending-50 text-attending-primary'
                            }`}>
                              {appt.type === 'telehealth' ? 'Video Visit' : 'In-Person'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Location / actions */}
                      <div className="border-t border-attending-50 px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {appt.type === 'telehealth' ? (
                            <>
                              <Video className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              <span className="text-xs text-attending-600 truncate">Video link will be sent before visit</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5 text-attending-600 flex-shrink-0" />
                              <span className="text-xs text-attending-600 truncate">{appt.location}</span>
                            </>
                          )}
                        </div>
                        <a href={`tel:${appt.phone.replace(/\D/g, '')}`} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-attending-50 flex-shrink-0 ml-2">
                          <Phone className="w-3 h-3 text-green-600" />
                          <span className="text-[10px] font-medium text-green-700">Call</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* No past appointments section for now */}
            <p className="text-xs text-attending-400 text-center pt-2">
              Need to reschedule? Contact your provider's office directly.
            </p>

          </div>
        </div>
      </AppShell>
    </>
  );
}
