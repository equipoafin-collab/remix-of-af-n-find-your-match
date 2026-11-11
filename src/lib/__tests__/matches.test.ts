import { describe, expect, it } from "vitest";
import { avisoNuevoMatch, embudoMatches, nuevoMatchManual } from "@/lib/matches";
import type { MatchEstado } from "@/types/admin";

describe("embudoMatches", () => {
  it("cuenta los propuestos, los que llegaron a la cita (también cerrados después) y los que continúan", () => {
    const m = (estado: MatchEstado, fecha_cita: string | null = null) => ({ estado, fecha_cita });
    expect(embudoMatches([
      m("propuesto"), m("informe_enviado"), m("cerrado"), // sin cita
      m("cita_agendada", "2026-10-10T19:00:00Z"),
      m("cerrado", "2026-10-01T19:00:00Z"), // se vieron y lo dejaron
      m("continuan"), // pasó a "continúan" sin fecha guardada
    ])).toEqual({ propuestos: 6, conCita: 3, continuan: 1 });
    expect(embudoMatches([])).toEqual({ propuestos: 0, conCita: 0, continuan: 0 });
  });
});

describe("nuevoMatchManual", () => {
  const ahora = new Date("2026-11-11T10:00:00Z");
  const base = { perfilA: "a", perfilB: "b", motivos: ["Los dos queréis formar una familia"], lugar: "  " };

  it("sin fecha: presentado ya y en el estado inicial", () => {
    expect(nuevoMatchManual({ ...base, fechaCita: null }, ahora)).toEqual({
      perfil_a: "a", perfil_b: "b", motivos_cliente: base.motivos, presentado_at: "2026-11-11T10:00:00.000Z",
    });
  });

  it("con fecha: la cita agendada, sin lugar si está en blanco", () => {
    expect(nuevoMatchManual({ ...base, fechaCita: "2026-11-14T19:00:00.000Z" }, ahora)).toMatchObject({
      estado: "cita_agendada", fecha_cita: "2026-11-14T19:00:00.000Z", lugar: null,
    });
  });
});

describe("avisoNuevoMatch", () => {
  it("saluda por el nombre de pila, menciona la cita solo si la hay y lleva el enlace", () => {
    const aviso = avisoNuevoMatch(" Lucía Martín ", "https://afin.app/mi-area/matches", true);
    expect(aviso).toMatch(/^Hola, Lucía:/);
    expect(aviso).toContain("y ya tenéis una cita");
    expect(aviso).toContain("https://afin.app/mi-area/matches");
    expect(avisoNuevoMatch("Lucía", "x", false)).not.toContain("cita");
  });
});
