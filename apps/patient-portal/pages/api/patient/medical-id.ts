// ============================================================
// ATTENDING AI — Patient Profile API Route
// apps/patient-portal/pages/api/patient/medical-id.ts
//
// GET:  Fetch patient medical ID
// PUT:  Update patient medical ID
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:5000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: Extract patient ID from session/JWT
  const patientId = req.headers['x-patient-id'] ?? 'demo-patient';

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
    try {
      // Save to backend — maps MedicalID shape to backend commands
      const body = req.body;

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
