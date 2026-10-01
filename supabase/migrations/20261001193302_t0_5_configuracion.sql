-- T0.5 · Tabla configuracion (clave/valor) con los valores por defecto del plan (sección 3.3)
-- y los pesos actuales del algoritmo de matching (WEIGHTS en src/lib/profileMatching.ts).

CREATE TABLE IF NOT EXISTS public.configuracion (
  clave text PRIMARY KEY,
  valor jsonb NOT NULL
);

ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestiona configuracion" ON public.configuracion;
CREATE POLICY "Admin gestiona configuracion"
ON public.configuracion FOR ALL
TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'admin')))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')));

-- Las claves de los JSON van en camelCase para casar con el código TS (breakdown del matching).
INSERT INTO public.configuracion (clave, valor) VALUES
  ('sesiones_por_plan', '{"esencial": 1, "premium": 2}'),   -- sesiones al mes
  ('umbral_pocas_sesiones', '1'),                            -- alerta si quedan ≤ N
  ('dias_sin_seguimiento', '21'),
  ('umbral_alta_compatibilidad', '80'),                      -- % a partir del cual se avisa
  ('dias_feedback', '3'),                                    -- plazo tras la cita
  ('num_sugerencias', '10'),
  ('pesos_algoritmo', '{"objetivos": 0.25, "valores": 0.20, "estiloVida": 0.20, "personalidad": 0.15, "geografia": 0.10, "preferencias": 0.10}')
ON CONFLICT (clave) DO NOTHING;
