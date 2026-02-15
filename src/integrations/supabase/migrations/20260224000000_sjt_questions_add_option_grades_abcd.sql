-- SJT: tambah kolom option_index_A (sangat baik), B (baik), C (cukup), D (buruk). Masing-masing 1-4, harus permutasi {1,2,3,4}.
ALTER TABLE public.sjt_questions
  ADD COLUMN IF NOT EXISTS option_index_A INT NULL CHECK (option_index_A BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS option_index_B INT NULL CHECK (option_index_B BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS option_index_C INT NULL CHECK (option_index_C BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS option_index_D INT NULL CHECK (option_index_D BETWEEN 1 AND 4);

-- Backfill: A = best_option_index; B,C,D = tiga opsi lainnya urut (ascending)
WITH rest AS (
  SELECT id, best_option_index,
    (ARRAY(SELECT generate_series(1,4) EXCEPT SELECT best_option_index))[1] AS b,
    (ARRAY(SELECT generate_series(1,4) EXCEPT SELECT best_option_index))[2] AS c,
    (ARRAY(SELECT generate_series(1,4) EXCEPT SELECT best_option_index))[3] AS d
  FROM public.sjt_questions
  WHERE option_index_A IS NULL
)
UPDATE public.sjt_questions q
SET
  option_index_A = r.best_option_index,
  option_index_B = r.b,
  option_index_C = r.c,
  option_index_D = r.d
FROM rest r
WHERE q.id = r.id;

COMMENT ON COLUMN public.sjt_questions.option_index_A IS 'Option index (1-4) for grade A (sangat baik)';
COMMENT ON COLUMN public.sjt_questions.option_index_B IS 'Option index (1-4) for grade B (baik)';
COMMENT ON COLUMN public.sjt_questions.option_index_C IS 'Option index (1-4) for grade C (cukup)';
COMMENT ON COLUMN public.sjt_questions.option_index_D IS 'Option index (1-4) for grade D (buruk)';
