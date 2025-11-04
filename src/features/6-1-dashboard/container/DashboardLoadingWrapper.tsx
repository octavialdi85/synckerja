import React from 'react';
import { LoadingDots } from '@/components/LoadingDots';
import { Card, CardContent } from '@/features/ui/card';

interface DashboardLoadingWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
}

export const DashboardLoadingWrapper: React.FC<DashboardLoadingWrapperProps> = ({ 
  isLoading, 
  children 
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] w-full">
        <LoadingDots size="lg" />
      </div>
    );
  }

  return <>{children}</>;
};

