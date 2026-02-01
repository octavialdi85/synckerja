import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWhatsAppConversations } from '../../hooks/useWhatsAppConversations';
import { useWhatsAppUnreadByConversation } from '../../hooks/useWhatsAppUnreadByConversation';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { supabase } from '@/integrations/supabase/client';
import type { WhatsAppConversation } from '../../types';
import { MessageCircle } from 'lucide-react';

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (conv: WhatsAppConversation) => void;
  /** When set, select this conversation once the list has loaded (e.g. from Leads "Open Chat" link). */
  initialConversationId?: string | null;
}

function formatTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function ConversationList({ selectedId, onSelect, initialConversationId }: ConversationListProps) {
  const queryClient = useQueryClient();
  const { organizationId } = useCurrentOrg();
  const { data: conversations = [], isLoading, error } = useWhatsAppConversations();
  const { unreadByConversation, markConversationRead } = useWhatsAppUnreadByConversation();

  useEffect(() => {
    if (conversations.length === 0 || !initialConversationId) return;
    const conv = conversations.find((c) => c.id === initialConversationId);
    if (conv) {
      supabase
        .from('whatsapp_conversations')
        .update({ last_opened_at: new Date().toISOString() })
        .eq('id', conv.id)
        .then(() => {
          if (organizationId) {
            queryClient.invalidateQueries({ queryKey: ['leads', organizationId] });
          }
        })
        .catch(() => {});
      onSelect(conv);
    }
  }, [conversations, initialConversationId, onSelect, organizationId, queryClient]);

  const handleSelect = (conv: WhatsAppConversation) => {
    if (unreadByConversation[conv.id] > 0) {
      markConversationRead(conv.id).catch(() => {});
    }
    // Mark conversation as opened in livechat (for leads-management Status column)
    supabase
      .from('whatsapp_conversations')
      .update({ last_opened_at: new Date().toISOString() })
      .eq('id', conv.id)
      .then(() => {
        if (organizationId) {
          queryClient.invalidateQueries({ queryKey: ['leads', organizationId] });
        }
      })
      .catch(() => {});
    onSelect(conv);
  };

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Loading conversations...
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 text-sm text-red-600">
        Failed to load conversations.
      </div>
    );
  }
  if (conversations.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500 flex flex-col items-center justify-center h-32">
        <MessageCircle className="w-8 h-8 text-gray-300 mb-2" />
        <span>No conversations yet. Messages will appear here when customers message your WhatsApp.</span>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {conversations.map((conv) => {
        const unread = unreadByConversation[conv.id] ?? 0;
        return (
          <li
            key={conv.id}
            onClick={() => handleSelect(conv)}
            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
              selectedId === conv.id ? 'bg-[#25D366]/10 border-l-2 border-[#25D366]' : ''
            }`}
          >
            <div className="flex justify-between items-start gap-2">
              <span className="font-medium text-gray-900 truncate min-w-0">
                {conv.customer_name || conv.customer_wa_id || 'Unknown'}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {unread > 0 && (
                  <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-green-600 text-white text-xs font-medium flex items-center justify-center">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {formatTime(conv.last_message_at)}
                </span>
              </div>
            </div>
            {conv.last_message_body != null && conv.last_message_body !== '' ? (
              <span className="text-xs text-gray-500 truncate block" title={conv.last_message_body}>
                {conv.last_message_body}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
