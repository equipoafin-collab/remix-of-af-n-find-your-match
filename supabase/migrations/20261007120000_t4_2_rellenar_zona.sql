-- T4.2 · Rellena perfiles.zona a partir de la ciudad cuando esta es el nombre de una provincia
-- (los perfiles nuevos la eligen en el cuestionario). Solo toca los que no tienen zona: reaplicarla no pisa nada.
-- Las provincias son las de src/lib/preguntasClave.ts (PROVINCIAS), más los nombres alternativos más comunes.
UPDATE public.perfiles p
SET zona = v.provincia
FROM (VALUES
  ('Álava', 'Álava'), ('Araba', 'Álava'), ('Albacete', 'Albacete'), ('Alicante', 'Alicante'), ('Alacant', 'Alicante'),
  ('Almería', 'Almería'), ('Asturias', 'Asturias'), ('Ávila', 'Ávila'), ('Badajoz', 'Badajoz'),
  ('Baleares', 'Baleares'), ('Islas Baleares', 'Baleares'), ('Illes Balears', 'Baleares'),
  ('Barcelona', 'Barcelona'), ('Bizkaia', 'Bizkaia'), ('Vizcaya', 'Bizkaia'), ('Burgos', 'Burgos'),
  ('Cáceres', 'Cáceres'), ('Cádiz', 'Cádiz'), ('Cantabria', 'Cantabria'), ('Castellón', 'Castellón'),
  ('Castelló', 'Castellón'), ('Ceuta', 'Ceuta'), ('Ciudad Real', 'Ciudad Real'), ('Córdoba', 'Córdoba'),
  ('A Coruña', 'A Coruña'), ('La Coruña', 'A Coruña'), ('Coruña', 'A Coruña'), ('Cuenca', 'Cuenca'),
  ('Gipuzkoa', 'Gipuzkoa'), ('Guipúzcoa', 'Gipuzkoa'), ('Girona', 'Girona'), ('Gerona', 'Girona'),
  ('Granada', 'Granada'), ('Guadalajara', 'Guadalajara'), ('Huelva', 'Huelva'), ('Huesca', 'Huesca'),
  ('Jaén', 'Jaén'), ('León', 'León'), ('Lleida', 'Lleida'), ('Lérida', 'Lleida'), ('Lugo', 'Lugo'),
  ('Madrid', 'Madrid'), ('Málaga', 'Málaga'), ('Melilla', 'Melilla'), ('Murcia', 'Murcia'), ('Navarra', 'Navarra'),
  ('Ourense', 'Ourense'), ('Orense', 'Ourense'), ('Palencia', 'Palencia'), ('Las Palmas', 'Las Palmas'),
  ('Pontevedra', 'Pontevedra'), ('La Rioja', 'La Rioja'), ('Salamanca', 'Salamanca'),
  ('Santa Cruz de Tenerife', 'Santa Cruz de Tenerife'), ('Tenerife', 'Santa Cruz de Tenerife'),
  ('Segovia', 'Segovia'), ('Sevilla', 'Sevilla'), ('Soria', 'Soria'), ('Tarragona', 'Tarragona'),
  ('Teruel', 'Teruel'), ('Toledo', 'Toledo'), ('Valencia', 'Valencia'), ('València', 'Valencia'),
  ('Valladolid', 'Valladolid'), ('Zamora', 'Zamora'), ('Zaragoza', 'Zaragoza')
) AS v (nombre, provincia)
WHERE p.zona IS NULL
  -- Sin tildes ni mayúsculas en los dos lados ("madrid", "MALAGA" o " Cádiz " casan).
  AND lower(translate(trim(p.ciudad), 'áàâäéèêëíìîïóòôöúùûüÁÀÂÄÉÈÊËÍÌÎÏÓÒÔÖÚÙÛÜ', 'aaaaeeeeiiiioooouuuuAAAAEEEEIIIIOOOOUUUU'))
    = lower(translate(v.nombre, 'áàâäéèêëíìîïóòôöúùûüÁÀÂÄÉÈÊËÍÌÎÏÓÒÔÖÚÙÛÜ', 'aaaaeeeeiiiioooouuuuAAAAEEEEIIIIOOOOUUUU'));
