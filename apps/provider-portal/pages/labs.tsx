import React, { useState } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { TestTube, AlertTriangle, TrendingUp, Download, Eye, Search, Filter, Plus, ChevronDown, ChevronUp, Brain, Clock, DollarSign, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface LabTest {
  code: string;
  name: string;
  description: string;
  priority: 'STAT' | 'Routine' | 'Consider';
  cost: number;
  category: string;
  selected: boolean;
  rationale: string;
}

interface LabCategory {
  id: string;
  title: string;
  subtitle: string;
  type: 'critical' | 'info' | 'caution';
  expanded: boolean;
  labCount: number;
  timeEstimate: string;
}

export default function Labs() {
  const [selectedLabs, setSelectedLabs] = useState<Set<string>>(new Set(['CBC-DIFF', 'CMP', 'hCG-U', 'ESR', 'CRP', 'TSH', 'LFT']));
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['critical']));
  const [showCosts, setShowCosts] = useState(true);
  const [orderMode, setOrderMode] = useState(false);

  const labCategories: Record<string, LabCategory> = {
    critical: {
      id: 'critical',
      title: 'STAT - Urgent Evaluation',
      subtitle: 'Critical labs for immediate assessment',
      type: 'critical',
      expanded: true,
      labCount: 5,
      timeEstimate: '~15 min'
    },
    routine: {
      id: 'routine',
      title: 'Routine Workup',
      subtitle: 'Standard evaluation tests',
      type: 'info',
      expanded: false,
      labCount: 3,
      timeEstimate: '~45 min'
    },
    risk: {
      id: 'risk',
      title: 'Risk Factor Assessment',
      subtitle: 'Screening and monitoring tests',
      type: 'caution',
      expanded: false,
      labCount: 4,
      timeEstimate: '~60 min'
    }
  };

  const labTests: Record<string, LabTest> = {
    'CBC-DIFF': {
      code: 'CBC-DIFF',
      name: 'Complete Blood Count with Differential',
      description: 'Comprehensive blood analysis including WBC, RBC, hemoglobin, hematocrit, and platelet count',
      priority: 'STAT',
      cost: 24,
      category: 'critical',
      selected: true,
      rationale: 'Essential for detecting infection, anemia, or hematologic disorders'
    },
    'CMP': {
      code: 'CMP',
      name: 'Comprehensive Metabolic Panel',
      description: 'Electrolytes, glucose, kidney and liver function tests',
      priority: 'STAT',
      cost: 18,
      category: 'critical',
      selected: true,
      rationale: 'Critical for identifying metabolic derangements and organ dysfunction'
    },
    'hCG-U': {
      code: 'hCG-U',
      name: 'Pregnancy Test (Urine hCG)',
      description: 'Qualitative urine pregnancy test',
      priority: 'STAT',
      cost: 12,
      category: 'critical',
      selected: true,
      rationale: 'Essential before imaging and medication administration'
    },
    'ESR': {
      code: 'ESR',
      name: 'Erythrocyte Sedimentation Rate',
      description: 'Non-specific inflammatory marker',
      priority: 'STAT',
      cost: 15,
      category: 'critical',
      selected: true,
      rationale: 'Screens for inflammatory conditions and temporal arteritis'
    },
    'CRP': {
      code: 'CRP',
      name: 'C-Reactive Protein',
      description: 'Acute phase reactant for inflammation',
      priority: 'STAT',
      cost: 16,
      category: 'critical',
      selected: true,
      rationale: 'More sensitive than ESR for acute inflammation'
    },
    'TSH': {
      code: 'TSH',
      name: 'Thyroid Stimulating Hormone',
      description: 'Thyroid function screening',
      priority: 'Routine',
      cost: 22,
      category: 'routine',
      selected: true,
      rationale: 'Thyroid disorders can contribute to various symptoms'
    },
    'UA-MICRO': {
      code: 'UA-MICRO',
      name: 'Urinalysis with Microscopy',
      description: 'Complete urine analysis',
      priority: 'Routine',
      cost: 14,
      category: 'routine',
      selected: false,
      rationale: 'Screens for kidney disease and urinary tract infections'
    },
    'LFT': {
      code: 'LFT',
      name: 'Liver Function Tests',
      description: 'ALT, AST, bilirubin, alkaline phosphatase',
      priority: 'Routine',
      cost: 28,
      category: 'routine',
      selected: true,
      rationale: 'Baseline hepatic function assessment'
    },
    'LIPID': {
      code: 'LIPID',
      name: 'Lipid Panel',
      description: 'Cholesterol, HDL, LDL, triglycerides',
      priority: 'Consider',
      cost: 31,
      category: 'risk',
      selected: false,
      rationale: 'Cardiovascular risk assessment'
    },
    'B12': {
      code: 'B12',
      name: 'Vitamin B12 Level',
      description: 'B12 deficiency screening',
      priority: 'Consider',
      cost: 38,
      category: 'risk',
      selected: false,
      rationale: 'Can cause neurological symptoms and fatigue'
    },
    'MG': {
      code: 'MG',
      name: 'Magnesium Level',
      description: 'Serum magnesium',
      priority: 'Consider',
      cost: 19,
      category: 'risk',
      selected: false,
      rationale: 'Low magnesium linked to various symptoms'
    },
    'HBA1C': {
      code: 'HBA1C',
      name: 'Hemoglobin A1C',
      description: 'Three-month glucose average',
      priority: 'Consider',
      cost: 25,
      category: 'risk',
      selected: false,
      rationale: 'Diabetes screening and monitoring'
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const toggleLab = (labCode: string) => {
    setSelectedLabs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(labCode)) {
        newSet.delete(labCode);
      } else {
        newSet.add(labCode);
      }
      return newSet;
    });
  };

  const getSelectedStats = () => {
    const selected = Array.from(selectedLabs);
    const statCount = selected.filter(code => labTests[code]?.priority === 'STAT').length;
    const totalCost = selected.reduce((sum, code) => sum + (labTests[code]?.cost || 0), 0);
    return { total: selected.length, stat: statCount, cost: totalCost };
  };

  const stats = getSelectedStats();

  const getCategoryColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-500';
      case 'info': return 'bg-blue-500';
      case 'caution': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'STAT': return 'bg-red-100 text-red-800';
      case 'Routine': return 'bg-blue-100 text-blue-800';
      case 'Consider': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TestTube className="w-8 h-8 text-green-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Laboratory Orders</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    {orderMode ? 'Select tests to order' : 'View results and order new tests'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setOrderMode(!orderMode)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  {orderMode ? 'View Results' : 'Order Labs'}
                </button>
                {orderMode && (
                  <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Order {stats.total} Selected Labs
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {orderMode ? (
            <>
              {/* AI Lab Orders Dashboard */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">AI Lab Orders Dashboard</h2>
                      <p className="text-sm text-gray-500">BioMistral AI recommendations based on clinical presentation</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showCosts"
                      checked={showCosts}
                      onChange={(e) => setShowCosts(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <label htmlFor="showCosts" className="text-sm text-gray-600">Show Costs</label>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-600">{stats.total}</div>
                    <div className="text-sm text-gray-600">Total Labs</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{stats.stat}</div>
                    <div className="text-sm text-gray-600">STAT Priority</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">~15</div>
                    <div className="text-sm text-gray-600">Min to Results</div>
                  </div>
                  {showCosts && (
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">${stats.cost}</div>
                      <div className="text-sm text-gray-600">Est. Cost</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lab Categories */}
              {Object.entries(labCategories).map(([categoryId, category]) => {
                const categoryLabs = Object.values(labTests).filter(lab => lab.category === categoryId);
                const isExpanded = expandedCategories.has(categoryId);

                return (
                  <div key={categoryId} className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
                    <div
                      className={`p-4 cursor-pointer ${getCategoryColor(category.type)} text-white`}
                      onClick={() => toggleCategory(categoryId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                            <TestTube className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{category.title}</h3>
                            <p className="text-sm opacity-90">{category.subtitle}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span>{category.labCount} Labs</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4" />
                            <span>{category.timeEstimate}</span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-gray-50 space-y-3">
                        {categoryLabs.map(lab => (
                          <div
                            key={lab.code}
                            className={`bg-white rounded-lg border-2 ${
                              selectedLabs.has(lab.code) ? 'border-indigo-500' : 'border-gray-200'
                            } transition-all`}
                          >
                            <div className="p-4">
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedLabs.has(lab.code)}
                                  onChange={() => toggleLab(lab.code)}
                                  className="mt-1 rounded text-indigo-600"
                                />
                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-gray-900">{lab.name}</h4>
                                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{lab.code}</span>
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1">{lab.description}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 ml-4">
                                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(lab.priority)}`}>
                                        {lab.priority}
                                      </span>
                                      {showCosts && (
                                        <span className="text-sm text-gray-500">${lab.cost}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-3 flex items-start gap-2 bg-blue-50 p-3 rounded">
                                    <Brain className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-blue-900">
                                      <span className="font-semibold">AI Rationale:</span> {lab.rationale}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Additional Lab Orders */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Plus className="w-6 h-6 text-purple-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Additional Lab Orders</h3>
                      <p className="text-sm text-gray-500">Search and add custom laboratory tests</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search for additional tests..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                    Search
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Results View */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Results</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">12</p>
                    </div>
                    <div className="bg-yellow-100 p-3 rounded-lg">
                      <TestTube className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Critical Values</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">3</p>
                    </div>
                    <div className="bg-red-100 p-3 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Abnormal Results</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">8</p>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Today's Results</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">24</p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg">
                      <TestTube className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search labs..."
                      className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <select className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500">
                    <option>All Tests</option>
                    <option>Chemistry</option>
                    <option>Hematology</option>
                    <option>Microbiology</option>
                    <option>Immunology</option>
                  </select>
                  <select className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500">
                    <option>All Results</option>
                    <option>Critical Only</option>
                    <option>Abnormal Only</option>
                    <option>Normal</option>
                  </select>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <Filter className="w-4 h-4 mr-2" />
                    More Filters
                  </button>
                </div>
              </div>

              {/* Results Table */}
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Test Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Result
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference Range
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date/Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">John Doe</div>
                          <div className="text-sm text-gray-500">MRN: 123456</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">Troponin I</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-red-600">2.5 ng/mL</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">&lt; 0.04 ng/mL</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">Today, 3:45 PM</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Critical High
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
