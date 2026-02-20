# Auto-Set Production Status on Approval

## Overview
This migration automatically sets `production_status` to "Need Review" and `production_completion_date` when specific conditions are met in the `social_media_plans` table. **Important:** The trigger respects "Request Revision" status and will NOT overwrite it.

## Conditions
The trigger automatically updates the following fields when **ALL** of these conditions are met:
1. `approved` = `TRUE`
2. `google_drive_link` IS NOT NULL (and not empty)
3. `production_approved` = `FALSE` (or NULL)

## Automatic Updates
When the conditions are met, the trigger will:
- Set `production_status` to `"Need Review"`
- Set `production_completion_date` to current timestamp (only if it's currently NULL)

## Trigger Details
- **Trigger Name**: `trigger_auto_set_production_status_on_approval`
- **Function**: `auto_set_production_status_on_approval()`
- **Timing**: BEFORE INSERT OR UPDATE
- **Monitored Columns**: 
  - `approved`
  - `google_drive_link`
  - `production_approved`
  - `production_status`
  - `production_completion_date`

## Behavior
- The trigger executes **before** the insert/update operation, ensuring the values are set at the database level
- If `production_completion_date` already has a value, it will **not** be overwritten
- If `production_status` is already "Need Review", the trigger will still ensure `production_completion_date` is set if it's NULL
- The trigger works regardless of how the data is updated (UI, API, or direct database updates)

## Use Cases
1. **When content is approved**: If a content plan is approved (`approved = TRUE`) and has a Google Drive link, but production is not yet approved, the production status is automatically set to "Need Review"
2. **When Google Drive link is added**: If a content plan is approved and a Google Drive link is added, but production is not yet approved, the production status is automatically set to "Need Review"
3. **When production approval is removed**: If `production_approved` is set to `FALSE` on an approved content plan with a Google Drive link, the production status is automatically set to "Need Review"

## Integration
- The trigger works seamlessly with the existing UI logic
- Real-time subscriptions will automatically reflect the changes in the interface
- No changes to application code are required - the trigger handles everything at the database level

## Related Migrations
- `validate_production_status_with_google_drive_link.sql` - Validates that production_status cannot be "Need Review" when google_drive_link is NULL
- `validate_production_approved_with_google_drive_link.sql` - Validates that production_approved cannot be TRUE when google_drive_link is NULL

