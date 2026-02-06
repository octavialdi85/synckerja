import React from 'react';
import { LoadingDots } from '@/components/LoadingDots';

interface DashboardLoadingWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
}

export const DashboardLoadingWrapper: React.FC<DashboardLoadingWrapperProps> = ({ 
  isLoading, 
  children 
}) => {
  // Always render layout so header/tabs/grid appear immediately; show loading overlay on content area only
  return (
    <div className="relative flex-1 min-h-0 flex flex-col w-full">
      {children}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 dark:bg-gray-900/80 z-10 rounded-lg">
          <LoadingDots size="lg" />
        </div>
      )}
    </div>
  );
};

