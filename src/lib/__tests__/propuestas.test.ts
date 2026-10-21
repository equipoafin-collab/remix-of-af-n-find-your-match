import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DIAS_RONDA, diasParaCaducar, errorRonda, frasePorDefecto, MAX_FRASE, MOTIVOS_NINGUNA, motivoNinguna, PERSONAS_POR_RONDA, preseleccionar } from "../propuestas";

const s = (id: string, score: number, permiso = true) => ({ candidato_id: id, score, motivos: [`Motivo de ${id}`], candidato: { mostrar_en_propuestas: permiso } });

describe("rondas de propuestas (T19.2)", () => {
  it("preselecciona las 4 mejores con permiso", () => {
    const lista = [s("a", 70), s("b", 95, false), s("c", 90), s("d", 60), s("e", 85), s("f", 80)];
    expect(preseleccionar(lista)).toEqual(["c", "e", "f", "a"]);
  });

  it("con menos de 4 con permiso, las que haya", () => {
    expect(preseleccionar([s("a", 70), s("b", 95, false)])).toEqual(["a"]);
  });

  it("la frase empieza con el primer motivo, recortada", () => {
    expect(frasePorDefecto(["  Busca algo serio  ", "Otro"])).toBe("Busca algo serio");
    expect(frasePorDefecto(["x".repeat(300)])).toHaveLength(MAX_FRASE);
    expect(frasePorDefecto([])).toBe("");
  });

  it("solo se envía con 4 distintas y frases cortas", () => {
    expect(errorRonda(["a", "b", "c"], {})).toMatch(/4 personas/);
    expect(errorRonda(["a", "a", "b", "c"], {})).toMatch(/4 personas/);
    expect(errorRonda(["a", "b", "c", "d"], { a: "x".repeat(MAX_FRASE + 1) })).toMatch(/160/);
    expect(errorRonda(["a", "b", "c", "d"], { a: "Busca algo serio" })).toBeNull();
  });

  it("las mismas reglas que la migración", () => {
    const sql = readFileSync("supabase/migrations/20261020270000_t19_2_rondas_propuestas.sql", "utf8");
    expect(sql).toContain(`cardinality(candidatos) = ${PERSONAS_POR_RONDA}`);
    expect(sql).toContain(`length(f.value #>> '{}') > ${MAX_FRASE}`);
    expect(sql).toContain(`now() + interval '${DIAS_RONDA} days'`);
  });
});

describe("responder la ronda (T19.3)", () => {
  it("el motivo de 'ninguna' va en el formato de T5.3", async () => {
    const { chipsDelMotivo } = await import("../../../supabase/functions/_shared/aprendizaje");
    const motivo = motivoNinguna(["Distancia", "Edad"], "  Prefiero alguien de mi zona ");
    expect(motivo).toBe("Distancia, Edad — Prefiero alguien de mi zona");
    expect(chipsDelMotivo(motivo)).toEqual(["Distancia", "Edad"]);
    expect(motivoNinguna([], "Solo texto")).toBe("Solo texto");
    expect(motivoNinguna(["Valores"], "")).toBe("Valores");
  });

  it("los chips del cliente son los de T5.3 salvo la intuición profesional", async () => {
    const { MOTIVOS_RECHAZO } = await import("../../../supabase/functions/_shared/aprendizaje");
    expect(MOTIVOS_NINGUNA.filter((m) => m !== "Otro")).toEqual(Object.keys(MOTIVOS_RECHAZO).filter((m) => m !== "Intuición profesional"));
  });

  it("días para caducar, redondeando hacia arriba y nunca negativos", () => {
    const ahora = new Date("2026-10-21T10:00:00Z");
    expect(diasParaCaducar("2026-10-28T10:00:00Z", ahora)).toBe(7);
    expect(diasParaCaducar("2026-10-21T12:00:00Z", ahora)).toBe(1);
    expect(diasParaCaducar("2026-10-20T10:00:00Z", ahora)).toBe(0);
  });
});
