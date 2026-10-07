-- T5.4 · Cola de perfiles nuevos o reactivados para buscarles clientes muy compatibles.
-- La procesa la Edge Function procesar-cola-matching (cada 15 min desde T7.3; hasta entonces, a mano).

CREATE TABLE IF NOT EXISTS public.cola_matching (
  perfil_id uuid PRIMARY KEY REFERENCES public.perfiles (id) ON DELETE CASCADE,
  motivo text NOT NULL CHECK (motivo IN ('alta', 'reactivado')),
  encolado_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cola_matching ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestiona cola de matching" ON public.cola_matching;
CREATE POLICY "Admin gestiona cola de matching"
ON public.cola_matching FOR ALL
TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'admin')))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')));

-- SECURITY DEFINER: el alta llega del formulario público (anónimo), que no puede escribir en la cola.
CREATE OR REPLACE FUNCTION public.encolar_matching()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.cola_matching (perfil_id, motivo)
  VALUES (NEW.id, CASE WHEN TG_OP = 'INSERT' THEN 'alta' ELSE 'reactivado' END)
  ON CONFLICT (perfil_id) DO UPDATE SET motivo = EXCLUDED.motivo, encolado_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS perfiles_encolar_alta ON public.perfiles;
CREATE TRIGGER perfiles_encolar_alta
AFTER INSERT ON public.perfiles
FOR EACH ROW WHEN (NEW.estado_cliente = 'activo')
EXECUTE FUNCTION public.encolar_matching();

DROP TRIGGER IF EXISTS perfiles_encolar_reactivado ON public.perfiles;
CREATE TRIGGER perfiles_encolar_reactivado
AFTER UPDATE OF estado_cliente ON public.perfiles
FOR EACH ROW WHEN (NEW.estado_cliente = 'activo' AND OLD.estado_cliente IS DISTINCT FROM 'activo')
EXECUTE FUNCTION public.encolar_matching();
