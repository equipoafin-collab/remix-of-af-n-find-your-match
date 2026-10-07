import { describe, expect, it } from "vitest";
import { PREGUNTAS_CLAVE, PROVINCIAS } from "@/lib/preguntasClave";

const respuestas = (p: Parameters<(typeof PREGUNTAS_CLAVE)[number]["respuesta"]>[0]) =>
  Object.fromEntries(PREGUNTAS_CLAVE.map((q) => [q.clave, q.respuesta(p)]));

const base = {
  tipo_relacion: "Matrimonio",
  hijos: "Quiero tener",
  edad_min_busca: 30,
  edad_max_busca: 40,
  zona: "Madrid",
  ciudad: "Alcalá de Henares",
  acepta_otras_zonas: false,
  valores_importantes: ["Familia", "Humor"],
};

describe("PREGUNTAS_CLAVE", () => {
  it("son las 5 preguntas clave en orden", () => {
    expect(PREGUNTAS_CLAVE.map((q) => q.clave)).toEqual(["tipo_relacion", "hijos", "rango_edad", "zona", "valores_importantes"]);
  });

  it("formatea las respuestas de un perfil", () => {
    expect(respuestas(base)).toEqual({
      tipo_relacion: "Matrimonio",
      hijos: "Quiero tener",
      rango_edad: "30 - 40",
      zona: "Madrid",
      valores_importantes: "Familia, Humor",
    });
  });

  it("sin provincia usa la ciudad e indica si acepta otras zonas", () => {
    const r = respuestas({ ...base, zona: null, ciudad: "Sabadell", acepta_otras_zonas: true });
    expect(r.zona).toBe("Sabadell · abierto/a a otras zonas");
  });

  it("sin rango de edad ni valores no inventa respuesta", () => {
    const r = respuestas({ ...base, edad_min_busca: null, valores_importantes: [] });
    expect(r.rango_edad).toBeNull();
    expect(r.valores_importantes).toBeNull();
  });
});

describe("PROVINCIAS", () => {
  it("las 50 provincias, Ceuta, Melilla y Otra, sin repetir", () => {
    expect(PROVINCIAS).toHaveLength(53);
    expect(new Set(PROVINCIAS).size).toBe(53);
    expect(PROVINCIAS.at(-1)).toBe("Otra");
  });
});
