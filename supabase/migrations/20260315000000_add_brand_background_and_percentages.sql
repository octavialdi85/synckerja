-- Add Background Color and color percentage columns to digital_asset_brand_colors.
-- Percentages (Background, Primary, Secondary, Accent) sum to 100%; Text has no percentage.
ALTER TABLE public.digital_asset_brand_colors
  ADD COLUMN IF NOT EXISTS background_color_hex TEXT,
  ADD COLUMN IF NOT EXISTS background_color_percent INTEGER DEFAULT 40,
  ADD COLUMN IF NOT EXISTS primary_color_percent INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS secondary_color_percent INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS accent_color_percent INTEGER DEFAULT 10;

COMMENT ON COLUMN public.digital_asset_brand_colors.background_color_hex IS 'Background (canvas/page) color HEX';
COMMENT ON COLUMN public.digital_asset_brand_colors.background_color_percent IS 'Approximate visual proportion 0-100 (sum with primary/secondary/accent = 100)';
COMMENT ON COLUMN public.digital_asset_brand_colors.primary_color_percent IS 'Approximate visual proportion 0-100';
COMMENT ON COLUMN public.digital_asset_brand_colors.secondary_color_percent IS 'Approximate visual proportion 0-100';
COMMENT ON COLUMN public.digital_asset_brand_colors.accent_color_percent IS 'Approximate visual proportion 0-100';
