import { describe, expect, it } from "vitest";
import { mesesDePlan, sesionesSugeridas } from "@/lib/plan";

const porMes = { esencial: 1, premium: 2 };

describe("mesesDePlan", () => {
  it("cuenta meses completos con ambas fechas incluidas", () => {
    expect(mesesDePlan("2026-10-01", "2026-10-31")).toBe(1);
    expect(mesesDePlan("2026-10-01", "2026-12-31")).toBe(3);
    expect(mesesDePlan("2026-01-01", "2026-12-31")).toBe(12);
    expect(mesesDePlan("2026-10-15", "2027-01-14")).toBe(3);
  });

  it("un plan de pocos días cuenta como 1 mes", () => {
    expect(mesesDePlan("2026-10-01", "2026-10-01")).toBe(1);
  });

  it("sin fechas o con el fin antes del inicio no hay meses", () => {
    expect(mesesDePlan("", "2026-10-31")).toBeNull();
    expect(mesesDePlan("2026-10-31", "2026-10-01")).toBeNull();
  });
});

describe("sesionesSugeridas", () => {
  it("multiplica las sesiones al mes del plan por los meses", () => {
    expect(sesionesSugeridas("premium", "2026-10-01", "2026-12-31", porMes)).toBe(6);
    expect(sesionesSugeridas("esencial", "2026-10-01", "2026-12-31", porMes)).toBe(3);
  });

  it("sin plan o sin fechas válidas no sugiere nada", () => {
    expect(sesionesSugeridas(null, "2026-10-01", "2026-12-31", porMes)).toBeNull();
    expect(sesionesSugeridas("premium", "2026-10-01", "", porMes)).toBeNull();
  });
});
