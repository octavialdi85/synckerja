import React, { useState } from 'react';
import { DesktopWarning } from '@/mobile/components/DesktopWarning';
import { SidebarProvider, SidebarTrigger } from '@/mobile/components/ui/sidebar';
import { AppSidebar } from '@/mobile/components/AppSidebar';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useVisualViewport } from '@/mobile/hooks/useVisualViewport';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Search } from 'lucide-react';
import type { LiveChatConversation } from '@/features/5-3-whatsapp/types';
import type { WhatsAppAccount } from '@/features/5-3-whatsapp/types';
import { MobileConversationList } from './components/MobileConversationList';
import { MobileSearchConversationPopup } from './components/MobileSearchConversationPopup';

type AccountFilterValue = '' | `wa:${string}` | `ig:${string}` | `email:${string}`;

interface LiveChatListViewProps {
  conversations: LiveChatConversation[];
  isLoading: boolean;
  error: Error | null;
  waAccounts: WhatsAppAccount[];
  accountOptions: { value: string; label: string }[];
  accountFilter: AccountFilterValue;
  setAccountFilter: (v: AccountFilterValue) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  statusOptions: { value: string; label: string }[];
  initialTicketId: string | null;
  onSelectConversation: (conv: LiveChatConversation) => void;
  /** When user selects from search popup: open conversation and optionally highlight text or scroll to message. */
  onSelectFromSearch?: (conv: LiveChatConversation, opts?: { textQuery?: string; messageId?: string }) => void;
  /** When true, show banner that the ticket_id in URL was not found. */
  invalidTicketId?: boolean;
}

export function LiveChatListView({
  conversations,
  isLoading,
  error,
  waAccounts,
  accountOptions,
  accountFilter,
  setAccountFilter,
  statusFilter,
  setStatusFilter,
  statusOptions,
  initialTicketId,
  onSelectConversation,
  onSelectFromSearch,
  invalidTicketId = false,
}: LiveChatListViewProps) {
  const { t } = useAppTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPopupOpen, setSearchPopupOpen] = useState(false);
  const { height: viewportHeight } = useVisualViewport();

  const waAccountsForHint = waAccounts.map((a) => ({
    display_phone_number: a.display_phone_number,
    phone_number_id: a.phone_number_id,
  }));

  return (
    <DesktopWarning>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />

          <main className="flex-1 bg-background overflow-x-hidden flex flex-col" style={{ height: '100vh' }}>
            <div className="sticky top-0 z-30 flex flex-col gap-2 p-2 bg-card border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="md:hidden" />
                <div className="flex-1 min-w-0">
                  <h1 className="text-base font-semibold text-foreground">Live Chat</h1>
                  <p className="text-xs text-muted-foreground truncate">{t('sidebar.operations.livechat.description', 'Inbox dan percakapan WhatsApp')}</p>
                </div>
              </div>

              <div className="flex w-full items-center gap-1.5 min-w-0">
                <Select
                  value={accountFilter || 'all'}
                  onValueChange={(v) => setAccountFilter((v === 'all' ? '' : v) as AccountFilterValue)}
                >
                  <SelectTrigger className="h-8 flex-1 min-w-0 px-2 text-sm font-medium border border-input bg-background" aria-label={t('whatsappInbox.filterByAccount', 'Filter menurut akun')}>
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 flex-1 min-w-0 px-2 text-sm font-medium border border-input bg-background" aria-label={t('whatsappInbox.filterByStatus', 'Filter menurut status')}>
                    <SelectValue placeholder={t('whatsappInbox.status', 'Status')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-md z-50 max-h-[min(60vh,400px)]">
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-sm">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => setSearchPopupOpen(true)}
                  className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title={t('whatsappInbox.searchConversations', 'Cari percakapan atau orang')}
                  aria-label={t('whatsappInbox.searchConversations', 'Cari percakapan atau orang')}
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>

              <Dialog open={searchPopupOpen} onOpenChange={(open) => { setSearchPopupOpen(open); if (!open) setSearchQuery(''); }}>
                <DialogContent
                  className="sm:max-w-md overflow-hidden flex flex-col p-4"
                  style={viewportHeight > 0 ? { maxHeight: viewportHeight - 48 } : undefined}
                >
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>{t('whatsappInbox.searchConversations', 'Cari percakapan atau orang')}</DialogTitle>
                  </DialogHeader>
                  <div className="min-h-0 flex flex-col overflow-hidden flex-1 overflow-y-auto">
                    <MobileSearchConversationPopup
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      conversations={conversations}
                      onSelectConversation={(conv) => {
                        if (onSelectFromSearch) {
                          onSelectFromSearch(conv, { textQuery: searchQuery.trim() || undefined });
                        } else {
                          onSelectConversation(conv);
                        }
                        setSearchPopupOpen(false);
                      }}
                      onSelectMessageResult={
                        onSelectFromSearch
                          ? (conv, messageId) => {
                              onSelectFromSearch(conv, { messageId });
                              setSearchPopupOpen(false);
                            }
                          : undefined
                      }
                      selectedId={null}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {invalidTicketId && (
              <div className="flex-shrink-0 px-3 py-2 mx-3 mt-2 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800" role="alert">
                {t('whatsappInbox.conversationNotFound', 'Obrolan tidak ditemukan.')}
              </div>
            )}

            <div className="flex-1 overflow-y-auto seamless-scroll min-h-0">
              <MobileConversationList
                conversations={conversations}
                isLoading={isLoading}
                error={error}
                selectedId={null}
                onSelect={onSelectConversation}
                initialConversationId={null}
                initialTicketId={initialTicketId}
                searchQuery={searchQuery}
                accountFilter={accountFilter || undefined}
                waAccountsForHint={waAccountsForHint}
              />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </DesktopWarning>
  );
}
