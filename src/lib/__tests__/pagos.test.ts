import { describe, expect, it } from "vitest";
import { estadoVisible, urlStripe } from "@/lib/pagos";

const ahora = new Date("2026-10-20T12:00:00Z");
const pago = (cambios = {}) => ({ estado: "pendiente" as const, caduca_at: "2026-10-21T10:00:00Z", stripe_checkout_id: "cs_test_a1", stripe_payment_intent: null, ...cambios });

describe("estadoVisible", () => {
  it("un pendiente con el enlace caducado se ve como caducado", () => {
    expect(estadoVisible(pago(), ahora)).toBe("pendiente");
    expect(estadoVisible(pago({ caduca_at: "2026-10-20T11:59:00Z" }), ahora)).toBe("caducado");
    expect(estadoVisible(pago({ estado: "pagado", caduca_at: "2026-10-01T00:00:00Z" }), ahora)).toBe("pagado");
    expect(estadoVisible(pago({ estado: undefined, caduca_at: null }), ahora)).toBe("pagado");
  });
});

describe("urlStripe", () => {
  it("enlaza al pago en el modo que toca, y a nada si aún no se ha cobrado", () => {
    expect(urlStripe(pago())).toBeNull();
    expect(urlStripe(pago({ stripe_payment_intent: "pi_1" }))).toBe("https://dashboard.stripe.com/test/payments/pi_1");
    expect(urlStripe(pago({ stripe_checkout_id: "cs_live_a1", stripe_payment_intent: "pi_2" }))).toBe("https://dashboard.stripe.com/payments/pi_2");
  });
});
