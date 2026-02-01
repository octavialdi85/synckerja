import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from '@/features/5-3-dashboard/HeaderAndTab';
import { ConversationList } from '../components/inbox/ConversationList';
import { ChatThread } from '../components/inbox/ChatThread';
import type { WhatsAppConversation } from '../types';

export function WhatsAppInboxPage() {
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const initialConversationId = searchParams.get('conversation');

  return (
    <StandardLayout>
      <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col">
              <div className="flex-shrink-0">
                <HeaderAndTab />
              </div>
              <div className="flex-1 min-h-0 overflow-hidden flex rounded-lg border border-gray-200 shadow-sm bg-white max-h-[calc(100vh-120px)]">
                <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col min-h-0">
                  <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h2 className="font-semibold text-gray-900">Conversations</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto seamless-scroll min-h-0">
                    <ConversationList
                      selectedId={selectedConversation?.id ?? null}
                      onSelect={setSelectedConversation}
                      initialConversationId={initialConversationId}
                    />
                  </div>
                </div>
                <ChatThread conversation={selectedConversation} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
}
