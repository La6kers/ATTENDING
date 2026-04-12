// =============================================================================
// ATTENDING AI - Clinical Trials Matcher Component
// apps/provider-portal/components/interventions/ClinicalTrialsMatcher.tsx
//
// Match patients to clinical trials
// =============================================================================

'use client';

import React, { useState } from 'react';
import {
  FlaskConical,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Phone,
  Mail,
  Building,
  Users,
  Target,
  Award,
  Search,
  Filter,
  Send,
  Star,
  Clock,
  TrendingUp,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ClinicalTrial {
  id: string;
  nctId: string;
  title: string;
  briefSummary: string;
  phase: string;
  status: string;
  conditions: string[];
  sponsor: string;
  interventions?: string[];
  primaryOutcome?: string;
  nearestLocation?: {
    facility: string;
    city: string;
    state: string;
    distance?: number;
    contactPhone?: string;
  };
  url: string;
}

interface TrialMatch {
  trial: ClinicalTrial;
  matchScore: number;
  matchedCriteria: string[];
  unmatchedCriteria: string[];
  potentialExclusions: string[];
  recommendationStrength: 'strong' | 'moderate' | 'weak';
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockTrialMatches: TrialMatch[] = [
  {
    trial: {
      id: 'trial_1',
      nctId: 'NCT04892537',
      title: 'Semaglutide vs Standard Care in Type 2 Diabetes with CKD',
      briefSummary: 'A randomized controlled trial comparing semaglutide to standard of care in patients with type 2 diabetes and chronic kidney disease to evaluate effects on kidney function preservation.',
      phase: 'Phase 3',
      status: 'Recruiting',
      conditions: ['Type 2 Diabetes Mellitus', 'Chronic Kidney Disease'],
      sponsor: 'Novo Nordisk',
      interventions: ['Semaglutide 1mg weekly', 'Standard of Care'],
      primaryOutcome: 'Change in eGFR at 52 weeks',
      nearestLocation: {
        facility: 'University of Colorado Anschutz',
        city: 'Aurora',
        state: 'CO',
        distance: 12,
        contactPhone: '(303) 724-2400',
      },
      url: 'https://clinicaltrials.gov/study/NCT04892537',
    },
    matchScore: 0.92,
    matchedCriteria: ['Age 55 (18-80)', 'Type 2 Diabetes', 'eGFR 42 (30-60)', 'A1c 8.2% (7-10%)'],
    unmatchedCriteria: [],
    potentialExclusions: [],
    recommendationStrength: 'strong',
  },
  {
    trial: {
      id: 'trial_2',
      nctId: 'NCT05123456',
      title: 'SGLT2 Inhibitor for Heart Failure with Preserved Ejection Fraction',
      briefSummary: 'Evaluating the efficacy of empagliflozin in patients with HFpEF to reduce cardiovascular death and heart failure hospitalizations.',
      phase: 'Phase 3',
      status: 'Recruiting',
      conditions: ['Heart Failure with Preserved Ejection Fraction'],
      sponsor: 'Boehringer Ingelheim',
      interventions: ['Empagliflozin 10mg', 'Placebo'],
      primaryOutcome: 'Composite of CV death and HF hospitalization',
      nearestLocation: {
        facility: 'Denver Health',
        city: 'Denver',
        state: 'CO',
        distance: 8,
        contactPhone: '(303) 436-6000',
      },
      url: 'https://clinicaltrials.gov/study/NCT05123456',
    },
    matchScore: 0.78,
    matchedCriteria: ['Age 55 (40-85)', 'Heart Failure diagnosis', 'LVEF >50%'],
    unmatchedCriteria: ['Need NT-proBNP level'],
    potentialExclusions: ['Current SGLT2 inhibitor use - verify'],
    recommendationStrength: 'moderate',
  },
  {
    trial: {
      id: 'trial_3',
      nctId: 'NCT05234567',
      title: 'Novel Anti-Inflammatory Agent in Diabetic Kidney Disease',
      briefSummary: 'Phase 2 study evaluating a novel selective anti-inflammatory compound for slowing progression of diabetic kidney disease.',
      phase: 'Phase 2',
      status: 'Recruiting',
      conditions: ['Diabetic Nephropathy', 'Type 2 Diabetes'],
      sponsor: 'AstraZeneca',
      interventions: ['AZD1234', 'Placebo'],
      primaryOutcome: 'Change in UACR at 24 weeks',
      nearestLocation: {
        facility: 'National Jewish Health',
        city: 'Denver',
        state: 'CO',
        distance: 15,
        contactPhone: '(303) 398-1002',
      },
      url: 'https://clinicaltrials.gov/study/NCT05234567',
    },
    matchScore: 0.65,
    matchedCriteria: ['Type 2 Diabetes', 'CKD Stage 3'],
    unmatchedCriteria: ['Need UACR > 200 mg/g', 'Need stable RAAS inhibitor x 4 weeks'],
    potentialExclusions: [],
    recommendationStrength: 'weak',
  },
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const MatchScoreBadge: React.FC<{ score: number }> = ({ score }) => {
  const percentage = Math.round(score * 100);
  const color = percentage >= 80 ? 'text-emerald-600' : percentage >= 60 ? 'text-amber-600' : 'text-slate-500';
  const bgColor = percentage >= 80 ? 'bg-emerald-100' : percentage >= 60 ? 'bg-amber-100' : 'bg-slate-100';
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bgColor}`}>
      <TrendingUp size={16} className={color} />
      <span className={`font-bold ${color}`}>{percentage}%</span>
      <span className="text-xs text-slate-500">match</span>
    </div>
  );
};

const StrengthBadge: React.FC<{ strength: TrialMatch['recommendationStrength'] }> = ({ strength }) => {
  const config = {
    strong: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Strong Match' },
    moderate: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Moderate Match' },
    weak: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Potential Match' },
  };
  const { bg, text, label } = config[strength];
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
};

const PhaseBadge: React.FC<{ phase: string }> = ({ phase }) => {
  const color = phase.includes('3') ? 'bg-teal-100 text-teal-700' : 
                phase.includes('2') ? 'bg-blue-100 text-blue-700' : 
                'bg-slate-100 text-slate-600';
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {phase}
    </span>
  );
};

const TrialCard: React.FC<{
  match: TrialMatch;
  onContact: (trialId: string) => void;
  onNotifyPatient: (trialId: string) => void;
}> = ({ match, onContact, onNotifyPatient }) => {
  const [expanded, setExpanded] = useState(false);
  const { trial } = match;

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all ${
      match.recommendationStrength === 'strong'
        ? 'border-emerald-200 bg-emerald-50/30'
        : match.recommendationStrength === 'moderate'
        ? 'border-amber-200 bg-amber-50/30'
        : 'border-slate-200 bg-white'
    }`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <StrengthBadge strength={match.recommendationStrength} />
              <PhaseBadge phase={trial.phase} />
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                {trial.status}
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 text-lg leading-tight mb-1">
              {trial.title}
            </h3>
            <p className="text-sm text-slate-500">{trial.nctId} • {trial.sponsor}</p>
          </div>
          <MatchScoreBadge score={match.matchScore} />
        </div>

        {/* Conditions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {trial.conditions.map((condition, idx) => (
            <span key={idx} className="px-3 py-1 bg-teal-100 text-teal-700 text-sm rounded-full">
              {condition}
            </span>
          ))}
        </div>

        {/* Summary */}
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{trial.briefSummary}</p>

        {/* Matching Criteria */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
              <CheckCircle size={12} className="text-emerald-500" />
              Matched Criteria
            </p>
            <div className="space-y-1">
              {match.matchedCriteria.map((criteria, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle size={14} className="text-emerald-500" />
                  {criteria}
                </div>
              ))}
            </div>
          </div>
          
          {(match.unmatchedCriteria.length > 0 || match.potentialExclusions.length > 0) && (
            <div>
              {match.unmatchedCriteria.length > 0 && (
                <>
                  <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                    <AlertCircle size={12} className="text-amber-500" />
                    Needs Verification
                  </p>
                  <div className="space-y-1">
                    {match.unmatchedCriteria.map((criteria, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-amber-700">
                        <AlertCircle size={14} className="text-amber-500" />
                        {criteria}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {match.potentialExclusions.length > 0 && (
                <>
                  <p className="text-xs font-medium text-slate-500 mb-2 mt-2 flex items-center gap-1">
                    <XCircle size={12} className="text-red-500" />
                    Potential Exclusions
                  </p>
                  <div className="space-y-1">
                    {match.potentialExclusions.map((excl, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-red-700">
                        <XCircle size={14} className="text-red-500" />
                        {excl}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Location */}
        {trial.nearestLocation && (
          <div className="flex items-center gap-4 p-3 bg-slate-100 rounded-lg mb-4">
            <MapPin size={18} className="text-slate-500" />
            <div className="flex-1">
              <p className="font-medium text-slate-900">{trial.nearestLocation.facility}</p>
              <p className="text-sm text-slate-500">
                {trial.nearestLocation.city}, {trial.nearestLocation.state}
                {trial.nearestLocation.distance && (
                  <span className="ml-2 text-emerald-600 font-medium">
                    ({trial.nearestLocation.distance} miles away)
                  </span>
                )}
              </p>
            </div>
            {trial.nearestLocation.contactPhone && (
              <a
                href={`tel:${trial.nearestLocation.contactPhone}`}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                <Phone size={14} />
                {trial.nearestLocation.contactPhone}
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNotifyPatient(trial.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-medium rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all"
          >
            <Send size={16} />
            Discuss with Patient
          </button>
          <a
            href={trial.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ExternalLink size={16} />
            View Full Details
          </a>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2.5 border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight size={18} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            {trial.interventions && (
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Interventions:</p>
                <div className="flex flex-wrap gap-2">
                  {trial.interventions.map((int, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                      {int}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {trial.primaryOutcome && (
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Primary Outcome:</p>
                <p className="text-sm text-slate-600 bg-slate-100 p-3 rounded-lg">{trial.primaryOutcome}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ClinicalTrialsMatcher: React.FC<{
  patientId?: string;
  patientName?: string;
}> = ({ patientId, patientName }) => {
  const [matches] = useState<TrialMatch[]>(mockTrialMatches);
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string | null>(null);
  const [strengthFilter, setStrengthFilter] = useState<string | null>(null);

  const strongMatches = matches.filter(m => m.recommendationStrength === 'strong');
  const moderateMatches = matches.filter(m => m.recommendationStrength === 'moderate');

  const filteredMatches = matches.filter(m => {
    const matchesSearch = !searchQuery || 
      m.trial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.trial.conditions.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPhase = !phaseFilter || m.trial.phase === phaseFilter;
    const matchesStrength = !strengthFilter || m.recommendationStrength === strengthFilter;
    return matchesSearch && matchesPhase && matchesStrength;
  });

  const handleContact = (trialId: string) => {
    console.log('Contacting trial site:', trialId);
  };

  const handleNotifyPatient = (trialId: string) => {
    console.log('Notifying patient about trial:', trialId);
    alert('Patient notification sent! They will receive information about this trial.');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Clinical Trial Matching</h2>
              <p className="text-teal-100 text-sm">Connect patients to cutting-edge treatments</p>
            </div>
          </div>
          {patientName && (
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{patientName}</span>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50">
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{matches.length}</p>
          <p className="text-xs text-slate-500">Total Matches</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{strongMatches.length}</p>
          <p className="text-xs text-slate-500">Strong Matches</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{moderateMatches.length}</p>
          <p className="text-xs text-slate-500">Moderate Matches</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-teal-600">3</p>
          <p className="text-xs text-slate-500">Active Phases</p>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trials by condition or title..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select
          value={phaseFilter || ''}
          onChange={(e) => setPhaseFilter(e.target.value || null)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Phases</option>
          <option value="Phase 2">Phase 2</option>
          <option value="Phase 3">Phase 3</option>
        </select>
        <select
          value={strengthFilter || ''}
          onChange={(e) => setStrengthFilter(e.target.value || null)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Matches</option>
          <option value="strong">Strong Only</option>
          <option value="moderate">Moderate Only</option>
        </select>
      </div>

      {/* Matches List */}
      <div className="p-6 space-y-4 max-h-[700px] overflow-y-auto">
        {filteredMatches.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <FlaskConical size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">No matching trials found</p>
            <p className="text-sm mt-1">Try adjusting your search criteria</p>
          </div>
        ) : (
          filteredMatches.map((match) => (
            <TrialCard
              key={match.trial.id}
              match={match}
              onContact={handleContact}
              onNotifyPatient={handleNotifyPatient}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ClinicalTrialsMatcher;
