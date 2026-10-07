import { describe, expect, it } from "vitest";
import { ordenarTareas, vencimiento } from "@/lib/tareas";

const ahora = new Date("2026-10-07T12:00:00");

describe("vencimiento", () => {
  it("clasifica respecto a ahora", () => {
    expect(vencimiento("2026-10-07T09:00:00", ahora)).toBe("vencida");
    expect(vencimiento("2026-10-07T20:00:00", ahora)).toBe("hoy");
    expect(vencimiento("2026-10-10T10:00:00", ahora)).toBe("semana");
    expect(vencimiento("2026-10-20T10:00:00", ahora)).toBe("despues");
    expect(vencimiento(null, ahora)).toBe("despues");
  });
});

describe("ordenarTareas", () => {
  it("pendientes por vencimiento (sin fecha al final) y después las cerradas, recientes arriba", () => {
    const t = (id: string, estado: string, vence_at: string | null, created_at = "2026-10-01") => ({ id, estado, vence_at, created_at });
    const orden = ordenarTareas([
      t("hecha-vieja", "completada", null, "2026-09-01"),
      t("sin-fecha", "pendiente", null),
      t("tarde", "pendiente", "2026-10-20"),
      t("hecha-nueva", "cancelada", null, "2026-10-05"),
      t("pronto", "pendiente", "2026-10-08"),
    ]).map((x) => x.id);
    expect(orden).toEqual(["pronto", "tarde", "sin-fecha", "hecha-nueva", "hecha-vieja"]);
  });
});
