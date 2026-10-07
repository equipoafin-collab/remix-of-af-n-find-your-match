-- T7.1 · Alertas para la psicóloga. Las crean las automatizaciones (T5.4, T7.2) con clave_unica para no repetirlas.

DO $$ BEGIN
  CREATE TYPE public.alerta_tipo AS ENUM (
    'informe_pendiente', 'feedback_pendiente', 'pocas_sesiones', 'plan_terminado', 'nuevo_compatible', 'sin_seguimiento', 'otra'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.alerta_severidad AS ENUM ('info', 'aviso', 'urgente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- abierta = sin ver; vista = vista pero sin resolver; resuelta = ya no aplica o se atendió.
DO $$ BEGIN
  CREATE TYPE public.alerta_estado AS ENUM ('abierta', 'vista', 'resuelta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid REFERENCES public.perfiles (id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.matches (id) ON DELETE CASCADE,
  tipo public.alerta_tipo NOT NULL DEFAULT 'otra',
  severidad public.alerta_severidad NOT NULL DEFAULT 'info',
  mensaje text NOT NULL CHECK (length(trim(mensaje)) > 0),
  estado public.alerta_estado NOT NULL DEFAULT 'abierta',
  clave_unica text UNIQUE,              -- p. ej. 'compatible:<cliente>:<perfil>' o 'pocas_sesiones:<perfil>'
  created_at timestamptz NOT NULL DEFAULT now(),
  resuelta_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_alertas_perfil_estado ON public.alertas (perfil_id, estado);
CREATE INDEX IF NOT EXISTS idx_alertas_sin_resolver ON public.alertas (created_at DESC) WHERE estado <> 'resuelta';

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestiona alertas" ON public.alertas;
CREATE POLICY "Admin gestiona alertas"
ON public.alertas FOR ALL
TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'admin')))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')));

-- resuelta_at sigue al estado, la resuelva la psicóloga o una automatización.
CREATE OR REPLACE FUNCTION public.alertas_sellar_resuelta()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.resuelta_at := CASE WHEN NEW.estado = 'resuelta' THEN coalesce(NEW.resuelta_at, now()) END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS alertas_resuelta ON public.alertas;
CREATE TRIGGER alertas_resuelta
BEFORE INSERT OR UPDATE OF estado ON public.alertas
FOR EACH ROW EXECUTE FUNCTION public.alertas_sellar_resuelta();

-- Amplía v_clientes (T6.2) con alertas_abiertas (las no resueltas: abiertas o vistas) al final.
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
  ) AS sugerencias_pendientes,
  (
    SELECT count(*)::integer FROM public.tareas t
    WHERE t.perfil_id = p.id AND t.estado = 'pendiente'
  ) AS tareas_pendientes,
  (
    SELECT count(*)::integer FROM public.alertas a
    WHERE a.perfil_id = p.id AND a.estado <> 'resuelta'
  ) AS alertas_abiertas
FROM public.perfiles p
CROSS JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE estado = 'realizada')::integer AS sesiones_realizadas,
    min(fecha_hora) FILTER (WHERE estado = 'programada' AND fecha_hora >= now()) AS proxima_sesion
  FROM public.sesiones
  WHERE perfil_id = p.id
) s;

-- Amplía T1.5/T2.2/T4.1/T6.2: la Baja resuelve además sus alertas. Con esto la función queda completa.
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

  -- Baja: se cancelan sus tareas y se resuelven sus alertas (Pausado/Finalizado las conservan).
  IF _nuevo_estado = 'baja' THEN
    UPDATE public.tareas SET estado = 'cancelada' WHERE perfil_id = _perfil_id AND estado = 'pendiente';
    UPDATE public.alertas SET estado = 'resuelta' WHERE perfil_id = _perfil_id AND estado <> 'resuelta';
  END IF;

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
