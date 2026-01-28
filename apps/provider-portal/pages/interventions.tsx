// =============================================================================
// ATTENDING AI - Clinical Interventions Hub Page
// apps/provider-portal/pages/interventions.tsx
//
// Unified view of all clinical intervention features
// =============================================================================

import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Brain,
  Sparkles,
  FlaskConical,
  Heart,
  Pill,
  Users,
  ChevronRight,
  Activity,
  Target,
  Shield,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  UserCircle,
  LayoutGrid,
  List,
} from 'lucide-react';

import {
  ClinicalRecommendations,
  SmartOrderAssistant,
  ClinicalTrialsMatcher,
  MedicationOptimizer,
  CareCoordinationHub,
  SDOHDashboard,
  InterventionsOverview,
} from '../components/interventions';

// =============================================================================
// TYPES
// =============================================================================

type InterventionModule = 
  | 'overview'
  | 'recommendations'
  | 'orders'
  | 'trials'
  | 'sdoh'
  | 'medications'
  | 'coordination';

interface ModuleConfig {
  key: InterventionModule;
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
  gradient: string;
  stats: Array<{ label: string; value: string | number; color?: string }>;
}

// =============================================================================
// MODULE CONFIGURATIONS
// =============================================================================

const moduleConfigs: ModuleConfig[] = [
  {
    key: 'overview',
    label: 'Overview Dashboard',
    shortLabel: 'Overview',
    description: 'Summary of all intervention modules',
    icon: LayoutGrid,
    gradient: 'from-slate-700 to-slate-800',
    stats: [
      { label: 'Total', value: 26 },
      { label: 'Urgent', value: 7, color: 'text-red-600' },
      { label: 'Savings', value: '$385', color: 'text-green-600' },
    ],
  },
  {
    key: 'recommendations',
    label: 'Clinical Recommendations',
    shortLabel: 'Recommendations',
    description: 'Evidence-based guidance with guideline citations',
    icon: Brain,
    gradient: 'from-indigo-600 to-purple-600',
    stats: [
      { label: 'Active', value: 5 },
      { label: 'Urgent', value: 2, color: 'text-red-600' },
      { label: 'Preventive', value: 1, color: 'text-emerald-600' },
    ],
  },
  {
    key: 'orders',
    label: 'Smart Order Assistant',
    shortLabel: 'Smart Orders',
    description: 'Natural language ordering with safety checks',
    icon: Sparkles,
    gradient: 'from-emerald-600 to-teal-600',
    stats: [
      { label: 'Order Sets', value: 3 },
      { label: 'Safety Rules', value: '50+' },
      { label: 'Time Saved', value: '5 min/order' },
    ],
  },
  {
    key: 'trials',
    label: 'Clinical Trial Matching',
    shortLabel: 'Trial Matching',
    description: 'Connect patients to cutting-edge treatments',
    icon: FlaskConical,
    gradient: 'from-purple-600 to-pink-600',
    stats: [
      { label: 'Matches', value: 3 },
      { label: 'Strong', value: 1, color: 'text-emerald-600' },
      { label: 'Moderate', value: 1, color: 'text-amber-600' },
    ],
  },
  {
    key: 'sdoh',
    label: 'Social Determinants',
    shortLabel: 'SDOH',
    description: 'Screen for social needs & connect to resources',
    icon: Heart,
    gradient: 'from-rose-600 to-pink-600',
    stats: [
      { label: 'Domains', value: 12 },
      { label: 'Needs Found', value: 2, color: 'text-amber-600' },
      { label: 'Resources', value: 10 },
    ],
  },
  {
    key: 'medications',
    label: 'Medication Optimizer',
    shortLabel: 'Med Optimizer',
    description: 'AI-powered medication review & deprescribing',
    icon: Pill,
    gradient: 'from-amber-500 to-orange-500',
    stats: [
      { label: 'Optimizations', value: 7 },
      { label: 'Savings', value: '$385/mo', color: 'text-green-600' },
      { label: 'Pills Reduced', value: 4 },
    ],
  },
  {
    key: 'coordination',
    label: 'Care Coordination',
    shortLabel: 'Coordination',
    description: 'Tasks, handoffs, and team communication',
    icon: Users,
    gradient: 'from-cyan-600 to-blue-600',
    stats: [
      { label: 'Tasks', value: 6 },
      { label: 'Overdue', value: 2, color: 'text-red-600' },
      { label: 'Handoffs', value: 1 },
    ],
  },
];

// =============================================================================
// DEMO PATIENT DATA
// =============================================================================

const demoPatient = {
  id: 'patient-demo-001',
  name: 'Robert Anderson',
  age: 68,
  gender: 'Male',
  mrn: '12345678',
  conditions: ['Type 2 Diabetes', 'Heart Failure (HFpEF)', 'CKD Stage 3b', 'Hypertension', 'Hyperlipidemia'],
  allergies: ['Penicillin', 'Sulfa'],
  medications: ['Metformin 1000mg BID', 'Lisinopril 20mg', 'Carvedilol 12.5mg BID', 'Atorvastatin 40mg', 'Furosemide 40mg', 'Aspirin 81mg'],
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function InterventionsPage() {
  const router = useRouter();
  const { module } = router.query;
  
  // Initialize from URL query parameter
  const getInitialModule = (): InterventionModule => {
    if (module && typeof module === 'string') {
      const validModules: InterventionModule[] = ['overview', 'recommendations', 'orders', 'trials', 'sdoh', 'medications', 'coordination'];
      if (validModules.includes(module as InterventionModule)) {
        return module as InterventionModule;
      }
    }
    return 'overview';
  };

  const [activeModule, setActiveModule] = useState<InterventionModule>(getInitialModule());
  
  // Update active module when URL changes
  React.useEffect(() => {
    if (module && typeof module === 'string') {
      const validModules: InterventionModule[] = ['overview', 'recommendations', 'orders', 'trials', 'sdoh', 'medications', 'coordination'];
      if (validModules.includes(module as InterventionModule)) {
        setActiveModule(module as InterventionModule);
      }
    }
  }, [module]);
  const [showPatientBanner, setShowPatientBanner] = useState(true);

  const currentConfig = moduleConfigs.find(m => m.key === activeModule)!;
  const CurrentIcon = currentConfig.icon;

  const handleNavigateFromOverview = (moduleId: string) => {
    setActiveModule(moduleId as InterventionModule);
  };

  return (
    <>
      <Head>
        <title>Clinical Interventions | ATTENDING AI</title>
        <meta name="description" content="AI-powered clinical decision support and interventions" />
      </Head>

      <div className="min-h-screen bg-slate-100">
        {/* Top Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-[1800px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${currentConfig.gradient} text-white`}>
                  <CurrentIcon size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Clinical Interventions Hub</h1>
                  <p className="text-sm text-slate-500">AI-powered clinical co-pilot for better patient care</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Quick Stats */}
                <div className="flex items-center gap-6 px-6 py-2 bg-slate-50 rounded-xl">
                  <div className="text-center">
                    <p className="text-lg font-bold text-indigo-600">12</p>
                    <p className="text-xs text-slate-500">Active Alerts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-600">$385</p>
                    <p className="text-xs text-slate-500">Savings/mo</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-amber-600">3</p>
                    <p className="text-xs text-slate-500">Trial Matches</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Context Banner */}
        {showPatientBanner && activeModule !== 'overview' && (
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
            <div className="max-w-[1800px] mx-auto px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <UserCircle size={28} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">{demoPatient.name}</h2>
                      <p className="text-slate-300 text-sm">
                        {demoPatient.age}yo {demoPatient.gender} • MRN: {demoPatient.mrn}
                      </p>
                    </div>
                  </div>
                  
                  <div className="h-8 w-px bg-slate-600" />
                  
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">Conditions:</span>
                    <div className="flex flex-wrap gap-1">
                      {demoPatient.conditions.slice(0, 3).map((condition, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                          {condition}
                        </span>
                      ))}
                      {demoPatient.conditions.length > 3 && (
                        <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-slate-300">
                          +{demoPatient.conditions.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="h-8 w-px bg-slate-600" />
                  
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-400" />
                    <span className="text-red-300 text-sm">Allergies:</span>
                    {demoPatient.allergies.map((allergy, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-red-500/30 rounded-full text-xs text-red-200">
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={() => setShowPatientBanner(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          {activeModule === 'overview' ? (
            /* Full-width Overview Dashboard */
            <InterventionsOverview onNavigate={handleNavigateFromOverview} />
          ) : (
            /* Module View with Sidebar */
            <div className="flex gap-6">
              {/* Sidebar Navigation */}
              <div className="w-80 flex-shrink-0">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden sticky top-32">
                  <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-900">Intervention Modules</h3>
                    <p className="text-xs text-slate-500 mt-1">Select a module to view details</p>
                  </div>
                  
                  <div className="p-2">
                    {moduleConfigs.map((config) => {
                      const Icon = config.icon;
                      const isActive = activeModule === config.key;
                      
                      return (
                        <button
                          key={config.key}
                          onClick={() => setActiveModule(config.key)}
                          className={`w-full p-3 rounded-lg mb-1 transition-all text-left ${
                            isActive
                              ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg`
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              isActive ? 'bg-white/20' : 'bg-slate-100'
                            }`}>
                              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-600'} />
                            </div>
                            <div className="flex-1">
                              <p className={`font-medium ${isActive ? 'text-white' : 'text-slate-900'}`}>
                                {config.shortLabel}
                              </p>
                              <p className={`text-xs ${isActive ? 'text-white/70' : 'text-slate-500'}`}>
                                {config.description}
                              </p>
                            </div>
                            <ChevronRight size={16} className={isActive ? 'text-white/70' : 'text-slate-400'} />
                          </div>
                          
                          {/* Mini Stats */}
                          {config.key !== 'overview' && (
                            <div className={`flex items-center gap-3 mt-2 pt-2 border-t ${
                              isActive ? 'border-white/20' : 'border-slate-100'
                            }`}>
                              {config.stats.map((stat, idx) => (
                                <div key={idx} className="text-center">
                                  <p className={`text-sm font-bold ${
                                    isActive 
                                      ? 'text-white' 
                                      : stat.color || 'text-slate-700'
                                  }`}>
                                    {stat.value}
                                  </p>
                                  <p className={`text-xs ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                                    {stat.label}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Summary Card */}
                  <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 text-white m-2 rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Zap size={16} className="text-amber-400" />
                      AI Insights Summary
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">High-priority alerts</span>
                        <span className="font-bold text-red-400">4</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Care gaps identified</span>
                        <span className="font-bold text-amber-400">3</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Cost savings potential</span>
                        <span className="font-bold text-emerald-400">$385/mo</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Trial opportunities</span>
                        <span className="font-bold text-purple-400">3</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0">
                {activeModule === 'recommendations' && (
                  <ClinicalRecommendations
                    patientId={demoPatient.id}
                    patientName={demoPatient.name}
                  />
                )}
                
                {activeModule === 'orders' && (
                  <SmartOrderAssistant
                    patientId={demoPatient.id}
                    patientName={demoPatient.name}
                    patientAllergies={demoPatient.allergies}
                    patientMedications={demoPatient.medications}
                  />
                )}
                
                {activeModule === 'trials' && (
                  <ClinicalTrialsMatcher
                    patientId={demoPatient.id}
                    patientName={demoPatient.name}
                  />
                )}
                
                {activeModule === 'sdoh' && (
                  <SDOHDashboard
                    patientId={demoPatient.id}
                    patientName={demoPatient.name}
                  />
                )}
                
                {activeModule === 'medications' && (
                  <MedicationOptimizer
                    patientId={demoPatient.id}
                    patientName={demoPatient.name}
                  />
                )}
                
                {activeModule === 'coordination' && (
                  <CareCoordinationHub
                    providerId="provider-001"
                    providerName="Dr. Sarah Chen"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
          <div className="max-w-[1800px] mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock size={16} />
                  <span>Last updated: Just now</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle size={16} />
                  <span>All systems operational</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                  Export Report
                </button>
                <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                  Print Summary
                </button>
                <button className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2">
                  <Activity size={16} />
                  Review All Interventions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
