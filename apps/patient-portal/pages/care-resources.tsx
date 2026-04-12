// =============================================================================
// ATTENDING AI - Patient Care Resources & Clinical Trials Page
// apps/patient-portal/pages/care-resources.tsx
//
// Patient-facing view of care resources, SDOH support, and clinical trials
// =============================================================================

import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Heart,
  Home,
  Car,
  UtensilsCrossed,
  Phone,
  MapPin,
  ExternalLink,
  ChevronRight,
  Star,
  FlaskConical,
  CheckCircle,
  Building,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface CommunityResource {
  id: string;
  name: string;
  category: string;
  description: string;
  phone?: string;
  address?: string;
  website?: string;
  distance?: number;
  rating?: number;
  services: string[];
}

interface ClinicalTrialMatch {
  id: string;
  title: string;
  condition: string;
  phase: string;
  matchScore: number;
  status: 'interested' | 'contacted' | 'enrolled' | 'not_interested' | 'pending';
  location: string;
  distance: number;
  summary: string;
}

// =============================================================================
// Mock Data
// =============================================================================

const mockResources: CommunityResource[] = [
  {
    id: 'r1',
    name: 'Valley Food Bank',
    category: 'Food Assistance',
    description: 'Free groceries and food assistance for families in need',
    phone: '(555) 123-4567',
    address: '123 Main St, Valley City, CA 95001',
    website: 'https://valleyfoodbank.org',
    distance: 2.3,
    rating: 4.8,
    services: ['Weekly food distribution', 'Home delivery for seniors', 'SNAP assistance'],
  },
  {
    id: 'r2',
    name: 'Community Health Clinic',
    category: 'Healthcare',
    description: 'Low-cost medical care for uninsured and underinsured patients',
    phone: '(555) 234-5678',
    address: '456 Oak Ave, Valley City, CA 95001',
    distance: 3.1,
    rating: 4.6,
    services: ['Primary care', 'Dental services', 'Mental health counseling'],
  },
  {
    id: 'r3',
    name: 'Housing Assistance Program',
    category: 'Housing',
    description: 'Emergency rent assistance and housing counseling',
    phone: '(555) 345-6789',
    address: '789 Elm St, Valley City, CA 95001',
    distance: 1.8,
    rating: 4.5,
    services: ['Rent assistance', 'Housing counseling', 'Eviction prevention'],
  },
  {
    id: 'r4',
    name: 'Transportation Services',
    category: 'Transportation',
    description: 'Free rides to medical appointments',
    phone: '(555) 456-7890',
    distance: 0,
    rating: 4.2,
    services: ['Medical appointment rides', 'Wheelchair accessible', 'Door-to-door service'],
  },
];

const mockTrials: ClinicalTrialMatch[] = [
  {
    id: 't1',
    title: 'Study of New Diabetes Medication for Kidney Protection',
    condition: 'Type 2 Diabetes with Kidney Disease',
    phase: 'Phase 3',
    matchScore: 92,
    status: 'pending',
    location: 'University Medical Center',
    distance: 12,
    summary: 'This study is testing a new medication that may help protect your kidneys while also improving blood sugar control.',
  },
  {
    id: 't2',
    title: 'Heart Health Study for Diabetic Patients',
    condition: 'Heart Failure',
    phase: 'Phase 3',
    matchScore: 78,
    status: 'interested',
    location: 'Regional Heart Institute',
    distance: 18,
    summary: 'A research study evaluating a new treatment option for heart failure in patients with diabetes.',
  },
];

// =============================================================================
// Components
// =============================================================================

const categoryIcons: Record<string, any> = {
  'Food Assistance': UtensilsCrossed,
  'Healthcare': Heart,
  'Housing': Home,
  'Transportation': Car,
};

const ResourceCard: React.FC<{ resource: CommunityResource }> = ({ resource }) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = categoryIcons[resource.category] || Building;

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <Icon size={20} className="text-teal-300" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">{resource.name}</h3>
            <p className="text-sm text-white/60">{resource.category}</p>
          </div>
          {resource.rating && (
            <div className="flex items-center gap-1 text-amber-500">
              <Star size={14} fill="currentColor" />
              <span className="text-sm font-medium">{resource.rating}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-white/60 mb-3">{resource.description}</p>

        <div className="space-y-2 mb-3">
          {resource.phone && (
            <a href={`tel:${resource.phone}`} className="flex items-center gap-2 text-sm text-teal-300">
              <Phone size={14} />
              {resource.phone}
            </a>
          )}
          {resource.address && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <MapPin size={14} />
              {resource.address}
              {resource.distance !== undefined && (
                <span className="text-teal-300">({resource.distance} mi)</span>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-teal-300 flex items-center gap-1"
        >
          {expanded ? 'Show less' : 'Show services'}
          <ChevronRight size={14} className={expanded ? 'rotate-90' : ''} />
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs font-medium text-white/60 mb-2">Services offered:</p>
            <div className="flex flex-wrap gap-1">
              {resource.services.map((service, idx) => (
                <span key={idx} className="px-2 py-1 bg-white/10 text-white/80 text-xs rounded-full">
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          {resource.phone && (
            <a
              href={`tel:${resource.phone}`}
              className="flex-1 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg text-center"
            >
              Call Now
            </a>
          )}
          {resource.website && (
            <a
              href={resource.website}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-white/10 rounded-lg"
            >
              <ExternalLink size={16} className="text-white/60" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const TrialCard: React.FC<{ 
  trial: ClinicalTrialMatch;
  onInterested: (id: string) => void;
  onNotInterested: (id: string) => void;
}> = ({ trial, onInterested, onNotInterested }) => {
  const statusConfig = {
    pending: { label: 'New Match', color: 'bg-blue-100 text-blue-700' },
    interested: { label: 'Interested', color: 'bg-green-100 text-green-700' },
    contacted: { label: 'In Contact', color: 'bg-purple-100 text-purple-700' },
    enrolled: { label: 'Enrolled', color: 'bg-emerald-100 text-emerald-700' },
    not_interested: { label: 'Not Interested', color: 'bg-gray-100 text-gray-600' },
  };

  const status = statusConfig[trial.status];

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              {trial.phase}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full">
            <CheckCircle size={12} className="text-green-600" />
            <span className="text-xs font-medium text-green-700">{trial.matchScore}% match</span>
          </div>
        </div>

        <h3 className="font-semibold text-white mb-2">{trial.title}</h3>
        <p className="text-sm text-teal-300 mb-2">{trial.condition}</p>
        <p className="text-sm text-white/60 mb-3">{trial.summary}</p>

        <div className="flex items-center gap-4 text-sm text-white/60 mb-4">
          <div className="flex items-center gap-1">
            <Building size={14} />
            {trial.location}
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={14} />
            {trial.distance} miles
          </div>
        </div>

        {trial.status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => onInterested(trial.id)}
              className="flex-1 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg"
            >
              I'm Interested
            </button>
            <button
              onClick={() => onNotInterested(trial.id)}
              className="px-4 py-2 border border-white/10 text-white/60 text-sm rounded-lg"
            >
              Not Now
            </button>
          </div>
        )}

        {trial.status === 'interested' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-700">
              <CheckCircle size={14} className="inline mr-1" />
              Your care team has been notified. They will contact you with more information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export default function CareResourcesPage() {
  const [activeTab, setActiveTab] = useState<'resources' | 'trials'>('resources');
  const [trials, setTrials] = useState(mockTrials);

  const handleInterested = (trialId: string) => {
    setTrials(prev => prev.map(t => 
      t.id === trialId ? { ...t, status: 'interested' as const } : t
    ));
  };

  const handleNotInterested = (trialId: string) => {
    setTrials(prev => prev.map(t => 
      t.id === trialId ? { ...t, status: 'not_interested' as const } : t
    ));
  };

  const pendingTrials = trials.filter(t => t.status === 'pending');

  return (
    <>
      <Head>
        <title>Care Resources | ATTENDING AI</title>
        <meta name="description" content="Community resources and clinical trial opportunities" />
      </Head>

      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0C3547 0%, #0C4C5E 30%, #115E72 100%)' }}>
        {/* Header */}
        <header className="bg-[#0C3547]/80 backdrop-blur-md border-b border-white/10 text-white">
          <div className="max-w-lg mx-auto px-4 py-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-white/60 mb-4">
              <ArrowLeft size={20} />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <Heart size={24} />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Care Resources</h1>
                <p className="text-white/60 text-sm">Support services and research opportunities</p>
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-[#0C3547]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4">
            <div className="flex">
              <button
                onClick={() => setActiveTab('resources')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'resources'
                    ? 'border-teal-300 text-teal-300'
                    : 'border-transparent text-white/60'
                }`}
              >
                <Building size={16} className="inline mr-2" />
                Community Resources
              </button>
              <button
                onClick={() => setActiveTab('trials')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors relative ${
                  activeTab === 'trials'
                    ? 'border-teal-300 text-teal-300'
                    : 'border-transparent text-white/60'
                }`}
              >
                <FlaskConical size={16} className="inline mr-2" />
                Clinical Trials
                {pendingTrials.length > 0 && (
                  <span className="absolute -top-1 right-4 w-5 h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center">
                    {pendingTrials.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="max-w-lg mx-auto px-4 py-6">
          {activeTab === 'resources' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
                <h3 className="font-medium text-purple-900 mb-1">Personalized for You</h3>
                <p className="text-sm text-purple-700">
                  Based on your health profile, we've found resources that may help you.
                  Your care team can help you connect with any of these services.
                </p>
              </div>

              {mockResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}

              <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-center">
                <MessageSquare size={24} className="text-white/40 mx-auto mb-2" />
                <p className="text-sm text-white/60">
                  Need help finding other resources?
                </p>
                <Link href="/chat" className="text-sm text-teal-300 font-medium">
                  Message your care team →
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'trials' && (
            <div className="space-y-4">
              {pendingTrials.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <h3 className="font-medium text-blue-900 mb-1 flex items-center gap-2">
                    <FlaskConical size={16} />
                    {pendingTrials.length} New Research {pendingTrials.length === 1 ? 'Opportunity' : 'Opportunities'}
                  </h3>
                  <p className="text-sm text-blue-700">
                    Based on your health conditions, you may qualify for these clinical trials.
                    Participating in research can give you access to new treatments.
                  </p>
                </div>
              )}

              {trials.map((trial) => (
                <TrialCard
                  key={trial.id}
                  trial={trial}
                  onInterested={handleInterested}
                  onNotInterested={handleNotInterested}
                />
              ))}

              <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                <h3 className="font-medium text-white mb-2">About Clinical Trials</h3>
                <ul className="text-sm text-white/60 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle size={14} className="text-green-500 mt-0.5" />
                    Participation is always voluntary
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={14} className="text-green-500 mt-0.5" />
                    You can stop participating at any time
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={14} className="text-green-500 mt-0.5" />
                    Many trials provide free medications and monitoring
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle size={14} className="text-green-500 mt-0.5" />
                    Your care team will discuss all options with you
                  </li>
                </ul>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
