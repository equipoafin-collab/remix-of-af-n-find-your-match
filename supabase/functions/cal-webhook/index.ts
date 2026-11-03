import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { json } from "../_shared/http.ts";
import { leerAvisoCal, verificarFirmaCal } from "../_shared/cal.ts";

// T9.4 · Avisos de cal.com de la "Cita en Afín" (el webhook se da de alta en esa cita, no en toda la cuenta: la sesión
// de descubrimiento es de leads y no crea nada). Pública, pero solo atiende avisos firmados con CAL_WEBHOOK_SECRET.
// registrar_reserva_cal crea, mueve o cancela la sesión en una transacción y es idempotente: cal.com puede repetir un
// aviso sin efectos dobles. Un error responde 500 para que cal.com lo reintente.

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const secreto = Deno.env.get("CAL_WEBHOOK_SECRET");
    if (!secreto) return json({ error: "Falta CAL_WEBHOOK_SECRET" }, 500);

    const cuerpo = await req.text(); // la firma se calcula sobre el texto tal cual llega
    if (!(await verificarFirmaCal(cuerpo, req.headers.get("x-cal-signature-256"), secreto))) {
      return json({ error: "Firma no válida" }, 401);
    }

    const reserva = leerAvisoCal(JSON.parse(cuerpo));
    if (!reserva) return json({ recibido: true, resultado: null });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase.rpc("registrar_reserva_cal", {
      _accion: reserva.accion,
      _uid: reserva.uid,
      _uid_anterior: reserva.uidAnterior,
      _email: reserva.email,
      _nombre: reserva.nombre,
      _inicio: reserva.inicio,
      _duracion: reserva.duracionMin,
    });
    if (error) throw error;

    return json({ recibido: true, resultado: data });
  } catch (e) {
    console.error("cal-webhook error:", e instanceof Error ? e.message : e);
    return json({ error: "Error al procesar el aviso" }, 500);
  }
});
