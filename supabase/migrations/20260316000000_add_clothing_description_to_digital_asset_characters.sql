-- Digital Asset Characters: separate Clothing and Detail (was combined in additional_details)
ALTER TABLE public.digital_asset_characters
ADD COLUMN IF NOT EXISTS clothing_description TEXT;

COMMENT ON COLUMN public.digital_asset_characters.clothing_description
IS 'What the character is wearing (clothes, outfit only). Filled from Detect from Image Character Extraction and editable in Digital Assets.';

COMMENT ON COLUMN public.digital_asset_characters.additional_details
IS 'Other details: setting, background, special features, pose context. Filled from Detect from Image as "Detail" and editable in Digital Assets.';
