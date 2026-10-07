import { describe, expect, it } from "vitest";
import { VERSION_ALGORITMO, WEIGHTS, findMatchesFor, generateAllMatches, matchProfiles } from "@/lib/profileMatching";
import { ana, crearPerfil, luis } from "./fixtures";

describe("matchProfiles · filtros duros", () => {
  it("una pareja compatible no se excluye y puntúa entre 0 y 100", () => {
    const m = matchProfiles(ana, luis);
    expect(m.excluded).toBeUndefined();
    expect(m.breakdown.filtros).toBe(true);
    expect(m.score).toBeGreaterThan(0);
    expect(m.score).toBeLessThanOrEqual(100);
  });

  it("excluye si el género del candidato no es el buscado", () => {
    const m = matchProfiles(ana, { ...luis, genero: "Mujer" });
    expect(m.excluded).toBe("Género buscado no coincide");
    expect(m.score).toBe(0);
    expect(m.warnings).toEqual(["Género buscado no coincide"]);
  });

  it("el filtro de género es en las dos direcciones", () => {
    expect(matchProfiles(ana, { ...luis, busca_genero: "Hombre" }).excluded).toBe("Género buscado no coincide");
  });

  it("buscar 'Ambos' no excluye por género", () => {
    const m = matchProfiles({ ...ana, busca_genero: "Ambos" }, { ...luis, genero: "Mujer", busca_genero: "Ambos" });
    expect(m.excluded).toBeUndefined();
  });

  it("excluye si el candidato está fuera del rango de edad buscado", () => {
    expect(matchProfiles(ana, { ...luis, edad: 45 }).excluded).toBe("Edad fuera de rango");
    expect(matchProfiles(ana, { ...luis, edad: 25 }).excluded).toBe("Edad fuera de rango");
  });

  it("excluye si el cliente está fuera del rango de edad del candidato", () => {
    expect(matchProfiles(ana, { ...luis, edad_min_busca: 34 }).excluded).toBe("Edad fuera de rango");
  });

  it("excluye si uno no quiere hijos y el otro tiene o quiere", () => {
    const noQuiere = { ...ana, hijos: "No quiero tener" };
    expect(matchProfiles(noQuiere, { ...luis, hijos: "Tengo" }).excluded).toMatch(/hijos/);
    expect(matchProfiles(noQuiere, { ...luis, hijos: "Quiero tener" }).excluded).toMatch(/hijos/);
    expect(matchProfiles(noQuiere, { ...luis, hijos: "No tengo" }).excluded).toBeUndefined();
  });

  it("excluye por religión solo si a quien le importa no la encuentra", () => {
    const exigente = { ...ana, importa_religion: true, religion_pareja: "Catolicismo" };
    expect(matchProfiles(exigente, { ...luis, religion: "Ateo" }).excluded).toBe("Religión incompatible (A requiere Catolicismo)");
    expect(matchProfiles(exigente, { ...luis, religion: "Catolicismo" }).excluded).toBeUndefined();
    expect(matchProfiles({ ...ana, importa_religion: false, religion_pareja: "Catolicismo" }, { ...luis, religion: "Ateo" }).excluded).toBeUndefined();
  });

  it("excluye por política solo si a quien le importa no coincide la ideología", () => {
    const exigente = { ...ana, importa_politica: true, politica_pareja: "Izquierdas" };
    expect(matchProfiles(exigente, { ...luis, ideologia: "Derechas" }).excluded).toBe("Ideología incompatible (A requiere Izquierdas)");
    expect(matchProfiles(exigente, { ...luis, ideologia: "Izquierdas" }).excluded).toBeUndefined();
    expect(matchProfiles(ana, { ...luis, ideologia: "Derechas" }).excluded).toBeUndefined();
    expect(matchProfiles(ana, { ...luis, importa_politica: true, politica_pareja: "Izquierdas" }).excluded)
      .toBe("Ideología incompatible (B requiere Izquierdas)");
  });
});

describe("matchProfiles · puntuación", () => {
  it("vivir en la misma ciudad suma (sin distinguir mayúsculas ni espacios)", () => {
    const misma = matchProfiles(ana, { ...luis, ciudad: "  madrid " });
    const distinta = matchProfiles(ana, { ...luis, ciudad: "Barcelona" });
    expect(misma.breakdown.geografia).toBe(100);
    expect(distinta.breakdown.geografia).toBe(30);
    expect(misma.score).toBeGreaterThan(distinta.score);
    expect(misma.highlights).toContain("Misma ciudad");
    expect(distinta.warnings).toContain("Ciudades distintas");
  });

  it("los mismos objetivos de vida puntúan más que objetivos distintos", () => {
    const iguales = matchProfiles(ana, luis);
    const distintos = matchProfiles(ana, { ...luis, tipo_relacion: "Casual", desea_casarse: "No", hijos: "No tengo" });
    expect(iguales.breakdown.objetivos).toBeGreaterThan(distintos.breakdown.objetivos);
    expect(iguales.score).toBeGreaterThan(distintos.score);
  });

  it("avisa de religiones distintas sin excluir", () => {
    const m = matchProfiles(ana, { ...luis, religion: "Ateo" });
    expect(m.excluded).toBeUndefined();
    expect(m.warnings).toContain("Religión distinta (Catolicismo vs Ateo)");
  });
});

describe("findMatchesFor · ranking", () => {
  const pool = [
    ana,
    { ...luis, id: "lejos", ciudad: "Sevilla" },
    { ...luis, id: "cerca" },
    { ...luis, id: "mujer", genero: "Mujer" },
    { ...luis, id: "mayor", edad: 50 },
  ];

  it("excluye al propio perfil y a los descartados por filtros duros", () => {
    const ids = findMatchesFor(ana, pool).map((m) => m.perfilB.id);
    expect(ids).not.toContain("ana");
    expect(ids).not.toContain("mujer");
    expect(ids).not.toContain("mayor");
    expect(ids).toHaveLength(2);
  });

  it("ordena de mayor a menor compatibilidad y respeta el límite", () => {
    const ranking = findMatchesFor(ana, pool);
    expect(ranking.map((m) => m.perfilB.id)).toEqual(["cerca", "lejos"]);
    expect(ranking[0].score).toBeGreaterThanOrEqual(ranking[1].score);
    expect(findMatchesFor(ana, pool, 1)).toHaveLength(1);
  });
});

describe("generateAllMatches", () => {
  it("evalúa cada par una vez, sin descartados y ordenado por score", () => {
    const otro = crearPerfil({ id: "otro", genero: "Hombre", busca_genero: "Mujer", edad: 30, ciudad: "Valencia" });
    const todos = generateAllMatches([ana, luis, otro]);
    // ana-luis y ana-otro son válidos; luis-otro no (ambos hombres buscando mujer).
    expect(todos).toHaveLength(2);
    expect(todos[0].score).toBeGreaterThanOrEqual(todos[1].score);
  });
});

describe("v3 · estado y exclusiones", () => {
  it("solo propone candidatos activos", () => {
    for (const estado of ["pausado", "baja", "finalizado"]) {
      expect(matchProfiles(ana, { ...luis, estado_cliente: estado }).excluded).toBe(`Candidato no activo (${estado})`);
    }
    // El estado del cliente no filtra: un pausado conserva y puede recalcular sus sugerencias.
    expect(matchProfiles({ ...ana, estado_cliente: "pausado" }, luis).excluded).toBeUndefined();
  });

  it("excluye los ids recibidos (rechazados antes, matches en curso)", () => {
    expect(matchProfiles(ana, luis, { excluirIds: ["luis"] }).excluded).toBe("Descartado antes o con un match en curso");
    const pool = [luis, { ...luis, id: "otro" }];
    expect(findMatchesFor(ana, pool, 20, { excluirIds: ["luis"] }).map((m) => m.perfilB.id)).toEqual(["otro"]);
  });

  it("expone la versión del algoritmo", () => {
    expect(VERSION_ALGORITMO).toBe("v3");
  });
});

describe("v3 · zona", () => {
  const madrid = { ...ana, zona: "Madrid" };
  const sevilla = { ...luis, ciudad: "Sevilla", zona: "Sevilla" };

  it("excluye zonas distintas si ninguno acepta otras zonas", () => {
    expect(matchProfiles(madrid, sevilla).excluded).toBe("Zonas distintas y ninguno acepta otras zonas");
  });

  it("basta con que uno acepte otras zonas", () => {
    expect(matchProfiles({ ...madrid, acepta_otras_zonas: true }, sevilla).excluded).toBeUndefined();
    expect(matchProfiles(madrid, { ...sevilla, acepta_otras_zonas: true }).excluded).toBeUndefined();
  });

  it("sin zona o con 'Otra' no excluye", () => {
    expect(matchProfiles({ ...madrid, zona: null }, sevilla).excluded).toBeUndefined();
    expect(matchProfiles(madrid, { ...sevilla, zona: "Otra" }).excluded).toBeUndefined();
  });

  it("misma provincia y distinta ciudad puntúa entre misma ciudad y lejos", () => {
    const m = matchProfiles(madrid, { ...luis, ciudad: "Alcalá de Henares", zona: "Madrid" });
    expect(m.breakdown.geografia).toBe(80);
    expect(m.highlights).toContain("Misma provincia");
    expect(matchProfiles(madrid, { ...luis, zona: "Madrid" }).breakdown.geografia).toBe(100);
  });
});

describe("v3 · valores importantes", () => {
  it("cuantos más valores compartidos, más puntúa la dimensión valores", () => {
    const a = { ...ana, valores_importantes: ["Familia", "Humor", "Honestidad"] };
    const iguales = matchProfiles(a, { ...luis, valores_importantes: ["Familia", "Humor", "Honestidad"] });
    const uno = matchProfiles(a, { ...luis, valores_importantes: ["Familia", "Ambición", "Libertad"] });
    const ninguno = matchProfiles(a, { ...luis, valores_importantes: ["Ambición", "Libertad", "Cultura"] });
    expect(iguales.breakdown.valores).toBeGreaterThan(uno.breakdown.valores);
    expect(uno.breakdown.valores).toBeGreaterThan(ninguno.breakdown.valores);
    expect(uno.highlights).toContain("Comparten valores: Familia");
  });

  it("si alguno no los ha contestado puntúa neutro, sin premiar ni castigar", () => {
    const a = { ...ana, valores_importantes: ["Familia"] };
    const sinDatos = matchProfiles(a, luis).breakdown.valores;
    expect(sinDatos).toBeLessThan(matchProfiles(a, { ...luis, valores_importantes: ["Familia"] }).breakdown.valores);
    expect(sinDatos).toBeGreaterThan(matchProfiles(a, { ...luis, valores_importantes: ["Ambición"] }).breakdown.valores);
  });
});

describe("v3 · pesos", () => {
  const cerca = { ...luis, id: "cerca", tipo_relacion: "Casual", desea_casarse: "No" };
  const lejos = { ...luis, id: "lejos", ciudad: "Sevilla" };

  it("sin opciones usa WEIGHTS", () => {
    expect(matchProfiles(ana, luis, { pesos: WEIGHTS }).score).toBe(matchProfiles(ana, luis).score);
  });

  it("los pesos inyectados cambian el ranking", () => {
    expect(findMatchesFor(ana, [cerca, lejos]).map((m) => m.perfilB.id)).toEqual(["lejos", "cerca"]);
    const pesos = { ...WEIGHTS, geografia: 2 };
    expect(findMatchesFor(ana, [cerca, lejos], 20, { pesos }).map((m) => m.perfilB.id)).toEqual(["cerca", "lejos"]);
  });

  it("los ajustes multiplican el peso de una dimensión", () => {
    const base = matchProfiles(ana, lejos).score;
    expect(matchProfiles(ana, lejos, { ajustes: { geografia: 1.3 } }).score).toBeLessThan(base);
    expect(matchProfiles(ana, lejos, { ajustes: { geografia: 0.7 } }).score).toBeGreaterThan(base);
  });

  it("el score sigue en 0-100 aunque los pesos no sumen 1", () => {
    const m = matchProfiles(ana, luis, { pesos: { objetivos: 5, valores: 5, estiloVida: 5, personalidad: 5, geografia: 5, preferencias: 5 } });
    expect(m.score).toBeGreaterThan(0);
    expect(m.score).toBeLessThanOrEqual(100);
  });
});
