-- T15.1 · Cuenta del cliente para su área privada (/mi-area), solo con el plan pagado.
-- La administradora crea en la ficha un enlace personal (accesos_cliente: 7 días, un solo uso); con él, la Edge
-- Function acceso-cliente crea la cuenta de Auth con el email del perfil y la contraseña que elige el cliente.
-- Regla del área: el cliente no lee ninguna tabla, solo funciones mi_* / mis_* que filtran por auth.uid().

-- 1. Cuenta vinculada al perfil. Si se borra la cuenta, el perfil se queda sin ella.
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users (id) ON DELETE SET NULL;

-- El formulario público inserta sin sesión: la misma política de T1.1 y, además, nunca con una cuenta puesta.
DROP POLICY IF EXISTS "Anyone can submit a profile" ON public.perfiles;
CREATE POLICY "Anyone can submit a profile" ON public.perfiles
FOR INSERT
WITH CHECK (
  (SELECT public.has_role(auth.uid(), 'admin'))
  OR (
    estado_cliente = 'activo'
    AND revisado = false
    AND plan IS NULL
    AND plan_inicio IS NULL
    AND plan_fin IS NULL
    AND sesiones_contratadas = 0
    AND disc_result_id IS NULL
    AND video_presentacion_path IS NULL
    AND ultimo_seguimiento_at IS NULL
    AND user_id IS NULL
  )
);

-- 2. ¿Tiene área? Plan con un pago cobrado, sin vencer y cliente activo o en pausa. Sin SECURITY DEFINER: con RLS,
--    una administradora lo sabe de cualquier perfil y nadie más de ninguno (el cliente pregunta con tiene_area()).
CREATE OR REPLACE FUNCTION public.perfil_tiene_area(_perfil_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles p
    WHERE p.id = _perfil_id
      AND p.plan IS NOT NULL
      AND (p.plan_fin IS NULL OR p.plan_fin >= current_date)
      AND p.estado_cliente IN ('activo', 'pausado')
      AND EXISTS (SELECT 1 FROM public.pagos g WHERE g.perfil_id = p.id AND g.estado = 'pagado')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.perfil_tiene_area(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perfil_tiene_area(uuid) TO authenticated, service_role;

-- 3. Para el cliente: su perfil y si tiene área.
CREATE OR REPLACE FUNCTION public.mi_perfil_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.perfiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.tiene_area()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.perfil_tiene_area(public.mi_perfil_id());
$$;

REVOKE EXECUTE ON FUNCTION public.mi_perfil_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tiene_area() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mi_perfil_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tiene_area() TO authenticated;

-- 4. Cuenta de Auth por email, para acceso-cliente (Auth solo busca por id). Solo el servidor.
CREATE OR REPLACE FUNCTION public.usuario_por_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.usuario_por_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.usuario_por_email(text) TO service_role;

-- 5. Enlaces de acceso: token aleatorio (2 × 122 bits) como en enlaces_subida (T13.3). Se gasta al crear la
--    contraseña (usado_at), no al abrir el enlace.
CREATE TABLE IF NOT EXISTS public.accesos_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  caduca_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  usado_at timestamptz,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accesos_cliente_perfil ON public.accesos_cliente (perfil_id);

ALTER TABLE public.accesos_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestiona accesos de clientes" ON public.accesos_cliente;
CREATE POLICY "Admin gestiona accesos de clientes"
ON public.accesos_cliente FOR ALL
TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'admin')))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')));

-- Sin plan pagado no hay enlace, y solo vale el último: uno nuevo (p. ej. "he olvidado mi contraseña") anula los
-- anteriores sin usar.
CREATE OR REPLACE FUNCTION public.accesos_cliente_nuevo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT public.perfil_tiene_area(NEW.perfil_id) THEN
    RAISE EXCEPTION 'Sin un pago cobrado y el plan en vigor no puede tener área' USING ERRCODE = 'P0001';
  END IF;
  DELETE FROM public.accesos_cliente WHERE perfil_id = NEW.perfil_id AND usado_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS accesos_cliente_nuevo ON public.accesos_cliente;
CREATE TRIGGER accesos_cliente_nuevo
BEFORE INSERT ON public.accesos_cliente
FOR EACH ROW EXECUTE FUNCTION public.accesos_cliente_nuevo();

-- 6. v_clientes con user_id (p.*) y con_area, para la ficha. p.* fija las columnas al crear la vista: hay que
--    quitarla y volver a crearla (como en T9.5). Misma definición que en T9.5 más con_area.
DROP VIEW IF EXISTS public.v_clientes;

CREATE VIEW public.v_clientes WITH (security_invoker = true) AS
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
  ) AS matches_abiertos,
  public.perfil_tiene_area(p.id) AS con_area
FROM public.perfiles p
CROSS JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE estado = 'realizada')::integer AS sesiones_realizadas,
    min(fecha_hora) FILTER (WHERE estado = 'programada' AND fecha_hora >= now()) AS proxima_sesion
  FROM public.sesiones
  WHERE perfil_id = p.id
) s;

-- 7. Supresión (T9.3): igual que antes y además borra la cuenta del cliente. La auditoría se queda sin user_id.
CREATE OR REPLACE FUNCTION public.suprimir_cliente(_perfil_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _perfil record;
  _resultado jsonb;
  _pagos integer;
  _disc integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo una administradora puede suprimir clientes' USING ERRCODE = '42501';
  END IF;

  SELECT id, email, disc_result_id, user_id INTO _perfil FROM public.perfiles WHERE id = _perfil_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El perfil no existe' USING ERRCODE = 'P0002';
  END IF;

  -- Recuento para el registro, antes de que la cascada lo borre (sin datos personales).
  SELECT jsonb_build_object(
    'sesiones', (SELECT count(*) FROM public.sesiones WHERE perfil_id = _perfil_id),
    'notas', (SELECT count(*) FROM public.notas_privadas WHERE perfil_id = _perfil_id),
    'matches', (SELECT count(*) FROM public.matches WHERE perfil_a = _perfil_id OR perfil_b = _perfil_id)
  ) INTO _resultado;

  -- Pagos: se conservan para la contabilidad, sin el vínculo al perfil ni los datos que no hacen falta para ella.
  UPDATE public.pagos SET perfil_id = NULL, perfil_suprimido_at = now(), telefono = NULL, notas = NULL
  WHERE perfil_id = _perfil_id;
  GET DIAGNOSTICS _pagos = ROW_COUNT;

  -- Test DISC: el vinculado y los que hizo con el mismo email.
  DELETE FROM public.disc_results d
  WHERE d.id = _perfil.disc_result_id
     OR (nullif(trim(_perfil.email), '') IS NOT NULL AND lower(trim(d.email)) = lower(trim(_perfil.email)));
  GET DIAGNOSTICS _disc = ROW_COUNT;

  -- Tareas y avisos de otros clientes que la nombran: los de sus matches y los de "perfil muy compatible".
  DELETE FROM public.tareas
  WHERE match_id IN (SELECT id FROM public.matches WHERE perfil_a = _perfil_id OR perfil_b = _perfil_id);
  DELETE FROM public.alertas WHERE clave_unica LIKE 'compatible:%:' || _perfil_id::text;

  -- La auditoría se conserva (responsabilidad proactiva), sin los motivos en texto libre.
  UPDATE public.auditoria SET detalle = NULL WHERE entidad_id = _perfil_id AND detalle IS NOT NULL;

  -- En cascada: sesiones, notas, sugerencias (de y para ella), aprendizaje, cola, matches, tareas, alertas y enlaces.
  DELETE FROM public.perfiles WHERE id = _perfil_id;

  -- T15.1: su cuenta del área, si la tenía (nunca la de una administradora).
  IF _perfil.user_id IS NOT NULL AND NOT public.has_role(_perfil.user_id, 'admin') THEN
    DELETE FROM auth.users WHERE id = _perfil.user_id;
  END IF;

  _resultado := _resultado || jsonb_build_object('pagos_conservados', _pagos, 'tests_disc', _disc, 'cuenta', _perfil.user_id IS NOT NULL);
  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id, detalle)
  VALUES (auth.uid(), 'suprimir_cliente', 'perfiles', _perfil_id, _resultado);
  RETURN _resultado;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.suprimir_cliente(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suprimir_cliente(uuid) TO authenticated;
