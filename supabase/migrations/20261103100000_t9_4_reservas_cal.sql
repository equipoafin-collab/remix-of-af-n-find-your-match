-- T9.4 · Reservas de la "Cita en Afín" en cal.com (Edge Function cal-webhook): cada reserva crea, mueve o cancela su
-- sesión, en una transacción. Solo la llama la función, con el service role: nadie desde el navegador.

-- uid de la reserva en cal.com: enlaza movimientos y cancelaciones y evita duplicar si cal.com repite un aviso.
ALTER TABLE public.sesiones ADD COLUMN IF NOT EXISTS reserva_uid text UNIQUE;

CREATE OR REPLACE FUNCTION public.registrar_reserva_cal(
  _accion text, _uid text, _uid_anterior text, _email text, _nombre text, _inicio timestamptz, _duracion integer
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _sesion public.sesiones;
  _perfil_id uuid;
BEGIN
  IF _accion = 'cancelar' THEN
    -- Sin sesión (la reserva era de alguien sin perfil), se resuelve su alerta.
    UPDATE public.alertas SET estado = 'resuelta', resuelta_at = now()
    WHERE clave_unica = 'reserva_cal:' || _uid AND estado <> 'resuelta';

    UPDATE public.sesiones SET estado = 'cancelada'
    WHERE reserva_uid = _uid AND estado = 'programada'
    RETURNING * INTO _sesion;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('accion', 'nada');
    END IF;
    INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id)
    VALUES (NULL, 'reserva_cal_cancelada', 'sesiones', _sesion.id);
    RETURN jsonb_build_object('accion', 'cancelada', 'sesion_id', _sesion.id);
  END IF;

  IF EXISTS (SELECT 1 FROM public.sesiones WHERE reserva_uid = _uid) THEN
    RETURN jsonb_build_object('accion', 'nada');      -- aviso repetido
  END IF;

  -- Movida: la misma sesión pasa a la reserva nueva. Si la anterior no estaba registrada o ya se canceló, se crea.
  IF _accion = 'mover' AND _uid_anterior IS NOT NULL THEN
    UPDATE public.alertas SET estado = 'resuelta', resuelta_at = now()
    WHERE clave_unica = 'reserva_cal:' || _uid_anterior AND estado <> 'resuelta';

    UPDATE public.sesiones SET fecha_hora = _inicio, duracion_min = _duracion, reserva_uid = _uid
    WHERE reserva_uid = _uid_anterior AND estado = 'programada'
    RETURNING * INTO _sesion;
    IF FOUND THEN
      INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id)
      VALUES (NULL, 'reserva_cal_movida', 'sesiones', _sesion.id);
      RETURN jsonb_build_object('accion', 'movida', 'sesion_id', _sesion.id);
    END IF;
  END IF;

  -- El cliente, por su email; si varios perfiles lo comparten, el que tiene plan y, entre ellos, el más reciente.
  SELECT id INTO _perfil_id
  FROM public.perfiles
  WHERE lower(trim(email)) = lower(trim(_email))
  ORDER BY (plan IS NOT NULL) DESC, created_at DESC
  LIMIT 1;

  IF _perfil_id IS NULL THEN
    INSERT INTO public.alertas (tipo, severidad, mensaje, clave_unica)
    VALUES ('otra', 'aviso',
            format('Reserva en cal.com de %s (%s) para el %s: ningún perfil tiene ese email. Apúntala a mano en su ficha.',
                   coalesce(nullif(trim(_nombre), ''), 'alguien'), _email,
                   to_char(_inicio AT TIME ZONE 'Europe/Madrid', 'DD/MM/YYYY "a las" HH24:MI')),
            'reserva_cal:' || _uid)
    ON CONFLICT (clave_unica) DO NOTHING;
    RETURN jsonb_build_object('accion', 'sin_perfil');
  END IF;

  -- Si el cliente no tiene ninguna sesión (sin contar las canceladas), esta es la primera.
  INSERT INTO public.sesiones (perfil_id, fecha_hora, duracion_min, tipo, reserva_uid)
  VALUES (_perfil_id, _inicio, _duracion,
          CASE WHEN EXISTS (SELECT 1 FROM public.sesiones WHERE perfil_id = _perfil_id AND estado <> 'cancelada')
               THEN 'seguimiento' ELSE 'primera' END::public.sesion_tipo,
          _uid)
  RETURNING * INTO _sesion;
  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id)
  VALUES (NULL, 'reserva_cal', 'sesiones', _sesion.id);

  RETURN jsonb_build_object('accion', 'creada', 'sesion_id', _sesion.id, 'perfil_id', _perfil_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_reserva_cal(text, text, text, text, text, timestamptz, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_reserva_cal(text, text, text, text, text, timestamptz, integer) TO service_role;
