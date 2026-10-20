import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { limpiarMotivos, MAX_LARGO_MOTIVO, MAX_MOTIVOS_CLIENTE } from "../matches";

describe("limpiarMotivos (T18.1)", () => {
  it("un motivo por línea, sin vacíos ni repetidos", () => {
    expect(limpiarMotivos("  Los dos queréis familia \n\nPlanes activos\nPlanes activos\n")).toEqual(["Los dos queréis familia", "Planes activos"]);
  });

  it("como mucho 5, y cada uno recortado", () => {
    expect(limpiarMotivos("a\nb\nc\nd\ne\nf\ng")).toHaveLength(MAX_MOTIVOS_CLIENTE);
    expect(limpiarMotivos("x".repeat(300))[0]).toHaveLength(MAX_LARGO_MOTIVO);
  });

  it("el máximo coincide con el CHECK de la migración", () => {
    const sql = readFileSync("supabase/migrations/20261020240000_t18_1_presentar_match.sql", "utf8");
    expect(sql).toContain(`cardinality(motivos_cliente) <= ${MAX_MOTIVOS_CLIENTE}`);
  });
});
