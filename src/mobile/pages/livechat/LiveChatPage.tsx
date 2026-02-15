import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useWhatsAppConversations } from '@/features/5-3-whatsapp/hooks/useWhatsAppConversations';
import { useInstagramConversations } from '@/features/5-3-whatsapp/hooks/useInstagramConversations';
import { useEmailConversations } from '@/features/5-3-whatsapp/hooks/useEmailConversations';
import { useWhatsAppAccounts } from '@/features/5-3-whatsapp/hooks/useWhatsAppAccounts';
import { useInstagramAccounts } from '@/features/5-3-whatsapp/hooks/useInstagramAccounts';
import { useEmailConnections } from '@/features/5-3-whatsapp/hooks/useEmailConnections';
import type { LiveChatConversation, WhatsAppConversation, InstagramConversation } from '@/features/5-3-whatsapp/types';
import { getConversationTicketId } from './shared/getConversationTicketId';
import { LiveChatListView } from './LiveChatListView';
import { LiveChatChatView } from './LiveChatChatView';
import { useLiveChatInboundNotification } from './hooks/useLiveChatInboundNotification';

type AccountFilterValue = '' | `wa:${string}` | `ig:${string}` | `email:${string}`;

export default function LiveChatPage() {
  const { t } = useAppTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ticketId = searchParams.get('ticket_id');
  const [accountFilter, setAccountFilter] = useState<AccountFilterValue>('');
  const [showInvalidTicketBanner, setShowInvalidTicketBanner] = useState(false);

  const { data: waConversations = [], isLoading: waLoading, error: waError } = useWhatsAppConversations();
  const { data: igConversations = [], isLoading: igLoading, error: igError } = useInstagramConversations();
  const { data: emailConversations = [], isLoading: emailLoading, error: emailError } = useEmailConversations();
  const { accounts: waAccounts } = useWhatsAppAccounts();
  const { accounts: igAccounts } = useInstagramAccounts();
  const { connections: emailConnections } = useEmailConnections();

  useEffect(() => {
    queryClient
      .prefetchQuery({
        queryKey: ['lead-statuses'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('lead_statuses')
            .select('id, name, color')
            .eq('is_active', true)
            .order('sort_order');
          if (error) throw error;
          return (data ?? []) as Array<{ id: string; name: string; color: string | null }>;
        },
      })
      .catch((err) => {
        console.warn('Failed to prefetch lead-statuses', err);
      });
  }, [queryClient]);

  const allConversations: LiveChatConversation[] = useMemo(() => {
    const wa: LiveChatConversation[] = (waConversations as WhatsAppConversation[]).map((c) => ({ ...c, source: 'whatsapp' as const }));
    const ig: LiveChatConversation[] = (igConversations as InstagramConversation[]).map((c) => ({ ...c, source: 'instagram' as const }));
    const email: LiveChatConversation[] = emailConversations.map((c) => ({ ...c, source: 'email' as const }));
    const merged = [...wa, ...ig, ...email];
    merged.sort((a, b) => {
      const aAt = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bAt = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bAt - aAt;
    });
    return merged;
  }, [waConversations, igConversations, emailConversations]);

  const accountOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: 'all', label: t('whatsappInbox.filterAllAccounts', 'Semua akun') },
    ];
    waAccounts.forEach((acc) => {
      const name = acc.whatsapp_business_name?.trim() || acc.display_phone_number?.trim() || acc.phone_number_id || t('whatsappInbox.whatsApp', 'WhatsApp');
      opts.push({ value: `wa:${acc.phone_number_id}` as const, label: `WhatsApp - ${name}` });
    });
    igAccounts.forEach((acc) => {
      const name = acc.instagram_username?.trim() ? `@${acc.instagram_username}` : acc.instagram_name?.trim() || acc.instagram_business_account_id || t('whatsappInbox.instagram', 'Instagram');
      opts.push({ value: `ig:${acc.instagram_business_account_id}` as const, label: `Instagram - ${name}` });
    });
    emailConnections.forEach((conn) => {
      opts.push({ value: `email:${conn.id}` as const, label: `Email - ${conn.email_address}` });
    });
    return opts;
  }, [waAccounts, igAccounts, emailConnections, t]);

  const conversations = useMemo(() => {
    if (!accountFilter) return allConversations;
    if (accountFilter.startsWith('wa:')) {
      const pnid = accountFilter.slice(3);
      return allConversations.filter(
        (c) => c.source === 'whatsapp' && (c as WhatsAppConversation).phone_number_id === pnid
      );
    }
    if (accountFilter.startsWith('ig:')) {
      const igAccountId = accountFilter.slice(3);
      return allConversations.filter((c) => {
        if (c.source !== 'instagram') return false;
        return (c as InstagramConversation).instagram_business_account_id === igAccountId;
      });
    }
    if (accountFilter.startsWith('email:')) {
      const connId = accountFilter.slice(6);
      return allConversations.filter((c) => c.source === 'email' && (c as { email_connection_id: string }).email_connection_id === connId);
    }
    return allConversations;
  }, [allConversations, accountFilter]);

  const selectedConversation = useMemo(() => {
    if (!ticketId?.trim()) return null;
    const tid = ticketId.trim().toUpperCase();
    return conversations.find((c) => getConversationTicketId(c) === tid) ?? null;
  }, [ticketId, conversations]);

  // Global realtime: show system notification on inbound message (list view or app in background)
  useLiveChatInboundNotification(selectedConversation?.id ?? null);

  const isLoading = waLoading || igLoading || emailLoading;
  const invalidTicketId = !!(ticketId?.trim() && !isLoading && !selectedConversation);

  useEffect(() => {
    if (!invalidTicketId) return;
    setShowInvalidTicketBanner(true);
    navigate('/operations/consultant/all/livechat', { replace: true });
  }, [invalidTicketId, navigate]);

  useEffect(() => {
    if (!showInvalidTicketBanner) return;
    const tId = window.setTimeout(() => setShowInvalidTicketBanner(false), 4000);
    return () => window.clearTimeout(tId);
  }, [showInvalidTicketBanner]);

  const handleSelectConversation = (conv: LiveChatConversation) => {
    navigate(`/operations/consultant/all/livechat?ticket_id=${encodeURIComponent(getConversationTicketId(conv))}`);
  };

  const handleBack = () => {
    navigate('/operations/consultant/all/livechat');
  };

  if (ticketId && selectedConversation) {
    return (
      <LiveChatChatView
        selectedConversation={selectedConversation}
        onBack={handleBack}
        waAccounts={waAccounts}
      />
    );
  }

  return (
    <LiveChatListView
      conversations={conversations}
      isLoading={isLoading}
      error={waError ?? igError ?? emailError}
      waAccounts={waAccounts}
      accountOptions={accountOptions}
      accountFilter={accountFilter}
      setAccountFilter={setAccountFilter}
      initialTicketId={ticketId}
      onSelectConversation={handleSelectConversation}
      invalidTicketId={showInvalidTicketBanner}
    />
  );
}
