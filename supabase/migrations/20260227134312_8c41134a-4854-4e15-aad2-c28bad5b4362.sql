ALTER TABLE public.perfiles
  ADD COLUMN importa_vestir boolean DEFAULT null,
  ADD COLUMN estilo_vestir text DEFAULT null,
  ADD COLUMN estilo_vestir_pareja text DEFAULT null,
  ADD COLUMN importa_politica boolean DEFAULT null,
  ADD COLUMN politica_pareja text DEFAULT null,
  ADD COLUMN tiene_tatuajes boolean DEFAULT null,
  ADD COLUMN tatuajes_pareja text DEFAULT null;