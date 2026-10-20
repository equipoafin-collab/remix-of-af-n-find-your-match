-- T10.1 · Consentimiento del test DISC (/quiz): qué texto aceptó y cuándo, como en el cuestionario (T9.3).
-- Los resultados anteriores quedan a NULL. La casilla la exige la página; no se exige aquí para no romper el test
-- en una versión publicada anterior mientras no se vuelva a publicar.
ALTER TABLE public.disc_results ADD COLUMN IF NOT EXISTS consentimiento_version text;
ALTER TABLE public.disc_results ADD COLUMN IF NOT EXISTS consentimiento_at timestamptz;
ALTER TABLE public.disc_results ALTER COLUMN consentimiento_at SET DEFAULT now();
