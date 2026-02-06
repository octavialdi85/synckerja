-- Allow status 'Converted' for auto-created sales_activities when lead status becomes Converted
ALTER TABLE public.sales_activities
  DROP CONSTRAINT IF EXISTS sales_activities_status_check,
  ADD CONSTRAINT sales_activities_status_check CHECK (
    status IN (
      'Active',
      'Negotiating',
      'Won',
      'Lost',
      'Follow Up',
      'Converted'
    )
  );
