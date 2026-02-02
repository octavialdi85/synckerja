# WhatsApp Business API (5-3-whatsapp)

Fitur integrasi WhatsApp Business API untuk area Operations → Consultant.

## Path

- **Connect:** `/operations/consultant/whatsapp/connect` — form Business Account ID, Access Token, Verify Token, Phone Number ID; tampilan Webhook Callback URL.
- **Inbox:** `/operations/consultant/all/livechat` — daftar percakapan, chat thread, form balas.

## Struktur

- `pages/` — WhatsAppConnectPage, WhatsAppInboxPage
- `components/connect/` — WhatsAppConnectForm, WebhookInfoDisplay
- `components/inbox/` — ConversationList, ChatThread
- `hooks/` — useWhatsAppConfig, useWhatsAppConversations, useWhatsAppMessages, useSendWhatsAppMessage
- `types/` — WhatsAppConfig, WhatsAppConfigUpsert, WhatsAppConversation, WhatsAppMessage

## Backend

- **Tabel:** `organization_meta_config` (token Meta + konfig WhatsApp/FB/IG), `whatsapp_conversations`, `whatsapp_messages` (RLS per org).
- **Edge Function:** `whatsapp-webhook` — GET (verification), POST (simpan pesan masuk, map org by phone_number_id). URL: `{SUPABASE_URL}/functions/v1/whatsapp-webhook`.
- **Edge Function:** `send-whatsapp-message` — POST (kirim pesan via Meta API, simpan outbound ke DB). URL: `{SUPABASE_URL}/functions/v1/send-whatsapp-message`. Auth: JWT.

## Integrasi

- Route di `App.tsx`; permission di `routePermissions.ts`; tab di `5-3-dashboard/HeaderAndTab.tsx`.
