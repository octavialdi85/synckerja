-- Fix DISC score normalization: use fixed scale 0-100 (50 = neutral) instead of min-max stretch.
-- Raw per dimension with 15 questions is in [-15, +15]. Formula: score = (raw + 15) / 30 * 100, clamped to [0, 100].

CREATE OR REPLACE FUNCTION public.disc_submit_test(p_recruitment_token TEXT, p_candidate_test_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
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
  r RECORD;
  dim TEXT;
  v_raw_range NUMERIC := 30;
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
  IF NOW() > v_started_at + (v_duration_min || ' minutes')::INTERVAL + INTERVAL '1 minute' THEN
    RAISE EXCEPTION 'Test time expired';
  END IF;

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

  -- Fixed scale 0-100: score = (raw + 15) / 30 * 100, clamp to [0, 100]. 50 = neutral (raw 0).
  v_score_d := ROUND(GREATEST(0, LEAST(100, ((v_raw_d + 15) / v_raw_range) * 100)), 2);
  v_score_i := ROUND(GREATEST(0, LEAST(100, ((v_raw_i + 15) / v_raw_range) * 100)), 2);
  v_score_s := ROUND(GREATEST(0, LEAST(100, ((v_raw_s + 15) / v_raw_range) * 100)), 2);
  v_score_c := ROUND(GREATEST(0, LEAST(100, ((v_raw_c + 15) / v_raw_range) * 100)), 2);

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
