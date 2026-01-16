// Provider Directory Search API
// apps/provider-portal/pages/api/referrals/providers.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@attending/shared/lib/prisma';

interface Provider {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  subspecialty?: string;
  organization: string;
  address: string;
  phone: string;
  fax: string;
  acceptingNew: boolean;
  insurancesAccepted: string[];
  nextAvailable: { routine: string; urgent: string };
  rating?: number;
  preferred?: boolean;
}

// Mock provider data (in production, this would come from database)
const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'prov-001',
    name: 'Sarah Chen',
    credentials: 'MD, PhD',
    specialty: 'NEURO',
    subspecialty: 'Headache Medicine',
    organization: 'Regional Neurology Associates',
    address: '1234 Medical Center Dr, Suite 400',
    phone: '(555) 234-5678',
    fax: '(555) 234-5679',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'Aetna', 'United', 'Medicare'],
    nextAvailable: { routine: '2 weeks', urgent: '2 days' },
    rating: 4.8,
    preferred: true
  },
  {
    id: 'prov-002',
    name: 'Michael Rodriguez',
    credentials: 'MD, FACC',
    specialty: 'CARDS',
    subspecialty: 'Interventional',
    organization: 'Heart & Vascular Institute',
    address: '5678 Cardiac Way, Suite 200',
    phone: '(555) 345-6789',
    fax: '(555) 345-6790',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'Aetna', 'United', 'Medicare', 'Medicaid'],
    nextAvailable: { routine: '1 week', urgent: 'Same day' },
    rating: 4.9,
    preferred: true
  },
  {
    id: 'prov-003',
    name: 'Jennifer Park',
    credentials: 'MD',
    specialty: 'GI',
    subspecialty: 'IBD',
    organization: 'Digestive Health Center',
    address: '9012 GI Lane, Suite 150',
    phone: '(555) 456-7890',
    fax: '(555) 456-7891',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'United', 'Medicare'],
    nextAvailable: { routine: '4 weeks', urgent: '1 week' },
    rating: 4.7
  },
  {
    id: 'prov-004',
    name: 'David Kim',
    credentials: 'MD, FACS',
    specialty: 'ORTHO',
    subspecialty: 'Sports Medicine',
    organization: 'Sports Medicine & Orthopedics',
    address: '3456 Athletic Dr, Suite 300',
    phone: '(555) 567-8901',
    fax: '(555) 567-8902',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'Aetna', 'United', 'Medicare'],
    nextAvailable: { routine: '3 weeks', urgent: '3 days' },
    rating: 4.6
  },
  {
    id: 'prov-005',
    name: 'Lisa Thompson',
    credentials: 'MD',
    specialty: 'PSYCH',
    subspecialty: 'Adult',
    organization: 'Behavioral Health Associates',
    address: '7890 Mental Health Way, Suite 100',
    phone: '(555) 678-9012',
    fax: '(555) 678-9013',
    acceptingNew: false,
    insurancesAccepted: ['Blue Cross', 'Aetna'],
    nextAvailable: { routine: '6 weeks', urgent: '1 week' },
    rating: 4.9
  },
  {
    id: 'prov-006',
    name: 'Robert Johnson',
    credentials: 'MD',
    specialty: 'NEURO',
    subspecialty: 'Stroke',
    organization: 'Stroke Center of Excellence',
    address: '2345 Neuro Blvd, Suite 500',
    phone: '(555) 789-0123',
    fax: '(555) 789-0124',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'Aetna', 'United', 'Medicare', 'Medicaid'],
    nextAvailable: { routine: '3 weeks', urgent: '1 day' },
    rating: 4.7
  },
  {
    id: 'prov-007',
    name: 'Emily Watson',
    credentials: 'MD, FACP',
    specialty: 'PULM',
    subspecialty: 'Sleep Medicine',
    organization: 'Pulmonary & Sleep Center',
    address: '4567 Respiratory Way, Suite 250',
    phone: '(555) 890-1234',
    fax: '(555) 890-1235',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'United', 'Medicare'],
    nextAvailable: { routine: '2 weeks', urgent: '3 days' },
    rating: 4.5
  },
  {
    id: 'prov-008',
    name: 'James Wilson',
    credentials: 'MD',
    specialty: 'ENDO',
    subspecialty: 'Diabetes',
    organization: 'Endocrine & Diabetes Center',
    address: '6789 Hormone Ave, Suite 175',
    phone: '(555) 901-2345',
    fax: '(555) 901-2346',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'Aetna', 'United', 'Medicare'],
    nextAvailable: { routine: '5 weeks', urgent: '1 week' },
    rating: 4.6
  },
  {
    id: 'prov-009',
    name: 'Maria Garcia',
    credentials: 'DPT',
    specialty: 'PT',
    subspecialty: 'Orthopedic',
    organization: 'Active Recovery Physical Therapy',
    address: '8901 Rehab Circle, Suite 50',
    phone: '(555) 012-3456',
    fax: '(555) 012-3457',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'Aetna', 'United', 'Medicare', 'Medicaid'],
    nextAvailable: { routine: '1 week', urgent: '2 days' },
    rating: 4.8,
    preferred: true
  },
  {
    id: 'prov-010',
    name: 'Amanda Brown',
    credentials: 'MD',
    specialty: 'DERM',
    subspecialty: 'Medical Dermatology',
    organization: 'Dermatology Associates',
    address: '1357 Skin Care Lane, Suite 125',
    phone: '(555) 123-4567',
    fax: '(555) 123-4568',
    acceptingNew: true,
    insurancesAccepted: ['Blue Cross', 'Aetna', 'United'],
    nextAvailable: { routine: '8 weeks', urgent: '2 weeks' },
    rating: 4.4
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { 
      specialty, 
      subspecialty,
      insurance, 
      acceptingNew,
      preferred,
      search,
      limit = '20',
      offset = '0'
    } = req.query;

    // Try database first, fall back to mock data
    try {
      const where: any = { active: true };
      
      if (specialty) where.specialty = String(specialty);
      if (subspecialty) where.subspecialty = String(subspecialty);
      if (acceptingNew === 'true') where.acceptingNew = true;
      if (preferred === 'true') where.preferred = true;
      
      const [providers, total] = await Promise.all([
        prisma.providerDirectory.findMany({
          where,
          orderBy: [
            { preferred: 'desc' },
            { rating: 'desc' },
            { name: 'asc' }
          ],
          take: parseInt(String(limit)),
          skip: parseInt(String(offset))
        }),
        prisma.providerDirectory.count({ where })
      ]);

      // Filter by insurance if specified
      let filteredProviders = providers;
      if (insurance) {
        filteredProviders = providers.filter((p: any) => {
          const insurances = typeof p.insurancesAccepted === 'string' 
            ? JSON.parse(p.insurancesAccepted) 
            : p.insurancesAccepted;
          return insurances.includes(String(insurance));
        });
      }

      return res.status(200).json({
        providers: filteredProviders,
        total,
        limit: parseInt(String(limit)),
        offset: parseInt(String(offset))
      });
    } catch (prismaError) {
      // Database not available, use mock data
      console.log('ProviderDirectory model not found, using mock data');
      
      let filtered = [...MOCK_PROVIDERS];
      
      if (specialty) {
        filtered = filtered.filter(p => p.specialty === String(specialty));
      }
      if (subspecialty) {
        filtered = filtered.filter(p => p.subspecialty === String(subspecialty));
      }
      if (insurance) {
        filtered = filtered.filter(p => p.insurancesAccepted.includes(String(insurance)));
      }
      if (acceptingNew === 'true') {
        filtered = filtered.filter(p => p.acceptingNew);
      }
      if (preferred === 'true') {
        filtered = filtered.filter(p => p.preferred);
      }
      if (search) {
        const searchLower = String(search).toLowerCase();
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(searchLower) ||
          p.organization.toLowerCase().includes(searchLower) ||
          p.specialty.toLowerCase().includes(searchLower)
        );
      }

      // Sort: preferred first, then by rating
      filtered.sort((a, b) => {
        if (a.preferred && !b.preferred) return -1;
        if (!a.preferred && b.preferred) return 1;
        return (b.rating || 0) - (a.rating || 0);
      });

      const start = parseInt(String(offset));
      const end = start + parseInt(String(limit));
      const paginated = filtered.slice(start, end);

      return res.status(200).json({
        providers: paginated,
        total: filtered.length,
        limit: parseInt(String(limit)),
        offset: parseInt(String(offset))
      });
    }
  } catch (error) {
    console.error('Error searching providers:', error);
    return res.status(500).json({ error: 'Failed to search providers' });
  }
}
