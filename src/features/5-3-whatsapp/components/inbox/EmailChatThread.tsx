import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useEmailMessages } from '../../hooks/useEmailMessages';
import { useSendEmailReply } from '../../hooks/useSendEmailReply';
import type { EmailConversation, EmailMessage } from '../../types';
import { Mail, Copy, Reply } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/features/ui/button';
import { EmailComposePopup } from './EmailComposePopup';

/** Sanitize email body and make URLs clickable (linkify plain text). */
function sanitizeEmailBody(body: string): string {
  if (!body?.trim()) return '';
  const trimmed = body.trim();
  const looksLikeHtml = /</.test(trimmed);
  const toSanitize = looksLikeHtml
    ? trimmed
    : trimmed.replace(
        /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi,
        (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
      );
  return DOMPurify.sanitize(toSanitize, { ADD_ATTR: ['target', 'rel'] });
}

interface EmailChatThreadProps {
  conversation: EmailConversation;
  /** When true, hide the in-component header (e.g. for mobile where parent provides back + avatar + name). */
  hideHeader?: boolean;
}

function formatTime(iso: string) {
  try {
    return format(new Date(iso), 'dd MMM yyyy HH:mm');
  } catch {
    return iso;
  }
}

/** Fallback when from_display_name is NULL: humanize local part of email. */
function emailToDisplayLabel(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '';
  const local = email.split('@')[0]?.trim() || email;
  if (!local) return email;
  const withSpaces = local.replace(/[._-]+/g, ' ');
  const titleCase = withSpaces.replace(/\b\w/g, (c) => c.toUpperCase());
  return titleCase.trim() || email;
}

/** Show nama akun (display name) when set, else fallback label from email, else email. For outbound use connection display. */
function getMessageSenderDisplay(msg: EmailMessage, conversation: EmailConversation): string {
  if (msg.direction === 'outbound' && msg.from_email?.includes('inbound-')) {
    return conversation.email_connection_display ?? msg.from_email ?? '';
  }
  return msg.from_display_name ?? emailToDisplayLabel(msg.from_email) ?? msg.from_email ?? '';
}

/** Strip HTML to plain text for quoting in reply body. */
function stripHtmlToPlain(html: string | null | undefined): string {
  if (html == null || html === '') return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize subject for display: at most one "Re: " (no "Re: Re: ..."). */
function normalizeSubjectForDisplay(subject: string | null | undefined): string {
  if (subject == null || subject === '') return '';
  const s = String(subject).trim();
  const withoutRe = s.replace(/^(Re:\s*)+/i, '').trim();
  return withoutRe ? `Re: ${withoutRe}` : s;
}

export function EmailChatThread({ conversation, hideHeader }: EmailChatThreadProps) {
  const { t } = useAppTranslation();
  const { data: messages = [], isLoading } = useEmailMessages(conversation.id);
  const { sendReply, isSending } = useSendEmailReply();
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeInitialSubject, setComposeInitialSubject] = useState('');
  const [composeInitialBody, setComposeInitialBody] = useState('');

  const handleCopyCode = (code: string) => {
    void navigator.clipboard.writeText(code).then(() => {
      toast.success(t('emailConnect.copied', 'Address copied to clipboard.'));
    });
  };

  const displayName = conversation.from_display_name || emailToDisplayLabel(conversation.from_email) || conversation.from_email || conversation.email_connection_display || 'Email';

  const lastInboundSubject = messages.filter((m) => m.direction === 'inbound').slice(-1)[0]?.subject;
  const defaultSubject = lastInboundSubject ? `Re: ${lastInboundSubject.replace(/^(Re:\s*)+/i, '').trim() || lastInboundSubject}` : '';
  const subjectForReply = defaultSubject ? (defaultSubject.startsWith('Re:') ? defaultSubject : `Re: ${defaultSubject}`) : '';

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#efeae2] p-4">
        <p className="text-sm text-slate-500">{t('whatsappInbox.loadingMessages', 'Loading messages...')}</p>
      </div>
    );
  }

  const handleReplyToMessage = (msg: EmailMessage) => {
    const senderDisplay = getMessageSenderDisplay(msg, conversation) || msg.from_email || '';
    const plainBody = stripHtmlToPlain(msg.body);
    const dateStr = formatTime(msg.created_at);
    const quotedLine = senderDisplay ? `${t('emailConnect.onDateWrote', 'On {{date}}, {{sender}} wrote:', { date: dateStr, sender: senderDisplay })}` : dateStr;
    const quotedBlock = plainBody ? `${quotedLine}\n${plainBody}` : quotedLine;
    setComposeInitialSubject(subjectForReply);
    setComposeInitialBody(`\n\n${quotedBlock}`);
    setComposeOpen(true);
  };

  const handleOpenCompose = () => {
    setComposeInitialSubject(subjectForReply);
    setComposeInitialBody('');
    setComposeOpen(true);
  };

  const handleSendFromPopup = async (params: {
    subject: string;
    body: string;
    to?: string;
    cc?: string;
    bcc?: string;
    attachments: Array<{ filename: string; content: string }>;
  }) => {
    try {
      await sendReply({
        conversation_id: conversation.id,
        body: params.body,
        subject: params.subject || defaultSubject || null,
        to: params.to || null,
        cc: params.cc || null,
        bcc: params.bcc || null,
        attachments: params.attachments.length ? params.attachments : undefined,
      });
      toast.success(t('emailConnect.replySent', 'Reply sent.'));
      setComposeOpen(false);
    } catch (err) {
      toast.error((err as Error)?.message ?? t('emailConnect.replyFailed', 'Failed to send reply.'));
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#efeae2] items-center justify-center p-4">
        <Mail className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-sm text-slate-600">{t('emailConnect.noMessages', 'No messages yet.')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative bg-[#efeae2]">
      {!hideHeader && (
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
          <h3 className="font-semibold text-gray-900 truncate">{displayName}</h3>
          <p className="text-xs text-gray-500 truncate">{conversation.email_connection_display ?? ''}</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto seamless-scroll p-4 pb-16 min-h-0 flex flex-col gap-y-3">
        {messages.map((msg) => {
          const senderDisplay = getMessageSenderDisplay(msg, conversation);
          return (
          <div
            key={msg.id}
            className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm ${
                msg.direction === 'outbound'
                  ? 'bg-[#DCF8C6] text-gray-900'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              {msg.subject ? (
                <p className="text-xs font-medium text-slate-600 mb-1">
                  {t('emailConnect.subject', 'Subject')}: {normalizeSubjectForDisplay(msg.subject)}
                </p>
              ) : null}
              {msg.confirmation_code ? (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 mb-2">
                  <p className="text-xs font-medium text-amber-800 mb-1">
                    {t('emailConnect.confirmationCodeLabel', 'Kode konfirmasi (tempel di Gmail → Penerusan dan POP/IMAP)')}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-amber-900">{msg.confirmation_code}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(msg.confirmation_code!)}
                      className="p-1.5 rounded hover:bg-amber-100 text-amber-700"
                      title={t('whatsappInbox.copy', 'Copy')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : null}
              {msg.body ? (
                <>
                  <p className="text-xs font-medium text-slate-600 mb-0.5">
                    {t('emailConnect.messageLabel', 'Pesan')}:
                  </p>
                  <div
                    className="text-sm whitespace-pre-wrap break-words prose prose-sm max-w-none prose-a:text-blue-600 prose-a:underline"
                    dangerouslySetInnerHTML={{ __html: sanitizeEmailBody(msg.body) }}
                  />
                </>
              ) : null}
              <div className="flex items-center justify-between gap-2 mt-1">
                <p className="text-xs text-slate-500">
                  {senderDisplay ? `${senderDisplay} · ${formatTime(msg.created_at)}` : formatTime(msg.created_at)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => handleReplyToMessage(msg)}
                  disabled={isSending}
                  title={t('emailConnect.replyFromMessage', 'Reply and quote this message')}
                >
                  <Reply className="w-3.5 h-3.5 mr-1" />
                  {t('emailConnect.reply', 'Balas')}
                </Button>
              </div>
            </div>
          </div>
          );
        })}
      </div>
      <div className="flex-shrink-0 absolute bottom-0 left-0 right-0 z-10 p-3 border-t border-gray-200 bg-white">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleOpenCompose}
          disabled={isSending}
        >
          {t('emailConnect.newMessage', 'Pesan Baru')}
        </Button>
      </div>
      <EmailComposePopup
        open={composeOpen}
        onOpenChange={setComposeOpen}
        toEmail={conversation.from_email ?? ''}
        defaultSubject={composeInitialSubject || subjectForReply}
        defaultBody={composeInitialBody}
        onSend={handleSendFromPopup}
        isSending={isSending}
      />
    </div>
  );
}
