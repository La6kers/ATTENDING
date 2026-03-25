// ============================================================
// Recommendation Category Utilities
// components/shared/recommendation-utils.ts
//
// Shared types and utilities for AI recommendation categorization
// Previously from @attending/clinical-types, now local to avoid package issues
// ============================================================

// =============================================================================
// Types
// =============================================================================

export type RecommendationCategory = 'critical' | 'recommended' | 'consider' | 'not-indicated' | 'avoid';

// =============================================================================
// Category Configuration
// =============================================================================

export const RECOMMENDATION_CATEGORY_CONFIGS: Record<RecommendationCategory, {
  title: string;
  description: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  badgeColor: string;
  buttonColor: string;
}> = {
  critical: {
    title: 'Critical - Order Immediately',
    description: 'These are essential based on red flag symptoms',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-700',
    buttonColor: 'bg-red-600 hover:bg-red-700',
  },
  recommended: {
    title: 'Strongly Recommended',
    description: 'High clinical value based on presentation',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-700',
    buttonColor: 'bg-green-600 hover:bg-green-700',
  },
  consider: {
    title: 'Consider Ordering',
    description: 'May provide additional clinical insight',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    badgeColor: 'bg-yellow-100 text-yellow-700',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
  },
  'not-indicated': {
    title: 'Not Indicated',
    description: 'Not clinically indicated for this presentation',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-500',
    badgeColor: 'bg-gray-100 text-gray-600',
    buttonColor: 'bg-gray-500 hover:bg-gray-600',
  },
  avoid: {
    title: 'Avoid',
    description: 'May cause harm or is contraindicated',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    iconColor: 'text-red-700',
    badgeColor: 'bg-red-200 text-red-800',
    buttonColor: 'bg-red-700 hover:bg-red-800',
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Groups AI recommendations by their category
 * @param items Array of items with a category property
 * @returns Object with category keys and arrays of matching items
 */
export function groupRecommendationsByCategory<T extends { category: string }>(
  items: T[]
): Record<RecommendationCategory, T[]> {
  const categories: RecommendationCategory[] = ['critical', 'recommended', 'consider', 'not-indicated', 'avoid'];
  
  // Initialize all categories as empty arrays
  const result = categories.reduce((acc, category) => {
    acc[category] = [];
    return acc;
  }, {} as Record<RecommendationCategory, T[]>);
  
  // Group items by category
  for (const item of items) {
    const cat = item.category as RecommendationCategory;
    if (result[cat]) {
      result[cat].push(item);
    }
  }
  
  return result;
}

/**
 * Gets the configuration for a specific category
 */
export function getCategoryConfig(category: RecommendationCategory) {
  return RECOMMENDATION_CATEGORY_CONFIGS[category];
}

/**
 * Checks if a category is actionable (can be ordered)
 */
export function isActionableCategory(category: RecommendationCategory): boolean {
  return category === 'critical' || category === 'recommended' || category === 'consider';
}
