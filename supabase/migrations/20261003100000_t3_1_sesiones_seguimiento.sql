-- T3.1 · Reglas de las sesiones: una sola "primera" por cliente y la sesión realizada cuenta como seguimiento.

-- Una cancelada no cuenta: se puede volver a programar la primera sesión.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sesiones_una_primera
ON public.sesiones (perfil_id)
WHERE tipo = 'primera' AND estado <> 'cancelada';

-- Al marcar (o registrar) una sesión como realizada, ultimo_seguimiento_at pasa a su fecha.
-- LEAST con now(): una sesión con fecha futura marcada por error no adelanta el seguimiento;
-- GREATEST: registrar una sesión antigua no hace retroceder el último seguimiento.
CREATE OR REPLACE FUNCTION public.sesiones_marcar_seguimiento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.perfiles
  SET ultimo_seguimiento_at = GREATEST(coalesce(ultimo_seguimiento_at, '-infinity'), LEAST(NEW.fecha_hora, now()))
  WHERE id = NEW.perfil_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sesiones_seguimiento ON public.sesiones;
CREATE TRIGGER sesiones_seguimiento
AFTER INSERT OR UPDATE OF estado ON public.sesiones
FOR EACH ROW WHEN (NEW.estado = 'realizada')
EXECUTE FUNCTION public.sesiones_marcar_seguimiento();
