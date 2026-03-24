# app-notifications-send-push

Edge function that sends FCM push notifications when app-relevant rows are inserted (e.g. review comments, pending approvals). Called by **Database Webhooks** from the Supabase Dashboard.

## Purpose

- **review_comment_notifications** (INSERT): notify the `user_id` of the new comment (title/body for "Komentar baru pada review").
- **completion_approvals** (INSERT, `status = 'pending'`): resolve `assigner_employee_id` → `employees.user_id`, then notify that user ("Pending approval" / "Item baru menunggu persetujuan Anda"). **Duplicate push risk:** see [Avoid duplicate FCM for pending completion](#avoid-duplicate-fcm-for-pending-completion) below.
- **plan_status_change_notifications** (INSERT): when **social_media_plans** columns `status`, `production_status`, and/or `done` change, a DB trigger inserts **one row per recipient** (not org-wide): the **assigner** (from `task_steps_assigned.assigned_by` on steps linked via `task_steps.social_media_plan_id`) when the **assignee** changed the field (PIC for `status`, PIC production for `production_status`, post owner for `done` — see migration `20260327120000_notifications_assigner_assignee_only.sql`), and the assignee when an assigner changed it; requires `auth.uid()` to resolve the actor. Title/body are set by the trigger (localized via `application_language` for the plan’s org; body is two lines: `old → new` plus plan title). FCM data includes `notificationType: plan_status_change` and `social_media_plan_id` for tap-to-review. On Android, collapsed notification text may truncate multi-line bodies unless the native layer uses BigTextStyle.
- **daily_task_notifications** (INSERT): notify the `user_id` on each row. Covers: **(1)** task **assignment** — assignee only (skipped for self-assign); **(2)** task **status** change — **opposite party** only (assigners if assignee changed status, assignees if assigner changed); **(3)** step/sub-step assigned — assignee only; **(4)** reopen — assigner only; **(5)** completion approved/rejected — assignee; **(6)** pending completion submitted — assigner (via `trigger_completion_approval_notify_assigner_on_insert`; same duplicate caveat as above). Title/body from the record; FCM data includes `notificationType: daily_task`, `daily_task_id`, `task_step_id`, `task_steps_to_steps_id`, and `view` for tap-to-daily-task.

Notifications are sent only to FCM tokens with **context = 'general'** (same `fcm_tokens` table as Live Chat; Live Chat uses `context = 'livechat'`).

## Database Webhooks (Supabase Dashboard)

Create these in **Database → Webhooks**:

1. **Table:** `public.review_comment_notifications`  
   **Events:** Insert  
   **URL:** `https://<project-ref>.supabase.co/functions/v1/app-notifications-send-push`  
   **Method:** POST  
   **Headers:** `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

2. **Table:** `public.completion_approvals`  
   **Events:** Insert  
   **URL:** same as above  
   **Method:** POST  
   **Headers:** same

3. **Table:** `public.plan_status_change_notifications`  
   **Events:** Insert  
   **URL:** same as above  
   **Method:** POST  
   **Headers:** same

4. **Table:** `public.daily_task_notifications`  
   **Events:** Insert  
   **URL:** same as above  
   **Method:** POST  
   **Headers:** same

Timeout: 30 seconds recommended.

## Avoid duplicate FCM for pending completion

When an assignee submits completion, **`trigger_completion_approval_notify_assigner_on_insert`** inserts a row into **`daily_task_notifications`**. If you also have a Database Webhook on **`completion_approvals`** (Insert) pointing at this Edge Function, the assigner can receive **two** FCM messages for the same event (one from each webhook).

**Recommended:** Keep the webhook on **`daily_task_notifications`** (Insert) and **remove or disable** the webhook on **`completion_approvals`** (Insert) for push, so a single INSERT drives both in-app (`daily_task_notifications`) and FCM. If you must keep only the `completion_approvals` webhook, disable the `daily_task_notifications` webhook instead — but then confirm the app still loads in-app notifications from the path you keep.

## Mentions and other notification types

Comment / mention / attachment / deadline / reminder flows may use **different** recipient rules. For **@mentions** in product copy or parsing, use a single convention (e.g. **`@DisplayName`** or **`@employeeId`**) and document it in the feature that implements mentions; this Edge Function does not parse mention syntax today.

## Troubleshooting: Status change (No Status → Need review) not showing push on Android

If changing the **STATUS** column (or production status) on `social_media_plans` does **not** show a push/banner on the native Android app, check in order:

1. **Database Webhook**
   - Supabase Dashboard → **Database** → **Webhooks**.
   - There must be a webhook:
     - **Table:** `public.plan_status_change_notifications`
     - **Events:** **Insert**
     - **URL:** `https://<project-ref>.supabase.co/functions/v1/app-notifications-send-push`
     - **HTTP Headers:** `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
   - If this webhook is missing, the edge function is never called and no FCM is sent.

2. **No logs in Edge Function (request never reaches the function)**  
   If the webhook exists and INSERTs are happening (e.g. rows in `plan_status_change_notifications`) but **Edge Function shows no logs**, the request is being rejected before the function runs. The usual cause is **JWT enforcement**:
   - Database Webhooks send `Authorization: Bearer <SERVICE_ROLE_KEY>` (the API key, not a user JWT). By default, Edge Functions require a JWT, so the gateway returns **401** and the function never runs.
   - **Fix:** Deploy the function with **JWT verification disabled**:
     - **CLI:**  
       `supabase functions deploy app-notifications-send-push --no-verify-jwt`
     - **Dashboard:** Edge Functions → **app-notifications-send-push** → **Settings** → turn **off** “Enforce JWT” (or “Verify JWT”).
   - After that, trigger a status change again and check Logs; you should see `app-notifications-send-push: invoked`.

3. **Edge Function logs**
   - After changing a plan status, open **Edge Functions** → **app-notifications-send-push** → **Logs**.
   - You should see lines like: `app-notifications-send-push: invoked` and `app-notifications-send-push: done`.
   - If there are **no** logs when you change status, the webhook is not triggering or the request is blocked (steps 1 and 2).

4. **pg_net "Couldn't resolve host name" (webhook never reaches Edge Function)**  
   On some projects, **Database Webhooks** (pg_net) fail with **"Couldn't resolve host name"** when calling the same project’s Edge Function URL. The trigger fires and rows are inserted, but the HTTP request from the database never reaches the function (no logs).  
   - **Check:** In **Table Editor** → schema **net** → **\_http_response**: look at recent rows for `error_msg = 'Couldn't resolve host name'`.  
   - **Workaround A – Relay (keep using webhook):** Deploy the **Vercel API relay** so the webhook calls the relay instead of the Edge Function; the relay forwards the request to the Edge Function from the internet (DNS works).  
     - **Webhook URL** in Supabase: `https://<your-vercel-domain>/api/forward-to-send-push` (no Authorization header needed for the relay; the relay uses its own env to call Supabase).  
     - **Relay:** See repo `api/forward-to-send-push.ts` and `api/README.md`. Set env on Vercel: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.  
   - **Workaround B – Cron:** Use **app-notifications-process-pending** and an external cron every 1 minute. See `supabase/functions/app-notifications-process-pending/README.md`.

5. **Edge Function secrets**
   - **Edge Functions** → **app-notifications-send-push** → **Secrets**.
   - **FCM_SERVICE_ACCOUNT_JSON** must be set (Firebase service account JSON string). Without it, the function returns 500 and no push is sent.

6. **FCM token on device**
   - The Android app must have **notification permission** and must have registered the FCM token with **context = 'general'** (saved to `fcm_tokens` via `livechat-save-fcm-token` with `context: "general"`).
   - Open the app at least once while logged in so the token is registered; if the user never opened the app after login or denied notifications, there will be no token to send to.

7. **Realtime publication (optional)**
   - The trigger and table are already in place. If you added the table manually, ensure `plan_status_change_notifications` is in the `supabase_realtime` publication (the migration does this).

## Secrets

- **FCM_SERVICE_ACCOUNT_JSON** (required): Firebase service account JSON string (same as for `livechat-send-push`).
- **FCM_PROJECT_ID** (optional): Override project ID if not present in the service account JSON.

Deploy with `--no-verify-jwt` so the Database Webhook (using service role) can call the function without JWT.

## Fix: Only assignee receives notification (no notification for unassigned user)

When a step is **reassigned** from user A to user B, only user B (the new assignee) should receive a notification. User A must **not** receive any notification (no push, no in-app "Step unassigned").

**1. Disable unassign triggers in the database**  
Run this SQL once in **Supabase Dashboard → SQL Editor** (if migration `20260303120000_disable_unassign_notifications.sql` was not applied via `supabase db push`):

```sql
DROP TRIGGER IF EXISTS after_task_steps_assigned_delete_notify ON public.task_steps_assigned;
DROP TRIGGER IF EXISTS after_task_steps_to_steps_assigned_delete_notify ON public.task_steps_to_steps_assigned;
```

**2. Deploy this Edge Function**  
The function skips sending push for unassign notifications (type/title/body). Ensure the latest version is deployed:

```bash
supabase functions deploy app-notifications-send-push --no-verify-jwt
```

After both steps, only the assignee receives "Step assigned" / "Sub-step assigned"; the unassigned user receives nothing.

**Verification:** Reassign a step from user A to user B (e.g. Milda → Octa). Only B should get a notification (push and in-app). User A must not see any new notification.

## Debug: `completion_approvals` push (assignee saved Drive link / Need Review)

Edge function logs a line **`completion_approvals push target`** with `assignerEmployeeId`, resolved `targetUserId`, `entityType`, `task_step_id`, `daily_task_id`, and **`tokenCount`**. Use this when the assigner sees pending approval in the app but no FCM banner: `tokenCount: 0` means no `fcm_tokens` row with `context = 'general'` for that user (app not opened, permission denied, or wrong account).

**Daily Task step checkbox sync (other user / other tab):** migration `20260326120000_task_steps_touch_daily_tasks_realtime.sql` bumps `daily_tasks.updated_at` when a social-linked `task_steps` completion changes so the existing `daily_tasks` Realtime subscription refetches steps without a manual refresh.

## Manual QA (two accounts)

1. **Uncheck on link removal:** User A clears Google Drive link in Social Media Preview; User B keeps Daily Task open — linked step should uncheck within the Realtime throttle window (up to ~5s).  
2. **Push on link save:** User A saves a Drive link (Need Review); User B (assigner) on Android emulator should receive push if webhooks, `--no-verify-jwt`, and FCM secrets are configured (see sections above).

## Adding new notification sources

1. Add a **Database Webhook** for the new table (e.g. `some_notifications`) and event (usually Insert), pointing to this function’s URL with the same auth header.
2. In `index.ts`: add the table name to the allowed list and add a branch to compute `targetUserId`, `title`, and `body` from `record`, then the existing FCM send logic will run for that user.

No new edge function is required; extend this one and document the new webhook in this README.
