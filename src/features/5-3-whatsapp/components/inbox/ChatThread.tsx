import React, { useState, useRef, useEffect } from 'react';
import { useWhatsAppMessages } from '../../hooks/useWhatsAppMessages';
import { useSendWhatsAppMessage } from '../../hooks/useSendWhatsAppMessage';
import type { WhatsAppConversation, WhatsAppMessage } from '../../types';
import { Button } from '@/features/ui/button';
import { Textarea } from '@/features/ui/textarea';
import { Check, CheckCheck } from 'lucide-react';

interface ChatThreadProps {
  conversation: WhatsAppConversation | null;
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageStatus({ status }: { status: WhatsAppMessage['status'] }) {
  if (!status) return <span className="opacity-70">—</span>;
  if (status === 'sent') {
    return <Check className="w-3.5 h-3.5 inline opacity-90" />;
  }
  if (status === 'delivered') {
    return <CheckCheck className="w-3.5 h-3.5 inline opacity-90" />;
  }
  if (status === 'read') {
    return <CheckCheck className="w-3.5 h-3.5 inline text-blue-200" />;
  }
  return <span className="text-xs opacity-80">{status}</span>;
}

export function ChatThread({ conversation }: ChatThreadProps) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: messages = [], isLoading } = useWhatsAppMessages(conversation?.id ?? null);
  const { send, isSending } = useSendWhatsAppMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !conversation) return;
    try {
      await send({
        to: conversation.customer_wa_id,
        text: trimmed,
        conversation_id: conversation.id,
      });
      setText('');
    } catch {
      // onError in useSendWhatsAppMessage already shows toast; catch to avoid Uncaught (in promise)
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
        <p>Select a conversation to view and reply.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-l border-gray-200">
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">
          {conversation.customer_name || conversation.customer_wa_id || 'Unknown'}
        </h3>
        {conversation.customer_name && (
          <p className="text-xs text-gray-500">{conversation.customer_wa_id}</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto seamless-scroll p-4 space-y-3 min-h-0">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading messages...</p>
        ) : (
          messages.map((msg: WhatsAppMessage) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  msg.direction === 'outbound'
                    ? 'bg-[#25D366] text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.body || '[Media]'}</p>
                <p
                  className={`text-xs mt-1 flex items-center gap-1.5 ${
                    msg.direction === 'outbound' ? 'text-white/90' : 'text-gray-500'
                  }`}
                >
                  {formatMessageTime(msg.created_at)}
                  {msg.direction === 'outbound' && (
                    <span className="flex items-center gap-0.5" title={msg.status ?? 'Sent'}>
                      <MessageStatus status={msg.status} />
                      {msg.status && (
                        <span className="capitalize opacity-80">· {msg.status}</span>
                      )}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            className="resize-none min-h-[44px]"
          />
          <Button
            onClick={handleSend}
            disabled={!text.trim() || isSending}
            className="bg-[#25D366] hover:bg-[#20BD5C] shrink-0"
          >
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
