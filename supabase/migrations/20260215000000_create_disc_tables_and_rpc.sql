-- DISC Test: tables, RLS, RPCs, and seed data for candidate DISC assessment
-- Candidate must complete DISC before submitting profile. Timer 10-15 min, one session.

-- 1. Master tests table
CREATE TABLE IF NOT EXISTS public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL CHECK (duration_minutes >= 10 AND duration_minutes <= 120),
  type TEXT NOT NULL DEFAULT 'disc',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tests_type_active ON public.tests(type) WHERE is_active = true;

-- 2. Test questions (DISC: 4 options per question, each option has dimension D/I/S/C)
CREATE TABLE IF NOT EXISTS public.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_order INT NOT NULL,
  option_1_text TEXT NOT NULL,
  option_1_dimension TEXT NOT NULL CHECK (option_1_dimension IN ('D','I','S','C')),
  option_2_text TEXT NOT NULL,
  option_2_dimension TEXT NOT NULL CHECK (option_2_dimension IN ('D','I','S','C')),
  option_3_text TEXT NOT NULL,
  option_3_dimension TEXT NOT NULL CHECK (option_3_dimension IN ('D','I','S','C')),
  option_4_text TEXT NOT NULL,
  option_4_dimension TEXT NOT NULL CHECK (option_4_dimension IN ('D','I','S','C')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON public.test_questions(test_id);
ALTER TABLE public.test_questions ADD CONSTRAINT test_questions_test_order_unique UNIQUE (test_id, question_order);

-- 3. Candidate test attempts (one per candidate per test)
CREATE TABLE IF NOT EXISTS public.candidate_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','submitted')),
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  score_d NUMERIC(5,2),
  score_i NUMERIC(5,2),
  score_s NUMERIC(5,2),
  score_c NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_profile_id, test_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_tests_profile ON public.candidate_tests(candidate_profile_id);
CREATE INDEX IF NOT EXISTS idx_candidate_tests_test ON public.candidate_tests(test_id);
CREATE INDEX IF NOT EXISTS idx_candidate_tests_status ON public.candidate_tests(status);

-- 4. Candidate test answers (one row per question answered)
CREATE TABLE IF NOT EXISTS public.candidate_test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_test_id UUID NOT NULL REFERENCES public.candidate_tests(id) ON DELETE CASCADE,
  test_question_id UUID NOT NULL REFERENCES public.test_questions(id) ON DELETE CASCADE,
  most_like_option_index INT NOT NULL CHECK (most_like_option_index BETWEEN 1 AND 4),
  least_like_option_index INT NOT NULL CHECK (least_like_option_index BETWEEN 1 AND 4),
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_test_id, test_question_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_test_answers_candidate_test ON public.candidate_test_answers(candidate_test_id);

-- RLS: allow read for anon (candidate loads test) and authenticated (HR). Writes via RPC only for candidate.
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_test_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tests"
  ON public.tests FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can read test_questions"
  ON public.test_questions FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can read candidate_tests"
  ON public.candidate_tests FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can read candidate_test_answers"
  ON public.candidate_test_answers FOR SELECT TO anon, authenticated USING (true);

-- RPC: Start DISC test (validates token, creates/updates candidate_tests, sets started_at)
CREATE OR REPLACE FUNCTION public.disc_start_test(p_recruitment_token TEXT)
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

  SELECT id, duration_minutes INTO v_test_id, v_duration FROM tests WHERE type = 'disc' AND is_active = true LIMIT 1;
  IF v_test_id IS NULL THEN
    RAISE EXCEPTION 'No active DISC test found';
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

-- RPC: Submit one answer
CREATE OR REPLACE FUNCTION public.disc_submit_answer(
  p_recruitment_token TEXT,
  p_candidate_test_id UUID,
  p_test_question_id UUID,
  p_most_like_option_index INT,
  p_least_like_option_index INT
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
  IF p_most_like_option_index NOT BETWEEN 1 AND 4 OR p_least_like_option_index NOT BETWEEN 1 AND 4 THEN
    RAISE EXCEPTION 'Invalid option index';
  END IF;
  IF p_most_like_option_index = p_least_like_option_index THEN
    RAISE EXCEPTION 'Most and least must differ';
  END IF;

  SELECT id INTO v_profile_id FROM candidate_profiles WHERE recruitment_token = trim(p_recruitment_token) LIMIT 1;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Invalid recruitment token';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM candidate_tests WHERE id = p_candidate_test_id AND candidate_profile_id = v_profile_id AND status = 'in_progress') THEN
    RAISE EXCEPTION 'Invalid or not in progress test';
  END IF;

  INSERT INTO candidate_test_answers (candidate_test_id, test_question_id, most_like_option_index, least_like_option_index, answered_at)
  VALUES (p_candidate_test_id, p_test_question_id, p_most_like_option_index, p_least_like_option_index, NOW())
  ON CONFLICT (candidate_test_id, test_question_id) DO UPDATE SET
    most_like_option_index = EXCLUDED.most_like_option_index,
    least_like_option_index = EXCLUDED.least_like_option_index,
    answered_at = NOW();
END;
$$;

-- RPC: Submit test and compute DISC scores (Most = +1, Least = -1 per dimension, then normalize 0-100)
CREATE OR REPLACE FUNCTION public.disc_submit_test(p_recruitment_token TEXT, p_candidate_test_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_row public.candidate_tests;
  v_started_at TIMESTAMPTZ;
  v_duration_min INT;
  v_raw_d INT := 0;
  v_raw_i INT := 0;
  v_raw_s INT := 0;
  v_raw_c INT := 0;
  v_min_val NUMERIC;
  v_max_val NUMERIC;
  v_range NUMERIC;
  v_score_d NUMERIC;
  v_score_i NUMERIC;
  v_score_s NUMERIC;
  v_score_c NUMERIC;
  r RECORD;
  dim TEXT;
  opt_idx INT;
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
  WHERE ct.id = p_candidate_test_id AND ct.candidate_profile_id = v_profile_id;

  IF v_started_at IS NULL THEN
    RAISE EXCEPTION 'Test not found or not started';
  END IF;
  -- Allow submit if within time or slightly over (grace)
  IF NOW() > v_started_at + (v_duration_min || ' minutes')::INTERVAL + INTERVAL '1 minute' THEN
    RAISE EXCEPTION 'Test time expired';
  END IF;

  -- Compute raw scores from answers
  FOR r IN
    SELECT a.most_like_option_index, a.least_like_option_index,
           q.option_1_dimension, q.option_2_dimension, q.option_3_dimension, q.option_4_dimension
    FROM candidate_test_answers a
    JOIN test_questions q ON q.id = a.test_question_id
    WHERE a.candidate_test_id = p_candidate_test_id
  LOOP
    -- Most: +1 for that dimension
    dim := CASE r.most_like_option_index WHEN 1 THEN r.option_1_dimension WHEN 2 THEN r.option_2_dimension WHEN 3 THEN r.option_3_dimension ELSE r.option_4_dimension END;
    CASE dim WHEN 'D' THEN v_raw_d := v_raw_d + 1; WHEN 'I' THEN v_raw_i := v_raw_i + 1; WHEN 'S' THEN v_raw_s := v_raw_s + 1; ELSE v_raw_c := v_raw_c + 1; END CASE;
    -- Least: -1 for that dimension
    dim := CASE r.least_like_option_index WHEN 1 THEN r.option_1_dimension WHEN 2 THEN r.option_2_dimension WHEN 3 THEN r.option_3_dimension ELSE r.option_4_dimension END;
    CASE dim WHEN 'D' THEN v_raw_d := v_raw_d - 1; WHEN 'I' THEN v_raw_i := v_raw_i - 1; WHEN 'S' THEN v_raw_s := v_raw_s - 1; ELSE v_raw_c := v_raw_c - 1; END CASE;
  END LOOP;

  -- Normalize to 0-100: score = (raw - min) / (max - min) * 100, if range 0 then 50
  v_min_val := LEAST(v_raw_d, v_raw_i, v_raw_s, v_raw_c);
  v_max_val := GREATEST(v_raw_d, v_raw_i, v_raw_s, v_raw_c);
  v_range := v_max_val - v_min_val;
  IF v_range = 0 THEN
    v_score_d := 50; v_score_i := 50; v_score_s := 50; v_score_c := 50;
  ELSE
    v_score_d := ROUND(((v_raw_d - v_min_val) / v_range) * 100, 2);
    v_score_i := ROUND(((v_raw_i - v_min_val) / v_range) * 100, 2);
    v_score_s := ROUND(((v_raw_s - v_min_val) / v_range) * 100, 2);
    v_score_c := ROUND(((v_raw_c - v_min_val) / v_range) * 100, 2);
  END IF;

  UPDATE candidate_tests
  SET status = 'submitted', submitted_at = NOW(), score_d = v_score_d, score_i = v_score_i, score_s = v_score_s, score_c = v_score_c, updated_at = NOW()
  WHERE id = p_candidate_test_id AND candidate_profile_id = v_profile_id;

  RETURN jsonb_build_object(
    'score_d', v_score_d,
    'score_i', v_score_i,
    'score_s', v_score_s,
    'score_c', v_score_c
  );
END;
$$;

-- Seed: one DISC test
INSERT INTO public.tests (id, name, description, duration_minutes, type, is_active, created_at, updated_at)
VALUES (
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'Tes DISC',
  'Assessment gaya perilaku DISC (Dominance, Influence, Steadiness, Conscientiousness). Pilih kata yang paling dan paling tidak menggambarkan Anda.',
  10,
  'disc',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Seed: 24 DISC questions (Indonesian). Each row: 4 options with dimensions D, I, S, C (one per option).
-- Using classic DISC adjectives translated / adapted to Indonesian.
INSERT INTO public.test_questions (test_id, question_order, option_1_text, option_1_dimension, option_2_text, option_2_dimension, option_3_text, option_3_dimension, option_4_text, option_4_dimension)
VALUES
  ('a1000000-0000-4000-8000-000000000001', 1,  'Tegas', 'D', 'Ramah', 'I', 'Sabar', 'S', 'Teliti', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 2,  'Berani', 'D', 'Antusias', 'I', 'Stabil', 'S', 'Sistematis', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 3,  'Langsung', 'D', 'Bersemangat', 'I', 'Kooperaif', 'S', 'Akurat', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 4,  'Kompettitif', 'D', 'Meyakinkan', 'I', 'Mendukung', 'S', 'Hati-hati', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 5,  'Keputusan cepat', 'D', 'Optimis', 'I', 'Tenang', 'S', 'Analitis', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 6,  'Mandiri', 'D', 'Sosial', 'I', 'Setia', 'S', 'Rinci', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 7,  'Kepercayaan diri', 'D', 'Persuasif', 'I', 'Lembut', 'S', 'Standar tinggi', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 8,  'Fokus hasil', 'D', 'Spontan', 'I', 'Konsisten', 'S', 'Logis', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 9,  'Asertif', 'D', 'Ramah', 'I', 'Pengertian', 'S', 'Objektif', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 10, 'Pemimpin', 'D', 'Inspiratif', 'I', 'Penolong', 'S', 'Presisi', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 11, 'Dinamis', 'D', 'Menyenangkan', 'I', 'Sabar', 'S', 'Terencana', 'C'),
  ('a1000000-0000-4000-000000000001', 12, 'Kuat kemauan', 'D', 'Ekspresif', 'I', 'Pendengar baik', 'S', 'Kritis', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 13, 'Berorientasi target', 'D', 'Bersahabat', 'I', 'Stabil emosi', 'S', 'Faktual', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 14, 'Tantangan', 'D', 'Populer', 'I', 'Kesetiaan', 'S', 'Kualitas', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 15, 'Kontrol', 'D', 'Kreatif', 'I', 'Penyayang', 'S', 'Terstruktur', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 16, 'Determinasi', 'D', 'Komunikatif', 'I', 'Akomodatif', 'S', 'Skeptis', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 17, 'Inisiatif', 'D', 'Energik', 'I', 'Sabar', 'S', 'Metodis', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 18, 'Pioneer', 'D', 'Mudah bergaul', 'I', 'Harmonis', 'S', 'Sempurna', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 19, 'Dominan', 'D', 'Membangkitkan semangat', 'I', 'Kooperatif', 'S', 'Berhati-hati', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 20, 'Ambisius', 'D', 'Murah hati', 'I', 'Dapat diandalkan', 'S', 'Kritis', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 21, 'Kepemimpinan', 'D', 'Menghibur', 'I', 'Pendamai', 'S', 'Detail', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 22, 'Produktif', 'D', 'Mempengaruhi', 'I', 'Penyayang', 'S', 'Akurat', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 23, 'Berani ambil risiko', 'D', 'Terbuka', 'I', 'Lembut', 'S', 'Tepat', 'C'),
  ('a1000000-0000-4000-8000-000000000001', 24, 'Orientasi tindakan', 'D', 'Kolaboratif', 'I', 'Stabil', 'S', 'Berprinsip', 'C')
ON CONFLICT (test_id, question_order) DO NOTHING;
