import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { useToast } from '@/features/1-login/hooks/use-toast';
import { InvoiceTemplate, InvoiceTemplateFormData } from '@/types/invoice';
import { useState, useCallback } from 'react';

// Re-export commonly used hooks
export { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
export { useToast } from '@/features/1-login/hooks/use-toast';

// Re-export KOL hooks from 6_4_1_dashboard
export { useKOLRatings } from '@/features/6_4_1_dashboard/hooks/useKOLRatings';
export { useKOLCampaigns } from '@/features/6_4_1_dashboard/hooks/useKOLCampaigns';
export { useKOLProfiles } from '@/features/6_4_1_dashboard/hooks/useKOLProfiles';
export { useKOLAnalytics } from '@/features/6_4_1_dashboard/hooks/useKOLAnalytics';
export { useKOLPaymentTerms } from '@/features/6_4_1_dashboard/hooks/useKOLPaymentTerms';
export { useKOLManagementData } from '@/features/6_4_1_dashboard/hooks/useKOLManagementData';
export { useOptimizedKOLPerformance } from '@/features/6_4_1_dashboard/hooks/useOptimizedKOLPerformance';
export { useOptimizedKOLOperations } from '@/features/6_4_1_dashboard/hooks/useOptimizedKOLOperations';
export { useKOLPostsAndMetrics } from '@/features/6_4_1_dashboard/hooks/useKOLPostsAndMetrics';
export { useEnhancedKOLContentPosts } from '@/features/6_4_1_dashboard/hooks/useEnhancedKOLContentPosts';
export { useKOLRates, useKOLSocialMedia } from '@/features/6_4_1_dashboard/hooks/useKOLProfiles';
export type { KOLRate } from '@/features/6_4_1_dashboard/hooks/useKOLProfiles';

// KOL Content Posts Types
export interface KOLContentPost {
  id: string;
  campaign_assignment_id: string;
  campaign_deliverable_id?: string | null;
  campaign_id?: string | null;
  kol_profile_id?: string | null;
  organization_id?: string | null;
  platform: string;
  content_type?: string | null;
  status: string;
  post_url?: string | null;
  post_date?: string | null;
  scheduled_date?: string | null;
  caption?: string | null;
  content_text?: string | null;
  title?: string | null;
  hashtags?: string[] | null;
  mentions?: string[] | null;
  post_type?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContentPostData {
  campaign_assignment_id: string;
  organization_id: string;
  kol_profile_id: string;
  campaign_id: string;
  platform: string;
  content_type: string;
  status?: 'draft' | 'posted' | 'archived';
  campaign_deliverable_id?: string;
  post_date?: string;
  caption?: string;
  content_text?: string;
  title?: string;
  hashtags?: string[];
  mentions?: string[];
  post_type?: string;
  scheduled_date?: string;
  post_url?: string;
}

export interface UpdateContentPostData {
  id: string;
  platform?: string;
  content_type?: string;
  status?: 'draft' | 'posted' | 'archived';
  post_url?: string;
  post_date?: string;
  scheduled_date?: string;
  caption?: string;
  content_text?: string;
  title?: string;
  hashtags?: string[];
  mentions?: string[];
  post_type?: string;
}

/**
 * Hook to manage KOL content posts
 */
export const useKOLContentPosts = () => {
  const { currentOrg } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch content posts
  const { data: contentPosts = [], isLoading } = useQuery({
    queryKey: ['kol-content-posts', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('kol_content_posts')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching content posts:', error);
        throw error;
      }

      return (data || []) as KOLContentPost[];
    },
    enabled: !!currentOrg?.id,
  });

  // Create content post mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateContentPostData) => {
      if (!currentOrg?.id && !data.organization_id) {
        throw new Error('Organization ID is required');
      }

      const organizationId = data.organization_id || currentOrg?.id;

      const { data: post, error } = await supabase
        .from('kol_content_posts')
        .insert({
          campaign_assignment_id: data.campaign_assignment_id,
          campaign_deliverable_id: data.campaign_deliverable_id || null,
          campaign_id: data.campaign_id || null,
          kol_profile_id: data.kol_profile_id,
          organization_id: organizationId,
          platform: data.platform,
          content_type: data.content_type || null,
          status: data.status || 'draft',
          post_date: data.post_date || null,
          scheduled_date: data.scheduled_date || null,
          caption: data.caption || null,
          content_text: data.content_text || null,
          title: data.title || null,
          hashtags: data.hashtags || null,
          mentions: data.mentions || null,
          post_type: data.post_type || null,
          post_url: data.post_url || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating content post:', error);
        throw error;
      }

      return post as KOLContentPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kol-content-posts', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['kol-campaigns', currentOrg?.id] });
    },
    onError: (error: any) => {
      console.error('Error creating content post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create content post",
        variant: "destructive",
      });
    },
  });

  // Update content post mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateContentPostData) => {
      const { id, ...updates } = data;

      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const { data: post, error } = await supabase
        .from('kol_content_posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating content post:', error);
        throw error;
      }

      return post as KOLContentPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kol-content-posts', currentOrg?.id] });
    },
    onError: (error: any) => {
      console.error('Error updating content post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update content post",
        variant: "destructive",
      });
    },
  });

  // Delete content post mutation
  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('kol_content_posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Error deleting content post:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kol-content-posts', currentOrg?.id] });
    },
    onError: (error: any) => {
      console.error('Error deleting content post:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete content post",
        variant: "destructive",
      });
    },
  });

  return {
    contentPosts: contentPosts as KOLContentPost[],
    isLoading,
    createContentPost: createMutation.mutateAsync,
    updateContentPost: updateMutation.mutateAsync,
    deleteContentPost: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

// KOL Campaign Assignments Types
export interface KOLCampaignAssignment {
  id: string;
  campaign_id: string;
  kol_profile_id: string;
  organization_id?: string | null;
  assigned_at?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Hook to fetch KOL campaign assignments
 */
export const useKOLCampaignAssignments = () => {
  const { currentOrg } = useCurrentOrg();

  // DISABLED: Table kol_campaign_assignments does not exist - return empty data without querying
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['kol-campaign-assignments', currentOrg?.id],
    queryFn: async () => {
      // Return empty array immediately - table does not exist
      return [];
    },
    enabled: false, // Disabled - table does not exist
    retry: false,
    staleTime: Infinity, // Never refetch
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    assignments: assignments as KOLCampaignAssignment[],
    isLoading,
  };
};

// KOL Budget Allocations Types
export interface KOLBudgetAllocation {
  id: string;
  campaign_id: string;
  kol_profile_id: string;
  organization_id: string;
  allocated_budget: number;
  actual_payout?: number | null;
  base_budget?: number | null;
  bonus_budget?: number | null;
  budget_type?: string | null;
  budget_utilization_percentage?: number | null;
  milestone_completion_rate?: number | null;
  notes?: string | null;
  payment_model?: string | null;
  payment_terms_id?: string | null;
  performance_multiplier?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Hook to fetch KOL budget allocations
 */
export const useKOLBudgetAllocations = () => {
  const { currentOrg } = useCurrentOrg();

  const { data: allocations = [], isLoading } = useQuery({
    queryKey: ['kol-budget-allocations', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('kol_campaign_budget_allocations')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching budget allocations:', error);
        // Handle 404 errors gracefully (table might not exist yet)
        if (error.code === 'PGRST116' || error.message?.includes('404')) {
          console.warn('kol_campaign_budget_allocations table not found, returning empty array');
          return [];
        }
        throw error;
      }

      return (data || []) as KOLBudgetAllocation[];
    },
    enabled: !!currentOrg?.id,
  });

  return {
    allocations: allocations as KOLBudgetAllocation[],
    isLoading,
  };
};

// Payment Milestones Types
export interface PaymentMilestone {
  id: string;
  payment_terms_id: string;
  milestone_name: string;
  milestone_order: number;
  amount: number;
  percentage?: number | null;
  status?: string | null;
  due_date?: string | null;
  milestone_description?: string | null;
  trigger_condition: string;
  trigger_details?: any | null;
  invoice_uploaded?: boolean | null;
  invoice_file_path?: string | null;
  invoice_upload_date?: string | null;
  paid_at?: string | null;
  paid_by?: string | null;
  payment_reference?: string | null;
  remaining_amount?: number | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateMilestoneData {
  payment_terms_id: string;
  milestone_name: string;
  milestone_order: number;
  amount: number;
  percentage?: number | null;
  status?: string;
  due_date?: string | null;
  milestone_description?: string | null;
  trigger_condition: string;
  trigger_details?: any | null;
}

export interface UpdateMilestoneStatusData {
  id: string;
  status: string;
  paid_at?: string | null;
  paid_by?: string | null;
  payment_reference?: string | null;
  invoiceFilePath?: string | null;
  notes?: string | null;
}

/**
 * Hook to manage payment milestones
 */
export const usePaymentMilestones = () => {
  const { currentOrg } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create milestone mutation
  const createMilestoneMutation = useMutation({
    mutationFn: async (data: CreateMilestoneData) => {
      const { data: milestone, error } = await supabase
        .from('payment_milestones')
        .insert({
          payment_terms_id: data.payment_terms_id,
          milestone_name: data.milestone_name,
          milestone_order: data.milestone_order,
          amount: data.amount,
          percentage: data.percentage || null,
          status: data.status || 'pending',
          due_date: data.due_date || null,
          milestone_description: data.milestone_description || null,
          trigger_condition: data.trigger_condition,
          trigger_details: data.trigger_details || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating milestone:', error);
        throw error;
      }

      return milestone as PaymentMilestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-milestones', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['kol-payment-terms', currentOrg?.id] });
    },
    onError: (error: any) => {
      console.error('Error creating milestone:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create milestone",
        variant: "destructive",
      });
    },
  });

  // Update milestone status mutation
  const updateMilestoneStatusMutation = useMutation({
    mutationFn: async (data: UpdateMilestoneStatusData) => {
      const updateData: any = {
        status: data.status,
        updated_at: new Date().toISOString(),
      };

      if (data.paid_at !== undefined) updateData.paid_at = data.paid_at;
      if (data.paid_by !== undefined) updateData.paid_by = data.paid_by;
      if (data.payment_reference !== undefined) updateData.payment_reference = data.payment_reference;
      if (data.invoiceFilePath !== undefined) {
        updateData.invoice_file_path = data.invoiceFilePath;
        updateData.invoice_uploaded = true;
        updateData.invoice_upload_date = new Date().toISOString();
      }
      if (data.notes !== undefined) updateData.notes = data.notes;

      const { data: milestone, error } = await supabase
        .from('payment_milestones')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating milestone status:', error);
        throw error;
      }

      return milestone as PaymentMilestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-milestones', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['kol-payment-terms', currentOrg?.id] });
    },
    onError: (error: any) => {
      console.error('Error updating milestone status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update milestone status",
        variant: "destructive",
      });
    },
  });

  return {
    createMilestone: createMilestoneMutation.mutateAsync,
    updateMilestoneStatus: updateMilestoneStatusMutation.mutateAsync,
    isCreating: createMilestoneMutation.isPending,
    isUpdating: updateMilestoneStatusMutation.isPending,
  };
};

// KOL Performance Metrics Types
export interface KOLPerformanceMetrics {
  id: string;
  content_post_id: string;
  kol_profile_id: string;
  organization_id?: string | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  clicks?: number | null;
  reach?: number | null;
  impressions?: number | null;
  engagement_rate?: number | null;
  conversion_rate?: number | null;
  recorded_at?: string;
  created_at?: string;
  updated_at?: string | null;
}

export interface UpdatePerformanceMetricsData {
  contentPostId: string;
  kolProfileId?: string;
  metrics: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    clicks?: number;
    reach?: number;
    impressions?: number;
    engagement_rate?: number;
    conversion_rate?: number;
  };
}

/**
 * Hook to manage KOL performance metrics
 */
export const useKOLPerformanceMetrics = () => {
  const { currentOrg } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Update performance metrics mutation
  const updateMetricsMutation = useMutation({
    mutationFn: async (data: UpdatePerformanceMetricsData) => {
      if (!currentOrg?.id) {
        throw new Error('Organization ID is required');
      }

      // Get kol_profile_id from content post if not provided
      let kolProfileId = data.kolProfileId;
      if (!kolProfileId) {
        const { data: contentPost, error: postError } = await supabase
          .from('kol_content_posts')
          .select('kol_profile_id')
          .eq('id', data.contentPostId)
          .single();

        if (postError) {
          console.error('Error fetching content post:', postError);
          throw postError;
        }
        kolProfileId = contentPost?.kol_profile_id;
      }

      if (!kolProfileId) {
        throw new Error('KOL Profile ID is required');
      }

      // Check if performance metrics already exist for this content post
      const { data: existingMetrics, error: checkError } = await supabase
        .from('kol_performance_metrics')
        .select('id')
        .eq('content_post_id', data.contentPostId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing metrics:', checkError);
        throw checkError;
      }

      const metricsData: any = {
        content_post_id: data.contentPostId,
        kol_profile_id: kolProfileId,
        organization_id: currentOrg.id,
        views: data.metrics.views ?? null,
        likes: data.metrics.likes ?? null,
        comments: data.metrics.comments ?? null,
        shares: data.metrics.shares ?? null,
        saves: data.metrics.saves ?? null,
        clicks: data.metrics.clicks ?? null,
        reach: data.metrics.reach ?? null,
        impressions: data.metrics.impressions ?? null,
        engagement_rate: data.metrics.engagement_rate ?? null,
        conversion_rate: data.metrics.conversion_rate ?? null,
        recorded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let result;
      if (existingMetrics) {
        // Update existing metrics
        const { data: updated, error: updateError } = await supabase
          .from('kol_performance_metrics')
          .update(metricsData)
          .eq('id', existingMetrics.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating performance metrics:', updateError);
          throw updateError;
        }
        result = updated;
      } else {
        // Create new metrics
        const { data: created, error: createError } = await supabase
          .from('kol_performance_metrics')
          .insert(metricsData)
          .select()
          .single();

        if (createError) {
          console.error('Error creating performance metrics:', createError);
          throw createError;
        }
        result = created;
      }

      return result as KOLPerformanceMetrics;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kol-performance-metrics', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['kol-content-posts', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['content-post-performance', currentOrg?.id] });
    },
    onError: (error: any) => {
      console.error('Error updating performance metrics:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update performance metrics",
        variant: "destructive",
      });
    },
  });

  return {
    updatePerformanceMetrics: updateMetricsMutation.mutateAsync,
    isUpdating: updateMetricsMutation.isPending,
  };
};

// KOL Conversions Types
export interface KOLConversion {
  id: string;
  content_post_id: string;
  kol_profile_id: string;
  organization_id?: string | null;
  conversion_type: string;
  conversion_value?: number | null;
  conversion_date?: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface CreateConversionData {
  content_post_id: string;
  kol_profile_id: string;
  conversion_type: string;
  conversion_value?: number;
  conversion_date?: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
}

export interface ConversionType {
  id: string;
  name: string;
  description?: string;
}

/**
 * Hook to fetch KOL conversions
 */
export const useKOLConversions = () => {
  const { currentOrg } = useCurrentOrg();

  const { data: conversions = [], isLoading } = useQuery({
    queryKey: ['kol-conversions', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('kol_conversions')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('conversion_date', { ascending: false });

      if (error) {
        console.error('Error fetching conversions:', error);
        // Handle 404 errors gracefully (table might not exist yet)
        if (error.code === 'PGRST116' || error.message?.includes('404')) {
          console.warn('kol_conversions table not found, returning empty array');
          return [];
        }
        throw error;
      }

      return (data || []) as KOLConversion[];
    },
    enabled: !!currentOrg?.id,
  });

  return {
    data: conversions as KOLConversion[],
    isLoading,
  };
};

/**
 * Hook to fetch conversion types
 * Returns a list of available conversion types (can be from database or hardcoded)
 */
export const useConversionTypes = () => {
  const { currentOrg } = useCurrentOrg();

  // DISABLED: Table conversion_types does not exist - return default types without querying
  const { data: conversionTypes = [], isLoading } = useQuery({
    queryKey: ['conversion-types', currentOrg?.id],
    queryFn: async () => {
      // Return default conversion types immediately - table does not exist
      return [
        { id: 'purchase', name: 'Purchase', description: 'Product or service purchase' },
        { id: 'signup', name: 'Sign Up', description: 'User registration or sign up' },
        { id: 'download', name: 'Download', description: 'App or file download' },
        { id: 'lead', name: 'Lead', description: 'Lead generation or inquiry' },
        { id: 'visit', name: 'Website Visit', description: 'Website visit' },
        { id: 'click', name: 'Click', description: 'Link click' },
        { id: 'form_submit', name: 'Form Submit', description: 'Form submission' },
        { id: 'video_view', name: 'Video View', description: 'Video view' },
        { id: 'other', name: 'Other', description: 'Other conversion type' },
      ] as ConversionType[];
    },
    enabled: false, // Disabled - table does not exist
    retry: false,
    staleTime: Infinity, // Never refetch
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    data: conversionTypes as ConversionType[],
    isLoading,
  };
};

/**
 * Hook to create KOL conversions
 */
export const useCreateConversion = () => {
  const { currentOrg } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createConversionMutation = useMutation({
    mutationFn: async (data: CreateConversionData) => {
      if (!currentOrg?.id) {
        throw new Error('Organization ID is required');
      }

      const { data: conversion, error } = await supabase
        .from('kol_conversions')
        .insert({
          content_post_id: data.content_post_id,
          kol_profile_id: data.kol_profile_id,
          organization_id: currentOrg.id,
          conversion_type: data.conversion_type,
          conversion_value: data.conversion_value || null,
          conversion_date: data.conversion_date || new Date().toISOString(),
          utm_source: data.utm_source || null,
          utm_medium: data.utm_medium || null,
          utm_campaign: data.utm_campaign || null,
          utm_content: data.utm_content || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversion:', error);
        throw error;
      }

      return conversion as KOLConversion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kol-conversions', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['kol-content-posts', currentOrg?.id] });
      toast({
        title: "Success",
        description: "Conversion recorded successfully",
      });
    },
    onError: (error: any) => {
      console.error('Error creating conversion:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record conversion",
        variant: "destructive",
      });
    },
  });

  return createConversionMutation;
};

/**
 * Hook to upload invoice files for payment milestones
 */
export const useInvoiceUpload = () => {
  const { currentOrg } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadInvoiceFile = async (file: File, milestoneId: string): Promise<string> => {
    if (!currentOrg?.id) {
      throw new Error('Organization ID is required');
    }

    if (!file) {
      throw new Error('File is required');
    }

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop() || 'pdf';
      const timestamp = Date.now();
      const fileName = `milestone_${milestoneId}_${timestamp}.${fileExt}`;
      const filePath = `${currentOrg.id}/invoices/${fileName}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-invoices')
        .upload(filePath, file, {
          contentType: file.type || 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading invoice file:', uploadError);
        throw new Error(`Failed to upload invoice: ${uploadError.message}`);
      }

      // Update milestone with invoice file path
      const { error: updateError } = await supabase
        .from('payment_milestones')
        .update({
          invoice_file_path: filePath,
          invoice_uploaded: true,
          invoice_upload_date: new Date().toISOString(),
        })
        .eq('id', milestoneId);

      if (updateError) {
        console.error('Error updating milestone with invoice path:', updateError);
        // Try to delete uploaded file if update fails
        await supabase.storage
          .from('payment-invoices')
          .remove([filePath]);
        throw new Error(`Failed to update milestone: ${updateError.message}`);
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['payment-milestones', currentOrg.id] });
      queryClient.invalidateQueries({ queryKey: ['kol-payment-terms', currentOrg.id] });

      return filePath;
    } catch (error: any) {
      console.error('Error in uploadInvoiceFile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload invoice file",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    uploadInvoiceFile,
  };
};

/**
 * Hook to sync milestone status (mark as paid, etc.)
 */
export const useMilestoneSync = () => {
  const { currentOrg } = useCurrentOrg();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const markMilestoneAsPaid = async (milestoneId: string) => {
    if (!currentOrg?.id) {
      throw new Error('Organization ID is required');
    }

    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      const paidBy = user?.id || null;

      const { data: milestone, error } = await supabase
        .from('payment_milestones')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          paid_by: paidBy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', milestoneId)
        .select()
        .single();

      if (error) {
        console.error('Error marking milestone as paid:', error);
        throw error;
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['payment-milestones', currentOrg.id] });
      queryClient.invalidateQueries({ queryKey: ['kol-payment-terms', currentOrg.id] });
      queryClient.invalidateQueries({ queryKey: ['kol-content-posts', currentOrg.id] });

      toast({
        title: "Success",
        description: "Milestone marked as paid successfully",
      });

      return milestone as PaymentMilestone;
    } catch (error: any) {
      console.error('Error in markMilestoneAsPaid:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark milestone as paid",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    markMilestoneAsPaid,
  };
};

// Campaign Performance Types
export interface CampaignPerformanceData {
  campaign_id: string;
  campaign_name: string;
  total_reach: number;
  total_engagement: number;
  total_conversions: number;
  engagement_rate: number;
  conversion_rate: number;
  total_spent: number;
  total_budget: number;
  kol_count: number;
  content_post_count: number;
  start_date?: string;
  end_date?: string;
  status: string;
}

/**
 * Hook to fetch optimized campaign performance data
 */
export const useOptimizedCampaignPerformance = () => {
  const { currentOrg } = useCurrentOrg();

  const { data: campaignPerformance = [], isLoading } = useQuery({
    queryKey: ['optimized-campaign-performance', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      try {
        // Fetch campaigns
        const { data: campaigns, error: campaignsError } = await supabase
          .from('kol_campaigns')
          .select('*')
          .eq('organization_id', currentOrg.id)
          .order('created_at', { ascending: false });

        if (campaignsError) {
          console.error('Error fetching campaigns:', campaignsError);
          throw campaignsError;
        }

        if (!campaigns || campaigns.length === 0) {
          return [];
        }

        const campaignIds = campaigns.map(c => c.id);

        // Fetch content posts for these campaigns
        const { data: contentPosts, error: postsError } = await supabase
          .from('kol_content_posts')
          .select('id, campaign_id, kol_profile_id')
          .in('campaign_id', campaignIds);

        if (postsError) {
          console.error('Error fetching content posts:', postsError);
          // Continue even if this fails
        }

        // Fetch performance metrics
        const { data: performanceMetrics, error: metricsError } = await supabase
          .from('kol_performance_metrics')
          .select('content_post_id, reach, impressions, engagement_rate')
          .in('content_post_id', contentPosts?.map(p => p.id) || []);

        if (metricsError) {
          console.error('Error fetching performance metrics:', metricsError);
          // Continue even if this fails
        }

        // Fetch conversions
        const { data: conversions, error: conversionsError } = await supabase
          .from('kol_conversions')
          .select('content_post_id, conversion_value')
          .in('content_post_id', contentPosts?.map(p => p.id) || []);

        if (conversionsError) {
          console.error('Error fetching conversions:', conversionsError);
          // Continue even if this fails
        }

        // Calculate performance for each campaign
        const performanceData: CampaignPerformanceData[] = campaigns.map((campaign: any) => {
          const campaignPosts = contentPosts?.filter(p => p.campaign_id === campaign.id) || [];
          const postIds = campaignPosts.map(p => p.id);
          
          const campaignMetrics = performanceMetrics?.filter(m => postIds.includes(m.content_post_id)) || [];
          const campaignConversions = conversions?.filter(c => postIds.includes(c.content_post_id)) || [];

          const totalReach = campaignMetrics.reduce((sum, m) => sum + (m.reach || 0), 0);
          const totalImpressions = campaignMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
          const totalEngagement = campaignMetrics.reduce((sum, m) => {
            const engagementRate = m.engagement_rate || 0;
            return sum + (totalImpressions > 0 ? (totalImpressions * engagementRate / 100) : 0);
          }, 0);
          const totalConversions = campaignConversions.length;
          const totalConversionValue = campaignConversions.reduce((sum, c) => sum + (c.conversion_value || 0), 0);

          const uniqueKOLs = new Set(campaignPosts.map(p => p.kol_profile_id)).size;
          const engagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions * 100) : 0;
          const conversionRate = totalReach > 0 ? (totalConversions / totalReach * 100) : 0;

          return {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            total_reach: totalReach,
            total_engagement: Math.round(totalEngagement),
            total_conversions: totalConversions,
            engagement_rate: engagementRate,
            conversion_rate: conversionRate,
            total_spent: 0, // Would need to calculate from payment milestones
            total_budget: campaign.budget || 0,
            kol_count: uniqueKOLs,
            content_post_count: campaignPosts.length,
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            status: campaign.status,
          };
        });

        return performanceData;
      } catch (error) {
        console.error('Error fetching optimized campaign performance:', error);
        // Handle 404 errors gracefully
        if ((error as any)?.code === 'PGRST116' || (error as any)?.message?.includes('404')) {
          console.warn('Some tables not found, returning empty array');
          return [];
        }
        throw error;
      }
    },
    enabled: !!currentOrg?.id,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    data: campaignPerformance as CampaignPerformanceData[],
    isLoading,
  };
};

export const useInvoiceTemplate = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();
  const [currentTemplate, setCurrentTemplate] = useState<InvoiceTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['invoice-templates', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('invoice_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('template_name');

      if (error) throw error;
      return (data || []) as InvoiceTemplate[];
    },
    enabled: !!organizationId,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (formData: InvoiceTemplateFormData) => {
      if (!organizationId) throw new Error('Organization ID is required');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('invoice_templates')
        .insert({
          ...formData,
          organization_id: organizationId,
          created_by: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: data as InvoiceTemplate };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-templates', organizationId] });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InvoiceTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('invoice_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as InvoiceTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-templates', organizationId] });
      setHasUnsavedChanges(false);
    },
  });

  // Create template function
  const createTemplate = useCallback(async (formData: InvoiceTemplateFormData) => {
    setIsSaving(true);
    try {
      const result = await createTemplateMutation.mutateAsync(formData);
      return result;
    } catch (error) {
      console.error('Error creating template:', error);
      return { success: false, error };
    } finally {
      setIsSaving(false);
    }
  }, [createTemplateMutation]);

  // Update field function
  const updateField = useCallback(async (field: keyof InvoiceTemplate, value: any) => {
    if (!currentTemplate) return;
    
    setIsSaving(true);
    setHasUnsavedChanges(true);
    
    try {
      const updated = await updateTemplateMutation.mutateAsync({
        id: currentTemplate.id,
        [field]: value,
      });
      
      setCurrentTemplate(updated);
      return { success: true };
    } catch (error) {
      console.error('Error updating template field:', error);
      setHasUnsavedChanges(false);
      return { success: false, error };
    } finally {
      setIsSaving(false);
    }
  }, [currentTemplate, updateTemplateMutation]);

  return {
    templates: templates as InvoiceTemplate[],
    currentTemplate,
    setCurrentTemplate,
    updateField,
    isSaving: isSaving || createTemplateMutation.isPending || updateTemplateMutation.isPending,
    hasUnsavedChanges,
    createTemplate,
    isLoading,
  };
};

