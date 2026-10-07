-- T6.4 · Tareas automáticas de los matches: informe para los lados Premium y feedback tras la cita.
-- Idempotente por tareas.clave_unica: el mismo evento nunca crea dos tareas.

CREATE OR REPLACE FUNCTION public.matches_tareas_automaticas()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _lado uuid;
  _otro uuid;
  _plan public.plan_tipo;
  _nombre text;
  _nombre_otro text;
  _dias integer := coalesce((SELECT (valor #>> '{}')::integer FROM public.configuracion WHERE clave = 'dias_feedback'), 3);
BEGIN
  FOR _lado, _otro IN SELECT * FROM (VALUES (NEW.perfil_a, NEW.perfil_b), (NEW.perfil_b, NEW.perfil_a)) AS lados LOOP
    SELECT plan, nombre_completo INTO _plan, _nombre FROM public.perfiles WHERE id = _lado;
    SELECT nombre_completo INTO _nombre_otro FROM public.perfiles WHERE id = _otro;

    -- Match nuevo: el plan Premium incluye un informe de compatibilidad antes de presentarlos.
    IF TG_OP = 'INSERT' AND _plan = 'premium' THEN
      INSERT INTO public.tareas (perfil_id, match_id, tipo, origen, titulo, clave_unica)
      VALUES (_lado, NEW.id, 'enviar_informe', 'auto',
              format('Enviar informe de compatibilidad a %s sobre %s', _nombre, _nombre_otro),
              format('informe:%s:%s', NEW.id, _lado))
      ON CONFLICT (clave_unica) DO NOTHING;
    END IF;

    -- Cita realizada: feedback de cada lado con plan (Premium y Esencial; los leads no).
    IF TG_OP = 'UPDATE' AND NEW.estado = 'cita_realizada' AND OLD.estado IS DISTINCT FROM 'cita_realizada' AND _plan IS NOT NULL THEN
      INSERT INTO public.tareas (perfil_id, match_id, tipo, origen, titulo, vence_at, clave_unica)
      VALUES (_lado, NEW.id, 'registrar_feedback', 'auto',
              format('Registrar el feedback de %s tras la cita con %s', _nombre, _nombre_otro),
              coalesce(NEW.fecha_cita, now()) + make_interval(days => _dias),
              format('feedback:%s:%s', NEW.id, _lado))
      ON CONFLICT (clave_unica) DO NOTHING;
    END IF;
  END LOOP;

  IF TG_OP = 'UPDATE' THEN
    -- El informe es uno por pareja: enviarlo completa las tareas de informe de los dos lados.
    IF NEW.informe_enviado_at IS NOT NULL AND OLD.informe_enviado_at IS NULL THEN
      UPDATE public.tareas SET estado = 'completada'
      WHERE match_id = NEW.id AND tipo = 'enviar_informe' AND estado = 'pendiente';
    END IF;

    -- Feedback: cada lado al registrar su texto (T6.5), o todos al pasar a feedback_registrado / continúan.
    UPDATE public.tareas SET estado = 'completada'
    WHERE match_id = NEW.id AND tipo = 'registrar_feedback' AND estado = 'pendiente'
      AND (
        NEW.estado IN ('feedback_registrado', 'continuan')
        OR (perfil_id = NEW.perfil_a AND nullif(trim(NEW.feedback_a), '') IS NOT NULL)
        OR (perfil_id = NEW.perfil_b AND nullif(trim(NEW.feedback_b), '') IS NOT NULL)
      );

    -- Cerrado: lo automático que quedaba pendiente ya no aplica (las manuales las decide la psicóloga).
    IF NEW.estado = 'cerrado' AND OLD.estado IS DISTINCT FROM 'cerrado' THEN
      UPDATE public.tareas SET estado = 'cancelada' WHERE match_id = NEW.id AND estado = 'pendiente' AND origen = 'auto';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_tareas ON public.matches;
CREATE TRIGGER matches_tareas
AFTER INSERT OR UPDATE OF estado, informe_enviado_at, feedback_a, feedback_b ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.matches_tareas_automaticas();
