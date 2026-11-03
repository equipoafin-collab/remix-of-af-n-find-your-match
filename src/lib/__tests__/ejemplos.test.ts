import { describe, expect, it } from "vitest";
import {
  describirEjemplo, desgloseEjemplo, promptEjemplos, validarEjemplos, type DatosEjemplos,
} from "../../../supabase/functions/_shared/ejemplos";
import { calcularAjustes, decisionesDeRondas } from "../../../supabase/functions/_shared/aprendizaje";
import { errorEjemplos, type PerfilEjemplo } from "@/lib/propuestas";

const perfil = (dimension: string, extra: Record<string, unknown> = {}) => ({
  dimension, nombre: " Marta ", edad: 34, zona: "Chamberí, Madrid", aficiones: "pádel, cine, cocina",
  rasgo: "Sale a correr cada mañana y los domingos se va a la sierra.", cambio: "Mucho más activa que él", ...extra,
});
const cuatro = () => ["edad", "estilo_de_vida", "valores", "ambicion"].map((d) => perfil(d));

describe("validarEjemplos", () => {
  it("acepta 4 perfiles, uno por dimensión, y limpia los textos", () => {
    const v = validarEjemplos({ perfiles: cuatro() });
    expect(v).toHaveLength(4);
    expect(v![0].nombre).toBe("Marta");
    expect(v!.map((p) => p.dimension)).toEqual(["edad", "estilo_de_vida", "valores", "ambicion"]);
  });

  it("rechaza menos de 4, dimensiones repetidas o desconocidas, edad fuera de rango o sin rasgo", () => {
    expect(validarEjemplos({ perfiles: cuatro().slice(0, 3) })).toBeNull();
    expect(validarEjemplos({ perfiles: [...cuatro().slice(0, 3), perfil("edad")] })).toBeNull();
    expect(validarEjemplos({ perfiles: [...cuatro().slice(0, 3), perfil("religion")] })).toBeNull();
    expect(validarEjemplos({ perfiles: [perfil("edad", { edad: 15 }), ...cuatro().slice(1)] })).toBeNull();
    expect(validarEjemplos({ perfiles: [perfil("edad", { rasgo: "  " }), ...cuatro().slice(1)] })).toBeNull();
    expect(validarEjemplos(null)).toBeNull();
  });

  it("redondea la edad y recorta los textos largos", () => {
    const v = validarEjemplos({ perfiles: [perfil("edad", { edad: "41.6", rasgo: "x".repeat(300) }), ...cuatro().slice(1)] });
    expect(v![0].edad).toBe(42);
    expect(v![0].rasgo).toHaveLength(160);
  });
});

describe("desgloseEjemplo", () => {
  it("encaja en todo menos en lo que cambia; edad y ambición no tienen dimensión", () => {
    expect(desgloseEjemplo("valores")).toMatchObject({ valores: 40, objetivos: 80, estiloVida: 80, geografia: 80 });
    expect(desgloseEjemplo("estilo_de_vida")).toMatchObject({ estiloVida: 40, valores: 80 });
    expect(desgloseEjemplo("edad")).toBeNull();
    expect(desgloseEjemplo("ambicion")).toBeNull();
  });

  it("elegir siempre el de otros valores baja el peso de valores", () => {
    const ejemplos = ["edad", "estilo_de_vida", "valores", "ambicion"].map((dimension, i) => ({ id: `e${i}`, dimension: dimension as PerfilEjemplo["dimension"] }));
    const rondas = [1, 2, 3].map(() => ({ candidatos: [], elegido_id: null, ninguno: false, motivo: null, ejemplos, elegido_ejemplo: "e2" }));
    const d = decisionesDeRondas(rondas, new Map());
    expect(d.filter((x) => x.estado === "aceptada")).toHaveLength(3);
    const ajustes = calcularAjustes(d);
    expect(ajustes.valores).toBeLessThan(1);
    expect(ajustes.estiloVida).toBeGreaterThan(1);
  });
});

describe("promptEjemplos y describirEjemplo", () => {
  const datos: DatosEjemplos = {
    genero: "hombre", busca_genero: "mujer", edad: 36, edad_min_busca: 30, edad_max_busca: 38, ciudad: "Madrid", zona: "Chamberí",
    acepta_otras_zonas: false, tipo_relacion: "seria", hijos: "no", valores_importantes: ["familia", "honestidad"],
    hobbies: "cine, montaña", fin_de_semana: "planes tranquilos", estilo_vida_activo: 2, ambicion_profesional: 4,
    preferencias: { valora: ["Alguien de Madrid"], evita: [] },
  };

  it("lleva lo que busca y lo aprendido, sin datos de contacto", () => {
    const t = promptEjemplos(datos);
    expect(t).toContain("mujer, de 30-38 años");
    expect(t).toContain("familia, honestidad");
    expect(t).toContain("Valora (aprendido): Alguien de Madrid");
    expect(t).not.toContain("Evita");
  });

  it("describe el perfil para la IA como inventado y con lo que cambia", () => {
    expect(describirEjemplo({ dimension: "valores", edad: 34, zona: "Madrid", cambio: "No quiere hijos", rasgo: "x" }))
      .toBe("perfil de ejemplo inventado, 34 años, Madrid, distinto en valores: No quiere hijos");
  });
});

describe("errorEjemplos", () => {
  const ok = (validarEjemplos({ perfiles: cuatro() }) ?? []) as PerfilEjemplo[];
  it("pide los 4, con descripción y frases cortas", () => {
    expect(errorEjemplos(ok)).toBeNull();
    expect(errorEjemplos(ok.slice(0, 3))).toMatch(/4 perfiles/);
    expect(errorEjemplos([{ ...ok[0], rasgo: " " }, ...ok.slice(1)])).toMatch(/descripción/);
    expect(errorEjemplos([{ ...ok[0], frase: "x".repeat(161) }, ...ok.slice(1)])).toMatch(/frase/);
  });
});
