import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

export interface EmployeeGrowthData {
  month: string;
  count: number;
  date: string;
}

export interface FeatureUsageData {
  feature: string;
  usage: number;
  total_access: number;
  unique_users: number;
}

export interface CostAnalysisData {
  current_monthly: number;
  annual_projection: number;
  total_spent: number;
  average_monthly: number;
  cost_per_employee: number;
  potential_savings: number;
}

export interface SubscriptionAnalytics {
  employee_growth: EmployeeGrowthData[];
  feature_usage: FeatureUsageData[];
  cost_analysis: CostAnalysisData;
  payment_trends: Array<{
    month: string;
    amount: number;
    transaction_count: number;
  }>;
  usage_metrics: {
    employee_utilization_percentage: number;
    plan_efficiency_score: number;
    growth_rate: number;
  };
}

export const useSubscriptionAnalytics = () => {
  const { organizationId } = useCurrentOrg();

  const {
    data: analytics,
    isLoading,
    error,
    refetch,
    isError,
  } = useQuery({
    queryKey: ['subscription-analytics', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization ID');

      // Get employee growth data (last 6 months)
      const { data: employeeGrowth, error: employeeError } = await supabase
        .from('employees')
        .select('created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      if (employeeError) throw employeeError;

      // Process employee growth data
      const growthByMonth = employeeGrowth?.reduce((acc, emp: any) => {
        const monthKey = new Date(emp.created_at).toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        });
        acc[monthKey] = (acc[monthKey] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const employee_growth: EmployeeGrowthData[] = Object.entries(growthByMonth).map(([month, count]) => ({
        month: month.split(' ')[0], // Just month name
        count,
        date: month
      }));

      // Get current employee count
      const { count: employeeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      const cost_analysis: CostAnalysisData = {
        current_monthly: 0,
        annual_projection: 0,
        total_spent: 0,
        average_monthly: 0,
        cost_per_employee: 0,
        potential_savings: 0
      };

      // Get real feature usage data from activities
      const { data: activityData } = await supabase
        .from('activities')
        .select('activity_type')
        .eq('organization_id', organizationId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Process activity data to get feature usage
      const activityCounts = activityData?.reduce((acc, activity: any) => {
        const type = activity.activity_type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const feature_usage: FeatureUsageData[] = Object.entries(activityCounts).map(([type, count]) => ({
        feature: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        usage: count,
        total_access: count,
        unique_users: Math.min(count, employeeCount || 0)
      })).slice(0, 5); // Top 5 features

      // Add default features if no activity data
      if (feature_usage.length === 0) {
        feature_usage.push(
          { feature: 'Employee Management', usage: employeeCount || 0, total_access: employeeCount || 0, unique_users: employeeCount || 0 },
          { feature: 'Attendance Tracking', usage: Math.floor((employeeCount || 0) * 0.9), total_access: Math.floor((employeeCount || 0) * 0.9), unique_users: Math.floor((employeeCount || 0) * 0.9) },
          { feature: 'Reports & Analytics', usage: Math.floor((employeeCount || 0) * 0.3), total_access: Math.floor((employeeCount || 0) * 0.3), unique_users: Math.floor((employeeCount || 0) * 0.3) }
        );
      }

      // Get real payment trends data from organization subscriptions
      const { data: subscriptionData } = await supabase
        .from('organization_subscriptions')
        .select('created_at, updated_at')
        .eq('organization_id', organizationId)
        .gte('created_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true });

      // Create payment trends based on subscription activity
      const payment_trends = subscriptionData?.map((sub: any) => ({
        month: new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short' }),
        amount: 0, // Will be calculated from plan pricing later
        transaction_count: 1
      })) || [];

      // Calculate usage metrics
      const employeeUtilizationPercentage = employeeCount ? Math.min(100, (employeeCount / 1000) * 100) : 0;
      const planEfficiencyScore = Math.min(100, employeeUtilizationPercentage * 1.2);
      const firstCount = employee_growth.length > 0 ? employee_growth[0].count : 0;
      const growthRate =
        employee_growth.length > 1 && firstCount !== 0
          ? ((employee_growth[employee_growth.length - 1].count - firstCount) / firstCount) * 100
          : 0;

      const usage_metrics = {
        employee_utilization_percentage: employeeUtilizationPercentage,
        plan_efficiency_score: planEfficiencyScore,
        growth_rate: growthRate
      };

      const result: SubscriptionAnalytics = {
        employee_growth,
        feature_usage,
        cost_analysis,
        payment_trends,
        usage_metrics
      };

      return result;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache for analytics
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    refetchOnMount: false, // Disable mount refetch to use cache
    refetchOnWindowFocus: false, // Disable focus refetch
    retry: 1,
  });

  return {
    analytics,
    isLoading,
    error,
    refetch,
    isError,
  };
};