// ============================================================
// Final Dashboard Implementation
// apps/provider-portal/pages/index.final.tsx
//
// Clean implementation using:
// - Widget Registry for configuration
// - useDashboard hook for state management
// - Lazy loading for performance
// - Cross-device sync
// - Widget customizer
// ============================================================

import React, { Suspense, lazy, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useDashboard } from '@/hooks/useDashboard';
import { DASHBOARD_WIDGETS, WIDGET_CATEGORIES, WidgetCategory } from '@/lib/dashboardWidgets';
import { CardSkeleton } from '@attending/ui-primitives';
import { 
  Plus, 
  X, 
  Check, 
  Search, 
  ChevronDown,
  Settings2,
  RotateCcw
} from 'lucide-react';

// ============================================================
// Lazy-loaded Components
// ============================================================

const ResponsiveDashboardGrid = lazy(() => 
  import('@/components/dashboard/ResponsiveDashboardGrid').then(mod => ({
    default: mod.ResponsiveDashboardGrid
  }))
);

// Create lazy widget components from registry
const LazyWidgets = Object.fromEntries(
  Object.values(DASHBOARD_WIDGETS).map(widget => [
    widget.id,
    lazy(widget.component)
  ])
);

// ============================================================
// Widget Customizer Modal
// ============================================================

interface WidgetCustomizerProps {
  enabledWidgets: string[];
  onToggleWidget: (id: string) => void;
  onClose: () => void;
  onReset: () => void;
}

const WidgetCustomizer: React.FC<WidgetCustomizerProps> = ({
  enabledWidgets,
  onToggleWidget,
  onClose,
  onReset,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedCategory, setExpandedCategory] = React.useState<WidgetCategory | null>('core');

  const categories = Object.keys(WIDGET_CATEGORIES) as WidgetCategory[];
  const allWidgets = Object.values(DASHBOARD_WIDGETS);

  const filteredWidgets = searchQuery
    ? allWidgets.filter(w =>
        w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Settings2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Customize Dashboard</h2>
              <p className="text-sm text-gray-500">Add or remove widgets from your dashboard</p>
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
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>
        </div>

        {/* Widget List */}
        <div className="flex-1 overflow-auto p-4">
          {filteredWidgets ? (
            <div className="space-y-2">
              {filteredWidgets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No widgets found matching "{searchQuery}"
                </div>
              ) : (
                filteredWidgets.map(widget => (
                  <WidgetToggleRow
                    key={widget.id}
                    widget={widget}
                    isEnabled={enabledWidgets.includes(widget.id)}
                    onToggle={() => onToggleWidget(widget.id)}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map(category => {
                const categoryWidgets = allWidgets.filter(w => w.category === category);
                const enabledCount = categoryWidgets.filter(w => enabledWidgets.includes(w.id)).length;
                
                return (
                  <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {WIDGET_CATEGORIES[category].label}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                          {enabledCount}/{categoryWidgets.length}
                        </span>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedCategory === category ? 'rotate-180' : ''
                      }`} />
                    </button>
                    {expandedCategory === category && (
                      <div className="p-2 space-y-1 bg-white">
                        {categoryWidgets.map(widget => (
                          <WidgetToggleRow
                            key={widget.id}
                            widget={widget}
                            isEnabled={enabledWidgets.includes(widget.id)}
                            onToggle={() => onToggleWidget(widget.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {enabledWidgets.length} widgets enabled
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Widget toggle row component
const WidgetToggleRow: React.FC<{
  widget: typeof DASHBOARD_WIDGETS[string];
  isEnabled: boolean;
  onToggle: () => void;
}> = ({ widget, isEnabled, onToggle }) => {
  const Icon = widget.icon;
  
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
        isEnabled 
          ? 'bg-purple-50 border-2 border-purple-200 shadow-sm' 
          : 'hover:bg-gray-50 border-2 border-transparent'
      }`}
    >
      <div className={`p-2.5 rounded-lg transition-colors ${
        isEnabled ? 'bg-purple-100' : 'bg-gray-100'
      }`}>
        <Icon className={`w-5 h-5 ${widget.iconColor}`} />
      </div>
      <div className="flex-1 text-left">
        <div className="font-medium text-gray-900">{widget.title}</div>
        <div className="text-sm text-gray-500 line-clamp-1">{widget.description}</div>
      </div>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
        isEnabled ? 'bg-purple-600 scale-100' : 'bg-gray-200 scale-90'
      }`}>
        {isEnabled && <Check className="w-4 h-4 text-white" />}
      </div>
    </button>
  );
};

// ============================================================
// Dashboard Grid Skeleton
// ============================================================

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-24 bg-gray-200 rounded-xl" />
      ))}
    </div>
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 bg-gray-200 rounded-xl" />
      ))}
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 h-80 bg-gray-200 rounded-xl" />
      <div className="h-80 bg-gray-200 rounded-xl" />
    </div>
  </div>
);

// ============================================================
// Main Dashboard Component
// ============================================================

const STORAGE_KEY = 'provider-dashboard-final';

export default function Dashboard() {
  const {
    enabledWidgetIds,
    enabledWidgets,
    isCustomizerOpen,
    toggleWidget,
    openCustomizer,
    closeCustomizer,
    resetWidgets,
    handleLayoutChange,
  } = useDashboard({
    storageKey: STORAGE_KEY,
    enableSync: true,
  });

  // Build card configs for the grid
  const dashboardCards = useMemo(() => 
    enabledWidgets.map(widget => ({
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
    })),
    [enabledWidgets]
  );

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm border-b sticky top-16 z-10">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Provider Dashboard</h1>
                <p className="text-sm text-gray-500">
                  COMPASS AI has prepared clinical insights for your review
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Customize Button */}
                <button
                  onClick={openCustomizer}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Customize
                </button>
                
                {/* Status Badges */}
                <div className="hidden sm:flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse" />
                    COMPASS Active
                  </span>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2 animate-pulse" />
                    BioMistral Ready
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Suspense fallback={<DashboardSkeleton />}>
            <ResponsiveDashboardGrid
              cards={dashboardCards}
              storageKey={STORAGE_KEY}
              rowHeight={80}
              enableSync={true}
              onLayoutChange={handleLayoutChange}
            />
          </Suspense>
        </div>

        {/* Widget Customizer Modal */}
        {isCustomizerOpen && (
          <WidgetCustomizer
            enabledWidgets={enabledWidgetIds}
            onToggleWidget={toggleWidget}
            onClose={closeCustomizer}
            onReset={resetWidgets}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
