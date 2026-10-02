-- T2.2 · Notas privadas con historial (datos de salud, RGPD art. 9: solo admin).
-- notas_admin se copia como primera nota y queda deprecada hasta T9.5.

DO $$
BEGIN
  IF to_regclass('public.notas_privadas') IS NULL THEN
    CREATE TABLE public.notas_privadas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      perfil_id uuid NOT NULL REFERENCES public.perfiles (id) ON DELETE CASCADE,
      sesion_id uuid REFERENCES public.sesiones (id) ON DELETE SET NULL,
      contenido text NOT NULL CHECK (length(trim(contenido)) > 0),
      automatica boolean NOT NULL DEFAULT false,   -- la crea el sistema (p. ej. un cambio de estado)
      created_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE SET NULL
    );

    -- Solo al crear la tabla: reaplicar la migración no vuelve a copiar notas ya borradas.
    INSERT INTO public.notas_privadas (perfil_id, contenido, created_by)
    SELECT id, notas_admin, NULL FROM public.perfiles
    WHERE length(trim(coalesce(notas_admin, ''))) > 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notas_privadas_perfil_fecha ON public.notas_privadas (perfil_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notas_privadas_sesion ON public.notas_privadas (sesion_id);

ALTER TABLE public.notas_privadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestiona notas privadas" ON public.notas_privadas;
CREATE POLICY "Admin gestiona notas privadas"
ON public.notas_privadas FOR ALL
TO authenticated
USING ((SELECT public.has_role(auth.uid(), 'admin')))
WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin')));

-- Una nota escrita por la psicóloga cuenta como seguimiento; las automáticas no.
CREATE OR REPLACE FUNCTION public.notas_marcar_seguimiento()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.perfiles SET ultimo_seguimiento_at = NEW.created_at WHERE id = NEW.perfil_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notas_seguimiento ON public.notas_privadas;
CREATE TRIGGER notas_seguimiento
AFTER INSERT ON public.notas_privadas
FOR EACH ROW WHEN (NOT NEW.automatica)
EXECUTE FUNCTION public.notas_marcar_seguimiento();

-- Amplía T1.5: el cambio de estado deja también una nota automática.
CREATE OR REPLACE FUNCTION public.cambiar_estado_cliente(
  _perfil_id uuid,
  _nuevo_estado public.estado_cliente,
  _motivo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER   -- auditoria no admite INSERT directo; la comprobación de admin va dentro
SET search_path = ''
AS $$
DECLARE
  _anterior public.estado_cliente;
  _motivo_limpio text := nullif(trim(_motivo), '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo una administradora puede cambiar el estado de un cliente' USING ERRCODE = '42501';
  END IF;

  SELECT estado_cliente INTO _anterior FROM public.perfiles WHERE id = _perfil_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe el perfil %', _perfil_id USING ERRCODE = 'P0002';
  END IF;
  IF _anterior = _nuevo_estado THEN
    RETURN;
  END IF;

  UPDATE public.perfiles SET estado_cliente = _nuevo_estado WHERE id = _perfil_id;  -- el trigger sella estado_cambiado_at

  -- AMPLIAR EN T4.1: baja → caducar match_sugerencias pendientes del cliente y las que le tienen como candidato;
  --                  pausado/finalizado → caducar las pendientes donde aparece como candidato.
  -- AMPLIAR EN T6.2: baja → cancelar sus tareas pendientes (pausado/finalizado las conservan).
  -- AMPLIAR EN T7.1: baja → resolver sus alertas abiertas.

  INSERT INTO public.notas_privadas (perfil_id, contenido, automatica)
  VALUES (
    _perfil_id,
    format('Cambio de estado: %s → %s.', _anterior, _nuevo_estado) || coalesce(' Motivo: ' || _motivo_limpio, ''),
    true
  );

  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id, detalle)
  VALUES (
    auth.uid(), 'cambiar_estado', 'perfiles', _perfil_id,
    jsonb_build_object('de', _anterior, 'a', _nuevo_estado, 'motivo', _motivo_limpio)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cambiar_estado_cliente(uuid, public.estado_cliente, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cambiar_estado_cliente(uuid, public.estado_cliente, text) TO authenticated;
