import { describe, expect, it } from "vitest";
// Código compartido de las Edge Functions (sin dependencias de Deno).
import { parsearJSON } from "../../../supabase/functions/_shared/json";
import { validarResumen } from "../../../supabase/functions/_shared/resumen";

describe("parsearJSON", () => {
  it("lee JSON limpio y JSON envuelto en markdown", () => {
    expect(parsearJSON('{"a":1}')).toEqual({ a: 1 });
    expect(parsearJSON('Aquí tienes:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("devuelve null si no hay JSON", () => {
    expect(parsearJSON("lo siento, no puedo")).toBeNull();
    expect(parsearJSON("{roto")).toBeNull();
    expect(parsearJSON(undefined)).toBeNull();
  });
});

describe("validarResumen", () => {
  const completo = {
    estado_emocional: " Más tranquila que la última vez ",
    temas_tratados: ["Ruptura anterior", "  "],
    avances: ["Ya no evita hablar de su ex"],
    objetivos: ["Conocer a alguien con quien formar familia"],
    proximos_pasos: ["Presentarle dos candidatos"],
    preferencias_detectadas: ["Prefiere a alguien de su ciudad"],
  };

  it("acepta un resumen completo y limpia espacios y entradas vacías", () => {
    expect(validarResumen(completo)).toEqual({
      ...completo,
      estado_emocional: "Más tranquila que la última vez",
      temas_tratados: ["Ruptura anterior"],
    });
  });

  it("preferencias_detectadas es opcional", () => {
    const { preferencias_detectadas, ...sinPreferencias } = completo;
    expect(validarResumen(sinPreferencias)?.preferencias_detectadas).toEqual([]);
  });

  it("descarta valores que no son texto dentro de las listas", () => {
    expect(validarResumen({ ...completo, avances: ["Sí", 3, null] })?.avances).toEqual(["Sí"]);
  });

  it("rechaza si falta el estado emocional o una lista principal", () => {
    expect(validarResumen({ ...completo, estado_emocional: "" })).toBeNull();
    expect(validarResumen({ ...completo, objetivos: "uno" })).toBeNull();
    const { proximos_pasos, ...sinPasos } = completo;
    expect(validarResumen(sinPasos)).toBeNull();
    expect(validarResumen(null)).toBeNull();
  });
});
