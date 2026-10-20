-- T18.1 · Presentar un match en el área de los dos clientes. Hasta que la psicóloga lo presenta (presentado_at), el
-- match no existe para ellos: "propuesto" es interno. Los motivos que leerán los escribe o revisa ella a partir de los
-- de la sugerencia (nunca los riesgos). Lo verán los dos, así que nada de salud, religión, política ni contacto.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS presentado_at timestamptz,
  ADD COLUMN IF NOT EXISTS motivos_cliente text[] NOT NULL DEFAULT '{}';

-- Como mucho 5 motivos (MAX_MOTIVOS_CLIENTE en src/lib/matches.ts).
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_motivos_cliente_max;
ALTER TABLE public.matches ADD CONSTRAINT matches_motivos_cliente_max CHECK (cardinality(motivos_cliente) <= 5);
