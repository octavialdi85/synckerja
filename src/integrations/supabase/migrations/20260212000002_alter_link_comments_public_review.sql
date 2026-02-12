-- Allow public comments (created_by NULL) and add timestamp + annotation for video marking
ALTER TABLE public.link_comments
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.link_comments
  ADD COLUMN IF NOT EXISTS video_timestamp_seconds NUMERIC,
  ADD COLUMN IF NOT EXISTS annotation_data JSONB;

COMMENT ON COLUMN public.link_comments.video_timestamp_seconds IS 'Optional video timestamp (seconds) for comment (Opsi D).';
COMMENT ON COLUMN public.link_comments.annotation_data IS 'Optional visual annotation shapes for comment (Opsi C). Format: { shapes: [{ type, points, color }], captureWidth, captureHeight }.';
