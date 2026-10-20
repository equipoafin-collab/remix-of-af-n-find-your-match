import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { conceptoPago, importeCentimos, pagoCobradoReciente, parametrosCheckout, SESION_CHECKOUT, verificarFirmaStripe } from "../../../supabase/functions/_shared/stripe";

describe("parametrosCheckout", () => {
  const p = parametrosCheckout({
    perfilId: "perfil-1", email: "ana@x.es", plan: "premium", meses: 3, precioMes: 250,
    origen: "https://afin.example", caducaEn: 1_800_000_000,
  });

  it("un pago único del plan completo, en euros y con IVA incluido", () => {
    expect(p.get("mode")).toBe("payment");
    expect(p.get("line_items[0][price_data][currency]")).toBe("eur");
    expect(p.get("line_items[0][price_data][unit_amount]")).toBe("75000");
    expect(p.get("line_items[0][price_data][product_data][name]")).toBe("Plan Premium · 3 meses");
  });

  it("lleva el perfil para que el aviso de Stripe sepa a quién activar el plan", () => {
    expect(p.get("client_reference_id")).toBe("perfil-1");
    expect(p.get("metadata[perfil_id]")).toBe("perfil-1");
    expect(p.get("payment_intent_data[metadata][perfil_id]")).toBe("perfil-1");
    expect(p.get("success_url")).toBe("https://afin.example/pago/ok?session_id={CHECKOUT_SESSION_ID}");
    expect(p.get("cancel_url")).toBe("https://afin.example/pago/cancelado");
  });

  it("redondea el precio al céntimo y nombra bien un mes", () => {
    expect(importeCentimos(159.995, 2)).toBe(32000);
    expect(conceptoPago("esencial", 1)).toBe("Plan Esencial · 1 mes");
  });
});

describe("verificarFirmaStripe", () => {
  const secreto = "whsec_prueba";
  const cuerpo = '{"type":"checkout.session.completed"}';
  const ahora = 1_800_000_000;
  const firma = (t: number, c = cuerpo) => createHmac("sha256", secreto).update(`${t}.${c}`).digest("hex");

  it("acepta la firma de Stripe, también entre varias v1", async () => {
    expect(await verificarFirmaStripe(cuerpo, `t=${ahora},v1=${firma(ahora)}`, secreto, ahora)).toBe(true);
    expect(await verificarFirmaStripe(cuerpo, `t=${ahora},v1=${"0".repeat(64)},v1=${firma(ahora)}`, secreto, ahora)).toBe(true);
  });

  it("rechaza un cuerpo cambiado, otro secreto, un aviso viejo o sin cabecera", async () => {
    expect(await verificarFirmaStripe(cuerpo + " ", `t=${ahora},v1=${firma(ahora)}`, secreto, ahora)).toBe(false);
    expect(await verificarFirmaStripe(cuerpo, `t=${ahora},v1=${firma(ahora)}`, "whsec_otro", ahora)).toBe(false);
    expect(await verificarFirmaStripe(cuerpo, `t=${ahora - 301},v1=${firma(ahora - 301)}`, secreto, ahora)).toBe(false);
    expect(await verificarFirmaStripe(cuerpo, null, secreto, ahora)).toBe(false);
    expect(await verificarFirmaStripe(cuerpo, `v1=${firma(ahora)}`, secreto, ahora)).toBe(false);
  });
});

describe("vuelta del pago (T15.3)", () => {
  const ahora = 1_800_000_000;
  const cobrada = { status: "complete", payment_status: "paid", created: ahora - 3600 };

  it("solo sirve una sesión cobrada de hace 7 días como mucho", () => {
    expect(pagoCobradoReciente(cobrada, ahora)).toBe(true);
    expect(pagoCobradoReciente({ ...cobrada, created: ahora - 7 * 86_400 }, ahora)).toBe(true);
    expect(pagoCobradoReciente({ ...cobrada, created: ahora - 7 * 86_400 - 1 }, ahora)).toBe(false);
    expect(pagoCobradoReciente({ ...cobrada, payment_status: "unpaid" }, ahora)).toBe(false); // pago diferido aún sin cobrar
    expect(pagoCobradoReciente({ ...cobrada, status: "open" }, ahora)).toBe(false);
    expect(pagoCobradoReciente({ status: "complete", payment_status: "paid" }, ahora)).toBe(false);
  });

  it("reconoce los ids de Checkout Session y nada más", () => {
    expect(SESION_CHECKOUT.test("cs_test_a1B2c3")).toBe(true);
    expect(SESION_CHECKOUT.test("cs_live_a1B2c3")).toBe(true);
    expect(SESION_CHECKOUT.test("cs_test_a1/../x")).toBe(false);
    expect(SESION_CHECKOUT.test("pi_123")).toBe(false);
  });
});
