-- T19.2 · Rondas de 4 propuestas: la psicóloga elige 4 personas de las sugerencias de un cliente y se las envía a su
-- área para que diga con quién se ve más (T19.3). Elegir no crea un match: la otra persona no sabe nada.

-- 1. Permiso para aparecer en propuestas a otras personas. Lo marca cada persona (T19.1, con el texto de la asesoría);
--    hasta entonces nadie lo tiene y no se puede enviar ninguna ronda.
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS mostrar_en_propuestas boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mostrar_en_propuestas_at timestamptz;

-- 2. Rondas. Estado: abierta (esperando su respuesta), respondida (T19.3), caducada (7 días sin responder) o
--    cancelada (por la psicóloga). frases: { "<candidato_id>": "por qué te lo proponemos" }.
CREATE TABLE IF NOT EXISTS public.propuestas_rondas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE CASCADE,
  candidatos uuid[] NOT NULL CHECK (cardinality(candidatos) = 4),
  frases jsonb NOT NULL DEFAULT '{}'::jsonb,
  estado text NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'respondida', 'caducada', 'cancelada')),
  elegido_id uuid REFERENCES public.perfiles (id) ON DELETE SET NULL,
  ninguno boolean NOT NULL DEFAULT false,
  motivo text,
  enviada_at timestamptz NOT NULL DEFAULT now(),
  caduca_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  respondida_at timestamptz,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL DEFAULT auth.uid()
);

-- Una abierta por cliente (también frente a dos envíos a la vez).
CREATE UNIQUE INDEX IF NOT EXISTS uq_propuestas_rondas_abierta ON public.propuestas_rondas (perfil_id) WHERE estado = 'abierta';
CREATE INDEX IF NOT EXISTS idx_propuestas_rondas_perfil ON public.propuestas_rondas (perfil_id);

ALTER TABLE public.propuestas_rondas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestiona rondas de propuestas" ON public.propuestas_rondas;
CREATE POLICY "Admin gestiona rondas de propuestas"
ON public.propuestas_rondas FOR ALL
TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'admin')))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')));

-- 3. Al enviar una ronda: 4 personas distintas, activas y con permiso; el cliente con su área abierta y sin otra
--    ronda abierta; frases solo de sus candidatos y cortas (MAX_FRASE en src/lib/propuestas.ts).
CREATE OR REPLACE FUNCTION public.propuestas_rondas_validar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Las abiertas ya caducadas dejan de contar.
  UPDATE public.propuestas_rondas SET estado = 'caducada'
  WHERE perfil_id = NEW.perfil_id AND estado = 'abierta' AND caduca_at <= now();

  IF NOT public.perfil_tiene_area(NEW.perfil_id) THEN
    RAISE EXCEPTION 'El cliente no tiene su área activa: no vería la ronda' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.propuestas_rondas WHERE perfil_id = NEW.perfil_id AND estado = 'abierta') THEN
    RAISE EXCEPTION 'Ya tiene una ronda abierta: cancélala para enviar otra' USING ERRCODE = '23505';
  END IF;
  IF (SELECT count(DISTINCT c) FROM unnest(NEW.candidatos) c) <> 4 OR NEW.perfil_id = ANY (NEW.candidatos) THEN
    RAISE EXCEPTION 'Una ronda lleva 4 personas distintas, y nunca el propio cliente' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM public.perfiles WHERE id = ANY (NEW.candidatos) AND mostrar_en_propuestas AND estado_cliente = 'activo') <> 4 THEN
    RAISE EXCEPTION 'Solo se proponen personas activas que han aceptado aparecer en propuestas' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(NEW.frases) <> 'object' OR EXISTS (
    SELECT 1 FROM jsonb_each(NEW.frases) f
    WHERE f.key <> ALL (NEW.candidatos::text[]) OR jsonb_typeof(f.value) <> 'string' OR length(f.value #>> '{}') > 160
  ) THEN
    RAISE EXCEPTION 'Una frase por candidato, de hasta 160 caracteres' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS propuestas_rondas_validar ON public.propuestas_rondas;
CREATE TRIGGER propuestas_rondas_validar
BEFORE INSERT ON public.propuestas_rondas
FOR EACH ROW EXECUTE FUNCTION public.propuestas_rondas_validar();

-- 4. v_clientes con las columnas nuevas de perfiles (p.* las fija al crear la vista). Misma definición que en T15.1.
DROP VIEW IF EXISTS public.v_clientes;

CREATE VIEW public.v_clientes WITH (security_invoker = true) AS
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
  ) AS sugerencias_pendientes,
  (
    SELECT count(*)::integer FROM public.tareas t
    WHERE t.perfil_id = p.id AND t.estado = 'pendiente'
  ) AS tareas_pendientes,
  (
    SELECT count(*)::integer FROM public.alertas a
    WHERE a.perfil_id = p.id AND a.estado <> 'resuelta'
  ) AS alertas_abiertas,
  (
    SELECT count(*)::integer FROM public.matches m
    WHERE (m.perfil_a = p.id OR m.perfil_b = p.id) AND m.estado <> 'cerrado'
  ) AS matches_abiertos,
  public.perfil_tiene_area(p.id) AS con_area
FROM public.perfiles p
CROSS JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE estado = 'realizada')::integer AS sesiones_realizadas,
    min(fecha_hora) FILTER (WHERE estado = 'programada' AND fecha_hora >= now()) AS proxima_sesion
  FROM public.sesiones
  WHERE perfil_id = p.id
) s;
