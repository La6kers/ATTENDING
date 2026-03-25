// ============================================================
// Dashboard Grid System with Resizable/Reorderable Cards
// apps/provider-portal/components/dashboard/DashboardGrid.tsx
//
// Uses react-grid-layout for drag-drop and resize functionality
// Persists layout to localStorage for user preferences
// ============================================================

import type { ReactNode } from 'react';
import React, { useState, useCallback, useMemo } from 'react';
import type { Layout } from 'react-grid-layout';
import GridLayout from 'react-grid-layout';
import { GripVertical, Maximize2, Minimize2, X, RotateCcw, Lock, Unlock } from 'lucide-react';

// ============================================================
// Types
// ============================================================

export interface DashboardCardConfig {
  id: string;
  title: string;
  component: ReactNode;
  defaultLayout: { x: number; y: number; w: number; h: number };
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  isStatic?: boolean; // Prevents dragging/resizing
}

interface DashboardGridProps {
  cards: DashboardCardConfig[];
  storageKey?: string;
  columns?: number;
  rowHeight?: number;
  margin?: [number, number];
  onLayoutChange?: (layout: Layout[]) => void;
}

// ============================================================
// Card Wrapper Component
// ============================================================

interface CardWrapperProps {
  title: string;
  children: ReactNode;
  isFullscreen: boolean;
  isLocked: boolean;
  onToggleFullscreen: () => void;
  onHide: () => void;
}

const CardWrapper: React.FC<CardWrapperProps> = ({
  title,
  children,
  isFullscreen,
  isLocked,
  onToggleFullscreen,
  onHide,
}) => {
  return (
    <div className={`
      h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden
      ${isFullscreen ? 'fixed inset-4 z-50' : ''}
    `}>
      {/* Card Header - Drag Handle */}
      <div className="card-header flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 cursor-move">
        <div className="flex items-center gap-2">
          {!isLocked && <GripVertical className="w-4 h-4 text-gray-400" />}
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onHide}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
            title="Hide card"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Card Content */}
      <div className="flex-1 overflow-auto p-4">
        {children}
      </div>
    </div>
  );
};

// ============================================================
// Main Dashboard Grid Component
// ============================================================

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  cards,
  storageKey = 'dashboard-layout',
  columns = 12,
  rowHeight = 100,
  margin = [16, 16],
  onLayoutChange,
}) => {
  // Load saved layout from localStorage
  const loadSavedLayout = (): Layout[] | null => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  // Generate default layout from card configs
  const defaultLayout: Layout[] = cards.map((card) => ({
    i: card.id,
    x: card.defaultLayout.x,
    y: card.defaultLayout.y,
    w: card.defaultLayout.w,
    h: card.defaultLayout.h,
    minW: card.minW ?? 2,
    minH: card.minH ?? 2,
    maxW: card.maxW,
    maxH: card.maxH,
    static: card.isStatic,
  }));

  const [layout, setLayout] = useState<Layout[]>(loadSavedLayout() || defaultLayout);
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(new Set());
  const [fullscreenCard, setFullscreenCard] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Handle layout changes
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout);
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(newLayout));
    }
    onLayoutChange?.(newLayout);
  }, [storageKey, onLayoutChange]);

  // Toggle card visibility
  const toggleCardVisibility = useCallback((cardId: string) => {
    setHiddenCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  // Reset layout to default
  const resetLayout = useCallback(() => {
    setLayout(defaultLayout);
    setHiddenCards(new Set());
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  }, [defaultLayout, storageKey]);

  // Filter visible cards
  const visibleCards = useMemo(
    () => cards.filter((card) => !hiddenCards.has(card.id)),
    [cards, hiddenCards]
  );

  const visibleLayout = useMemo(
    () => layout.filter((item) => !hiddenCards.has(item.i)),
    [layout, hiddenCards]
  );

  // Calculate grid width (assuming parent is full width)
  const [containerWidth, setContainerWidth] = useState(1200);
  
  React.useEffect(() => {
    const updateWidth = () => {
      const container = document.getElementById('dashboard-grid-container');
      if (container) {
        setContainerWidth(container.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <div id="dashboard-grid-container" className="w-full">
      {/* Control Bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isLocked 
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isLocked ? (
              <>
                <Lock className="w-4 h-4" />
                Locked
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                Unlocked
              </>
            )}
          </button>
          <button
            onClick={resetLayout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Layout
          </button>
        </div>

        {/* Hidden Cards Restoration */}
        {hiddenCards.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Hidden:</span>
            {Array.from(hiddenCards).map((cardId) => {
              const card = cards.find((c) => c.id === cardId);
              return card ? (
                <button
                  key={cardId}
                  onClick={() => toggleCardVisibility(cardId)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-teal-100 text-gray-600 hover:text-teal-700 rounded transition-colors"
                >
                  + {card.title}
                </button>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Grid */}
      <GridLayout
        className="layout"
        layout={visibleLayout}
        cols={columns}
        rowHeight={rowHeight}
        width={containerWidth}
        margin={margin}
        onLayoutChange={handleLayoutChange}
        isDraggable={!isLocked}
        isResizable={!isLocked}
        draggableHandle=".card-header"
        useCSSTransforms={true}
      >
        {visibleCards.map((card) => (
          <div key={card.id}>
            <CardWrapper
              title={card.title}
              isFullscreen={fullscreenCard === card.id}
              isLocked={isLocked}
              onToggleFullscreen={() => 
                setFullscreenCard(fullscreenCard === card.id ? null : card.id)
              }
              onHide={() => toggleCardVisibility(card.id)}
            >
              {card.component}
            </CardWrapper>
          </div>
        ))}
      </GridLayout>

      {/* Fullscreen Overlay */}
      {fullscreenCard && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setFullscreenCard(null)}
        />
      )}
    </div>
  );
};

export default DashboardGrid;
