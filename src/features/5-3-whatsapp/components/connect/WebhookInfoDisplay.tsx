import React from 'react';
import { Label } from '@/features/ui/label';
import { Button } from '@/features/ui/button';
import { useWhatsAppConfig } from '../../hooks/useWhatsAppConfig';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { SUPABASE_URL } from '@/integrations/supabase/client';
import { Link2, Key } from 'lucide-react';

const WEBHOOK_CALLBACK_URL = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;

interface WebhookInfoDisplayProps {
  /** When true, no top border (e.g. when inside a single Card with other sections) */
  embedded?: boolean;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export function WebhookInfoDisplay({ embedded }: WebhookInfoDisplayProps) {
  const { config } = useWhatsAppConfig();
  const { t } = useAppTranslation();

  return (
    <div className={embedded ? 'pt-0' : 'pt-4 border-t border-dashed border-gray-300'}>
      {/* Section: Webhook configuration */}
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="w-4 h-4 text-slate-600 shrink-0" aria-hidden />
        <h3 className="text-sm font-semibold text-slate-800">{t('whatsappConnect.webhookConfigTitle', 'Webhook configuration')}</h3>
      </div>
      <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 mb-4 text-sm text-amber-900">
        <p className="font-medium mb-1">{t('whatsappConnect.webhookInboundToSupabaseTitle', 'Agar pesan masuk masuk ke Live Chat (tabel Supabase)')}</p>
        <p className="text-amber-800 text-xs">
          {t('whatsappConnect.webhookInboundToSupabaseBody', 'Di Meta Developer (App yang punya nomor ini) → WhatsApp → Configuration → Webhook: set Callback URL ke URL di bawah ini, lalu Verify and Save dan subscribe "messages". Jika saat ini ter-set ke Meta Business Suite, pesan akan masuk ke Inbox Meta saja, bukan ke aplikasi ini.')}
        </p>
      </div>
      <div className="space-y-5">
        {/* Webhook Callback URL */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
          <Label className="text-slate-700 text-xs font-medium uppercase tracking-wide">Webhook Callback URL</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={WEBHOOK_CALLBACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all flex-1 min-w-0"
            >
              {WEBHOOK_CALLBACK_URL}
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => copyToClipboard(WEBHOOK_CALLBACK_URL)}
            >
              Copy
            </Button>
          </div>
        </div>
        {/* Verify Token */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-slate-600 shrink-0" aria-hidden />
            <Label className="text-slate-700 text-xs font-medium uppercase tracking-wide">Verify Token</Label>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono bg-white border border-slate-200 px-2.5 py-1.5 rounded flex-1 min-w-0 truncate">
              {config?.verify_token ?? '— Save config first to see Verify Token —'}
            </span>
            {config?.verify_token && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => copyToClipboard(config.verify_token)}
              >
                Copy
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
