-- T14.3 · Las notas privadas y lo clínico de las sesiones (notas de la psicóloga y resumen) solo se leen con funciones
-- que dejan la lectura en auditoria: sin registro no hay lectura. Hasta ahora lo apuntaba el navegador (T9.3).
-- Las cuentas (authenticated) pierden el SELECT de esas columnas y conservan el del resto: agenda, contadores,
-- v_clientes y los UPDATE/DELETE por id siguen igual. Las Edge Functions usan service_role y no cambian.

REVOKE SELECT ON public.notas_privadas FROM anon, authenticated;
GRANT SELECT (id, perfil_id, sesion_id, automatica, created_at, created_by) ON public.notas_privadas TO authenticated;

REVOKE SELECT ON public.sesiones FROM anon, authenticated;
GRANT SELECT (id, perfil_id, fecha_hora, duracion_min, tipo, estado, video_path, resumen_estado, resumen_revisado_at,
              created_at, reserva_uid)
ON public.sesiones TO authenticated;

-- Una fila de auditoria por cliente leído, como mucho cada 30 min por administradora, tipo y cliente (para no llenar
-- el registro con cada recarga, igual que hacía el navegador). Solo la llaman las funciones de abajo.
CREATE OR REPLACE FUNCTION public.anotar_lectura(_accion text, _perfil_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id)
  SELECT auth.uid(), _accion, 'perfiles', l.id
  FROM (SELECT DISTINCT unnest(_perfil_ids) AS id) l
  WHERE l.id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.auditoria a
    WHERE a.entidad_id = l.id AND a.accion = _accion AND a.user_id IS NOT DISTINCT FROM auth.uid()
      AND a.created_at > now() - interval '30 minutes'
  );
$$;

CREATE OR REPLACE FUNCTION public.leer_notas(_perfil_id uuid)
RETURNS SETOF public.notas_privadas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo una administradora puede leer notas' USING ERRCODE = '42501';
  END IF;
  PERFORM public.anotar_lectura('leer_notas', ARRAY[_perfil_id]);
  RETURN QUERY SELECT * FROM public.notas_privadas WHERE perfil_id = _perfil_id ORDER BY created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.leer_sesiones(_perfil_id uuid)
RETURNS SETOF public.sesiones
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo una administradora puede leer sesiones' USING ERRCODE = '42501';
  END IF;
  PERFORM public.anotar_lectura('leer_sesiones', ARRAY[_perfil_id]);
  RETURN QUERY SELECT * FROM public.sesiones WHERE perfil_id = _perfil_id ORDER BY fecha_hora DESC;
END;
$$;

-- Buscador de Notas Privadas (T9.1): notas y sesiones de todos los clientes que contienen el texto (sin texto, las
-- más recientes con resumen), 50 de cada, con el nombre del cliente. Registra cada cliente que sale.
CREATE OR REPLACE FUNCTION public.buscar_notas(_texto text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _limpio text := trim(coalesce(_texto, ''));
  _patron text := '%' || replace(replace(replace(trim(coalesce(_texto, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  _notas jsonb;
  _sesiones jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo una administradora puede buscar notas' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(n) || jsonb_build_object('perfil', jsonb_build_object('id', p.id, 'nombre_completo', p.nombre_completo))
                            ORDER BY n.created_at DESC), '[]'::jsonb)
  INTO _notas
  FROM (
    SELECT * FROM public.notas_privadas
    WHERE _limpio = '' OR contenido ILIKE _patron
    ORDER BY created_at DESC LIMIT 50
  ) n
  LEFT JOIN public.perfiles p ON p.id = n.perfil_id;

  SELECT coalesce(jsonb_agg(to_jsonb(s) || jsonb_build_object('perfil', jsonb_build_object('id', p.id, 'nombre_completo', p.nombre_completo))
                            ORDER BY s.fecha_hora DESC), '[]'::jsonb)
  INTO _sesiones
  FROM (
    SELECT * FROM public.sesiones x
    WHERE CASE WHEN _limpio = '' THEN x.resumen_ia IS NOT NULL
               ELSE x.notas_brutas ILIKE _patron
                    OR EXISTS (SELECT 1 FROM jsonb_each_text(coalesce(x.resumen_ia, '{}'::jsonb)) e WHERE e.value ILIKE _patron)
          END
    ORDER BY x.fecha_hora DESC LIMIT 50
  ) s
  LEFT JOIN public.perfiles p ON p.id = s.perfil_id;

  PERFORM public.anotar_lectura('leer_notas', ARRAY(SELECT (x ->> 'perfil_id')::uuid FROM jsonb_array_elements(_notas) x));
  PERFORM public.anotar_lectura('leer_sesiones', ARRAY(SELECT (x ->> 'perfil_id')::uuid FROM jsonb_array_elements(_sesiones) x));
  RETURN jsonb_build_object('notas', _notas, 'sesiones', _sesiones);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anotar_lectura(text, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.leer_notas(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.leer_sesiones(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.buscar_notas(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leer_notas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leer_sesiones(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_notas(text) TO authenticated;
