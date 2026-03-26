// ============================================================
// ATTENDING AI — Provider Pharmacy Pricing API
// apps/provider-portal/pages/api/prescriptions/pharmacy-pricing.ts
//
// GET /api/prescriptions/pharmacy-pricing?medication=lisinopril&strength=10mg&form=tablet&quantity=30&zipCode=63101
// Returns pharmacy pricing comparison for the prescription being written.
// ============================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getPharmacyPrices } from '@attending/shared/services/PharmacyPricingService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { medication, strength, form, quantity, zipCode } = req.query;

  if (!medication || !strength || !form || !quantity) {
    return res.status(400).json({
      error: 'Required: medication, strength, form, quantity',
    });
  }

  try {
    const prices = await getPharmacyPrices({
      medicationName: String(medication),
      strength: String(strength),
      form: String(form),
      quantity: parseInt(String(quantity), 10),
      zipCode: zipCode ? String(zipCode) : undefined,
    });

    // Also include catalog baseline price for context
    const avgPrice = prices.length > 0
      ? prices.reduce((s, p) => s + p.price, 0) / prices.length
      : 0;

    return res.status(200).json({
      medication: String(medication),
      strength: String(strength),
      form: String(form),
      quantity: parseInt(String(quantity), 10),
      averagePrice: Math.round(avgPrice * 100) / 100,
      lowestPrice: prices.length > 0 ? prices[0].price : null,
      pharmacyCount: prices.length,
      prices,
    });
  } catch (error: any) {
    console.error('Pharmacy pricing error:', error);
    return res.status(500).json({ error: 'Failed to fetch pharmacy pricing' });
  }
}
