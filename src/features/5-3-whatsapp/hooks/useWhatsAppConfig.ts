import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { toast } from 'sonner';
import type { WhatsAppConfig, WhatsAppConfigUpsert } from '../types';

export function useWhatsAppConfig() {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['whatsapp-config', organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<WhatsAppConfig | null> => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('organization_meta_config')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) throw error;
      return data as WhatsAppConfig | null;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: Omit<WhatsAppConfigUpsert, 'organization_id'>) => {
      if (!organizationId) throw new Error('No organization selected');
      const { data: { user } } = await supabase.auth.getUser();
      const hasNewToken = payload.meta_access_token.trim() !== '';
      const { data: existingRow } = await supabase
        .from('organization_meta_config')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      const existing = existingRow as WhatsAppConfig | null;
      if (existing && !hasNewToken) {
        // No autofill: merge with existing so empty form fields don't overwrite DB
        const updatePayload: Record<string, unknown> = {
          whatsapp_business_account_id: (payload.whatsapp_business_account_id?.trim() || existing.whatsapp_business_account_id) ?? '',
          verify_token: (payload.verify_token?.trim() || existing.verify_token) ?? '',
          phone_number_id: payload.phone_number_id?.trim() !== undefined && payload.phone_number_id?.trim() !== ''
            ? payload.phone_number_id?.trim() ?? null
            : (existing.phone_number_id ?? null),
          display_phone_number: (payload.display_phone_number?.trim() ?? '') !== ''
            ? (payload.display_phone_number?.trim() || null)
            : (existing.display_phone_number ?? null),
          updated_at: new Date().toISOString(),
        };
        if (payload.whatsapp_business_name !== undefined) {
          updatePayload.whatsapp_business_name = payload.whatsapp_business_name ?? null;
        }
        if (payload.meta_business_manager_id !== undefined) {
          updatePayload.meta_business_manager_id = payload.meta_business_manager_id?.trim() || null;
        }
        const { data, error } = await supabase
          .from('organization_meta_config')
          .update(updatePayload)
          .eq('organization_id', organizationId)
          .select()
          .single();
        if (error) throw error;
        return data as WhatsAppConfig;
      }
      const row: Record<string, unknown> = {
        organization_id: organizationId,
        whatsapp_business_account_id: payload.whatsapp_business_account_id,
        meta_access_token: payload.meta_access_token,
        meta_business_manager_id: payload.meta_business_manager_id?.trim() || null,
        verify_token: payload.verify_token,
        phone_number_id: payload.phone_number_id ?? null,
        display_phone_number: payload.display_phone_number ?? null,
        updated_at: new Date().toISOString(),
        ...(user?.id && { created_by: user.id }),
      };
      if (payload.whatsapp_business_name !== undefined) {
        row.whatsapp_business_name = payload.whatsapp_business_name ?? null;
      }
      const { data, error } = await supabase
        .from('organization_meta_config')
        .upsert(row, { onConflict: 'organization_id', ignoreDuplicates: false })
        .select()
        .single();
      if (error) throw error;
      return data as WhatsAppConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config', organizationId] });
      toast.success('WhatsApp config saved');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save config');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('No organization selected');
      const { error } = await supabase
        .from('organization_meta_config')
        .delete()
        .eq('organization_id', organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config', organizationId] });
      toast.success('WhatsApp disconnected. Fill the form and save to connect again.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to disconnect');
    },
  });

  const updateBusinessNameMutation = useMutation({
    mutationFn: async (name: string | null) => {
      if (!organizationId) throw new Error('No organization selected');
      const { data, error } = await supabase
        .from('organization_meta_config')
        .update({ whatsapp_business_name: name, updated_at: new Date().toISOString() })
        .eq('organization_id', organizationId)
        .select()
        .single();
      if (error) throw error;
      return data as WhatsAppConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config', organizationId] });
    },
  });

  const updateDisplayPhoneMutation = useMutation({
    mutationFn: async (displayPhone: string | null) => {
      if (!organizationId) throw new Error('No organization selected');
      const { data, error } = await supabase
        .from('organization_meta_config')
        .update({ display_phone_number: displayPhone, updated_at: new Date().toISOString() })
        .eq('organization_id', organizationId)
        .select()
        .single();
      if (error) throw error;
      return data as WhatsAppConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config', organizationId] });
    },
  });

  const updateInstagramMutation = useMutation({
    mutationFn: async (
      payload: { id: string | null; username?: string | null; name?: string | null; page_id?: string | null }
    ) => {
      if (!organizationId) throw new Error('No organization selected');
      const updates: Record<string, unknown> = {
        instagram_business_account_id: payload.id,
        updated_at: new Date().toISOString(),
      };
      if (payload.id == null) {
        updates.instagram_username = null;
        updates.instagram_name = null;
        updates.facebook_page_id = null;
      } else {
        if (payload.username !== undefined) updates.instagram_username = payload.username ?? null;
        if (payload.name !== undefined) updates.instagram_name = payload.name ?? null;
        if (payload.page_id !== undefined) updates.facebook_page_id = payload.page_id ?? null;
      }
      const { data, error } = await supabase
        .from('organization_meta_config')
        .update(updates)
        .eq('organization_id', organizationId)
        .select()
        .single();
      if (error) throw error;
      return data as WhatsAppConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config', organizationId] });
    },
  });

  return {
    config: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    upsert: upsertMutation.mutateAsync,
    isUpserting: upsertMutation.isPending,
    disconnect: disconnectMutation.mutateAsync,
    isDisconnecting: disconnectMutation.isPending,
    updateBusinessName: updateBusinessNameMutation.mutateAsync,
    updateDisplayPhone: updateDisplayPhoneMutation.mutateAsync,
    updateInstagram: updateInstagramMutation.mutateAsync,
    isUpdatingInstagram: updateInstagramMutation.isPending,
  };
}
