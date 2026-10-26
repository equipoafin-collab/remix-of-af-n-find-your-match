import { describe, expect, it } from "vitest";
import { calculateDisc } from "@/components/DiscSurvey";
import { DISC_META, resumenDisc } from "../disc";

describe("resumenDisc", () => {
  it("principal y secundario por puntuación, con porcentajes redondeados", () => {
    const r = resumenDisc({ D: 1, I: 4, S: 2, C: 1 });
    expect(r.primary).toBe("I");
    expect(r.secondary).toBe("S");
    expect(r.percents).toEqual({ D: 13, I: 50, S: 25, C: 13 });
  });

  it("los empates van en el orden D, I, S, C, igual que calculateDisc", () => {
    const respuestas = { 0: "S", 1: "C", 2: "S", 3: "C" } as const;
    const { perfil, scores } = calculateDisc(respuestas);
    const r = resumenDisc(scores);
    expect(r.primary).toBe(perfil);
    expect([r.primary, r.secondary]).toEqual(["S", "C"]);
  });

  it("sin respuestas: D e I al 0 %, sin dividir entre cero", () => {
    expect(resumenDisc(null)).toEqual({ primary: "D", secondary: "I", percents: { D: 0, I: 0, S: 0, C: 0 } });
    expect(resumenDisc({ D: 0, I: 0, S: 0, C: 0 }).percents).toEqual({ D: 0, I: 0, S: 0, C: 0 });
  });

  it("hay textos de los cuatro tipos", () => {
    expect(Object.keys(DISC_META).sort()).toEqual(["C", "D", "I", "S"]);
    expect(DISC_META.I.title).toBe("Influyente");
  });

  it("cada tipo explica cómo quiere, con el verbo querer", () => {
    (["D", "I", "S", "C"] as const).forEach((t) => {
      expect(DISC_META[t].querer).toMatch(/quieres/i);
    });
    const textos = Object.values(DISC_META).flatMap((m) => [
      m.description, m.enPareja, m.querer, m.conflicto, ...m.fortalezas, ...m.mejoras, ...m.necesidades,
    ]);
    expect(textos.some((s) => /\bamar\b|\bamor\b|\bama\b|\bamando\b|\bamado\b/i.test(s))).toBe(false);
  });
});
