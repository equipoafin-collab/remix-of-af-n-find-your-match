import type { Enums, Tables } from "@/integrations/supabase/types";

type PagoEstado = Enums<"pago_estado">;
type Pago = Pick<Tables<"pagos">, "estado" | "caduca_at" | "stripe_checkout_id" | "stripe_payment_intent">;

// T11.4 · Cómo se ve cada estado de un pago (ficha y Pagos).
export const ESTADO_PAGO: Record<PagoEstado, { label: string; color: string }> = {
  pendiente: { label: "Pendiente de pago", color: "bg-amber-50 text-amber-700 border-amber-200" },
  pagado: { label: "Pagado", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  caducado: { label: "Enlace caducado", color: "bg-muted text-muted-foreground border-border" },
  reembolsado: { label: "Reembolsado", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

/**
 * Un pendiente cuyo enlace ya caducó se ve como caducado aunque el aviso de Stripe aún no haya llegado.
 * Sin estado (base de datos sin la migración de T11.1), es un pago manual: pagado.
 */
export const estadoVisible = (p: Pago, ahora = new Date()): PagoEstado =>
  p.estado === "pendiente" && p.caduca_at && new Date(p.caduca_at) <= ahora ? "caducado" : p.estado ?? "pagado";

/** El pago en el panel de Stripe (modo de pruebas si la sesión es de pruebas); null si aún no hay cobro. */
export function urlStripe(p: Pago): string | null {
  if (!p.stripe_payment_intent) return null;
  const pruebas = p.stripe_checkout_id?.startsWith("cs_test_") ? "test/" : "";
  return `https://dashboard.stripe.com/${pruebas}payments/${p.stripe_payment_intent}`;
}
