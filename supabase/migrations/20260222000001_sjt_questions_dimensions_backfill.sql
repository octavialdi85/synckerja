-- SJT: backfill option_1_dimension .. option_4_dimension for existing 12 questions.
-- Dimensions: etika, komunikasi, prioritas, konflik, prosedur (one per option).

UPDATE public.sjt_questions SET
  option_1_dimension = 'komunikasi',
  option_2_dimension = 'prioritas',
  option_3_dimension = 'etika',
  option_4_dimension = 'prioritas'
WHERE test_id = 'a1000000-0000-4000-8000-000000000003'::uuid AND question_order = 1;

UPDATE public.sjt_questions SET
  option_1_dimension = 'konflik',
  option_2_dimension = 'prosedur',
  option_3_dimension = 'etika',
  option_4_dimension = 'konflik'
WHERE test_id = 'a1000000-0000-4000-8000-000000000003'::uuid AND question_order = 2;

UPDATE public.sjt_questions SET
  option_1_dimension = 'prioritas',
  option_2_dimension = 'prioritas',
  option_3_dimension = 'prioritas',
  option_4_dimension = 'prioritas'
WHERE test_id = 'a1000000-0000-4000-8000-000000000003'::uuid AND question_order = 3;

UPDATE public.sjt_questions SET
  option_1_dimension = 'konflik',
  option_2_dimension = 'prosedur',
  option_3_dimension = 'etika',
  option_4_dimension = 'prioritas'
WHERE test_id = 'a1000000-0000-4000-8000-000000000003'::uuid AND question_order = 4;

UPDATE public.sjt_questions SET
  option_1_dimension = 'prioritas',
  option_2_dimension = 'etika',
  option_3_dimension = 'prioritas',
  option_4_dimension = 'prioritas'
WHERE test_id = 'a1000000-0000-4000-8000-000000000003'::uuid AND question_order = 5;

UPDATE public.sjt_questions SET
  option_1_dimension = 'prosedur',
  option_2_dimension = 'komunikasi',
  option_3_dimension = 'etika',
  option_4_dimension = 'prioritas'
WHERE test_id = 'a1000000-0000-4000-8000-000000000003'::uuid AND question_order = 6;

UPDATE public.sjt_questions SET
  option_1_dimension = 'etika',
  option_2_dimension = 'etika',
  option_3_dimension = 'prioritas',
  option_4_dimension = 'etika'
WHERE test_id = 'a1000000-0000-4000-8000-000000000003'::uuid AND question_order = 7;

UPDATE public.sjt_questions SET
  option_1_dimension = 'komunikasi',
  option_2_dimension = 'prioritas',
  option_3_dimension = 'etika',
  option_4_dimension = 'etika'
WHERE test_id = 'a1000000-0000-4000-8000-000000000003'::uuid AND question_order = 8;

UPDATE public.sjt_questions SET
  option_1_dimension = 'prioritas',
  option_2_dimension = 'komunikasi',
  option_3_dimension = 'prioritas',
  option_4_dimension = 'prioritas'
WHERE test_id = 'a1000000-0000-4000-8000-000000000003'::uuid AND question_order = 9;

UPDATE public.sjt_questions SET
  option_1_dimension = 'prosedur',
  option_2_dimension = 'konflik',
  option_3_dimension = 'etika',
  option_4_dimension = 'prosedur'
WHERE test_id = 'a1000000-0000-4000-8000-000000000003'::uuid AND question_order = 10;

UPDATE public.sjt_questions SET
  option_1_dimension = 'komunikasi',
  option_2_dimension = 'etika',
  option_3_dimension = 'prioritas',
  option_4_dimension = 'komunikasi'
WHERE test_id = 'a1000000-0000-4000-8000-000000000003'::uuid AND question_order = 11;

UPDATE public.sjt_questions SET
  option_1_dimension = 'prioritas',
  option_2_dimension = 'konflik',
  option_3_dimension = 'prioritas',
  option_4_dimension = 'prioritas'
WHERE test_id = 'a1000000-0000-4000-8000-000000000003'::uuid AND question_order = 12;
