import { memo } from 'react';

interface OverviewSidebarFooterProps {
  activeEmployees: number;
  totalFeatures: number;
}

export const OverviewSidebarFooter = memo(({ 
  activeEmployees, 
  totalFeatures 
}: OverviewSidebarFooterProps) => {
  return (
    <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Active Employees: {activeEmployees}
        </span>
        <span className="text-xs text-gray-400">
          Total Features: {totalFeatures}
        </span>
      </div>
    </div>
  );
});

OverviewSidebarFooter.displayName = 'OverviewSidebarFooter';

