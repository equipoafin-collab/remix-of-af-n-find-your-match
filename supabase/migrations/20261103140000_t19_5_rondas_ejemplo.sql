-- T19.5 · Rondas con perfiles de ejemplo: 4 personas inventadas por la IA (ronda-ejemplo) que encajan con lo que busca
-- el cliente salvo en una cosa (edad, estilo de vida, valores o ambición). Sirven antes de tener sugerencias o mientras
-- nadie ha aceptado aparecer en propuestas (T19.1). Misma pantalla y mismo aprendizaje; nunca se mezclan con personas
-- reales y el cliente ve que son de ejemplo.

-- 1. ejemplos: [{ id, dimension, nombre, edad, zona, aficiones, rasgo, cambio, frase }]. El cliente nunca ve dimension
--    ni cambio (son para la psicóloga y el aprendizaje). elegido_ejemplo: el id del elegido (no es una persona: sin FK).
ALTER TABLE public.propuestas_rondas
  ADD COLUMN IF NOT EXISTS de_ejemplo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ejemplos jsonb,
  ADD COLUMN IF NOT EXISTS elegido_ejemplo uuid;

-- 2. Real (4 personas) o de ejemplo (ninguna persona), nunca las dos cosas.
ALTER TABLE public.propuestas_rondas DROP CONSTRAINT IF EXISTS propuestas_rondas_candidatos_check;
ALTER TABLE public.propuestas_rondas DROP CONSTRAINT IF EXISTS propuestas_rondas_real_o_ejemplo;
ALTER TABLE public.propuestas_rondas ADD CONSTRAINT propuestas_rondas_real_o_ejemplo CHECK (
  CASE WHEN de_ejemplo
    THEN cardinality(candidatos) = 0 AND jsonb_typeof(ejemplos) = 'array' AND elegido_id IS NULL AND frases = '{}'::jsonb
    ELSE cardinality(candidatos) = 4 AND ejemplos IS NULL AND elegido_ejemplo IS NULL
  END
);

-- 3. Al enviar (T19.2): lo de siempre y, en las de ejemplo, 4 perfiles completos con los límites de
--    supabase/functions/_shared/ejemplos.ts. Cada perfil recibe aquí su id.
CREATE OR REPLACE FUNCTION public.propuestas_rondas_validar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Las abiertas ya caducadas dejan de contar.
  UPDATE public.propuestas_rondas SET estado = 'caducada'
  WHERE perfil_id = NEW.perfil_id AND estado = 'abierta' AND caduca_at <= now();

  IF NOT public.perfil_tiene_area(NEW.perfil_id) THEN
    RAISE EXCEPTION 'El cliente no tiene su área activa: no vería la ronda' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.propuestas_rondas WHERE perfil_id = NEW.perfil_id AND estado = 'abierta') THEN
    RAISE EXCEPTION 'Ya tiene una ronda abierta: cancélala para enviar otra' USING ERRCODE = '23505';
  END IF;

  IF NEW.de_ejemplo THEN
    -- Por separado: jsonb_array_length da error si no es una lista, y un OR no garantiza el orden.
    IF jsonb_typeof(NEW.ejemplos) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Una ronda de ejemplo lleva una lista de 4 perfiles' USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(NEW.ejemplos) <> 4 OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.ejemplos) e
      WHERE jsonb_typeof(e) <> 'object'
         OR coalesce(e ->> 'dimension', '') NOT IN ('edad', 'estilo_de_vida', 'valores', 'ambicion')
         OR length(trim(coalesce(e ->> 'nombre', ''))) NOT BETWEEN 1 AND 40
         OR CASE WHEN coalesce(e ->> 'edad', '') ~ '^[0-9]{2}$' THEN (e ->> 'edad')::integer NOT BETWEEN 18 AND 99 ELSE true END
         OR length(coalesce(e ->> 'zona', '')) > 60
         OR length(coalesce(e ->> 'aficiones', '')) > 200
         OR length(trim(coalesce(e ->> 'rasgo', ''))) NOT BETWEEN 1 AND 160
         OR length(coalesce(e ->> 'cambio', '')) > 160
         OR length(coalesce(e ->> 'frase', '')) > 160
    ) THEN
      RAISE EXCEPTION 'Una ronda de ejemplo lleva 4 perfiles con nombre, edad (18-99) y rasgo, y textos cortos' USING ERRCODE = '22023';
    END IF;
    NEW.ejemplos := (
      SELECT jsonb_agg(x.e || jsonb_build_object('id', gen_random_uuid()) ORDER BY x.n)
      FROM jsonb_array_elements(NEW.ejemplos) WITH ORDINALITY AS x(e, n)
    );
    RETURN NEW;
  END IF;

  IF (SELECT count(DISTINCT c) FROM unnest(NEW.candidatos) c) <> 4 OR NEW.perfil_id = ANY (NEW.candidatos) THEN
    RAISE EXCEPTION 'Una ronda lleva 4 personas distintas, y nunca el propio cliente' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM public.perfiles WHERE id = ANY (NEW.candidatos) AND mostrar_en_propuestas AND estado_cliente = 'activo') <> 4 THEN
    RAISE EXCEPTION 'Solo se proponen personas activas que han aceptado aparecer en propuestas' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(NEW.frases) <> 'object' OR EXISTS (
    SELECT 1 FROM jsonb_each(NEW.frases) f
    WHERE f.key <> ALL (NEW.candidatos::text[]) OR jsonb_typeof(f.value) <> 'string' OR length(f.value #>> '{}') > 160
  ) THEN
    RAISE EXCEPTION 'Una frase por candidato, de hasta 160 caracteres' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

-- 4. mi_ronda (T19.3) igual que antes, y en las de ejemplo los perfiles (sin foto, con su rasgo) y de_ejemplo.
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
      'id', _r.id, 'estado', 'respondida', 'respondida_at', _r.respondida_at, 'ninguno', _r.ninguno, 'de_ejemplo', _r.de_ejemplo,
      'elegido', CASE WHEN _r.de_ejemplo
        THEN (SELECT e ->> 'nombre' FROM jsonb_array_elements(_r.ejemplos) e WHERE e ->> 'id' = _r.elegido_ejemplo::text)
        ELSE (SELECT split_part(trim(nombre_completo), ' ', 1) FROM public.perfiles WHERE id = _r.elegido_id)
      END
    );
  END IF;

  IF _r.de_ejemplo THEN
    RETURN jsonb_build_object(
      'id', _r.id, 'estado', 'abierta', 'caduca_at', _r.caduca_at, 'de_ejemplo', true,
      'personas', (
        SELECT jsonb_agg(jsonb_build_object(
          'id', x.e ->> 'id',
          'nombre', x.e ->> 'nombre',
          'edad', (x.e ->> 'edad')::integer,
          'zona', nullif(x.e ->> 'zona', ''),
          'aficiones', nullif(x.e ->> 'aficiones', ''),
          'foto_url', NULL,
          'rasgo', x.e ->> 'rasgo',
          'frase', nullif(trim(coalesce(x.e ->> 'frase', '')), '')
        ) ORDER BY x.n)
        FROM jsonb_array_elements(_r.ejemplos) WITH ORDINALITY AS x(e, n)
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'id', _r.id, 'estado', 'abierta', 'caduca_at', _r.caduca_at, 'de_ejemplo', false,
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

-- 5. responder_ronda (T19.4) igual que antes; en las de ejemplo, el elegido es un perfil de la ronda y la alerta
--    dice qué cambiaba en él (sin sugerencia a la que llevar).
CREATE OR REPLACE FUNCTION public.responder_ronda(_ronda_id uuid, _elegido uuid, _motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _yo uuid;
  _cliente text;
  _r public.propuestas_rondas;
  _ejemplo jsonb;
BEGIN
  SELECT id, nombre_completo INTO _yo, _cliente FROM public.perfiles WHERE user_id = auth.uid();
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
  ELSIF _r.de_ejemplo THEN
    SELECT e INTO _ejemplo FROM jsonb_array_elements(_r.ejemplos) e WHERE e ->> 'id' = _elegido::text;
    IF _ejemplo IS NULL THEN
      RAISE EXCEPTION 'Ese perfil no está en tu propuesta' USING ERRCODE = '22023';
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM public.ronda_visible(_r) p WHERE p.id = _elegido) THEN
    RAISE EXCEPTION 'Esa persona no está en tu propuesta' USING ERRCODE = '22023';
  END IF;

  UPDATE public.propuestas_rondas
  SET estado = 'respondida', respondida_at = now(), ninguno = _elegido IS NULL,
      elegido_id = CASE WHEN _r.de_ejemplo THEN NULL ELSE _elegido END,
      elegido_ejemplo = CASE WHEN _r.de_ejemplo THEN _elegido END,
      motivo = nullif(trim(coalesce(_motivo, '')), '')
  WHERE id = _r.id;
  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id)
  VALUES (auth.uid(), 'cliente_responde_ronda', 'propuestas_rondas', _r.id);

  IF _elegido IS NULL THEN
    INSERT INTO public.alertas (perfil_id, tipo, severidad, mensaje, clave_unica)
    VALUES (_yo, 'otra', 'info',
            format('A %s no le encaja ninguna persona de su ronda de %s: %s', _cliente,
                   CASE WHEN _r.de_ejemplo THEN 'perfiles de ejemplo' ELSE 'propuestas' END, trim(_motivo)),
            'ronda_respondida:' || _r.id);
  ELSIF _r.de_ejemplo THEN
    INSERT INTO public.alertas (perfil_id, tipo, severidad, mensaje, clave_unica)
    VALUES (_yo, 'otra', 'info',
            format('%s se ve más con el perfil de ejemplo de %s (%s años), en su ronda de perfiles de ejemplo. Cambiaba: %s',
                   _cliente, _ejemplo ->> 'nombre', _ejemplo ->> 'edad', coalesce(nullif(_ejemplo ->> 'cambio', ''), _ejemplo ->> 'rasgo')),
            'ronda_respondida:' || _r.id);
  ELSE
    INSERT INTO public.alertas (perfil_id, sugerencia_id, tipo, severidad, mensaje, clave_unica)
    VALUES (_yo,
            (SELECT id FROM public.match_sugerencias WHERE perfil_id = _yo AND candidato_id = _elegido),
            'otra', 'aviso',
            format('%s se ve más con %s en su ronda de propuestas.', _cliente,
                   (SELECT nombre_completo FROM public.perfiles WHERE id = _elegido)),
            'ronda_respondida:' || _r.id);
  END IF;
END;
$$;
