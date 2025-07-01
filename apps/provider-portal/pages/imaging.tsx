import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { 
  FileImage, Calendar, Download, Eye, Search, Filter, Plus, 
  ChevronDown, ChevronUp, X, Clock, Star, FileText, AlertTriangle,
  DollarSign, Lightbulb, ChevronLeft, Save, CheckCircle, Loader
} from 'lucide-react';

// Types
interface Order {
  id: string;
  name: string;
  description: string;
  priority: 'stat' | 'urgent' | 'routine';
  category: string;
  cost: number;
  duration: string;
  radiation?: string;
  contrast?: string;
  turnaround: string;
  contraindicated?: boolean;
  warningMessage?: string;
}

interface OrderCategory {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  orders: Order[];
}

interface PatientInfo {
  name: string;
  age: number;
  gender: string;
  mrn: string;
  chiefComplaint: string;
}

interface Study {
  name: string;
  category: string;
  modality: string;
  cost: number;
  description: string;
}

interface CustomOrder {
  id: string;
  name: string;
  description: string;
  cost: number;
  priority: string;
  type: 'search' | 'quick' | 'custom';
}

export default function Imaging() {
  // State
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['stat']));
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set(['ct-head-stat']));
  const [costs, setCosts] = useState({
    stat: 450,
    urgent: 0,
    routine: 0,
    additional: 0,
    total: 450
  });
  const [orderCounts, setOrderCounts] = useState({
    stat: 1,
    urgent: 0,
    routine: 0,
    additional: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);
  const [customFormData, setCustomFormData] = useState({
    name: '',
    indication: '',
    priority: 'routine',
    cost: 0
  });

  // Patient data
  const patient: PatientInfo = {
    name: 'Sarah Johnson',
    age: 32,
    gender: 'Female',
    mrn: '78932145',
    chiefComplaint: '"Worst headache of life" with confusion'
  };

  // Study database for search
  const studyDatabase: Study[] = [
    { name: "MRI Lumbar Spine", category: "musculoskeletal", modality: "mri", cost: 800, description: "Evaluate lower back pain and disc pathology" },
    { name: "CT Chest without Contrast", category: "thoracic", modality: "ct", cost: 400, description: "Screen for pulmonary nodules and lung disease" },
    { name: "Ultrasound Abdomen", category: "abdominal", modality: "ultrasound", cost: 200, description: "Evaluate abdominal organs and fluid" },
    { name: "MRI Shoulder", category: "musculoskeletal", modality: "mri", cost: 750, description: "Assess rotator cuff and joint pathology" },
    { name: "CT Sinus", category: "neurological", modality: "ct", cost: 350, description: "Evaluate sinusitis and nasal obstruction" },
    { name: "Nuclear Medicine Bone Scan", category: "musculoskeletal", modality: "nuclear", cost: 600, description: "Detect bone metastases and fractures" },
    { name: "MRI Knee", category: "musculoskeletal", modality: "mri", cost: 700, description: "Evaluate meniscal tears and ligament injury" },
    { name: "X-Ray Chest", category: "thoracic", modality: "xray", cost: 150, description: "Basic lung and heart evaluation" },
    { name: "CT Abdomen/Pelvis without Contrast", category: "abdominal", modality: "ct", cost: 600, description: "Evaluate abdominal pain without IV contrast" },
    { name: "Ultrasound Thyroid", category: "neurological", modality: "ultrasound", cost: 250, description: "Assess thyroid nodules and enlargement" }
  ];

  // Order categories with their studies
  const orderCategories: OrderCategory[] = [
    {
      id: 'stat',
      name: 'STAT Orders',
      subtitle: 'Immediate processing required',
      icon: <Clock className="w-5 h-5" />,
      iconBg: 'bg-gradient-to-r from-red-500 to-red-600',
      orders: [
        {
          id: 'ct-head-stat',
          name: 'CT Head without Contrast',
          description: 'Non-contrast CT of the head to rule out acute intracranial pathology including hemorrhage, mass effect, or acute stroke.',
          priority: 'stat',
          category: 'stat',
          cost: 450,
          duration: '15 minutes',
          radiation: '2 mSv',
          turnaround: '30 minutes'
        }
      ]
    },
    {
      id: 'urgent',
      name: 'Urgent Orders',
      subtitle: 'Priority processing within 2 hours',
      icon: <Star className="w-5 h-5" />,
      iconBg: 'bg-gradient-to-r from-orange-500 to-orange-600',
      orders: [
        {
          id: 'cta-head-neck',
          name: 'CTA Head and Neck',
          description: 'CT angiography of head and neck to evaluate for vascular abnormalities, aneurysms, or arterial dissection.',
          priority: 'urgent',
          category: 'urgent',
          cost: 750,
          duration: '20 minutes',
          radiation: '4 mSv',
          contrast: 'Yes (IV)',
          turnaround: '2 hours'
        },
        {
          id: 'mri-brain-contrast',
          name: 'MRI Brain with and without Contrast',
          description: 'High-resolution MRI to evaluate for structural abnormalities, inflammation, or vascular lesions.',
          priority: 'urgent',
          category: 'urgent',
          cost: 900,
          duration: '45 minutes',
          radiation: 'None',
          contrast: 'Gadolinium',
          turnaround: '2-4 hours'
        }
      ]
    },
    {
      id: 'routine',
      name: 'Routine Orders',
      subtitle: 'Standard processing within 24 hours',
      icon: <FileText className="w-5 h-5" />,
      iconBg: 'bg-gradient-to-r from-indigo-500 to-purple-600',
      orders: [
        {
          id: 'ct-routine-migraine',
          name: 'CT Head for Routine Migraine',
          description: 'Routine CT imaging for uncomplicated migraine evaluation.',
          priority: 'routine',
          category: 'routine',
          cost: 450,
          duration: '15 minutes',
          radiation: '2 mSv',
          turnaround: '24 hours',
          contraindicated: true,
          warningMessage: 'Not Indicated'
        },
        {
          id: 'mrv',
          name: 'MRV (Magnetic Resonance Venography)',
          description: 'Specialized MRI to evaluate cerebral venous system for thrombosis or other venous abnormalities.',
          priority: 'routine',
          category: 'routine',
          cost: 650,
          duration: '30 minutes',
          radiation: 'None',
          turnaround: '24 hours'
        }
      ]
    }
  ];

  // Quick action items
  const quickActions = [
    { id: 'order-labs', icon: '🧪', label: 'Order Labs', action: '/labs' },
    { id: 'prescribe', icon: '💊', label: 'E-Prescribe', action: '/medications' },
    { id: 'referral', icon: '👥', label: 'Refer', action: '#' },
    { id: 'imaging', icon: '🔍', label: 'Order Imaging', action: '/imaging' },
    { id: 'followup', icon: '📅', label: 'Schedule Follow-up', action: '#' },
    { id: 'education', icon: '📚', label: 'Patient Education', action: '#' }
  ];

  // Common quick-add studies
  const quickAddStudies = [
    { icon: '🫁', name: 'CT Chest PE Protocol', description: 'Pulmonary embolism evaluation', cost: 650 },
    { icon: '🦴', name: 'MRI Cervical Spine', description: 'Neck pain evaluation', cost: 850 },
    { icon: '🏥', name: 'CT Abdomen/Pelvis', description: 'Abdominal pain workup', cost: 750 },
    { icon: '❤️', name: 'Echocardiogram', description: 'Cardiac function assessment', cost: 400 }
  ];

  // Toggle category expansion
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

  // Toggle all categories
  const toggleAllCategories = () => {
    if (expandedCategories.size === orderCategories.length + 1) {
      setExpandedCategories(new Set());
    } else {
      setExpandedCategories(new Set([...orderCategories.map(c => c.id), 'additional']));
    }
  };

  // Toggle order selection
  const toggleOrder = (order: Order) => {
    if (order.contraindicated) {
      showNotification('⚠️ Routine migraine imaging not indicated with current red flag symptoms. Emergency evaluation required.', 'warning');
      return;
    }

    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      const categoryType = order.category;
      
      if (newSet.has(order.id)) {
        newSet.delete(order.id);
        updateCosts(categoryType, -order.cost);
        updateOrderCounts(categoryType, -1);
      } else {
        newSet.add(order.id);
        updateCosts(categoryType, order.cost);
        updateOrderCounts(categoryType, 1);
      }
      
      return newSet;
    });
  };

  // Update costs
  const updateCosts = (category: string, amount: number) => {
    setCosts(prev => {
      const newCosts = { ...prev };
      newCosts[category as keyof typeof costs] = Math.max(0, prev[category as keyof typeof costs] + amount);
      newCosts.total = newCosts.stat + newCosts.urgent + newCosts.routine + newCosts.additional;
      return newCosts;
    });
  };

  // Update order counts
  const updateOrderCounts = (category: string, change: number) => {
    setOrderCounts(prev => ({
      ...prev,
      [category]: Math.max(0, prev[category as keyof typeof orderCounts] + change)
    }));
  };

  // Show notification
  const showNotification = (message: string, type: 'success' | 'warning' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Add quick order
  const addQuickOrder = (study: typeof quickAddStudies[0]) => {
    const newOrder: CustomOrder = {
      id: `quick_${Date.now()}`,
      name: study.name,
      description: study.description,
      cost: study.cost,
      priority: 'routine',
      type: 'quick'
    };
    
    setCustomOrders(prev => [...prev, newOrder]);
    updateCosts('additional', study.cost);
    updateOrderCounts('additional', 1);
    showNotification(`Added "${study.name}" to orders`, 'success');
  };

  // Search studies
  const searchStudies = () => {
    if (!searchQuery.trim()) return [];
    
    return studyDatabase.filter(study => 
      study.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Add custom order
  const handleAddCustomOrder = () => {
    if (!customFormData.name || !customFormData.indication) {
      showNotification('Please fill in required fields', 'warning');
      return;
    }

    const newOrder: CustomOrder = {
      id: `custom_${Date.now()}`,
      name: customFormData.name,
      description: customFormData.indication,
      cost: customFormData.cost,
      priority: customFormData.priority,
      type: 'custom'
    };

    setCustomOrders(prev => [...prev, newOrder]);
    updateCosts('additional', customFormData.cost);
    updateOrderCounts('additional', 1);
    showNotification(`Added custom order "${customFormData.name}"`, 'success');
    
    // Clear form
    setCustomFormData({
      name: '',
      indication: '',
      priority: 'routine',
      cost: 0
    });
  };

  // Remove custom order
  const removeCustomOrder = (orderId: string) => {
    const order = customOrders.find(o => o.id === orderId);
    if (order) {
      setCustomOrders(prev => prev.filter(o => o.id !== orderId));
      updateCosts('additional', -order.cost);
      updateOrderCounts('additional', -1);
      showNotification('Order removed', 'info');
    }
  };

  // Submit orders
  const submitOrders = async () => {
    const totalOrders = Object.values(orderCounts).reduce((sum, count) => sum + count, 0);
    
    if (totalOrders === 0) {
      showNotification('Please select at least one imaging study', 'warning');
      return;
    }

    const hasStatOrders = orderCounts.stat > 0;
    if (hasStatOrders) {
      if (!confirm('STAT imaging orders will be processed immediately. Radiology will be notified for urgent scheduling. Continue?')) {
        return;
      }
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSubmitting(false);
    
    if (hasStatOrders) {
      showNotification('STAT imaging orders submitted! Radiology notified for immediate scheduling.', 'success');
    } else {
      showNotification(`${totalOrders} imaging orders submitted successfully`, 'success');
    }
  };

  // Get budget alert message
  const getBudgetAlert = () => {
    if (costs.total > 1000) {
      return { message: '⚠️ High cost alert: Consider clinical necessity of all selected studies', color: 'text-red-600' };
    } else if (costs.total > 500) {
      return { message: '💡 Consider stepwise approach: Start with most essential study', color: 'text-yellow-600' };
    } else {
      return { message: '💡 Consider stepwise approach: Start with CT, add MRI if clinically indicated', color: 'text-green-600' };
    }
  };

  const budgetAlert = getBudgetAlert();

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Notification */}
        {notification && (
          <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all transform ${
            notification.type === 'success' ? 'bg-green-500' :
            notification.type === 'warning' ? 'bg-yellow-500' :
            notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
          } text-white`}>
            {notification.message}
          </div>
        )}

        {/* Patient Banner */}
        <div className="bg-white shadow-sm mx-6 mt-6 rounded-2xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                {patient.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{patient.name}</h2>
                <p className="text-gray-600">
                  {patient.age} y/o {patient.gender} • MRN: {patient.mrn} • Chief Complaint: {patient.chiefComplaint}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Review Complete Chart
              </button>
              <button 
                onClick={toggleAllCategories}
                className="px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                {expandedCategories.size === orderCategories.length + 1 ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Expand All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="mx-6 mt-4 flex gap-2 bg-indigo-50 p-3 rounded-lg overflow-x-auto">
          {quickActions.map(action => (
            <button
              key={action.id}
              className={`flex items-center gap-2 px-4 py-2 bg-white border-2 rounded-lg text-sm font-medium transition-all hover:border-indigo-500 hover:shadow-md ${
                action.id === 'imaging' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
              }`}
              onClick={() => action.action.startsWith('/') ? window.location.href = action.action : null}
            >
              <span>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="space-y-4">
            {/* Order Categories */}
            {orderCategories.map(category => (
              <div
                key={category.id}
                className={`bg-white rounded-xl shadow-sm border transition-all ${
                  expandedCategories.has(category.id) ? 'shadow-md' : ''
                }`}
              >
                <div
                  className="p-6 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 ${category.iconBg} rounded-lg flex items-center justify-center text-white`}>
                        {category.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                        <p className="text-sm text-gray-600">{category.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {orderCounts[category.id as keyof typeof orderCounts]} selected
                      </span>
                      <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${
                        expandedCategories.has(category.id) ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </div>
                </div>

                {expandedCategories.has(category.id) && (
                  <div className="p-6 space-y-3">
                    {category.orders.map(order => (
                      <div
                        key={order.id}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          order.contraindicated 
                            ? 'border-red-300 bg-red-50 cursor-not-allowed' 
                            : selectedOrders.has(order.id)
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-indigo-500 hover:shadow-sm'
                        }`}
                        onClick={() => toggleOrder(order)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(order.id)}
                            disabled={order.contraindicated}
                            className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-green-500"
                            onChange={() => {}}
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{order.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{order.description}</p>
                            
                            {order.contraindicated && order.warningMessage && (
                              <div className="mt-2 inline-flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded-md text-sm font-semibold">
                                <AlertTriangle className="w-4 h-4" />
                                {order.warningMessage}
                              </div>
                            )}

                            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500 font-medium">Priority:</span>
                                <span className="ml-2 text-gray-900 font-semibold uppercase">{order.priority}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 font-medium">Duration:</span>
                                <span className="ml-2 text-gray-900 font-semibold">{order.duration}</span>
                              </div>
                              {order.radiation && (
                                <div>
                                  <span className="text-gray-500 font-medium">Radiation:</span>
                                  <span className="ml-2 text-gray-900 font-semibold">{order.radiation}</span>
                                </div>
                              )}
                              {order.contrast && (
                                <div>
                                  <span className="text-gray-500 font-medium">Contrast:</span>
                                  <span className="ml-2 text-gray-900 font-semibold">{order.contrast}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-500 font-medium">Turnaround:</span>
                                <span className="ml-2 text-gray-900 font-semibold">{order.turnaround}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Additional Orders Section */}
            <div className={`bg-white rounded-xl shadow-sm border transition-all ${
              expandedCategories.has('additional') ? 'shadow-md' : ''
            }`}>
              <div
                className="p-6 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleCategory('additional')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Additional Orders</h3>
                      <p className="text-sm text-gray-600">Search and add custom imaging studies</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {orderCounts.additional} selected
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${
                      expandedCategories.has('additional') ? 'rotate-180' : ''
                    }`} />
                  </div>
                </div>
              </div>

              {expandedCategories.has('additional') && (
                <div className="p-6">
                  {/* Search Section */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">Search Imaging Studies</h4>
                    <p className="text-sm text-gray-600 mb-4">Find additional studies from our comprehensive database</p>
                    
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by body part, study type, or indication..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Filter className="w-4 h-4" />
                        Filters
                      </button>
                    </div>

                    {/* Search Results */}
                    {searchQuery && (
                      <div className="mt-4">
                        <h5 className="font-medium text-gray-900 mb-2">
                          Search Results ({searchStudies().length} studies found)
                        </h5>
                        <div className="space-y-2">
                          {searchStudies().map(study => (
                            <div
                              key={study.name}
                              className="border border-gray-200 rounded-lg p-3 hover:border-indigo-500 hover:shadow-sm cursor-pointer transition-all"
                              onClick={() => {
                                const newOrder: CustomOrder = {
                                  id: `search_${Date.now()}`,
                                  name: study.name,
                                  description: study.description,
                                  cost: study.cost,
                                  priority: 'routine',
                                  type: 'search'
                                };
                                setCustomOrders(prev => [...prev, newOrder]);
                                updateCosts('additional', study.cost);
                                updateOrderCounts('additional', 1);
                                showNotification(`Added "${study.name}" to orders`, 'success');
                                setSearchQuery('');
                              }}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h6 className="font-medium text-gray-900">{study.name}</h6>
                                  <p className="text-sm text-gray-600">{study.description}</p>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">${study.cost}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Add Common Studies */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">Commonly Ordered Studies</h4>
                    <p className="text-sm text-gray-600 mb-4">Quick access to frequently requested imaging</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {quickAddStudies.map(study => (
                        <button
                          key={study.name}
                          onClick={() => addQuickOrder(study)}
                          className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:shadow-sm transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{study.icon}</span>
                            <div>
                              <h5 className="font-medium text-gray-900">{study.name}</h5>
                              <p className="text-sm text-gray-600">{study.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Order Entry */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">Custom Order Entry</h4>
                    <p className="text-sm text-gray-600 mb-4">Add specialized or unlisted imaging studies</p>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="customName" className="block text-sm font-medium text-gray-700 mb-1">
                            Study Name*
                          </label>
                          <input
                            type="text"
                            id="customName"
                            value={customFormData.name}
                            onChange={(e) => setCustomFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., MRI Brain with Spectroscopy"
                          />
                        </div>
                        <div>
                          <label htmlFor="customPriority" className="block text-sm font-medium text-gray-700 mb-1">
                            Priority
                          </label>
                          <select
                            id="customPriority"
                            value={customFormData.priority}
                            onChange={(e) => setCustomFormData(prev => ({ ...prev, priority: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="routine">Routine</option>
                            <option value="urgent">Urgent</option>
                            <option value="stat">STAT</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="customIndication" className="block text-sm font-medium text-gray-700 mb-1">
                          Clinical Indication*
                        </label>
                        <textarea
                          id="customIndication"
                          value={customFormData.indication}
                          onChange={(e) => setCustomFormData(prev => ({ ...prev, indication: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          rows={3}
                          placeholder="Provide clinical indication and any special instructions..."
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="customCost" className="block text-sm font-medium text-gray-700 mb-1">
                            Estimated Cost
                          </label>
                          <input
                            type="number"
                            id="customCost"
                            value={customFormData.cost}
                            onChange={(e) => setCustomFormData(prev => ({ ...prev, cost: parseInt(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="0"
                            min="0"
                            step="50"
                          />
                        </div>
                        <div className="flex items-end gap-3">
                          <button
                            type="button"
                            onClick={() => setCustomFormData({ name: '', indication: '', priority: 'routine', cost: 0 })}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={handleAddCustomOrder}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                          >
                            Add Order
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Added Custom Orders */}
                  {customOrders.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Added Custom Orders</h4>
                      <div className="space-y-2">
                        {customOrders.map(order => (
                          <div
                            key={order.id}
                            className="border-2 border-green-500 bg-green-50 rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-900">{order.name}</h5>
                                <p className="text-sm text-gray-600 mt-1">{order.description}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm">
                                  <span className="text-gray-500">Priority: <span className="font-semibold text-gray-900 uppercase">{order.priority}</span></span>
                                  <span className="text-gray-500">Cost: <span className="font-semibold text-gray-900">${order.cost}</span></span>
                                  <span className="text-gray-500">Type: <span className="font-semibold text-gray-900">{order.type}</span></span>
                                </div>
                              </div>
                              <button
                                onClick={() => removeCustomOrder(order.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-semibold"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section - Cost Tracker and AI Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Cost Tracker */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Cost Tracker</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">STAT Orders</span>
                  <span className="font-semibold text-gray-900">${costs.stat}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Urgent Orders</span>
                  <span className="font-semibold text-gray-900">${costs.urgent}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Routine Orders</span>
                  <span className="font-semibold text-gray-900">${costs.routine}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Additional Orders</span>
                  <span className="font-semibold text-gray-900">${costs.additional}</span>
                </div>
                <div className="pt-3 border-t-2 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-medium text-gray-700">Total Estimated Cost</span>
                    <span className="text-xl font-bold text-indigo-600">${costs.total}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className={`text-sm font-medium ${budgetAlert.color}`}>
                  {budgetAlert.message}
                </p>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Clinical Insights</h3>
              </div>
              
              <div className="space-y-3">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-1">🎯 Recommended Approach</h4>
                  <p className="text-sm text-green-700">
                    Start with non-contrast CT head (STAT) to rule out emergent pathology. Consider CTA if vascular etiology suspected based on clinical presentation.
                  </p>
                </div>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-900 mb-1">⚠️ Cost Optimization</h4>
                  <p className="text-sm text-yellow-700">
                    Evidence-based stepwise approach prevents unnecessary imaging. Current selection aligns with emergency medicine guidelines.
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-1">📊 Risk Stratification</h4>
                  <p className="text-sm text-blue-700">
                    Red flag symptoms (visual changes + oral contraceptives) warrant urgent neuroimaging. Consider CVT with negative initial CT.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
            <div className="flex justify-center gap-4">
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium"
              >
                <ChevronLeft className="w-5 h-5" />
                Back to Diagnosis
              </button>
              
              <button
                onClick={() => showNotification('Draft saved successfully', 'success')}
                className="px-6 py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-2 font-medium"
              >
                <Save className="w-5 h-5" />
                Save Draft
              </button>
              
              <button
                onClick={submitOrders}
                disabled={isSubmitting || Object.values(orderCounts).reduce((sum, count) => sum + count, 0) === 0}
                className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 font-medium ${
                  isSubmitting || Object.values(orderCounts).reduce((sum, count) => sum + count, 0) === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {orderCounts.stat > 0 ? 'Submit STAT Orders' : 'Submit Orders'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
