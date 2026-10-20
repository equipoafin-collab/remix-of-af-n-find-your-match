-- T16.1 · El cliente ve su perfil en su área: sus respuestas del cuestionario y su foto. Nada del CRM (estado,
-- revisado, notas, aprendizaje, vídeo) ni nada si su área está cerrada (plan vencido, finalizado o baja).

-- Sus respuestas: solo estas columnas (las mismas que CAMPOS_MI_PERFIL en src/lib/cuestionario.ts; lo comprueba un
-- test). Una columna nueva de perfiles no aparece aquí hasta que se añada a propósito.
CREATE OR REPLACE FUNCTION public.mi_perfil()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    SELECT jsonb_object_agg(e.key, e.value)
    FROM jsonb_each(to_jsonb(p)) e
    WHERE e.key = ANY (ARRAY[
      'nombre_completo', 'email', 'telefono', 'edad', 'ciudad', 'zona', 'acepta_otras_zonas', 'estatura', 'peso', 'genero',
      'foto_url', 'tipo_relacion', 'busca_genero', 'hijos', 'tabaco', 'edad_min_busca', 'edad_max_busca', 'importa_vestir',
      'estilo_vestir', 'estilo_vestir_pareja', 'importa_politica', 'politica_pareja', 'tiene_tatuajes', 'tatuajes_pareja',
      'religion', 'importa_religion', 'religion_pareja', 'ideologia', 'alcohol', 'desea_casarse', 'valores_importantes',
      'deseo_familia', 'ambicion_profesional', 'nivel_social', 'estilo_vida_activo', 'necesidad_independencia', 'conflicto',
      'sentirse_querido', 'relacion_sana', 'fin_de_semana', 'hobbies', 'aprendizaje_ultima_relacion', 'vida_en_10_anios',
      'disc_respuestas'
    ])
  )
  FROM public.perfiles p
  WHERE p.user_id = auth.uid() AND public.perfil_tiene_area(p.id);
$$;

REVOKE EXECUTE ON FUNCTION public.mi_perfil() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mi_perfil() TO authenticated;

-- ¿Puede ver esta foto de fotos-perfil? Por ahora, solo la suya y con el área abierta (los matches y las propuestas
-- la ampliarán en T18.2 y T19.3). SECURITY DEFINER: el cliente no puede leer perfiles.
CREATE OR REPLACE FUNCTION public.puede_ver_foto(_ruta text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.user_id = auth.uid() AND p.foto_url = _ruta AND public.perfil_tiene_area(p.id)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.puede_ver_foto(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puede_ver_foto(text) TO authenticated;

DROP POLICY IF EXISTS "Cliente lee su foto" ON storage.objects;
CREATE POLICY "Cliente lee su foto"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'fotos-perfil' AND public.puede_ver_foto(name));
