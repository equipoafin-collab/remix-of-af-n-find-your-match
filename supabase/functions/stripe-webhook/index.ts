import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { json } from "../_shared/http.ts";
import { verificarFirmaStripe } from "../_shared/stripe.ts";

// T11.3 · Avisos de Stripe. Pública (Stripe no lleva sesión), pero solo atiende avisos firmados con el secreto del
// endpoint (STRIPE_WEBHOOK_SECRET). Lo que cambia en la base de datos lo hacen confirmar_pago_stripe y
// reembolsar_pago_stripe en una transacción, y son idempotentes: Stripe puede repetir un aviso sin efectos dobles.
// Un error responde 500 para que Stripe lo reintente.

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const secreto = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!secreto) return json({ error: "Falta STRIPE_WEBHOOK_SECRET" }, 500);

    const cuerpo = await req.text(); // la firma se calcula sobre el texto tal cual llega
    if (!(await verificarFirmaStripe(cuerpo, req.headers.get("stripe-signature"), secreto))) {
      return json({ error: "Firma no válida" }, 400);
    }

    const evento = JSON.parse(cuerpo);
    const objeto = evento?.data?.object ?? {};
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let resultado: unknown = null;

    switch (evento.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        // Con métodos de pago diferidos, "completed" llega sin cobrar todavía: se espera a "async_payment_succeeded".
        if (objeto.payment_status === "paid") {
          const { data, error } = await supabase.rpc("confirmar_pago_stripe", { _checkout_id: objeto.id, _payment_intent: objeto.payment_intent });
          if (error) throw error;
          resultado = data;
        }
        break;

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const { error } = await supabase
          .from("pagos").update({ estado: "caducado" }).eq("stripe_checkout_id", objeto.id).eq("estado", "pendiente");
        if (error) throw error;
        break;
      }

      case "charge.refunded":
        // Solo el reembolso completo; uno parcial se ve en Stripe y no cambia el pago.
        if (objeto.refunded === true && objeto.payment_intent) {
          const { data, error } = await supabase.rpc("reembolsar_pago_stripe", { _payment_intent: objeto.payment_intent });
          if (error) throw error;
          resultado = data;
        }
        break;
    }

    return json({ recibido: true, tipo: evento.type, resultado });
  } catch (e) {
    console.error("stripe-webhook error:", e instanceof Error ? e.message : e);
    return json({ error: "Error al procesar el aviso" }, 500);
  }
});
