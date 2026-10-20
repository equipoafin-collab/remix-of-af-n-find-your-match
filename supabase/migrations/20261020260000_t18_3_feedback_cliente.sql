-- T18.3 · El cliente deja su feedback tras la cita con un match desde su área: solo su lado (valoración, si quiere
-- volver a verle y un comentario). Su tarea "registrar feedback" (T6.4) se completa sola y la psicóloga recibe un
-- aviso; lo ve en la ficha como si lo hubiera apuntado ella. Nunca ve el feedback del otro.

-- 1. evaluar_automatizaciones (T7.2) igual que antes, salvo que deja pasar las llamadas desde un trigger: el feedback
--    del cliente mueve sus automatizaciones (T6.5 y T7.4) con su sesión, que no es de administradora. Llamarla
--    directamente sigue siendo solo para administradoras.
CREATE OR REPLACE FUNCTION public.evaluar_automatizaciones(_perfil_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _alertas_creadas integer;
  _alertas_resueltas integer;
  _tareas_creadas integer;
  _tareas_completadas integer;
BEGIN
  -- Sin sesión = proceso programado (pg_cron); con sesión, solo una administradora. Desde un trigger (T18.3), sí:
  -- los cambios que hace un cliente desde su área (su feedback) también reevalúan sus avisos y tareas.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') AND pg_trigger_depth() = 0 THEN
    RAISE EXCEPTION 'Solo una administradora puede ejecutar las automatizaciones' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.alertas (perfil_id, match_id, tipo, severidad, mensaje, clave_unica)
  SELECT v.perfil_id, v.match_id, v.tipo::public.alerta_tipo, v.severidad::public.alerta_severidad, v.texto, v.clave
  FROM public.v_automatizaciones v
  WHERE v.clase = 'alerta' AND (_perfil_id IS NULL OR v.perfil_id = _perfil_id)
  ON CONFLICT (clave_unica) DO NOTHING;
  GET DIAGNOSTICS _alertas_creadas = ROW_COUNT;

  UPDATE public.alertas a SET estado = 'resuelta'
  WHERE a.estado <> 'resuelta'
    AND a.tipo IN ('informe_pendiente', 'feedback_pendiente', 'pocas_sesiones', 'plan_terminado', 'nuevo_compatible', 'sin_seguimiento')
    AND (_perfil_id IS NULL OR a.perfil_id = _perfil_id)
    AND NOT EXISTS (SELECT 1 FROM public.v_automatizaciones v WHERE v.clase = 'alerta' AND v.clave = a.clave_unica);
  GET DIAGNOSTICS _alertas_resueltas = ROW_COUNT;

  INSERT INTO public.tareas (perfil_id, match_id, tipo, origen, titulo, clave_unica)
  SELECT v.perfil_id, v.match_id, v.tipo::public.tarea_tipo, 'auto', v.texto, v.clave
  FROM public.v_automatizaciones v
  WHERE v.clase = 'tarea' AND (_perfil_id IS NULL OR v.perfil_id = _perfil_id)
  ON CONFLICT (clave_unica) DO NOTHING;
  GET DIAGNOSTICS _tareas_creadas = ROW_COUNT;

  -- Solo las de estas reglas: las de informe y feedback las cierran los triggers de los matches (T6.4).
  UPDATE public.tareas t SET estado = 'completada'
  WHERE t.origen = 'auto' AND t.estado = 'pendiente'
    AND t.tipo IN ('renovacion_plan', 'seguimiento', 'revisar_resumen')
    AND (_perfil_id IS NULL OR t.perfil_id = _perfil_id)
    AND NOT EXISTS (SELECT 1 FROM public.v_automatizaciones v WHERE v.clase = 'tarea' AND v.clave = t.clave_unica);
  GET DIAGNOSTICS _tareas_completadas = ROW_COUNT;

  RETURN jsonb_build_object(
    'alertas_creadas', _alertas_creadas, 'alertas_resueltas', _alertas_resueltas,
    'tareas_creadas', _tareas_creadas, 'tareas_completadas', _tareas_completadas
  );
END;
$$;

-- 2. Su feedback. Desde que pasa la cita (marcada como realizada, o agendada con la fecha ya pasada) hasta que la
--    psicóloga pasa el match a feedback_registrado (o más allá), y solo de un match presentado.
CREATE OR REPLACE FUNCTION public.dejar_feedback(_match_id uuid, _valoracion integer, _quiere_repetir boolean, _comentario text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _yo record;
  _m public.matches;
  _es_a boolean;
  _otro text;
BEGIN
  SELECT id, nombre_completo INTO _yo FROM public.perfiles WHERE user_id = auth.uid();
  IF NOT FOUND OR NOT public.perfil_tiene_area(_yo.id) THEN
    RAISE EXCEPTION 'Tu área no está activa' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _m FROM public.matches
  WHERE id = _match_id AND presentado_at IS NOT NULL AND (perfil_a = _yo.id OR perfil_b = _yo.id)
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match no encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (_m.estado = 'cita_realizada' OR (_m.estado = 'cita_agendada' AND _m.fecha_cita <= now())) THEN
    RAISE EXCEPTION 'Ahora no se puede dejar el feedback de esta cita' USING ERRCODE = '22023';
  END IF;
  IF _valoracion IS NULL OR _valoracion NOT BETWEEN 1 AND 5 OR _quiere_repetir IS NULL
     OR length(trim(coalesce(_comentario, ''))) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION 'Valora la cita de 1 a 5, dinos si quieres volver a verle y cuéntanos qué tal (hasta 1.000 caracteres)' USING ERRCODE = '22023';
  END IF;

  _es_a := _m.perfil_a = _yo.id;
  IF _es_a THEN
    UPDATE public.matches SET feedback_a = trim(_comentario), valoracion_a = _valoracion, quiere_repetir_a = _quiere_repetir, feedback_at = now()
    WHERE id = _m.id;
  ELSE
    UPDATE public.matches SET feedback_b = trim(_comentario), valoracion_b = _valoracion, quiere_repetir_b = _quiere_repetir, feedback_at = now()
    WHERE id = _m.id;
  END IF;

  SELECT nombre_completo INTO _otro FROM public.perfiles WHERE id = CASE WHEN _es_a THEN _m.perfil_b ELSE _m.perfil_a END;
  INSERT INTO public.alertas (perfil_id, match_id, tipo, severidad, mensaje, clave_unica)
  VALUES (_yo.id, _m.id, 'otra', 'info',
          format('%s ha dejado su feedback de la cita con %s desde su área: %s/5, %s.', _yo.nombre_completo, _otro, _valoracion,
                 CASE WHEN _quiere_repetir THEN 'quiere volver a verle' ELSE 'no quiere volver a verle' END),
          'feedback_cliente:' || _m.id || ':' || _yo.id)
  ON CONFLICT (clave_unica) DO UPDATE SET mensaje = EXCLUDED.mensaje, estado = 'abierta', resuelta_at = NULL;
  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id)
  VALUES (auth.uid(), 'cliente_feedback', 'matches', _m.id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dejar_feedback(uuid, integer, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dejar_feedback(uuid, integer, boolean, text) TO authenticated;

-- 3. mis_matches (T18.2) trae además su propio feedback (nunca el del otro), para verlo y cambiarlo.
CREATE OR REPLACE FUNCTION public.mis_matches()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'estado', m.estado,
    'presentado_at', m.presentado_at,
    'fecha_cita', m.fecha_cita,
    'lugar', m.lugar,
    'motivos', m.motivos_cliente,
    'otra', jsonb_build_object(
      'nombre', split_part(trim(o.nombre_completo), ' ', 1),
      'edad', o.edad,
      'zona', o.zona,
      'aficiones', o.hobbies,
      'foto_url', o.foto_url
    ),
    'informe', CASE WHEN m.informe_enviado_at IS NOT NULL AND yo.plan = 'premium' THEN m.informe END,
    'mi_feedback', CASE WHEN m.perfil_a = yo.id
      THEN jsonb_build_object('valoracion', m.valoracion_a, 'quiere_repetir', m.quiere_repetir_a, 'comentario', m.feedback_a)
      ELSE jsonb_build_object('valoracion', m.valoracion_b, 'quiere_repetir', m.quiere_repetir_b, 'comentario', m.feedback_b)
    END
  ) ORDER BY m.presentado_at DESC), '[]'::jsonb)
  FROM public.perfiles yo
  JOIN public.matches m ON (m.perfil_a = yo.id OR m.perfil_b = yo.id) AND m.presentado_at IS NOT NULL
  JOIN public.perfiles o ON o.id = CASE WHEN m.perfil_a = yo.id THEN m.perfil_b ELSE m.perfil_a END
  WHERE yo.user_id = auth.uid() AND public.perfil_tiene_area(yo.id);
$$;
