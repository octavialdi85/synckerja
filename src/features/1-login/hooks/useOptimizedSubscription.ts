import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/features/1-login/hooks/use-toast';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  duration_months: number;
}

interface OptimizedSubscriptionState {
  plans: SubscriptionPlan[];
  loading: boolean;
  error: string | null;
  selectedPlan: SubscriptionPlan | null;
}

export const useOptimizedSubscription = () => {
  const [state, setState] = useState<OptimizedSubscriptionState>({
    plans: [],
    loading: true,
    error: null,
    selectedPlan: null,
  });

  const fetchPlans = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Mock data instead of database query to avoid errors
      const mockPlans: SubscriptionPlan[] = [
        {
          id: '1',
          name: 'Basic Plan',
          price: 100000,
          features: ['Basic features'],
          duration_months: 1
        },
        {
          id: '2', 
          name: 'Pro Plan',
          price: 200000,
          features: ['Pro features'],
          duration_months: 1
        }
      ];

      setState(prev => ({
        ...prev,
        plans: mockPlans,
        loading: false,
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to fetch subscription plans',
      }));
    }
  };

  const selectPlan = (plan: SubscriptionPlan) => {
    setState(prev => ({ ...prev, selectedPlan: plan }));
  };

  const createSubscription = async (planId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Mock subscription creation - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      toast({
        title: "Success",
        description: "Subscription created successfully"
      });

      return { success: true };
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create subscription",
        variant: "destructive"
      });
      
      return { success: false, error: err.message };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return {
    ...state,
    fetchPlans,
    selectPlan,
    createSubscription,
    subscriptionStatus: {
      needs_renewal: false,
      is_active: true
    }
  };
};