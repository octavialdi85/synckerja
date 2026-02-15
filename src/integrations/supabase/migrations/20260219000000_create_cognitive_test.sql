-- Cognitive Test: tables, RPCs, seed 30 questions. 30 questions x 30 sec = 15 min total.

-- 1. Add cognitive score columns to candidate_tests
ALTER TABLE public.candidate_tests
  ADD COLUMN IF NOT EXISTS score_total INT NULL,
  ADD COLUMN IF NOT EXISTS score_verbal INT NULL,
  ADD COLUMN IF NOT EXISTS score_numerical INT NULL,
  ADD COLUMN IF NOT EXISTS score_logical INT NULL;

-- 2. Cognitive questions (one correct answer per question, optional category for sub-scores)
CREATE TABLE IF NOT EXISTS public.cognitive_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_order INT NOT NULL,
  question_text TEXT NOT NULL,
  option_1_text TEXT NOT NULL,
  option_2_text TEXT NOT NULL,
  option_3_text TEXT NOT NULL,
  option_4_text TEXT NOT NULL,
  correct_option_index INT NOT NULL CHECK (correct_option_index BETWEEN 1 AND 4),
  category TEXT NULL CHECK (category IN ('verbal', 'numerical', 'logical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cognitive_questions_test_id ON public.cognitive_questions(test_id);
ALTER TABLE public.cognitive_questions ADD CONSTRAINT cognitive_questions_test_order_unique UNIQUE (test_id, question_order);

-- 3. Candidate cognitive answers (one row per question answered)
CREATE TABLE IF NOT EXISTS public.candidate_cognitive_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_test_id UUID NOT NULL REFERENCES public.candidate_tests(id) ON DELETE CASCADE,
  cognitive_question_id UUID NOT NULL REFERENCES public.cognitive_questions(id) ON DELETE CASCADE,
  selected_option_index INT NOT NULL CHECK (selected_option_index BETWEEN 1 AND 4),
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_test_id, cognitive_question_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_cognitive_answers_candidate_test ON public.candidate_cognitive_answers(candidate_test_id);

-- RLS
ALTER TABLE public.cognitive_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_cognitive_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cognitive_questions"
  ON public.cognitive_questions FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can read candidate_cognitive_answers"
  ON public.candidate_cognitive_answers FOR SELECT TO anon, authenticated USING (true);

-- 4. Seed: one Cognitive test (15 min = 30 sec x 30 questions)
INSERT INTO public.tests (id, name, description, duration_minutes, type, is_active, created_at, updated_at)
VALUES (
  'a1000000-0000-4000-8000-000000000002'::uuid,
  'Tes Kognitif',
  'Tes kemampuan kognitif: penalaran verbal, numerik, dan logika. Pilih satu jawaban benar per soal.',
  15,
  'cognitive',
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

-- 5. RPC: Start cognitive test
CREATE OR REPLACE FUNCTION public.cognitive_start_test(p_recruitment_token TEXT)
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

  SELECT id, duration_minutes INTO v_test_id, v_duration FROM tests WHERE type = 'cognitive' AND is_active = true LIMIT 1;
  IF v_test_id IS NULL THEN
    RAISE EXCEPTION 'No active cognitive test found';
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

-- 6. RPC: Submit one cognitive answer
CREATE OR REPLACE FUNCTION public.cognitive_submit_answer(
  p_recruitment_token TEXT,
  p_candidate_test_id UUID,
  p_cognitive_question_id UUID,
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
                  AND ct.status = 'in_progress' AND t.type = 'cognitive') THEN
    RAISE EXCEPTION 'Invalid or not in progress cognitive test';
  END IF;

  INSERT INTO candidate_cognitive_answers (candidate_test_id, cognitive_question_id, selected_option_index, answered_at)
  VALUES (p_candidate_test_id, p_cognitive_question_id, p_selected_option_index, NOW())
  ON CONFLICT (candidate_test_id, cognitive_question_id) DO UPDATE SET
    selected_option_index = EXCLUDED.selected_option_index,
    answered_at = NOW();
END;
$$;

-- 7. RPC: Submit cognitive test and compute scores
CREATE OR REPLACE FUNCTION public.cognitive_submit_test(p_recruitment_token TEXT, p_candidate_test_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_started_at TIMESTAMPTZ;
  v_duration_min INT;
  v_score_total INT := 0;
  v_score_verbal INT := 0;
  v_score_numerical INT := 0;
  v_score_logical INT := 0;
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
  WHERE ct.id = p_candidate_test_id AND ct.candidate_profile_id = v_profile_id AND t.type = 'cognitive';

  IF v_started_at IS NULL THEN
    RAISE EXCEPTION 'Test not found or not started';
  END IF;
  IF NOW() > v_started_at + (v_duration_min || ' minutes')::INTERVAL + INTERVAL '1 minute' THEN
    RAISE EXCEPTION 'Test time expired';
  END IF;

  -- Count correct answers (selected_option_index = correct_option_index)
  FOR r IN
    SELECT a.selected_option_index, q.correct_option_index, q.category
    FROM candidate_cognitive_answers a
    JOIN cognitive_questions q ON q.id = a.cognitive_question_id
    WHERE a.candidate_test_id = p_candidate_test_id
  LOOP
    IF r.selected_option_index = r.correct_option_index THEN
      v_score_total := v_score_total + 1;
      CASE r.category
        WHEN 'verbal' THEN v_score_verbal := v_score_verbal + 1;
        WHEN 'numerical' THEN v_score_numerical := v_score_numerical + 1;
        WHEN 'logical' THEN v_score_logical := v_score_logical + 1;
        ELSE NULL;
      END CASE;
    END IF;
  END LOOP;

  UPDATE candidate_tests
  SET status = 'submitted', submitted_at = NOW(),
      score_total = v_score_total, score_verbal = v_score_verbal, score_numerical = v_score_numerical, score_logical = v_score_logical,
      updated_at = NOW()
  WHERE id = p_candidate_test_id AND candidate_profile_id = v_profile_id;

  RETURN jsonb_build_object(
    'score_total', v_score_total,
    'score_verbal', v_score_verbal,
    'score_numerical', v_score_numerical,
    'score_logical', v_score_logical
  );
END;
$$;

-- 8. Seed: 30 cognitive questions (placeholder content; 10 verbal, 10 numerical, 10 logical)
INSERT INTO public.cognitive_questions (test_id, question_order, question_text, option_1_text, option_2_text, option_3_text, option_4_text, correct_option_index, category)
VALUES
  ('a1000000-0000-4000-8000-000000000002'::uuid, 1, 'Sinonim dari "Cepat" adalah ...', 'Lambat', 'Laju', 'Santai', 'Pelan', 2, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 2, 'Antonim dari "Tinggi" adalah ...', 'Rendah', 'Jangkung', 'Besar', 'Panjang', 1, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 3, 'Mobil : Bensin = Pelari : ...', 'Sepatu', 'Makanan', 'Lintasan', 'Medali', 2, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 4, 'Buku : Halaman = Pohon : ...', 'Daun', 'Akar', 'Batang', 'Ranting', 1, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 5, 'Sinonim dari "Bersih" adalah ...', 'Kotor', 'Suci', 'Rapi', 'Jernih', 2, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 6, 'Dokter : Pasien = Guru : ...', 'Sekolah', 'Murid', 'Buku', 'Kelas', 2, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 7, 'Panas : Dingin = Siang : ...', 'Terang', 'Malam', 'Pagi', 'Sore', 2, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 8, 'Kata yang tidak sejenis: Apel, Jeruk, Wortel, Mangga.', 'Apel', 'Jeruk', 'Wortel', 'Mangga', 3, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 9, 'Sinonim dari "Hemat" adalah ...', 'Boros', 'Irit', 'Luar biasa', 'Banyak', 2, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 10, 'Kucing : Meong = Anjing : ...', 'Menggonggong', 'Mengeong', 'Mengaum', 'Mencicit', 1, 'verbal'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 11, '2 + 3 × 4 = ...', '20', '14', '12', '24', 2, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 12, 'Lanjutkan: 2, 4, 6, 8, ...', '9', '10', '11', '12', 2, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 13, '50% dari 80 adalah ...', '30', '40', '45', '50', 2, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 14, 'Lanjutkan: 1, 3, 5, 7, ...', '8', '9', '10', '11', 2, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 15, '8 orang selesai dalam 10 hari. Berapa orang agar selesai dalam 5 hari?', '12', '14', '16', '18', 3, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 16, '15 × 4 = ...', '50', '55', '60', '65', 3, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 17, 'Lanjutkan: 3, 6, 9, 12, ...', '14', '15', '16', '18', 2, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 18, '100 - 37 = ...', '61', '62', '63', '64', 3, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 19, 'Lanjutkan: 5, 10, 15, 20, ...', '22', '24', '25', '30', 3, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 20, 'Sebelas plus sembilan = ...', '18', '19', '20', '21', 3, 'numerical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 21, 'Semua A adalah B. Beberapa B adalah C. Kesimpulan yang mungkin benar:', 'Semua A adalah C', 'Beberapa A mungkin C', 'Tidak ada A yang C', 'Semua C adalah A', 2, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 22, 'Pola: ○ □ ○ □ ○ ... Berikutnya adalah:', '○', '□', '△', '—', 2, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 23, 'Jika hujan maka jalan basah. Jalan basah. Kesimpulan:', 'Pasti hujan', 'Mungkin hujan', 'Tidak hujan', 'Tidak bisa disimpulkan', 2, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 24, 'Urutan dari kecil ke besar: 1/2, 0.6, 3/4, 0.5', '0.5, 1/2, 0.6, 3/4', '1/2, 0.5, 0.6, 3/4', '0.5, 0.6, 1/2, 3/4', '1/2, 0.6, 3/4, 0.5', 2, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 25, 'Pola angka: 1, 1, 2, 3, 5, ... (Fibonacci). Berikutnya:', '6', '7', '8', '9', 3, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 26, 'Semua manager punya akses. Budi punya akses. Kesimpulan:', 'Budi pasti manager', 'Budi mungkin manager', 'Budi bukan manager', 'Tidak bisa disimpulkan', 2, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 27, 'Pola: 1, 4, 9, 16, ... (kuadrat). Berikutnya:', '20', '24', '25', '30', 3, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 28, 'A lebih tinggi dari B. B lebih tinggi dari C. Maka:', 'A paling tinggi', 'C paling pendek', 'A lebih tinggi dari C', 'Semua benar', 4, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 29, 'Hari ini Senin. 3 hari lalu adalah ...', 'Jumat', 'Sabtu', 'Minggu', 'Kamis', 1, 'logical'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 30, 'Pola: Merah, Biru, Merah, Biru, ... Berikutnya:', 'Hijau', 'Merah', 'Biru', 'Kuning', 2, 'logical')
ON CONFLICT (test_id, question_order) DO NOTHING;
