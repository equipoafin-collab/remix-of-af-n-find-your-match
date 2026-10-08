-- T9.5 · Datos de prueba para QA: 30 perfiles variados (12 clientes con plan y 18 leads) con sesiones, resúmenes,
-- notas, sugerencias, matches en cada estado y pagos. Las tareas y alertas las crean los triggers y las
-- automatizaciones al final.
--
-- SOLO para una base de datos local o de pruebas vacía (`supabase db reset` lo carga tras las migraciones).
-- NUNCA en Lovable Cloud, que es la base de datos real: si encuentra perfiles que no son de prueba, se para.
-- Emails @afin.test (dominio reservado: no recibe correo). Para entrar al CRM, crea un usuario en Auth y dale el rol:
--   INSERT INTO public.user_roles (user_id, role) SELECT id, 'admin' FROM auth.users WHERE email = '<tu email>';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.perfiles WHERE email IS NULL OR email NOT LIKE '%@afin.test') THEN
    RAISE EXCEPTION 'seed.sql es solo para una base de datos de pruebas vacía: aquí hay perfiles reales.';
  END IF;
END $$;

-- id determinista: 00000000-0000-4000-8000-0000000000NN (NN = 01…30).
CREATE OR REPLACE FUNCTION pg_temp.qa(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE
AS $$ SELECT ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;

-- Impares, mujeres; pares, hombres; el 30, género "Otro". Del 1 al 12, clientes con plan (premium los múltiplos
-- de 3); el resto, leads. Estados: 10 pausado, 11 baja, 12 finalizado y 25 pausado.
INSERT INTO public.perfiles (
  id, nombre_completo, email, telefono, edad, genero, busca_genero, edad_min_busca, edad_max_busca,
  ciudad, zona, acepta_otras_zonas, valores_importantes, tipo_relacion, hijos, tabaco, alcohol,
  religion, importa_religion, religion_pareja, ideologia, importa_politica, politica_pareja, desea_casarse,
  deseo_familia, ambicion_profesional, nivel_social, estilo_vida_activo, necesidad_independencia,
  conflicto, sentirse_querido, relacion_sana, aprendizaje_ultima_relacion, vida_en_10_anios, hobbies,
  disc_perfil, disc_respuestas, plan, plan_inicio, plan_fin, sesiones_contratadas, estado_cliente, revisado,
  consentimiento_version, created_at
)
SELECT
  pg_temp.qa(n),
  CASE WHEN n % 2 = 1
    THEN (ARRAY['Lucía','María','Paula','Laura','Marta','Sara','Ana','Elena','Carmen','Irene','Claudia','Nuria','Julia','Alba','Cristina'])[(n + 1) / 2]
    ELSE (ARRAY['Carlos','Javier','David','Daniel','Pablo','Sergio','Alejandro','Jorge','Álvaro','Miguel','Raúl','Adrián','Diego','Iván','Óscar'])[n / 2]
  END || ' ' || (ARRAY['García','López','Martín','Sánchez','Pérez','Gómez','Ruiz','Díaz','Moreno','Navarro'])[1 + n % 10] || ' (QA)',
  'qa' || n || '@afin.test',
  '600000' || lpad(n::text, 3, '0'),
  26 + (n * 7) % 25,
  CASE WHEN n = 30 THEN 'Otro' WHEN n % 2 = 1 THEN 'Mujer' ELSE 'Hombre' END,
  CASE WHEN n = 30 OR n % 7 = 0 THEN 'Ambos' WHEN n % 2 = 1 THEN 'Hombre' ELSE 'Mujer' END,
  greatest(18, 26 + (n * 7) % 25 - 6),
  26 + (n * 7) % 25 + 6,
  z.provincia, z.provincia, n % 3 = 0,
  ARRAY[v[1 + n % 10], v[1 + (n + 3) % 10], v[1 + (n + 6) % 10]],
  (ARRAY['Matrimonio','Relación estable','Relación sin convivencia','Casual'])[1 + n % 4],
  (ARRAY['Tengo','No tengo','Quiero tener','No quiero tener'])[1 + (n * 3) % 4],
  CASE n % 5 WHEN 0 THEN 'Sí' WHEN 1 THEN 'Ocasional' ELSE 'No' END,
  (ARRAY['Nunca','Ocasional','Social','Habitual'])[1 + n % 4],
  r.religion, n % 6 = 0, CASE WHEN n % 6 = 0 THEN r.religion END,
  i.ideologia, n % 4 = 0, CASE WHEN n % 4 = 0 THEN i.ideologia END,
  (ARRAY['Sí, lo deseo','No quiero casarme','Me da igual'])[1 + n % 3],
  1 + n % 5, 1 + (n + 1) % 5, 1 + (n + 2) % 5, 1 + (n + 3) % 5, 1 + (n + 4) % 5,
  ARRAY[(ARRAY['Dialogar','Necesito tiempo','Evitar conflicto','Enfrentar directamente'])[1 + n % 4]],
  ARRAY[q[1 + n % 5], q[1 + (n + 2) % 5]],
  (ARRAY['Confianza y respeto','Comunicación sincera','Espacio propio y proyectos comunes','Cuidarse mutuamente','Reírse juntos'])[1 + n % 5],
  (ARRAY['Escuchar más','Poner límites antes','No idealizar','Hablar de dinero pronto','Cuidar mi independencia'])[1 + (n + 2) % 5],
  (ARRAY['Con familia y una casa tranquila','Viajando con mi pareja','Consolidado en mi trabajo y en pareja','Viviendo cerca del mar','Con hijos y amigos cerca'])[1 + (n + 4) % 5],
  (ARRAY['Senderismo y cocina','Lectura y cine','Pádel y viajes','Música y museos','Yoga y jardinería','Running y series'])[1 + n % 6],
  (ARRAY['D','I','S','C'])[1 + n % 4], '{}'::jsonb,
  CASE WHEN n > 12 THEN NULL WHEN n % 3 = 0 THEN 'premium' ELSE 'esencial' END::public.plan_tipo,
  CASE WHEN n <= 12 THEN current_date - n * 12 END,
  CASE WHEN n = 12 THEN current_date - 5                    -- finalizado
       WHEN n = 9 THEN current_date + 10                    -- termina pronto: aviso de renovación
       WHEN n <= 12 THEN current_date - n * 12 + 180 END,
  CASE WHEN n = 8 THEN 3 WHEN n > 12 THEN 0 WHEN n % 3 = 0 THEN 12 ELSE 6 END,
  CASE n WHEN 10 THEN 'pausado' WHEN 11 THEN 'baja' WHEN 12 THEN 'finalizado' WHEN 25 THEN 'pausado' ELSE 'activo' END::public.estado_cliente,
  n <= 20,
  '2026-10-08',
  now() - n * interval '2 days'                             -- del 1 al 15, "nuevos" (últimos 30 días)
FROM generate_series(1, 30) n
CROSS JOIN LATERAL (SELECT (ARRAY['Madrid','Madrid','Barcelona','Valencia','Sevilla','Madrid','Málaga','Bizkaia','Zaragoza','Madrid'])[1 + n % 10] AS provincia) z
CROSS JOIN LATERAL (SELECT (ARRAY['Catolicismo','Agnóstico','Ateo','Espiritual','Cristianismo','Agnóstico','Catolicismo','Ateo','Budismo','Otra'])[1 + n % 10] AS religion) r
CROSS JOIN LATERAL (SELECT (ARRAY['Derechas','Izquierdas','Centro'])[1 + n % 3] AS ideologia) i
CROSS JOIN (SELECT ARRAY['Familia','Honestidad','Fe/espiritualidad','Ambición','Libertad','Estabilidad','Humor','Cultura','Salud/deporte','Compromiso social'] AS v) va
CROSS JOIN (SELECT ARRAY['Palabras','Tiempo de calidad','Contacto físico','Proyectos compartidos','Admiración'] AS q) qa;

-- Pagos de los clientes (el trigger copia el plan al perfil, que ya lo tiene).
INSERT INTO public.pagos (perfil_id, nombre_completo, email, telefono, plan, importe, fecha)
SELECT id, nombre_completo, email, telefono, plan, CASE plan WHEN 'premium' THEN 600 ELSE 300 END, plan_inicio
FROM public.perfiles WHERE plan IS NOT NULL;

-- Sesiones de los clientes: la primera y una de seguimiento hechas (la primera con resumen revisado); a los
-- clientes 1-3 les toca otra hoy y a los 4-5, mañana. Al 8 le queda una de tres (aviso de pocas sesiones).
INSERT INTO public.sesiones (perfil_id, fecha_hora, tipo, estado, notas_brutas, resumen_ia, resumen_estado, resumen_revisado_at)
SELECT pg_temp.qa(n), now() - (30 + n) * interval '1 day', 'primera', 'realizada',
  'Primera sesión de prueba: cuenta qué busca y cómo le fue en su última relación.',
  jsonb_build_object(
    'estado_emocional', 'Tranquila y con ganas de empezar.',
    'temas_tratados', jsonb_build_array('Qué busca en una pareja', 'Su última relación'),
    'avances', jsonb_build_array('Tiene claro lo que no quiere'),
    'objetivos', jsonb_build_array('Conocer a alguien con sus mismos valores'),
    'proximos_pasos', jsonb_build_array('Revisar los primeros perfiles compatibles'),
    'preferencias_detectadas', jsonb_build_array('Valora el sentido del humor')),
  'revisado', now() - (29 + n) * interval '1 day'
FROM generate_series(1, 12) n;

INSERT INTO public.sesiones (perfil_id, fecha_hora, tipo, estado, notas_brutas)
SELECT pg_temp.qa(n), now() - (10 + n) * interval '1 day', 'seguimiento', 'realizada',
  'Sesión de seguimiento de prueba: sin resumen generado todavía.'
FROM generate_series(1, 12) n;

INSERT INTO public.sesiones (perfil_id, fecha_hora, tipo, estado)
SELECT pg_temp.qa(n),
  CASE WHEN n <= 3 THEN date_trunc('day', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid' + (9 + n * 2) * interval '1 hour'
       ELSE date_trunc('day', now() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid' + interval '1 day' + (9 + n) * interval '1 hour' END,
  'seguimiento', 'programada'
FROM generate_series(1, 5) n;

INSERT INTO public.notas_privadas (perfil_id, contenido)
SELECT pg_temp.qa(n), 'Nota de prueba (QA) sobre el cliente ' || n || ': prefiere planes tranquilos entre semana.'
FROM generate_series(1, 6) n;

-- Sugerencias pendientes para los clientes 1-5 (tres leads cada uno).
INSERT INTO public.match_sugerencias (perfil_id, candidato_id, score, score_reglas, motivos, riesgos, desglose, estado, version_algoritmo)
SELECT pg_temp.qa(c), pg_temp.qa(12 + c * 3 + k), 85 - k * 9 - c, 85 - k * 9 - c,
  ARRAY['Comparten valores', 'Buscan el mismo tipo de relación'], ARRAY['Viven en ciudades distintas'],
  '{"objetivos": 80, "valores": 75, "estiloVida": 70, "personalidad": 65, "geografia": 50, "preferencias": 60}'::jsonb,
  'pendiente', 'qa'
FROM generate_series(1, 5) c, generate_series(0, 2) k;

-- Un match en cada estado. Se crean propuestos y avanzan como en la app, para que los triggers creen (y
-- completen o cancelen) las tareas de informe y feedback que tocan.
INSERT INTO public.matches (perfil_a, perfil_b)
SELECT pg_temp.qa(a), pg_temp.qa(b) FROM (VALUES (1, 26), (2, 27), (3, 28), (4, 29), (5, 14), (6, 16), (9, 20)) m(a, b);  -- 9: Premium, informe sin enviar

UPDATE public.matches SET estado = 'informe_enviado', informe_enviado_at = now() - interval '2 days'
WHERE perfil_a IN (pg_temp.qa(2), pg_temp.qa(3), pg_temp.qa(5));
UPDATE public.matches SET estado = 'cita_agendada', fecha_cita = now() + interval '1 day 8 hours', lugar = 'Café del centro'
WHERE perfil_a = pg_temp.qa(3);
UPDATE public.matches SET estado = 'cita_agendada', fecha_cita = now() - interval '4 days', lugar = 'Restaurante del puerto'
WHERE perfil_a IN (pg_temp.qa(4), pg_temp.qa(5), pg_temp.qa(6));
UPDATE public.matches SET estado = 'cita_realizada' WHERE perfil_a IN (pg_temp.qa(4), pg_temp.qa(5), pg_temp.qa(6));
UPDATE public.matches SET feedback_a = 'Muy a gusto', valoracion_a = 5, quiere_repetir_a = true,
  feedback_b = 'Repetiría', valoracion_b = 4, quiere_repetir_b = true, feedback_at = now() - interval '2 days', estado = 'continuan'
WHERE perfil_a = pg_temp.qa(5);
UPDATE public.matches SET estado = 'cerrado' WHERE perfil_a = pg_temp.qa(6);

-- Avisos y tareas automáticas de todos (sin sesión de usuario, como el proceso programado).
SELECT public.evaluar_automatizaciones();
