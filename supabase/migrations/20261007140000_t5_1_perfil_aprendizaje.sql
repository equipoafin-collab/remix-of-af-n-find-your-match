-- T5.1 · Lo que la IA aprende de cada cliente (lo rellena actualizar-aprendizaje en T5.3 y lo lee el
-- contexto de la IA, _shared/contextoCliente.ts). Sale de resúmenes y notas: datos de salud, solo admin.

CREATE TABLE IF NOT EXISTS public.perfil_aprendizaje (
  perfil_id uuid PRIMARY KEY REFERENCES public.perfiles (id) ON DELETE CASCADE,
  preferencias jsonb NOT NULL DEFAULT '{}',    -- { valora: [], evita: [], notas: '' }
  ajustes_pesos jsonb NOT NULL DEFAULT '{}',   -- multiplicadores por dimensión del matching (1 = sin cambio)
  resumen_contexto text,
  actualizado_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.perfil_aprendizaje ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestiona aprendizaje" ON public.perfil_aprendizaje;
CREATE POLICY "Admin gestiona aprendizaje"
ON public.perfil_aprendizaje FOR ALL
TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'admin')))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')));
