-- T16.2 · El cliente cambia desde su área algunas de sus preferencias (y su foto, con la Edge Function foto-cliente).
-- Solo los campos de la lista y con valores válidos: es la frontera con lo que llega del navegador. Después, sus
-- sugerencias se recalculan, entra en la cola de detección (T5.4) y la psicóloga recibe un aviso al día.

-- La cola acepta el motivo nuevo.
ALTER TABLE public.cola_matching DROP CONSTRAINT IF EXISTS cola_matching_motivo_check;
ALTER TABLE public.cola_matching ADD CONSTRAINT cola_matching_motivo_check CHECK (motivo IN ('alta', 'reactivado', 'preferencias'));

-- Tras un cambio del cliente: aviso del día para la psicóloga (lo último que cambió) y, si cambia lo que usa el
-- matching, sugerencias obsoletas (se recalculan al abrir la ficha, como en T5.3) y a la cola. Solo el servidor.
CREATE OR REPLACE FUNCTION public.perfil_cambiado_por_cliente(_perfil_id uuid, _que text, _matching boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _nombre text;
BEGIN
  SELECT nombre_completo INTO _nombre FROM public.perfiles WHERE id = _perfil_id;
  INSERT INTO public.alertas (perfil_id, tipo, severidad, mensaje, clave_unica)
  VALUES (_perfil_id, 'otra', 'info', _nombre || ' ha cambiado desde su área: ' || _que || '.',
          'perfil_cambiado:' || _perfil_id || ':' || to_char(now() AT TIME ZONE 'Europe/Madrid', 'YYYY-MM-DD'))
  ON CONFLICT (clave_unica) DO UPDATE SET mensaje = EXCLUDED.mensaje, estado = 'abierta', resuelta_at = NULL;

  IF _matching THEN
    UPDATE public.match_sugerencias SET calculado_at = 'epoch' WHERE perfil_id = _perfil_id AND estado = 'pendiente';
    INSERT INTO public.cola_matching (perfil_id, motivo) VALUES (_perfil_id, 'preferencias')
    ON CONFLICT (perfil_id) DO UPDATE SET motivo = EXCLUDED.motivo, encolado_at = now();
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.perfil_cambiado_por_cliente(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.perfil_cambiado_por_cliente(uuid, text, boolean) TO service_role;

-- Cambios del cliente en su perfil. Campos editables: los de CAMPOS_EDITABLES en src/lib/cuestionario.ts; provincias
-- y valores, los de supabase/functions/_shared/preguntasClave.ts (lo comprueba un test). Devuelve lo que cambió.
CREATE OR REPLACE FUNCTION public.actualizar_mi_perfil(_cambios jsonb)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _p public.perfiles;
  _n public.perfiles;
  _clave text;
  _cambiados text[] := '{}';
  _provincias text[] := ARRAY[
    'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz', 'Baleares', 'Barcelona', 'Bizkaia',
    'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ceuta', 'Ciudad Real', 'Córdoba', 'A Coruña', 'Cuenca',
    'Gipuzkoa', 'Girona', 'Granada', 'Guadalajara', 'Huelva', 'Huesca', 'Jaén', 'León', 'Lleida', 'Lugo',
    'Madrid', 'Málaga', 'Melilla', 'Murcia', 'Navarra', 'Ourense', 'Palencia', 'Las Palmas', 'Pontevedra', 'La Rioja',
    'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid',
    'Zamora', 'Zaragoza', 'Otra'
  ];
  _valores text[] := ARRAY[
    'Familia', 'Honestidad', 'Fe/espiritualidad', 'Ambición', 'Libertad',
    'Estabilidad', 'Humor', 'Cultura', 'Salud/deporte', 'Compromiso social'
  ];
BEGIN
  SELECT * INTO _p FROM public.perfiles WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR NOT public.perfil_tiene_area(_p.id) THEN
    RAISE EXCEPTION 'Tu área no está activa' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(_cambios) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Cambios no válidos' USING ERRCODE = '22023';
  END IF;

  FOR _clave IN SELECT jsonb_object_keys(_cambios) LOOP
    IF _clave <> ALL (ARRAY['zona', 'acepta_otras_zonas', 'edad_min_busca', 'edad_max_busca', 'valores_importantes', 'hobbies']) THEN
      RAISE EXCEPTION 'No se puede cambiar %', _clave USING ERRCODE = '22023';
    END IF;
  END LOOP;

  _n := _p;
  IF _cambios ? 'zona' THEN
    IF jsonb_typeof(_cambios->'zona') <> 'string' OR NOT (_cambios->>'zona' = ANY (_provincias)) THEN
      RAISE EXCEPTION 'Elige una provincia de la lista' USING ERRCODE = '22023';
    END IF;
    _n.zona := _cambios->>'zona';
  END IF;
  IF _cambios ? 'acepta_otras_zonas' THEN
    IF jsonb_typeof(_cambios->'acepta_otras_zonas') <> 'boolean' THEN
      RAISE EXCEPTION 'Respuesta no válida para otras provincias' USING ERRCODE = '22023';
    END IF;
    _n.acepta_otras_zonas := (_cambios->>'acepta_otras_zonas')::boolean;
  END IF;
  IF _cambios ? 'edad_min_busca' OR _cambios ? 'edad_max_busca' THEN
    IF (_cambios ? 'edad_min_busca' AND (jsonb_typeof(_cambios->'edad_min_busca') <> 'number' OR (_cambios->>'edad_min_busca') !~ '^\d{1,3}$'))
       OR (_cambios ? 'edad_max_busca' AND (jsonb_typeof(_cambios->'edad_max_busca') <> 'number' OR (_cambios->>'edad_max_busca') !~ '^\d{1,3}$')) THEN
      RAISE EXCEPTION 'La edad tiene que ser un número entero' USING ERRCODE = '22023';
    END IF;
    _n.edad_min_busca := coalesce((_cambios->>'edad_min_busca')::integer, _p.edad_min_busca);
    _n.edad_max_busca := coalesce((_cambios->>'edad_max_busca')::integer, _p.edad_max_busca);
    IF _n.edad_min_busca IS NULL OR _n.edad_max_busca IS NULL
       OR _n.edad_min_busca NOT BETWEEN 18 AND 99 OR _n.edad_max_busca NOT BETWEEN 18 AND 99 OR _n.edad_min_busca > _n.edad_max_busca THEN
      RAISE EXCEPTION 'La edad que buscas va de 18 a 99 y la mínima no puede pasar de la máxima' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF _cambios ? 'valores_importantes' THEN
    IF jsonb_typeof(_cambios->'valores_importantes') <> 'array'
       OR jsonb_array_length(_cambios->'valores_importantes') NOT BETWEEN 1 AND 3
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(_cambios->'valores_importantes') v
                  WHERE jsonb_typeof(v) <> 'string' OR NOT (v #>> '{}' = ANY (_valores)))
       OR (SELECT count(DISTINCT v) FROM jsonb_array_elements_text(_cambios->'valores_importantes') v) < jsonb_array_length(_cambios->'valores_importantes') THEN
      RAISE EXCEPTION 'Elige de 1 a 3 valores de la lista' USING ERRCODE = '22023';
    END IF;
    _n.valores_importantes := ARRAY(SELECT jsonb_array_elements_text(_cambios->'valores_importantes'));
  END IF;
  IF _cambios ? 'hobbies' THEN
    IF jsonb_typeof(_cambios->'hobbies') <> 'string' OR length(trim(_cambios->>'hobbies')) NOT BETWEEN 1 AND 1000 THEN
      RAISE EXCEPTION 'Cuéntanos tus aficiones (hasta 1.000 caracteres)' USING ERRCODE = '22023';
    END IF;
    _n.hobbies := trim(_cambios->>'hobbies');
  END IF;

  IF _n.zona IS DISTINCT FROM _p.zona THEN _cambiados := array_append(_cambiados, 'provincia'); END IF;
  IF _n.acepta_otras_zonas IS DISTINCT FROM _p.acepta_otras_zonas THEN _cambiados := array_append(_cambiados, 'otras provincias'); END IF;
  IF (_n.edad_min_busca, _n.edad_max_busca) IS DISTINCT FROM (_p.edad_min_busca, _p.edad_max_busca) THEN _cambiados := array_append(_cambiados, 'edad que busca'); END IF;
  IF _n.valores_importantes IS DISTINCT FROM _p.valores_importantes THEN _cambiados := array_append(_cambiados, 'valores'); END IF;
  IF _n.hobbies IS DISTINCT FROM _p.hobbies THEN _cambiados := array_append(_cambiados, 'aficiones'); END IF;
  IF cardinality(_cambiados) = 0 THEN
    RETURN _cambiados;
  END IF;

  -- Solo estas columnas: los triggers de plan y estado (T7.4) no saltan.
  UPDATE public.perfiles
  SET zona = _n.zona, acepta_otras_zonas = _n.acepta_otras_zonas, edad_min_busca = _n.edad_min_busca,
      edad_max_busca = _n.edad_max_busca, valores_importantes = _n.valores_importantes, hobbies = _n.hobbies
  WHERE id = _p.id;

  PERFORM public.perfil_cambiado_por_cliente(_p.id, array_to_string(_cambiados, ', '), true);
  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id, detalle)
  VALUES (auth.uid(), 'cliente_cambia_perfil', 'perfiles', _p.id, jsonb_build_object('campos', _cambiados));
  RETURN _cambiados;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.actualizar_mi_perfil(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.actualizar_mi_perfil(jsonb) TO authenticated;
