-- T16.3 · Solicitudes del cliente a la psicóloga desde su área: pausar o reanudar su búsqueda, darse de baja o una
-- copia de sus datos. Solo crean una tarea y un aviso: la psicóloga decide y hace el cambio (estados con las reglas
-- de T1.5, exportación de T9.3). Nada cambia solo desde el área.

-- Tipos: los de SOLICITUDES en src/lib/areaCliente.ts (lo comprueba un test). Una pendiente por tipo: pedirla otra
-- vez no la duplica, y si la psicóloga ya la había cerrado, se reabre. origen 'manual': las automatizaciones (T7.2)
-- no la tocan. La copia de datos vence al mes (plazo del RGPD, art. 12.3). Devuelve false si ya estaba pedida.
CREATE OR REPLACE FUNCTION public.pedir_a_psicologa(_tipo text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _p record;
  _titulo text;
  _aviso text;
  _clave text;
  _nueva boolean;
BEGIN
  SELECT id, nombre_completo INTO _p FROM public.perfiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta cuenta no tiene área de cliente' USING ERRCODE = '42501';
  END IF;

  SELECT t.titulo, t.aviso INTO _titulo, _aviso
  FROM (VALUES
    ('pausa', 'Quiere pausar su búsqueda: confírmalo y cambia su estado a Pausado', 'quiere pausar su búsqueda'),
    ('reanudar', 'Quiere reanudar su búsqueda: cambia su estado a Activo', 'quiere reanudar su búsqueda'),
    ('baja', 'Quiere darse de baja: confírmalo y cambia su estado a Baja', 'quiere darse de baja'),
    ('datos', 'Pide una copia de sus datos: "Exportar datos" en su ficha (Documentos) y envíaselos', 'pide una copia de sus datos')
  ) AS t (tipo, titulo, aviso)
  WHERE t.tipo = _tipo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no válida' USING ERRCODE = '22023';
  END IF;
  _clave := 'solicitud_' || _tipo || ':' || _p.id;

  INSERT INTO public.tareas (perfil_id, tipo, origen, titulo, descripcion, vence_at, clave_unica)
  VALUES (_p.id, 'manual', 'manual', _titulo,
          'Lo ha pedido desde su área el ' || to_char(now() AT TIME ZONE 'Europe/Madrid', 'DD/MM/YYYY') || '.',
          now() + CASE WHEN _tipo = 'datos' THEN interval '30 days' ELSE interval '2 days' END, _clave)
  ON CONFLICT (clave_unica) DO UPDATE SET estado = 'pendiente', completada_at = NULL, vence_at = EXCLUDED.vence_at,
    descripcion = EXCLUDED.descripcion
  WHERE public.tareas.estado <> 'pendiente';
  _nueva := FOUND;

  IF _nueva THEN
    INSERT INTO public.alertas (perfil_id, tipo, severidad, mensaje, clave_unica)
    VALUES (_p.id, 'otra', 'aviso', _p.nombre_completo || ' ' || _aviso || ' (lo ha pedido desde su área).', _clave)
    ON CONFLICT (clave_unica) DO UPDATE SET estado = 'abierta', resuelta_at = NULL, mensaje = EXCLUDED.mensaje
    WHERE public.alertas.estado <> 'abierta';
    INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id, detalle)
    VALUES (auth.uid(), 'cliente_solicita', 'perfiles', _p.id, jsonb_build_object('tipo', _tipo));
  END IF;
  RETURN _nueva;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pedir_a_psicologa(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pedir_a_psicologa(text) TO authenticated;

-- mi_area (T15.2) trae además si está en pausa y qué solicitudes tiene pendientes. Lo demás, igual.
CREATE OR REPLACE FUNCTION public.mi_area()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'con_area', a.con_area,
    'plan_fin', p.plan_fin,
    'renovacion_pedida', EXISTS (
      SELECT 1 FROM public.tareas t
      WHERE t.clave_unica = 'renovacion_pedida:' || p.id || ':' || coalesce(p.plan_fin::text, '') AND t.estado = 'pendiente'
    )
  ) || CASE WHEN a.con_area THEN jsonb_build_object(
    'nombre', split_part(trim(p.nombre_completo), ' ', 1),
    'plan', p.plan,
    'sesiones_contratadas', p.sesiones_contratadas,
    'sesiones_realizadas', s.realizadas,
    'sesiones_pendientes', GREATEST(p.sesiones_contratadas - s.realizadas, 0),
    'proxima_sesion', (
      SELECT jsonb_build_object('fecha_hora', x.fecha_hora, 'duracion_min', x.duracion_min, 'tipo', x.tipo)
      FROM public.sesiones x
      WHERE x.perfil_id = p.id AND x.estado = 'programada' AND x.fecha_hora >= now()
      ORDER BY x.fecha_hora
      LIMIT 1
    ),
    'en_pausa', p.estado_cliente = 'pausado',
    'solicitudes', coalesce((
      SELECT jsonb_agg(split_part(substr(t.clave_unica, length('solicitud_') + 1), ':', 1))
      FROM public.tareas t
      WHERE t.perfil_id = p.id AND t.clave_unica LIKE 'solicitud\_%' AND t.estado = 'pendiente'
    ), '[]'::jsonb)
  ) ELSE '{}'::jsonb END
  FROM public.perfiles p
  CROSS JOIN LATERAL (SELECT public.perfil_tiene_area(p.id) AS con_area) a
  CROSS JOIN LATERAL (
    SELECT count(*) FILTER (WHERE x.estado = 'realizada')::integer AS realizadas FROM public.sesiones x WHERE x.perfil_id = p.id
  ) s
  WHERE p.user_id = auth.uid();
$$;
