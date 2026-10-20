-- T13.3 · Fuera la subida anónima abierta a antecedentes (T0.2): desde ahora solo se sube con el enlace personal
-- (URL firmada que da subir-documento). APLICAR DESPUÉS de volver a publicar la web en Lovable: la versión publicada
-- anterior sube sin enlace y dejaría de funcionar antes de tiempo.
DROP POLICY IF EXISTS "Subida anonima antecedentes" ON storage.objects;
