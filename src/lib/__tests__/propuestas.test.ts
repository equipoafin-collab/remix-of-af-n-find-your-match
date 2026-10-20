import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DIAS_RONDA, errorRonda, frasePorDefecto, MAX_FRASE, PERSONAS_POR_RONDA, preseleccionar } from "../propuestas";

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
