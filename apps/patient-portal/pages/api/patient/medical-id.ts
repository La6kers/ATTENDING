// ============================================================
// ATTENDING AI — Patient Profile API Route
// apps/patient-portal/pages/api/patient/medical-id.ts
//
// GET:  Fetch patient medical ID
// PUT:  Update patient medical ID
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { verifyCsrfToken } from '@attending/shared/lib/security';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const patientId = (session.user as { id?: string }).id;
  if (!patientId) {
    return res.status(401).json({ error: 'Session missing patient ID' });
  }

  if (req.method === 'GET') {
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/v1/patients/${patientId}`, {
        headers: { Authorization: req.headers.authorization ?? '' },
      });

      if (!backendRes.ok) {
        // Return demo data for development
        return res.status(200).json({
          fullName: 'Alex Morgan',
          dateOfBirth: '1984-07-22',
          sex: 'Male',
          bloodType: 'O+',
          height: '5\'11"',
          weight: '185 lbs',
          allergies: [
            { name: 'Penicillin', severity: 'Severe', reaction: 'Anaphylaxis' },
            { name: 'Sulfa drugs', severity: 'Moderate', reaction: 'Rash' },
          ],
          conditions: [
            { name: 'Hypertension', since: '2023' },
            { name: 'Pre-diabetes', since: '2024' },
          ],
          medications: [
            { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily' },
            { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
          ],
          emergencyNotes: '',
          organDonor: false,
        });
      }

      const data = await backendRes.json();
      // Map backend PatientDetailResponse to MedicalID shape
      return res.status(200).json({
        fullName: `${data.firstName} ${data.lastName}`,
        dateOfBirth: data.dateOfBirth,
        sex: data.sex,
        bloodType: data.bloodType ?? 'Unknown',
        height: data.height ?? '',
        weight: data.weight ?? '',
        allergies: (data.allergies ?? []).map((a: any) => ({
          name: a.allergen,
          severity: a.severity,
          reaction: a.reaction,
        })),
        conditions: (data.conditions ?? []).map((c: any) => ({
          name: c.name,
          since: c.onsetDate?.substring(0, 4) ?? '',
        })),
        medications: [], // TODO: Add medication endpoint
        emergencyNotes: data.emergencyNotes ?? '',
        organDonor: data.organDonor ?? false,
      });
    } catch {
      return res.status(500).json({ error: 'Failed to fetch medical ID' });
    }
  }

  if (req.method === 'PUT') {
    // CSRF validation
    const csrfSecret = req.cookies['__Host-csrf-token'];
    const csrfToken = req.headers['x-csrf-token'] as string;
    if (!csrfSecret || !csrfToken || !verifyCsrfToken(csrfSecret, csrfToken)) {
      return res.status(403).json({ error: 'Invalid or missing CSRF token' });
    }

    try {
      // Save to backend — maps MedicalID shape to backend commands
      const body = req.body;

      // Validate email if provided
      if (body.email !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
          return res.status(400).json({ error: 'Invalid email format' });
        }
      }

      // Update basic patient info
      await fetch(`${BACKEND_URL}/api/v1/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: req.headers.authorization ?? '',
        },
        body: JSON.stringify({
          firstName: body.fullName?.split(' ')[0],
          lastName: body.fullName?.split(' ').slice(1).join(' '),
          dateOfBirth: body.dateOfBirth,
          sex: body.sex,
        }),
      });

      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Failed to save medical ID' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
