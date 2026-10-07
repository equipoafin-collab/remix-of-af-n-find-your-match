import { describe, expect, it } from "vitest";
import { inicioNuevos, rangoDeHoy, valorDeUrl } from "@/lib/dashboard";

describe("fechas del Dashboard", () => {
  it("cuentan en hora local aunque en UTC ya sea otro día", () => {
    // 00:30 locales: con toISOString().slice(0, 10) saldría el día anterior en Madrid.
    const ahora = new Date(2026, 9, 7, 0, 30);
    expect(inicioNuevos(ahora).fecha).toBe("2026-09-07");
    expect(new Date(inicioNuevos(ahora).instante)).toEqual(new Date(2026, 8, 7));
    expect(rangoDeHoy(ahora)).toEqual({ desde: new Date(2026, 9, 7).toISOString(), hasta: new Date(2026, 9, 8).toISOString() });
  });
});

describe("valorDeUrl", () => {
  it("solo acepta valores válidos", () => {
    const params = new URLSearchParams("tipo=enviar_informe&estado=inventado");
    expect(valorDeUrl(params, "tipo", ["enviar_informe", "manual"])).toBe("enviar_informe");
    expect(valorDeUrl(params, "estado", ["activo"])).toBeUndefined();
    expect(valorDeUrl(params, "falta", ["activo"])).toBeUndefined();
  });
});
