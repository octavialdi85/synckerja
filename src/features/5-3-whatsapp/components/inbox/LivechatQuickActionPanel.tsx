import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Button } from '@/features/ui/button';
import { Textarea } from '@/features/ui/textarea';
import { ScrollArea } from '@/features/ui/scroll-area';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useLeads } from '@/hooks/organized/sales';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { LeadStatusSelect } from '@/features/5-3-leads-management/LeadStatusSelect';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/features/ui/tooltip';
import { Plus, User, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import type { WhatsAppConversation } from '../../types';

const PROSPECT_STATUS_OPTIONS = ['Hot Prospect', 'Warm Prospect', 'Cold Prospect'] as const;

function maskPhoneLast4(phone: string | null | undefined): string {
  if (phone == null || phone === '') return '';
  const s = String(phone).trim();
  if (s.length <= 4) return '****';
  return s.slice(0, -4) + '****';
}

function getLeadTitle(conv: WhatsAppConversation, t: (key: string, fallback?: string) => string): string {
  if (conv.channel === 'instagram' && !conv.customer_name?.trim()) {
    return t('whatsappInbox.instagramContact', 'Kontak Instagram');
  }
  return conv.customer_name || maskPhoneLast4(conv.customer_wa_id) || 'Unknown';
}

interface LeadStatus {
  id: string;
  name: string;
  color: string;
}

interface LivechatQuickActionPanelProps {
  conversation: WhatsAppConversation | null;
}

interface FollowUpUpdateRow {
  id: string;
  conversation_id: string;
  update_details: string;
  status: string | null;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
  organization_id: string;
}

export function LivechatQuickActionPanel({ conversation }: LivechatQuickActionPanelProps) {
  const { t } = useAppTranslation();
  const queryClient = useQueryClient();
  const { organizationId } = useCurrentOrg();
  const { updateLead } = useLeads();
  const [updateDetails, setUpdateDetails] = useState('');
  const [prospectStatus, setProspectStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFollowUpExpanded, setIsFollowUpExpanded] = useState(true);

  // Opsi dropdown Status = dari DB (lead_statuses); tampilan pakai getLeadStatusDisplayName (Open→Unread, In Progress→On going, Closed→Resolve)
  const { data: leadStatuses = [] } = useQuery({
    queryKey: ['lead-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_statuses')
        .select('id, name, color')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as LeadStatus[];
    },
  });

  const { data: conversationStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['whatsapp-conversation-status', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return null;
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('lead_status_id')
        .eq('id', conversation.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.lead_status_id as string) ?? null;
    },
    enabled: !!conversation?.id,
    refetchInterval: 5000, // Poll setiap 5s agar status Resolve → Unread (setelah customer kirim pesan) ikut ter-refresh
  });

  const { data: followUpUpdates = [], refetch: refetchFollowUps } = useQuery({
    queryKey: ['whatsapp-conversation-follow-ups', conversation?.id],
    queryFn: async (): Promise<FollowUpUpdateRow[]> => {
      if (!conversation?.id) return [];
      const { data, error } = await supabase
        .from('whatsapp_conversation_follow_up_updates')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FollowUpUpdateRow[];
    },
    enabled: !!conversation?.id,
  });


  const syncFollowUpCountAndPriority = useCallback(async () => {
    if (!conversation?.id || !organizationId) return;
    const { data: allUpdates, error: fetchError } = await supabase
      .from('whatsapp_conversation_follow_up_updates')
      .select('status')
      .eq('conversation_id', conversation.id);
    if (fetchError) return;
    const count = allUpdates?.length ?? 0;
    const statusCounts = { 'Hot Prospect': 0, 'Warm Prospect': 0, 'Cold Prospect': 0 };
    allUpdates?.forEach((u: { status?: string }) => {
      if (u.status && u.status in statusCounts) statusCounts[u.status as keyof typeof statusCounts]++;
    });
    let fu_priority: string | null = null;
    if (count > 0) {
      const hot = statusCounts['Hot Prospect'];
      const warm = statusCounts['Warm Prospect'];
      const cold = statusCounts['Cold Prospect'];
      const max = Math.max(hot, warm, cold);
      if (hot === max && max > 0) fu_priority = 'High';
      else if (warm === max && max > 0) fu_priority = 'Medium';
      else if (cold === max && max > 0) fu_priority = 'Low';
    }
    await supabase
      .from('whatsapp_conversations')
      .update({ followup: count, fu_priority, updated_at: new Date().toISOString() })
      .eq('id', conversation.id);
    queryClient.invalidateQueries({ queryKey: ['leads', organizationId] });
  }, [conversation?.id, organizationId, queryClient]);

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation?.id || !updateDetails.trim() || !prospectStatus) return;
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_organization_id, full_name')
        .eq('user_id', user.id)
        .single();
      const orgId = profile?.active_organization_id;
      if (!orgId) throw new Error('No active organization');
      const { error } = await supabase.from('whatsapp_conversation_follow_up_updates').insert({
        conversation_id: conversation.id,
        update_details: updateDetails.trim(),
        status: prospectStatus || null,
        created_by: user.id,
        created_by_name: profile?.full_name || user.email || 'Unknown',
        organization_id: orgId,
      });
      if (error) throw error;
      await syncFollowUpCountAndPriority();
      await refetchFollowUps();
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(t('whatsappInbox.followUpAdded', 'Follow-up update added successfully'));
      setUpdateDetails('');
      setProspectStatus('');
    } catch (err) {
      console.error('Error adding follow-up update:', err);
      toast.error(t('whatsappInbox.followUpAddFailed', 'Failed to add follow-up update'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-gray-500">
          {t('whatsappInbox.quickActionSelectConversation', 'Select a conversation to see quick actions')}
        </p>
      </div>
    );
  }

  const leadId = `wa-${conversation.id}`;
  const leadTitle = getLeadTitle(conversation, t);
  const currentStatusId = conversationStatus ?? (leadStatuses.length > 0 ? leadStatuses[0].id : '');
  const currentStatus = leadStatuses.find((s) => s.id === currentStatusId);
  const isResolved = currentStatus?.name?.trim().toLowerCase() === 'closed';
  // Unread (Open) locked when current status is On Going / Qualified / Converted / Resolve / Lost
  const handleStatusChange = async (newStatusId: string) => {
    const newStatus = leadStatuses.find((s) => s.id === newStatusId);
    if (newStatus?.name?.trim().toLowerCase() === 'closed') {
      const confirmed = window.confirm(t('leadsManagement.confirmResolve', 'Yakin ingin mengubah status menjadi Resolve? Chat outbound akan diblokir sampai ada pesan masuk baru dari customer.'));
      if (!confirmed) return;
    }
    const oldStatusName = currentStatus?.name ?? null;
    try {
      await updateLead({
        id: leadId,
        status_id: newStatusId,
        organization_id: conversation.organization_id,
        lead_status: oldStatusName ? { name: oldStatusName } : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation-status', conversation.id] });
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(t('whatsappInbox.statusUpdated', 'Status updated'));
    } catch (err) {
      console.error('Failed to update lead status:', err);
      toast.error(t('whatsappInbox.statusUpdateFailed', 'Failed to update status'));
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 truncate" title={leadTitle}>
        {leadTitle}
      </p>

      {/* Update Follow Up - expand/collapse */}
      <div className="rounded-lg border border-gray-200 bg-slate-50/80 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => !isResolved && setIsFollowUpExpanded((v) => !v)}
          disabled={isResolved}
          className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-slate-100/80 transition-colors rounded-t-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-slate-50/80"
          aria-expanded={isFollowUpExpanded}
          title={isResolved ? t('whatsappInbox.chatResolvedNoActions', 'Chat sudah di-resolve') : (isFollowUpExpanded ? t('whatsappInbox.clickToCollapse', 'Click to collapse') : t('whatsappInbox.clickToExpand', 'Click to expand'))}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <Plus className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-800">{t('whatsappInbox.addProgressUpdate', 'Add Progress Update')}</span>
          </div>
          {isFollowUpExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />
          )}
        </button>
        {isFollowUpExpanded && (
        <div className="p-3 pt-0 space-y-3 border-t border-gray-200">
          <form onSubmit={handleAddUpdate} className="space-y-2">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                {t('whatsappInbox.updateDetails', 'Update Details')}
              </label>
              <Textarea
                value={updateDetails}
                onChange={(e) => setUpdateDetails(e.target.value)}
                placeholder={t('whatsappInbox.updateDetailsPlaceholder', 'Describe the progress or changes made...')}
                className="min-h-[72px] resize-none text-sm bg-white border-gray-200"
                required
                disabled={isResolved}
              />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1 min-w-0">
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  {t('whatsappInbox.prospectStatus', 'Prospect Status')} <span className="text-red-500">*</span>
                </label>
                <Select value={prospectStatus} onValueChange={setProspectStatus} required>
                  <SelectTrigger className="w-full text-sm bg-white border-gray-200" disabled={isResolved}>
                    <SelectValue placeholder={t('whatsappInbox.selectProspectStatus', 'Select prospect status...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {PROSPECT_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={isResolved || isSubmitting || !updateDetails.trim() || !prospectStatus}
                className="shrink-0 h-10"
              >
                {isSubmitting ? t('whatsappInbox.adding', 'Adding...') : t('whatsappInbox.addUpdate', 'Add Update')}
              </Button>
            </div>
          </form>

          {/* Update History - bagian dari wrapper yang sama */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-medium text-gray-600">
                {t('whatsappInbox.updateHistory', 'Update History')} ({followUpUpdates.length})
              </span>
            </div>
            <ScrollArea className="h-[140px] rounded border border-gray-200 bg-white/80 p-2">
              {followUpUpdates.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-xs">
                  <p>{t('whatsappInbox.noUpdatesYet', 'No updates yet.')}</p>
                  <p className="mt-0.5">{t('whatsappInbox.initialDiscussionCreated', 'Initial discussion point created')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {followUpUpdates.map((u) => (
                    <div
                      key={u.id}
                      className="flex gap-2 text-xs rounded-md border border-gray-200 bg-white/60 p-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-gray-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-gray-800">{u.created_by_name || '—'}</span>
                          {u.status && (
                            <span className="px-1.5 py-0.5 rounded border border-gray-200 bg-white text-gray-600">
                              {u.status}
                            </span>
                          )}
                          <span className="text-gray-400">{format(new Date(u.created_at), 'MMM dd, HH:mm')}</span>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p
                              className="text-gray-700 whitespace-pre-wrap mt-0.5 line-clamp-2 break-words cursor-help"
                              title=""
                            >
                              {u.update_details}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-[280px] max-h-[200px] overflow-y-auto whitespace-pre-wrap text-left"
                          >
                            {u.update_details}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
        )}
      </div>

      {/* Status - kode sama dengan leads-management (LeadStatusSelect) */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-600">
          {t('whatsappInbox.status', 'Status')}
        </label>
        <LeadStatusSelect
          value={currentStatusId || undefined}
          onValueChange={handleStatusChange}
          leadStatuses={leadStatuses}
          currentStatusName={currentStatus?.name ?? ''}
          disabled={isResolved}
          triggerClassName="w-full text-sm border rounded-lg font-medium"
          isLoading={statusLoading}
        />
      </div>
    </div>
  );
}
