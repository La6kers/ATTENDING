// ============================================================
// ATTENDING AI - Social Determinants of Health (SDOH)
// apps/provider-portal/components/sdoh/SDOHDashboard.tsx
//
// Phase 10C: Address the whole patient, not just the disease
// ============================================================

'use client';

import React, { useState } from 'react';
import {
  Home,
  Car,
  UtensilsCrossed,
  Heart,
  GraduationCap,
  Briefcase,
  Users,
  Shield,
  Phone,
  MapPin,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  ExternalLink,
  Search,
  Filter,
  Plus,
  Send,
  FileText,
  Building,
  DollarSign,
  Baby,
  Pill,
  Clock,
  X,
  Star,
  ThumbsUp,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export type SDOHDomain = 
  | 'housing'
  | 'food'
  | 'transportation'
  | 'employment'
  | 'education'
  | 'social_support'
  | 'safety'
  | 'financial'
  | 'childcare'
  | 'medication_access';

export type RiskLevel = 'none' | 'low' | 'moderate' | 'high';
export type ReferralStatus = 'pending' | 'sent' | 'accepted' | 'completed' | 'declined';

export interface SDOHScreening {
  id: string;
  patientId: string;
  patientName: string;
  screeningDate: Date;
  domains: SDOHDomainResult[];
  overallRisk: RiskLevel;
  followUpNeeded: boolean;
  notes?: string;
}

export interface SDOHDomainResult {
  domain: SDOHDomain;
  risk: RiskLevel;
  positiveScreen: boolean;
  questions: Array<{ question: string; answer: string }>;
  interventions?: string[];
}

export interface CommunityResource {
  id: string;
  name: string;
  domain: SDOHDomain;
  description: string;
  address?: string;
  phone?: string;
  website?: string;
  eligibility?: string;
  services: string[];
  verified: boolean;
  rating?: number;
  distance?: number;
}

export interface SDOHReferral {
  id: string;
  patientId: string;
  patientName: string;
  resourceId: string;
  resourceName: string;
  domain: SDOHDomain;
  status: ReferralStatus;
  createdAt: Date;
  sentAt?: Date;
  completedAt?: Date;
  notes?: string;
  outcome?: string;
}

// ============================================================
// MOCK DATA
// ============================================================

const mockScreening: SDOHScreening = {
  id: 's1',
  patientId: 'p1',
  patientName: 'Maria Garcia',
  screeningDate: new Date(),
  domains: [
    {
      domain: 'housing',
      risk: 'moderate',
      positiveScreen: true,
      questions: [
        { question: 'Are you worried about losing your housing?', answer: 'Sometimes' },
        { question: 'Do you have a stable place to live?', answer: 'Yes, but struggling with rent' },
      ],
      interventions: ['Rent assistance program', 'Housing counseling'],
    },
    {
      domain: 'food',
      risk: 'high',
      positiveScreen: true,
      questions: [
        { question: 'In the past 12 months, did you worry food would run out?', answer: 'Yes, often' },
        { question: 'Did you eat less because there wasn\'t enough money?', answer: 'Yes' },
      ],
      interventions: ['SNAP enrollment', 'Food bank referral', 'WIC if eligible'],
    },
    {
      domain: 'transportation',
      risk: 'low',
      positiveScreen: false,
      questions: [
        { question: 'Do you have reliable transportation to medical appointments?', answer: 'Yes' },
      ],
    },
    {
      domain: 'medication_access',
      risk: 'moderate',
      positiveScreen: true,
      questions: [
        { question: 'Have you ever skipped medications due to cost?', answer: 'Sometimes' },
      ],
      interventions: ['Patient assistance programs', 'Generic alternatives'],
    },
    {
      domain: 'social_support',
      risk: 'low',
      positiveScreen: false,
      questions: [
        { question: 'Do you have someone to help if you need it?', answer: 'Yes' },
      ],
    },
  ],
  overallRisk: 'high',
  followUpNeeded: true,
  notes: 'Patient is a single mother with two children. Recently reduced work hours.',
};

const mockResources: CommunityResource[] = [
  {
    id: 'r1',
    name: 'Valley Food Bank',
    domain: 'food',
    description: 'Provides emergency food assistance to families in need',
    address: '123 Main St, Valley City, CA 95001',
    phone: '(555) 123-4567',
    website: 'https://valleyfoodbank.org',
    eligibility: 'Income below 200% FPL',
    services: ['Weekly food distribution', 'Home delivery for seniors', 'SNAP application assistance'],
    verified: true,
    rating: 4.8,
    distance: 2.3,
  },
  {
    id: 'r2',
    name: 'Housing Assistance Coalition',
    domain: 'housing',
    description: 'Emergency rental assistance and housing counseling',
    address: '456 Oak Ave, Valley City, CA 95001',
    phone: '(555) 234-5678',
    website: 'https://housingcoalition.org',
    eligibility: 'Facing eviction or housing instability',
    services: ['Emergency rent assistance', 'Housing counseling', 'Eviction prevention'],
    verified: true,
    rating: 4.5,
    distance: 1.8,
  },
  {
    id: 'r3',
    name: 'Prescription Assistance Network',
    domain: 'medication_access',
    description: 'Helps patients access affordable medications',
    phone: '(555) 345-6789',
    website: 'https://rxassist.org',
    services: ['Patient assistance program enrollment', 'Generic medication guidance', 'Copay assistance'],
    verified: true,
    rating: 4.6,
  },
  {
    id: 'r4',
    name: 'Community Transit Services',
    domain: 'transportation',
    description: 'Non-emergency medical transportation',
    phone: '(555) 456-7890',
    services: ['Medical appointment rides', 'Wheelchair accessible vehicles', 'Door-to-door service'],
    eligibility: 'Medicaid recipients or qualifying income',
    verified: true,
    rating: 4.2,
  },
  {
    id: 'r5',
    name: 'Family Support Center',
    domain: 'childcare',
    description: 'Childcare assistance and family services',
    address: '789 Elm St, Valley City, CA 95001',
    phone: '(555) 567-8901',
    services: ['Subsidized childcare', 'After-school programs', 'Parent resources'],
    verified: true,
    rating: 4.7,
    distance: 3.1,
  },
];

const mockReferrals: SDOHReferral[] = [
  {
    id: 'ref1',
    patientId: 'p1',
    patientName: 'Maria Garcia',
    resourceId: 'r1',
    resourceName: 'Valley Food Bank',
    domain: 'food',
    status: 'sent',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'ref2',
    patientId: 'p1',
    patientName: 'Maria Garcia',
    resourceId: 'r2',
    resourceName: 'Housing Assistance Coalition',
    domain: 'housing',
    status: 'pending',
    createdAt: new Date(),
  },
];

// ============================================================
// COMPONENTS
// ============================================================

const DomainIcon: React.FC<{ domain: SDOHDomain; size?: number }> = ({ domain, size = 18 }) => {
  const icons: Record<SDOHDomain, React.ReactNode> = {
    housing: <Home size={size} />,
    food: <UtensilsCrossed size={size} />,
    transportation: <Car size={size} />,
    employment: <Briefcase size={size} />,
    education: <GraduationCap size={size} />,
    social_support: <Users size={size} />,
    safety: <Shield size={size} />,
    financial: <DollarSign size={size} />,
    childcare: <Baby size={size} />,
    medication_access: <Pill size={size} />,
  };
  return <>{icons[domain]}</>;
};

const domainLabels: Record<SDOHDomain, string> = {
  housing: 'Housing Stability',
  food: 'Food Security',
  transportation: 'Transportation',
  employment: 'Employment',
  education: 'Education',
  social_support: 'Social Support',
  safety: 'Personal Safety',
  financial: 'Financial Strain',
  childcare: 'Childcare',
  medication_access: 'Medication Access',
};

const RiskIndicator: React.FC<{ risk: RiskLevel }> = ({ risk }) => {
  const config = {
    none: { color: 'bg-slate-100 text-slate-600', label: 'No Risk' },
    low: { color: 'bg-green-100 text-green-700', label: 'Low' },
    moderate: { color: 'bg-amber-100 text-amber-700', label: 'Moderate' },
    high: { color: 'bg-red-100 text-red-700', label: 'High' },
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config[risk].color}`}>
      {config[risk].label}
    </span>
  );
};

const DomainCard: React.FC<{
  result: SDOHDomainResult;
  onIntervene: (domain: SDOHDomain) => void;
}> = ({ result, onIntervene }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border ${
      result.positiveScreen ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
    } overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            result.positiveScreen ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
          }`}>
            <DomainIcon domain={result.domain} />
          </div>
          <div className="text-left">
            <p className="font-medium text-slate-900">{domainLabels[result.domain]}</p>
            <p className="text-xs text-slate-500">
              {result.positiveScreen ? 'Positive screen - intervention needed' : 'No concerns identified'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RiskIndicator risk={result.risk} />
          <ChevronRight className={`text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} size={20} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-200 bg-white">
          {/* Screening Questions */}
          <div className="mt-3">
            <p className="text-sm font-medium text-slate-700 mb-2">Screening Responses:</p>
            <div className="space-y-2">
              {result.questions.map((q, idx) => (
                <div key={idx} className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">{q.question}</p>
                  <p className="text-sm text-slate-900">{q.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interventions */}
          {result.interventions && result.interventions.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-slate-700 mb-2">Recommended Interventions:</p>
              <div className="flex flex-wrap gap-2">
                {result.interventions.map((int, idx) => (
                  <span key={idx} className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full">
                    {int}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.positiveScreen && (
            <button
              onClick={() => onIntervene(result.domain)}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Send size={16} />
              Find Resources & Refer
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ResourceCard: React.FC<{
  resource: CommunityResource;
  onRefer: (resourceId: string) => void;
}> = ({ resource, onRefer }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-teal-100 rounded-lg text-teal-600">
          <DomainIcon domain={resource.domain} />
        </div>
        <div>
          <h4 className="font-semibold text-slate-900">{resource.name}</h4>
          {resource.verified && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle size={12} /> Verified
            </span>
          )}
        </div>
      </div>
      {resource.rating && (
        <div className="flex items-center gap-1 text-amber-500">
          <Star size={14} fill="currentColor" />
          <span className="text-sm font-medium">{resource.rating}</span>
        </div>
      )}
    </div>

    <p className="text-sm text-slate-600 mb-3">{resource.description}</p>

    <div className="space-y-2 mb-3">
      {resource.address && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin size={14} />
          {resource.address}
          {resource.distance && <span className="text-xs">({resource.distance} mi)</span>}
        </div>
      )}
      {resource.phone && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Phone size={14} />
          {resource.phone}
        </div>
      )}
    </div>

    <div className="flex flex-wrap gap-1 mb-3">
      {resource.services.slice(0, 3).map((service, idx) => (
        <span key={idx} className="text-xs px-2 py-0.5 bg-slate-100 rounded-full">
          {service}
        </span>
      ))}
    </div>

    <div className="flex items-center gap-2">
      <button
        onClick={() => onRefer(resource.id)}
        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
      >
        <Send size={14} />
        Refer Patient
      </button>
      {resource.website && (
        <a
          href={resource.website}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ExternalLink size={16} className="text-slate-500" />
        </a>
      )}
    </div>
  </div>
);

const ReferralCard: React.FC<{ referral: SDOHReferral }> = ({ referral }) => {
  const statusConfig: Record<ReferralStatus, { color: string; label: string }> = {
    pending: { color: 'bg-slate-100 text-slate-700', label: 'Pending' },
    sent: { color: 'bg-blue-100 text-blue-700', label: 'Sent' },
    accepted: { color: 'bg-green-100 text-green-700', label: 'Accepted' },
    completed: { color: 'bg-emerald-100 text-emerald-700', label: 'Completed' },
    declined: { color: 'bg-red-100 text-red-700', label: 'Declined' },
  };

  return (
    <div className="p-3 bg-white rounded-lg border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <DomainIcon domain={referral.domain} size={16} />
          <span className="font-medium text-slate-900">{referral.resourceName}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs ${statusConfig[referral.status].color}`}>
          {statusConfig[referral.status].label}
        </span>
      </div>
      <p className="text-sm text-slate-500">{referral.patientName}</p>
      <p className="text-xs text-slate-400 mt-1">
        Created {referral.createdAt.toLocaleDateString()}
      </p>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const SDOHDashboard: React.FC<{
  patientId?: string;
  patientName?: string;
}> = ({ patientId, patientName }) => {
  const [activeTab, setActiveTab] = useState<'screening' | 'resources' | 'referrals'>('screening');
  const [selectedDomain, setSelectedDomain] = useState<SDOHDomain | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [screening] = useState<SDOHScreening>(mockScreening);
  const [resources] = useState<CommunityResource[]>(mockResources);
  const [referrals] = useState<SDOHReferral[]>(mockReferrals);

  const filteredResources = resources.filter(r => {
    const matchesSearch = searchTerm === '' || 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDomain = !selectedDomain || r.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  const handleIntervene = (domain: SDOHDomain) => {
    setSelectedDomain(domain);
    setActiveTab('resources');
  };

  const handleRefer = (resourceId: string) => {
    console.log('Referring to resource:', resourceId);
  };

  const positiveDomains = screening.domains.filter(d => d.positiveScreen);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Social Determinants of Health</h2>
              <p className="text-rose-100 text-sm">Address the whole patient, not just the disease</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
              {patientName || screening.patientName}
            </span>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {positiveDomains.length > 0 && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
          <AlertTriangle className="text-amber-600" size={20} />
          <div className="flex-1">
            <p className="font-medium text-amber-800">
              {positiveDomains.length} social need(s) identified
            </p>
            <p className="text-sm text-amber-600">
              {positiveDomains.map(d => domainLabels[d.domain]).join(', ')}
            </p>
          </div>
          <button className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors">
            Address Now
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { key: 'screening', label: 'Screening Results', icon: FileText },
          { key: 'resources', label: 'Community Resources', icon: Building },
          { key: 'referrals', label: 'Referrals', icon: Send },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-rose-600 border-b-2 border-rose-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.key === 'referrals' && referrals.length > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-xs rounded-full">
                  {referrals.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-6">
        {/* Screening Tab */}
        {activeTab === 'screening' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">SDOH Screening Summary</h3>
                <p className="text-sm text-slate-500">
                  Last screened: {screening.screeningDate.toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Overall Risk:</span>
                <RiskIndicator risk={screening.overallRisk} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {screening.domains.map((domain) => (
                <DomainCard 
                  key={domain.domain} 
                  result={domain} 
                  onIntervene={handleIntervene}
                />
              ))}
            </div>

            {screening.notes && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-1">Provider Notes:</p>
                <p className="text-sm text-slate-600">{screening.notes}</p>
              </div>
            )}

            <button className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl hover:border-rose-300 hover:text-rose-600 transition-colors">
              <Plus size={20} />
              Start New Screening
            </button>
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search resources..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <select
                value={selectedDomain || ''}
                onChange={(e) => setSelectedDomain(e.target.value as SDOHDomain || null)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">All Categories</option>
                {Object.entries(domainLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {filteredResources.map((resource) => (
                <ResourceCard 
                  key={resource.id} 
                  resource={resource} 
                  onRefer={handleRefer}
                />
              ))}
            </div>
          </div>
        )}

        {/* Referrals Tab */}
        {activeTab === 'referrals' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Active Referrals</h3>
              <button className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors">
                <Plus size={16} />
                New Referral
              </button>
            </div>

            <div className="space-y-3">
              {referrals.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Send size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No referrals yet</p>
                </div>
              ) : (
                referrals.map((referral) => (
                  <ReferralCard key={referral.id} referral={referral} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SDOHDashboard;
