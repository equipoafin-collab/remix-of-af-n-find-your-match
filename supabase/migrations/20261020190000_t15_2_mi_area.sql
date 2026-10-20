-- T15.2 · Lo que ve el cliente al entrar en su área (/mi-area) y su petición de renovar el plan.
-- Como en todo el área, el cliente no lee tablas: solo estas funciones, que filtran por auth.uid().

-- Resumen del área. NULL si la cuenta no tiene perfil. Sin área (plan vencido, finalizado o baja) solo devuelve
-- con_area = false, la fecha de fin del plan y si ya pidió renovarlo: ningún otro dato.
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
    )
  ) ELSE '{}'::jsonb END
  FROM public.perfiles p
  CROSS JOIN LATERAL (SELECT public.perfil_tiene_area(p.id) AS con_area) a
  CROSS JOIN LATERAL (
    SELECT count(*) FILTER (WHERE x.estado = 'realizada')::integer AS realizadas FROM public.sesiones x WHERE x.perfil_id = p.id
  ) s
  WHERE p.user_id = auth.uid();
$$;

-- "Quiero renovar": tarea y aviso para la psicóloga, que le envía el enlace de pago (T11.4). Una por periodo del
-- plan (clave con plan_fin); si la psicóloga ya la había cerrado y lo vuelve a pedir, se reabren. origen 'manual':
-- las automatizaciones (T7.2) completan solas las tareas automáticas de renovación que no generan ellas.
-- Devuelve false si ya estaba pedida.
CREATE OR REPLACE FUNCTION public.pedir_renovacion()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _p record;
  _clave text;
  _nueva boolean;
BEGIN
  SELECT id, nombre_completo, plan_fin INTO _p FROM public.perfiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta cuenta no tiene área de cliente' USING ERRCODE = '42501';
  END IF;
  _clave := 'renovacion_pedida:' || _p.id || ':' || coalesce(_p.plan_fin::text, '');

  INSERT INTO public.tareas (perfil_id, tipo, origen, titulo, descripcion, vence_at, clave_unica)
  VALUES (_p.id, 'renovacion_plan', 'manual', 'Quiere renovar su plan: envíale el enlace de pago',
          'Lo ha pedido desde su área el ' || to_char(now() AT TIME ZONE 'Europe/Madrid', 'DD/MM/YYYY') || '.',
          now() + interval '2 days', _clave)
  ON CONFLICT (clave_unica) DO UPDATE SET estado = 'pendiente', completada_at = NULL, vence_at = EXCLUDED.vence_at,
    descripcion = EXCLUDED.descripcion
  WHERE public.tareas.estado <> 'pendiente';
  _nueva := FOUND;

  IF _nueva THEN
    INSERT INTO public.alertas (perfil_id, tipo, severidad, mensaje, clave_unica)
    VALUES (_p.id, 'otra', 'aviso', _p.nombre_completo || ' quiere renovar su plan desde su área: envíale el enlace de pago.', _clave)
    ON CONFLICT (clave_unica) DO UPDATE SET estado = 'abierta', resuelta_at = NULL
    WHERE public.alertas.estado <> 'abierta';
  END IF;
  RETURN _nueva;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mi_area() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pedir_renovacion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mi_area() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pedir_renovacion() TO authenticated;
