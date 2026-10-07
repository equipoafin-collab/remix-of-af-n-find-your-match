-- T4.1 · Sugerencias de match persistidas (las calcula sugerencias-calcular en T4.4) y su caducidad
-- al cambiar de estado el cliente.

DO $$ BEGIN
  CREATE TYPE public.sugerencia_estado AS ENUM ('pendiente', 'aceptada', 'rechazada', 'caducada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Una fila por par cliente → candidato: recalcular actualiza la pendiente, nunca duplica,
-- y una aceptada/rechazada guarda la decisión para siempre (aprendizaje, T5.3).
CREATE TABLE IF NOT EXISTS public.match_sugerencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE CASCADE,     -- cliente
  candidato_id uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),                      -- final (reglas, o reglas + IA desde T5.2)
  score_reglas integer NOT NULL CHECK (score_reglas BETWEEN 0 AND 100),
  score_ia integer CHECK (score_ia BETWEEN 0 AND 100),                          -- null = solo reglas
  desglose jsonb NOT NULL DEFAULT '{}',                                         -- puntuación por dimensión
  motivos text[] NOT NULL DEFAULT '{}',
  riesgos text[] NOT NULL DEFAULT '{}',
  estado public.sugerencia_estado NOT NULL DEFAULT 'pendiente',
  motivo_decision text,
  decidido_at timestamptz,
  version_algoritmo text NOT NULL,
  calculado_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (perfil_id, candidato_id),
  CHECK (perfil_id <> candidato_id)
);

CREATE INDEX IF NOT EXISTS idx_match_sugerencias_perfil_estado ON public.match_sugerencias (perfil_id, estado);
CREATE INDEX IF NOT EXISTS idx_match_sugerencias_candidato ON public.match_sugerencias (candidato_id);

ALTER TABLE public.match_sugerencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestiona sugerencias" ON public.match_sugerencias;
CREATE POLICY "Admin gestiona sugerencias"
ON public.match_sugerencias FOR ALL
TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'admin')))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')));

-- Amplía la vista de T1.3 con una columna al final (perfiles no ha cambiado de columnas desde entonces).
CREATE OR REPLACE VIEW public.v_clientes WITH (security_invoker = true) AS
SELECT
  p.*,
  s.sesiones_realizadas,
  GREATEST(p.sesiones_contratadas - s.sesiones_realizadas, 0)::integer AS sesiones_pendientes,
  s.proxima_cita,
  (
    SELECT count(*)::integer FROM public.match_sugerencias m
    WHERE m.perfil_id = p.id AND m.estado = 'pendiente'
  ) AS sugerencias_pendientes
FROM public.perfiles p
CROSS JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE estado = 'realizada')::integer AS sesiones_realizadas,
    min(fecha_hora) FILTER (WHERE estado = 'programada' AND fecha_hora >= now()) AS proxima_cita
  FROM public.sesiones
  WHERE perfil_id = p.id
) s;

-- Amplía T1.5/T2.2: los cambios de estado caducan sugerencias pendientes (las decididas se conservan).
CREATE OR REPLACE FUNCTION public.cambiar_estado_cliente(
  _perfil_id uuid,
  _nuevo_estado public.estado_cliente,
  _motivo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER   -- auditoria no admite INSERT directo; la comprobación de admin va dentro
SET search_path = ''
AS $$
DECLARE
  _anterior public.estado_cliente;
  _motivo_limpio text := nullif(trim(_motivo), '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo una administradora puede cambiar el estado de un cliente' USING ERRCODE = '42501';
  END IF;

  SELECT estado_cliente INTO _anterior FROM public.perfiles WHERE id = _perfil_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe el perfil %', _perfil_id USING ERRCODE = 'P0002';
  END IF;
  IF _anterior = _nuevo_estado THEN
    RETURN;
  END IF;

  UPDATE public.perfiles SET estado_cliente = _nuevo_estado WHERE id = _perfil_id;  -- el trigger sella estado_cambiado_at

  -- Pausado/Finalizado: deja de proponerse como candidato, pero conserva sus propias sugerencias.
  -- Baja: sale del matching en los dos sentidos. Reactivar no resucita nada: se recalcula (T4.4).
  IF _nuevo_estado <> 'activo' THEN
    UPDATE public.match_sugerencias SET estado = 'caducada'
    WHERE estado = 'pendiente'
      AND (candidato_id = _perfil_id OR (_nuevo_estado = 'baja' AND perfil_id = _perfil_id));
  END IF;

  -- AMPLIAR EN T6.2: baja → cancelar sus tareas pendientes (pausado/finalizado las conservan).
  -- AMPLIAR EN T7.1: baja → resolver sus alertas abiertas.

  INSERT INTO public.notas_privadas (perfil_id, contenido, automatica)
  VALUES (
    _perfil_id,
    format('Cambio de estado: %s → %s.', _anterior, _nuevo_estado) || coalesce(' Motivo: ' || _motivo_limpio, ''),
    true
  );

  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id, detalle)
  VALUES (
    auth.uid(), 'cambiar_estado', 'perfiles', _perfil_id,
    jsonb_build_object('de', _anterior, 'a', _nuevo_estado, 'motivo', _motivo_limpio)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cambiar_estado_cliente(uuid, public.estado_cliente, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_cliente(uuid, public.estado_cliente, text) TO authenticated;
