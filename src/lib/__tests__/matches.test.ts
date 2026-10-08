import { describe, expect, it } from "vitest";
import { embudoMatches } from "@/lib/matches";
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
