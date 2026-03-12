-- Digital Asset Characters: AI-friendly combined prompt (name, age, gender, hair, face, clothing/detail per line)
ALTER TABLE public.digital_asset_characters
ADD COLUMN IF NOT EXISTS combined_prompt TEXT;

COMMENT ON COLUMN public.digital_asset_characters.combined_prompt
IS 'AI-friendly combined character description: name, age, gender, hair, face, clothing/detail, one value per line. Set from Detect from Image or recalculated on save in Digital Assets.';
