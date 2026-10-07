-- T8.1 · Contadores del Dashboard en una sola llamada. Los de clientes salen de v_clientes, la misma vista
-- que el listado, para que cada número coincida con su listado filtrado (T8.2).

-- matches_abiertos busca por los dos lados; perfil_b ya tenía índice (T6.1).
CREATE INDEX IF NOT EXISTS idx_matches_perfil_a ON public.matches (perfil_a);

-- Amplía v_clientes (T7.1) con matches_abiertos al final: matches no cerrados, sea el cliente A o B.
-- Sin ninguno (y activo con plan) = pendiente de matching.
CREATE OR REPLACE VIEW public.v_clientes WITH (security_invoker = true) AS
SELECT
  p.*,
  s.sesiones_realizadas,
  GREATEST(p.sesiones_contratadas - s.sesiones_realizadas, 0)::integer AS sesiones_pendientes,
  LEAST(
    s.proxima_sesion,
    (
      SELECT min(m.fecha_cita) FROM public.matches m
      WHERE (m.perfil_a = p.id OR m.perfil_b = p.id) AND m.estado = 'cita_agendada' AND m.fecha_cita >= now()
    )
  ) AS proxima_cita,
  (
    SELECT count(*)::integer FROM public.match_sugerencias m
    WHERE m.perfil_id = p.id AND m.estado = 'pendiente'
  ) AS sugerencias_pendientes,
  (
    SELECT count(*)::integer FROM public.tareas t
    WHERE t.perfil_id = p.id AND t.estado = 'pendiente'
  ) AS tareas_pendientes,
  (
    SELECT count(*)::integer FROM public.alertas a
    WHERE a.perfil_id = p.id AND a.estado <> 'resuelta'
  ) AS alertas_abiertas,
  (
    SELECT count(*)::integer FROM public.matches m
    WHERE (m.perfil_a = p.id OR m.perfil_b = p.id) AND m.estado <> 'cerrado'
  ) AS matches_abiertos
FROM public.perfiles p
CROSS JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE estado = 'realizada')::integer AS sesiones_realizadas,
    min(fecha_hora) FILTER (WHERE estado = 'programada' AND fecha_hora >= now()) AS proxima_sesion
  FROM public.sesiones
  WHERE perfil_id = p.id
) s;

-- "Hoy" es el día de Madrid. Cliente = perfil con plan. Security invoker: el RLS solo-admin de cada tabla
-- hace que quien no sea admin reciba ceros.
CREATE OR REPLACE FUNCTION public.dashboard_resumen()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH cfg AS (
    SELECT coalesce((SELECT (valor #>> '{}')::integer FROM public.configuracion WHERE clave = 'umbral_pocas_sesiones'), 1) AS umbral_pocas
  ),
  hoy AS (
    SELECT d AS dia, d::timestamp AT TIME ZONE 'Europe/Madrid' AS desde, (d + 1)::timestamp AT TIME ZONE 'Europe/Madrid' AS hasta
    FROM (SELECT (now() AT TIME ZONE 'Europe/Madrid')::date AS d) x
  ),
  clientes AS (
    SELECT
      count(*) FILTER (WHERE c.estado_cliente = 'activo') AS activos,
      -- Nuevo = empezó el plan en los últimos 30 días (sin fecha de inicio, cuenta el alta del perfil).
      count(*) FILTER (WHERE coalesce(c.plan_inicio, (c.created_at AT TIME ZONE 'Europe/Madrid')::date) >= hoy.dia - 30) AS nuevos,
      count(*) FILTER (WHERE c.estado_cliente = 'activo' AND c.plan = 'premium') AS premium,
      count(*) FILTER (WHERE c.estado_cliente = 'activo' AND c.matches_abiertos = 0) AS pendientes_matching,
      count(*) FILTER (WHERE c.estado_cliente = 'activo' AND c.sesiones_contratadas > 0
                         AND c.sesiones_pendientes <= cfg.umbral_pocas) AS pocas_sesiones,
      count(*) FILTER (WHERE c.estado_cliente = 'pausado') AS pausados,
      count(*) FILTER (WHERE c.estado_cliente = 'baja') AS bajas
    FROM public.v_clientes c, cfg, hoy
    WHERE c.plan IS NOT NULL
  )
  SELECT jsonb_build_object(
    'clientes_activos', cl.activos,
    'sesiones_hoy', (
      SELECT count(*) FROM public.sesiones s, hoy
      WHERE s.fecha_hora >= hoy.desde AND s.fecha_hora < hoy.hasta AND s.estado <> 'cancelada'
    ),
    'citas_hoy', (
      SELECT count(*) FROM public.matches m, hoy
      WHERE m.fecha_cita >= hoy.desde AND m.fecha_cita < hoy.hasta AND m.estado IN ('cita_agendada', 'cita_realizada')
    ),
    'nuevos_clientes', cl.nuevos,
    'premium', cl.premium,
    'pendientes_matching', cl.pendientes_matching,
    -- Informes y feedbacks: las tareas de T6.4 (la Baja ya las cancela).
    'informes_pendientes', (SELECT count(*) FROM public.tareas t WHERE t.tipo = 'enviar_informe' AND t.estado = 'pendiente'),
    'feedbacks_pendientes', (SELECT count(*) FROM public.tareas t WHERE t.tipo = 'registrar_feedback' AND t.estado = 'pendiente'),
    'pocas_sesiones', cl.pocas_sesiones,
    'pausados', cl.pausados,
    'bajas', cl.bajas,
    -- Detectados por procesar-cola-matching (T5.4) en 7 días y aún sin decidir (la alerta se resuelve al decidir).
    'nuevos_compatibles', (
      SELECT count(*) FROM public.alertas a
      WHERE a.tipo = 'nuevo_compatible' AND a.estado <> 'resuelta' AND a.created_at >= now() - interval '7 days'
    ),
    'alertas_urgentes', (SELECT count(*) FROM public.alertas a WHERE a.severidad = 'urgente' AND a.estado <> 'resuelta'),
    'umbral_pocas_sesiones', cfg.umbral_pocas
  )
  FROM clientes cl, cfg;
$$;

REVOKE EXECUTE ON FUNCTION public.dashboard_resumen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_resumen() TO authenticated;
