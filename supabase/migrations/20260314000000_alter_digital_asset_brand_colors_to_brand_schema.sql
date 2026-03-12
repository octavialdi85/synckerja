-- Alter digital_asset_brand_colors: one row per brand with brand_name + 4 HEX columns
ALTER TABLE public.digital_asset_brand_colors RENAME COLUMN name TO brand_name;

ALTER TABLE public.digital_asset_brand_colors ADD COLUMN primary_color_hex TEXT;
ALTER TABLE public.digital_asset_brand_colors ADD COLUMN secondary_color_hex TEXT;
ALTER TABLE public.digital_asset_brand_colors ADD COLUMN accent_color_hex TEXT;
ALTER TABLE public.digital_asset_brand_colors ADD COLUMN text_color_hex TEXT;

ALTER TABLE public.digital_asset_brand_colors DROP COLUMN IF EXISTS hex_code;

COMMENT ON COLUMN public.digital_asset_brand_colors.brand_name IS 'Brand name (e.g. etix)';
COMMENT ON COLUMN public.digital_asset_brand_colors.primary_color_hex IS 'Primary color HEX (e.g. #FF5733)';
COMMENT ON COLUMN public.digital_asset_brand_colors.secondary_color_hex IS 'Secondary color HEX';
COMMENT ON COLUMN public.digital_asset_brand_colors.accent_color_hex IS 'Accent color HEX';
COMMENT ON COLUMN public.digital_asset_brand_colors.text_color_hex IS 'Text color HEX';
