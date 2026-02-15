import React, { useState } from 'react';
import { DesktopWarning } from '@/mobile/components/DesktopWarning';
import { SidebarProvider, SidebarTrigger } from '@/mobile/components/ui/sidebar';
import { AppSidebar } from '@/mobile/components/AppSidebar';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
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
  initialTicketId: string | null;
  onSelectConversation: (conv: LiveChatConversation) => void;
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
  initialTicketId,
  onSelectConversation,
  invalidTicketId = false,
}: LiveChatListViewProps) {
  const { t } = useAppTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPopupOpen, setSearchPopupOpen] = useState(false);

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
            <div className="sticky top-0 z-30 flex flex-col gap-2 p-3 bg-card border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="md:hidden" />
                <div className="flex-1 min-w-0">
                  <h1 className="text-base font-semibold text-foreground">Live Chat</h1>
                  <p className="text-xs text-muted-foreground">{t('sidebar.operations.livechat.description', 'Inbox dan percakapan WhatsApp')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSearchPopupOpen(true)}
                  className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-background text-sm text-muted-foreground"
                >
                  <Search className="h-4 w-4 shrink-0" />
                  <span>{t('whatsappInbox.searchConversations', 'Cari percakapan atau orang')}</span>
                </button>
              </div>

              <Dialog open={searchPopupOpen} onOpenChange={(open) => { setSearchPopupOpen(open); if (!open) setSearchQuery(''); }}>
                <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col p-4">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>{t('whatsappInbox.searchConversations', 'Cari percakapan atau orang')}</DialogTitle>
                  </DialogHeader>
                  <div className="min-h-0 flex flex-col overflow-hidden flex-1">
                    <MobileSearchConversationPopup
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      conversations={conversations}
                      onSelectConversation={(conv) => {
                        onSelectConversation(conv);
                        setSearchPopupOpen(false);
                      }}
                      selectedId={null}
                    />
                  </div>
                </DialogContent>
              </Dialog>

              <Select
                value={accountFilter || 'all'}
                onValueChange={(v) => setAccountFilter((v === 'all' ? '' : v) as AccountFilterValue)}
              >
                <SelectTrigger className="w-full h-9 text-sm font-medium border-gray-200 bg-white" aria-label={t('whatsappInbox.filterByAccount', 'Filter menurut akun')}>
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
