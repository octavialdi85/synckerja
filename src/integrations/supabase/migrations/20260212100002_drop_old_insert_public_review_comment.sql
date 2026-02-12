-- Drop old 4-param overload so only the 5-param (with commenter_display_name) remains; fixes 400 when client sends commenter_display_name
DROP FUNCTION IF EXISTS public.insert_public_review_comment(text, text, numeric, jsonb);
