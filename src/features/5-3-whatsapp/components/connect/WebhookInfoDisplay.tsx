import React, { useEffect, useRef } from 'react';
import { Label } from '@/features/ui/label';
import { Button } from '@/features/ui/button';
import { useWhatsAppConfig } from '../../hooks/useWhatsAppConfig';
import { useInstagramAccounts } from '../../hooks/useInstagramAccounts';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { SUPABASE_URL } from '@/integrations/supabase/client';
import { Link2, Key } from 'lucide-react';

const WHATSAPP_WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;
const INSTAGRAM_WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/instagram-webhook`;

interface WebhookInfoDisplayProps {
  /** When true, no top border (e.g. when inside a single Card with other sections) */
  embedded?: boolean;
  /** 'whatsapp' = WhatsApp webhook (default). 'instagram' = Instagram DM webhook. */
  variant?: 'whatsapp' | 'instagram';
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export function WebhookInfoDisplay({ embedded, variant = 'whatsapp' }: WebhookInfoDisplayProps) {
  const { config, ensureInstagramVerifyToken } = useWhatsAppConfig();
  const { accounts: igAccounts } = useInstagramAccounts();
  const { t } = useAppTranslation();
  const hasEnsuredIgToken = useRef(false);

  const isInstagram = variant === 'instagram';
  const webhookUrl = isInstagram ? INSTAGRAM_WEBHOOK_URL : WHATSAPP_WEBHOOK_URL;
  const verifyToken = isInstagram
    ? (igAccounts?.[0]?.verify_token ?? config?.instagram_verify_token ?? null)
    : (config?.verify_token ?? null);
  const verifyTokenPlaceholder = isInstagram
    ? (igAccounts?.length || config?.instagram_verify_token ? null : t('instagramConnect.verifyTokenPlaceholder', '— Connect an Instagram account, or set up Connect WhatsApp, to see Verify Token —'))
    : '— Save config first to see Verify Token —';

  useEffect(() => {
    if (!isInstagram || hasEnsuredIgToken.current || verifyToken) return;
    if (!config || (config.instagram_verify_token ?? '').trim() !== '') return;
    // Only ensure when a meta_config row exists (has meta_access_token or id); otherwise upsert/update can 406
    if (!('meta_access_token' in config) && !('id' in config)) {
      return;
    }
    hasEnsuredIgToken.current = true;
    ensureInstagramVerifyToken().catch(() => {
      hasEnsuredIgToken.current = false;
    });
  }, [isInstagram, config, verifyToken, ensureInstagramVerifyToken]);

  return (
    <div className={embedded ? 'pt-0' : 'pt-4 border-t border-dashed border-gray-300'}>
      {/* Section: Webhook configuration */}
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="w-4 h-4 text-slate-600 shrink-0" aria-hidden />
        <h3 className="text-sm font-semibold text-slate-800">{t('whatsappConnect.webhookConfigTitle', 'Webhook configuration')}</h3>
      </div>
      <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 mb-4 text-sm text-amber-900">
        <p className="font-medium mb-1">{t('whatsappConnect.webhookInboundToSupabaseTitle', 'Agar pesan masuk ke Live Chat (tabel Supabase)')}</p>
        {isInstagram ? (
          <>
            <p className="text-amber-800 text-xs mb-2">
              {t('instagramConnect.webhookInboundBody', 'Di Meta Developer → App (Vialdi ID) → Instagram → Configuration → Webhook: isi Callback URL dan Verify Token di bawah, lalu Verify and Save. Lalu subscribe field "messages". Tanpa ini, DM ke akun Instagram tidak akan masuk ke aplikasi dan tidak ada log di instagram-webhook.')}
            </p>
            <ul className="text-amber-800 text-xs list-disc list-inside space-y-0.5">
              <li>{t('instagramConnect.webhookStep1', 'Callback URL = URL di bawah (copy-paste)')}</li>
              <li>{t('instagramConnect.webhookStep2', 'Verify Token = token di bawah (harus sama persis)')}</li>
              <li>{t('instagramConnect.webhookStep3', 'Klik Verify and Save')}</li>
              <li>{t('instagramConnect.webhookStep4', 'Subscribe ke "messages"')}</li>
            </ul>
          </>
        ) : (
          <p className="text-amber-800 text-xs">
            {t('whatsappConnect.webhookInboundToSupabaseBody', 'Di Meta Developer (App yang punya nomor ini) → WhatsApp → Configuration → Webhook: set Callback URL ke URL di bawah ini, lalu Verify and Save dan subscribe "messages". Jika saat ini ter-set ke Meta Business Suite, pesan akan masuk ke Inbox Meta saja, bukan ke aplikasi ini.')}
          </p>
        )}
      </div>
      <div className="space-y-5">
        {/* Webhook Callback URL */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
          <Label className="text-slate-700 text-xs font-medium uppercase tracking-wide">Webhook Callback URL</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={webhookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all flex-1 min-w-0"
            >
              {webhookUrl}
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => copyToClipboard(webhookUrl)}
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
              {verifyToken ?? verifyTokenPlaceholder}
            </span>
            {verifyToken && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => copyToClipboard(verifyToken)}
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
