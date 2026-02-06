-- Allow activity_type 'Lead Conversion' for auto-created entries when lead status becomes Converted
ALTER TABLE public.sales_activities
  DROP CONSTRAINT IF EXISTS sales_activities_activity_type_check,
  ADD CONSTRAINT sales_activities_activity_type_check CHECK (
    activity_type IN (
      'Demo',
      'Meeting',
      'Call',
      'Proposal',
      'Closing',
      'visit',
      'Lead Conversion'
    )
  );
