-- T1.1 · Estados de cliente y plan en perfiles (sección 3.1 del plan).
-- estado_perfil se mantiene (deprecado) hasta T9.5.

DO $$ BEGIN
  CREATE TYPE public.estado_cliente AS ENUM ('activo', 'pausado', 'baja', 'finalizado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.plan_tipo AS ENUM ('esencial', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Columnas que se rellenan desde estado_perfil: solo la primera vez, para que reaplicar
-- la migración no pise los estados que se hayan cambiado después.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'perfiles' AND column_name = 'estado_cliente'
  ) THEN
    ALTER TABLE public.perfiles
      ADD COLUMN estado_cliente public.estado_cliente NOT NULL DEFAULT 'activo',
      ADD COLUMN revisado boolean NOT NULL DEFAULT false,   -- sustituye al antiguo estado "pendiente"
      ADD COLUMN estado_cambiado_at timestamptz NOT NULL DEFAULT now();

    UPDATE public.perfiles SET
      estado_cliente = CASE estado_perfil
        WHEN 'pausado' THEN 'pausado'::public.estado_cliente
        WHEN 'rechazado' THEN 'baja'::public.estado_cliente
        ELSE 'activo'::public.estado_cliente
      END,
      revisado = estado_perfil IS DISTINCT FROM 'pendiente',
      estado_cambiado_at = created_at;
  END IF;
END $$;

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS plan public.plan_tipo,               -- NULL = lead
  ADD COLUMN IF NOT EXISTS plan_inicio date,
  ADD COLUMN IF NOT EXISTS plan_fin date,
  ADD COLUMN IF NOT EXISTS sesiones_contratadas integer NOT NULL DEFAULT 0 CHECK (sesiones_contratadas >= 0),
  ADD COLUMN IF NOT EXISTS disc_result_id uuid REFERENCES public.disc_results (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS video_presentacion_path text,        -- ruta en el bucket videos-sesiones
  ADD COLUMN IF NOT EXISTS zona text,
  ADD COLUMN IF NOT EXISTS acepta_otras_zonas boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valores_importantes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ultimo_seguimiento_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_perfiles_estado_cliente ON public.perfiles (estado_cliente);
CREATE INDEX IF NOT EXISTS idx_perfiles_disc_result_id ON public.perfiles (disc_result_id);

CREATE OR REPLACE FUNCTION public.perfiles_marcar_estado_cambiado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.estado_cliente IS DISTINCT FROM OLD.estado_cliente THEN
    NEW.estado_cambiado_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS perfiles_estado_cambiado ON public.perfiles;
CREATE TRIGGER perfiles_estado_cambiado
BEFORE UPDATE ON public.perfiles
FOR EACH ROW EXECUTE FUNCTION public.perfiles_marcar_estado_cambiado();

-- El formulario público inserta sin sesión: no puede fijar plan, sesiones ni campos del CRM.
DROP POLICY IF EXISTS "Anyone can submit a profile" ON public.perfiles;
CREATE POLICY "Anyone can submit a profile" ON public.perfiles
FOR INSERT
WITH CHECK (
  (SELECT public.has_role(auth.uid(), 'admin'))
  OR (
    estado_cliente = 'activo'
    AND revisado = false
    AND plan IS NULL
    AND plan_inicio IS NULL
    AND plan_fin IS NULL
    AND sesiones_contratadas = 0
    AND disc_result_id IS NULL
    AND video_presentacion_path IS NULL
    AND ultimo_seguimiento_at IS NULL
  )
);
