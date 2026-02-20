-- Create sniping_images table for storing image metadata attached to comments
CREATE TABLE IF NOT EXISTS sniping_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    social_media_plan_id UUID NOT NULL REFERENCES social_media_plans(id) ON DELETE CASCADE,
    link_url TEXT NOT NULL,
    image_path TEXT NOT NULL,
    image_name TEXT NOT NULL,
    image_type TEXT,
    image_size BIGINT,
    link_comments_id UUID REFERENCES link_comments(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sniping_images_social_media_plan_id ON sniping_images(social_media_plan_id);
CREATE INDEX IF NOT EXISTS idx_sniping_images_link_url ON sniping_images(link_url);
CREATE INDEX IF NOT EXISTS idx_sniping_images_link_comments_id ON sniping_images(link_comments_id);
CREATE INDEX IF NOT EXISTS idx_sniping_images_created_by ON sniping_images(created_by);
CREATE INDEX IF NOT EXISTS idx_sniping_images_social_media_plan_link ON sniping_images(social_media_plan_id, link_url);

-- Create or replace updated_at trigger function (if not exists from other migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at trigger
CREATE TRIGGER update_sniping_images_updated_at 
    BEFORE UPDATE ON sniping_images
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) on the sniping_images table
ALTER TABLE sniping_images ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view images for social media plans in their organization
CREATE POLICY "Users can view images in same organization"
  ON sniping_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM social_media_plans AS smp
      JOIN profiles AS current_user_profile ON current_user_profile.user_id = auth.uid()
      WHERE smp.id = sniping_images.social_media_plan_id
        AND current_user_profile.active_organization_id IS NOT NULL
        AND current_user_profile.active_organization_id = smp.organization_id
    )
  );

-- Policy 2: Users can insert images for social media plans in their organization
CREATE POLICY "Users can insert images in same organization"
  ON sniping_images
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1
      FROM social_media_plans AS smp
      JOIN profiles AS current_user_profile ON current_user_profile.user_id = auth.uid()
      WHERE smp.id = sniping_images.social_media_plan_id
        AND current_user_profile.active_organization_id IS NOT NULL
        AND current_user_profile.active_organization_id = smp.organization_id
    )
  );

-- Policy 3: Users can update their own images
CREATE POLICY "Users can update their own images"
  ON sniping_images
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy 4: Users can delete their own images
CREATE POLICY "Users can delete their own images"
  ON sniping_images
  FOR DELETE
  USING (auth.uid() = created_by);

-- Add comments for documentation
COMMENT ON TABLE sniping_images IS 'Stores metadata for images attached to comments in social media plans. RLS enabled: users can view images in their organization, insert/update/delete their own images.';
COMMENT ON COLUMN sniping_images.social_media_plan_id IS 'Reference to the social media plan this image belongs to';
COMMENT ON COLUMN sniping_images.link_url IS 'The URL/link this image is associated with (e.g., Google Drive link)';
COMMENT ON COLUMN sniping_images.image_path IS 'Path to the image file in Supabase storage bucket';
COMMENT ON COLUMN sniping_images.link_comments_id IS 'Optional reference to a specific comment this image is attached to';
COMMENT ON COLUMN sniping_images.created_by IS 'User who uploaded the image';

