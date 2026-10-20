import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { exigirAdmin } from "../_shared/auth.ts";
import { leerConfiguracion } from "../_shared/configuracion.ts";
import { conceptoPago, importeCentimos, parametrosCheckout, type PlanStripe } from "../_shared/stripe.ts";

// T11.2 · Enlace de pago del plan para un cliente (solo admin): crea una Checkout Session de Stripe y deja el pago
// pendiente. El aviso de Stripe (stripe-webhook, T11.3) lo marca como pagado y activa el plan.

const PLANES: PlanStripe[] = ["esencial", "premium"];
const VIGENCIA_S = 23 * 3600 + 50 * 60; // Stripe admite de 30 min a 24 h
const MARGEN_MS = 30 * 60_000;           // no se reutiliza un enlace al que le quede menos de media hora

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = await exigirAdmin(req);
    if (admin instanceof Response) return admin;
    const { supabase, userId } = admin;

    const claveStripe = Deno.env.get("STRIPE_SECRET_KEY");
    if (!claveStripe) return json({ error: "Falta la clave de Stripe (STRIPE_SECRET_KEY) en los Secrets de Lovable Cloud." }, 500);

    const { perfil_id, plan, meses } = await req.json();
    if (typeof perfil_id !== "string") return json({ error: "Falta perfil_id" }, 400);
    if (!PLANES.includes(plan)) return json({ error: "Plan no válido" }, 400);
    if (!Number.isInteger(meses) || meses < 1 || meses > 24) return json({ error: "Los meses van de 1 a 24" }, 400);

    // Vuelta tras pagar a la misma app desde la que se creó el enlace (vista previa, publicada o local).
    const origen = req.headers.get("origin") ?? "";
    if (!/^(https:\/\/[^/]+|http:\/\/localhost(:\d+)?)$/.test(origen)) return json({ error: "Origen no válido" }, 400);

    const { data: perfil, error: errorPerfil } = await supabase
      .from("perfiles").select("id, nombre_completo, email, telefono").eq("id", perfil_id).maybeSingle();
    if (errorPerfil) throw errorPerfil;
    if (!perfil) return json({ error: "No existe el perfil" }, 404);
    const email = (perfil.email ?? "").trim();
    if (!email) return json({ error: "El perfil no tiene email: Stripe lo necesita para el recibo." }, 400);

    const config = await leerConfiguracion<{ precio_plan?: Record<PlanStripe, number> }>(supabase);
    const precioMes = Number(config.precio_plan?.[plan as PlanStripe]);
    if (!(precioMes > 0)) return json({ error: "Falta el precio de ese plan en Configuración." }, 400);
    const importe = importeCentimos(precioMes, meses) / 100;

    // Mismo plan, meses e importe con un enlace aún vigente: se reutiliza en vez de crear otro.
    const { data: pendientes, error: errorPendientes } = await supabase
      .from("pagos").select("enlace_pago, caduca_at, importe")
      .eq("perfil_id", perfil_id).eq("origen", "stripe").eq("estado", "pendiente").eq("plan", plan).eq("meses", meses)
      .gt("caduca_at", new Date(Date.now() + MARGEN_MS).toISOString())
      .order("created_at", { ascending: false }).limit(1);
    if (errorPendientes) throw errorPendientes;
    const vigente = pendientes?.find((p) => Number(p.importe) === importe && p.enlace_pago);
    if (vigente) return json({ enlace: vigente.enlace_pago, importe, caduca_at: vigente.caduca_at, reutilizado: true });

    const caducaEn = Math.floor(Date.now() / 1000) + VIGENCIA_S;
    const respuesta = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${claveStripe}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: parametrosCheckout({ perfilId: perfil_id, email, plan, meses, precioMes, origen, caducaEn }),
    });
    const sesion = await respuesta.json();
    if (!respuesta.ok) return json({ error: `Stripe: ${sesion?.error?.message ?? respuesta.status}` }, 502);

    const caduca_at = new Date(sesion.expires_at * 1000).toISOString();
    const { error: errorPago } = await supabase.from("pagos").insert({
      perfil_id, nombre_completo: perfil.nombre_completo, email, telefono: perfil.telefono,
      plan, meses, importe, origen: "stripe", estado: "pendiente",
      stripe_checkout_id: sesion.id, enlace_pago: sesion.url, caduca_at,
      notas: conceptoPago(plan, meses),
    });
    if (errorPago) throw errorPago;
    await supabase.from("auditoria").insert({ user_id: userId, accion: "crear_enlace_pago", entidad: "perfiles", entidad_id: perfil_id });

    return json({ enlace: sesion.url, importe, caduca_at, reutilizado: false });
  } catch (e) {
    console.error("stripe-checkout error:", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
