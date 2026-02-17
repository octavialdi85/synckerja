import React, { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWhatsAppUnreadByConversation } from '../../hooks/useWhatsAppUnreadByConversation';
import { useEmailUnreadByConversation } from '../../hooks/useEmailUnreadByConversation';
import { useLivechatProfilePhoto } from '../../hooks/useLivechatProfilePhoto';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/ui/avatar';
import type { LiveChatConversation } from '../../types';
import type { WhatsAppConversation } from '../../types';
import { MessageCircle, Check, CheckCheck, Mail, User, ListChecks } from 'lucide-react';
import { Button } from '@/features/ui/button';
import { devLog } from '@/config/logger';
import { isResolvedStatus } from '../../constants/leadStatus';

/** Ikon platform chat (akun terconnect). WhatsApp, Instagram, atau Email. */
function ChannelIcon({ channel = 'whatsapp', className }: { channel?: string; className?: string }) {
  const c = (channel || 'whatsapp').toLowerCase();
  if (c === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.268 4.771 1.691 5.077 4.97.06 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.296 3.225-1.824 4.771-5.077 4.97-1.266.06-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.194-4.771-1.691-5.077-4.97-.06-1.265-.07-1.644-.07-4.849 0-3.205.013-3.583.07-4.849.299-3.267 1.817-4.771 5.077-4.97 1.266-.059 1.645-.07 4.849-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    );
  }
  if (c === 'email') {
    return <Mail className={className} />;
  }
  // WhatsApp (default)
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/** Avatar dengan foto asli dari API (WhatsApp) dan overlay logo channel (WhatsApp/Instagram/Email) di kanan bawah. */
function LivechatAvatar({
  conv,
  displayName,
}: {
  conv: LiveChatConversation;
  displayName: string;
}) {
  const isEmail = conv.source === 'email';
  const isInstagram = conv.source === 'instagram';
  const waConv = conv as WhatsAppConversation;
  const channel = isInstagram ? 'instagram' : (waConv.channel ?? 'whatsapp');

  const { profileUrl } = useLivechatProfilePhoto(conv.id, {
    source: conv.source,
    channel,
  });

  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const overlayColor =
    channel === 'instagram'
      ? 'bg-[#E4405F]'
      : isEmail
        ? 'bg-blue-600'
        : 'bg-[#25D366]';

  return (
    <div className="relative shrink-0">
      <Avatar className="h-11 w-11 rounded-full bg-gray-200">
        <AvatarImage src={profileUrl ?? undefined} alt={displayName} className="object-cover" />
        <AvatarFallback className="rounded-full bg-gray-300 text-gray-600 text-sm font-medium">
          {initials || <User className="h-5 w-5" />}
        </AvatarFallback>
      </Avatar>
      <span
        className={`absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white ${overlayColor} text-white`}
        aria-hidden
      >
        <ChannelIcon
          channel={isEmail ? 'email' : channel}
          className="h-3.5 w-3.5"
        />
      </span>
    </div>
  );
}

/** One WhatsApp account for empty-state hint (display_phone_number, phone_number_id). */
export type WhatsAppAccountForHint = { display_phone_number?: string | null; phone_number_id: string };

interface ConversationListProps {
  /** Unified list (WhatsApp + Email). */
  conversations: LiveChatConversation[];
  selectedId: string | null;
  onSelect: (conv: LiveChatConversation) => void;
  /** When set, select this conversation once the list has loaded (e.g. from Leads "Open Chat" link). */
  initialConversationId?: string | null;
  /** When set (e.g. WA-xxx, EMAIL-xxx from Leads), select the conversation whose ticket_id matches. */
  initialTicketId?: string | null;
  /** Filter conversations by name or phone or email. */
  searchQuery?: string;
  /** Current account filter (e.g. 'wa:956884617514241'). When conversations are empty, show hint with this account's number. */
  accountFilter?: string;
  /** WhatsApp accounts (for empty-state: show "message this number" when filter is one account). */
  waAccountsForHint?: WhatsAppAccountForHint[];
  isLoading?: boolean;
  error?: Error | null;
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

/** Strip HTML tags so preview shows plain text (e.g. email body). */
function stripHtmlForPreview(html: string | null | undefined): string {
  if (html == null || html === '') return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Truncate at quoted-reply block so preview shows only the core message (no "Pada Rab, ..." / "On ... wrote:"). */
function truncateAtQuotedReply(text: string): string {
  if (!text.trim()) return text;
  const t = text.trim();
  const quoteStarts = [
    t.search(/\sPada\s+[A-Za-z]{2,4},\s*\d/), // " Pada Rab, 4 Feb" (ID)
    t.search(/\sOn\s+[A-Za-z]{2,4},\s*.+wrote:/i), // " On Wed, ... wrote:"
    t.search(/\s-{5,}/), // " -----..."
    t.search(/\sFrom\s*:/i),
    t.search(/\sSent\s*:/i),
  ].filter((i) => i >= 0);
  const first = quoteStarts.length > 0 ? Math.min(...quoteStarts) : t.length;
  return t.slice(0, first).trim();
}

/** Plain-text preview for list: strip HTML and remove quoted-reply block. */
function getEmailPreviewSnippet(html: string | null | undefined): string {
  const plain = stripHtmlForPreview(html);
  return truncateAtQuotedReply(plain);
}

/** Mask 4 digit terakhir nomor telepon untuk privasi di UI. */
function maskPhoneLast4(phone: string | null | undefined): string {
  if (phone == null || phone === '') return '';
  const s = String(phone).trim();
  if (s.length <= 4) return '****';
  return s.slice(0, -4) + '****';
}

/** Fallback when from_display_name is NULL: humanize local part of email (e.g. jasafotowedding85 -> Jasa Foto Wedding 85). */
function emailToDisplayLabel(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '';
  const local = email.split('@')[0]?.trim() || email;
  if (!local) return email;
  const withSpaces = local.replace(/[._-]+/g, ' ');
  const titleCase = withSpaces.replace(/\b\w/g, (c) => c.toUpperCase());
  return titleCase.trim() || email;
}

/** Derive ticket_id for a conversation (same logic as leads table). Exported for URL sync. */
export function getConversationTicketId(conv: LiveChatConversation): string {
  if (conv.source === 'email') {
    return 'EMAIL-' + String(conv.id).replace(/-/g, '').slice(0, 8).toUpperCase();
  }
  if (conv.source === 'instagram') {
    return 'IG-' + String(conv.id).replace(/-/g, '').slice(0, 8).toUpperCase();
  }
  return 'WA-' + String(conv.id).replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function ConversationList({
  conversations,
  isLoading = false,
  error = null,
  selectedId,
  onSelect,
  initialConversationId,
  initialTicketId,
  searchQuery = '',
  accountFilter = '',
  waAccountsForHint = [],
}: ConversationListProps) {
  const { t } = useAppTranslation();
  const queryClient = useQueryClient();
  const { organizationId } = useCurrentOrg();
  const { unreadByConversation, markConversationRead } = useWhatsAppUnreadByConversation();
  const { unreadByConversation: emailUnreadByConversation, markConversationRead: markEmailConversationRead } = useEmailUnreadByConversation();

  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((conv) => {
      if (conv.source === 'email') {
        const from = (conv.from_email ?? '').toLowerCase();
        const display = (conv.email_connection_display ?? '').toLowerCase();
        const fromName = (conv.from_display_name ?? '').toLowerCase();
        return from.includes(q) || display.includes(q) || fromName.includes(q);
      }
      if (conv.source === 'instagram') {
        const name = (conv.customer_name ?? '').toLowerCase();
        const igId = (conv.customer_ig_id ?? '').toLowerCase();
        return name.includes(q) || igId.includes(q);
      }
      const name = (conv.customer_name ?? '').toLowerCase();
      const waId = (conv.customer_wa_id ?? '').toLowerCase();
      return name.includes(q) || waId.includes(q);
    });
  }, [conversations, searchQuery]);

  const initialSelectionApplied = useRef(false);
  const lastInitialKey = useRef<string>('');
  useEffect(() => {
    const key = `${initialConversationId ?? ''}|${(initialTicketId ?? '').trim()}`;
    if (key !== lastInitialKey.current) {
      lastInitialKey.current = key;
      initialSelectionApplied.current = false;
    }
  }, [initialConversationId, initialTicketId]);

  useEffect(() => {
    if (conversations.length === 0) return;
    if (initialSelectionApplied.current) return;
    const hasInitial = initialConversationId || (initialTicketId && initialTicketId.trim());
    if (!hasInitial) return;

    let conv: LiveChatConversation | undefined;
    if (initialConversationId) {
      conv = conversations.find((c) => c.id === initialConversationId);
    } else if (initialTicketId && initialTicketId.trim()) {
      const tid = initialTicketId.trim().toUpperCase();
      conv = conversations.find((c) => getConversationTicketId(c) === tid);
    }
    if (conv) {
      if (conv.source === 'whatsapp') {
        supabase
          .from('whatsapp_conversations')
          .update({ last_opened_at: new Date().toISOString() })
          .eq('id', conv.id)
          .then(() => {
            if (organizationId) {
              queryClient.invalidateQueries({ queryKey: ['leads', organizationId] });
            }
          })
          .catch((err) => {
            devLog.warn('Failed to update last_opened_at', err);
          });
      }
      onSelect(conv);
      initialSelectionApplied.current = true;
    }
  }, [conversations, initialConversationId, initialTicketId, onSelect, organizationId, queryClient]);

  const handleSelect = (conv: LiveChatConversation) => {
    if (conv.source === 'whatsapp') {
      if (unreadByConversation[conv.id] > 0) {
        markConversationRead(conv.id).catch((err) => {
          devLog.warn('Failed to mark conversation read', err);
        });
      }
      supabase
        .from('whatsapp_conversations')
        .update({ last_opened_at: new Date().toISOString() })
        .eq('id', conv.id)
        .then(() => {
          if (organizationId) {
            queryClient.invalidateQueries({ queryKey: ['leads', organizationId] });
          }
        })
        .catch((err) => {
          devLog.warn('Failed to update last_opened_at', err);
        });
    }
    if (conv.source === 'email' && (emailUnreadByConversation[conv.id] ?? 0) > 0) {
      markEmailConversationRead(conv.id).catch((err) => {
        devLog.warn('Failed to mark conversation read', err);
      });
    }
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
    const handleRetry = () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['instagram-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['email-conversations'] });
    };
    return (
      <div className="p-4 text-sm text-red-600 flex flex-col items-center justify-center gap-3">
        <span>{t('whatsappInbox.failedToLoadConversations', 'Failed to load conversations.')}</span>
        <Button variant="outline" size="sm" onClick={handleRetry}>
          {t('common.retry', 'Coba lagi')}
        </Button>
      </div>
    );
  }
  const waAccountHint =
    accountFilter.startsWith('wa:') && waAccountsForHint.length > 0
      ? waAccountsForHint.find((a) => a.phone_number_id === accountFilter.slice(3))
      : null;
  const hintNumber = (waAccountHint?.display_phone_number ?? '').trim() || null;

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500 flex flex-col items-center justify-center h-32 text-center">
        <MessageCircle className="w-8 h-8 text-gray-300 mb-2" />
        {hintNumber ? (
          <>
            <span>{t('whatsappInbox.noConversationsYet', 'No conversations yet.')}</span>
            <span className="mt-1.5 text-gray-600">
              {t('whatsappInbox.messageThisNumberToStart', 'Have customers send a message to {{number}} and conversations will appear here.', { number: hintNumber })}
            </span>
          </>
        ) : (
          <span>{t('whatsappInbox.noConversationsYetFull', 'No conversations yet. Messages will appear when customers message WhatsApp or when verification emails arrive.')}</span>
        )}
      </div>
    );
  }

  if (filteredConversations.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500 flex flex-col items-center justify-center h-32 text-center">
        <MessageCircle className="w-8 h-8 text-gray-300 mb-2" />
        {searchQuery ? (
          <span>{t('whatsappInbox.noSearchResults', 'No conversations or contacts match your search.')}</span>
        ) : hintNumber ? (
          <>
            <span>{t('whatsappInbox.noConversationsForThisAccount', 'No conversations for this account yet.')}</span>
            <span className="mt-1.5 text-gray-600">
              {t('whatsappInbox.messageThisNumberToStart', 'Have customers send a message to {{number}} and conversations will appear here.', { number: hintNumber })}
            </span>
          </>
        ) : (
          <span>{t('whatsappInbox.noConversationsYet', 'No conversations yet.')}</span>
        )}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {filteredConversations.map((conv) => {
        const isEmail = conv.source === 'email';
        const leadStatusName = (conv as { lead_status_name?: string | null }).lead_status_name ?? null;
        const isResolved = isResolvedStatus(leadStatusName);
        const unread = isEmail ? (emailUnreadByConversation[conv.id] ?? 0) : (unreadByConversation[conv.id] ?? 0);
        const displayName = isEmail
          ? (conv.from_display_name || emailToDisplayLabel(conv.from_email) || conv.from_email || conv.email_connection_display || 'Email')
          : conv.source === 'instagram'
            ? (conv.customer_name || maskPhoneLast4(conv.customer_ig_id) || t('whatsappInbox.instagramContact', 'Kontak Instagram'))
            : (conv.customer_name || maskPhoneLast4(conv.customer_wa_id) || 'Unknown');
        return (
          <li
            key={conv.id}
            onClick={() => handleSelect(conv)}
            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
              selectedId === conv.id ? (isEmail ? 'bg-blue-50 border-l-2 border-blue-500' : 'bg-[#25D366]/10 border-l-2 border-[#25D366]') : ''
            }`}
          >
            <div className="flex gap-3 items-start">
              <LivechatAvatar conv={conv} displayName={displayName} />
              <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2">
              <span className="font-medium text-gray-900 truncate min-w-0">
                {displayName}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {isResolved && (
                  <span className="text-blue-600 shrink-0" title={t('whatsappInbox.chatResolvedNoActions', 'Chat sudah di-resolve')}>
                    <ListChecks className="w-4 h-4" />
                  </span>
                )}
                {unread > 0 && (
                  <span className={`min-w-[1.25rem] h-5 px-1.5 rounded-full text-white text-xs font-medium flex items-center justify-center ${isEmail ? 'bg-blue-600' : 'bg-green-600'}`}>
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {formatTime(conv.last_message_at)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 min-h-0 mt-0.5">
              {!isEmail && conv.last_message_direction === 'outbound' && (
                <span className="shrink-0 text-gray-500" title={conv.last_message_status === 'read' ? 'Dibaca' : conv.last_message_status === 'delivered' ? 'Terkirim' : 'Terkirim'}>
                  {conv.last_message_status === 'read' ? (
                    <CheckCheck className="w-3.5 h-3.5 text-[#25D366]" />
                  ) : conv.last_message_status === 'delivered' ? (
                    <CheckCheck className="w-3.5 h-3.5" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </span>
              )}
              {conv.last_message_body != null && conv.last_message_body !== '' ? (
                <span className="text-xs text-gray-500 truncate flex-1 min-w-0" title={isEmail ? getEmailPreviewSnippet(conv.last_message_body) : stripHtmlForPreview(conv.last_message_body)}>
                  {isEmail ? getEmailPreviewSnippet(conv.last_message_body) : stripHtmlForPreview(conv.last_message_body)}
                </span>
              ) : (
                <span className="text-xs text-gray-500 italic flex-1 min-w-0">—</span>
              )}
              {isEmail ? (
                <span className="text-xs text-gray-400 truncate max-w-[140px] shrink-0 min-w-0 text-right" title={conv.email_connection_display ?? undefined}>
                  {conv.email_connection_display ?? '—'}
                </span>
              ) : conv.source === 'instagram'
                ? (conv.instagram_account_display_name ? (
                    <span className="text-xs text-gray-400 truncate max-w-[100px] shrink-0 min-w-0" title={conv.instagram_account_display_name}>
                      {conv.instagram_account_display_name}
                    </span>
                  ) : null)
                : (conv.whatsapp_account_display_name ?? conv.channel) ? (
                    <span className="text-xs text-gray-400 truncate max-w-[100px] shrink-0 min-w-0" title={conv.whatsapp_account_display_name ?? (conv.channel === 'instagram' ? 'Instagram' : undefined)}>
                      {conv.whatsapp_account_display_name ?? (conv.channel === 'instagram' ? 'Instagram' : '')}
                    </span>
                  ) : null}
            </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
