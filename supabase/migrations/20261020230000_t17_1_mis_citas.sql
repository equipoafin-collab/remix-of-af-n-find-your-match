-- T17.1 · Las citas del cliente en su calendario: sus sesiones con la psicóloga (fecha, duración, tipo y estado;
-- nunca notas, resumen ni vídeo). Las citas con sus matches llegarán con T18 (cuando un match se presente).
-- Vacío si la cuenta no tiene perfil o su área está cerrada.
CREATE OR REPLACE FUNCTION public.mis_citas()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'fecha_hora', s.fecha_hora,
    'duracion_min', s.duracion_min,
    'tipo', s.tipo,
    'estado', s.estado
  ) ORDER BY s.fecha_hora), '[]'::jsonb)
  FROM public.perfiles p
  JOIN public.sesiones s ON s.perfil_id = p.id
  WHERE p.user_id = auth.uid() AND public.perfil_tiene_area(p.id);
$$;

REVOKE EXECUTE ON FUNCTION public.mis_citas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_citas() TO authenticated;
