-- SJT: extend sjt_submit_test to compute and store sjt_dimension_scores, return in response.

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
  v_etika INT := 0;
  v_komunikasi INT := 0;
  v_prioritas INT := 0;
  v_konflik INT := 0;
  v_prosedur INT := 0;
  r RECORD;
  r2 RECORD;
  v_dim TEXT;
  v_dimension_scores JSONB;
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

  -- Compute dimension counts from each selected option
  FOR r2 IN
    SELECT a.selected_option_index,
      q.option_1_dimension,
      q.option_2_dimension,
      q.option_3_dimension,
      q.option_4_dimension
    FROM candidate_sjt_answers a
    JOIN sjt_questions q ON q.id = a.sjt_question_id
    WHERE a.candidate_test_id = p_candidate_test_id
  LOOP
    v_dim := CASE r2.selected_option_index
      WHEN 1 THEN r2.option_1_dimension
      WHEN 2 THEN r2.option_2_dimension
      WHEN 3 THEN r2.option_3_dimension
      WHEN 4 THEN r2.option_4_dimension
      ELSE NULL
    END;
    IF v_dim IS NOT NULL THEN
      CASE v_dim
        WHEN 'etika' THEN v_etika := v_etika + 1;
        WHEN 'komunikasi' THEN v_komunikasi := v_komunikasi + 1;
        WHEN 'prioritas' THEN v_prioritas := v_prioritas + 1;
        WHEN 'konflik' THEN v_konflik := v_konflik + 1;
        WHEN 'prosedur' THEN v_prosedur := v_prosedur + 1;
        ELSE NULL;
      END CASE;
    END IF;
  END LOOP;

  v_dimension_scores := jsonb_build_object(
    'etika', v_etika,
    'komunikasi', v_komunikasi,
    'prioritas', v_prioritas,
    'konflik', v_konflik,
    'prosedur', v_prosedur
  );

  UPDATE candidate_tests
  SET status = 'submitted', submitted_at = NOW(),
      score_sjt = v_score_sjt,
      sjt_dimension_scores = v_dimension_scores,
      updated_at = NOW()
  WHERE id = p_candidate_test_id AND candidate_profile_id = v_profile_id;

  RETURN jsonb_build_object(
    'score_sjt', v_score_sjt,
    'sjt_dimension_scores', v_dimension_scores
  );
END;
$$;
