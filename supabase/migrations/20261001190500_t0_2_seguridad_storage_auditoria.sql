-- T0.2 · Seguridad y privacidad
-- Buckets privados, subidas anónimas acotadas y tabla de auditoría.

-- ─────────────────────────────────────────────────────────────
-- 1. fotos-perfil: privado, solo imágenes ≤ 5 MB, lectura solo admin
-- ─────────────────────────────────────────────────────────────
UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/*']
WHERE id = 'fotos-perfil';

DROP POLICY IF EXISTS "Public read fotos-perfil" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload fotos-perfil" ON storage.objects;
DROP POLICY IF EXISTS "Admin lee fotos-perfil" ON storage.objects;
DROP POLICY IF EXISTS "Subida anonima fotos-perfil" ON storage.objects;

CREATE POLICY "Admin lee fotos-perfil"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'fotos-perfil' AND (SELECT public.has_role(auth.uid(), 'admin')));

-- El cuestionario público sube sin sesión a perfiles/<uuid>.<ext>. Solo INSERT: no puede leer ni sobrescribir.
CREATE POLICY "Subida anonima fotos-perfil"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'fotos-perfil' AND (storage.foldername(name))[1] = 'perfiles');

-- "Admins can delete fotos-perfil" se mantiene.

-- foto_url pasa a guardar la ruta dentro del bucket, no la URL pública.
UPDATE public.perfiles
SET foto_url = regexp_replace(foto_url, '^.*/storage/v1/object/public/fotos-perfil/', '')
WHERE foto_url LIKE '%/storage/v1/object/public/fotos-perfil/%';

-- ─────────────────────────────────────────────────────────────
-- 2. antecedentes: subida anónima a user_*/ solo PDF ≤ 10 MB, lectura solo admin
-- ─────────────────────────────────────────────────────────────
UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'antecedentes';

-- Las políticas por auth.uid() no sirven: los clientes no tienen cuenta.
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Subida anonima antecedentes" ON storage.objects;
DROP POLICY IF EXISTS "Admin lee antecedentes" ON storage.objects;

CREATE POLICY "Subida anonima antecedentes"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'antecedentes'
  AND starts_with((storage.foldername(name))[1], 'user_')
  AND storage.extension(name) = 'pdf'
);

CREATE POLICY "Admin lee antecedentes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'antecedentes' AND (SELECT public.has_role(auth.uid(), 'admin')));

-- ─────────────────────────────────────────────────────────────
-- 3. videos-sesiones: privado, solo admin (mp4/mov ≤ 500 MB)
-- ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos-sesiones', 'videos-sesiones', false, 524288000, ARRAY['video/mp4', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admin lee videos-sesiones" ON storage.objects;
DROP POLICY IF EXISTS "Admin sube videos-sesiones" ON storage.objects;
DROP POLICY IF EXISTS "Admin actualiza videos-sesiones" ON storage.objects;
DROP POLICY IF EXISTS "Admin borra videos-sesiones" ON storage.objects;

CREATE POLICY "Admin lee videos-sesiones"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'videos-sesiones' AND (SELECT public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Admin sube videos-sesiones"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos-sesiones' AND (SELECT public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Admin actualiza videos-sesiones"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'videos-sesiones' AND (SELECT public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Admin borra videos-sesiones"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'videos-sesiones' AND (SELECT public.has_role(auth.uid(), 'admin')));

-- ─────────────────────────────────────────────────────────────
-- 4. auditoria: log de acceso a datos sensibles (solo se escribe vía función)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accion text NOT NULL,
  entidad text NOT NULL,
  entidad_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin lee auditoria" ON public.auditoria;
CREATE POLICY "Admin lee auditoria"
ON public.auditoria FOR SELECT
TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'admin')));
-- Sin políticas de INSERT/UPDATE/DELETE: el log solo crece a través de registrar_auditoria.

CREATE OR REPLACE FUNCTION public.registrar_auditoria(_accion text, _entidad text, _entidad_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo una administradora puede registrar auditoría' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id)
  VALUES (auth.uid(), _accion, _entidad, _entidad_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_auditoria(text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_auditoria(text, text, uuid) TO authenticated;
