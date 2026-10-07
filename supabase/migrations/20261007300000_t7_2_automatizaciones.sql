-- T7.2 · Automatizaciones: qué alertas y tareas deberían existir ahora (vista) y la función que lo aplica.
-- Idempotente: cada fila lleva una clave por "episodio" (p. ej. pocas_sesiones:<cliente>:<sesiones contratadas>),
-- así que repetirla no duplica y lo que la psicóloga resuelve a mano no reaparece hasta que haya un episodio nuevo.
-- Ninguna regla se aplica a clientes de baja; Pausado solo genera "Plan terminado" y Finalizado nada (sección 3.3).

CREATE OR REPLACE VIEW public.v_automatizaciones WITH (security_invoker = true) AS
WITH cfg AS (
  SELECT
    coalesce((SELECT (valor #>> '{}')::integer FROM public.configuracion WHERE clave = 'umbral_pocas_sesiones'), 1) AS umbral_pocas,
    coalesce((SELECT (valor #>> '{}')::integer FROM public.configuracion WHERE clave = 'dias_sin_seguimiento'), 21) AS dias_seguimiento
),
clientes AS (
  SELECT
    p.id, p.nombre_completo, p.estado_cliente, p.plan_inicio, p.plan_fin, p.sesiones_contratadas,
    coalesce(p.ultimo_seguimiento_at, p.plan_inicio::timestamptz, p.created_at) AS seguimiento_desde,
    GREATEST(p.sesiones_contratadas - (
      SELECT count(*) FROM public.sesiones s WHERE s.perfil_id = p.id AND s.estado = 'realizada'
    ), 0)::integer AS pendientes
  FROM public.perfiles p
  WHERE p.plan IS NOT NULL AND p.estado_cliente IN ('activo', 'pausado')
)
-- 1. Informe Premium sin enviar más de 2 días después de crear el match (T6.4).
SELECT 'alerta' AS clase, 'informe_pendiente' AS tipo, 'informe_pendiente:' || t.id AS clave, t.perfil_id, t.match_id,
       'aviso' AS severidad, t.titulo || ' (pendiente desde el ' || to_char(t.created_at AT TIME ZONE 'Europe/Madrid', 'DD/MM') || ')' AS texto
FROM public.tareas t JOIN public.perfiles p ON p.id = t.perfil_id
WHERE t.tipo = 'enviar_informe' AND t.estado = 'pendiente' AND t.created_at < now() - interval '2 days' AND p.estado_cliente = 'activo'
UNION ALL
-- 2. Feedback sin registrar tras el plazo (la tarea de T6.4 vence en fecha de la cita + dias_feedback).
SELECT 'alerta', 'feedback_pendiente', 'feedback_pendiente:' || t.id, t.perfil_id, t.match_id,
       'urgente', t.titulo || ' (venció el ' || to_char(t.vence_at AT TIME ZONE 'Europe/Madrid', 'DD/MM') || ')'
FROM public.tareas t JOIN public.perfiles p ON p.id = t.perfil_id
WHERE t.tipo = 'registrar_feedback' AND t.estado = 'pendiente' AND t.vence_at < now() AND p.estado_cliente = 'activo'
UNION ALL
-- 3. Pocas sesiones: alerta y tarea de renovación (con 0 pendientes salta "Plan terminado").
SELECT 'alerta', 'pocas_sesiones', 'pocas_sesiones:' || c.id || ':' || c.sesiones_contratadas, c.id, NULL,
       'aviso', format('A %s le %s %s del plan', c.nombre_completo,
                       CASE WHEN c.pendientes = 1 THEN 'queda' ELSE 'quedan' END,
                       CASE WHEN c.pendientes = 1 THEN '1 sesión' ELSE c.pendientes || ' sesiones' END)
FROM clientes c, cfg
WHERE c.estado_cliente = 'activo' AND c.sesiones_contratadas > 0 AND c.pendientes BETWEEN 1 AND cfg.umbral_pocas
UNION ALL
SELECT 'tarea', 'renovacion_plan', 'renovacion:' || c.id || ':' || c.sesiones_contratadas, c.id, NULL,
       NULL, format('Proponer a %s renovar el plan', c.nombre_completo)
FROM clientes c, cfg
WHERE c.estado_cliente = 'activo' AND c.sesiones_contratadas > 0 AND c.pendientes BETWEEN 1 AND cfg.umbral_pocas
UNION ALL
-- 4. Plan terminado: sin sesiones pendientes o pasada la fecha de fin.
SELECT 'alerta', 'plan_terminado', 'plan_terminado:' || c.id || ':' || c.sesiones_contratadas || ':' || coalesce(c.plan_fin::text, ''), c.id, NULL,
       'urgente', format('El plan de %s ha terminado (%s). ¿Renovar o pasar a Finalizado?', c.nombre_completo,
                         CASE WHEN c.plan_fin < current_date THEN 'terminó el ' || to_char(c.plan_fin, 'DD/MM/YYYY')
                              ELSE 'no le quedan sesiones' END)
FROM clientes c
WHERE (c.sesiones_contratadas > 0 AND c.pendientes = 0) OR c.plan_fin < current_date
UNION ALL
-- 5. Perfil muy compatible (lo crea procesar-cola-matching, T5.4): sigue mientras la sugerencia esté pendiente.
SELECT 'alerta', 'nuevo_compatible', a.clave_unica, a.perfil_id, NULL, 'info', a.mensaje
FROM public.alertas a
JOIN public.match_sugerencias m ON a.clave_unica = 'compatible:' || m.perfil_id || ':' || m.candidato_id
WHERE a.tipo = 'nuevo_compatible' AND m.estado = 'pendiente'
UNION ALL
-- 6. Sin seguimiento: alerta y tarea (el episodio es la fecha del último seguimiento).
SELECT 'alerta', 'sin_seguimiento', 'sin_seguimiento:' || c.id || ':' || to_char(c.seguimiento_desde, 'YYYYMMDD'), c.id, NULL,
       'aviso', format('%s no tiene seguimiento desde el %s', c.nombre_completo, to_char(c.seguimiento_desde AT TIME ZONE 'Europe/Madrid', 'DD/MM/YYYY'))
FROM clientes c, cfg
WHERE c.estado_cliente = 'activo' AND c.seguimiento_desde < now() - make_interval(days => cfg.dias_seguimiento)
UNION ALL
SELECT 'tarea', 'seguimiento', 'seguimiento:' || c.id || ':' || to_char(c.seguimiento_desde, 'YYYYMMDD'), c.id, NULL,
       NULL, format('Hacer seguimiento a %s', c.nombre_completo)
FROM clientes c, cfg
WHERE c.estado_cliente = 'activo' AND c.seguimiento_desde < now() - make_interval(days => cfg.dias_seguimiento)
UNION ALL
-- 7. Resumen de sesión sin revisar 2 días después: tarea.
SELECT 'tarea', 'revisar_resumen', 'resumen:' || s.id, s.perfil_id, NULL,
       NULL, format('Revisar el resumen de la sesión del %s con %s', to_char(s.fecha_hora AT TIME ZONE 'Europe/Madrid', 'DD/MM'), p.nombre_completo)
FROM public.sesiones s JOIN public.perfiles p ON p.id = s.perfil_id
WHERE s.estado = 'realizada' AND s.resumen_estado IN ('borrador', 'sin_generar')
  AND s.fecha_hora < now() - interval '2 days' AND p.estado_cliente = 'activo';

-- Aplica la vista: crea lo que falta, resuelve las alertas que ya no aplican y completa las tareas automáticas
-- cuya situación se ha resuelto. _perfil_id = solo ese cliente (T7.4); null = todos (proceso programado, T7.3).
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
  -- Sin sesión = proceso programado (pg_cron); con sesión, solo una administradora.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
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

REVOKE EXECUTE ON FUNCTION public.evaluar_automatizaciones(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluar_automatizaciones(uuid) TO authenticated;
