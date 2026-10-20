-- T13.3 · Enlaces personales para subir documentos (certificado de antecedentes). La administradora crea el enlace
-- desde la ficha; la Edge Function subir-documento lo valida y da una URL firmada de subida a
-- antecedentes/<perfil_id>/. El token es aleatorio (2 × 122 bits) y caduca a los 7 días.

CREATE TABLE IF NOT EXISTS public.enlaces_subida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  caduca_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enlaces_subida_perfil ON public.enlaces_subida (perfil_id);

ALTER TABLE public.enlaces_subida ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestiona enlaces de subida" ON public.enlaces_subida;
CREATE POLICY "Admin gestiona enlaces de subida"
ON public.enlaces_subida FOR ALL
TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'admin')))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')));
