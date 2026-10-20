-- T11.1 · Pagos con Stripe: el enlace de pago de la ficha crea un pago pendiente que el aviso de Stripe marca como
-- pagado (T11.2-T11.3). Los pagos manuales de siempre son origen 'manual' y estado 'pagado'.

DO $$ BEGIN
  CREATE TYPE public.pago_origen AS ENUM ('manual', 'stripe');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pago_estado AS ENUM ('pendiente', 'pagado', 'caducado', 'reembolsado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS origen public.pago_origen NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS estado public.pago_estado NOT NULL DEFAULT 'pagado',
  ADD COLUMN IF NOT EXISTS meses integer CHECK (meses BETWEEN 1 AND 24),
  ADD COLUMN IF NOT EXISTS stripe_checkout_id text UNIQUE,   -- un pago por sesión de Stripe aunque el aviso llegue dos veces
  ADD COLUMN IF NOT EXISTS stripe_payment_intent text,
  ADD COLUMN IF NOT EXISTS enlace_pago text,
  ADD COLUMN IF NOT EXISTS caduca_at timestamptz,
  ADD COLUMN IF NOT EXISTS pagado_at timestamptz;

-- Un pago pendiente (o caducado, o reembolsado) no da plan: el trigger de T1.2 solo copia el plan de los pagados.
CREATE OR REPLACE FUNCTION public.pagos_copiar_plan_a_perfil()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.estado = 'pagado' THEN
    UPDATE public.perfiles SET plan = NEW.plan WHERE id = NEW.perfil_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pagos_copiar_plan ON public.pagos;
CREATE TRIGGER pagos_copiar_plan
AFTER INSERT OR UPDATE OF plan, perfil_id, estado ON public.pagos
FOR EACH ROW EXECUTE FUNCTION public.pagos_copiar_plan_a_perfil();

CREATE INDEX IF NOT EXISTS idx_pagos_pendientes ON public.pagos (perfil_id) WHERE estado = 'pendiente';

-- Precio al mes de cada plan, en euros con IVA incluido (los de la web; provisionales), y meses por defecto del enlace.
INSERT INTO public.configuracion (clave, valor) VALUES
  ('precio_plan', '{"esencial": 160, "premium": 250}'),
  ('meses_plan', '3')
ON CONFLICT (clave) DO NOTHING;
