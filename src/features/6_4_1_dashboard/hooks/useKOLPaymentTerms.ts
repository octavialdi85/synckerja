import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/organized/utils';
import { useToast } from '@/hooks/organized/utils';

export const useKOLPaymentTerms = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch payment terms with KOL names
  const { data: paymentTerms, isLoading } = useQuery({
    queryKey: ['kol-payment-terms', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('kol_payment_terms')
        .select(`
          *,
          kol_profiles(id, name, email),
          kol_content_posts(id, title, post_url)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create payment term
  const createPaymentTerm = useMutation({
    mutationFn: async (data: any) => {
      const paymentTermData = {
        ...data,
        organization_id: organizationId,
        type: data.type || 'agreement',
        campaign_id: data.campaign_id || null,
        kol_profile_id: data.kol_profile_id || null,
        milestones: data.milestones || [],
        effective_start_date: data.effective_start_date || null,
        effective_end_date: data.effective_end_date || null,
        template_name: data.template_name || null,
      };
      
      // Insert payment terms and return the created row to get its id
      const { data: inserted, error } = await supabase
        .from('kol_payment_terms')
        .insert(paymentTermData)
        .select()
        .single();
      
      if (error) throw error;

      // Sync performance thresholds into dedicated table for easier querying
      try {
        const thresholds = data.performance_thresholds;
        const rows: any[] = [];
        const common = {
          organization_id: organizationId,
          payment_terms_id: inserted.id,
          kol_content_post_id: inserted.kol_content_post_id || null,
          kol_profile_id: inserted.kol_profile_id || null,
          campaign_id: inserted.campaign_id || null,
          is_active: true,
          description: null as string | null,
        };

        const pushRow = (metric: string, value: any, bonus?: any) => {
          if (value !== undefined && value !== null && !Number.isNaN(Number(value))) {
            rows.push({
              ...common,
              metric_type: metric,
              target_value: Number(value),
              bonus_percentage: bonus ? Number(bonus) : 0,
            });
          }
        };

        if (Array.isArray(thresholds)) {
          thresholds.forEach((t: any) => pushRow(String(t.metric).toLowerCase(), t.threshold, t.bonus_percentage));
        } else if (thresholds && typeof thresholds === 'object') {
          pushRow('reach', thresholds.target_reach, thresholds.reach_bonus_percentage);
          pushRow('engagement', thresholds.target_engagement, thresholds.engagement_bonus_percentage);
          pushRow('conversion', thresholds.target_conversions ?? thresholds.target_conversion, thresholds.conversion_bonus_percentage);
          pushRow('views', thresholds.target_views, thresholds.views_bonus_percentage);
          pushRow('clicks', thresholds.target_clicks, thresholds.clicks_bonus_percentage);
          pushRow('saves', thresholds.target_saves, thresholds.saves_bonus_percentage);
          pushRow('shares', thresholds.target_shares, thresholds.shares_bonus_percentage);
          pushRow('comments', thresholds.target_comments, thresholds.comments_bonus_percentage);
          pushRow('likes', thresholds.target_likes, thresholds.likes_bonus_percentage);
        }

        if (rows.length > 0) {
          const { error: thErr } = await supabase
            .from('kol_performance_thresholds')
            .insert(rows);
          if (thErr) console.error('Failed to sync performance thresholds:', thErr);
        }
      } catch (e) {
        console.error('Error while syncing thresholds:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kol-payment-terms'] });
      toast({
        title: "Success",
        description: "Payment term created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create payment term",
        variant: "destructive",
      });
    }
  });

  // Update payment term
  const updatePaymentTerm = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const { error } = await supabase
        .from('kol_payment_terms')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;

      // If thresholds provided, resync to thresholds table
      if (data && Object.prototype.hasOwnProperty.call(data, 'performance_thresholds')) {
        try {
          // Remove existing rows for this payment term
          await supabase
            .from('kol_performance_thresholds')
            .delete()
            .eq('payment_terms_id', id)
            .eq('organization_id', organizationId);

          const thresholds = data.performance_thresholds;
          const rows: any[] = [];
          const common = {
            organization_id: organizationId,
            payment_terms_id: id,
            kol_content_post_id: data.kol_content_post_id || null,
            kol_profile_id: data.kol_profile_id || null,
            campaign_id: data.campaign_id || null,
            is_active: true,
            description: null as string | null,
          };

          const pushRow = (metric: string, value: any, bonus?: any) => {
            if (value !== undefined && value !== null && !Number.isNaN(Number(value))) {
              rows.push({
                ...common,
                metric_type: metric,
                target_value: Number(value),
                bonus_percentage: bonus ? Number(bonus) : 0,
              });
            }
          };

          if (Array.isArray(thresholds)) {
            thresholds.forEach((t: any) => pushRow(String(t.metric).toLowerCase(), t.threshold, t.bonus_percentage));
          } else if (thresholds && typeof thresholds === 'object') {
            pushRow('reach', thresholds.target_reach, thresholds.reach_bonus_percentage);
            pushRow('engagement', thresholds.target_engagement, thresholds.engagement_bonus_percentage);
            pushRow('conversion', thresholds.target_conversions ?? thresholds.target_conversion, thresholds.conversion_bonus_percentage);
            pushRow('views', thresholds.target_views, thresholds.views_bonus_percentage);
            pushRow('clicks', thresholds.target_clicks, thresholds.clicks_bonus_percentage);
            pushRow('saves', thresholds.target_saves, thresholds.saves_bonus_percentage);
            pushRow('shares', thresholds.target_shares, thresholds.shares_bonus_percentage);
            pushRow('comments', thresholds.target_comments, thresholds.comments_bonus_percentage);
            pushRow('likes', thresholds.target_likes, thresholds.likes_bonus_percentage);
          }

          if (rows.length > 0) {
            const { error: thErr } = await supabase
              .from('kol_performance_thresholds')
              .insert(rows);
            if (thErr) console.error('Failed to sync performance thresholds on update:', thErr);
          }
        } catch (e) {
          console.error('Error while syncing thresholds on update:', e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kol-payment-terms'] });
      queryClient.invalidateQueries({ queryKey: ['payment-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['content-post-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['kol-content-posts'] });
      toast({
        title: "Success",
        description: "Payment term updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update payment term",
        variant: "destructive",
      });
    }
  });

  // Delete payment term
  const deletePaymentTerm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kol_payment_terms')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kol-payment-terms'] });
      toast({
        title: "Success",
        description: "Payment term deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete payment term",
        variant: "destructive",
      });
    }
  });

  // Update payment status
  const updatePaymentStatus = useMutation({
    mutationFn: async ({ id, paymentData }: { id: string, paymentData: any }) => {
      console.log('Updating payment with data:', paymentData);
      
      // Clean the data to remove any undefined/null values that could cause issues
      const updateData: any = {};
      
      if (paymentData.down_payment_amount !== undefined) {
        updateData.down_payment_amount = paymentData.down_payment_amount;
      }
      if (paymentData.down_payment_date !== undefined) {
        updateData.down_payment_date = paymentData.down_payment_date;
      }
      if (paymentData.remaining_amount !== undefined) {
        updateData.remaining_amount = paymentData.remaining_amount;
      }
      if (paymentData.final_payment_date !== undefined) {
        updateData.final_payment_date = paymentData.final_payment_date;
      }
      if (paymentData.deduction_amount !== undefined) {
        updateData.deduction_amount = paymentData.deduction_amount;
      }
      if (paymentData.deduction_reason !== undefined) {
        updateData.deduction_reason = paymentData.deduction_reason;
      }
      if (paymentData.status !== undefined) {
        updateData.status = paymentData.status;
      }
      
      console.log('Clean update data:', updateData);
      
      const { error } = await supabase
        .from('kol_payment_terms')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kol-payment-terms'] });
      queryClient.invalidateQueries({ queryKey: ['payment-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['content-post-milestones'] });
      toast({
        title: "Success",
        description: "Payment status updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update payment status",
        variant: "destructive",
      });
    }
  });

  return {
    paymentTerms: paymentTerms || [],
    isLoading,
    createPaymentTerm: (data: any) => createPaymentTerm.mutateAsync(data),
    updatePaymentTerm: (id: string, data: any) => updatePaymentTerm.mutateAsync({ id, data }),
    updatePaymentStatus: (id: string, paymentData: any) => updatePaymentStatus.mutateAsync({ id, paymentData }),
    deletePaymentTerm: (id: string) => deletePaymentTerm.mutateAsync(id),
    refetch: () => queryClient.invalidateQueries({ queryKey: ['kol-payment-terms'] }),
  };
};
