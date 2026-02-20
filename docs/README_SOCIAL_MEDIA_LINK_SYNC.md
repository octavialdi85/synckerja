# Social Media Plan to Task Step Links Auto-Sync

## Overview
This feature automatically synchronizes Google Drive links from `social_media_plans` table to `task_step_links` table when a social media plan is approved for production.

## Database Schema Changes

### 1. `task_steps` Table
- Added `social_media_plan_id` (UUID, nullable) - Links task step to its source social media plan
- Index: `idx_task_steps_social_media_plan_id` for performance

### 2. `task_step_links` Table
- Added `is_auto_synced` (BOOLEAN, default FALSE) - Indicates if link was auto-synced
- Added `source_social_media_plan_id` (UUID, nullable) - References the source social media plan
- Indexes:
  - `idx_task_step_links_step_plan` - For checking existing auto-synced links
  - `idx_task_step_links_source_plan` - For querying by source plan

## Trigger Function

### `sync_social_media_link_to_task_step()`
Automatically syncs Google Drive links when:
- `production_approved` changes to `true` AND `google_drive_link` exists → Insert/Update link
- `production_approved` changes to `false` OR `google_drive_link` is empty/null → Delete link
- `google_drive_link` is updated → Update existing link

**Behavior:**
- Only processes if `production_approved` or `google_drive_link` actually changed (early exit optimization)
- Finds all `task_steps` linked to the `social_media_plan_id`
- For each step:
  - If approved + link exists: Insert new link or update existing auto-synced link
  - If unapproved or link empty: Delete only auto-synced links (not manual ones)

## Application Logic

### 1. Creating Task Steps
When a task step is created from "Add as Daily Task" in Social Media Dashboard:
- `social_media_plan_id` is saved to the `task_steps` record
- This links the step to its source plan for automatic synchronization

### 2. UI Protection
- **EditLinkModal**: Prevents editing auto-synced links (shows warning, disables inputs)
- **StepLinks Component**: 
  - Shows "Auto-synced" badge for auto-synced links
  - Disables edit/delete buttons for auto-synced links
  - Shows visual indicator (blue background) for auto-synced links

## Edge Cases Handled

1. **Multiple Steps from Same Plan**: All steps linked to the same plan receive the same link
2. **Manual Link Edits**: Manual links are not affected by trigger (only auto-synced links are managed)
3. **Link Updates**: When Google Drive link changes, all linked steps are updated automatically
4. **Plan Deletion**: `social_media_plan_id` is set to NULL (ON DELETE SET NULL), links remain
5. **Step Deletion**: Auto-synced links are deleted via CASCADE
6. **Concurrent Updates**: Trigger handles concurrent updates safely

## Migration Files

1. `add_social_media_plan_tracking.sql` - Adds tracking columns and indexes
2. `sync_social_media_links_trigger.sql` - Creates trigger function and trigger

## Testing Checklist

- [ ] Create step from dashboard → `social_media_plan_id` saved
- [ ] Input Google Drive Link → Link appears in task step when approved
- [ ] Approve production → Link auto-synced to task step
- [ ] Unapprove production → Link removed from task step
- [ ] Update Google Drive Link → Link updated in task step
- [ ] Multiple steps from same plan → All receive same link
- [ ] Edit auto-synced link → Prevented with warning
- [ ] Delete auto-synced link → Prevented with warning
- [ ] Manual link → Can be edited/deleted normally

## Performance Notes

- Trigger execution time: ~5-50ms per update (depending on number of linked steps)
- Early exit optimization prevents unnecessary processing
- Indexes ensure fast lookups
- Minimal impact on user experience (auto-save has 1s debounce)

## Rollback

If needed to rollback:
1. Drop trigger: `DROP TRIGGER IF EXISTS trigger_sync_social_media_link_to_task_step ON social_media_plans;`
2. Drop function: `DROP FUNCTION IF EXISTS sync_social_media_link_to_task_step();`
3. Remove columns (optional): Use `ALTER TABLE ... DROP COLUMN ...`

