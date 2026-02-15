-- SJT: add dimension per option (sjt_questions) and dimension scores (candidate_tests).

-- 1. Add dimension columns to sjt_questions (one dimension per option; nullable for backward compatibility)
ALTER TABLE public.sjt_questions
  ADD COLUMN IF NOT EXISTS option_1_dimension TEXT NULL,
  ADD COLUMN IF NOT EXISTS option_2_dimension TEXT NULL,
  ADD COLUMN IF NOT EXISTS option_3_dimension TEXT NULL,
  ADD COLUMN IF NOT EXISTS option_4_dimension TEXT NULL;

ALTER TABLE public.sjt_questions
  DROP CONSTRAINT IF EXISTS sjt_questions_option_dimension_check;

ALTER TABLE public.sjt_questions
  ADD CONSTRAINT sjt_questions_option_dimension_check CHECK (
    (option_1_dimension IS NULL OR option_1_dimension IN ('etika', 'komunikasi', 'prioritas', 'konflik', 'prosedur'))
    AND (option_2_dimension IS NULL OR option_2_dimension IN ('etika', 'komunikasi', 'prioritas', 'konflik', 'prosedur'))
    AND (option_3_dimension IS NULL OR option_3_dimension IN ('etika', 'komunikasi', 'prioritas', 'konflik', 'prosedur'))
    AND (option_4_dimension IS NULL OR option_4_dimension IN ('etika', 'komunikasi', 'prioritas', 'konflik', 'prosedur'))
  );

-- 2. Add sjt_dimension_scores to candidate_tests (JSONB: e.g. {"etika":3,"komunikasi":4,...})
ALTER TABLE public.candidate_tests
  ADD COLUMN IF NOT EXISTS sjt_dimension_scores JSONB NULL;
