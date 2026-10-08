-- T9.5 · Limpieza: fuera estado_perfil y notas_admin (sustituidas por estado_cliente/revisado en T1.1 y por
-- notas_privadas en T2.2, donde se copiaron) y la vista de compatibilidad paid_users (T1.2). Nada las lee ya.

DROP VIEW IF EXISTS public.paid_users;

-- v_clientes usa p.*, que fija las columnas al crearla: hay que quitarla para borrar las columnas y volver a
-- crearla. Misma definición que en T8.1; ahora también trae las columnas de consentimiento de T9.3.
DROP VIEW IF EXISTS public.v_clientes;

ALTER TABLE public.perfiles DROP COLUMN IF EXISTS estado_perfil, DROP COLUMN IF EXISTS notas_admin;

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
