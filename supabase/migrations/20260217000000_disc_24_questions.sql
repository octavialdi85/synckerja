-- DISC test: add 9 more questions (16-24) so total = 24 as per standard DISC.
-- Soal 1-15 tetap dari Gambaran Diri (migration replace_disc_questions_from_images).
-- Soal 16-24 dari set klasik DISC (adjective-based).

INSERT INTO public.test_questions (test_id, question_order, option_1_text, option_1_dimension, option_2_text, option_2_dimension, option_3_text, option_3_dimension, option_4_text, option_4_dimension)
VALUES
  ('a1000000-0000-4000-8000-000000000001'::uuid, 16, 'Determinasi', 'D', 'Komunikatif', 'I', 'Akomodatif', 'S', 'Skeptis', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 17, 'Inisiatif', 'D', 'Energik', 'I', 'Sabar', 'S', 'Metodis', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 18, 'Pioneer', 'D', 'Mudah bergaul', 'I', 'Harmonis', 'S', 'Sempurna', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 19, 'Dominan', 'D', 'Membangkitkan semangat', 'I', 'Kooperatif', 'S', 'Berhati-hati', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 20, 'Ambisius', 'D', 'Murah hati', 'I', 'Dapat diandalkan', 'S', 'Kritis', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 21, 'Kepemimpinan', 'D', 'Menghibur', 'I', 'Pendamai', 'S', 'Detail', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 22, 'Produktif', 'D', 'Mempengaruhi', 'I', 'Penyayang', 'S', 'Akurat', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 23, 'Berani ambil risiko', 'D', 'Terbuka', 'I', 'Lembut', 'S', 'Tepat', 'C'),
  ('a1000000-0000-4000-8000-000000000001'::uuid, 24, 'Orientasi tindakan', 'D', 'Kolaboratif', 'I', 'Stabil', 'S', 'Berprinsip', 'C')
ON CONFLICT (test_id, question_order) DO NOTHING;

-- Update disc_submit_test: normalize using dynamic question count so 24 questions => raw in [-24,+24], score = (raw + N) / (2*N) * 100.
CREATE OR REPLACE FUNCTION public.disc_submit_test(p_recruitment_token TEXT, p_candidate_test_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_test_id UUID;
  v_started_at TIMESTAMPTZ;
  v_duration_min INT;
  v_raw_d INT := 0;
  v_raw_i INT := 0;
  v_raw_s INT := 0;
  v_raw_c INT := 0;
  v_score_d NUMERIC;
  v_score_i NUMERIC;
  v_score_s NUMERIC;
  v_score_c NUMERIC;
  v_num_questions INT;
  v_max_raw NUMERIC;
  v_range NUMERIC;
  r RECORD;
  dim TEXT;
BEGIN
  IF p_recruitment_token IS NULL OR trim(p_recruitment_token) = '' THEN
    RAISE EXCEPTION 'recruitment_token required';
  END IF;

  SELECT id INTO v_profile_id FROM candidate_profiles WHERE recruitment_token = trim(p_recruitment_token) LIMIT 1;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Invalid recruitment token';
  END IF;

  SELECT ct.test_id, ct.started_at, t.duration_minutes
  INTO v_test_id, v_started_at, v_duration_min
  FROM candidate_tests ct
  JOIN tests t ON t.id = ct.test_id
  WHERE ct.id = p_candidate_test_id AND ct.candidate_profile_id = v_profile_id;

  IF v_started_at IS NULL THEN
    RAISE EXCEPTION 'Test not found or not started';
  END IF;
  IF NOW() > v_started_at + (v_duration_min || ' minutes')::INTERVAL + INTERVAL '1 minute' THEN
    RAISE EXCEPTION 'Test time expired';
  END IF;

  SELECT COUNT(*) INTO v_num_questions FROM test_questions WHERE test_id = v_test_id;
  IF v_num_questions IS NULL OR v_num_questions < 1 THEN
    v_num_questions := 24;
  END IF;
  v_max_raw := v_num_questions;
  v_range := v_num_questions * 2;

  -- Compute raw scores from answers (Most = +1, Least = -1 per dimension)
  FOR r IN
    SELECT a.most_like_option_index, a.least_like_option_index,
           q.option_1_dimension, q.option_2_dimension, q.option_3_dimension, q.option_4_dimension
    FROM candidate_test_answers a
    JOIN test_questions q ON q.id = a.test_question_id
    WHERE a.candidate_test_id = p_candidate_test_id
  LOOP
    dim := CASE r.most_like_option_index WHEN 1 THEN r.option_1_dimension WHEN 2 THEN r.option_2_dimension WHEN 3 THEN r.option_3_dimension ELSE r.option_4_dimension END;
    CASE dim WHEN 'D' THEN v_raw_d := v_raw_d + 1; WHEN 'I' THEN v_raw_i := v_raw_i + 1; WHEN 'S' THEN v_raw_s := v_raw_s + 1; ELSE v_raw_c := v_raw_c + 1; END CASE;
    dim := CASE r.least_like_option_index WHEN 1 THEN r.option_1_dimension WHEN 2 THEN r.option_2_dimension WHEN 3 THEN r.option_3_dimension ELSE r.option_4_dimension END;
    CASE dim WHEN 'D' THEN v_raw_d := v_raw_d - 1; WHEN 'I' THEN v_raw_i := v_raw_i - 1; WHEN 'S' THEN v_raw_s := v_raw_s - 1; ELSE v_raw_c := v_raw_c - 1; END CASE;
  END LOOP;

  -- Fixed scale 0-100: score = (raw + N) / (2*N) * 100. For N=24: raw in [-24,24] => (raw+24)/48*100.
  v_score_d := ROUND(GREATEST(0, LEAST(100, ((v_raw_d + v_max_raw) / v_range) * 100)), 2);
  v_score_i := ROUND(GREATEST(0, LEAST(100, ((v_raw_i + v_max_raw) / v_range) * 100)), 2);
  v_score_s := ROUND(GREATEST(0, LEAST(100, ((v_raw_s + v_max_raw) / v_range) * 100)), 2);
  v_score_c := ROUND(GREATEST(0, LEAST(100, ((v_raw_c + v_max_raw) / v_range) * 100)), 2);

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
