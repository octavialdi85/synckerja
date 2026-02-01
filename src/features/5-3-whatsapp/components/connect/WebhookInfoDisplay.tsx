import React from 'react';
import { Label } from '@/features/ui/label';
import { Button } from '@/features/ui/button';
import { useWhatsAppConfig } from '../../hooks/useWhatsAppConfig';
import { SUPABASE_URL } from '@/integrations/supabase/client';

const WEBHOOK_CALLBACK_URL = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;

interface WebhookInfoDisplayProps {
  /** When true, no top border (e.g. when inside a single Card with other sections) */
  embedded?: boolean;
}

export function WebhookInfoDisplay({ embedded }: WebhookInfoDisplayProps) {
  const { config } = useWhatsAppConfig();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // Optional: toast or feedback
  };

  return (
    <div className={embedded ? 'space-y-4 pt-0' : 'space-y-4 pt-4 border-t border-dashed border-gray-300'}>
      <div className="space-y-2">
        <Label className="text-gray-700">Webhook Callback URL</Label>
        <div className="flex items-center gap-2">
          <a
            href={WEBHOOK_CALLBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm break-all"
          >
            {WEBHOOK_CALLBACK_URL}
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(WEBHOOK_CALLBACK_URL, 'Webhook URL')}
          >
            Copy
          </Button>
        </div>
        <p className="text-xs text-gray-500">Paste this URL in Meta Developer Console → WhatsApp → Configuration → Callback URL</p>
      </div>
      <div className="space-y-2">
        <Label className="text-gray-700">Verify Token</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
            {config?.verify_token ?? '— Save config first to see Verify Token —'}
          </span>
          {config?.verify_token && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(config.verify_token, 'Verify Token')}
            >
              Copy
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-500">Use this value as Verify Token in Meta Developer Console when subscribing to webhook</p>
      </div>
    </div>
  );
}
