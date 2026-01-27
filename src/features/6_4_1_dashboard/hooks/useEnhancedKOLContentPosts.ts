import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKOLContentPosts, CreateContentPostData } from '@/hooks/organized/utils';
import { useKOLPaymentTerms } from '@/hooks/useKOLPaymentTerms';
import { usePaymentMilestones, CreateMilestoneData } from '@/hooks/organized/utils';
import { useToast } from '@/hooks/organized/utils';
import { supabase } from '@/integrations/supabase/client';
import { useInvoiceUpload } from '@/hooks/organized/utils';

interface PaymentTermsData {
  payment_model: 'fixed' | 'performance_based' | 'barter_plus_fee';
  base_amount?: number;
  down_payment_amount?: number;
  down_payment_date?: string;
  remaining_amount?: number;
  performance_thresholds?: Array<{
    metric: 'reach' | 'engagement' | 'conversion';
    threshold: number;
    bonus_percentage: number;
  }> | {
    target_engagement?: number;
    target_reach?: number;
    target_conversion?: number;
    engagement_bonus_percentage?: number;
    reach_bonus_percentage?: number;
    conversion_bonus_percentage?: number;
  };
  barter_value?: number;
  payment_schedule: 'immediate' | 'net_30' | 'net_60' | 'milestone_based';
  milestones?: Array<{
    milestone_name: string;
    payment_percentage: number;
    amount: number;
    due_date?: string;
    milestone_description?: string;
    milestone_order: number;
    status?: string;
    trigger_condition?: string;
    trigger_details?: any;
    invoice_file?: File;
  }>;
}

interface EnhancedCreateContentPostData extends CreateContentPostData {
  paymentTermsData?: PaymentTermsData;
}

export const useEnhancedKOLContentPosts = () => {
  const { 
    contentPosts, 
    isLoading, 
    error, 
    updateContentPost, 
    deleteContentPost,
    isUpdating,
    isDeleting 
  } = useKOLContentPosts();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Enhanced mutation for creating content post with payment terms
  const createWithPaymentMutation = useMutation({
    mutationFn: async (data: EnhancedCreateContentPostData) => {
      console.log('🚀 Starting content post creation with data:', data);
      const { paymentTermsData, ...contentPostData } = data;
      
      // Get current user ID for created_by field
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;
      
      // STEP 1: First create the campaign deliverable
      console.log('📋 Creating campaign deliverable first');
      const { data: deliverable, error: deliverableError } = await supabase
        .from('kol_campaign_deliverables')
        .insert({
          campaign_id: contentPostData.campaign_id,
          kol_profile_id: contentPostData.kol_profile_id,
          deliverable_type: contentPostData.content_type || 'post',
          content_type: contentPostData.content_type || 'post',
          platform: contentPostData.platform || 'instagram',
          quantity: 1,
          description: contentPostData.caption || contentPostData.title || 'Content post deliverable',
          due_date: contentPostData.post_date || null,
          status: 'pending',
          price_per_deliverable: paymentTermsData?.base_amount || paymentTermsData?.barter_value || 0,
          total_price: paymentTermsData?.base_amount || paymentTermsData?.barter_value || 0,
          organization_id: contentPostData.organization_id,
        })
        .select()
        .single();

      if (deliverableError) {
        console.error('❌ Campaign deliverable creation failed:', deliverableError);
        throw deliverableError;
      }

      console.log('✅ Campaign deliverable created:', deliverable.id);
      
      // STEP 2: Create content post with deliverable ID
      console.log('📝 Creating content post with deliverable ID:', deliverable.id);
      
      const finalContentPostData = {
        ...contentPostData,
        campaign_deliverable_id: deliverable.id, // ENSURE this is set!
        status: contentPostData.status || 'draft'
      };
      
      const { data: contentPost, error: contentError } = await supabase
        .from('kol_content_posts')
        .insert([finalContentPostData])
        .select()
        .single();

      if (contentError) {
        console.error('❌ Content post creation failed:', contentError);
        throw contentError;
      }

      console.log('✅ Content post created successfully:', contentPost.id);

      // If payment terms data provided, create payment terms and milestones
      if (paymentTermsData && contentPost) {
        console.log('💰 Creating payment terms with data:', paymentTermsData);
        
        // Format performance thresholds properly for storage
        let formattedThresholds = {};
        if (paymentTermsData.performance_thresholds && Array.isArray(paymentTermsData.performance_thresholds)) {
          formattedThresholds = paymentTermsData.performance_thresholds.reduce((acc: any, threshold: any) => {
            if (threshold.metric && threshold.threshold) {
              acc[`target_${threshold.metric}`] = threshold.threshold;
              if (threshold.bonus_percentage) {
                acc[`${threshold.metric}_bonus_percentage`] = threshold.bonus_percentage;
              }
            }
            return acc;
          }, {});
        } else if (paymentTermsData.performance_thresholds) {
          formattedThresholds = paymentTermsData.performance_thresholds;
        }
        
        // Clean and validate payment terms payload
        const paymentTermsPayload = {
          type: 'agreement' as const,
          kol_profile_id: contentPostData.kol_profile_id,
          campaign_id: contentPostData.campaign_id,
          kol_content_post_id: contentPost.id,
          base_amount: paymentTermsData.base_amount || paymentTermsData.barter_value || 0,
          down_payment_amount: paymentTermsData.down_payment_amount || 0,
          down_payment_date: paymentTermsData.down_payment_date || null,
          remaining_amount: paymentTermsData.remaining_amount || null,
          payment_model: paymentTermsData.payment_model,
          payment_schedule: paymentTermsData.payment_schedule || 'milestone_based',
          performance_thresholds: formattedThresholds,
          effective_start_date: new Date().toISOString(),
          milestones: [],
          organization_id: contentPostData.organization_id,
          terms_version: 1,
          is_active: true,
          status: 'draft',
          currency: 'IDR',
          created_by: currentUserId || null,
        };

        console.log('📊 Payment terms payload:', paymentTermsPayload);

        const { data: paymentTerms, error: paymentError } = await supabase
          .from('kol_payment_terms')
          .insert([paymentTermsPayload])
          .select()
          .single();

        if (paymentError) {
          console.error('❌ Payment terms creation failed:', paymentError);
          console.error('🔍 Failed payload:', paymentTermsPayload);
          throw paymentError;
        }
        
        console.log('✅ Payment terms created successfully:', paymentTerms.id);

        // Initialize performance metrics for performance-based payments
        if (paymentTermsData.payment_model === 'performance_based') {
          console.log('📈 Initializing performance metrics for performance-based payment');
          
          const performanceMetricsPayload = {
            content_post_id: contentPost.id,
            organization_id: contentPostData.organization_id,
            kol_profile_id: contentPostData.kol_profile_id,
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            saves: 0,
            clicks: 0,
            reach: 0,
            impressions: 0,
            engagement_rate: 0
          };

          const { data: performanceMetrics, error: metricsError } = await supabase
            .from('kol_performance_metrics')
            .insert([performanceMetricsPayload])
            .select()
            .single();

          if (metricsError) {
            console.error('❌ Performance metrics initialization failed:', metricsError);
            // Don't throw error for metrics - allow content post to be created
          } else {
            console.log('✅ Performance metrics initialized:', performanceMetrics.id);
          }
        }
        
        // Create milestones from form data if provided, otherwise generate default milestones
        if (paymentTerms) {
          if (paymentTermsData.milestones && paymentTermsData.milestones.length > 0) {
            console.log('🎯 Creating custom milestones from form data');
            await createCustomMilestones(paymentTerms.id, paymentTermsData.milestones, contentPost.id);
          } else if (paymentTermsData.payment_schedule === 'milestone_based') {
            console.log('🎯 Generating default milestones for payment schedule');
            await generateMilestones(paymentTerms.id, paymentTermsData, contentPost.id);
          }
        }
      }

      return contentPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kol-content-posts'] });
      queryClient.invalidateQueries({ queryKey: ['kol-payment-terms'] });
      queryClient.invalidateQueries({ queryKey: ['payment-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['kol-conversions'] });
      queryClient.invalidateQueries({ queryKey: ['content-post-performance-data'] });
      toast({
        title: "Success",
        description: "Content post and payment agreement created successfully",
      });
    },
    onError: (error: any) => {
      console.error('❌ Error creating content post with payment:', error);
      console.error('🔍 Error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      
      let errorMessage = "Failed to create content post with payment terms";
      
      // Provide more specific error messages
      if (error?.message?.includes('payment_model')) {
        errorMessage = "Invalid payment model selected. Please check your payment settings.";
      } else if (error?.message?.includes('payment_schedule')) {
        errorMessage = "Invalid payment schedule selected. Please check your payment settings.";
      } else if (error?.code === '23514') {
        errorMessage = "Payment terms validation failed. Please check all required fields.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const createCustomMilestones = async (
    paymentTermsId: string,
    milestonesData: any[],
    contentPostId: string
  ) => {
    console.log('📝 Creating custom milestones:', milestonesData);
    
    const milestones = milestonesData.map((milestone, index) => ({
      payment_terms_id: paymentTermsId,
      milestone_name: milestone.milestone_name,
      milestone_order: milestone.milestone_order || index + 1,
      amount: milestone.amount,
      percentage: milestone.payment_percentage,
      due_date: milestone.due_date || null,
      status: milestone.status || 'pending',
      trigger_condition: milestone.trigger_condition || 'manual',
      trigger_details: { 
        content_post_id: contentPostId,
        ...milestone.trigger_details 
      },
      milestone_description: milestone.milestone_description || null,
      invoice_uploaded: false,
      invoice_file_path: null
    }));

    const { error } = await supabase
      .from('payment_milestones')
      .insert(milestones);

    if (error) {
      console.error('❌ Custom milestones creation failed:', error);
      throw error;
    }

    console.log('✅ Custom milestones created successfully');
  };

  const generateMilestones = async (
    paymentTermsId: string, 
    paymentData: PaymentTermsData, 
    contentPostId: string
  ) => {
    const baseAmount = paymentData.base_amount || paymentData.barter_value || 0;
    
    if (paymentData.payment_model === 'fixed') {
      // Create two milestones: Down payment (30%) and Final payment (70%)
      const milestones = [
        {
          payment_terms_id: paymentTermsId,
          milestone_name: 'Down Payment',
          milestone_order: 1,
          amount: baseAmount * 0.3,
          percentage: 30,
          trigger_condition: 'contract_signed',
          trigger_details: { content_post_id: contentPostId },
          milestone_description: 'Payment upon content post creation and approval',
          status: 'in_progress',
        },
        {
          payment_terms_id: paymentTermsId,
          milestone_name: 'Final Payment',
          milestone_order: 2,
          amount: baseAmount * 0.7,
          percentage: 70,
          trigger_condition: 'content_posted',
          trigger_details: { content_post_id: contentPostId },
          milestone_description: 'Payment upon successful post publication',
          status: 'in_progress',
        }
      ];

      const { error } = await supabase
        .from('payment_milestones')
        .insert(milestones);

      if (error) throw error;
    } else if (paymentData.payment_model === 'performance_based') {
      // Create milestones based on performance thresholds
      const thresholds = paymentData.performance_thresholds || {};
      
      // Extract target values from formatted thresholds (handle both array and object formats)
      let targetReach = 10000;
      let targetEngagement = 5;
      let targetConversion = 10;
      
      if (Array.isArray(thresholds)) {
        // Array format from form
        thresholds.forEach(threshold => {
          if (threshold.metric === 'reach') targetReach = threshold.threshold;
          if (threshold.metric === 'engagement') targetEngagement = threshold.threshold;
          if (threshold.metric === 'conversion') targetConversion = threshold.threshold;
        });
      } else if (typeof thresholds === 'object') {
        // Object format
        targetReach = (thresholds as any).target_reach || targetReach;
        targetEngagement = (thresholds as any).target_engagement || targetEngagement;
        targetConversion = (thresholds as any).target_conversion || targetConversion;
      }
      
      const milestones = [
        {
          payment_terms_id: paymentTermsId,
          milestone_name: 'Base Payment',
          milestone_order: 1,
          amount: baseAmount * 0.5,
          percentage: 50,
          trigger_condition: 'content_posted',
          trigger_details: { 
            content_post_id: contentPostId,
            description: 'Base payment upon post publication'
          },
          milestone_description: 'Base payment upon post publication',
          status: 'in_progress',
        },
        {
          payment_terms_id: paymentTermsId,
          milestone_name: 'Performance Bonus',
          milestone_order: 2,
          amount: baseAmount * 0.5,
          percentage: 50,
          trigger_condition: 'kpi_achieved',
          trigger_details: { 
            content_post_id: contentPostId,
            target_engagement: targetEngagement,
            target_reach: targetReach,
            target_conversion: targetConversion,
            description: `Performance bonus for achieving: ${targetReach} reach, ${targetEngagement}% engagement rate, ${targetConversion} conversions`
          },
          milestone_description: `Performance bonus for achieving: ${targetReach} reach, ${targetEngagement}% engagement rate, ${targetConversion} conversions`,
          status: 'in_progress',
        }
      ];

      const { error } = await supabase
        .from('payment_milestones')
        .insert(milestones);

      if (error) throw error;
    } else if (paymentData.payment_model === 'barter_plus_fee') {
      // Create single milestone for barter tracking
      const milestone = {
        payment_terms_id: paymentTermsId,
        milestone_name: 'Barter Delivery',
        milestone_order: 1,
        amount: paymentData.barter_value || 0,
        percentage: 100,
        trigger_condition: 'contract_signed',
        trigger_details: { content_post_id: contentPostId },
        milestone_description: 'Barter value delivery confirmation',
        status: 'in_progress',
      };

      const { error } = await supabase
        .from('payment_milestones')
        .insert([milestone]);

      if (error) throw error;
    }
  };

  return {
    contentPosts,
    isLoading,
    error,
    createContentPostWithPayment: createWithPaymentMutation.mutateAsync,
    updateContentPost,
    deleteContentPost,
    isCreating: createWithPaymentMutation.isPending,
    isUpdating,
    isDeleting,
  };
};
