-- T5.2 · Parámetros del re-ranking con IA (los dejó pendientes T0.5). El peso de las reglas es 1 − peso_ia.
INSERT INTO public.configuracion (clave, valor) VALUES
  ('num_candidatos_ia', '15'),   -- mejores por reglas que valora la IA
  ('peso_ia', '0.5')             -- score = (1 − peso_ia)·reglas + peso_ia·IA
ON CONFLICT (clave) DO NOTHING;
