-- T11.3 · Lo que hace el aviso de Stripe (Edge Function stripe-webhook) en la base de datos, en una transacción.
-- Solo la llama la función, con el service role: nadie desde el navegador.

-- Pago completado: el pago pendiente pasa a pagado y el plan se activa. Idempotente: si Stripe repite el aviso,
-- el pago ya no está pendiente y no se toca nada.
CREATE OR REPLACE FUNCTION public.confirmar_pago_stripe(_checkout_id text, _payment_intent text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _pago public.pagos;
  _sesiones_mes integer;
  _fin date;
BEGIN
  UPDATE public.pagos
  SET estado = 'pagado', pagado_at = now(), fecha = current_date, stripe_payment_intent = _payment_intent
  WHERE stripe_checkout_id = _checkout_id AND estado = 'pendiente'
  RETURNING * INTO _pago;                     -- el trigger de T11.1 copia el plan al perfil
  IF NOT FOUND THEN
    RETURN jsonb_build_object('activado', false);
  END IF;

  SELECT coalesce((valor ->> _pago.plan::text)::integer, 1) INTO _sesiones_mes
  FROM public.configuracion WHERE clave = 'sesiones_por_plan';

  -- Sin plan en curso, empieza hoy; con plan en curso, se alarga. Las sesiones se suman: las realizadas se cuentan
  -- desde siempre (v_clientes), así que las contratadas también.
  UPDATE public.perfiles p
  SET plan_inicio = CASE WHEN p.plan_fin IS NULL OR p.plan_fin < current_date THEN current_date ELSE p.plan_inicio END,
      plan_fin = (greatest(coalesce(p.plan_fin, current_date), current_date) + make_interval(months => coalesce(_pago.meses, 1)))::date,
      sesiones_contratadas = p.sesiones_contratadas + coalesce(_sesiones_mes, 1) * coalesce(_pago.meses, 1)
  WHERE p.id = _pago.perfil_id
  RETURNING p.plan_fin INTO _fin;

  INSERT INTO public.notas_privadas (perfil_id, contenido, automatica)
  VALUES (_pago.perfil_id,
          format('Pago con Stripe: plan %s, %s %s, %s €. Plan hasta el %s.',
                 initcap(_pago.plan::text), _pago.meses, CASE WHEN _pago.meses = 1 THEN 'mes' ELSE 'meses' END,
                 replace(to_char(_pago.importe, 'FM999990.00'), '.', ','), to_char(_fin, 'DD/MM/YYYY')),
          true);
  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id, detalle)
  VALUES (NULL, 'pago_stripe', 'pagos', _pago.id, jsonb_build_object('importe', _pago.importe, 'meses', _pago.meses));

  RETURN jsonb_build_object('activado', true, 'pago_id', _pago.id, 'perfil_id', _pago.perfil_id);
END;
$$;

-- Reembolso: el pago queda marcado y salta un aviso para revisar el plan a mano (no se quita solo).
CREATE OR REPLACE FUNCTION public.reembolsar_pago_stripe(_payment_intent text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _pago public.pagos;
BEGIN
  UPDATE public.pagos SET estado = 'reembolsado'
  WHERE stripe_payment_intent = _payment_intent AND estado = 'pagado'
  RETURNING * INTO _pago;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('reembolsado', false);
  END IF;

  INSERT INTO public.alertas (perfil_id, tipo, severidad, mensaje, clave_unica)
  VALUES (_pago.perfil_id, 'otra', 'aviso',
          format('Pago de %s € reembolsado en Stripe: revisa el plan y las sesiones de %s.', replace(to_char(_pago.importe, 'FM999990.00'), '.', ','), _pago.nombre_completo),
          'reembolso:' || _pago.id)
  ON CONFLICT (clave_unica) DO NOTHING;
  INSERT INTO public.auditoria (user_id, accion, entidad, entidad_id)
  VALUES (NULL, 'reembolso_stripe', 'pagos', _pago.id);

  RETURN jsonb_build_object('reembolsado', true, 'pago_id', _pago.id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirmar_pago_stripe(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reembolsar_pago_stripe(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_pago_stripe(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reembolsar_pago_stripe(text) TO service_role;
