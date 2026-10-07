-- T6.1 · Matches (presentación y cita entre dos perfiles). Se crean al aceptar una sugerencia.

DO $$ BEGIN
  CREATE TYPE public.match_estado AS ENUM (
    'propuesto', 'informe_enviado', 'cita_agendada', 'cita_realizada', 'feedback_registrado', 'continuan', 'cerrado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_a uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE CASCADE,   -- el cliente que aceptó la sugerencia
  perfil_b uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE CASCADE,   -- el candidato
  sugerencia_id uuid REFERENCES public.match_sugerencias (id) ON DELETE SET NULL,
  estado public.match_estado NOT NULL DEFAULT 'propuesto',
  fecha_cita timestamptz,
  lugar text,
  informe jsonb,                      -- informe de compatibilidad (T6.3)
  informe_enviado_at timestamptz,
  feedback_a text,                    -- T6.5
  feedback_b text,
  valoracion_a integer CHECK (valoracion_a BETWEEN 1 AND 5),
  valoracion_b integer CHECK (valoracion_b BETWEEN 1 AND 5),
  feedback_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (perfil_a <> perfil_b)
);

-- Un solo match por pareja, en cualquier orden: si B acepta después a A, se reutiliza el de A con B.
CREATE UNIQUE INDEX IF NOT EXISTS uq_matches_pareja
ON public.matches (LEAST(perfil_a, perfil_b), GREATEST(perfil_a, perfil_b));
CREATE INDEX IF NOT EXISTS idx_matches_perfil_b ON public.matches (perfil_b);
CREATE INDEX IF NOT EXISTS idx_matches_cita ON public.matches (fecha_cita) WHERE estado = 'cita_agendada';

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestiona matches" ON public.matches;
CREATE POLICY "Admin gestiona matches"
ON public.matches FOR ALL
TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'admin')))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')));

-- Aceptar una sugerencia crea el match (o reutiliza el de la pareja). En la BD y no en la UI para que sirva
-- también desde la vista global de sugerencias (T9.1).
CREATE OR REPLACE FUNCTION public.sugerencia_crear_match()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.matches (perfil_a, perfil_b, sugerencia_id)
  VALUES (NEW.perfil_id, NEW.candidato_id, NEW.id)
  ON CONFLICT ((LEAST(perfil_a, perfil_b)), (GREATEST(perfil_a, perfil_b))) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sugerencias_crear_match ON public.match_sugerencias;
CREATE TRIGGER sugerencias_crear_match
AFTER UPDATE OF estado ON public.match_sugerencias
FOR EACH ROW WHEN (NEW.estado = 'aceptada' AND OLD.estado IS DISTINCT FROM 'aceptada')
EXECUTE FUNCTION public.sugerencia_crear_match();

-- Las aceptadas antes de esta migración también tienen su match.
INSERT INTO public.matches (perfil_a, perfil_b, sugerencia_id, created_at)
SELECT perfil_id, candidato_id, id, coalesce(decidido_at, now())
FROM public.match_sugerencias
WHERE estado = 'aceptada'
ON CONFLICT ((LEAST(perfil_a, perfil_b)), (GREATEST(perfil_a, perfil_b))) DO NOTHING;

-- Amplía v_clientes (T1.3/T4.1): la próxima cita es la sesión programada o la cita de match más cercana,
-- para los dos miembros de la pareja. Mismas columnas y orden: solo cambia cómo se calcula proxima_cita.
CREATE OR REPLACE VIEW public.v_clientes WITH (security_invoker = true) AS
SELECT
  p.*,
  s.sesiones_realizadas,
  GREATEST(p.sesiones_contratadas - s.sesiones_realizadas, 0)::integer AS sesiones_pendientes,
  LEAST(
    s.proxima_sesion,
    (
      SELECT min(m.fecha_cita) FROM public.matches m
      WHERE (m.perfil_a = p.id OR m.perfil_b = p.id) AND m.estado = 'cita_agendada' AND m.fecha_cita >= now()
    )
  ) AS proxima_cita,
  (
    SELECT count(*)::integer FROM public.match_sugerencias m
    WHERE m.perfil_id = p.id AND m.estado = 'pendiente'
  ) AS sugerencias_pendientes
FROM public.perfiles p
CROSS JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE estado = 'realizada')::integer AS sesiones_realizadas,
    min(fecha_hora) FILTER (WHERE estado = 'programada' AND fecha_hora >= now()) AS proxima_sesion
  FROM public.sesiones
  WHERE perfil_id = p.id
) s;
