// T11.2-T11.3 · Stripe sin SDK: la API REST con fetch y la firma de los avisos con Web Crypto.
// Sin dependencias de Deno: Vitest lo prueba (src/lib/__tests__/stripe.test.ts).

export type PlanStripe = "esencial" | "premium";

export interface DatosCheckout {
  perfilId: string;
  email: string;
  plan: PlanStripe;
  meses: number;
  /** Euros al mes con IVA incluido (configuracion.precio_plan). */
  precioMes: number;
  /** Origen de la app (https://… o http://localhost…), para volver tras pagar. */
  origen: string;
  /** Segundos Unix en que caduca el enlace. */
  caducaEn: number;
}

/** Céntimos a cobrar: precio al mes × meses, redondeando el precio al céntimo. */
export const importeCentimos = (precioMes: number, meses: number) => Math.round(precioMes * 100) * meses;

export const conceptoPago = (plan: PlanStripe, meses: number) =>
  `Plan ${plan === "premium" ? "Premium" : "Esencial"} · ${meses} ${meses === 1 ? "mes" : "meses"}`;

/** Cuerpo (form-urlencoded) de POST /v1/checkout/sessions: un pago único del plan completo, en euros. */
export function parametrosCheckout(d: DatosCheckout): URLSearchParams {
  const p = new URLSearchParams({
    mode: "payment",
    locale: "es",
    customer_email: d.email,
    client_reference_id: d.perfilId,
    expires_at: String(d.caducaEn),
    success_url: `${d.origen}/pago/ok`,
    cancel_url: `${d.origen}/pago/cancelado`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(importeCentimos(d.precioMes, d.meses)),
    "line_items[0][price_data][product_data][name]": conceptoPago(d.plan, d.meses),
    "metadata[perfil_id]": d.perfilId,
    "metadata[plan]": d.plan,
    "metadata[meses]": String(d.meses),
    "payment_intent_data[metadata][perfil_id]": d.perfilId,
  });
  return p;
}

const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");

// Comparación en tiempo constante: no deja adivinar la firma por lo que tarda en fallar.
const iguales = (a: string, b: string) =>
  a.length === b.length && [...a].reduce((dif, c, i) => dif | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

/**
 * ¿El aviso viene de Stripe? Cabecera `Stripe-Signature: t=<segundos>,v1=<hmac>[,v1=…]`; la firma es el HMAC-SHA256
 * de `<t>.<cuerpo>` con el secreto del endpoint. Rechaza avisos de hace más de `tolerancia` segundos (reenvíos viejos).
 */
export async function verificarFirmaStripe(cuerpo: string, cabecera: string | null, secreto: string, ahora = Date.now() / 1000, tolerancia = 300): Promise<boolean> {
  if (!cabecera || !secreto) return false;
  const partes = cabecera.split(",").map((parte) => parte.trim().split("="));
  const t = partes.find(([k]) => k === "t")?.[1];
  const firmas = partes.filter(([k]) => k === "v1").map(([, v]) => v ?? "");
  if (!t || !firmas.length || !(Math.abs(ahora - Number(t)) <= tolerancia)) return false;

  const codificar = new TextEncoder();
  const clave = await crypto.subtle.importKey("raw", codificar.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const esperada = hex(await crypto.subtle.sign("HMAC", clave, codificar.encode(`${t}.${cuerpo}`)));
  return firmas.some((f) => iguales(f, esperada));
}
