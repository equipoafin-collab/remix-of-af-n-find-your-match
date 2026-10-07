-- T7.4 · Las automatizaciones de un cliente se reevalúan en cuanto cambia algo que usan sus reglas, sin esperar
-- al job de cada hora (T7.3). evaluar_automatizaciones no toca perfiles, sesiones ni matches: no hay bucles.

CREATE OR REPLACE FUNCTION public.reevaluar_automatizaciones()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'perfiles' THEN
    PERFORM public.evaluar_automatizaciones(NEW.id);
  ELSIF TG_TABLE_NAME = 'sesiones' THEN
    PERFORM public.evaluar_automatizaciones(NEW.perfil_id);
  ELSIF TG_TABLE_NAME = 'matches' THEN
    PERFORM public.evaluar_automatizaciones(NEW.perfil_a);
    PERFORM public.evaluar_automatizaciones(NEW.perfil_b);
  END IF;
  RETURN NEW;
END;
$$;

-- Plan, sesiones contratadas, fechas, estado y último seguimiento (este lo mueven notas, sesiones y feedback).
DROP TRIGGER IF EXISTS perfiles_reevaluar ON public.perfiles;
CREATE TRIGGER perfiles_reevaluar
AFTER UPDATE OF plan, sesiones_contratadas, plan_inicio, plan_fin, estado_cliente, ultimo_seguimiento_at ON public.perfiles
FOR EACH ROW
WHEN (
  OLD.plan IS DISTINCT FROM NEW.plan OR OLD.sesiones_contratadas IS DISTINCT FROM NEW.sesiones_contratadas
  OR OLD.plan_inicio IS DISTINCT FROM NEW.plan_inicio OR OLD.plan_fin IS DISTINCT FROM NEW.plan_fin
  OR OLD.estado_cliente IS DISTINCT FROM NEW.estado_cliente OR OLD.ultimo_seguimiento_at IS DISTINCT FROM NEW.ultimo_seguimiento_at
)
EXECUTE FUNCTION public.reevaluar_automatizaciones();

-- Sesión registrada, marcada (realizada, cancelada…) o con el resumen revisado.
DROP TRIGGER IF EXISTS sesiones_reevaluar ON public.sesiones;
CREATE TRIGGER sesiones_reevaluar
AFTER INSERT OR UPDATE OF estado, resumen_estado ON public.sesiones
FOR EACH ROW EXECUTE FUNCTION public.reevaluar_automatizaciones();

-- Estado del match, informe enviado o feedback. Los triggers AFTER se disparan por orden alfabético: "zz" para ir
-- después de matches_tareas (T6.4), que completa las tareas de las que dependen las alertas de informe y feedback.
DROP TRIGGER IF EXISTS matches_zz_reevaluar ON public.matches;
CREATE TRIGGER matches_zz_reevaluar
AFTER UPDATE OF estado, informe_enviado_at, feedback_a, feedback_b ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.reevaluar_automatizaciones();
