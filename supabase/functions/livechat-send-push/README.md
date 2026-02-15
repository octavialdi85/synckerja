# livechat-send-push

Edge Function invoked by **Database Webhooks** when a new message is inserted into `whatsapp_messages`, `instagram_messages`, or `email_messages`. Sends Web Push notifications to users who have that organization as `active_organization_id` and have subscribed via the Live Chat "Aktifkan notifikasi" button.

## Deploy

```bash
supabase functions deploy livechat-send-push --no-verify-jwt
```

`--no-verify-jwt` is required so the Database Webhook (which uses the service role header) can invoke the function.

## Secrets

Set in Supabase Dashboard → Edge Functions → livechat-send-push → Secrets (or via CLI):

| Secret | Description |
|--------|-------------|
| `VAPID_KEYS` | JSON string from `exportVapidKeys()` (JWK format). Generate with: `deno run https://raw.githubusercontent.com/negrel/webpush/master/cmd/generate-vapid-keys.ts` — use the printed JSON (both keys). |
| `LIVECHAT_APP_ORIGIN` | (Optional) Base URL for deep links, e.g. `https://app.example.com`. If unset, defaults to `https://app.synckerja.com`. |
| `VAPID_CONTACT_EMAIL` | (Optional) Mailto for VAPID, e.g. `mailto:support@example.com`. |

## Database Webhooks

In Supabase Dashboard → Database → Webhooks, create **3 webhooks**:

1. **Table:** `public.whatsapp_messages`, **Events:** Insert → **URL:** Supabase Edge Function `livechat-send-push`, Method POST, add auth header with service key.
2. **Table:** `public.instagram_messages`, **Events:** Insert → same.
3. **Table:** `public.email_messages`, **Events:** Insert → same.

Timeout: 30 seconds recommended.

## Frontend

- Public key from the same VAPID pair must be set as `VITE_VAPID_PUBLIC_KEY` (base64url string). The generate script also prints "your application server key" — use that for the frontend env.
