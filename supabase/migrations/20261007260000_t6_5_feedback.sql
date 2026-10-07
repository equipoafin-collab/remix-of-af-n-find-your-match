-- T6.5 · Feedback de cada lado tras la cita (texto, valoración 1-5 y si quiere volver a verse).

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS quiere_repetir_a boolean,   -- null = no lo dijo
  ADD COLUMN IF NOT EXISTS quiere_repetir_b boolean;

-- Registrar el feedback de un cliente cuenta como seguimiento suyo (como una nota o una sesión).
CREATE OR REPLACE FUNCTION public.matches_feedback_seguimiento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF nullif(trim(NEW.feedback_a), '') IS NOT NULL AND NEW.feedback_a IS DISTINCT FROM OLD.feedback_a THEN
    UPDATE public.perfiles SET ultimo_seguimiento_at = now() WHERE id = NEW.perfil_a;
  END IF;
  IF nullif(trim(NEW.feedback_b), '') IS NOT NULL AND NEW.feedback_b IS DISTINCT FROM OLD.feedback_b THEN
    UPDATE public.perfiles SET ultimo_seguimiento_at = now() WHERE id = NEW.perfil_b;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_feedback ON public.matches;
CREATE TRIGGER matches_feedback
AFTER UPDATE OF feedback_a, feedback_b ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.matches_feedback_seguimiento();
