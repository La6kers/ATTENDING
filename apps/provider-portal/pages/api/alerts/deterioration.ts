// =============================================================================
// ATTENDING AI - Predictive Alerts API Endpoint
// apps/provider-portal/pages/api/alerts/deterioration.ts
// =============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGetAlerts(req, res);
      case 'POST':
        return handleAssessRisk(req, res);
      case 'PUT':
        return handleAcknowledgeAlert(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Alerts API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetAlerts(req: NextApiRequest, res: NextApiResponse) {
  const { patientId, severity, status } = req.query;

  // Sample alerts - in production, fetch from database
  const alerts = [
    {
      id: 'alert_1',
      patientId: patientId || 'P001',
      alertType: 'sepsis',
      severity: 'high',
      riskScore: 78,
      triggeringFactors: ['Elevated WBC', 'Fever', 'Tachycardia'],
      recommendations: ['Order blood cultures', 'Consider broad-spectrum antibiotics'],
      createdAt: new Date(),
      status: 'active',
    },
    {
      id: 'alert_2',
      patientId: patientId || 'P002',
      alertType: 'heart-failure',
      severity: 'moderate',
      riskScore: 62,
      triggeringFactors: ['Weight gain 3lbs', 'Increased dyspnea'],
      recommendations: ['Adjust diuretic dose', 'Follow up in 48 hours'],
      createdAt: new Date(),
      status: 'active',
    },
  ];

  let filtered = alerts;
  if (severity) filtered = filtered.filter(a => a.severity === severity);
  if (status) filtered = filtered.filter(a => a.status === status);

  return res.status(200).json({ alerts: filtered, total: filtered.length });
}

async function handleAssessRisk(req: NextApiRequest, res: NextApiResponse) {
  const { patientId, riskType, vitals, labs } = req.body;

  if (!patientId || !riskType) {
    return res.status(400).json({ error: 'Patient ID and risk type required' });
  }

  // Simulate risk assessment
  const assessment = {
    patientId,
    riskType,
    assessedAt: new Date(),
    riskScore: Math.floor(Math.random() * 40) + 30,
    riskLevel: 'moderate',
    triggeringFactors: ['Sample factor 1', 'Sample factor 2'],
    recommendations: ['Monitor closely', 'Consider intervention'],
    nextReassessment: new Date(Date.now() + 4 * 60 * 60 * 1000),
  };

  return res.status(200).json(assessment);
}

async function handleAcknowledgeAlert(req: NextApiRequest, res: NextApiResponse) {
  const { alertId, acknowledgedBy, action, notes } = req.body;

  if (!alertId || !acknowledgedBy) {
    return res.status(400).json({ error: 'Alert ID and acknowledger required' });
  }

  return res.status(200).json({
    alertId,
    status: 'acknowledged',
    acknowledgedBy,
    acknowledgedAt: new Date(),
    action: action || 'reviewed',
    notes,
  });
}
