# Dashboard Grid System Implementation Guide

## Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
cd apps/provider-portal
npm install react-grid-layout@1.4.4 @types/react-grid-layout
```

### 2. CSS Already Configured

The CSS imports have been added to `_app.tsx`:
```tsx
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
```

Custom styles are in `styles/globals.css`.

### 3. Components Created

Two grid components are available:

| Component | File | Use Case |
|-----------|------|----------|
| `DashboardGrid` | `components/dashboard/DashboardGrid.tsx` | Basic resizable/draggable |
| `ResponsiveDashboardGrid` | `components/dashboard/ResponsiveDashboardGrid.tsx` | Full-featured with breakpoints |

### 4. Switch to New Dashboard

Rename files to activate:
```bash
# Backup current
mv pages/index.tsx pages/index.backup.tsx

# Use new version
mv pages/index.new.tsx pages/index.tsx
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard Page                           │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              ResponsiveDashboardGrid                  │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │ │
│  │  │  CardWrapper │ │  CardWrapper │ │  CardWrapper │    │ │
│  │  │  (draggable) │ │  (draggable) │ │  (draggable) │    │ │
│  │  │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │     │ │
│  │  │ │StatCards│ │ │ │AIInsight│ │ │ │ Queue   │ │     │ │
│  │  │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │     │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘     │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature Comparison

| Feature | Basic Grid | Responsive Grid |
|---------|------------|-----------------|
| Drag & Drop | ✅ | ✅ |
| Resize | ✅ | ✅ |
| Layout Persistence | ✅ | ✅ |
| Responsive Breakpoints | ❌ | ✅ |
| Lock Mode | ❌ | ✅ |
| Fullscreen Cards | ✅ | ✅ |
| Hide/Show Cards | ✅ | ✅ |
| Per-breakpoint Layouts | ❌ | ✅ |

---

## Configuration Reference

### Card Configuration

```typescript
const cardConfig: CardConfig = {
  id: 'unique-id',
  title: 'Card Title',
  component: <YourComponent />,
  icon: <YourIcon className="w-4 h-4" />,
  layouts: {
    lg: { x: 0, y: 0, w: 6, h: 4 },  // Desktop (1200px+)
    md: { x: 0, y: 0, w: 5, h: 4 },  // Tablet landscape (996px+)
    sm: { x: 0, y: 0, w: 6, h: 4 },  // Tablet portrait (768px+)
    xs: { x: 0, y: 0, w: 4, h: 4 },  // Mobile (480px+)
  },
  minW: 3,    // Minimum width (columns)
  minH: 2,    // Minimum height (rows)
  maxW: 12,   // Maximum width
  maxH: 10,   // Maximum height
  category: 'clinical',  // For grouping
};
```

### Grid Properties

| Property | Default | Description |
|----------|---------|-------------|
| `storageKey` | 'dashboard' | localStorage key prefix |
| `rowHeight` | 80 | Height of each row in pixels |
| `columns` (basic) | 12 | Number of grid columns |

### Breakpoints (Responsive Grid)

| Breakpoint | Width | Columns |
|------------|-------|---------|
| `lg` | 1200px+ | 12 |
| `md` | 996px+ | 10 |
| `sm` | 768px+ | 6 |
| `xs` | 480px+ | 4 |

---

## Best Practices

### Card Sizing Guidelines

| Card Type | Recommended Size | Min Size |
|-----------|-----------------|----------|
| Stat Cards | w: 12, h: 2 | w: 6, h: 2 |
| Data Tables | w: 8, h: 5 | w: 4, h: 3 |
| Charts | w: 6, h: 4 | w: 4, h: 3 |
| Quick Actions | w: 4, h: 3 | w: 3, h: 2 |
| AI Insights | w: 4, h: 5 | w: 3, h: 3 |

### Make Cards Responsive Internally

Your card components should handle their container size gracefully:

```tsx
// Good: Responsive card content
const PatientQueue = () => (
  <div className="h-full flex flex-col overflow-hidden">
    <div className="flex-shrink-0 p-4 border-b">
      {/* Fixed header */}
    </div>
    <div className="flex-1 overflow-auto">
      {/* Scrollable content */}
    </div>
  </div>
);
```

### Performance Tips

- Use `React.memo` for card components
- Avoid heavy re-renders on resize
- Layout saves are already debounced

---

## User Controls

### Keyboard Shortcuts (Future Enhancement)

| Shortcut | Action |
|----------|--------|
| `L` | Toggle lock mode |
| `R` | Reset layout |
| `F` | Toggle fullscreen (focused card) |

### Mouse Controls

- **Drag**: Click and hold on card header (grip icon)
- **Resize**: Drag corner handles
- **Fullscreen**: Click maximize button (appears on hover)
- **Hide**: Click eye-off button (appears on hover)

---

## Storage Schema

Layout is persisted to localStorage with this structure:

```typescript
{
  version: '2.0',
  layouts: {
    lg: [...Layout],
    md: [...Layout],
    sm: [...Layout],
    xs: [...Layout],
  },
  hidden: ['card-id-1', 'card-id-2'],
  ts: 1705315200000
}
```

Key format: `grid-{storageKey}`

---

## Troubleshooting

### Cards not dragging?
- Ensure `.drag-handle` class is on the drag area
- Check `isLocked` state isn't true
- Verify CSS is imported in `_app.tsx`

### Layout not saving?
- Check localStorage permissions
- Verify `storageKey` is unique per dashboard
- Clear old layouts: `localStorage.removeItem('grid-{key}')`

### Cards overlapping?
- Set `compactType="vertical"` (default)
- Ensure all cards have valid positions
- Check `minW/minH` constraints match grid size

### Resize handles not showing?
- Hover over card to reveal handles
- Check CSS in `globals.css` is present
- Ensure `isResizable` prop is true (not locked)

---

## Files Modified/Created

```
apps/provider-portal/
├── components/dashboard/
│   ├── DashboardGrid.tsx         # NEW - Basic grid
│   └── ResponsiveDashboardGrid.tsx # NEW - Full-featured grid
├── pages/
│   ├── index.tsx                 # Updated with CSS imports
│   └── index.new.tsx             # NEW - Grid-based dashboard
├── styles/
│   └── globals.css               # Updated with grid styles
└── pages/
    └── _app.tsx                  # Updated with CSS imports
```

---

## Migration Checklist

- [ ] Install dependencies: `npm install react-grid-layout @types/react-grid-layout`
- [ ] Verify CSS imports in `_app.tsx`
- [ ] Test basic grid functionality
- [ ] Rename `index.new.tsx` to `index.tsx` when ready
- [ ] Test on different screen sizes
- [ ] Verify localStorage persistence
- [ ] Test lock/unlock functionality
- [ ] Test hide/show cards
- [ ] Test fullscreen mode
