-- T1.3 · Tabla sesiones (solo esquema, se usa desde T3.1) y vista v_clientes con contadores de sesiones.

DO $$ BEGIN
  CREATE TYPE public.sesion_tipo AS ENUM ('primera', 'seguimiento');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sesion_estado AS ENUM ('programada', 'realizada', 'cancelada', 'no_asistio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.resumen_estado AS ENUM ('sin_generar', 'borrador', 'revisado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Datos de salud (RGPD art. 9): solo admin. Se borran con el perfil (derecho de supresión, T9.3);
-- la Baja no borra nada.
CREATE TABLE IF NOT EXISTS public.sesiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE CASCADE,
  fecha_hora timestamptz NOT NULL,
  duracion_min integer NOT NULL DEFAULT 60 CHECK (duracion_min > 0),
  tipo public.sesion_tipo NOT NULL DEFAULT 'seguimiento',
  estado public.sesion_estado NOT NULL DEFAULT 'programada',
  video_path text,                -- ruta en el bucket videos-sesiones
  notas_brutas text,              -- notas o transcripción que pega la psicóloga
  resumen_ia jsonb,               -- { estado_emocional, temas_tratados[], avances[], objetivos[], proximos_pasos[], preferencias_detectadas[] }
  resumen_estado public.resumen_estado NOT NULL DEFAULT 'sin_generar',
  resumen_revisado_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sesiones_perfil_fecha ON public.sesiones (perfil_id, fecha_hora);

ALTER TABLE public.sesiones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestiona sesiones" ON public.sesiones;
CREATE POLICY "Admin gestiona sesiones"
ON public.sesiones FOR ALL
TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'admin')))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')));

-- security_invoker: la vista aplica la RLS de perfiles y sesiones de quien consulta.
-- p.* se fija al crear la vista: si perfiles gana o pierde columnas hay que recrearla (DROP + CREATE).
-- AMPLIAR: proxima_cita con las citas de matches (T6.1); tareas_pendientes (T6.2),
-- alertas_abiertas (T7.1) y sugerencias_pendientes (T4.1) se añaden al final.
CREATE OR REPLACE VIEW public.v_clientes WITH (security_invoker = true) AS
SELECT
  p.*,
  s.sesiones_realizadas,
  GREATEST(p.sesiones_contratadas - s.sesiones_realizadas, 0)::integer AS sesiones_pendientes,
  s.proxima_cita
FROM public.perfiles p
CROSS JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE estado = 'realizada')::integer AS sesiones_realizadas,
    min(fecha_hora) FILTER (WHERE estado = 'programada' AND fecha_hora >= now()) AS proxima_cita
  FROM public.sesiones
  WHERE perfil_id = p.id
) s;
