import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { toast } from 'sonner';
import type { WhatsAppAccount, WhatsAppAccountUpsert } from '../types';

const MAX_ACCOUNTS_PER_ORG = 3;

export function useWhatsAppAccounts() {
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['whatsapp-accounts', organizationId],
    enabled: !!organizationId,
    queryFn: async (): Promise<WhatsAppAccount[]> => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('organization_whatsapp_accounts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WhatsAppAccount[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async ({
      accountId,
      payload,
      sharedToken,
    }: {
      accountId: string | null;
      payload: WhatsAppAccountUpsert;
      sharedToken: string | null;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      const wabaId = payload.whatsapp_business_account_id.trim();
      const pnId = payload.phone_number_id.trim();
      if (!wabaId || !pnId) throw new Error('WhatsApp Business Account ID and Phone Number ID are required');

      const token = (payload.meta_access_token?.trim() || sharedToken?.trim() || '').trim();
      if (!token) throw new Error('Access token required (fill token or set shared token in org config)');

      if (!accountId) {
        const { data: list } = await supabase
          .from('organization_whatsapp_accounts')
          .select('id')
          .eq('organization_id', organizationId);
        const count = list?.length ?? 0;
        if (count >= MAX_ACCOUNTS_PER_ORG) throw new Error(`Maksimal ${MAX_ACCOUNTS_PER_ORG} akun WhatsApp per organisasi.`);
        const { data: existing } = await supabase
          .from('organization_whatsapp_accounts')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('phone_number_id', pnId)
          .maybeSingle();
        if (existing) throw new Error('Akun ini sudah terhubung.');
      }

      const row = {
        organization_id: organizationId,
        whatsapp_business_account_id: wabaId,
        phone_number_id: pnId,
        meta_access_token: token || null,
        display_phone_number: payload.display_phone_number?.trim() || null,
        whatsapp_business_name: payload.whatsapp_business_name?.trim() || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (accountId) {
        const { data, error } = await supabase
          .from('organization_whatsapp_accounts')
          .update(row)
          .eq('id', accountId)
          .select()
          .single();
        if (error) throw error;
        return data as WhatsAppAccount;
      }

      const { data, error } = await supabase
        .from('organization_whatsapp_accounts')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data as WhatsAppAccount;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts', organizationId] });
      toast.success(variables.accountId ? 'Akun diperbarui.' : 'Akun ditambahkan.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal menyimpan akun.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (accountId: string) => {
      if (!organizationId) throw new Error('No organization selected');
      const { error } = await supabase
        .from('organization_whatsapp_accounts')
        .delete()
        .eq('id', accountId)
        .eq('organization_id', organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts', organizationId] });
      toast.success('WhatsApp disconnected.');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal disconnect.');
    },
  });

  const updateNameMutation = useMutation({
    mutationFn: async ({
      accountId,
      whatsapp_business_name,
      display_phone_number,
      name_status,
    }: {
      accountId: string;
      whatsapp_business_name?: string | null;
      display_phone_number?: string | null;
      name_status?: string | null;
    }) => {
      if (!organizationId) throw new Error('No organization selected');
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (whatsapp_business_name !== undefined) updates.whatsapp_business_name = whatsapp_business_name;
      if (display_phone_number !== undefined) updates.display_phone_number = display_phone_number;
      if (name_status !== undefined) updates.name_status = name_status;
      const { data, error } = await supabase
        .from('organization_whatsapp_accounts')
        .update(updates)
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .select()
        .single();
      if (error) throw error;
      return data as WhatsAppAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts', organizationId] });
    },
  });

  return {
    accounts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    upsert: upsertMutation.mutateAsync,
    isUpserting: upsertMutation.isPending,
    disconnect: deleteMutation.mutateAsync,
    isDisconnecting: deleteMutation.isPending,
    updateName: updateNameMutation.mutateAsync,
    maxAccounts: MAX_ACCOUNTS_PER_ORG,
  };
}
