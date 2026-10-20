import { describe, expect, it } from "vitest";
import { avisarFinPlan, cuandoCita, diasHastaFin, fechaLarga, SOLICITUDES, solicitudesDisponibles } from "../areaCliente";

const hoy = new Date(2026, 9, 20, 23, 30); // 20/10/2026 por la noche, hora local

describe("fin del plan", () => {
  it("cuenta días enteros desde hoy, sin importar la hora", () => {
    expect(diasHastaFin("2026-10-20", hoy)).toBe(0);
    expect(diasHastaFin("2026-10-21", hoy)).toBe(1);
    expect(diasHastaFin("2026-10-19", hoy)).toBe(-1);
  });

  it("avisa desde 15 días antes hasta el último día, no después ni sin fecha", () => {
    expect(avisarFinPlan("2026-11-04", hoy)).toBe(true);
    expect(avisarFinPlan("2026-11-05", hoy)).toBe(false);
    expect(avisarFinPlan("2026-10-20", hoy)).toBe(true);
    expect(avisarFinPlan("2026-10-19", hoy)).toBe(false);
    expect(avisarFinPlan(null, hoy)).toBe(false);
  });

  it("pone el año solo si no es el actual", () => {
    expect(fechaLarga("2026-11-04", hoy)).toBe("4 de noviembre");
    expect(fechaLarga("2027-01-15", hoy)).toBe("15 de enero de 2027");
  });
});

describe("cuandoCita", () => {
  const ahora = new Date(2026, 9, 20, 10, 0);
  it("dice hoy, mañana o el día de la semana", () => {
    expect(cuandoCita(new Date(2026, 9, 20, 18, 0).toISOString(), ahora)).toBe("hoy a las 18:00");
    expect(cuandoCita(new Date(2026, 9, 21, 9, 5).toISOString(), ahora)).toBe("mañana a las 09:05");
    expect(cuandoCita(new Date(2026, 9, 23, 18, 0).toISOString(), ahora)).toBe("el viernes 23 de octubre a las 18:00");
  });
});

describe("solicitudes a la psicóloga (T16.3)", () => {
  it("los mismos tipos que pedir_a_psicologa", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync("supabase/migrations/20261020220000_t16_3_solicitudes.sql", "utf8");
    const tipos = [...sql.matchAll(/^\s+\('([a-z]+)', '/gm)].map((m) => m[1]);
    expect(tipos.sort()).toEqual(Object.keys(SOLICITUDES).sort());
  });

  it("ofrece pausar o reanudar según esté, además de la copia de datos y la baja", () => {
    expect(solicitudesDisponibles(false)).toEqual(["pausa", "datos", "baja"]);
    expect(solicitudesDisponibles(true)).toEqual(["reanudar", "datos", "baja"]);
  });
});
