import React, { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useEmailMessages } from '../../hooks/useEmailMessages';
import { useSendEmailReply } from '../../hooks/useSendEmailReply';
import type { EmailConversation, EmailMessage } from '../../types';
import { Mail, Copy, Send, Reply } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/features/ui/button';
import { Textarea } from '@/features/ui/textarea';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';

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
}

function formatTime(iso: string) {
  try {
    return format(new Date(iso), 'dd MMM yyyy HH:mm');
  } catch {
    return iso;
  }
}

/** For outbound messages, show real email (connection) instead of inbound address. */
function getMessageSenderDisplay(msg: EmailMessage, conversation: EmailConversation): string {
  if (msg.direction === 'outbound' && msg.from_email?.includes('inbound-')) {
    return conversation.email_connection_display ?? msg.from_email ?? '';
  }
  return msg.from_email ?? '';
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

export function EmailChatThread({ conversation }: EmailChatThreadProps) {
  const { t } = useAppTranslation();
  const { data: messages = [], isLoading } = useEmailMessages(conversation.id);
  const { sendReply, isSending } = useSendEmailReply();
  const [replyBody, setReplyBody] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const replyBodyRef = useRef<HTMLTextAreaElement>(null);
  const replyFormRef = useRef<HTMLFormElement>(null);
  const prevConvIdRef = useRef(conversation.id);

  const handleCopyCode = (code: string) => {
    void navigator.clipboard.writeText(code).then(() => {
      toast.success(t('emailConnect.copied', 'Address copied to clipboard.'));
    });
  };

  const displayName = conversation.from_email || conversation.email_connection_display || 'Email';

  // Derived before any early return so hooks (useEffect) are always called in the same order
  const lastInboundSubject = messages.filter((m) => m.direction === 'inbound').slice(-1)[0]?.subject;
  const defaultSubject = lastInboundSubject ? `Re: ${lastInboundSubject.replace(/^(Re:\s*)+/i, '').trim() || lastInboundSubject}` : '';
  const subjectForReply = defaultSubject ? (defaultSubject.startsWith('Re:') ? defaultSubject : `Re: ${defaultSubject}`) : '';

  useEffect(() => {
    if (prevConvIdRef.current !== conversation.id) {
      prevConvIdRef.current = conversation.id;
      setReplySubject(subjectForReply);
    } else if (subjectForReply && !replySubject) {
      setReplySubject(subjectForReply);
    }
  }, [conversation.id, subjectForReply, replySubject]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#efeae2] p-4">
        <p className="text-sm text-slate-500">{t('whatsappInbox.loadingMessages', 'Loading messages...')}</p>
      </div>
    );
  }

  const handleReplyToMessage = (msg: EmailMessage) => {
    // Hanya isi body dengan kutipan; subject tetap pakai default thread (tidak ikut subject pesan yang diklik)
    const senderDisplay = getMessageSenderDisplay(msg, conversation) || msg.from_email || '';
    const plainBody = stripHtmlToPlain(msg.body);
    const dateStr = formatTime(msg.created_at);
    const quotedLine = senderDisplay ? `${t('emailConnect.onDateWrote', 'On {{date}}, {{sender}} wrote:', { date: dateStr, sender: senderDisplay })}` : dateStr;
    const quotedBlock = plainBody ? `${quotedLine}\n${plainBody}` : quotedLine;
    setReplyBody((prev) => (prev.trim() ? `${prev.trim()}\n\n${quotedBlock}` : `\n\n${quotedBlock}`));
    replyFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => replyBodyRef.current?.focus(), 100);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const bodyTrim = replyBody.trim();
    if (!bodyTrim) {
      toast.error(t('emailConnect.replyBodyRequired', 'Please enter a message.'));
      return;
    }
    try {
      await sendReply({
        conversation_id: conversation.id,
        body: bodyTrim,
        subject: replySubject.trim() || defaultSubject || null,
      });
      setReplyBody('');
      setReplySubject('');
      toast.success(t('emailConnect.replySent', 'Reply sent.'));
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
    <div className="flex-1 flex flex-col min-h-0 bg-[#efeae2]">
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <h3 className="font-semibold text-gray-900 truncate">{displayName}</h3>
        <p className="text-xs text-gray-500 truncate">{conversation.email_connection_display ?? ''}</p>
      </div>
      <div className="flex-1 overflow-y-auto seamless-scroll p-4 min-h-0 flex flex-col gap-y-3">
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
      <form
        ref={replyFormRef}
        onSubmit={handleSendReply}
        className="flex-shrink-0 p-3 border-t border-gray-200 bg-white flex flex-col gap-2"
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor="email-reply-subject" className="text-xs text-slate-500">
            {t('emailConnect.subject', 'Subject')}
          </Label>
          <Input
            id="email-reply-subject"
            value={replySubject}
            onChange={(e) => setReplySubject(e.target.value)}
            placeholder=""
            className="text-sm"
            disabled={isSending}
          />
        </div>
        <div className="flex gap-2">
          <Textarea
            ref={replyBodyRef}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder={t('emailConnect.replyPlaceholder', 'Type your reply...')}
            className="min-h-[80px] resize-none text-sm flex-1"
            disabled={isSending}
            rows={3}
          />
          <Button type="submit" size="icon" disabled={isSending} className="shrink-0 h-10 w-10">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
