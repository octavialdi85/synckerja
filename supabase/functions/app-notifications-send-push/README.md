# app-notifications-send-push

Edge function that sends FCM push notifications when app-relevant rows are inserted (e.g. review comments, pending approvals). Called by **Database Webhooks** from the Supabase Dashboard.

## Purpose

- **review_comment_notifications** (INSERT): notify the `user_id` of the new comment (title/body for "Komentar baru pada review").
- **completion_approvals** (INSERT, `status = 'pending'`): resolve `assigner_employee_id` → `employees.user_id`, then notify that user ("Pending approval" / "Item baru menunggu persetujuan Anda").
- **plan_status_change_notifications** (INSERT): notify the `user_id` of the record; title/body from the record (fallback "Update status" / "Plan status updated"); FCM data includes `notificationType: plan_status_change` and `social_media_plan_id` for tap-to-review.
- **daily_task_notifications** (INSERT): notify the `user_id` of the record; title/body from the record (fallback "Daily Task update"); FCM data includes `notificationType: daily_task`, `daily_task_id`, `task_step_id`, and `view` for tap-to-daily-task.

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

## Secrets

Set in Supabase Dashboard → Edge Functions → app-notifications-send-push → Secrets (or via CLI):

- **FCM_SERVICE_ACCOUNT_JSON** (required): Firebase service account JSON string (same as for `livechat-send-push`).
- **FCM_PROJECT_ID** (optional): Override project ID if not present in the service account JSON.

Deploy with `--no-verify-jwt` so the Database Webhook (using service role) can call the function without JWT.

## Adding new notification sources

1. Add a **Database Webhook** for the new table (e.g. `some_notifications`) and event (usually Insert), pointing to this function’s URL with the same auth header.
2. In `index.ts`: add the table name to the allowed list and add a branch to compute `targetUserId`, `title`, and `body` from `record`, then the existing FCM send logic will run for that user.

No new edge function is required; extend this one and document the new webhook in this README.
