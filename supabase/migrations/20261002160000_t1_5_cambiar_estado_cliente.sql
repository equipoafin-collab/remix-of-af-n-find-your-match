-- T1.5 · Reglas de cambio de estado del cliente. Nunca borra nada: Baja y Pausado se revierten
-- volviendo a Activo con todo el historial intacto.

-- Contexto de cada entrada de auditoría (p. ej. { de, a, motivo } en un cambio de estado).
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS detalle jsonb;

CREATE OR REPLACE FUNCTION public.cambiar_estado_cliente(
  _perfil_id uuid,
  _nuevo_estado public.estado_cliente,
  _motivo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER   -- auditoria no admite INSERT directo; la comprobación de admin va dentro
SET search_path = ''
AS $$
DECLARE
  _anterior public.estado_cliente;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo una administradora puede cambiar el estado de un cliente' USING ERRCODE = '42501';
  END IF;

  SELECT estado_cliente INTO _anterior FROM public.perfiles WHERE id = _perfil_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe el perfil %', _perfil_id USING ERRCODE = 'P0002';
  END IF;
  IF _anterior = _nuevo_estado THEN
    RETURN;
  END IF;

  UPDATE public.perfiles SET estado_cliente = _nuevo_estado WHERE id = _perfil_id;  -- el trigger sella estado_cambiado_at

  -- AMPLIAR EN T4.1: baja → caducar match_sugerencias pendientes del cliente y las que le tienen como candidato;
  --                  pausado/finalizado → caducar las pendientes donde aparece como candidato.
  -- AMPLIAR EN T6.2: baja → cancelar sus tareas pendientes (pausado/finalizado las conservan).
  -- AMPLIAR EN T7.1: baja → resolver sus alertas abiertas.
  -- AMPLIAR EN T2.2: nota automática en notas_privadas con el cambio y el motivo.

  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id, detalle)
  VALUES (
    auth.uid(), 'cambiar_estado', 'perfiles', _perfil_id,
    jsonb_build_object('de', _anterior, 'a', _nuevo_estado, 'motivo', nullif(trim(_motivo), ''))
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cambiar_estado_cliente(uuid, public.estado_cliente, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_cliente(uuid, public.estado_cliente, text) TO authenticated;
