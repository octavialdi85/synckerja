-- SJT: hitung skor dari option_index_A/B/C/D (grade per jawaban), simpan skor tertimbang per dimensi + total.
-- score_sjt = jumlah jawaban A (sangat baik), 0-12.
-- sjt_dimension_scores = { total_weighted, count_A, count_B, count_C, count_D, etika: { A,B,C,D, weighted }, ... }

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
  v_score_sjt INT := 0;   -- count of A (sangat baik)
  v_count_a INT := 0;
  v_count_b INT := 0;
  v_count_c INT := 0;
  v_count_d INT := 0;
  v_total_weighted INT := 0;
  v_grade TEXT;
  v_dim TEXT;
  v_points INT;
  -- per-dimension: A,B,C,D counts and weighted
  v_etika_a INT := 0; v_etika_b INT := 0; v_etika_c INT := 0; v_etika_d INT := 0;
  v_kom_a INT := 0; v_kom_b INT := 0; v_kom_c INT := 0; v_kom_d INT := 0;
  v_pri_a INT := 0; v_pri_b INT := 0; v_pri_c INT := 0; v_pri_d INT := 0;
  v_kon_a INT := 0; v_kon_b INT := 0; v_kon_c INT := 0; v_kon_d INT := 0;
  v_pro_a INT := 0; v_pro_b INT := 0; v_pro_c INT := 0; v_pro_d INT := 0;
  r RECORD;
  v_dimension_scores JSONB;
  v_opt_a INT; v_opt_b INT; v_opt_c INT; v_opt_d INT;
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

  FOR r IN
    SELECT a.selected_option_index,
      COALESCE(q.option_index_A, q.best_option_index) AS opt_a,
      q.option_index_B, q.option_index_C, q.option_index_D,
      q.option_1_dimension, q.option_2_dimension, q.option_3_dimension, q.option_4_dimension
    FROM candidate_sjt_answers a
    JOIN sjt_questions q ON q.id = a.sjt_question_id
    WHERE a.candidate_test_id = p_candidate_test_id
  LOOP
    v_opt_a := COALESCE(r.opt_a, 1);
    v_opt_b := COALESCE(r.option_index_B, 2);
    v_opt_c := COALESCE(r.option_index_C, 3);
    v_opt_d := COALESCE(r.option_index_D, 4);

    IF r.selected_option_index = v_opt_a THEN
      v_grade := 'A'; v_points := 4; v_score_sjt := v_score_sjt + 1; v_count_a := v_count_a + 1;
    ELSIF r.selected_option_index = v_opt_b THEN
      v_grade := 'B'; v_points := 3; v_count_b := v_count_b + 1;
    ELSIF r.selected_option_index = v_opt_c THEN
      v_grade := 'C'; v_points := 2; v_count_c := v_count_c + 1;
    ELSE
      v_grade := 'D'; v_points := 1; v_count_d := v_count_d + 1;
    END IF;
    v_total_weighted := v_total_weighted + v_points;

    v_dim := CASE r.selected_option_index
      WHEN 1 THEN r.option_1_dimension
      WHEN 2 THEN r.option_2_dimension
      WHEN 3 THEN r.option_3_dimension
      WHEN 4 THEN r.option_4_dimension
      ELSE NULL
    END;

    IF v_dim IS NOT NULL THEN
      CASE v_dim
        WHEN 'etika' THEN
          IF v_grade = 'A' THEN v_etika_a := v_etika_a + 1;
          ELSIF v_grade = 'B' THEN v_etika_b := v_etika_b + 1;
          ELSIF v_grade = 'C' THEN v_etika_c := v_etika_c + 1;
          ELSE v_etika_d := v_etika_d + 1; END IF;
        WHEN 'komunikasi' THEN
          IF v_grade = 'A' THEN v_kom_a := v_kom_a + 1;
          ELSIF v_grade = 'B' THEN v_kom_b := v_kom_b + 1;
          ELSIF v_grade = 'C' THEN v_kom_c := v_kom_c + 1;
          ELSE v_kom_d := v_kom_d + 1; END IF;
        WHEN 'prioritas' THEN
          IF v_grade = 'A' THEN v_pri_a := v_pri_a + 1;
          ELSIF v_grade = 'B' THEN v_pri_b := v_pri_b + 1;
          ELSIF v_grade = 'C' THEN v_pri_c := v_pri_c + 1;
          ELSE v_pri_d := v_pri_d + 1; END IF;
        WHEN 'konflik' THEN
          IF v_grade = 'A' THEN v_kon_a := v_kon_a + 1;
          ELSIF v_grade = 'B' THEN v_kon_b := v_kon_b + 1;
          ELSIF v_grade = 'C' THEN v_kon_c := v_kon_c + 1;
          ELSE v_kon_d := v_kon_d + 1; END IF;
        WHEN 'prosedur' THEN
          IF v_grade = 'A' THEN v_pro_a := v_pro_a + 1;
          ELSIF v_grade = 'B' THEN v_pro_b := v_pro_b + 1;
          ELSIF v_grade = 'C' THEN v_pro_c := v_pro_c + 1;
          ELSE v_pro_d := v_pro_d + 1; END IF;
        ELSE NULL;
      END CASE;
    END IF;
  END LOOP;

  v_dimension_scores := jsonb_build_object(
    'total_weighted', v_total_weighted,
    'count_A', v_count_a,
    'count_B', v_count_b,
    'count_C', v_count_c,
    'count_D', v_count_d,
    'etika', jsonb_build_object('A', v_etika_a, 'B', v_etika_b, 'C', v_etika_c, 'D', v_etika_d,
      'weighted', v_etika_a*4 + v_etika_b*3 + v_etika_c*2 + v_etika_d*1),
    'komunikasi', jsonb_build_object('A', v_kom_a, 'B', v_kom_b, 'C', v_kom_c, 'D', v_kom_d,
      'weighted', v_kom_a*4 + v_kom_b*3 + v_kom_c*2 + v_kom_d*1),
    'prioritas', jsonb_build_object('A', v_pri_a, 'B', v_pri_b, 'C', v_pri_c, 'D', v_pri_d,
      'weighted', v_pri_a*4 + v_pri_b*3 + v_pri_c*2 + v_pri_d*1),
    'konflik', jsonb_build_object('A', v_kon_a, 'B', v_kon_b, 'C', v_kon_c, 'D', v_kon_d,
      'weighted', v_kon_a*4 + v_kon_b*3 + v_kon_c*2 + v_kon_d*1),
    'prosedur', jsonb_build_object('A', v_pro_a, 'B', v_pro_b, 'C', v_pro_c, 'D', v_pro_d,
      'weighted', v_pro_a*4 + v_pro_b*3 + v_pro_c*2 + v_pro_d*1)
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
