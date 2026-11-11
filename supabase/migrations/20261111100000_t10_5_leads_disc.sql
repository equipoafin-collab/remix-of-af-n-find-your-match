-- T10.5 · El test DISC se enlaza solo con la ficha del mismo email, haga antes el test o el cuestionario.
-- Hasta ahora solo se enlazó una vez (T1.2, 02/10/2026): los tests y fichas de después quedaban sueltos.

-- SECURITY DEFINER: el test y el cuestionario llegan anónimos y no pueden leer disc_results ni tocar perfiles.
-- Test nuevo → pasa a ser el de todas las fichas con ese email (el más reciente manda, como en T1.2).
CREATE OR REPLACE FUNCTION public.enlazar_disc_con_fichas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.perfiles SET disc_result_id = NEW.id
  WHERE lower(trim(email)) = lower(trim(NEW.email));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS disc_results_enlazar_fichas ON public.disc_results;
CREATE TRIGGER disc_results_enlazar_fichas
AFTER INSERT ON public.disc_results
FOR EACH ROW EXECUTE FUNCTION public.enlazar_disc_con_fichas();

-- Ficha nueva → su test más reciente con ese email. AFTER y no BEFORE: la RLS del alta pública exige
-- disc_result_id NULL y se comprueba después de los BEFORE.
CREATE OR REPLACE FUNCTION public.enlazar_ficha_con_disc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.perfiles SET disc_result_id = (
    SELECT d.id FROM public.disc_results d
    WHERE lower(trim(d.email)) = lower(trim(NEW.email))
    ORDER BY d.created_at DESC LIMIT 1
  )
  WHERE id = NEW.id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS perfiles_enlazar_disc ON public.perfiles;
CREATE TRIGGER perfiles_enlazar_disc
AFTER INSERT ON public.perfiles
FOR EACH ROW WHEN (NEW.disc_result_id IS NULL AND NEW.email IS NOT NULL)
EXECUTE FUNCTION public.enlazar_ficha_con_disc();

REVOKE EXECUTE ON FUNCTION public.enlazar_disc_con_fichas() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enlazar_ficha_con_disc() FROM PUBLIC, anon, authenticated;

-- Lo que quedó suelto desde T1.2 (la misma consulta: se puede reaplicar, solo rellena los que no tienen).
UPDATE public.perfiles p SET disc_result_id = d.id
FROM (
  SELECT DISTINCT ON (lower(trim(email))) id, lower(trim(email)) AS email
  FROM public.disc_results
  ORDER BY lower(trim(email)), created_at DESC
) d
WHERE p.disc_result_id IS NULL AND lower(trim(p.email)) = d.email;
