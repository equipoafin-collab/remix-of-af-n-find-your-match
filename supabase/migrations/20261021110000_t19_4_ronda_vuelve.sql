-- T19.4 · La respuesta del cliente a su ronda (T19.3) vuelve a la psicóloga: una alerta con enlace a la sugerencia de
-- la persona elegida (aceptarla crea el match como siempre, T6.1) o, si no le encaja ninguna, con su motivo. Las
-- rondas que caducan sin respuesta pasan a caducada en la evaluación de cada hora y abren una alerta info. El
-- aprendizaje (actualizar-aprendizaje) lee las rondas respondidas de propuestas_rondas.

-- 1. Alertas que llevan a una sugerencia concreta.
ALTER TABLE public.alertas
  ADD COLUMN IF NOT EXISTS sugerencia_id uuid REFERENCES public.match_sugerencias (id) ON DELETE SET NULL;

-- 2. responder_ronda (T19.3) igual que antes, y además la alerta para la psicóloga.
CREATE OR REPLACE FUNCTION public.responder_ronda(_ronda_id uuid, _elegido uuid, _motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _yo uuid;
  _cliente text;
  _r public.propuestas_rondas;
BEGIN
  SELECT id, nombre_completo INTO _yo, _cliente FROM public.perfiles WHERE user_id = auth.uid();
  IF _yo IS NULL OR NOT public.perfil_tiene_area(_yo) THEN
    RAISE EXCEPTION 'Tu área no está activa' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _r FROM public.propuestas_rondas WHERE id = _ronda_id AND perfil_id = _yo FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Propuesta no encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF _r.estado <> 'abierta' OR _r.caduca_at <= now() THEN
    RAISE EXCEPTION 'Esta propuesta ya no está abierta' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(_motivo, '')) > 500 THEN
    RAISE EXCEPTION 'El motivo es demasiado largo' USING ERRCODE = '22023';
  END IF;

  IF _elegido IS NULL THEN
    IF length(trim(coalesce(_motivo, ''))) = 0 THEN
      RAISE EXCEPTION 'Dinos por qué no te encaja ninguna' USING ERRCODE = '22023';
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM public.ronda_visible(_r) p WHERE p.id = _elegido) THEN
    RAISE EXCEPTION 'Esa persona no está en tu propuesta' USING ERRCODE = '22023';
  END IF;

  UPDATE public.propuestas_rondas
  SET estado = 'respondida', respondida_at = now(), elegido_id = _elegido, ninguno = _elegido IS NULL,
      motivo = nullif(trim(coalesce(_motivo, '')), '')
  WHERE id = _r.id;
  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id)
  VALUES (auth.uid(), 'cliente_responde_ronda', 'propuestas_rondas', _r.id);

  IF _elegido IS NULL THEN
    INSERT INTO public.alertas (perfil_id, tipo, severidad, mensaje, clave_unica)
    VALUES (_yo, 'otra', 'info',
            format('A %s no le encaja ninguna persona de su ronda de propuestas: %s', _cliente, trim(_motivo)),
            'ronda_respondida:' || _r.id);
  ELSE
    INSERT INTO public.alertas (perfil_id, sugerencia_id, tipo, severidad, mensaje, clave_unica)
    VALUES (_yo,
            (SELECT id FROM public.match_sugerencias WHERE perfil_id = _yo AND candidato_id = _elegido),
            'otra', 'aviso',
            format('%s se ve más con %s en su ronda de propuestas.', _cliente,
                   (SELECT nombre_completo FROM public.perfiles WHERE id = _elegido)),
            'ronda_respondida:' || _r.id);
  END IF;
END;
$$;

-- 3. evaluar_automatizaciones (T18.3) igual que antes, y además las rondas caducadas: pasan a caducada y abren una
--    alerta info, una por ronda (también las que ya marcó caducada el envío de otra, T19.2). Clientes de baja, no.
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
  _rondas_caducadas integer;
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

  -- T19.4 · Rondas de propuestas sin respuesta.
  UPDATE public.propuestas_rondas SET estado = 'caducada'
  WHERE estado = 'abierta' AND caduca_at <= now() AND (_perfil_id IS NULL OR perfil_id = _perfil_id);

  INSERT INTO public.alertas (perfil_id, tipo, severidad, mensaje, clave_unica)
  SELECT r.perfil_id, 'otra', 'info',
         format('%s no respondió a la ronda de propuestas del %s y ha caducado.', p.nombre_completo,
                to_char(r.enviada_at AT TIME ZONE 'Europe/Madrid', 'DD/MM')),
         'ronda_caducada:' || r.id
  FROM public.propuestas_rondas r
  JOIN public.perfiles p ON p.id = r.perfil_id
  WHERE r.estado = 'caducada' AND p.estado_cliente <> 'baja' AND (_perfil_id IS NULL OR r.perfil_id = _perfil_id)
  ON CONFLICT (clave_unica) DO NOTHING;
  GET DIAGNOSTICS _rondas_caducadas = ROW_COUNT;

  RETURN jsonb_build_object(
    'alertas_creadas', _alertas_creadas + _rondas_caducadas, 'alertas_resueltas', _alertas_resueltas,
    'tareas_creadas', _tareas_creadas, 'tareas_completadas', _tareas_completadas
  );
END;
$$;
