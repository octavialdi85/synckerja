import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { LoadingDots } from '@/components/LoadingDots';
import {
  getContentPlansQueryOptions,
  getMasterDataQueryOptions,
  getDigitalMarketingEmployeesQueryOptions,
} from '../data/dashboardQueryOptions';

interface DashboardDataPreloaderProps {
  children: React.ReactNode;
}

/**
 * Prefetches all critical dashboard queries once in parallel, then renders children.
 * Children's hooks (useOptimizedSocialMediaData, useDigitalMarketingEmployees) read from cache,
 * so no duplicate fetches and one smooth loading phase.
 */
export const DashboardDataPreloader: React.FC<DashboardDataPreloaderProps> = ({ children }) => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!organizationId) {
      setReady(false);
      return;
    }
    let cancelled = false;
    const opts = {
      contentPlans: getContentPlansQueryOptions(organizationId),
      master: getMasterDataQueryOptions(organizationId),
      employees: getDigitalMarketingEmployeesQueryOptions(organizationId),
    };
    Promise.all([
      queryClient.prefetchQuery({ queryKey: opts.contentPlans.queryKey, queryFn: opts.contentPlans.queryFn }),
      queryClient.prefetchQuery({ queryKey: opts.master.queryKey, queryFn: opts.master.queryFn }),
      queryClient.prefetchQuery({ queryKey: opts.employees.queryKey, queryFn: opts.employees.queryFn }),
    ])
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, queryClient]);

  if (!organizationId || !ready) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-100">
        <LoadingDots size="lg" />
      </div>
    );
  }

  return <>{children}</>;
};
