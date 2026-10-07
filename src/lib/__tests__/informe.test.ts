import { describe, expect, it } from "vitest";
import { parsearJSON } from "../../../supabase/functions/_shared/json";
import { validarInforme } from "../../../supabase/functions/_shared/informe";

const valido = {
  score: 78.6,
  nivel: "Alto",
  resumen: " Comparten proyecto de familia. ",
  fortalezas: ["Quieren hijos", " "],
  fricciones: ["Ciudades distintas"],
  preguntas_sugeridas: ["¿Cómo os imagináis dentro de cinco años?"],
  analisis_detallado: "Buena base.",
};

describe("validarInforme", () => {
  it("limpia un informe válido, aunque venga envuelto en markdown", () => {
    const raw = parsearJSON("```json\n" + JSON.stringify(valido) + "\n```");
    expect(validarInforme(raw)).toEqual({
      score: 79,
      nivel: "Alto",
      resumen: "Comparten proyecto de familia.",
      fortalezas: ["Quieren hijos"],
      fricciones: ["Ciudades distintas"],
      preguntas_sugeridas: ["¿Cómo os imagináis dentro de cinco años?"],
      analisis_detallado: "Buena base.",
    });
  });

  it("acota el score y deduce el nivel si no es uno de los previstos", () => {
    expect(validarInforme({ ...valido, score: 130, nivel: "Excelente" })).toMatchObject({ score: 100, nivel: "Muy Alto" });
    expect(validarInforme({ ...valido, score: 45, nivel: "" })).toMatchObject({ nivel: "Medio" });
  });

  it("rechaza informes incompletos", () => {
    expect(validarInforme(null)).toBeNull();
    expect(validarInforme({ ...valido, resumen: " " })).toBeNull();
    expect(validarInforme({ ...valido, fortalezas: "muchas" })).toBeNull();
    expect(validarInforme({ ...valido, score: "alto" })).toBeNull();
  });
});
