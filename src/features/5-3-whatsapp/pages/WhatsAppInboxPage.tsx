import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { useWhatsAppConversations } from '../hooks/useWhatsAppConversations';
import { useEmailConversations } from '../hooks/useEmailConversations';
import type { LiveChatConversation, WhatsAppConversation } from '../types';

export function WhatsAppInboxPage() {
  const { t } = useAppTranslation();
  const [searchParams] = useSearchParams();
  const { data: waConversations = [], isLoading: waLoading, error: waError } = useWhatsAppConversations();
  const { data: emailConversations = [], isLoading: emailLoading, error: emailError } = useEmailConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isQuickActionExpanded, setIsQuickActionExpanded] = useState(true);
  const [conversationSearch, setConversationSearch] = useState('');
  const [searchPopupOpen, setSearchPopupOpen] = useState(false);
  const [scrollToTextInChat, setScrollToTextInChat] = useState<string | null>(null);
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null);
  const initialConversationId = searchParams.get('conversation');

  const conversations: LiveChatConversation[] = useMemo(() => {
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

  const selectedConversation = useMemo(
    () => (selectedId ? conversations.find((c) => c.id === selectedId) ?? null : null),
    [conversations, selectedId]
  );

  const handleSelectConversation = (conv: LiveChatConversation) => {
    setSelectedId(conv.id);
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
              <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-row max-w-full rounded-lg border border-gray-200 shadow-sm bg-white max-h-[calc(100vh-120px)]">
                {/* Kiri: daftar conversation - sidebar */}
                <aside className="flex-shrink-0 border-r border-gray-200 flex flex-col min-h-0 bg-white" style={{ width: '20rem', minWidth: '20rem' }} aria-label="Conversations">
                  <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
                    <h2 className="font-semibold text-gray-900">Conversations</h2>
                    <button
                      type="button"
                      onClick={() => setSearchPopupOpen(true)}
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                      title={t('whatsappInbox.searchConversations', 'Search conversation or people')}
                      aria-label={t('whatsappInbox.searchConversations', 'Search conversation or people')}
                    >
                      <Search className="h-4 w-4" />
                    </button>
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
                          setSelectedId(conv.id);
                          setSearchPopupOpen(false);
                          setScrollToTextInChat(conversationSearch.trim() || null);
                          setScrollToMessageId(null);
                        }}
                        onSelectMessageResult={(conv, messageId) => {
                          setSelectedId(conv.id);
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
                      searchQuery={conversationSearch.trim()}
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
                        <LivechatQuickActionPanel conversation={selectedConversation?.source === 'whatsapp' ? selectedConversation : null} />
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
