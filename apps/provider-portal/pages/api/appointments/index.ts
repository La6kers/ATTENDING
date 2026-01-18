// =============================================================================
// ATTENDING AI - Appointments API
// apps/provider-portal/pages/api/appointments/index.ts
//
// Returns appointment data from the centralized mock repository
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getTodaysAppointments,
  getAppointmentsForDateRange,
} from '@/lib/mockData';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { startDate, endDate } = req.query;

  // Get appointments for a date range
  if (startDate && endDate) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const appointments = getAppointmentsForDateRange(start, end);
    return res.status(200).json({ 
      appointments: appointments.map(transformAppointment), 
      total: appointments.length 
    });
  }

  // Get today's appointments (default)
  const appointments = getTodaysAppointments();
  
  return res.status(200).json({ 
    appointments: appointments.map(transformAppointment), 
    total: appointments.length,
    date: new Date().toISOString().split('T')[0],
  });
}

function transformAppointment(appt: ReturnType<typeof getTodaysAppointments>[0]) {
  return {
    id: appt.id,
    time: new Date(appt.scheduledAt).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    scheduledAt: appt.scheduledAt,
    duration: appt.duration,
    type: appt.type,
    status: appt.status,
    reason: appt.reason,
    provider: appt.provider,
    patient: {
      id: appt.patient.id,
      name: `${appt.patient.firstName} ${appt.patient.lastName}`,
      mrn: appt.patient.mrn,
      age: appt.patient.age,
      gender: appt.patient.gender,
      avatarColor: appt.patient.avatarColor,
      insurancePlan: appt.patient.insurancePlan,
    },
    assessment: appt.patient.currentAssessment ? {
      id: appt.patient.currentAssessment.id,
      urgencyLevel: appt.patient.currentAssessment.urgencyLevel,
      chiefComplaint: appt.patient.currentAssessment.chiefComplaint,
      redFlagCount: appt.patient.currentAssessment.redFlags.length,
      status: appt.patient.currentAssessment.status,
    } : null,
  };
}
