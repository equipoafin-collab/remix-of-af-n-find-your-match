-- T6.2 · Tareas de la psicóloga (manuales y, desde T6.4/T7.2, automáticas). Visibles hasta completarse o cancelarse.

DO $$ BEGIN
  CREATE TYPE public.tarea_tipo AS ENUM (
    'enviar_informe', 'registrar_feedback', 'revisar_resumen', 'seguimiento', 'renovacion_plan', 'manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tarea_estado AS ENUM ('pendiente', 'completada', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tarea_origen AS ENUM ('auto', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.tareas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.matches (id) ON DELETE SET NULL,
  tipo public.tarea_tipo NOT NULL DEFAULT 'manual',
  titulo text NOT NULL CHECK (length(trim(titulo)) > 0),
  descripcion text,
  estado public.tarea_estado NOT NULL DEFAULT 'pendiente',
  vence_at timestamptz,
  origen public.tarea_origen NOT NULL DEFAULT 'manual',
  clave_unica text UNIQUE,              -- las automáticas no se duplican (p. ej. 'informe:<match>:<perfil>')
  completada_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tareas_perfil_estado ON public.tareas (perfil_id, estado);
CREATE INDEX IF NOT EXISTS idx_tareas_pendientes_vence ON public.tareas (vence_at) WHERE estado = 'pendiente';

ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestiona tareas" ON public.tareas;
CREATE POLICY "Admin gestiona tareas"
ON public.tareas FOR ALL
TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'admin')))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')));

-- completada_at sigue al estado, la complete la psicóloga o una automatización (T6.4).
CREATE OR REPLACE FUNCTION public.tareas_sellar_completada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.completada_at := CASE WHEN NEW.estado = 'completada' THEN coalesce(NEW.completada_at, now()) END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tareas_completada ON public.tareas;
CREATE TRIGGER tareas_completada
BEFORE INSERT OR UPDATE OF estado ON public.tareas
FOR EACH ROW EXECUTE FUNCTION public.tareas_sellar_completada();

-- Amplía v_clientes (T6.1) con tareas_pendientes al final.
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
  ) AS tareas_pendientes
FROM public.perfiles p
CROSS JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE estado = 'realizada')::integer AS sesiones_realizadas,
    min(fecha_hora) FILTER (WHERE estado = 'programada' AND fecha_hora >= now()) AS proxima_sesion
  FROM public.sesiones
  WHERE perfil_id = p.id
) s;

-- Amplía T1.5/T2.2/T4.1: la Baja cancela además las tareas pendientes (Pausado/Finalizado las conservan).
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

  IF _nuevo_estado = 'baja' THEN
    UPDATE public.tareas SET estado = 'cancelada' WHERE perfil_id = _perfil_id AND estado = 'pendiente';
  END IF;

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
