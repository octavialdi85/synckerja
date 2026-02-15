import React from 'react';
import { ConversationList, type WhatsAppAccountForHint } from '@/features/5-3-whatsapp/components/inbox/ConversationList';
import type { LiveChatConversation } from '@/features/5-3-whatsapp/types';

interface MobileConversationListProps {
  conversations: LiveChatConversation[];
  selectedId: string | null;
  onSelect: (conv: LiveChatConversation) => void;
  initialConversationId?: string | null;
  initialTicketId?: string | null;
  searchQuery?: string;
  accountFilter?: string;
  waAccountsForHint?: WhatsAppAccountForHint[];
  isLoading?: boolean;
  error?: Error | null;
}

export function MobileConversationList(props: MobileConversationListProps) {
  return (
    <div className="min-h-0">
      <ConversationList {...props} />
    </div>
  );
}
