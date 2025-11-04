import React from 'react';
import { Skeleton } from '@/features/ui/skeleton';
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
      <div className="space-y-4">
        {/* Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          {[...Array(4)].map((_, index) => (
            <Card key={index}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {[...Array(5)].map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

