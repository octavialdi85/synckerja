import React from 'react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useEmailMessages } from '../../hooks/useEmailMessages';
import type { EmailConversation } from '../../types';
import { Mail, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

export function EmailChatThread({ conversation }: EmailChatThreadProps) {
  const { t } = useAppTranslation();
  const { data: messages = [], isLoading } = useEmailMessages(conversation.id);

  const handleCopyCode = (code: string) => {
    void navigator.clipboard.writeText(code).then(() => {
      toast.success(t('emailConnect.copied', 'Address copied to clipboard.'));
    });
  };

  const displayName = conversation.from_email || conversation.email_connection_display || 'Email';

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#efeae2] p-4">
        <p className="text-sm text-slate-500">{t('whatsappInbox.loadingMessages', 'Loading messages...')}</p>
      </div>
    );
  }

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
        {messages.map((msg) => (
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
                <p className="text-xs font-medium text-slate-600 mb-1">{msg.subject}</p>
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
                <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
              ) : null}
              <p className="text-xs text-slate-500 mt-1">
                {msg.from_email ?? ''} · {formatTime(msg.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
