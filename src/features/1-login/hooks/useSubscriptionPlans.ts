import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  base_price_per_member: number;
  features: string[];
  is_active: boolean;
  is_custom: boolean;
  demo_required: boolean;
  annual_discount_percentage: number | null;
  member_discount_tiers: any[] | null;
  jumlah_hari_trial: number | null;
}

export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      console.log('🔍 Fetching subscription plans from database...');
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('base_price_per_member', { ascending: true });

      if (error) {
        console.error('❌ Subscription plans error:', error);
        throw error;
      }
      
      console.log('✅ Subscription plans loaded:', data?.length, data);
      return data as SubscriptionPlan[];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - plans don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 2,
  });
};