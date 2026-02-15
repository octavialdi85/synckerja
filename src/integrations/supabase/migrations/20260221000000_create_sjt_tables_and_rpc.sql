-- SJT (Situational Judgment Test): tables, RLS, RPCs. Seed questions in separate migration.

-- 1. Add SJT score column to candidate_tests
ALTER TABLE public.candidate_tests
  ADD COLUMN IF NOT EXISTS score_sjt INT NULL;

-- 2. SJT questions (scenario + 4 options, one best action)
CREATE TABLE IF NOT EXISTS public.sjt_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_order INT NOT NULL,
  scenario_text TEXT NOT NULL,
  option_1_text TEXT NOT NULL,
  option_2_text TEXT NOT NULL,
  option_3_text TEXT NOT NULL,
  option_4_text TEXT NOT NULL,
  best_option_index INT NOT NULL CHECK (best_option_index BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sjt_questions_test_id ON public.sjt_questions(test_id);
ALTER TABLE public.sjt_questions ADD CONSTRAINT sjt_questions_test_order_unique UNIQUE (test_id, question_order);

-- 3. Candidate SJT answers (one row per question answered)
CREATE TABLE IF NOT EXISTS public.candidate_sjt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_test_id UUID NOT NULL REFERENCES public.candidate_tests(id) ON DELETE CASCADE,
  sjt_question_id UUID NOT NULL REFERENCES public.sjt_questions(id) ON DELETE CASCADE,
  selected_option_index INT NOT NULL CHECK (selected_option_index BETWEEN 1 AND 4),
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_test_id, sjt_question_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_sjt_answers_candidate_test ON public.candidate_sjt_answers(candidate_test_id);

-- 4. RLS
ALTER TABLE public.sjt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_sjt_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sjt_questions"
  ON public.sjt_questions FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can read candidate_sjt_answers"
  ON public.candidate_sjt_answers FOR SELECT TO anon, authenticated USING (true);

-- 5. Seed: one SJT test (12-15 min)
INSERT INTO public.tests (id, name, description, duration_minutes, type, is_active, created_at, updated_at)
VALUES (
  'a1000000-0000-4000-8000-000000000003'::uuid,
  'Tes Situasi Kerja',
  'Tes penilaian situasi kerja: pilih tindakan terbaik untuk setiap skenario. Mengukur judgment dalam konteks kerja.',
  15,
  'sjt',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  duration_minutes = EXCLUDED.duration_minutes,
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 6. RPC: Start SJT test
CREATE OR REPLACE FUNCTION public.sjt_start_test(p_recruitment_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_test_id UUID;
  v_duration INT;
  v_row public.candidate_tests;
BEGIN
  IF p_recruitment_token IS NULL OR trim(p_recruitment_token) = '' THEN
    RAISE EXCEPTION 'recruitment_token required';
  END IF;

  SELECT id INTO v_profile_id FROM candidate_profiles WHERE recruitment_token = trim(p_recruitment_token) LIMIT 1;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Invalid recruitment token';
  END IF;

  SELECT id, duration_minutes INTO v_test_id, v_duration FROM tests WHERE type = 'sjt' AND is_active = true LIMIT 1;
  IF v_test_id IS NULL THEN
    RAISE EXCEPTION 'No active SJT test found';
  END IF;

  INSERT INTO candidate_tests (candidate_profile_id, test_id, status, started_at, updated_at)
  VALUES (v_profile_id, v_test_id, 'in_progress', NOW(), NOW())
  ON CONFLICT (candidate_profile_id, test_id) DO UPDATE SET
    status = 'in_progress',
    started_at = NOW(),
    updated_at = NOW()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'candidate_test_id', v_row.id,
    'started_at', v_row.started_at,
    'duration_minutes', v_duration
  );
END;
$$;

-- 7. RPC: Submit one SJT answer
CREATE OR REPLACE FUNCTION public.sjt_submit_answer(
  p_recruitment_token TEXT,
  p_candidate_test_id UUID,
  p_sjt_question_id UUID,
  p_selected_option_index INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  IF p_recruitment_token IS NULL OR trim(p_recruitment_token) = '' THEN
    RAISE EXCEPTION 'recruitment_token required';
  END IF;
  IF p_selected_option_index NOT BETWEEN 1 AND 4 THEN
    RAISE EXCEPTION 'Invalid option index';
  END IF;

  SELECT id INTO v_profile_id FROM candidate_profiles WHERE recruitment_token = trim(p_recruitment_token) LIMIT 1;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Invalid recruitment token';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM candidate_tests ct
                JOIN tests t ON t.id = ct.test_id
                WHERE ct.id = p_candidate_test_id AND ct.candidate_profile_id = v_profile_id
                  AND ct.status = 'in_progress' AND t.type = 'sjt') THEN
    RAISE EXCEPTION 'Invalid or not in progress SJT test';
  END IF;

  INSERT INTO candidate_sjt_answers (candidate_test_id, sjt_question_id, selected_option_index, answered_at)
  VALUES (p_candidate_test_id, p_sjt_question_id, p_selected_option_index, NOW())
  ON CONFLICT (candidate_test_id, sjt_question_id) DO UPDATE SET
    selected_option_index = EXCLUDED.selected_option_index,
    answered_at = NOW();
END;
$$;

-- 8. RPC: Submit SJT test and compute score
CREATE OR REPLACE FUNCTION public.sjt_submit_test(p_recruitment_token TEXT, p_candidate_test_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_started_at TIMESTAMPTZ;
  v_duration_min INT;
  v_score_sjt INT := 0;
  r RECORD;
BEGIN
  IF p_recruitment_token IS NULL OR trim(p_recruitment_token) = '' THEN
    RAISE EXCEPTION 'recruitment_token required';
  END IF;

  SELECT id INTO v_profile_id FROM candidate_profiles WHERE recruitment_token = trim(p_recruitment_token) LIMIT 1;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Invalid recruitment token';
  END IF;

  SELECT ct.started_at, t.duration_minutes
  INTO v_started_at, v_duration_min
  FROM candidate_tests ct
  JOIN tests t ON t.id = ct.test_id
  WHERE ct.id = p_candidate_test_id AND ct.candidate_profile_id = v_profile_id AND t.type = 'sjt';

  IF v_started_at IS NULL THEN
    RAISE EXCEPTION 'Test not found or not started';
  END IF;
  IF NOW() > v_started_at + (v_duration_min || ' minutes')::INTERVAL + INTERVAL '1 minute' THEN
    RAISE EXCEPTION 'Test time expired';
  END IF;

  -- Count answers where selected = best
  FOR r IN
    SELECT a.selected_option_index, q.best_option_index
    FROM candidate_sjt_answers a
    JOIN sjt_questions q ON q.id = a.sjt_question_id
    WHERE a.candidate_test_id = p_candidate_test_id
  LOOP
    IF r.selected_option_index = r.best_option_index THEN
      v_score_sjt := v_score_sjt + 1;
    END IF;
  END LOOP;

  UPDATE candidate_tests
  SET status = 'submitted', submitted_at = NOW(),
      score_sjt = v_score_sjt,
      updated_at = NOW()
  WHERE id = p_candidate_test_id AND candidate_profile_id = v_profile_id;

  RETURN jsonb_build_object('score_sjt', v_score_sjt);
END;
$$;
