-- T1.2 · paid_users → pagos vinculado a perfiles; plan del pago copiado al perfil; DISC vinculado por email.

DO $$
BEGIN
  IF to_regclass('public.pagos') IS NULL THEN
    ALTER TABLE public.paid_users RENAME TO pagos;   -- las políticas RLS se conservan
  END IF;
END $$;

-- Solo la primera vez: columnas nuevas y relleno desde email, para que reaplicar
-- la migración no pise el plan que se haya cambiado después en la ficha.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pagos' AND column_name = 'perfil_id'
  ) THEN
    ALTER TABLE public.pagos
      DROP CONSTRAINT IF EXISTS paid_users_plan_check,   -- el enum ya restringe los valores
      ALTER COLUMN plan TYPE public.plan_tipo USING plan::public.plan_tipo,
      ADD COLUMN perfil_id uuid REFERENCES public.perfiles (id),
      ADD COLUMN importe numeric(10, 2) CHECK (importe >= 0),
      ADD COLUMN fecha date NOT NULL DEFAULT current_date;

    -- Si un email tiene varios perfiles (cuestionario repetido), se toma el más reciente.
    UPDATE public.pagos pg SET
      fecha = pg.created_at::date,
      perfil_id = (
        SELECT p.id FROM public.perfiles p
        WHERE lower(trim(p.email)) = lower(trim(pg.email))
        ORDER BY p.created_at DESC LIMIT 1
      );

    UPDATE public.perfiles p SET plan = ultimo.plan
    FROM (
      SELECT DISTINCT ON (perfil_id) perfil_id, plan
      FROM public.pagos WHERE perfil_id IS NOT NULL
      ORDER BY perfil_id, fecha DESC, created_at DESC
    ) ultimo
    WHERE p.id = ultimo.perfil_id;

    -- Pagos nuevos siempre con perfil; los antiguos sin casar se vinculan a mano (NOT VALID).
    ALTER TABLE public.pagos ADD CONSTRAINT pagos_perfil_obligatorio CHECK (perfil_id IS NOT NULL) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pagos_perfil_id ON public.pagos (perfil_id);

-- Crear o editar un pago fija el plan del perfil.
CREATE OR REPLACE FUNCTION public.pagos_copiar_plan_a_perfil()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.perfiles SET plan = NEW.plan WHERE id = NEW.perfil_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pagos_copiar_plan ON public.pagos;
CREATE TRIGGER pagos_copiar_plan
AFTER INSERT OR UPDATE OF plan, perfil_id ON public.pagos
FOR EACH ROW EXECUTE FUNCTION public.pagos_copiar_plan_a_perfil();

-- Vista de compatibilidad para el admin publicado mientras siga leyendo paid_users. Se borra en T9.5.
CREATE OR REPLACE VIEW public.paid_users WITH (security_invoker = true) AS
SELECT id, nombre_completo, email, telefono, plan, notas, created_at FROM public.pagos;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paid_users TO authenticated;

-- DISC: se puede reaplicar, solo rellena los que aún no tienen.
UPDATE public.perfiles p SET disc_result_id = d.id
FROM (
  SELECT DISTINCT ON (lower(trim(email))) id, lower(trim(email)) AS email
  FROM public.disc_results
  ORDER BY lower(trim(email)), created_at DESC
) d
WHERE p.disc_result_id IS NULL AND lower(trim(p.email)) = d.email;

-- Informe para revisión manual: pagos que no casan con ningún perfil por email.
SELECT id, nombre_completo, email, plan, created_at
FROM public.pagos
WHERE perfil_id IS NULL
ORDER BY created_at;
