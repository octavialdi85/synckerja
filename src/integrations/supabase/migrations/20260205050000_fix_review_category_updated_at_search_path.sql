-- Fix mutable search_path: set explicit search_path on the function
CREATE OR REPLACE FUNCTION public.update_review_category_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;
