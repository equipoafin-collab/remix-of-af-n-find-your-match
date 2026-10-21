-- T19.3 · El cliente ve en su área la ronda de 4 propuestas que le envió la psicóloga (T19.2) y dice con quién se ve
-- más, o que ninguna le encaja (con el motivo). Se responde una vez y mientras no caduque. De cada persona, lo mismo
-- que de un match (T18.2): nombre de pila, edad, zona, aficiones, foto y la frase. Quien ya no quiere aparecer en
-- propuestas, o no está activo, deja de salir aunque la ronda ya estuviera enviada.

-- Personas de una ronda que se pueden enseñar ahora mismo.
CREATE OR REPLACE FUNCTION public.ronda_visible(_ronda public.propuestas_rondas)
RETURNS SETOF public.perfiles
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT p.* FROM unnest(_ronda.candidatos) WITH ORDINALITY AS c(id, orden)
  JOIN public.perfiles p ON p.id = c.id
  WHERE p.mostrar_en_propuestas AND p.estado_cliente = 'activo'
  ORDER BY c.orden;
$$;

REVOKE EXECUTE ON FUNCTION public.ronda_visible(public.propuestas_rondas) FROM PUBLIC, anon, authenticated;

-- Su ronda: la abierta (con las personas) o, si la última ya la respondió, solo a quién eligió. Si no, NULL.
CREATE OR REPLACE FUNCTION public.mi_ronda()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _yo uuid;
  _r public.propuestas_rondas;
BEGIN
  SELECT id INTO _yo FROM public.perfiles WHERE user_id = auth.uid();
  IF _yo IS NULL OR NOT public.perfil_tiene_area(_yo) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _r FROM public.propuestas_rondas
  WHERE perfil_id = _yo AND estado IN ('abierta', 'respondida')
  ORDER BY enviada_at DESC
  LIMIT 1;
  IF NOT FOUND OR (_r.estado = 'abierta' AND _r.caduca_at <= now()) THEN
    RETURN NULL;
  END IF;

  IF _r.estado = 'respondida' THEN
    RETURN jsonb_build_object(
      'id', _r.id, 'estado', 'respondida', 'respondida_at', _r.respondida_at, 'ninguno', _r.ninguno,
      'elegido', (SELECT split_part(trim(nombre_completo), ' ', 1) FROM public.perfiles WHERE id = _r.elegido_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'id', _r.id, 'estado', 'abierta', 'caduca_at', _r.caduca_at,
    'personas', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'nombre', split_part(trim(p.nombre_completo), ' ', 1),
        'edad', p.edad,
        'zona', p.zona,
        'aficiones', p.hobbies,
        'foto_url', p.foto_url,
        'frase', _r.frases ->> p.id::text
      ))
      FROM public.ronda_visible(_r) p
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mi_ronda() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mi_ronda() TO authenticated;

-- Su respuesta: una persona de la ronda que siga visible, o ninguna con el motivo (chips "Distancia, Edad — texto",
-- como los de T5.3). Una vez y antes de que caduque.
CREATE OR REPLACE FUNCTION public.responder_ronda(_ronda_id uuid, _elegido uuid, _motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _yo uuid;
  _r public.propuestas_rondas;
BEGIN
  SELECT id INTO _yo FROM public.perfiles WHERE user_id = auth.uid();
  IF _yo IS NULL OR NOT public.perfil_tiene_area(_yo) THEN
    RAISE EXCEPTION 'Tu área no está activa' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _r FROM public.propuestas_rondas WHERE id = _ronda_id AND perfil_id = _yo FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Propuesta no encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF _r.estado <> 'abierta' OR _r.caduca_at <= now() THEN
    RAISE EXCEPTION 'Esta propuesta ya no está abierta' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(_motivo, '')) > 500 THEN
    RAISE EXCEPTION 'El motivo es demasiado largo' USING ERRCODE = '22023';
  END IF;

  IF _elegido IS NULL THEN
    IF length(trim(coalesce(_motivo, ''))) = 0 THEN
      RAISE EXCEPTION 'Dinos por qué no te encaja ninguna' USING ERRCODE = '22023';
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM public.ronda_visible(_r) p WHERE p.id = _elegido) THEN
    RAISE EXCEPTION 'Esa persona no está en tu propuesta' USING ERRCODE = '22023';
  END IF;

  UPDATE public.propuestas_rondas
  SET estado = 'respondida', respondida_at = now(), elegido_id = _elegido, ninguno = _elegido IS NULL,
      motivo = nullif(trim(coalesce(_motivo, '')), '')
  WHERE id = _r.id;
  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id)
  VALUES (auth.uid(), 'cliente_responde_ronda', 'propuestas_rondas', _r.id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.responder_ronda(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.responder_ronda(uuid, uuid, text) TO authenticated;

-- Fotos que puede ver (T16.1, T18.2): además, las de las personas de su ronda abierta que sigan visibles.
CREATE OR REPLACE FUNCTION public.puede_ver_foto(_ruta text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles yo
    WHERE yo.user_id = auth.uid() AND public.perfil_tiene_area(yo.id)
      AND (
        yo.foto_url = _ruta
        OR EXISTS (
          SELECT 1
          FROM public.matches m
          JOIN public.perfiles o ON o.id = CASE WHEN m.perfil_a = yo.id THEN m.perfil_b ELSE m.perfil_a END
          WHERE (m.perfil_a = yo.id OR m.perfil_b = yo.id) AND m.presentado_at IS NOT NULL AND o.foto_url = _ruta
        )
        OR EXISTS (
          SELECT 1
          FROM public.propuestas_rondas r
          CROSS JOIN LATERAL public.ronda_visible(r) p
          WHERE r.perfil_id = yo.id AND r.estado = 'abierta' AND r.caduca_at > now() AND p.foto_url = _ruta
        )
      )
  );
$$;
