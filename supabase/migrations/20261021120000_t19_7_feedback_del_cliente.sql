-- T19.7 · El feedback de cada lado de un match guarda quién lo escribió. Lo apunta la psicóloga desde la ficha (T6.5)
-- o el cliente desde su área (T18.3), en las mismas columnas. El cliente solo ve en su área el que dejó él: lo que
-- anotó ella no se le enseña como suyo. Si él deja el suyo encima, lo de ella no se pierde: pasa a sus notas privadas.

-- 1. Quién escribió cada lado: true = el cliente desde su área. La ficha lo pone a false al guardar ese lado.
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS feedback_a_cliente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedback_b_cliente boolean NOT NULL DEFAULT false;

-- Los que ya dejaron los clientes (dejar_feedback lo apunta en auditoria), si nadie lo ha cambiado después
-- (dejar_feedback pone feedback_at y la auditoria en la misma transacción: el mismo now()).
UPDATE public.matches m SET feedback_a_cliente = true
WHERE NOT m.feedback_a_cliente AND EXISTS (
  SELECT 1 FROM public.auditoria au JOIN public.perfiles p ON p.user_id = au.user_id
  WHERE au.accion = 'cliente_feedback' AND au.entidad_id = m.id AND p.id = m.perfil_a AND au.created_at >= m.feedback_at
);
UPDATE public.matches m SET feedback_b_cliente = true
WHERE NOT m.feedback_b_cliente AND EXISTS (
  SELECT 1 FROM public.auditoria au JOIN public.perfiles p ON p.user_id = au.user_id
  WHERE au.accion = 'cliente_feedback' AND au.entidad_id = m.id AND p.id = m.perfil_b AND au.created_at >= m.feedback_at
);

-- 2. dejar_feedback (T18.3) igual que antes; además marca su lado como suyo y, si había algo anotado por la
--    psicóloga, lo guarda en sus notas privadas antes de sustituirlo.
CREATE OR REPLACE FUNCTION public.dejar_feedback(_match_id uuid, _valoracion integer, _quiere_repetir boolean, _comentario text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _yo record;
  _m public.matches;
  _es_a boolean;
  _otro text;
  _anotado text;
  _anotada_valoracion integer;
  _anotado_repetir boolean;
BEGIN
  SELECT id, nombre_completo INTO _yo FROM public.perfiles WHERE user_id = auth.uid();
  IF NOT FOUND OR NOT public.perfil_tiene_area(_yo.id) THEN
    RAISE EXCEPTION 'Tu área no está activa' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _m FROM public.matches
  WHERE id = _match_id AND presentado_at IS NOT NULL AND (perfil_a = _yo.id OR perfil_b = _yo.id)
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match no encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (_m.estado = 'cita_realizada' OR (_m.estado = 'cita_agendada' AND _m.fecha_cita <= now())) THEN
    RAISE EXCEPTION 'Ahora no se puede dejar el feedback de esta cita' USING ERRCODE = '22023';
  END IF;
  IF _valoracion IS NULL OR _valoracion NOT BETWEEN 1 AND 5 OR _quiere_repetir IS NULL
     OR length(trim(coalesce(_comentario, ''))) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION 'Valora la cita de 1 a 5, dinos si quieres volver a verle y cuéntanos qué tal (hasta 1.000 caracteres)' USING ERRCODE = '22023';
  END IF;

  _es_a := _m.perfil_a = _yo.id;
  SELECT nombre_completo INTO _otro FROM public.perfiles WHERE id = CASE WHEN _es_a THEN _m.perfil_b ELSE _m.perfil_a END;

  -- Lo que había anotado la psicóloga en su lado (no lo escribió él).
  IF _es_a AND NOT _m.feedback_a_cliente THEN
    _anotado := _m.feedback_a; _anotada_valoracion := _m.valoracion_a; _anotado_repetir := _m.quiere_repetir_a;
  ELSIF NOT _es_a AND NOT _m.feedback_b_cliente THEN
    _anotado := _m.feedback_b; _anotada_valoracion := _m.valoracion_b; _anotado_repetir := _m.quiere_repetir_b;
  END IF;
  IF length(trim(coalesce(_anotado, ''))) > 0 THEN
    INSERT INTO public.notas_privadas (perfil_id, contenido, automatica, created_by)
    VALUES (_yo.id,
            format('Feedback de la cita con %s que anotaste antes de que %s dejara el suyo desde su área: %s', _otro, _yo.nombre_completo,
                   concat_ws(' · ', _anotada_valoracion || '/5',
                             CASE _anotado_repetir WHEN true THEN 'quería volver a verle' WHEN false THEN 'no quería volver a verle' END,
                             '«' || trim(_anotado) || '»')),
            false, NULL);
  END IF;

  IF _es_a THEN
    UPDATE public.matches SET feedback_a = trim(_comentario), valoracion_a = _valoracion, quiere_repetir_a = _quiere_repetir,
                              feedback_a_cliente = true, feedback_at = now()
    WHERE id = _m.id;
  ELSE
    UPDATE public.matches SET feedback_b = trim(_comentario), valoracion_b = _valoracion, quiere_repetir_b = _quiere_repetir,
                              feedback_b_cliente = true, feedback_at = now()
    WHERE id = _m.id;
  END IF;

  INSERT INTO public.alertas (perfil_id, match_id, tipo, severidad, mensaje, clave_unica)
  VALUES (_yo.id, _m.id, 'otra', 'info',
          format('%s ha dejado su feedback de la cita con %s desde su área: %s/5, %s.', _yo.nombre_completo, _otro, _valoracion,
                 CASE WHEN _quiere_repetir THEN 'quiere volver a verle' ELSE 'no quiere volver a verle' END),
          'feedback_cliente:' || _m.id || ':' || _yo.id)
  ON CONFLICT (clave_unica) DO UPDATE SET mensaje = EXCLUDED.mensaje, estado = 'abierta', resuelta_at = NULL;
  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id)
  VALUES (auth.uid(), 'cliente_feedback', 'matches', _m.id);
END;
$$;

-- 3. mis_matches (T18.3) igual, salvo que su feedback solo sale si lo escribió él (si no, vacío: puede dar el suyo).
CREATE OR REPLACE FUNCTION public.mis_matches()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'estado', m.estado,
    'presentado_at', m.presentado_at,
    'fecha_cita', m.fecha_cita,
    'lugar', m.lugar,
    'motivos', m.motivos_cliente,
    'otra', jsonb_build_object(
      'nombre', split_part(trim(o.nombre_completo), ' ', 1),
      'edad', o.edad,
      'zona', o.zona,
      'aficiones', o.hobbies,
      'foto_url', o.foto_url
    ),
    'informe', CASE WHEN m.informe_enviado_at IS NOT NULL AND yo.plan = 'premium' THEN m.informe END,
    'mi_feedback', CASE
      WHEN m.perfil_a = yo.id AND m.feedback_a_cliente
        THEN jsonb_build_object('valoracion', m.valoracion_a, 'quiere_repetir', m.quiere_repetir_a, 'comentario', m.feedback_a)
      WHEN m.perfil_b = yo.id AND m.feedback_b_cliente
        THEN jsonb_build_object('valoracion', m.valoracion_b, 'quiere_repetir', m.quiere_repetir_b, 'comentario', m.feedback_b)
      ELSE jsonb_build_object('valoracion', NULL, 'quiere_repetir', NULL, 'comentario', NULL)
    END
  ) ORDER BY m.presentado_at DESC), '[]'::jsonb)
  FROM public.perfiles yo
  JOIN public.matches m ON (m.perfil_a = yo.id OR m.perfil_b = yo.id) AND m.presentado_at IS NOT NULL
  JOIN public.perfiles o ON o.id = CASE WHEN m.perfil_a = yo.id THEN m.perfil_b ELSE m.perfil_a END
  WHERE yo.user_id = auth.uid() AND public.perfil_tiene_area(yo.id);
$$;
