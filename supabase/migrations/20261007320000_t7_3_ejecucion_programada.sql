-- T7.3 · Ejecución programada con pg_cron: automatizaciones cada hora y cola de matching cada 15 minutos.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Secretos que solo leen la BD (pg_cron) y las Edge Functions (service role): RLS sin políticas, nadie por API.
CREATE TABLE IF NOT EXISTS public.secretos_internos (
  clave text PRIMARY KEY,
  valor text NOT NULL
);
ALTER TABLE public.secretos_internos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.secretos_internos FROM anon, authenticated;

-- procesar-cola-matching acepta la llamada del cron si trae este valor en la cabecera x-cron-secret.
INSERT INTO public.secretos_internos (clave, valor)
VALUES ('cron_procesar_cola', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
ON CONFLICT (clave) DO NOTHING;

-- cron.schedule con el mismo nombre actualiza el job: reaplicar la migración no lo duplica.
SELECT cron.schedule('evaluar-automatizaciones', '0 * * * *', $$SELECT public.evaluar_automatizaciones()$$);

-- URL del proyecto de supabase/config.toml. El secreto se lee en cada ejecución, no se copia en el job.
SELECT cron.schedule('procesar-cola-matching', '*/15 * * * *', $$
  SELECT net.http_post(
    url := 'https://mcpfefvftvgfgbhahycn.supabase.co/functions/v1/procesar-cola-matching',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT valor FROM public.secretos_internos WHERE clave = 'cron_procesar_cola')
    ),
    body := '{}'::jsonb
  )
$$);

-- Para la pantalla de Configuración: cada job con su última ejecución. Para la cola (pg_net), cron solo sabe
-- que la petición salió; la respuesta de la función es la última de net._http_response.
CREATE OR REPLACE FUNCTION public.estado_automatizaciones()
RETURNS TABLE (tarea text, programacion text, activa boolean, ultima_ejecucion timestamptz, resultado text, detalle text)
LANGUAGE plpgsql
SECURITY DEFINER   -- los esquemas cron y net no son accesibles por API; la comprobación de admin va dentro
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo una administradora puede ver las automatizaciones' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    j.jobname::text,
    j.schedule::text,
    j.active,
    r.start_time,
    r.status::text,
    CASE WHEN j.jobname = 'procesar-cola-matching'
      THEN (SELECT 'HTTP ' || h.status_code || coalesce(' · ' || left(h.content, 160), '')
            FROM net._http_response h ORDER BY h.created DESC LIMIT 1)
      ELSE left(r.return_message, 200)
    END
  FROM cron.job j
  LEFT JOIN LATERAL (
    SELECT d.start_time, d.status, d.return_message FROM cron.job_run_details d
    WHERE d.jobid = j.jobid ORDER BY d.start_time DESC LIMIT 1
  ) r ON true
  WHERE j.jobname IN ('evaluar-automatizaciones', 'procesar-cola-matching')
  ORDER BY j.jobname;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.estado_automatizaciones() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estado_automatizaciones() TO authenticated;
