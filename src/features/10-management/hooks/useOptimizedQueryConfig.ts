
import { QueryClient } from '@tanstack/react-query';

// Enhanced query configuration with better performance
export const createOptimizedQueryConfig = () => ({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes
      retry: (failureCount: number, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: false, // Selaraskan App.tsx: hindari refetch massal saat online lagi
      // Enhanced performance settings
      networkMode: 'online' as const,
    },
    mutations: {
      retry: 1,
      networkMode: 'online' as const,
      gcTime: 5 * 60 * 1000,
    },
  },
});

// Consistent query keys to prevent cache fragmentation
export const optimizedQueryKeys = {
  user: {
    data: (userId: string) => ['userData', userId] as const,
    role: (userId: string) => ['userRole', userId] as const,
    organizations: (userId: string) => ['userOrganizations', userId] as const,
  },
  organization: {
    active: (userId: string) => ['activeOrganization', userId] as const,
    details: (orgId: string) => ['organizationDetails', orgId] as const,
  },
  employees: {
    list: (orgId: string) => ['employees', orgId] as const,
    detail: (empId: string) => ['employee', empId] as const,
  },
  recruitment: {
    links: ['recruitmentLinks'] as const,
    jobs: ['recruitmentJobs'] as const,
  },
  subscription: {
    status: (orgId: string) => ['subscriptionStatus', orgId] as const,
    plans: ['subscriptionPlans'] as const,
  },
} as const;

// Export queryKeys for backward compatibility
export const queryKeys = optimizedQueryKeys;
