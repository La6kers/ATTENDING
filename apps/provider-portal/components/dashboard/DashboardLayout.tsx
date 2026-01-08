import React, { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * DashboardLayout provides consistent styling for dashboard pages.
 * Note: Navigation is now handled at the _app.tsx level.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
