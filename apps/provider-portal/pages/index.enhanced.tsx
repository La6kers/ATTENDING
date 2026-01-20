// ============================================================
// Enhanced Dashboard with Lazy Loading, Widget Registry & Sync
// apps/provider-portal/pages/index.enhanced.tsx
//
// Features:
// - Lazy loading for all dashboard cards
// - Widget registry for easy configuration
// - Real-time sync across devices
// - Customizable layout with persistence
// ============================================================

import React, { 
  Suspense, 
  useMemo, 
  useState, 
  useCallback, 
  useEffect,
  lazy 
} from 'react';
import { Layouts, Layout } from 'react-grid-layout';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { 
  DASHBOARD_WIDGETS, 
  getDefaultEnabledWidgets,
  getAllWidgets,
  getWidgetsByCategory,
  WidgetConfig,
  WIDGET_CATEGORIES,
  WidgetCategory
} from '../lib/dashboardWidgets';
import { useDashboardSync } from '../lib/dashboardSync';
import { CardSkeleton } from '@attending/ui-primitives';
import { 
  Settings2, 
  Plus, 
  X, 
  Check,
  Search,
  ChevronDown
} from 'lucide-react';

// ============================================================
// Lazy-loaded Widget Components
// ============================================================

// Create lazy components from widget registry
const LazyWidgets: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {};

Object.values(DASHBOARD_WIDGETS).forEach(widget => {
  LazyWidgets[widget.id] = lazy(widget.component);
});

// ============================================================
// Dynamic Responsive Grid Import (also lazy)
// ============================================================

const ResponsiveDashboardGrid = lazy(() => 
  import('../components/dashboard/ResponsiveDashboardGrid').then(mod => ({
    default: mod.ResponsiveDashboardGrid
  }))
);

// ============================================================
// Widget Customization Modal
// ============================================================

interface WidgetCustomizerProps {
  enabledWidgets: string[];
  onToggleWidget: (widgetId: string) => void;
  onClose: () => void;
}

const WidgetCustomizer: React.FC<WidgetCustomizerProps> = ({
  enabledWidgets,
  onToggleWidget,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<WidgetCategory | null>('core');

  const filteredWidgets = useMemo(() => {
    if (!searchQuery) return null;
    const query = searchQuery.toLowerCase();
    return getAllWidgets().filter(w => 
      w.title.toLowerCase().includes(query) ||
      w.description.toLowerCase().includes(query) ||
      w.tags?.some(t => t.includes(query))
    );
  }, [searchQuery]);

  const categories = Object.keys(WIDGET_CATEGORIES) as WidgetCategory[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Settings2 className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Customize Dashboard</h2>
              <p className="text-sm text-gray-500">Choose which widgets to display</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Widget List */}
        <div className="flex-1 overflow-auto p-4">
          {filteredWidgets ? (
            // Search Results
            <div className="space-y-2">
              {filteredWidgets.map(widget => (
                <WidgetToggleItem
                  key={widget.id}
                  widget={widget}
                  isEnabled={enabledWidgets.includes(widget.id)}
                  onToggle={() => onToggleWidget(widget.id)}
                />
              ))}
              {filteredWidgets.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No widgets found matching "{searchQuery}"
                </p>
              )}
            </div>
          ) : (
            // Categories
            <div className="space-y-2">
              {categories.map(category => (
                <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(
                      expandedCategory === category ? null : category
                    )}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <span className="font-medium text-gray-900">
                        {WIDGET_CATEGORIES[category].label}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({getWidgetsByCategory(category).length} widgets)
                      </span>
                    </div>
                    <ChevronDown 
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedCategory === category ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>
                  {expandedCategory === category && (
                    <div className="p-2 space-y-1 bg-white">
                      {getWidgetsByCategory(category).map(widget => (
                        <WidgetToggleItem
                          key={widget.id}
                          widget={widget}
                          isEnabled={enabledWidgets.includes(widget.id)}
                          onToggle={() => onToggleWidget(widget.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {enabledWidgets.length} widgets enabled
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// Individual widget toggle item
const WidgetToggleItem: React.FC<{
  widget: WidgetConfig;
  isEnabled: boolean;
  onToggle: () => void;
}> = ({ widget, isEnabled, onToggle }) => {
  const Icon = widget.icon;
  
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
        isEnabled 
          ? 'bg-purple-50 border border-purple-200' 
          : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      <div className={`p-2 rounded-lg ${isEnabled ? 'bg-purple-100' : 'bg-gray-100'}`}>
        <Icon className={`w-5 h-5 ${widget.iconColor}`} />
      </div>
      <div className="flex-1 text-left">
        <div className="font-medium text-gray-900">{widget.title}</div>
        <div className="text-sm text-gray-500">{widget.description}</div>
      </div>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
        isEnabled ? 'bg-purple-600' : 'bg-gray-200'
      }`}>
        {isEnabled && <Check className="w-4 h-4 text-white" />}
      </div>
    </button>
  );
};

// ============================================================
// Main Dashboard Component
// ============================================================

const STORAGE_KEY = 'provider-dashboard-v3';

export default function EnhancedDashboard() {
  // State for enabled widgets
  const [enabledWidgetIds, setEnabledWidgetIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return getDefaultEnabledWidgets().map(w => w.id);
    }
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-widgets`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return getDefaultEnabledWidgets().map(w => w.id);
  });

  const [showCustomizer, setShowCustomizer] = useState(false);
  const [layouts, setLayouts] = useState<Layouts | null>(null);

  // Dashboard sync hook
  const { broadcastChange } = useDashboardSync({
    storageKey: STORAGE_KEY,
    onExternalChange: (newLayouts, hidden) => {
      console.log('[Dashboard] Received external layout change');
      setLayouts(newLayouts);
      // Update hidden widgets
      const newEnabled = getAllWidgets()
        .map(w => w.id)
        .filter(id => !hidden.includes(id));
      setEnabledWidgetIds(newEnabled);
    },
    enabled: true,
  });

  // Save enabled widgets to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-widgets`, JSON.stringify(enabledWidgetIds));
  }, [enabledWidgetIds]);

  // Handle widget toggle
  const handleToggleWidget = useCallback((widgetId: string) => {
    setEnabledWidgetIds(prev => {
      if (prev.includes(widgetId)) {
        return prev.filter(id => id !== widgetId);
      }
      return [...prev, widgetId];
    });
  }, []);

  // Handle layout change - broadcast to other devices
  const handleLayoutChange = useCallback((newLayouts: Layouts, hiddenWidgets: string[]) => {
    setLayouts(newLayouts);
    broadcastChange(newLayouts, hiddenWidgets);
  }, [broadcastChange]);

  // Build card configs from enabled widgets
  const dashboardCards = useMemo(() => {
    return enabledWidgetIds
      .map(id => DASHBOARD_WIDGETS[id])
      .filter(Boolean)
      .map(widget => ({
        id: widget.id,
        title: widget.title,
        icon: <widget.icon className={`w-4 h-4 ${widget.iconColor}`} />,
        component: (
          <Suspense fallback={<CardSkeleton height="100%" showHeader={false} lines={4} />}>
            {React.createElement(LazyWidgets[widget.id])}
          </Suspense>
        ),
        layouts: widget.defaultLayout,
        minW: widget.minW,
        minH: widget.minH,
        maxW: widget.maxW,
        maxH: widget.maxH,
        category: widget.category,
      }));
  }, [enabledWidgetIds]);

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Provider Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Welcome back, Dr. Reed. COMPASS AI has prepared clinical insights for your review.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {/* Customize Button */}
                <button
                  onClick={() => setShowCustomizer(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Widgets
                </button>
                
                {/* Status Indicators */}
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                  COMPASS Active
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2 animate-pulse" />
                  BioMistral-7B Ready
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Resizable Grid with Lazy Loading */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Suspense fallback={<DashboardGridSkeleton />}>
            <ResponsiveDashboardGrid
              cards={dashboardCards}
              storageKey={STORAGE_KEY}
              rowHeight={80}
            />
          </Suspense>
        </div>

        {/* Widget Customizer Modal */}
        {showCustomizer && (
          <WidgetCustomizer
            enabledWidgets={enabledWidgetIds}
            onToggleWidget={handleToggleWidget}
            onClose={() => setShowCustomizer(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// ============================================================
// Dashboard Grid Skeleton (for initial load)
// ============================================================

const DashboardGridSkeleton: React.FC = () => (
  <div className="space-y-4">
    {/* Stats Row */}
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
      ))}
    </div>
    
    {/* Quick Access Row */}
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
      ))}
    </div>
    
    {/* Main Content */}
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 h-80 bg-gray-200 rounded-xl animate-pulse" />
      <div className="h-80 bg-gray-200 rounded-xl animate-pulse" />
    </div>
    
    {/* Secondary Content */}
    <div className="grid grid-cols-2 gap-4">
      <div className="h-96 bg-gray-200 rounded-xl animate-pulse" />
      <div className="h-96 bg-gray-200 rounded-xl animate-pulse" />
    </div>
  </div>
);
