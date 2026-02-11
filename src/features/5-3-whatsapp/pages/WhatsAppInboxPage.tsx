import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getConversationTicketId } from '../components/inbox/ConversationList';
import { useQueryClient } from '@tanstack/react-query';
import { PanelRightOpen, PanelRightClose, Search } from 'lucide-react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from '@/features/5-3-dashboard/HeaderAndTab';
import { ConversationList } from '../components/inbox/ConversationList';
import { ChatThread } from '../components/inbox/ChatThread';
import { EmailChatThread } from '../components/inbox/EmailChatThread';
import { LivechatQuickActionPanel } from '../components/inbox/LivechatQuickActionPanel';
import { SearchConversationPopup } from '../components/inbox/SearchConversationPopup';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { useWhatsAppConversations } from '../hooks/useWhatsAppConversations';
import { useEmailConversations } from '../hooks/useEmailConversations';
import { useWhatsAppAccounts } from '../hooks/useWhatsAppAccounts';
import { useEmailConnections } from '../hooks/useEmailConnections';
import { supabase } from '@/integrations/supabase/client';
import type { LiveChatConversation, WhatsAppConversation } from '../types';

type AccountFilterValue = '' | `wa:${string}` | `ig:${string}` | `email:${string}`;

export function WhatsAppInboxPage() {
  const { t } = useAppTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: waConversations = [], isLoading: waLoading, error: waError } = useWhatsAppConversations();

  // Prefetch lead-statuses so outbound send can optimistically set In Progress (useSendWhatsAppMessage reads from cache).
  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: ['lead-statuses'],
      queryFn: async () => {
        const { data, error } = await supabase.from('lead_statuses').select('id, name, color').eq('is_active', true).order('sort_order');
        if (error) throw error;
        return (data ?? []) as Array<{ id: string; name: string; color: string | null }>;
      },
    });
  }, [queryClient]);
  const { data: emailConversations = [], isLoading: emailLoading, error: emailError } = useEmailConversations();
  const { accounts: waAccounts } = useWhatsAppAccounts();
  const { connections: emailConnections } = useEmailConnections();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isQuickActionExpanded, setIsQuickActionExpanded] = useState(true);
  const [conversationSearch, setConversationSearch] = useState('');
  const [searchPopupOpen, setSearchPopupOpen] = useState(false);
  const [accountFilter, setAccountFilter] = useState<AccountFilterValue>('');
  const [scrollToTextInChat, setScrollToTextInChat] = useState<string | null>(null);
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null);
  const initialConversationId = searchParams.get('conversation');
  const initialTicketId = searchParams.get('ticket_id');

  const allConversations: LiveChatConversation[] = useMemo(() => {
    const wa: LiveChatConversation[] = (waConversations as WhatsAppConversation[]).map((c) => ({ ...c, source: 'whatsapp' as const }));
    const email: LiveChatConversation[] = emailConversations.map((c) => ({ ...c, source: 'email' as const }));
    const merged = [...wa, ...email];
    merged.sort((a, b) => {
      const aAt = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bAt = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bAt - aAt;
    });
    return merged;
  }, [waConversations, emailConversations]);

  const accountOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: 'all', label: t('whatsappInbox.filterAllAccounts', 'Semua akun') },
    ];
    waAccounts.forEach((acc) => {
      const name = acc.whatsapp_business_name?.trim() || acc.display_phone_number?.trim() || acc.phone_number_id || t('whatsappInbox.whatsApp', 'WhatsApp');
      opts.push({ value: `wa:${acc.phone_number_id}` as const, label: `WhatsApp - ${name}` });
    });
    // Instagram: phone_number_id is NULL in DB; group by whatsapp_account_display_name (e.g. @octa.vialdi)
    const igFromConvs = new Map<string, string>();
    (waConversations as WhatsAppConversation[]).forEach((c) => {
      if (c.channel === 'instagram') {
        const name = c.whatsapp_account_display_name?.trim() || t('whatsappInbox.instagram', 'Instagram');
        const key = name || 'instagram';
        if (!igFromConvs.has(key)) igFromConvs.set(key, name);
      }
    });
    igFromConvs.forEach((name, key) => {
      opts.push({ value: `ig:${encodeURIComponent(key)}`, label: `Instagram - ${name}` });
    });
    emailConnections.forEach((conn) => {
      opts.push({ value: `email:${conn.id}` as const, label: `Email - ${conn.email_address}` });
    });
    return opts;
  }, [waAccounts, waConversations, emailConnections, t]);

  const conversations = useMemo(() => {
    if (!accountFilter) return allConversations;
    if (accountFilter.startsWith('wa:')) {
      const pnid = accountFilter.slice(3);
      return allConversations.filter(
        (c) => c.source === 'whatsapp' && (c as WhatsAppConversation).channel !== 'instagram' && (c as WhatsAppConversation).phone_number_id === pnid
      );
    }
    if (accountFilter.startsWith('ig:')) {
      const key = decodeURIComponent(accountFilter.slice(3));
      return allConversations.filter((c) => {
        if (c.source !== 'whatsapp' || (c as WhatsAppConversation).channel !== 'instagram') return false;
        const displayName = (c as WhatsAppConversation).whatsapp_account_display_name?.trim() || '';
        const convKey = displayName || 'instagram';
        return convKey === key;
      });
    }
    if (accountFilter.startsWith('email:')) {
      const connId = accountFilter.slice(6);
      return allConversations.filter((c) => c.source === 'email' && (c as { email_connection_id: string }).email_connection_id === connId);
    }
    return allConversations;
  }, [allConversations, accountFilter]);

  const selectedConversation = useMemo(
    () => (selectedId ? conversations.find((c) => c.id === selectedId) ?? null : null),
    [conversations, selectedId]
  );

  const handleSelectConversation = (conv: LiveChatConversation) => {
    setSelectedId(conv.id);
    setSearchParams({ ticket_id: getConversationTicketId(conv) }, { replace: true });
  };

  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col">
              <div className="flex-shrink-0">
                <HeaderAndTab />
              </div>
              {waAccounts.length === 0 && (
                <div className="flex-shrink-0 mx-4 mb-2 px-3 py-2 rounded-lg bg-slate-100 border border-slate-300 text-sm text-slate-800 flex items-center gap-2" role="alert">
                  <span className="font-medium">{t('whatsappInbox.noAccountBannerTitle', 'Tidak ada akun WhatsApp terhubung')}</span>
                  <span>{t('whatsappInbox.noAccountBannerBody', 'Percakapan yang tampil adalah riwayat lama. Untuk mengirim pesan, hubungkan akun di Connect WhatsApp.')}</span>
                </div>
              )}
              <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-row max-w-full rounded-lg border border-gray-200 shadow-sm bg-white max-h-[calc(100vh-120px)]">
                {/* Kiri: daftar conversation - sidebar */}
                <aside className="flex-shrink-0 border-r border-gray-200 flex flex-col min-h-0 bg-white" style={{ width: '20rem', minWidth: '20rem' }} aria-label="Conversations">
                  <div className="flex-shrink-0 px-3 py-3 border-b border-gray-200 bg-gray-50 flex flex-col gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Select value={accountFilter || 'all'} onValueChange={(v) => setAccountFilter((v === 'all' ? '' : v) as AccountFilterValue)}>
                        <SelectTrigger className="flex-1 min-w-0 h-9 text-sm font-medium text-gray-900 border-gray-200 bg-white" aria-label={t('whatsappInbox.filterByAccount', 'Filter menurut akun')}>
                          <SelectValue placeholder={t('whatsappInbox.filterByAccount', 'Filter menurut akun')} />
                        </SelectTrigger>
                        <SelectContent className="bg-white border shadow-md z-50 max-h-[min(60vh,400px)]">
                          {accountOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-sm">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        onClick={() => setSearchPopupOpen(true)}
                        className="shrink-0 p-2 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                        title={t('whatsappInbox.searchConversations', 'Search conversation or people')}
                        aria-label={t('whatsappInbox.searchConversations', 'Search conversation or people')}
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <Dialog open={searchPopupOpen} onOpenChange={(open) => { setSearchPopupOpen(open); if (!open) setConversationSearch(''); }}>
                    <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col p-4">
                      <DialogHeader className="flex-shrink-0">
                        <DialogTitle>{t('whatsappInbox.searchConversations', 'Search conversation or people')}</DialogTitle>
                      </DialogHeader>
                      <div className="min-h-0 flex flex-col overflow-hidden flex-1">
                      <SearchConversationPopup
                        searchQuery={conversationSearch}
                        onSearchChange={setConversationSearch}
                        onSelectConversation={(conv) => {
                          handleSelectConversation(conv);
                          setSearchPopupOpen(false);
                          setScrollToTextInChat(conversationSearch.trim() || null);
                          setScrollToMessageId(null);
                        }}
                        onSelectMessageResult={(conv, messageId) => {
                          handleSelectConversation(conv);
                          setSearchPopupOpen(false);
                          setScrollToMessageId(messageId);
                          setScrollToTextInChat(null);
                        }}
                        selectedId={selectedId}
                      />
                      </div>
                    </DialogContent>
                  </Dialog>
                  <div className="flex-1 overflow-y-auto seamless-scroll min-h-0">
                    <ConversationList
                      conversations={conversations}
                      isLoading={waLoading || emailLoading}
                      error={waError ?? emailError}
                      selectedId={selectedId}
                      onSelect={handleSelectConversation}
                      initialConversationId={initialConversationId}
                      initialTicketId={initialTicketId}
                      searchQuery={conversationSearch.trim()}
                      accountFilter={accountFilter || undefined}
                      waAccountsForHint={waAccounts.map((a) => ({ display_phone_number: a.display_phone_number, phone_number_id: a.phone_number_id }))}
                    />
                  </div>
                </aside>
                {/* Tengah: chat thread */}
                <main className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden" role="main">
                  {selectedConversation?.source === 'email' ? (
                    <EmailChatThread conversation={selectedConversation} />
                  ) : selectedConversation ? (
                    <ChatThread
                      conversation={selectedConversation}
                      connectedPhoneNumberIds={waAccounts.map((a) => a.phone_number_id)}
                      hasNoConnectedWhatsAppAccount={waAccounts.length === 0}
                      scrollToTextInChat={scrollToTextInChat}
                      onScrollToTextDone={() => setScrollToTextInChat(null)}
                      scrollToMessageId={scrollToMessageId}
                      onScrollToMessageDone={() => setScrollToMessageId(null)}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
                      <p className="text-sm">{t('whatsappInbox.selectConversation', 'Pilih percakapan untuk melihat dan membalas.')}</p>
                    </div>
                  )}
                </main>
                {/* Kanan: quick action - sidebar (bisa collapse agar body chat lebih luas) */}
                <aside
                  className="flex-shrink-0 border-l border-gray-200 flex flex-col min-h-0 bg-white transition-[width] duration-200"
                  style={{ width: isQuickActionExpanded ? '20rem' : '3rem', minWidth: isQuickActionExpanded ? '20rem' : '3rem' }}
                  aria-label="Quick Action"
                  aria-expanded={isQuickActionExpanded}
                >
                  {isQuickActionExpanded ? (
                    <>
                      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
                        <h2 className="font-semibold text-gray-900 truncate">{t('whatsappInbox.quickAction', 'Quick Action')}</h2>
                        <button
                          type="button"
                          onClick={() => setIsQuickActionExpanded(false)}
                          className="shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-600"
                          title={t('whatsappInbox.collapseQuickAction', 'Collapse sidebar')}
                          aria-label={t('whatsappInbox.collapseQuickAction', 'Collapse sidebar')}
                        >
                          <PanelRightClose className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto seamless-scroll min-h-0 p-4">
                        <LivechatQuickActionPanel conversation={selectedConversation ?? null} />
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsQuickActionExpanded(true)}
                      className="flex-1 flex flex-col items-center justify-center py-4 text-gray-600 hover:bg-gray-50"
                      title={t('whatsappInbox.expandQuickAction', 'Expand Quick Action')}
                      aria-label={t('whatsappInbox.expandQuickAction', 'Expand Quick Action')}
                    >
                      <PanelRightOpen className="w-5 h-5" />
                    </button>
                  )}
                </aside>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
}
