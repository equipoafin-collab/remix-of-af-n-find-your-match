-- T18.2 · El cliente ve sus matches presentados (T18.1) en su área. De la otra persona, solo nombre de pila, edad,
-- zona, aficiones y foto; nunca apellidos, contacto, religión, política, DISC, notas ni su feedback. El informe de
-- compatibilidad, solo si el cliente es Premium y la psicóloga ya lo marcó como enviado. Todo, con el área abierta.

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
    'informe', CASE WHEN m.informe_enviado_at IS NOT NULL AND yo.plan = 'premium' THEN m.informe END
  ) ORDER BY m.presentado_at DESC), '[]'::jsonb)
  FROM public.perfiles yo
  JOIN public.matches m ON (m.perfil_a = yo.id OR m.perfil_b = yo.id) AND m.presentado_at IS NOT NULL
  JOIN public.perfiles o ON o.id = CASE WHEN m.perfil_a = yo.id THEN m.perfil_b ELSE m.perfil_a END
  WHERE yo.user_id = auth.uid() AND public.perfil_tiene_area(yo.id);
$$;

REVOKE EXECUTE ON FUNCTION public.mis_matches() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_matches() TO authenticated;

-- Fotos que puede ver (T16.1): la suya y las de las personas de sus matches presentados, con el área abierta.
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
      )
  );
$$;

-- Sus citas (T17.1): las sesiones y, ahora, las citas con sus matches presentados (fecha, lugar y nombre de pila).
-- Una cita de match no tiene duración; su estado se traduce al de las sesiones.
CREATE OR REPLACE FUNCTION public.mis_citas()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(c.cita ORDER BY c.fecha), '[]'::jsonb)
  FROM (
    SELECT s.fecha_hora AS fecha, jsonb_build_object(
      'id', s.id, 'fecha_hora', s.fecha_hora, 'duracion_min', s.duracion_min, 'tipo', s.tipo, 'estado', s.estado
    ) AS cita
    FROM public.perfiles p
    JOIN public.sesiones s ON s.perfil_id = p.id
    WHERE p.user_id = auth.uid() AND public.perfil_tiene_area(p.id)
    UNION ALL
    SELECT m.fecha_cita, jsonb_build_object(
      'id', m.id, 'fecha_hora', m.fecha_cita, 'duracion_min', NULL, 'tipo', 'match',
      'estado', CASE
        WHEN m.estado = 'cita_agendada' THEN 'programada'
        WHEN m.estado = 'cerrado' AND m.fecha_cita > now() THEN 'cancelada'
        ELSE 'realizada'
      END,
      'con', split_part(trim(o.nombre_completo), ' ', 1),
      'lugar', m.lugar
    )
    FROM public.perfiles p
    JOIN public.matches m ON (m.perfil_a = p.id OR m.perfil_b = p.id)
    JOIN public.perfiles o ON o.id = CASE WHEN m.perfil_a = p.id THEN m.perfil_b ELSE m.perfil_a END
    WHERE p.user_id = auth.uid() AND public.perfil_tiene_area(p.id)
      AND m.presentado_at IS NOT NULL AND m.fecha_cita IS NOT NULL
      AND m.estado NOT IN ('propuesto', 'informe_enviado')
  ) c;
$$;
