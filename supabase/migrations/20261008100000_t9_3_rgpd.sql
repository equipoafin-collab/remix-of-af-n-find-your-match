-- T9.3 · RGPD: consentimiento guardado, registro de lecturas de datos sensibles y derecho de supresión.

-- 1. Consentimiento del cuestionario (/perfil): qué texto aceptó y cuándo. Los perfiles anteriores quedan a NULL.
--    No se añade a v_clientes: la ficha no lo enseña y la exportación lee perfiles.
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS consentimiento_version text;
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS consentimiento_at timestamptz;
ALTER TABLE public.perfiles ALTER COLUMN consentimiento_at SET DEFAULT now();

-- 2. Pagos: se conservan por obligación contable aunque se suprima el perfil, desvinculados y marcados.
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS perfil_suprimido_at timestamptz;
ALTER TABLE public.pagos DROP CONSTRAINT IF EXISTS pagos_perfil_obligatorio;
ALTER TABLE public.pagos ADD CONSTRAINT pagos_perfil_obligatorio
  CHECK (perfil_id IS NOT NULL OR perfil_suprimido_at IS NOT NULL) NOT VALID;

-- 3. antecedentes: hasta ahora nadie podía borrar; la supresión lo necesita.
DROP POLICY IF EXISTS "Admin borra antecedentes" ON storage.objects;
CREATE POLICY "Admin borra antecedentes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'antecedentes' AND (SELECT public.has_role(auth.uid(), 'admin')));

-- 4. Lecturas de notas, resúmenes de sesión y vídeos: una fila de auditoria por cliente leído.
--    Las registra el navegador al cargar esos datos (ver src/hooks/admin/useRgpd.ts).
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad_id ON public.auditoria (entidad_id, created_at);

CREATE OR REPLACE FUNCTION public.registrar_lecturas(_accion text, _perfil_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo una administradora puede registrar lecturas' USING ERRCODE = '42501';
  END IF;
  IF _accion NOT IN ('leer_notas', 'leer_sesiones', 'ver_video') THEN
    RAISE EXCEPTION 'Acción de lectura no válida: %', _accion USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id)
  SELECT auth.uid(), _accion, 'perfiles', id FROM unnest(_perfil_ids) AS id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_lecturas(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_lecturas(text, uuid[]) TO authenticated;

-- 5. Derecho de supresión (distinto de la Baja, que conserva el historial): borra al cliente y lo que depende de él.
--    Los ficheros de Storage los borra antes el navegador (la API de Storage no se puede llamar desde SQL).
CREATE OR REPLACE FUNCTION public.suprimir_cliente(_perfil_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _perfil record;
  _resultado jsonb;
  _pagos integer;
  _disc integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo una administradora puede suprimir clientes' USING ERRCODE = '42501';
  END IF;

  SELECT id, email, disc_result_id INTO _perfil FROM public.perfiles WHERE id = _perfil_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El perfil no existe' USING ERRCODE = 'P0002';
  END IF;

  -- Recuento para el registro, antes de que la cascada lo borre (sin datos personales).
  SELECT jsonb_build_object(
    'sesiones', (SELECT count(*) FROM public.sesiones WHERE perfil_id = _perfil_id),
    'notas', (SELECT count(*) FROM public.notas_privadas WHERE perfil_id = _perfil_id),
    'matches', (SELECT count(*) FROM public.matches WHERE perfil_a = _perfil_id OR perfil_b = _perfil_id)
  ) INTO _resultado;

  -- Pagos: se conservan para la contabilidad, sin el vínculo al perfil ni los datos que no hacen falta para ella.
  UPDATE public.pagos SET perfil_id = NULL, perfil_suprimido_at = now(), telefono = NULL, notas = NULL
  WHERE perfil_id = _perfil_id;
  GET DIAGNOSTICS _pagos = ROW_COUNT;

  -- Test DISC: el vinculado y los que hizo con el mismo email.
  DELETE FROM public.disc_results d
  WHERE d.id = _perfil.disc_result_id
     OR (nullif(trim(_perfil.email), '') IS NOT NULL AND lower(trim(d.email)) = lower(trim(_perfil.email)));
  GET DIAGNOSTICS _disc = ROW_COUNT;

  -- Tareas y avisos de otros clientes que la nombran: los de sus matches y los de "perfil muy compatible".
  DELETE FROM public.tareas
  WHERE match_id IN (SELECT id FROM public.matches WHERE perfil_a = _perfil_id OR perfil_b = _perfil_id);
  DELETE FROM public.alertas WHERE clave_unica LIKE 'compatible:%:' || _perfil_id::text;

  -- La auditoría se conserva (responsabilidad proactiva), sin los motivos en texto libre.
  UPDATE public.auditoria SET detalle = NULL WHERE entidad_id = _perfil_id AND detalle IS NOT NULL;

  -- En cascada: sesiones, notas, sugerencias (de y para ella), aprendizaje, cola, matches, tareas y alertas.
  DELETE FROM public.perfiles WHERE id = _perfil_id;

  _resultado := _resultado || jsonb_build_object('pagos_conservados', _pagos, 'tests_disc', _disc);
  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id, detalle)
  VALUES (auth.uid(), 'suprimir_cliente', 'perfiles', _perfil_id, _resultado);
  RETURN _resultado;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.suprimir_cliente(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suprimir_cliente(uuid) TO authenticated;
