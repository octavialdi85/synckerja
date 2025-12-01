import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { PricingCalculationInput } from '../types/pricingTypes';

export interface PricingTemplate {
  id: string;
  organization_id: string | null;
  template_name: string;
  template_description: string | null;
  category: string | null;
  industry: string | null;
  template_data: PricingCalculationInput;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const usePricingTemplates = () => {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  // Fetch templates: global (organization_id IS NULL) + organization templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['pricing-templates', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        // Only fetch global templates if no org
        const { data, error } = await supabase
          .from('pricing_templates')
          .select('*')
          .eq('is_active', true)
          .is('organization_id', null)
          .order('template_name');

        if (error) throw error;
        return (data || []) as PricingTemplate[];
      }

      // Fetch both global and organization templates
      const { data, error } = await supabase
        .from('pricing_templates')
        .select('*')
        .eq('is_active', true)
        .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
        .order('template_name');

      if (error) throw error;
      return (data || []) as PricingTemplate[];
    },
    enabled: true, // Always enabled, will fetch global templates even without org
  });

  // Separate global and organization templates
  const globalTemplates = templates.filter(t => t.organization_id === null);
  const organizationTemplates = templates.filter(t => t.organization_id === organizationId);

  const saveTemplate = useMutation({
    mutationFn: async (templateData: {
      template_name: string;
      template_description?: string;
      category?: string;
      industry?: string;
      template_data: PricingCalculationInput;
    }) => {
      if (!organizationId) {
        throw new Error('Organization ID is required to save templates');
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('pricing_templates')
        .insert({
          organization_id: organizationId,
          template_name: templateData.template_name,
          template_description: templateData.template_description || null,
          category: templateData.category || null,
          industry: templateData.industry || null,
          template_data: templateData.template_data,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PricingTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-templates', organizationId] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({
      templateId,
      templateData,
    }: {
      templateId: string;
      templateData: {
        template_name?: string;
        template_description?: string;
        category?: string;
        industry?: string;
        template_data?: PricingCalculationInput;
      };
    }) => {
      if (!organizationId) {
        throw new Error('Organization ID is required to update templates');
      }

      const { data, error } = await supabase
        .from('pricing_templates')
        .update({
          ...templateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .eq('organization_id', organizationId) // Only update own templates
        .select()
        .single();

      if (error) throw error;
      return data as PricingTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-templates', organizationId] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      if (!organizationId) {
        throw new Error('Organization ID is required to delete templates');
      }

      const { error } = await supabase
        .from('pricing_templates')
        .delete()
        .eq('id', templateId)
        .eq('organization_id', organizationId); // Only delete own templates

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-templates', organizationId] });
    },
  });

  return {
    templates,
    globalTemplates,
    organizationTemplates,
    isLoading,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
  };
};


